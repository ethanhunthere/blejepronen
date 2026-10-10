-- ============================================================================
-- BLEJE PRONËN — PENDING COLUMN ADDITIONS (consolidated, idempotent)
-- migration: 20261010_pending_columns.sql
--
-- Live-DB verification on 2026-10-10 showed the 2026-09-28 migration batch
-- applied only partially: the CREATE TABLE statements landed (listing_reports,
-- listing_events, saved_searches, telemetry_events) but every ALTER TABLE ...
-- ADD COLUMN failed, so profiles.email, the OTP lockout columns and
-- listings.status are missing in production. Application code degrades
-- gracefully (42703 fallbacks), but the intended schema is inactive until
-- this file is applied.
--
-- Apply once in the Supabase SQL editor. Every statement is idempotent and
-- safe to re-run.
-- ============================================================================

-- 1. profiles.email (from 20260928_001) ---------------------------------------
alter table public.profiles
  add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

create unique index if not exists profiles_email_unique_lower_idx
  on public.profiles (lower(email))
  where email is not null and email <> '';

create index if not exists profiles_email_lookup_idx
  on public.profiles (email);

-- 2. OTP lockout columns (from 20260928_002) ----------------------------------
alter table public.profiles
  add column if not exists otp_fail_count integer not null default 0,
  add column if not exists otp_locked_until timestamptz;

comment on column public.profiles.otp_fail_count is 'Count of consecutive failed OTP attempts';
comment on column public.profiles.otp_locked_until is 'Timestamp until which OTP attempts for this account are locked';

-- 3. listings.status lifecycle column (from 20260928_003) --------------------
alter table public.listings
  add column if not exists status text not null default 'active'
  check (status in ('active', 'paused', 'sold', 'rented', 'archived'));

create index if not exists listings_status_active_idx
  on public.listings (status, is_active);

-- Backfill status from is_active so historical rows are coherent
update public.listings set status = 'active' where is_active = true and status = 'active';
