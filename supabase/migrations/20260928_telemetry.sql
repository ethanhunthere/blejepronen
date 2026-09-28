-- ============================================================================
-- BLEJE PRONËN — TELEMETRY EVENTS (wave-1 scaffold)
-- migration: 20260928_telemetry.sql
--
-- Backing table for POST /api/telemetry (app/api/telemetry/route.ts), which is
-- fed by the batched loggers in lib/telemetry.ts (web) and
-- mobile/lib/telemetry.ts (Expo).
--
-- Access model: RLS enabled with ZERO policies. That means anon and
-- authenticated roles can neither read nor write a single row — only the
-- service role (which bypasses RLS) may insert, from the API route above.
-- Telemetry is write-only product analytics; it is never rendered back to a
-- user, so there is intentionally no read path for clients.
--
-- The route treats a missing table (Postgres 42P01) as "acknowledge and drop"
-- (HTTP 204), so applying this migration can safely lag the deploy.
-- ============================================================================

create table if not exists public.telemetry_events (
  id         bigint generated always as identity primary key,
  event      text        not null,
  props      jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.telemetry_events is
  'Write-only product analytics. Service-role insert only (via /api/telemetry); RLS on with no policies, so anon/authenticated have no access.';
comment on column public.telemetry_events.event is
  'Allowlisted event name (see ALLOWED_EVENTS in app/api/telemetry/route.ts).';
comment on column public.telemetry_events.props is
  'Sanitized event properties. Always carries a server-derived "source" key: ''web'' or ''mobile''.';
comment on column public.telemetry_events.created_at is
  'Server receive time. The client-sent timestamp is informational only and is not stored.';

-- Funnel queries are overwhelmingly "counts per event over a time window".
create index if not exists telemetry_events_event_created_at_idx
  on public.telemetry_events (event, created_at desc);

-- Retention sweeps / "everything since" debugging.
create index if not exists telemetry_events_created_at_idx
  on public.telemetry_events (created_at desc);

alter table public.telemetry_events enable row level security;

-- No `create policy` statements on purpose: with RLS enabled and zero policies,
-- every non-bypassing role is denied. Should a permissive policy ever be added
-- by hand, drop it again rather than widening this migration.

-- Belt and braces: make the intent explicit in the catalog even though RLS
-- already denies these roles, and grant the service role the write path.
-- Guarded so the migration is a no-op on a database where a role is absent.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.telemetry_events from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.telemetry_events from authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert on public.telemetry_events to service_role;
  end if;
end
$$;
