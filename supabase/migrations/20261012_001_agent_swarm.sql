-- ============================================================================
-- BLEJE PRONËN — AUTONOMOUS 24/7 AGENT SWARM SCHEMA (PHASE 1)
-- Migration: 20261012_001_agent_swarm.sql
--
-- Backing infrastructure for Master Orchestrator "Thanos" and the 10
-- specialized Marvel child monitoring and engineering agents:
--   1. agent_incidents: Structured persistent defect tracking, deduplicated
--      via SHA-256 fingerprints, tracking lifecycle across DETECTED -> RESOLVED.
--   2. agent_heartbeats: Real-time telemetry, memory metrics, and supervisor
--      status for all 10 child workers under Thanos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AGENT INCIDENTS TABLE
-- ----------------------------------------------------------------------------

create table if not exists public.agent_incidents (
  id               uuid primary key default gen_random_uuid(),
  agent_name       text not null,
  severity         text not null check (severity in ('P1_CRITICAL', 'P2_HIGH', 'P3_WARNING', 'P4_INFO')),
  title            text not null,
  description      text not null default '',
  fingerprint      text not null,
  status           text not null default 'DETECTED' check (status in ('DETECTED', 'ANALYZING', 'PR_OPENED', 'RESOLVED')),
  occurrence_count integer not null default 1,
  stack_trace      text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.agent_incidents is
  'Persistent anomaly, bug, and performance telemetry tracked by the Thanos autonomous swarm.';
comment on column public.agent_incidents.fingerprint is
  'SHA-256 hash computed over agent_name + title + normalized error location to prevent duplicate alerts.';
comment on column public.agent_incidents.occurrence_count is
  'Number of times this exact incident was detected within the deduplication window.';

-- High-performance query indexes
create index if not exists agent_incidents_fingerprint_status_idx
  on public.agent_incidents (fingerprint, status);

create index if not exists agent_incidents_status_created_at_idx
  on public.agent_incidents (status, created_at desc);

create index if not exists agent_incidents_severity_created_at_idx
  on public.agent_incidents (severity, created_at desc);

create index if not exists agent_incidents_agent_name_idx
  on public.agent_incidents (agent_name, created_at desc);

-- Auto-update updated_at on row modification
create or replace function public.set_agent_incidents_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_agent_incidents_updated_at on public.agent_incidents;
create trigger tr_agent_incidents_updated_at
  before update on public.agent_incidents
  for each row execute function public.set_agent_incidents_updated_at();

-- ----------------------------------------------------------------------------
-- 2. AGENT HEARTBEATS TABLE
-- ----------------------------------------------------------------------------

create table if not exists public.agent_heartbeats (
  agent_name        text primary key,
  last_heartbeat_at timestamptz not null default now(),
  status            text not null default 'HEALTHY' check (status in ('HEALTHY', 'DEGRADED', 'RESTARTING', 'ISOLATED')),
  memory_rss_mb     numeric not null default 0,
  metrics           jsonb not null default '{}'::jsonb,
  updated_at        timestamptz not null default now()
);

comment on table public.agent_heartbeats is
  'Live status and memory telemetry reported by Thanos for all 10 supervised Marvel workers.';

-- Auto-update updated_at on heartbeat refresh
create or replace function public.set_agent_heartbeats_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_agent_heartbeats_updated_at on public.agent_heartbeats;
create trigger tr_agent_heartbeats_updated_at
  before update on public.agent_heartbeats
  for each row execute function public.set_agent_heartbeats_updated_at();

-- ----------------------------------------------------------------------------
-- 3. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

alter table public.agent_incidents enable row level security;
alter table public.agent_heartbeats enable row level security;

-- Enforce strict role permissions:
-- Service role has full administrative control (used by the swarm daemon).
-- Anon and standard authenticated clients have zero access by default.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.agent_incidents from anon;
    revoke all on public.agent_heartbeats from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.agent_incidents from authenticated;
    revoke all on public.agent_heartbeats from authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.agent_incidents to service_role;
    grant all on public.agent_heartbeats to service_role;
  end if;
end
$$;

-- Allow service_role bypass RLS explicitly
drop policy if exists "service_role_agent_incidents_all" on public.agent_incidents;
create policy "service_role_agent_incidents_all"
  on public.agent_incidents
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service_role_agent_heartbeats_all" on public.agent_heartbeats;
create policy "service_role_agent_heartbeats_all"
  on public.agent_heartbeats
  for all
  to service_role
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- 4. REALTIME PUBLICATION SUBSCRIPTION (GUARDED)
-- ----------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agent_incidents'
    ) then
      alter publication supabase_realtime add table public.agent_incidents;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agent_heartbeats'
    ) then
      alter publication supabase_realtime add table public.agent_heartbeats;
    end if;
  end if;
end
$$;

