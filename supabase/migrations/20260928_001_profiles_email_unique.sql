-- ============================================================================
-- BLEJE PRONËN — PROFILES EMAIL UNIQUE & INDEXES
-- migration: 20260928_001_profiles_email_unique.sql
-- ============================================================================

-- Ensure email column exists on profiles
alter table public.profiles
  add column if not exists email text;

-- Backfill profiles.email from auth.users if missing
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

-- Unique partial index on email (case-insensitive)
create unique index if not exists profiles_email_unique_lower_idx
  on public.profiles (lower(email))
  where email is not null and email <> '';

-- Fast lookup index for findAuthUserByEmail
create index if not exists profiles_email_lookup_idx
  on public.profiles (email);
