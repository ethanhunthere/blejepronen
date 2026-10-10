-- ============================================================================
-- BLEJE PRONËN — SEAL PROFILES: OWNER-ONLY TABLE READS + PUBLIC VIEW
-- migration: 20261010_seal_profiles.sql
--
-- APPLY ORDER: run 20261010_pending_columns.sql FIRST (it adds profiles.email,
-- the OTP lockout columns and listings.status), then this file.
--
-- Live-DB verification on 2026-10-10 proved the anon role could read FULL
-- profiles rows for ANY user — including verification_code (OTP),
-- expo_push_token and phone — because a permissive select policy is the one
-- actually present in production (the intended owner-only policy from
-- schema.sql was never applied).
--
-- After this migration:
--   • public.profiles SELECT = owner row only, safe columns only
--   • public.profiles UPDATE/INSERT = owner row, profile-edit columns only
--     (email_verified / verification_code / otp_* / expo_push_token can no
--      longer be written by clients — trust is server-derived)
--   • all public reads go through profiles_public (non-sensitive columns)
--   • authenticated contact resolution goes through /api/contact (web)
--
-- Idempotent: drops every SELECT policy on profiles by name discovered at
-- runtime, then recreates the intended one.
-- ============================================================================

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

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Public surface: non-sensitive columns that exist on the live table.
create or replace view public.profiles_public as
  select id, first_name, last_name, avatar_url, email_verified, created_at
  from public.profiles;

grant select on public.profiles_public to anon, authenticated;

-- Column-level sealing (defense in depth on top of the row policy):
--   anon          → public surface only
--   authenticated → + own phone/email (row policy still limits to own row)
--   update/insert → profile-edit columns only; trust & OTP columns are
--                   writable exclusively by the service role / triggers
revoke all on public.profiles from anon, authenticated;

grant select (id, first_name, last_name, avatar_url, email_verified, created_at)
  on public.profiles to anon;

grant select (id, first_name, last_name, avatar_url, email_verified, created_at, phone, email)
  on public.profiles to authenticated;

grant insert (id, first_name, last_name, avatar_url, phone, email, updated_at)
  on public.profiles to authenticated;

grant update (first_name, last_name, avatar_url, phone, email, updated_at)
  on public.profiles to authenticated;

grant all on public.profiles to service_role;

