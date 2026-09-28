-- ============================================================================
-- BLEJE PRONËN — SAVED SEARCHES & ALERTS INFRASTRUCTURE
-- migration: 20260928_004_saved_searches.sql
-- ============================================================================

create table if not exists public.saved_searches (
  id                uuid default uuid_generate_v4() primary key,
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

-- Users can only read and manage their own saved searches
create policy "Users can view their own saved searches"
  on public.saved_searches for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved searches"
  on public.saved_searches for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own saved searches"
  on public.saved_searches for update
  using (auth.uid() = user_id);

create policy "Users can delete their own saved searches"
  on public.saved_searches for delete
  using (auth.uid() = user_id);
