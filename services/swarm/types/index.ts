/**
 * ============================================================================
 * BLEJE PRONËN — AUTONOMOUS SWARM TYPES & ROSTER DEFINITION
 * File: services/swarm/types/index.ts
 *
 * Supreme Commander "Thanos" (Agent 0) and the 10 Specialized Marvel Workers.
 * ============================================================================
 */

export type MarvelAgentId =
  | 'thanos'
  | 'iron-man'
  | 'thor'
  | 'hulk'
  | 'hawkeye'
  | 'captain-america'
  | 'loki'
  | 'black-widow'
  | 'doctor-strange'
  | 'spider-man'
  | 'vision'

export type IncidentSeverity =
  | 'P1_CRITICAL' // Platform down, data corruption, auth outage, active call signaling drop
  | 'P2_HIGH'     // Feature broken, UI layout overflow, mobile crash spike, DB pool high
  | 'P3_WARNING'  // Performance degradation, slow API, missing image alt, non-blocking bug
  | 'P4_INFO'     // Routine audit completed, minor cosmetic inconsistency, metric note

export type IncidentStatus =
  | 'DETECTED'    // Newly identified and captured by a child worker
  | 'ANALYZING'   // Iron Man or Thanos computing root cause and reproduction steps
  | 'PR_OPENED'   // Automated surgical patch generated and Pull Request created
  | 'RESOLVED'    // Verified resolved by synthetic test or operator

export type AgentHealthStatus =
  | 'HEALTHY'     // Beating regularly within SLA, no active errors
  | 'DEGRADED'    // Missed heartbeat or elevated internal latency
  | 'RESTARTING'  // Recovering from caught crash with exponential backoff
  | 'ISOLATED'    // Circuit breaker tripped after exceeding crash threshold

export interface MarvelAgentMetadata {
  readonly id: MarvelAgentId
  readonly index: number
  readonly codeName: string
  readonly title: string
  readonly subsystem: string
  readonly description: string
  readonly executionMode: 'continuous' | 'interval' | 'on_demand'
  readonly defaultIntervalMs: number
}

/**
 * Official Marvel Swarm Roster under Supreme Commander Thanos
 */
export const MARVEL_SWARM_ROSTER: Record<MarvelAgentId, MarvelAgentMetadata> = {
  'thanos': {
    index: 0,
    id: 'thanos',
    codeName: 'Thanos',
    title: 'Supreme Commander & Central Orchestrator',
    subsystem: 'Full Platform / Swarm Supervision',
    description: 'Directs the 10 child agents, manages event bus, deduplicates incidents, and enforces supervision tree.',
    executionMode: 'continuous',
    defaultIntervalMs: 0,
  },
  'iron-man': {
    index: 1,
    id: 'iron-man',
    codeName: 'Iron Man',
    title: 'Autonomous Bug Repair & GitHub PR Engine',
    subsystem: 'Codebase / TypeScript / Git Operations',
    description: 'Diagnoses confirmed defects, executes compiler checks (tsc), drafts surgical code patches, and opens PRs.',
    executionMode: 'on_demand',
    defaultIntervalMs: 0,
  },
  'thor': {
    index: 2,
    id: 'thor',
    codeName: 'Thor',
    title: 'Infrastructure, API Latency & Database Pool Health',
    subsystem: 'Next.js API / Supabase Pooler / Vercel Edge',
    description: 'Audits endpoint availability (200 OK), P95 API latencies, SSL certificates, and PostgreSQL connection pool status.',
    executionMode: 'interval',
    defaultIntervalMs: 30_000, // Every 30 seconds
  },
  'hulk': {
    index: 3,
    id: 'hulk',
    codeName: 'Hulk',
    title: 'Runtime Exceptions & Crash Telemetry Interceptor',
    subsystem: 'Web / Mobile Telemetry & Error Streams',
    description: 'Taps into telemetry_events and unhandled exception streams; catches zero-day client crashes instantly.',
    executionMode: 'interval',
    defaultIntervalMs: 15_000, // Every 15 seconds
  },
  'hawkeye': {
    index: 4,
    id: 'hawkeye',
    codeName: 'Hawkeye',
    title: 'UI/UX Ergonomics, Safe-Area Bounds & Pixel Auditor',
    subsystem: 'Headless Browser / Responsive Layout / Touch Targets',
    description: 'Audits horizontal overflows (overflow-x), touch targets (<44px), viewport layout shifts, and contrast issues.',
    executionMode: 'interval',
    defaultIntervalMs: 300_000, // Every 5 minutes
  },
  'captain-america': {
    index: 5,
    id: 'captain-america',
    codeName: 'Captain America',
    title: 'Synthetic User Journeys & End-to-End Funnels',
    subsystem: 'Core Business Flows (Search, Post, View, Bookmark)',
    description: 'Executes automated end-to-end user journeys around the clock to ensure conversion and navigation paths never break.',
    executionMode: 'interval',
    defaultIntervalMs: 600_000, // Every 10 minutes
  },
  'loki': {
    index: 6,
    id: 'loki',
    codeName: 'Loki',
    title: 'Security, Row-Level Security & OAuth Flow Integrity',
    subsystem: 'Supabase RLS / Auth / OTP / Session Refresh',
    description: 'Probes Row-Level Security policies, detects token expiration failures, and guards against unauthorized access leaks.',
    executionMode: 'interval',
    defaultIntervalMs: 120_000, // Every 2 minutes
  },
  'black-widow': {
    index: 7,
    id: 'black-widow',
    codeName: 'Black Widow',
    title: 'Real-Time Chat & WebSocket State Monitor',
    subsystem: 'Supabase Realtime / Chat Rooms / Presence',
    description: 'Validates WebSocket channel states, message read receipts, typing indicators, and delivery latency.',
    executionMode: 'interval',
    defaultIntervalMs: 45_000, // Every 45 seconds
  },
  'doctor-strange': {
    index: 8,
    id: 'doctor-strange',
    codeName: 'Doctor Strange',
    title: 'In-App Calling & WebRTC Audio Signaling',
    subsystem: 'VoIP / WebRTC Signaling / Audio Permissions',
    description: 'Monitors P2P signaling channels, ICE candidate exchanges, audio session states, and call gate responsiveness.',
    executionMode: 'interval',
    defaultIntervalMs: 60_000, // Every 60 seconds
  },
  'spider-man': {
    index: 9,
    id: 'spider-man',
    codeName: 'Spider-Man',
    title: 'Social Graph Reactivity & Instant Profile Hydration',
    subsystem: 'Followers / Following / Profile Cache / Zero-Lag UI',
    description: 'Verifies bidirectional follower counters, profile frame-zero hydration, and mutual connection states.',
    executionMode: 'interval',
    defaultIntervalMs: 60_000, // Every 60 seconds
  },
  'vision': {
    index: 10,
    id: 'vision',
    codeName: 'Vision',
    title: 'Media Pipeline, Storage Buckets & Avatar Processing',
    subsystem: 'Supabase Storage / WebP Image Optimization / CDNs',
    description: 'Monitors listing photo CDN availability, 404 image links, avatar downsampling, and storage upload quotas.',
    executionMode: 'interval',
    defaultIntervalMs: 180_000, // Every 3 minutes
  },
}

/**
 * Incident payload reported by child workers
 */
export interface IncidentReportPayload {
  readonly agentId: MarvelAgentId
  readonly severity: IncidentSeverity
  readonly title: string
  readonly description: string
  readonly locationOrUrl?: string
  readonly errorName?: string
  readonly stackTrace?: string
  readonly metadata?: Record<string, unknown>
}

/**
 * Persisted Incident Record
 */
export interface IncidentRecord {
  id: string
  agentName: string
  severity: IncidentSeverity
  title: string
  description: string
  fingerprint: string
  status: IncidentStatus
  occurrenceCount: number
  stackTrace: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/**
 * Heartbeat Payload emitted by workers
 */
export interface HeartbeatPayload {
  readonly agentId: MarvelAgentId
  readonly status: AgentHealthStatus
  readonly memoryRssMb: number
  readonly metrics?: Record<string, unknown>
}

/**
 * Persisted Heartbeat Record
 */
export interface HeartbeatRecord {
  agentName: string
  lastHeartbeatAt: string
  status: AgentHealthStatus
  memoryRssMb: number
  metrics: Record<string, unknown>
  updatedAt: string
}

/**
 * Worker Contract required for all child agents supervised by Thanos
 */
export interface ISwarmWorker {
  readonly id: MarvelAgentId
  readonly metadata: MarvelAgentMetadata
  getStatus(): AgentHealthStatus
  getMetrics(): Record<string, unknown>
  start(): Promise<void>
  stop(): Promise<void>
  tick?(): Promise<void>
}

/**
 * Strongly Typed Swarm Events Map
 */
export interface SwarmEventMap {
  'swarm:started': { timestamp: number }
  'swarm:stopped': { timestamp: number; reason: string }
  'heartbeat:received': HeartbeatPayload
  'incident:detected': IncidentReportPayload & { fingerprint: string }
  'incident:deduplicated': { fingerprint: string; count: number; agentId: MarvelAgentId }
  'incident:persisted': { id: string; fingerprint: string }
  'worker:started': { agentId: MarvelAgentId }
  'worker:crashed': { agentId: MarvelAgentId; error: Error; attempts: number; nextRetryDelayMs: number }
  'worker:isolated': { agentId: MarvelAgentId; reason: string; crashCount: number }
  'worker:recovered': { agentId: MarvelAgentId }
}
