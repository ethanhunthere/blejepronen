-- ============================================================================
-- BLEJE PRONËN — CONSOLIDATED PRODUCTION MIGRATION
-- Run this complete script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tjpxxtkebindirhpthhg/sql/new
--
-- This script is 100% IDEMPOTENT (safe to run multiple times).
-- It covers:
--   1. Host lifecycle columns (listings.status)
--   2. Abuse reporting (listing_reports)
--   3. Attributed analytics (listing_events)
--   4. Saved searches & alerts (saved_searches)
--   5. Anonymous telemetry buffer (telemetry_events)
--   6. Pending profile columns (profiles.email, otp_fail_count, otp_locked_until)
--   7. Profile sealing (owner-only access, profiles_public view, RLS defense)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. LISTINGS LIFECYCLE (status column)
-- ----------------------------------------------------------------------------
alter table public.listings
  add column if not exists status text default 'active' not null
  check (status in ('active', 'paused', 'sold', 'rented', 'archived'));

create index if not exists listings_status_active_idx
  on public.listings (status, is_active);

update public.listings
  set status = 'active'
  where is_active = true and (status is null or status = 'active');

-- ----------------------------------------------------------------------------
-- 2. LISTING ABUSE & QUALITY REPORTS
-- ----------------------------------------------------------------------------
create table if not exists public.listing_reports (
  id           bigint generated always as identity primary key,
  listing_id   uuid not null references public.listings(id) on delete cascade,
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  reason       text not null check (reason in ('spam', 'fraudulent', 'duplicate', 'offensive', 'other')),
  note         text,
  created_at   timestamptz not null default now()
);

create unique index if not exists listing_reports_listing_reporter_idx
  on public.listing_reports (listing_id, reporter_id);

create index if not exists listing_reports_created_at_idx
  on public.listing_reports (created_at desc);

alter table public.listing_reports enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'listing_reports' and policyname = 'Authenticated users can insert reports') then
    create policy "Authenticated users can insert reports"
      on public.listing_reports for insert
      with check (auth.uid() = reporter_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'listing_reports' and policyname = 'Reporters can view their own reports') then
    create policy "Reporters can view their own reports"
      on public.listing_reports for select
      using (auth.uid() = reporter_id);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 3. LISTING EVENTS (Host Funnel Analytics)
-- ----------------------------------------------------------------------------
create table if not exists public.listing_events (
  id           bigint generated always as identity primary key,
  listing_id   uuid not null references public.listings(id) on delete cascade,
  event        text not null check (event in ('view', 'favorite', 'lead')),
  user_id      uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists listing_events_listing_event_idx
  on public.listing_events (listing_id, event, created_at desc);

create index if not exists listing_events_created_at_idx
  on public.listing_events (created_at desc);

alter table public.listing_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'listing_events' and policyname = 'Anyone can insert listing events') then
    create policy "Anyone can insert listing events"
      on public.listing_events for insert
      with check (true);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 4. SAVED SEARCHES & ALERTS
-- ----------------------------------------------------------------------------
create table if not exists public.saved_searches (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  title             text,
  city              text,
  type              text check (type in ('shitje', 'qira', '')),
  min_price         numeric,
  max_price         numeric,
  rooms             integer,
  min_area          numeric,
  max_area          numeric,
  apartment_type    text,
  search_query      text,
  notify_push       boolean default true not null,
  notify_email      boolean default true not null,
  last_notified_at  timestamptz default now() not null,
  created_at        timestamptz default now() not null
);

create index if not exists saved_searches_user_id_idx
  on public.saved_searches (user_id);

create index if not exists saved_searches_city_type_idx
  on public.saved_searches (city, type);

alter table public.saved_searches enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'saved_searches' and policyname = 'Users can view their own saved searches') then
    create policy "Users can view their own saved searches"
      on public.saved_searches for select
      using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'saved_searches' and policyname = 'Users can insert their own saved searches') then
    create policy "Users can insert their own saved searches"
      on public.saved_searches for insert
      with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'saved_searches' and policyname = 'Users can update their own saved searches') then
    create policy "Users can update their own saved searches"
      on public.saved_searches for update
      using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'saved_searches' and policyname = 'Users can delete their own saved searches') then
    create policy "Users can delete their own saved searches"
      on public.saved_searches for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 5. TELEMETRY EVENTS
-- ----------------------------------------------------------------------------
create table if not exists public.telemetry_events (
  id         bigint generated always as identity primary key,
  event      text not null,
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists telemetry_events_event_created_at_idx
  on public.telemetry_events (event, created_at desc);

create index if not exists telemetry_events_created_at_idx
  on public.telemetry_events (created_at desc);

alter table public.telemetry_events enable row level security;

-- ----------------------------------------------------------------------------
-- 6. PENDING PROFILE COLUMNS (email + OTP lockouts)
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists email text,
  add column if not exists otp_fail_count integer not null default 0,
  add column if not exists otp_locked_until timestamptz;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

create unique index if not exists profiles_email_unique_lower_idx
  on public.profiles (lower(email))
  where email is not null and email <> '';

create index if not exists profiles_email_lookup_idx
  on public.profiles (email);

-- ----------------------------------------------------------------------------
-- 7. SEAL PROFILES (OWNER-ONLY SELECT + PROFILES_PUBLIC VIEW)
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on public.profiles', r.policyname);
  end loop;
end $$;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

-- Public surface: non-sensitive columns
create or replace view public.profiles_public as
  select id, first_name, last_name, avatar_url, email_verified, created_at
  from public.profiles;

grant select on public.profiles_public to anon, authenticated;

-- Column-level grants
revoke all on public.profiles from anon, authenticated;

grant select (id, first_name, last_name, avatar_url, email_verified, created_at)
  on public.profiles to anon;

grant select (id, first_name, last_name, avatar_url, email_verified, created_at, phone, email)
  on public.profiles to authenticated;

grant update (first_name, last_name, avatar_url, phone),
      insert (id, first_name, last_name, avatar_url, phone)
  on public.profiles to authenticated;

grant all on public.profiles to service_role;
grant all on public.saved_searches to service_role;
grant all on public.listing_reports to service_role;
grant all on public.listing_events to service_role;
grant all on public.telemetry_events to service_role;

-- Reload Schema Cache in PostgREST
notify pgrst, 'reload schema';
