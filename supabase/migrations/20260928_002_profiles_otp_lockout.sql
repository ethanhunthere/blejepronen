-- ============================================================================
-- BLEJE PRONËN — PROFILES OTP LOCKOUT & SECURITY
-- migration: 20260928_002_profiles_otp_lockout.sql
-- ============================================================================

-- Add durable OTP attempt and lock state columns to profiles
alter table public.profiles
  add column if not exists otp_fail_count integer default 0 not null,
  add column if not exists otp_locked_until timestamptz;

comment on column public.profiles.otp_fail_count is 'Count of consecutive failed OTP attempts';
comment on column public.profiles.otp_locked_until is 'Timestamp until which OTP attempts for this account are locked';
