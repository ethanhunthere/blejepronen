-- ============================================================================
-- BLEJE PRONËN — HOST LIFECYCLE, LISTING REPORTS & ATTRIBUTED ANALYTICS
-- migration: 20260928_003_host_lifecycle_reports_analytics.sql
-- ============================================================================

-- 1. Decouple listing status from physical property condition
-- Add status column to listings if it does not already exist
alter table public.listings
  add column if not exists status text default 'active' not null check (status in ('active', 'paused', 'sold', 'rented', 'archived'));

-- Index on listing status + active flag for performant queries
create index if not exists listings_status_active_idx
  on public.listings (status, is_active);

-- 2. Listing Abuse & Quality Reports Table
create table if not exists public.listing_reports (
  id           bigint generated always as identity primary key,
  listing_id   uuid        not null references public.listings(id) on delete cascade,
  reporter_id  uuid        not null references public.profiles(id) on delete cascade,
  reason       text        not null check (reason in ('spam', 'fraudulent', 'duplicate', 'offensive', 'other')),
  note         text,
  created_at   timestamptz not null default now()
);

create unique index if not exists listing_reports_listing_reporter_idx
  on public.listing_reports (listing_id, reporter_id);

create index if not exists listing_reports_created_at_idx
  on public.listing_reports (created_at desc);

alter table public.listing_reports enable row level security;

-- 3. Attributed Listing Analytics Events Table (Host Funnel: view, favorite, lead)
create table if not exists public.listing_events (
  id           bigint generated always as identity primary key,
  listing_id   uuid        not null references public.listings(id) on delete cascade,
  event        text        not null check (event in ('view', 'favorite', 'lead')),
  user_id      uuid        references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists listing_events_listing_event_idx
  on public.listing_events (listing_id, event, created_at desc);

create index if not exists listing_events_created_at_idx
  on public.listing_events (created_at desc);

alter table public.listing_events enable row level security;
