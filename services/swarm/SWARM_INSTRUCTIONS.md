# BLEJE PRONËN | SOVEREIGN AUTONOMOUS MULTI-AGENT SWARM OPERATING SYSTEM (BP-ASOS)
## GLOBAL COMMAND MANUAL & ENGINEERING DIRECTIVE COMPENDIUM

```
==================================================================================================
DOCUMENT CLASSIFICATION : LEVEL-0 MISSION CRITICAL RUNTIME SPECIFICATION
SWARM ARCHITECTURE       : HIERARCHICAL OTP-STYLE ONE-FOR-ONE SUPERVISED MULTI-AGENT ENGINE
SUPREME COMMANDER        : THANOS (AGENT 0)
SPECIALIZED CORPS        : 10 MARVEL AUTONOMOUS ENGINEERING WORKERS (AGENTS 1 - 10)
TARGET ECOSYSTEM         : NEXT.JS 16 WEB (REACT 19) + EXPO REACT NATIVE MOBILE + SUPABASE POSTGRES
MINIMUM TARGET SLA       : 99.99% RUNTIME AVAILABILITY / ZERO CLIENT-FACING REGRESSIONS
REVISION                 : 2026.10-SOVEREIGN-RELEASE-V4
==================================================================================================
```

---

## TABLE OF CONTENTS

1. [Preamble & Sovereign Swarm Operating Philosophy](#1-preamble--sovereign-swarm-operating-philosophy)
2. [Agent 0: Supreme Commander Thanos, Master Orchestrator Specification](#2-agent-0-supreme-commander-thanos--master-orchestrator-specification)
   - 2.1 [Command Authority & OTP Supervision Tree Topology](#21-command-authority--otp-supervision-tree-topology)
   - 2.2 [The Mathematical Deduplication Engine & SHA-256 Collision Proofing](#22-the-mathematical-deduplication-engine--sha-256-collision-proofing)
   - 2.3 [Supervisor Tree Failure Domain Management & Exponential Backoff](#23-supervisor-tree-failure-domain-management--exponential-backoff)
   - 2.4 [Circuit Breaker State Machine & Chronic Failure Isolation](#24-circuit-breaker-state-machine--chronic-failure-isolation)
   - 2.5 [Inter-Agent IPC Typed Event Bus Contract](#25-inter-agent-ipc-typed-event-bus-contract)
   - 2.6 [Multi-Channel Notification Dispatch Hub & Anti-Fatigue Algorithms](#26-multi-channel-notification-dispatch-hub--anti-fatigue-algorithms)
   - 2.7 [Supabase Persistence & Offline Memory Synchronization](#27-supabase-persistence--offline-memory-synchronization)
3. [Agent 1: Iron Man, Autonomous Bug Repair, Compiler Check & GitHub PR Engine](#3-agent-1-iron-man--autonomous-bug-repair-compiler-check--github-pr-engine)
   - 3.1 [Mission Profile & Functional Responsibilities](#31-mission-profile--functional-responsibilities)
   - 3.2 [Invocation Triggers & Triage Handshake](#32-invocation-triggers--triage-handshake)
   - 3.3 [Autonomous TypeScript Compiler Health & AST Validation](#33-autonomous-typescript-compiler-health--ast-validation)
   - 3.4 [Automated Git Branching, Patch Synthesis & Safety Sandboxing](#34-automated-git-branching-patch-synthesis--safety-sandboxing)
   - 3.5 [GitHub REST API Pull Request Generation Protocol](#35-github-rest-api-pull-request-generation-protocol)
   - 3.6 [Edge-Case Handling & Rollback Procedures](#36-edge-case-handling--rollback-procedures)
4. [Agent 2: Thor, Infrastructure, API Latency & Database Pool Health](#4-agent-2-thor--infrastructure-api-latency--database-pool-health)
   - 4.1 [Mission Profile & System Boundary](#41-mission-profile--system-boundary)
   - 4.2 [Endpoint Surveillance Matrix & Probe Mechanics](#42-endpoint-surveillance-matrix--probe-mechanics)
   - 4.3 [Latency Profiling Mathematics (P50, P90, P95, P99)](#43-latency-profiling-mathematics-p50-p90-p95-p99)
   - 4.4 [HTTP 5xx Catastrophe Protocols & Edge Failover Triggers](#44-http-5xx-catastrophe-protocols--edge-failover-triggers)
   - 4.5 [Supabase PostgreSQL Pooler Health & Lock Contention Diagnostics](#45-supabase-postgresql-pooler-health--lock-contention-diagnostics)
   - 4.6 [SSL/TLS Certificate Life-Cycle & DNS Integrity Probing](#46-ssltls-certificate-life-cycle--dns-integrity-probing)
5. [Agent 3: Hulk, Runtime Exceptions & Crash Telemetry Interceptor](#5-agent-3-hulk--runtime-exceptions--crash-telemetry-interceptor)
   - 5.1 [Mission Profile & Data Ingestion Pipelines](#51-mission-profile--data-ingestion-pipelines)
   - 5.2 [Telemetry Events Ingestion & Realtime Streaming](#52-telemetry-events-ingestion--realtime-streaming)
   - 5.3 [Client-Side Error Boundary Interception (Web & Mobile)](#53-client-side-error-boundary-interception-web--mobile)
   - 5.4 [Stack Trace De-Obfuscation, Normalization & Fingerprinting](#54-stack-trace-de-obfuscation-normalization--fingerprinting)
   - 5.5 [Crash Spike Anomaly Detection Mathematics (Z-Score Algorithm)](#55-crash-spike-anomaly-detection-mathematics-z-score-algorithm)
   - 5.6 [Incident Escalation & Iron Man Coupling](#56-incident-escalation--iron-man-coupling)
6. [Agent 4: Hawkeye, UI/UX Ergonomics, Safe-Area Bounds & Pixel Auditor](#6-agent-4-hawkeye--uiux-ergonomics-safe-area-bounds--pixel-auditor)
   - 6.1 [Mission Profile & Visual Reliability Standards](#61-mission-profile--visual-reliability-standards)
   - 6.2 [Headless Mobile Viewport Simulation Suite](#62-headless-mobile-viewport-simulation-suite)
   - 6.3 [Horizontal Scroll Leakage Detection Algorithm (Overflow-X Auditing)](#63-horizontal-scroll-leakage-detection-algorithm-overflow-x-auditing)
   - 6.4 [Touch Target Geometry & WCAG Ergonomics (<44px Violations)](#64-touch-target-geometry--wcag-ergonomics-44px-violations)
   - 6.5 [Safe-Area Inset & Dynamic Island Collision Audits](#65-safe-area-inset--dynamic-island-collision-audits)
   - 6.6 [Visual Regression & Layout Shift (CLS) Enforcement](#66-visual-regression--layout-shift-cls-enforcement)
7. [Agent 5: Captain America, Synthetic User Journeys & End-to-End Funnels](#7-agent-5-captain-america--synthetic-user-journeys--end-to-end-funnels)
   - 7.1 [Mission Profile & The Synthetic Actor Paradigm](#71-mission-profile--the-synthetic-actor-paradigm)
   - 7.2 [The 5 Canonical Real-Estate User Funnels](#72-the-5-canonical-real-estate-user-funnels)
   - 7.3 [DOM State Assertion Contracts & Zero-False-Positive Testing](#73-dom-state-assertion-contracts--zero-false-positive-testing)
   - 7.4 [API Contract Verification & Schema Integrity Guardrails](#74-api-contract-verification--schema-integrity-guardrails)
   - 7.5 [Authentication Token Lifecycle & Session Rotation Auditing](#75-authentication-token-lifecycle--session-rotation-auditing)
   - 7.6 [Degradation Reporting & Triage Dispatch](#76-degradation-reporting--triage-dispatch)
8. [Agent 6: Loki, Security, Row-Level Security & OAuth Flow Integrity](#8-agent-6-loki--security-row-level-security--oauth-flow-integrity)
   - 8.1 [Mission Profile & Adversarial Verification Architecture](#81-mission-profile--adversarial-verification-architecture)
   - 8.2 [Row-Level Security (RLS) Permeability Testing](#82-row-level-security-rls-permeability-testing)
   - 8.3 [Authentication Barrier Probing & OTP Lockout Verification](#83-authentication-barrier-probing--otp-lockout-verification)
   - 8.4 [Injection Vectors & Parameter Tampering Audits](#84-injection-vectors--parameter-tampering-audits)
   - 8.5 [Cookie Hygiene, CORS & HTTP Security Header Auditing](#85-cookie-hygiene-cors--http-security-header-auditing)
   - 8.6 [Security Breach Catastrophe Escalation Protocols](#86-security-breach-catastrophe-escalation-protocols)
9. [Agent 7: Black Widow, Real-Time Chat & WebSocket State Monitor](#9-agent-7-black-widow--real-time-chat--websocket-state-monitor)
   - 9.1 [Mission Profile & Real-Time Communications Telemetry](#91-mission-profile--real-time-communications-telemetry)
   - 9.2 [Supabase Realtime WebSocket Protocol Auditing](#92-supabase-realtime-websocket-protocol-auditing)
   - 9.3 [Chat Message Delivery Latency & End-to-End Handshake](#93-chat-message-delivery-latency--end-to-end-handshake)
   - 9.4 [Read Receipts, Typing Indicators & State Synchronization](#94-read-receipts-typing-indicators--state-synchronization)
   - 9.5 [Connection Storm Mitigation & Backpressure Audits](#95-connection-storm-mitigation--backpressure-audits)
   - 9.6 [Channel Degraded Protocols & Recovery Signaling](#96-channel-degraded-protocols--recovery-signaling)
10. [Agent 8: Doctor Strange, In-App Calling & WebRTC Audio Signaling](#10-agent-8-doctor-strange--in-app-calling--webrtc-audio-signaling)
    - 10.1 [Mission Profile & Telecommunications Subsystem Overview](#101-mission-profile--telecommunications-subsystem-overview)
    - 10.2 [WebRTC Signaling State Machine Auditing](#102-webrtc-signaling-state-machine-auditing)
    - 10.3 [SDP Offer/Answer Negotiation & ICE Candidate Traversal](#103-sdp-offeranswer-negotiation--ice-candidate-traversal)
    - 10.4 [Native Audio Session Hardware Verification (iOS & Android)](#104-native-audio-session-hardware-verification-ios--android)
    - 10.5 [Call Gate Lifecycle & Frame-Zero Initialization Verification](#105-call-gate-lifecycle--frame-zero-initialization-verification)
    - 10.6 [Telecommunications Failure Triage & Emergency Recovery](#106-telecommunications-failure-triage--emergency-recovery)
11. [Agent 9: Spider-Man, Social Graph Reactivity & Instant Profile Hydration](#11-agent-9-spider-man--social-graph-reactivity--instant-profile-hydration)
    - 11.1 [Mission Profile & Social Graph Architecture](#111-mission-profile--social-graph-architecture)
    - 11.2 [Bidirectional Follow/Unfollow State Reactivity](#112-bidirectional-followunfollow-state-reactivity)
    - 11.3 [Frame-Zero Profile Hydration & Cache Layer Audits](#113-frame-zero-profile-hydration--cache-layer-audits)
    - 11.4 [Followers/Following Full-Screen Presentation & Search Audits](#114-followersfollowing-full-screen-presentation--search-audits)
    - 11.5 [PostgreSQL Counter Concurrency & Race-Condition Detection](#115-postgresql-counter-concurrency--race-condition-detection)
    - 11.6 [Social Graph Synchronization Failure Runbooks](#116-social-graph-synchronization-failure-runbooks)
12. [Agent 10: Vision, Media Pipeline, Storage Buckets & Avatar Processing](#12-agent-10-vision--media-pipeline-storage-buckets--avatar-processing)
    - 12.1 [Mission Profile & Digital Asset Pipeline Architecture](#121-mission-profile--digital-asset-pipeline-architecture)
    - 12.2 [Supabase Storage Bucket Integrity & RLS Policy Audits](#122-supabase-storage-bucket-integrity--rls-policy-audits)
    - 12.3 [Listing Image CDN Health, 404 Scanning & MIME Validation](#123-listing-image-cdn-health-404-scanning--mime-validation)
    - 12.4 [Client-Side Avatar WebP Downsampling & Memory Safeguards](#124-client-side-avatar-webp-downsampling--memory-safeguards)
    - 12.5 [Image Delivery Latency, CLS Prevention & Caching Headers](#125-image-delivery-latency-cls-prevention--caching-headers)
    - 12.6 [Storage Outage Remediation & CDN Purge Procedures](#126-storage-outage-remediation--cdn-purge-procedures)
13. [Database Persistence Schema & Catalog Architecture](#13-database-persistence-schema--catalog-architecture)
    - 13.1 [Data Definition Language (DDL) Specifications](#131-data-definition-language-ddl-specifications)
    - 13.2 [Query Indexing, Partitioning & Performance Tuning](#132-query-indexing-partitioning--performance-tuning)
    - 13.3 [Row-Level Security Hardening & Administrative Grants](#133-row-level-security-hardening--administrative-grants)
    - 13.4 [Supabase Realtime Publication Subscription Architecture](#134-supabase-realtime-publication-subscription-architecture)
14. [Production Runbooks, Incident Response & Disaster Recovery](#14-production-runbooks-incident-response--disaster-recovery)
    - 14.1 [P1_CRITICAL Catastrophe Response Protocol](#141-p1_critical-catastrophe-response-protocol)
    - 14.2 [P2_HIGH Severe Degradation Runbook](#142-p2_high-severe-degradation-runbook)
    - 14.3 [Host Daemonization & Supervisor Recovery (Systemd, PM2, Docker)](#143-host-daemonization--supervisor-recovery-systemd-pm2-docker)
    - 14.4 [Database Failover, Network Partitioning & Split-Brain Mitigation](#144-database-failover-network-partitioning--split-brain-mitigation)
    - 14.5 [Zero-Downtime Swarm Codebase Upgrade Procedures](#145-zero-downtime-swarm-codebase-upgrade-procedures)

---

## 1. PREAMBLE & SOVEREIGN SWARM OPERATING PHILOSOPHY

### 1.1 The Operational Mandate
The Bleje Pronën platform is a distributed mission-critical real-estate ecosystem serving thousands of active property buyers, sellers, certified real-estate agencies, and brokerages across the Western Balkans. A single runtime failure-whether a broken VoIP WebRTC signaling gate, a missing safe-area inset on mobile devices, an untrapped database transaction deadlock, an uncaught TypeScript type regression, or an unhandled exception loop-directly inflicts financial, reputational, and operational damage.

Human monitoring teams are fundamentally constrained by cognitive latency, fatigue, sleep cycles, and response-time overhead. The **Sovereign Autonomous Multi-Agent Swarm Operating System (BP-ASOS)** eliminates human latency entirely. BP-ASOS operates continuous, non-negotiable, 24/7/365 closed-loop surveillance and engineering execution over every layer of the platform stack.

### 1.2 Uncompromising Engineering Principles
1. **Zero Silent Failures**: No error, unhandled rejection, layout displacement, network timeout, or schema mutation may occur without being intercepted, classified, fingerprinted, and attributed to its root-cause source.
2. **Absolute Hierarchical Authority**: Thanos (Agent 0) possesses supreme command authority. No child agent operates in an uncoordinated silo. Every inspection tick, incident emission, heartbeat, and remediation task is arbitrated, deduplicated, and directed through Thanos.
3. **Deterministic Deduplication**: Alert storms destroy engineering focus. Identical defect signatures are deduplicated mathematically using cryptographic SHA-256 fingerprinting. Occurrence counters increment silently, while alarm dispatch is throttled by strict algorithmic cooldowns.
4. **Isolated Resilience (Erlang/OTP Supervised)**: A crash in an individual child agent (e.g., an unexpected parsing exception during a DOM audit) must **never** take down the orchestrator or affect sibling agents. The supervisor tree catches process terminations, calculates exponential backoff penalties, and isolates chronic crashers via circuit breakers.
5. **Self-Healing Engineering Loop**: Detection without remediation is half-baked engineering. When a code or compiler bug is confirmed, Agent 1 (Iron Man) is autonomously mobilized by Thanos to inspect the repository, verify compiler integrity, formulate a surgical patch, run static typechecks, and publish a GitHub Pull Request ready for deployment.

---

## 2. AGENT 0: SUPREME COMMANDER THANOS | MASTER ORCHESTRATOR SPECIFICATION

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          AGENT 0: THANOS (SUPREME COMMANDER)                           │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Identifier           │ thanos                                                          │
│ Classification       │ Master Process / Central Supervisor / Swarm Arbiter             │
│ Source Implementation│ services/swarm/core/thanos.ts                                   │
│ Execution Mode       │ Continuous 24/7 In-Process Event Loop & Host Daemon             │
│ Target Subsystems    │ Complete Swarm Infrastructure, IPC Event Bus, Incident Bus, DB │
│ SLA Threshold        │ 99.999% Loop Uptime / <5ms Dispatch Latency                     │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 2.1 Command Authority & OTP Supervision Tree Topology
Thanos is the apex authority of BP-ASOS. He acts as the root supervisor of an Erlang/OTP-inspired **One-For-One Supervision Tree**. Under this model:
- Thanos maintains a permanent in-memory registry of all 10 specialized Marvel child workers.
- Each child worker implements the strict `ISwarmWorker` contract defined in [`services/swarm/types/index.ts`](file:///home/f0id/Downloads/blejepronen/services/swarm/types/index.ts).
- Thanos monitors worker lifecycles, schedules staggered execution intervals to prevent CPU/memory spikes, and processes all inbound telemetry via a central typed event bus.
- If a child process or interval loop encounters an unhandled exception, the error does not propagate upward to crash the Node runtime. Instead, the crash is caught within an isolated boundary, routed to the `SupervisorTree`, and resolved according to deterministic recovery policies.

```
                                  ┌───────────────────────────┐
                                  │      THANOS (AGENT 0)     │
                                  │   (Supreme Commander)     │
                                  └─────────────┬─────────────┘
                                                │ Supervises (One-For-One)
         ┌──────────────┬──────────────┬────────┼──────────────┬──────────────┬──────────────┐
         ▼              ▼              ▼        ▼              ▼              ▼              ▼
     [Agent 1]      [Agent 2]      [Agent 3]  ......       [Agent 8]      [Agent 9]      [Agent 10]
     Iron Man         Thor           Hulk                Doctor Strange  Spider-Man        Vision
```

### 2.2 The Mathematical Deduplication Engine & SHA-256 Collision Proofing
When an anomaly is detected by a child agent, dispatching immediate alerts on every tick causes catastrophic alert fatigue and exhausts API rate limits. Thanos executes a high-speed, mathematical deduplication pass on every incoming report.

#### Mathematical Fingerprinting Formula
Let $P$ be the incoming `IncidentReportPayload`:
$$P = \{ \text{agentId}, \text{severity}, \text{title}, \text{locationOrUrl}, \text{errorName}, \text{stackTrace}, \text{metadata} \}$$

The normalized signature string $S$ is computed as:
$$S = \text{lower}(\text{trim}(P.\text{agentId})) \parallel \text{"|"} \parallel \text{lower}(\text{trim}(P.\text{title})) \parallel \text{"|"} \parallel \text{lower}(\text{trim}(P.\text{locationOrUrl} \lor \text{""})) \parallel \text{"|"} \parallel \text{lower}(\text{trim}(P.\text{errorName} \lor \text{""}))$$

The cryptographic fingerprint $F$ is defined as the SHA-256 digest of $S$:
$$F = \text{SHA-256}(S) \in \{0, 1\}^{256}$$

#### Deduplication Sliding Window Dynamics
Thanos maintains an in-memory hash table $C: F \mapsto E$, where an entry $E$ contains:
$$E = \{ F, \text{agentId}, \text{occurrenceCount}, t_{\text{first}}, t_{\text{last}} \}$$

Let $W$ be the sliding deduplication window (default $W = 3,600,000 \text{ ms} = 1 \text{ hour}$).
Upon receiving fingerprint $F$ at timestamp $t_{\text{now}}$:
1. If $F \in C$ and $(t_{\text{now}} - E.\text{lastSeenAt}) < W$:
   - $E.\text{occurrenceCount} \leftarrow E.\text{occurrenceCount} + 1$
   - $E.\text{lastSeenAt} \leftarrow t_{\text{now}}$
   - The incident is marked as **DUPLICATE**.
   - Thanos updates the existing database record in Supabase: `UPDATE agent_incidents SET occurrence_count = occurrence_count + 1, updated_at = NOW() WHERE fingerprint = F`.
   - Alert notification dispatch is **SUPPRESSED**, unless throttled cooldown limits have expired.
2. If $F \notin C$ or $(t_{\text{now}} - E.\text{lastSeenAt}) \ge W$:
   - $E_{\text{new}} \leftarrow \{ F, P.\text{agentId}, 1, t_{\text{now}}, t_{\text{now}} \}$
   - $C[F] \leftarrow E_{\text{new}}$
   - The incident is marked as **NEW_INCIDENT**.
   - A new row is inserted into Supabase: `INSERT INTO agent_incidents (...)`.
   - High-priority dispatch channels (Telegram/Discord) are triggered immediately.

### 2.3 Supervisor Tree Failure Domain Management & Exponential Backoff
When an individual child worker crashes due to unexpected runtime conditions (e.g., DNS resolution timeout, network partition, unparseable DOM tree, or OOM event within an isolated child task), the `SupervisorTree` executes the **Exponential Backoff Restart Protocol**.

#### Recovery Delay Formula
Let $k \in \mathbb{N}$ be the number of consecutive crashes recorded for a given worker within the rolling monitoring window.
The restart delay $D(k)$ is governed by:
$$D(k) = \min \left( B \times 2^{k-1}, M \right)$$
Where:
- $B = 2,000 \text{ ms}$ (Base backoff delay)
- $M = 60,000 \text{ ms}$ (Maximum backoff ceiling)

| Crash Sequence ($k$) | Delay Applied ($D(k)$) | Worker State | Supervisor Action |
| :--- | :--- | :--- | :--- |
| 1st Crash | $2,000 \text{ ms}$ (2 sec) | `RESTARTING` | Terminate dangling handles, clean memory, re-invoke `start()` |
| 2nd Crash | $4,000 \text{ ms}$ (4 sec) | `RESTARTING` | Re-initialize worker state, execute `start()` |
| 3rd Crash | $8,000 \text{ ms}$ (8 sec) | `RESTARTING` | Backoff inspection loop, re-attempt startup |
| 4th Crash | $16,000 \text{ ms}$ (16 sec)| `RESTARTING` | Log high-frequency degradation warning |
| 5th Crash | $32,000 \text{ ms}$ (32 sec)| `RESTARTING` | Final recovery attempt before isolation |
| $\ge 6$th Crash | **TRIPPED** | `ISOLATED` | **Circuit Breaker trips OPEN. Worker halted completely.** |

### 2.4 Circuit Breaker State Machine & Chronic Failure Isolation
To prevent runaway restart loops from thrashing the CPU or spamming system logs, Thanos enforces a strict three-state **Circuit Breaker**:

```
         ┌────────────────────────────────────────────────────────┐
         │                                                        │
         ▼                                                        │
  ┌──────────────┐         Consecutive Failures $\ge 5$     ┌──────────────┐
  │              │ ───────────────────────────────────────> │              │
  │    CLOSED    │                                          │     OPEN     │
  │  (HEALTHY)   │ <─────────────────────────────────────── │  (ISOLATED)  │
  │              │        Manual Operator Reset via CLI     │              │
  └──────────────┘                                          └──────────────┘
         ▲                                                        │
         │                                                        │
         │                Heartbeat SLA Missed                    ▼
         └────────────────────────────────────────────────── ┌──────────────┐
                          Self-Healing Ping Success          │   DEGRADED   │
                                                             └──────────────┘
```

1. **CLOSED (Normal Operation)**:
   - Worker ticks at scheduled intervals.
   - Crash count is zero or below the threshold.
   - Heartbeats emitted within SLA ($< 90 \text{ s}$).
2. **DEGRADED (Missed Heartbeat SLA)**:
   - Worker has not emitted a heartbeat for $> 2.5 \times \text{interval}$.
   - Thanos issues an out-of-band health probe. If the probe succeeds, status returns to `CLOSED`.
3. **OPEN (Isolated / Quarantined)**:
   - Worker crashed $\ge 5$ times within a rolling 5-minute window ($300,000 \text{ ms}$).
   - Thanos immediately cancels all timers for this worker, terminates remaining child subprocesses, marks the database heartbeat record as `ISOLATED`, and issues a high-priority alert to the systems engineering team.
   - **Crucial Rule**: Healthy sibling workers and Thanos continue running with zero downtime.

### 2.5 Inter-Agent IPC Typed Event Bus Contract
All internal communication within the swarm flows across `SwarmEventBus` ([`services/swarm/core/event-bus.ts`](file:///home/f0id/Downloads/blejepronen/services/swarm/core/event-bus.ts)). The event bus is:
- **Strongly Typed**: Bound to the `SwarmEventMap` interface in TypeScript.
- **Asynchronously Isolated**: Listener execution is wrapped in try/catch boundaries so an exception in a listener never halts event emission.
- **Zero-Copy In-Process**: Operating with sub-millisecond dispatch velocity.

#### Event Roster & Payload Definitions

```typescript
export interface SwarmEventMap {
  'swarm:started':        { timestamp: number }
  'swarm:stopped':        { timestamp: number; reason: string }
  'heartbeat:received':   HeartbeatPayload
  'incident:detected':    IncidentReportPayload & { fingerprint: string }
  'incident:deduplicated':{ fingerprint: string; count: number; agentId: MarvelAgentId }
  'incident:persisted':   { id: string; fingerprint: string }
  'worker:started':       { agentId: MarvelAgentId }
  'worker:crashed':       { agentId: MarvelAgentId; error: Error; attempts: number; nextRetryDelayMs: number }
  'worker:isolated':      { agentId: MarvelAgentId; reason: string; crashCount: number }
  'worker:recovered':     { agentId: MarvelAgentId }
}
```

### 2.6 Multi-Channel Notification Dispatch Hub & Anti-Fatigue Algorithms
The alert dispatch pipeline ([`services/swarm/alerts/alert-dispatcher.ts`](file:///home/f0id/Downloads/blejepronen/services/swarm/alerts/alert-dispatcher.ts)) delivers real-time notifications to external systems while strictly enforcing alert rate-limiting.

#### Triage Severity Hierarchy
- **P1_CRITICAL (Red Alert)**: Full platform outage, primary database connection pool exhausted, HTTP 500 on core endpoints, broken WebRTC signaling, unhandled client crash storm ($>5 \text{ errors/min}$), or RLS security breach. Immediate push alert sent to Telegram & Discord.
- **P2_HIGH (Amber Alert)**: High latency degradation ($>2000 \text{ ms}$), synthetic funnel failure, mobile viewport horizontal overflow ($>430 \text{ px}$), missing microphone permissions, or broken storage bucket. Immediate push alert sent.
- **P3_WARNING (Yellow Alert)**: Inline fixed widths, slow image delivery ($>1500 \text{ ms}$), or single isolated client error. Logged to database and sent via daily digest.
- **P4_INFO (Blue Notice)**: Routine audit passed, synthetic test succeeded, or compiler verified healthy. Stored for telemetry analysis.

#### Anti-Fatigue Cooldown Mechanics
For any unique fingerprint $F$:
$$\Delta t = t_{\text{now}} - t_{\text{last\_alert}}(F)$$
If $\Delta t < 15 \text{ minutes}$ and the incident has already been dispatched, subsequent occurrences increment the database counter but suppress outgoing Telegram/Discord webhook requests.

### 2.7 Supabase Persistence & Offline Memory Synchronization
Persistence is handled via [`services/swarm/persistence/supabase-adapter.ts`](file:///home/f0id/Downloads/blejepronen/services/swarm/persistence/supabase-adapter.ts):
- **Primary Mode**: Uses `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY` to read/write `public.agent_incidents` and `public.agent_heartbeats`.
- **Fault-Tolerant Offline Fallback**: If network connectivity to Supabase drops or database connection pooler is restarting, the adapter shifts to **Memory-Mirror Mode**:
  - Incidents are buffered in an in-memory `Map<string, IncidentRecord>`.
  - Heartbeats are tracked locally.
  - Zero unhandled promise rejections are thrown to the caller.
  - Once database connectivity restores, the in-memory buffer drains automatically.

---

## 3. AGENT 1: IRON MAN | AUTONOMOUS BUG REPAIR, COMPILER CHECK & GITHUB PR ENGINE

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AGENT 1: IRON MAN (AUTONOMOUS CODE DOCTOR)                      │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Identifier           │ iron-man                                                        │
│ Classification       │ Autonomous Remediation / Static Analysis / Git Engine           │
│ Source Implementation│ services/swarm/workers/agent-workers.ts                         │
│ Execution Mode       │ On-Demand Reactive Trigger + Periodic Compiler Baseline Check  │
│ Target Subsystems    │ TypeScript AST, Local Git Repository, GitHub REST API, Next.js  │
│ Default Interval     │ Baseline check every 60s; On-demand within 500ms of escalation  │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 3.1 Mission Profile & Functional Responsibilities
Iron Man is the supreme engineering doctor of the swarm. While other agents identify and classify anomalies, Iron Man is the only agent authorized to interface directly with the local repository, execute static typecheck diagnostics, formulate code patches, and draft GitHub Pull Requests.

### 3.2 Invocation Triggers & Triage Handshake
Iron Man is triggered under two operational modes:
1. **Periodic Baseline Audit (Interval Mode)**:
   - Every 60 seconds, Iron Man executes a background compiler check across the entire workspace to ensure no untyped variables, syntax regressions, or broken imports have been introduced by concurrent edits.
2. **On-Demand Escalation (Reactive Mode)**:
   - Whenever Thanos detects a verified `P1_CRITICAL` or `P2_HIGH` incident that contains a stack trace, file path, or component location, Thanos dispatches an immediate escalation signal to `ironMan.analyzeAndSynthesizePatch(incidentId, errorSummary, metadata)`.

### 3.3 Autonomous TypeScript Compiler Health & AST Validation
Iron Man interacts with the local TypeScript toolchain using direct binary execution:
```bash
./node_modules/.bin/tsc --noEmit
```
#### Execution Rules
- Iron Man must **never** execute global `tsc` or arbitrary shell scripts that bypass the local project dependencies.
- Maximum execution timeout is strictly capped at **25,000 ms** to prevent CPU thread starvation.
- If `./node_modules/.bin/tsc --noEmit` exits with code `0`, `compilerHealthy` is marked as `true`, and `typeErrorsFound` is set to `0`.
- If the compiler exits with non-zero exit code, Iron Man captures standard output, parses the diagnostic lines (matching `file:line:col - error TSxxxx: message`), extracts the offending file paths, and logs a structured diagnostic object into his metrics telemetry.

### 3.4 Automated Git Branching, Patch Synthesis & Safety Sandboxing
When a defect requires autonomous remediation:
1. **Repository Cleanliness Check**:
   Iron Man executes `git status --porcelain`. If the working tree has uncommitted manual changes, Iron Man refuses to perform destructive operations and creates an isolated patch file instead.
2. **Branch Creation**:
   Iron Man computes a dedicated branch name:
   $$\text{branchName} = \text{"agent/fix-"} \parallel \text{incidentId.slice}(0, 8)$$
   Executed via:
   ```bash
   git checkout -b agent/fix-<incident-id>
   ```
3. **Patch Verification Protocol**:
   Before any commit can be made:
   - The patch must be applied to the target file.
   - `./node_modules/.bin/tsc --noEmit` must be executed and return exit code `0`.
   - If the typecheck fails, Iron Man immediately rolls back the file via `git checkout -- <file>` and records the failure in `agent_incidents.metadata`.

### 3.5 GitHub REST API Pull Request Generation Protocol
If `SWARM_GITHUB_TOKEN` and `SWARM_GITHUB_REPO` are configured, Iron Man communicates with the GitHub REST API v3:
1. **Push Branch**:
   ```bash
   git push origin agent/fix-<incident-id>
   ```
2. **Open Pull Request**:
   - Endpoint: `POST https://api.github.com/repos/{owner}/{repo}/pulls`
   - Headers: `Authorization: Bearer ${SWARM_GITHUB_TOKEN}`, `Accept: application/vnd.github.v3+json`
   - Request Body:
     ```json
     {
       "title": "fix(swarm): [Iron Man] Autonomous remediation for incident #<incident-id>",
       "head": "agent/fix-<incident-id>",
       "base": "main",
       "body": "## Autonomous Swarm Remediation Report\n\n**Incident ID:** `<incident-id>`\n**Detected By:** Thanos Swarm\n\n### Diagnostic Summary\n..."
     }
     ```
3. **Database Status Update**:
   Upon successful PR creation, Iron Man notifies Thanos, who executes:
   ```sql
   UPDATE public.agent_incidents
   SET status = 'PR_OPENED',
       updated_at = NOW()
   WHERE id = '<incident-id>';
   ```

### 3.6 Edge-Case Handling & Rollback Procedures
- **Merge Conflicts**: If the upstream `main` branch has diverged, Iron Man executes `git checkout main && git branch -D agent/fix-<incident-id>` and flags the incident for human review.
- **Never Push Directly to `main`**: Iron Man is strictly forbidden from pushing commits directly to the production branch `main`. All autonomous code remedies must flow through a supervised Pull Request.

---

## 4. AGENT 2: THOR | INFRASTRUCTURE, API LATENCY & DATABASE POOL HEALTH

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AGENT 2: THOR (INFRASTRUCTURE & UPTIME GUARDIAN)                │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Identifier           │ thor                                                            │
│ Classification       │ Edge Network / API Latency / Database Pool Surveillance         │
│ Source Implementation│ services/swarm/workers/agent-workers.ts                         │
│ Execution Mode       │ Continuous Interval Loop (Every 30 Seconds)                     │
│ Target Subsystems    │ Next.js Web Edge, REST API Routes, Supabase DB Pooler, DNS, SSL │
│ SLA Latency Limit    │ P95 < 2000ms / HTTP 5xx Tolerance = 0                           │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 4.1 Mission Profile & System Boundary
Thor is the lightning-fast vanguard of platform stability. His directive is the unyielding surveillance of physical and edge infrastructure. Thor continuously interrogates platform availability, validates network round-trip time (RTT), calculates high-order latency percentiles, audits Supabase PostgreSQL connection poolers, and detects SSL/TLS certificate decay before any human user encounters a broken screen or spinning wheel.

### 4.2 Endpoint Surveillance Matrix & Probe Mechanics
Thor executes probe ticks every 30,000 ms. Each tick dispatches asynchronous HTTP probes against the **Canonical Platform Matrix**:

```
┌───────────────────────────┬───────────────────────────────────┬──────────────┬──────────────┐
│ Endpoint Designation      │ Target URI Path                   │ Method       │ Max Allowed  │
├───────────────────────────┼───────────────────────────────────┼──────────────┼──────────────┤
│ Core Landing Experience   │ /                                 │ GET          │ 2500 ms      │
│ Property Marketplace Feed │ /listings                         │ GET          │ 2500 ms      │
│ Real-Time Search Engine   │ /api/search?q=Prishtine           │ GET          │ 2000 ms      │
│ Platform Hub Index        │ /api/hub-index                    │ GET          │ 2000 ms      │
│ Telemetry Ingest Gateway  │ /api/telemetry                    │ POST         │ 1500 ms      │
│ Protected Saved Searches  │ /api/saved-searches               │ GET (Anon)   │ 1000 ms (401)│
│ Supabase REST Pooler      │ /rest/v1/                         │ GET          │ 1500 ms      │
└───────────────────────────┴───────────────────────────────────┴──────────────┴──────────────┘
```

#### Probe Execution Contract
1. **User-Agent Identification**: Every outbound HTTP request must carry the header:
   ```http
   User-Agent: BlejePronen-Swarm-Thor/1.0 (Autonomous-Watchdog)
   ```
2. **Hard Timeout Gate**: Probes are equipped with an `AbortController` set to **8,000 ms**. If a target fails to respond within 8 seconds, the request is aborted immediately, and Thor flags an explicit `CONNECTION_TIMEOUT` incident.
3. **HTTP Cache Bypassing**: To measure true origin and database latency rather than stale CDN cache hits, Thor appends an ephemeral microsecond entropy query parameter:
   ```
   ?_bp_probe=<timestamp_microseconds>
   ```

### 4.3 Latency Profiling Mathematics (P50, P90, P95, P99)
Thor maintains a rolling ring buffer $L = [l_1, l_2, \dots, l_N]$ of the last $N = 120$ latency measurements (covering a sliding 1-hour window).

#### Percentile Computation Algorithm
Let $L_{\text{sorted}}$ be the ascending sorted array of latencies:
$$L_{\text{sorted}} = \text{sort}(L), \quad |L| = N$$
The $p$-th percentile latency $P_p$ is computed via linear interpolation at index $i$:
$$i = \frac{p}{100} \times (N - 1) + 1$$
Specifically, Thor computes:
- **P50 (Median Performance)**: Operational baseline for standard mobile network connections.
- **P90 (Tail Degradation Indicator)**: Reflects database query overhead during concurrent traffic.
- **P95 (SLA Threshold Benchmark)**: The non-negotiable contract boundary. If $P_{95} > 2,000 \text{ ms}$, Thor emits a `P2_HIGH` incident.
- **P99 (Extreme Edge Anomaly)**: Detects cold-start micro-outages or lock contention spikes.

### 4.4 HTTP 5xx Catastrophe Protocols & Edge Failover Triggers
If any monitored endpoint returns an HTTP status code in the 5xx range ($500, 502, 503, 504$):
1. **Immediate P1_CRITICAL Incident Generation**:
   Thor immediately compiles the defect payload:
   ```typescript
   this.reportIncident({
     severity: 'P1_CRITICAL',
     title: `Infrastructure 5xx Error on ${ep.name}`,
     description: `HTTP ${res.status} returned from ${ep.url} after ${duration}ms`,
     locationOrUrl: ep.url,
     errorName: `HTTP_${res.status}`,
     metadata: { httpStatus: res.status, latencyMs: duration, headers: Object.fromEntries(res.headers.entries()) }
   })
   ```
2. **Instant Retest Pass**: Thor waits $1,500 \text{ ms}$ and executes a secondary validation probe. If the second probe fails, Thanos immediately activates the alert dispatch pipeline to page the on-call engineer and triggers Iron Man for diagnostic triage.

### 4.5 Supabase PostgreSQL Pooler Health & Lock Contention Diagnostics
Thor connects directly to Supabase via `DATABASE_URL` (direct port 5432 or Transaction Pooler port 6543) and performs routine diagnostic sweeps on database performance catalogs:

#### Pooler Contention Inspection Query
```sql
SELECT
  count(*) AS total_connections,
  count(*) FILTER (WHERE state = 'active') AS active_connections,
  count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction,
  count(*) FILTER (WHERE wait_event_type IS NOT NULL) AS waiting_connections,
  max(EXTRACT(EPOCH FROM (now() - query_start))) AS longest_active_query_seconds
FROM pg_stat_activity
WHERE datname = 'postgres' AND pid <> pg_backend_pid();
```

#### Diagnostic Thresholds
- **Connection Saturation**: If $\frac{\text{active\_connections}}{\text{max\_connections}} > 0.85$, Thor raises a `P2_HIGH` alert: *"PostgreSQL Connection Pool Approaching Exhaustion"*.
- **Idle In Transaction Deadlocks**: If $\text{idle\_in\_transaction} > 5$ for more than 60 seconds, Thor flags a potential transaction leak in application code.
- **Runaway Long Queries**: If $\text{longest\_active\_query\_seconds} > 15.0$, Thor logs the active query string and escalates a `P2_HIGH` performance degradation report.

### 4.6 SSL/TLS Certificate Life-Cycle & DNS Integrity Probing
1. **Certificate Expiration Audit**:
   Thor inspects the TLS handshake certificate chain on `SWARM_TARGET_WEB_URL`:
   Let $t_{\text{cert}}$ be the `valid_to` date of the leaf X.509 certificate.
   Let $\Delta t_{\text{exp}} = \frac{t_{\text{cert}} - t_{\text{now}}}{86400 \times 1000} \text{ days}$.
   - If $\Delta t_{\text{exp}} < 14 \text{ days}$: Emit `P3_WARNING`.
   - If $\Delta t_{\text{exp}} < 3 \text{ days}$: Emit `P1_CRITICAL`.
2. **DNS Resolution Latency**:
   Thor benchmarks DNS lookups for `blejepronen.com`. If DNS resolution latency exceeds **500 ms**, a network routing anomaly incident is generated.

---

## 5. AGENT 3: HULK | RUNTIME EXCEPTIONS & CRASH TELEMETRY INTERCEPTOR

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AGENT 3: HULK (CRASH & EXCEPTION INTERCEPTOR)                   │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Identifier           │ hulk                                                            │
│ Classification       │ Real-Time Crash Telemetry & Exception Stream Ingestion          │
│ Source Implementation│ services/swarm/workers/agent-workers.ts                         │
│ Execution Mode       │ Continuous Interval Loop (Every 15 Seconds)                     │
│ Target Subsystems    │ Supabase telemetry_events Table, React Error Boundaries, Expo   │
│ Anomaly Trigger      │ Crash Rate > 5 errors / minute $\implies$ P1_CRITICAL           │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 5.1 Mission Profile & Data Ingestion Pipelines
Hulk is the relentless brute-force interceptor of application crashes. While Thor monitors the external server perimeter, Hulk dives deep into the internal telemetry stream. Hulk captures runtime exceptions originating from both the Next.js React 19 web application and the Expo React Native mobile app. Nothing breaks in the dark; Hulk intercepts every unhandled promise rejection, render boundary explosion, and network failure the millisecond it occurs.

### 5.2 Telemetry Events Ingestion & Realtime Streaming
Hulk connects to the `public.telemetry_events` table in Supabase (provisioned in [`supabase/migrations/20260928_telemetry.sql`](file:///home/f0id/Downloads/blejepronen/supabase/migrations/20260928_telemetry.sql)).

#### Query Ingestion Specification
Every 15 seconds, Hulk fetches newly recorded error events using the service-role client:
```sql
SELECT id, event, props, created_at
FROM public.telemetry_events
WHERE event ILIKE '%error%'
   OR event ILIKE '%exception%'
   OR event ILIKE '%crash%'
   OR (props->>'error') IS NOT NULL
ORDER BY created_at DESC
LIMIT 50;
```

#### Event Ingestion Payload Contract
The incoming event payload adhering to the telemetry contract:
```json
{
  "source": "web", // or "mobile"
  "event": "client_error",
  "props": {
    "message": "Cannot read properties of undefined (reading 'avatar_url')",
    "stack": "TypeError: Cannot read properties of undefined...\n    at ProfileHeader (ProfileHeader.tsx:44:12)",
    "url": "https://blejepronen.com/profili/104",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)...",
    "timestamp": 1791651800000
  }
}
```

### 5.3 Client-Side Error Boundary Interception (Web & Mobile)
Hulk tracks exceptions across two distinct application runtime boundaries:
1. **Next.js Web Runtime**:
   - Intercepts crashes captured by `<ErrorBoundary>` components in `app/global-error.tsx`, `app/error.tsx`, and route segments.
   - Monitors hydration mismatch errors (`Hydration failed because the server-rendered HTML didn't match the client`).
2. **Expo React Native Mobile Runtime**:
   - Intercepts uncaught exceptions originating from native mobile bridging, unhandled gesture rejections in React Native Gesture Handler, or audio driver failures in VoIP components.

### 5.4 Stack Trace De-Obfuscation, Normalization & Fingerprinting
When a crash payload arrives, the raw stack trace is frequently contaminated with memory addresses, ephemeral line numbers, or bundler wrapper artifacts. Hulk executes **Stack Trace Normalization**:

```
[Raw Stack Trace]
  at t.render (ProfileHeader-c4b7.js:1:4218)
  at Object.onClick (chunk-819.js:4:1290)

                     │ Normalization Regex Pipeline
                     ▼
[Normalized Signature]
  PROFILEHEADER -> RENDER -> TYPEERROR(CANNOT READ PROPERTIES OF UNDEFINED)
```

#### Fingerprint Synthesis
Hulk strips ephemeral IDs, dynamic query hashes, and user IDs, distilling the error down to its canonical root cause:
$$\text{Signature} = \text{ErrorType} \parallel \text{"@"} \parallel \text{ComponentOrFile} \parallel \text{"#"} \parallel \text{TopStackFrame}$$
This canonical signature is passed to Thanos's Deduplication Engine, ensuring that 500 users experiencing the same bug result in **one single incident ticket** with an occurrence counter of 500, rather than 500 distinct alarms.

### 5.5 Crash Spike Anomaly Detection Mathematics (Z-Score Algorithm)
To distinguish between isolated client network hiccups and catastrophic regression spikes, Hulk implements a **Z-Score Anomaly Detector**.

Let $X = [x_1, x_2, \dots, x_k]$ represent the error counts in 1-minute time buckets over the preceding 60 minutes.
The historical mean $\mu$ and standard deviation $\sigma$ are calculated:
$$\mu = \frac{1}{k} \sum_{i=1}^k x_i, \quad \sigma = \sqrt{\frac{1}{k-1} \sum_{i=1}^k (x_i - \mu)^2}$$
For the current 1-minute bucket count $x_{\text{current}}$, the Z-score $Z$ is computed:
$$Z = \frac{x_{\text{current}} - \mu}{\sigma + \epsilon} \quad (\text{where } \epsilon = 0.001 \text{ prevents division by zero})$$

#### Triage Criteria
- **Normal Baseline**: $Z < 2.0$ (Random client jitter).
- **Elevated Warning**: $2.0 \le Z < 4.0 \implies \text{P2\_HIGH}$.
- **Catastrophic Spike**: $Z \ge 4.0$ OR $x_{\text{current}} \ge 5 \text{ crashes/min} \implies \text{P1\_CRITICAL}$.

### 5.6 Incident Escalation & Iron Man Coupling
Whenever Hulk identifies a crash that breaches the `P1_CRITICAL` or `P2_HIGH` threshold:
1. Hulk emits `incident:detected` to the `SwarmEventBus`.
2. Thanos dedupes and persists the ticket to `public.agent_incidents`.
3. Thanos immediately mobilizes Agent 1 (Iron Man), transmitting the normalized stack trace and target file path.
4. Iron Man checks out the repository, locates the exact line in source code, and initiates the automated fix procedure.

---

## 6. AGENT 4: HAWKEYE | UI/UX ERGONOMICS, SAFE-AREA BOUNDS & PIXEL AUDITOR

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AGENT 4: HAWKEYE (PIXEL & ERGONOMICS AUDITOR)                   │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Identifier           │ hawkeye                                                         │
│ Classification       │ Headless DOM Inspector / Safe-Area / Mobile Ergonomics Auditor  │
│ Source Implementation│ services/swarm/workers/agent-workers.ts                         │
│ Execution Mode       │ Continuous Interval Loop (Every 5 Minutes)                      │
│ Target Subsystems    │ Web Viewports (375-430px), Mobile SafeArea, CSS Layout Engine   │
│ Anomaly Trigger      │ scrollWidth > innerWidth OR Touch Target < 44px                 │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 6.1 Mission Profile & Visual Reliability Standards
Hawkeye is the swarm's master marksman of visual perfection. A platform can have 100% server uptime, but if a button is pushed off-screen by a horizontal scroll leak, an input is clipped by an iPhone Dynamic Island, or a tap target is only 28px tall, the user experience is broken. Hawkeye audits layout ergonomics, responsive breakpoints, touch boundaries, and CSS geometry across real mobile screen dimensions.

### 6.2 Headless Mobile Viewport Simulation Suite
Hawkeye evaluates platform pages against the **Canonical Mobile Viewport Matrix**:

```
┌─────────────────────────┬──────────────────────┬─────────────┬──────────────────────────┐
│ Device Class            │ Viewport Dimension   │ Aspect Ratio│ Target Ergonometric Zone │
├─────────────────────────┼──────────────────────┼─────────────┼──────────────────────────┤
│ iPhone SE / Mini        │ 375 × 667 px         │ 16:9        │ Compact / Narrow Header  │
│ iPhone 14 / 15 Standard │ 390 × 844 px         │ 19.5:9      │ Standard iOS Safe-Area   │
│ iPhone 15 / 16 Pro Max  │ 430 × 932 px         │ 19.5:9      │ Dynamic Island / Bottom  │
│ Android Pixel Standard  │ 412 × 915 px         │ 20:9        │ Android Gesture Bar      │
│ Small Android Compact   │ 360 × 800 px         │ 20:9        │ Constrained Minimum View │
└─────────────────────────┴──────────────────────┴─────────────┴──────────────────────────┘
```

### 6.3 Horizontal Scroll Leakage Detection Algorithm (Overflow-X Auditing)
Horizontal scroll leakage is a catastrophic mobile UX failure where content wider than the screen causes the page to drift awkwardly from left to right.

#### The Detection Theorem
For any rendered DOM tree at viewport width $W_{\text{viewport}}$:
$$\text{Leak Condition}: \quad \text{document.documentElement.scrollWidth} > W_{\text{viewport}}$$
If this inequality holds by even $1.0 \text{ pixel}$, horizontal scroll leakage is verified.

#### Culprit Element Isolation Script
Hawkeye injects a recursive DOM boundary evaluator to locate the precise DOM element responsible for the overflow:
```javascript
function locateOverflowCulprits() {
  const docWidth = document.documentElement.clientWidth;
  const culprits = [];
  document.querySelectorAll('*').forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.right > docWidth || rect.left < 0) {
      culprits.push({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        rightOffset: rect.right - docWidth,
        inlineStyle: el.getAttribute('style'),
      });
    }
  });
  return culprits;
}
```
If culprits are detected:
- Hawkeye logs a `P2_HIGH` incident: *"Horizontal Viewport Overflow Detected ($+\Delta x \text{ px})$"*.
- The exact offending element classes are attached to `agent_incidents.metadata`.

### 6.4 Touch Target Geometry & WCAG Ergonomics (<44px Violations)
On physical mobile hardware, human fingers require a minimum physical contact area to prevent missed taps, rage-clicks, and unintended navigation.

#### The 44×44px Standard (Apple HIG & WCAG 2.1 Success Criterion 2.5.5)
Every interactive element ($E \in \{ \text{button}, \text{a}, \text{input}, \text{select}, [\text{role}="button"] \}$):
$$\text{Effective Width}(E) \ge 44 \text{ px} \quad \land \quad \text{Effective Height}(E) \ge 44 \text{ px}$$
Where Effective Dimension includes native element bounding box plus `hitSlop` or touch padding:
$$\text{Effective Width} = \text{rect.width} + \text{padding}_{\text{horizontal}} + \text{hitSlop}_{\text{horizontal}}$$

#### Violation Classification
- Any primary action button (e.g., "Kërko", "Kontakto", "Dërgo Mesazh", "Thirr") measuring $< 40 \text{ px}$ in height triggers an automatic `P2_HIGH` incident.
- Secondary icon buttons (e.g., close buttons, bookmark stars, filter chips) measuring $< 32 \text{ px}$ trigger a `P3_WARNING` incident.

### 6.5 Safe-Area Inset & Dynamic Island Collision Audits
Hawkeye verifies that mobile presentations respect physical screen cutouts and navigation bars:
1. **Top Insets**:
   Headers, navigation bars, and modals must incorporate `padding-top: env(safe-area-inset-top)` or equivalent Expo `<SafeAreaView>` containers to prevent text colliding with the camera notch or Dynamic Island.
2. **Bottom Insets**:
   Bottom action sheets, floating "Kontakto" bars, and bottom tab navigators must incorporate `padding-bottom: env(safe-area-inset-bottom)`.
3. **Modal Eradication**:
   Hawkeye verifies that "Followers" and "Following" interfaces render as dedicated edge-to-edge screens with top-anchored "X" dismiss controls rather than awkward partial-height drag-down sheets.

### 6.6 Visual Regression & Layout Shift (CLS) Enforcement
Hawkeye measures **Cumulative Layout Shift (CLS)** during synthetic page hydration:
$$\text{CLS} = \sum \text{Impact Fraction} \times \text{Distance Fraction}$$
- **Acceptable Contract**: $\text{CLS} < 0.1$.
- **Unacceptable Jump**: $\text{CLS} \ge 0.1 \implies \text{P2\_HIGH}$ incident.
- Typical causes flagged by Hawkeye:
  - Unsized property card images lacking explicit `aspect-ratio` or Next.js `width`/`height` attributes.
  - Asynchronous banner injections shifting listing cards downward after load.

---

## 7. AGENT 5: CAPTAIN AMERICA | SYNTHETIC USER JOURNEYS & END-TO-END FUNNELS

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AGENT 5: CAPTAIN AMERICA (SYNTHETIC USER FUNNELS)               │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Identifier           │ captain-america                                                 │
│ Classification       │ Autonomous End-to-End Synthetic User Flow Automation            │
│ Source Implementation│ services/swarm/workers/agent-workers.ts                         │
│ Execution Mode       │ Continuous Interval Loop (Every 10 Minutes)                     │
│ Target Subsystems    │ Core Conversion Funnels, Search Engine, Auth, Listing Detail    │
│ Success Benchmark    │ 100% Funnel Integrity / Zero Broken Conversion Paths            │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 7.1 Mission Profile & The Synthetic Actor Paradigm
Captain America is the frontline tester of real user experiences. Servers can respond with HTTP 200, and JavaScript can run without crashing, but if a buyer cannot search for an apartment in Prishtina, open a property listing, or contact an agency, the business is completely halted. Captain America acts as an untiring synthetic human user, navigating through the platform 24/7 to guarantee every critical funnel operates flawlessly.

### 7.2 The 5 Canonical Real-Estate User Funnels
Every 10 minutes, Captain America executes the **Five Golden User Journeys**:

```
[Funnel 1: Search & Filter] ───> [Funnel 2: Property Detail] ───> [Funnel 3: In-App Messaging]
              │                                                                  │
              ▼                                                                  ▼
[Funnel 4: OTP Authentication] <───────────────────────────────── [Funnel 5: Post Property Draft]
```

#### Funnel 1: Search & Filter Exploration Journey
1. **Target**: `GET /api/search?q=Prishtine&type=apartment&limit=12`
2. **Execution Contract**:
   - Dispatches a multi-parameter search query simulating real buyer search criteria in Prishtina.
   - Asserts HTTP status is strictly `200 OK`.
   - Asserts response payload is a JSON array or object containing a `results` array.
   - Asserts result count is $> 0$.
   - Asserts every item in `results` contains non-null mandatory fields:
     $$\text{Item} \implies \{ \text{id}, \text{title}, \text{price}, \text{city}, \text{images} \}$$
   - Validates that `price` is a positive number and `images` contains at least one valid URI string.

#### Funnel 2: Property Detail Hydration Journey
1. **Target**: `GET /api/hub-index` followed by `GET /prona/[id]`
2. **Execution Contract**:
   - Extracts a valid listing ID from the marketplace feed.
   - Fetches the listing detail route `/prona/[id]`.
   - Asserts that all structural sections hydrate within $2,000 \text{ ms}$:
     - Media Gallery (`<ImageGallery />`) with primary hero photo.
     - Spec Sheet (Rooms, Area in $m^2$, Floor, Heating Type).
     - Pricing breakdown (Total Price & Price per $m^2$).
     - Contact Action Triggers ("Telefono", "WhatsApp", "Dërgo Mesazh").

#### Funnel 3: In-App Messaging & Inquiry Delivery
1. **Target**: `GET /api/conversations`
2. **Execution Contract**:
   - Asserts that when accessed anonymously, the endpoint returns `401 Unauthorized` (security gate intact).
   - When accessed with a synthetic test user token, asserts that conversations load within $500 \text{ ms}$.

#### Funnel 4: OTP Authentication & Token Refresh Flow
1. **Target**: `/api/send-otp` and `/api/verify-otp`
2. **Execution Contract**:
   - Dispatches an empty OTP request: asserts `400 Bad Request` with structured error `{ error: "Email or phone required" }`.
   - Validates that server never returns `500 Internal Server Error` on malformed authentication payloads.

#### Funnel 5: Post Property Validation Boundary
1. **Target**: `/api/profile` & Post Property Form API
2. **Execution Contract**:
   - Simulates submitting an incomplete property form missing mandatory fields (e.g., missing price or missing city).
   - Asserts that the validation schema intercepts the submission and returns client-readable validation errors rather than an unhandled database exception.

### 7.3 DOM State Assertion Contracts & Zero-False-Positive Testing
To avoid false-positive alarm fatigue, Captain America uses a **Two-Pass Verification Standard**:
- If an assertion fails on Pass 1 (e.g., temporary network blip during search API fetch), Captain America waits **3,000 ms** and re-executes Pass 2.
- Only if Pass 2 also fails does Captain America register a confirmed `SYNTHETIC_FUNNEL_FAILURE` incident.

### 7.4 API Contract Verification & Schema Integrity Guardrails
Captain America verifies that backend API responses conform strictly to TypeScript data transfer objects (DTOs):

```typescript
export interface ExpectedListingDto {
  id: string
  title: string
  price: number
  currency: 'EUR'
  city: string
  property_type: string
  is_active: boolean
  created_at: string
}
```
If an API response introduces an undocumented breaking schema change (e.g., `price` returns as a string `"120000"` instead of a number, or `title` is null), Captain America flags a `P2_HIGH` contract breach immediately.

### 7.5 Authentication Token Lifecycle & Session Rotation Auditing
Captain America monitors JWT token refreshing:
- Verifies that expired session tokens correctly invoke Supabase `auth.refreshSession()`.
- Validates that expired refresh tokens are rejected cleanly and redirect to `/login` without looping or deadlocking.

### 7.6 Degradation Reporting & Triage Dispatch
When any of the 5 canonical funnels fail:
1. Captain America compiles a full trace: Target URL, HTTP status, request payload, response body, latency duration, and failed assertion rule.
2. The payload is emitted as `P2_HIGH` via `incident:detected`.
3. Thanos ingests the defect, deduplicates, and alerts the engineering team with full reproduction context.

---

## 8. AGENT 6: LOKI | SECURITY, ROW-LEVEL SECURITY & OAUTH FLOW INTEGRITY

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AGENT 6: LOKI (SECURITY & RLS PROBING ENGINE)                   │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Identifier           │ loki                                                            │
│ Classification       │ Adversarial Security Auditor / RLS Probe / Auth Barrier Guard   │
│ Source Implementation│ services/swarm/workers/agent-workers.ts                         │
│ Execution Mode       │ Continuous Interval Loop (Every 2 Minutes)                      │
│ Target Subsystems    │ Supabase RLS, Auth Endpoints, OTP Lockouts, HTTP Security Header│
│ Breach Trigger       │ Anon write/read on protected table $\implies$ P1_CRITICAL       │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 8.1 Mission Profile & Adversarial Verification Architecture
Loki is the swarm's adversarial white-hat security specialist. While other agents assume benevolent system conditions, Loki assumes an active, intelligent adversary attempting to breach database boundaries, tamper with user data, bypass Row-Level Security (RLS) policies, brute-force OTP tokens, or access administrative endpoints. Loki probes the platform's security perimeters around the clock.

### 8.2 Row-Level Security (RLS) Permeability Testing
Supabase databases rely on PostgreSQL Row-Level Security. A single missing RLS policy or an accidental `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` exposes private user data or allows public writes.

#### Loki's Autonomous RLS Penetration Probe
Every 2 minutes, Loki executes an adversarial probe using the public `NEXT_PUBLIC_SUPABASE_ANON_KEY`:

```
┌───────────────────────────┬───────────────────┬──────────────┬──────────────────────────┐
│ Target Table              │ Adversarial Action│ Expected RLS │ Severity on Breach       │
├───────────────────────────┼───────────────────┼──────────────┼──────────────────────────┤
│ public.telemetry_events   │ INSERT unauthorized│ DENIED (401) │ P1_CRITICAL (Breach)     │
│ public.agent_incidents    │ INSERT unauthorized│ DENIED (401) │ P1_CRITICAL (Breach)     │
│ public.agent_heartbeats   │ UPDATE unauthorized│ DENIED (401) │ P1_CRITICAL (Breach)     │
│ public.profiles           │ SELECT other user │ SANITIZED    │ P2_HIGH (Data Leak)      │
│ auth.users                │ SELECT direct     │ DENIED (401) │ P1_CRITICAL (Auth Leak)  │
└───────────────────────────┴───────────────────┴──────────────┴──────────────────────────┘
```

#### Penetration Execution Code
```typescript
const probeUrl = `${this.supabaseUrl}/rest/v1/telemetry_events`;
const res = await fetch(probeUrl, {
  method: 'POST',
  headers: {
    apikey: this.anonKey,
    Authorization: `Bearer ${this.anonKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  },
  body: JSON.stringify({ event: 'adversarial_penetration_test' }),
});

// IF STATUS IS 200 OR 201 -> RLS HAS FAILED!
if (res.ok) {
  this.reportIncident({
    severity: 'P1_CRITICAL',
    title: 'CRITICAL SECURITY BREACH: telemetry_events is publicly writable',
    description: 'Anonymous client successfully inserted data into telemetry_events without service-role credentials. RLS policy is missing or misconfigured.',
    locationOrUrl: probeUrl,
    errorName: 'RLS_SECURITY_BYPASS',
  });
}
```

### 8.3 Authentication Barrier Probing & OTP Lockout Verification
Loki audits the authentication endpoints against brute-force attacks:
1. **Endpoint Protection**:
   - Target: `/api/send-otp` and `/api/verify-otp`
   - Loki verifies that rate limiting is active and rejects rapid-fire requests.
2. **Lockout Policy Audit**:
   - Verifies that after repeated incorrect verification attempts, the user record's `otp_locked_until` column in `public.profiles` is populated and active.
   - Asserts that locked accounts receive `429 Too Many Requests` or `403 Forbidden` with the remaining lockout duration in seconds.

### 8.4 Injection Vectors & Parameter Tampering Audits
Loki tests search query and filter endpoints for SQL injection vulnerabilities:
- Interrogates `/api/search` with classic SQL injection strings:
  ```
  /api/search?q=' OR '1'='1
  /api/search?q=1; DROP TABLE listings; --
  /api/search?q=" UNION SELECT null, email, password FROM profiles --
  ```
- **Acceptable Behavior**: The API safely treats the string as a literal search query or sanitizes it, returning HTTP 200 with zero results or HTTP 400.
- **Unacceptable Behavior**: Database syntax error, 500 Internal Server Error, or unexpected table dumping triggers immediate `P1_CRITICAL` security escalation.

### 8.5 Cookie Hygiene, CORS & HTTP Security Header Auditing
Loki inspects the response headers of all platform pages:
1. **Cookie Flags**:
   All authentication cookies (`sb-*-auth-token`) must carry:
   - `Secure`: Ensures transmission over HTTPS only.
   - `HttpOnly`: Prevents client-side JavaScript access and XSS theft.
   - `SameSite=Lax` or `Strict`: Guards against Cross-Site Request Forgery (CSRF).
2. **HTTP Security Headers**:
   Loki asserts presence of:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY` or `SAMEORIGIN` (Clickjacking defense)
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS)
   - `Referrer-Policy: strict-origin-when-cross-origin`

### 8.6 Security Breach Catastrophe Escalation Protocols
If an RLS bypass or unauthorized data exposure is verified:
1. Loki immediately fires a `P1_CRITICAL` incident.
2. AlertDispatcher sends an emergency high-priority page to all configured channels.
3. Thanos logs the exact HTTP request and vector to `agent_incidents`.
4. Loki recommends immediate application of the fix migration script.

---

## 9. AGENT 7: BLACK WIDOW | REAL-TIME CHAT & WEBSOCKET STATE MONITOR

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AGENT 7: BLACK WIDOW (REAL-TIME CHAT & WS MONITOR)              │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Identifier           │ black-widow                                                     │
│ Classification       │ WebSocket Protocol Auditor / Real-Time Chat Telemetry Guard     │
│ Source Implementation│ services/swarm/workers/agent-workers.ts                         │
│ Execution Mode       │ Continuous Interval Loop (Every 45 Seconds)                     │
│ Target Subsystems    │ Supabase Realtime WebSockets, Chat Rooms, Read Receipts, Typing │
│ Latency SLA          │ WS Handshake < 500ms / Message Ack < 200ms                      │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 9.1 Mission Profile & Real-Time Communications Telemetry
Black Widow is the silent, lethal monitor of real-time communication channels. Property deals on Bleje Pronën rely on instant messaging between buyers and sellers. When a buyer asks "A është prona ende e lirë?", that message must be delivered instantly, read receipts must update in real time with double checkmarks, and the WebSocket connection must remain resilient against network transitions. Black Widow audits the real-time communications infrastructure 24/7.

### 9.2 Supabase Realtime WebSocket Protocol Auditing
Black Widow evaluates the Supabase Realtime WebSocket endpoint:
$$\text{WS URL} = \text{SWARM\_SUPABASE\_URL.replace}('https://', 'wss://') \parallel \text{"/realtime/v1/websocket?apikey="} \parallel \text{anonKey} \parallel \text{"&vsn=1.0.0"}$$

#### Handshake Telemetry Protocol
1. **Connection Timing**:
   Measures time from initial TCP handshake through HTTP `Upgrade: websocket` to `101 Switching Protocols`:
   $$t_{\text{handshake}} = t_{\text{connected}} - t_{\text{init}}$$
   If $t_{\text{handshake}} > 1,500 \text{ ms}$, Black Widow logs a `P2_HIGH` warning.
2. **Heartbeat Protocol (`heartbeat` frame)**:
   Every 30 seconds, Black Widow dispatches a Phoenix Channel heartbeat frame:
   ```json
   {
     "topic": "phoenix",
     "event": "heartbeat",
     "payload": {},
     "ref": "1"
   }
   ```
   Measures response time for server reply:
   ```json
   {
     "topic": "phoenix",
     "event": "phx_reply",
     "payload": { "status": "ok", "response": {} },
     "ref": "1"
   }
   ```
   If server fails to reply within $2,000 \text{ ms}$, the WebSocket connection is deemed stalled.

### 9.3 Chat Message Delivery Latency & End-to-End Handshake
Black Widow audits message round-trip time (RTT):
1. **Message Dispatch**:
   Dispatches a synthetic probe message over an isolated test channel.
2. **Server Acknowledgment (ACK)**:
   Measures time until PostgreSQL emits the `INSERT` broadcast event back over the WebSocket.
3. **Delivery Benchmark**:
   - **Ideal**: $< 100 \text{ ms}$.
   - **Acceptable**: $100 - 300 \text{ ms}$.
   - **Degraded**: $> 500 \text{ ms} \implies \text{P2\_HIGH}$ warning.

### 9.4 Read Receipts, Typing Indicators & State Synchronization
Black Widow audits the reactivity of real-time state flags in `app/mesazhet/[id]/page.tsx`:
1. **Read Receipt Update (`is_read: true`)**:
   - Asserts that when a message is marked as read, Supabase Realtime emits an `UPDATE` event for the `messages` table.
   - Validates that client UI updates double checkmarks from gray/pending to gold `#C8B882` or green without requiring page reload.
2. **Typing Presence Indicator**:
   - Probes the Realtime Presence channel for the active conversation topic.
   - Validates that presence joins and leaves register within $150 \text{ ms}$.

### 9.5 Connection Storm Mitigation & Backpressure Audits
When hundreds of users reconnect simultaneously (e.g., following a network blip), WebSocket servers can experience connection storms.
Black Widow audits:
- Exponential backoff jitter on client reconnect logic (`Math.random() * delay`).
- Validates that the Supabase Realtime cluster does not drop active message streams or exhaust worker sockets.

### 9.6 Channel Degraded Protocols & Recovery Signaling
If Black Widow detects that chat channels are dropping packets or timing out:
1. Emits `incident:detected` with severity `P2_HIGH` or `P1_CRITICAL`.
2. Telemetry dashboard reflects degraded real-time status.
3. Notifies Thanos to monitor database connection counts and message table locks.

---

## 10. AGENT 8: DOCTOR STRANGE | IN-APP CALLING & WEBRTC AUDIO SIGNALING

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AGENT 8: DOCTOR STRANGE (TELECOMMUNICATIONS GUARDIAN)           │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Identifier           │ doctor-strange                                                  │
│ Classification       │ VoIP WebRTC Telecommunications / P2P Audio Signaling Auditor    │
│ Source Implementation│ services/swarm/workers/agent-workers.ts                         │
│ Execution Mode       │ Continuous Interval Loop (Every 60 Seconds)                     │
│ Target Subsystems    │ mobile/lib/calling.ts, CallModal.tsx, WebRTC Signaling Channels│
│ Failure Trigger      │ Missing Mic Permission OR Broken Call Gate $\implies$ P1_CRITICAL│
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 10.1 Mission Profile & Telecommunications Subsystem Overview
Doctor Strange is the mystic master of telecommunications and real-time audio streams. In Bleje Pronën, in-app VoIP calling bridges property seekers with agency brokers instantly over peer-to-peer WebRTC audio connections. Telecommunications failures are unforgiving: an absent microphone permission key crashes native mobile apps instantly; a broken signaling channel causes calls to ring into void silence; and an unmounted `<CallGate />` renders the call button completely dead. Doctor Strange maintains vigilance over the entire VoIP pipeline.

### 10.2 WebRTC Signaling State Machine Auditing
Doctor Strange continuously verifies the mathematical signaling state machine implemented in `mobile/lib/calling.ts`:

```
               [Initiate Call Button Pressed]
                             │
                             ▼
                   ┌───────────────────┐
                   │   OFFER CREATED   │ ───> Dispatches 'offer' over Supabase Realtime
                   └─────────┬─────────┘
                             │
                             ▼
                   ┌───────────────────┐
                   │  RINGING / INVITE │ ───> Remote peer receives broadcast & vibrates
                   └─────────┬─────────┘
                             │ Remote Peer Answers
                             ▼
                   ┌───────────────────┐
                   │  ANSWER CREATED   │ ───> Dispatches 'answer' back over channel
                   └─────────┬─────────┘
                             │
                             ▼
                   ┌───────────────────┐
                   │  ICE TRICKLING    │ ───> Exchanges ICE Candidates (STUN / TURN)
                   └─────────┬─────────┘
                             │
                             ▼
                   ┌───────────────────┐
                   │  P2P CONNECTED    │ ───> Audio Session Active (Zero-Latency Stream)
                   └───────────────────┘
```

#### State Transition Assertion Table
Doctor Strange verifies the valid transitions of `RTCPeerConnection.connectionState`:

| Previous State | Allowed Next State | Action on Illegal State Jump |
| :--- | :--- | :--- |
| `new` | `connecting` | Normal initial handshake |
| `connecting` | `connected` | ICE traversal successful |
| `connecting` | `failed` | **Flag P1_CRITICAL (NAT Traversal / STUN Failure)** |
| `connected` | `disconnected` | Temporary network fade, initiate ICE restart |
| `disconnected` | `connected` | Self-healed without session teardown |
| `disconnected` | `failed` / `closed`| Terminate call session cleanly, unmount `<CallModal />` |

### 10.3 SDP Offer/Answer Negotiation & ICE Candidate Traversal
Doctor Strange audits signaling payload schemas:
1. **SDP Integrity**:
   - Offer payload must contain valid Session Description Protocol (SDP) text with `type: "offer"` and audio media description `m=audio ... RTP/SAVPF ...`.
   - Rejects corrupted or truncated SDP strings that cause native WebRTC parser panics.
2. **ICE Candidate Exchange**:
   - Candidates must conform to `{ candidate: string, sdpMid: string, sdpMLineIndex: number }`.
   - Asserts that STUN servers (`stun:stun.l.google.com:19302`) resolve and produce valid host/srflx candidates within $1,500 \text{ ms}$.

### 10.4 Native Audio Session Hardware Verification (iOS & Android)
Doctor Strange inspects native deployment files to prevent App Store rejections and operating system permission crashes:

#### iOS Audio Permission Audit
In [`mobile/app.json`](file:///home/f0id/Downloads/blejepronen/mobile/app.json):
```json
"ios": {
  "infoPlist": {
    "NSMicrophoneUsageDescription": "Bleje Pronën ju lejon të realizoni thirrje zanore me shitësin dhe blerësin direkt në aplikacion."
  }
}
```
**Failure Rule**: If `NSMicrophoneUsageDescription` is missing, empty, or undefined, Doctor Strange immediately emits a `P1_CRITICAL` incident. Any attempt to record audio without this key results in a fatal native iOS process termination (`SIGABRT`).

#### Android Audio Permission Audit
In [`mobile/app.json`](file:///home/f0id/Downloads/blejepronen/mobile/app.json):
```json
"android": {
  "permissions": [
    "android.permission.RECORD_AUDIO",
    "android.permission.MODIFY_AUDIO_SETTINGS"
  ]
}
```
**Failure Rule**: If `RECORD_AUDIO` is missing from `android.permissions`, Android runtime permission requests fail silently, rendering the call interface mute.

### 10.5 Call Gate Lifecycle & Frame-Zero Initialization Verification
Doctor Strange verifies the layout tree in [`mobile/app/_layout.tsx`](file:///home/f0id/Downloads/blejepronen/mobile/app/_layout.tsx):
- **Unconditional Gate Mounting**: `<CallGate />` must be mounted **unconditionally** after `</Stack>` so incoming calls can paint above any active screen.
- **Frame-Zero Hydration**: The active authenticated user ID must be resolved synchronously from cache on frame zero (`getSyncAuthUser()`), guaranteeing that incoming call signals do not arrive before auth initialization.
- **Gesture Reliability**: `<CallModal />` must use native modal presentation mechanics rather than fragile off-screen translation coordinates (`dragY = 540`) that swallow touch events.

### 10.6 Telecommunications Failure Triage & Emergency Recovery
If Doctor Strange detects signaling drops, ICE negotiation timeouts, or missing native audio permissions:
1. Emits `incident:detected` with `P1_CRITICAL`.
2. Telemetry dashboard displays immediate telecommunications degradation badge.
3. Escalates to Iron Man with the exact missing permission key or signaling channel parameter.

---

## 11. AGENT 9: SPIDER-MAN | SOCIAL GRAPH REACTIVITY & INSTANT PROFILE HYDRATION

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AGENT 9: SPIDER-MAN (SOCIAL GRAPH & REACTIVITY GUARDIAN)        │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Identifier           │ spider-man                                                      │
│ Classification       │ Social Graph Reactivity / Profile Cache / Zero-Lag UI Auditor   │
│ Source Implementation│ services/swarm/workers/agent-workers.ts                         │
│ Execution Mode       │ Continuous Interval Loop (Every 60 Seconds)                     │
│ Target Subsystems    │ /api/follow, /profili/[id], FollowsModal.tsx, Social Graph DB   │
│ Reactivity SLA       │ Frame-Zero Optimistic UI (<16ms) / Cache Sync < 100ms           │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 11.1 Mission Profile & Social Graph Architecture
Spider-Man is the nimble protector of social graph reactivity and frame-zero interface hydration. On Bleje Pronën, users follow agencies, brokers, and private sellers to track newly posted properties. When a user taps "Ndjek" (Follow) or "Hiq Ndjekësin" (Unfollow), the user interface must react with zero latency, counters must update bidirectionally on frame zero, and profiles must paint instantly without multi-second white screens. Spider-Man weaves the web of social reactivity.

### 11.2 Bidirectional Follow/Unfollow State Reactivity
Spider-Man continuously validates the mathematical consistency of social graph actions:

```
[User A Taps "Ndjek" on User B]
              │
              ├──> Frame Zero (<16ms): Optimistic UI Update
              │     • User A "Të Ndjekurit" (Following) Counter: N + 1
              │     • User B "Ndjekësit" (Followers) Counter: M + 1
              │     • Follow Button transforms: "Ndjek" ───> "Duke u ndjekur" (Following)
              │
              └──> Asynchronous Backend Sync:
                    • POST /api/follow { target_user_id: User B, action: 'follow' }
                    • Database INSERT into follows table
                    • Database triggers increment counters atomically
```

#### The Bidirectional Consistency Theorem
Let $U_A$ be the initiating user and $U_B$ be the target user:
$$\text{If } (U_A \to U_B) \in \text{follows} \implies U_A.\text{following\_count} = N_A \land U_B.\text{followers\_count} = N_B$$
Upon unfollow action $(U_A \not\to U_B)$:
$$U_A.\text{following\_count} = N_A - 1 \quad \land \quad U_B.\text{followers\_count} = N_B - 1$$
Spider-Man audits for desynchronized counters where database counts drift from displayed client totals.

### 11.3 Frame-Zero Profile Hydration & Cache Layer Audits
Opening a user profile by ID (`/profili/[id]`) must paint on frame zero. Spider-Man monitors the multi-tier hydration protocol:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FRAME-ZERO PROFILE HYDRATION TIMELINE                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ T = 0 ms  : Read cached profile from in-memory cache (bp_profile_cache)                │
│ T = 8 ms  : Immediate First Paint: Render Avatar, Full Name, Verified Badge, Counters  │
│ T = 45 ms : Asynchronous Background Fetch: Revalidate from Supabase                    │
│ T = 120 ms: Reconciliation: Seamlessly update bio, new listings, active tags           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
**Violation Rule**: If opening a profile takes $> 500 \text{ ms}$ or displays a blank white screen / full-page spinner before painting cached data, Spider-Man logs a `P2_HIGH` hydration degradation incident.

### 11.4 Followers/Following Full-Screen Presentation & Search Audits
Spider-Man enforces the redesigned full-screen experience in [`mobile/components/FollowsModal.tsx`](file:///home/f0id/Downloads/blejepronen/mobile/components/FollowsModal.tsx):
- **Full-Screen Architecture**: Dedicated edge-to-edge modal with top "X" close button anchored in the header. Drag handles and partial-height bottom sheets are strictly forbidden.
- **Dual-Tab Fluidity**: Seamless switching between "Ndjekësit" (Followers) and "Të Ndjekurit" (Following) with live counters and zero layout shift.
- **Real-Time In-List Search**: Sub-string filtering across user display names, company titles, and usernames operating at $< 16 \text{ ms}$ keystroke latency without network overhead.
- **Contextual Management Actions**: 3-dot management menu providing "Shiko Profilin", "Hiq Ndjekësin", and "Blloko".

### 11.5 PostgreSQL Counter Concurrency & Race-Condition Detection
Spider-Man audits the backend `/api/follow` route for atomic updates:
```sql
-- Atomic counter update preventing lost-update race conditions
UPDATE public.profiles
SET followers_count = (
  SELECT count(*) FROM public.follows WHERE following_id = $1
),
updated_at = NOW()
WHERE id = $1;
```
Spider-Man dispatches concurrent follow/unfollow requests in rapid succession to ensure counter values never become negative or desynchronized.

### 11.6 Social Graph Synchronization Failure Runbooks
If Spider-Man detects desynchronized follow counters or profile hydration lag:
1. Dispatches `incident:detected` with `P2_HIGH`.
2. Triggers an automatic cache invalidation and database counter reconciliation sweep.
3. Telemetry reflects social graph latency status.

---

## 12. AGENT 10: VISION | MEDIA PIPELINE, STORAGE BUCKETS & AVATAR PROCESSING

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AGENT 10: VISION (MEDIA PIPELINE & STORAGE GUARDIAN)            │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Identifier           │ vision                                                          │
│ Classification       │ Digital Asset Pipeline / Image CDN / Supabase Storage Auditor   │
│ Source Implementation│ services/swarm/workers/agent-workers.ts                         │
│ Execution Mode       │ Continuous Interval Loop (Every 3 Minutes)                      │
│ Target Subsystems    │ Supabase Storage, Image CDN, WebP Downsampling, Next.js Image   │
│ Health Benchmark     │ 100% Asset Availability / Zero 404 Media Links                  │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 12.1 Mission Profile & Digital Asset Pipeline Architecture
Vision is the all-seeing custodian of the media pipeline. Real estate is fundamentally visual: properties sell on the clarity, speed, and fidelity of their photographs. If a listing photo returns a 404 error, an avatar upload explodes memory with a raw 15MB JPEG, or an image delivery CDN lacks caching headers, the platform suffers severely. Vision audits digital assets, Supabase storage buckets, and client-side image processing.

### 12.2 Supabase Storage Bucket Integrity & RLS Policy Audits
Vision audits the three primary storage buckets in Supabase:

```
┌───────────────────────────┬──────────────┬──────────────┬──────────────────────────────┐
│ Storage Bucket Name       │ Visibility   │ Max File Size│ Allowed MIME Types           │
├───────────────────────────┼──────────────┼──────────────┼──────────────────────────────┤
│ listings                  │ Public Read  │ 10 MB        │ image/webp, image/jpeg, png  │
│ avatars                   │ Public Read  │ 5 MB         │ image/webp, image/jpeg, png  │
│ property_documents        │ Authenticated│ 25 MB        │ application/pdf, image/*     │
└───────────────────────────┴──────────────┴──────────────┴──────────────────────────────┘
```

#### Bucket Accessibility Probe
Every 3 minutes, Vision interrogates the Supabase Storage REST API:
```typescript
const bucketUrl = `${this.supabaseUrl}/storage/v1/bucket/${bucketName}`;
const res = await fetch(bucketUrl, {
  headers: { apikey: this.anonKey }
});
```
- If a public bucket returns `404 Not Found`, Vision fires an immediate `P1_CRITICAL` incident: *"Storage Bucket Offline or Deleted: ${bucketName}"*.
- If bucket metadata indicates public access has been revoked on `listings` or `avatars`, a `P1_CRITICAL` alert is dispatched.

### 12.3 Listing Image CDN Health, 404 Scanning & MIME Validation
Vision samples active property listings from the database and verifies the HTTP accessibility of their photos:
1. **HTTP Status Check**:
   - Asserts `200 OK` on all sampled image URIs.
   - Detects broken image links (HTTP 404, 403, 500).
   - If a listing has zero accessible images, Vision raises a `P2_HIGH` incident and flags the listing ID for administrative review.
2. **MIME Type Validation**:
   - Asserts that the `Content-Type` header is a valid image format (`image/webp`, `image/jpeg`, `image/png`).
   - Rejects text/html error pages served masquerading as image files.

### 12.4 Client-Side Avatar WebP Downsampling & Memory Safeguards
Vision audits the client-side avatar upload pipeline in [`components/AvatarPickerModal.tsx`](file:///home/f0id/Downloads/blejepronen/components/AvatarPickerModal.tsx):
- **Raw File Interception**: Prevents uploading uncompressed 10MB-20MB DSLR photos from mobile cameras.
- **Client-Side Square Crop & WebP Compression**:
  - Resizes avatar images to a standard **512 × 512 px** resolution.
  - Compresses to WebP format at **0.85 quality**.
  - Restricts final payload size to $< 150 \text{ KB}$.
- **Memory Protection**: Audits image processing memory usage to prevent mobile browser tab crashes during canvas drawing.

### 12.5 Image Delivery Latency, CLS Prevention & Caching Headers
Vision measures edge CDN delivery efficiency:
1. **Caching Headers**:
   Image assets served from Supabase Storage must include:
   ```http
   Cache-Control: public, max-age=31536000, immutable
   ```
   If assets lack caching headers, Vision flags a `P3_WARNING` performance defect.
2. **Layout Shift (CLS) Prevention**:
   Vision asserts that all Next.js `<Image />` components in listing feeds specify explicit `aspect-ratio` or `width`/`height` attributes to prevent layout displacement during loading.

### 12.6 Storage Outage Remediation & CDN Purge Procedures
If Vision detects storage CDN degradation or broken bucket policies:
1. Emits `incident:detected` with `P2_HIGH` or `P1_CRITICAL`.
2. Gathers sample broken URLs, bucket names, and HTTP response codes.
3. Thanos routes the defect to the engineering on-call channel with immediate storage reconfiguration recommendations.

---

## 13. DATABASE PERSISTENCE SCHEMA & CATALOG ARCHITECTURE

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DATA PERSISTENCE & CATALOG INFRASTRUCTURE                       │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Target Database      │ Supabase PostgreSQL 15 / 16 (AWS eu-central-1 Frankfurt)        │
│ Schema Location      │ public.agent_incidents, public.agent_heartbeats                 │
│ Migration Script     │ supabase/migrations/20261012_001_agent_swarm.sql                │
│ Realtime Integration │ supabase_realtime Publication Active                            │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 13.1 Data Definition Language (DDL) Specifications

#### 1. The `public.agent_incidents` Table
This table stores every defect, anomaly, and performance regression intercepted by the swarm.

```sql
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
```

#### 2. The `public.agent_heartbeats` Table
This table tracks the real-time operational status, memory footprint, and metrics for Thanos and all 10 Marvel child agents.

```sql
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
```

### 13.2 Query Indexing, Partitioning & Performance Tuning
To guarantee that high-throughput telemetry writes do not degrade database query performance:

```sql
-- Fast deduplication lookup index
create index if not exists agent_incidents_fingerprint_status_idx
  on public.agent_incidents (fingerprint, status);

-- Triage dashboard and lifecycle sorting index
create index if not exists agent_incidents_status_created_at_idx
  on public.agent_incidents (status, created_at desc);

-- Severity priority filter index
create index if not exists agent_incidents_severity_created_at_idx
  on public.agent_incidents (severity, created_at desc);

-- Worker attribution performance index
create index if not exists agent_incidents_agent_name_idx
  on public.agent_incidents (agent_name, created_at desc);
```

#### Automatic Timestamp Synchronization Triggers
```sql
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
```

### 13.3 Row-Level Security Hardening & Administrative Grants
The swarm state tables contain sensitive infrastructure telemetry. They must be shielded from unauthorized public access:

```sql
alter table public.agent_incidents enable row level security;
alter table public.agent_heartbeats enable row level security;

-- Enforce strict role isolation:
-- Public (anon) and authenticated users have zero access.
-- Only the service_role key (used by the swarm daemon) has full control.
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

-- Explicit RLS bypass policy for service_role
create policy "service_role_agent_incidents_all"
  on public.agent_incidents
  for all to service_role
  using (true) with check (true);

create policy "service_role_agent_heartbeats_all"
  on public.agent_heartbeats
  for all to service_role
  using (true) with check (true);
```

### 13.4 Supabase Realtime Publication Subscription Architecture
To enable real-time streaming to the platform's Web Admin Dashboard (`app/admin/page.tsx` and `app/admin/telemetry-panel.tsx`):

```sql
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
```

---

## 14. PRODUCTION RUNBOOKS, INCIDENT RESPONSE & DISASTER RECOVERY

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        INCIDENT RESPONSE & DISASTER RECOVERY PROTOCOLS                 │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Response Velocity    │ P1: < 60s Detection & Page / P2: < 5m Remediation Handshake     │
│ Escalation Endpoints │ Telegram Priority Bot / Discord Webhook / Sentry Bridge         │
│ Recovery Mechanisms  │ Automated Pull Request Synthesis, Circuit Breaker Quarantine   │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 14.1 P1_CRITICAL Catastrophe Response Protocol

```
                        [P1_CRITICAL INCIDENT DETECTED]
                                       │
                                       ▼
             ┌───────────────────────────────────────────────────┐
             │ 1. Immediate Dispatch: Telegram & Discord Pager   │
             │    (Direct push notification with red badge)      │
             └─────────────────────────┬─────────────────────────┘
                                       │
                                       ▼
             ┌───────────────────────────────────────────────────┐
             │ 2. Automated Isolation: Thanos Isolates Failure   │
             │    (Stops runaway worker loop to conserve memory) │
             └─────────────────────────┬─────────────────────────┘
                                       │
                                       ▼
             ┌───────────────────────────────────────────────────┐
             │ 3. Automated Diagnosis: Iron Man Mobilized        │
             │    (Executes tsc compiler check & AST analysis)   │
             └─────────────────────────┬─────────────────────────┘
                                       │
                                       ▼
             ┌───────────────────────────────────────────────────┐
             │ 4. Autonomous Patch Creation: PR Opened on GitHub │
             │    (Creates branch agent/fix-* & submits PR)      │
             └─────────────────────────┬─────────────────────────┘
                                       │
                                       ▼
             ┌───────────────────────────────────────────────────┐
             │ 5. Verification: Synthetic Re-test (Captain Amer.)│
             │    (Asserts endpoint returns 200 OK after deploy) │
             └───────────────────────────────────────────────────┘
```

#### Step-by-Step Execution Checklist
1. **Acknowledge Alarm**: Open Telegram notification card. Inspect `Location`, `Agent`, `Title`, and `ErrorName`.
2. **Review Auto-Generated PR**: If Iron Man generated a fix PR (`agent/fix-<incident-id>`), review the diff on GitHub.
3. **Emergency Deploy**: Merge PR or trigger Vercel deploy:
   ```bash
   git merge agent/fix-<incident-id>
   git push origin main
   ```
4. **Automated Verification**: Captain America and Thor re-probe the affected endpoint within 30 seconds.
5. **Close Incident**: Once healthy response is confirmed:
   ```sql
   UPDATE public.agent_incidents
   SET status = 'RESOLVED', updated_at = NOW()
   WHERE id = '<incident-id>';
   ```

### 14.2 P2_HIGH Severe Degradation Runbook
- **Latency Spikes ($>2000 \text{ ms}$)**:
  - Thor flags latency degradation.
  - Review Supabase database connection pooler: verify active query count via `pg_stat_activity`.
  - Check Vercel edge deployment status for cold-start spikes or regional network throttling.
- **Mobile Viewport Overflow**:
  - Hawkeye identifies offending elements with widths $>430 \text{ px}$.
  - Review `agent_incidents.metadata.culprits` for the offending CSS classes.
  - Apply `max-w-full overflow-hidden` or responsive container padding.

### 14.3 Host Daemonization & Supervisor Recovery (Systemd, PM2, Docker)

#### Option 1: Linux Systemd Daemon (Recommended for Dedicated VPS)
```bash
# Copy unit file to systemd directory
sudo cp services/swarm/daemon/blejepronen-swarm.service /etc/systemd/system/

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable service to start automatically on system boot
sudo systemctl enable blejepronen-swarm

# Start the swarm daemon
sudo systemctl start blejepronen-swarm

# Inspect live status
sudo systemctl status blejepronen-swarm

# Follow live swarm logs in real time
sudo journalctl -u blejepronen-swarm -f -o cat
```

#### Option 2: PM2 Process Management
```bash
# Start swarm under PM2 supervision
npx pm2 start services/swarm/daemon/ecosystem.config.cjs

# Save PM2 process list across system reboots
npx pm2 save
npx pm2 startup

# Monitor live memory footprint and CPU load
npx pm2 monit

# Tail swarm logs
npx pm2 logs blejepronen-thanos-swarm
```

#### Option 3: Docker Compose Containerization
```bash
# Build and launch swarm in background
docker compose -f services/swarm/daemon/docker-compose.yml up -d --build

# View container status and resource usage
docker stats blejepronen-thanos-swarm

# Inspect container logs
docker compose -f services/swarm/daemon/docker-compose.yml logs -f
```

### 14.4 Database Failover, Network Partitioning & Split-Brain Mitigation
If the Supabase PostgreSQL database undergoes maintenance or network failover:
1. **Memory Buffering**: The `SupabaseAdapter` seamlessly falls back to memory mode. Incoming incidents are held in the local ring buffer without throwing exceptions.
2. **Automatic Reconnection**: The adapter retries database connectivity every 15 seconds. Once the database recovers, buffered incidents are flushed and synchronized automatically.
3. **Zero Swarm Downtime**: Monitoring and alerting continue functioning during database failover.

### 14.5 Zero-Downtime Swarm Codebase Upgrade Procedures
When updating the swarm engine itself:
```bash
# 1. Pull latest code from main
git pull origin main

# 2. Run TypeScript compilation verification
npm run typecheck

# 3. Execute smoke verification suite
npm run swarm:test

# 4. Gracefully restart the service
# If using Systemd:
sudo systemctl restart blejepronen-swarm

# If using PM2:
npx pm2 reload blejepronen-thanos-swarm

# If using Docker:
docker compose -f services/swarm/daemon/docker-compose.yml up -d --build
```

---

```
==================================================================================================
END OF BP-ASOS SOVEREIGN SWARM OPERATIONAL DIRECTIVE COMPENDIUM
ALL AGENTS REPORTING: 10/10 ACTIVE
SUPREME COMMANDER THANOS: ENFORCING MAXIMUM RUNTIME STABILITY
BLEJE PRONËN ECOSYSTEM PROTECTED 24/7/365
==================================================================================================
```

---

## 15. LOW-LEVEL NATIVE AUDIO & WEBRTC STATE MACHINE COMPENDIUM (DOCTOR STRANGE DEEP DIVE)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHAPTER 15: WEBRTC & NATIVE AUDIO RUNTIME MATRIX                │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Target Runtimes      │ iOS CoreAudio / Android AudioRecord / WebRTC Native C++ Core    │
│ Subsystem Modules    │ mobile/lib/calling.ts, CallModal.tsx, CallScreen.tsx            │
│ Target Protocol      │ RFC 8829 (JSEP), RFC 8835 (WebRTC Audio), RFC 7587 (Opus)       │
│ Jitter Buffer Target │ Target End-to-End Latency < 120ms / Packet Loss Concealment (PLC)│
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 15.1 Real-Time Audio Codec & Jitter Buffer Dynamics
In peer-to-peer VoIP communications, raw audio frames must be digitized, compressed, packetized, and transmitted across non-deterministic IP networks. Doctor Strange enforces continuous surveillance over the audio processing pipeline.

#### The Opus Audio Codec Configuration
Bleje Pronën standardizes on the **Opus Audio Codec (RFC 6716)**. Doctor Strange verifies the following Session Description Protocol (SDP) media format parameters:

```
a=rtpmap:111 opus/48000/2
a=fmtp:111 minptime=10; useinbandfec=1; stereo=0; sprop-stereo=0; usedtx=1; cbr=0; maxaveragebitrate=32000
```

1. **Sampling Frequency**: $48,000 \text{ Hz}$ (Fullband audio fidelity for human voice resonance).
2. **Channel Allocation**: Mono (`stereo=0`), reducing uplink bandwidth consumption by 50% while preserving speech intelligibility.
3. **In-Band Forward Error Correction (FEC)**: `useinbandfec=1`. When packet loss occurs on mobile cellular networks (4G/5G handoffs), Opus embeds low-bitrate redundant frames in subsequent packets, allowing the decoder to reconstruct lost audio without retransmission latency.
4. **Discontinuous Transmission (DTX)**: `usedtx=1`. During pauses in speech, packet transmission is throttled to silence frames (Comfort Noise Generation - CNG), reducing device battery drain and wireless radio heat.

#### Mathematical Jitter Buffer Estimation
Packet arrival jitter $J(t)$ is computed iteratively according to RFC 3550:
Let $D(i, j)$ be the difference in packet transit times between packet $i$ and packet $j$:
$$D(i, j) = (R_j - S_j) - (R_i - S_i)$$
Where:
- $S_k$ is the RTP packet timestamp of transmission.
- $R_k$ is the local arrival timestamp in microseconds.

The smoothed interarrival jitter $J$ is updated on each received packet:
$$J_{\text{new}} = J_{\text{old}} + \frac{|D(i, j)| - J_{\text{old}}}{16}$$

**Doctor Strange Threshold**: If $J_{\text{new}} > 80 \text{ ms}$ sustained over 5 consecutive intervals, Doctor Strange issues a `P3_WARNING` alert: *"High VoIP Jitter / Cellular Packet Dispersion Detected"*.

### 15.2 iOS CoreAudio Hardware Session Lifecycle
On Apple iOS hardware, audio hardware is governed exclusively by `AVAudioSession`. An unhandled audio session interruption (e.g., incoming cellular phone call, Siri activation, or AirPods disconnect) will permanently mute WebRTC input streams unless handled by deterministic lifecycle listeners.

#### Mandatory CoreAudio Initialization Sequence
Doctor Strange verifies that native audio sessions initialize according to the strict sequence:

```swift
do {
    let audioSession = AVAudioSession.sharedInstance()
    // 1. Set category allowing simultaneous microphone recording and receiver/speaker playback
    try audioSession.setCategory(
        .playAndRecord,
        mode: .voiceChat,
        options: [.allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker]
    )
    // 2. Lock preferred hardware sample rate to 48kHz
    try audioSession.setPreferredSampleRate(48000.0)
    // 3. Set minimum buffer duration (10ms) to reduce algorithmic latency
    try audioSession.setPreferredIOBufferDuration(0.01)
    // 4. Activate session
    try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
} catch {
    // Fatal audio hardware panic
}
```

#### Audio Interruption Observer Matrix
Doctor Strange verifies the presence of interruption listeners in `mobile/lib/calling.ts`:
- **`AVAudioSessionInterruptionTypeBegan`**: Must transition calling state machine to `MUTED_TEMPORARY`.
- **`AVAudioSessionInterruptionTypeEnded`**: Must inspect `AVAudioSessionInterruptionOptions.shouldResume` and re-activate the audio session automatically.
- **`AVAudioSessionRouteChangeReasonOldDeviceUnavailable`**: When wired headphones or Bluetooth devices are disconnected, iOS defaults to ear receiver (`builtInReceiver`). The session must automatically reroute to speaker if user had speakerphone toggled.

### 15.3 Android OpenSL ES & AAudio Low-Latency Pipeline
On Android devices, Doctor Strange audits native audio mode transitions:

#### Mandatory Android AudioManager State Transitions
```java
AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);

// 1. Request communication mode to activate hardware Acoustic Echo Cancellation (AEC)
audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);

// 2. Request microphone audio focus
int result = audioManager.requestAudioFocus(
    focusChangeListener,
    AudioManager.STREAM_VOICE_CALL,
    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
);

// 3. Enable hardware speakerphone routing if requested
audioManager.setSpeakerphoneOn(isSpeakerActive);
```

#### Android Hardware Feature Assertions
Doctor Strange audits native hardware capabilities:
1. **Acoustic Echo Canceler (AEC)**:
   `AcousticEchoCanceler.isAvailable()` must return `true`. If false, Doctor Strange flags software echo-cancellation fallback in WebRTC core.
2. **Noise Suppressor (NS)**:
   `NoiseSuppressor.isAvailable()` must be verified to eliminate background street and traffic noise.

### 15.4 Full ICE Gathering State Machine & STUN/TURN Fallback Specification
Interactive Connectivity Establishment (ICE) traverses Network Address Translation (NAT) firewalls and symmetric cellular carrier gateways.

```
                    ┌────────────────────────┐
                    │  ICE GATHERING: NEW    │
                    └───────────┬────────────┘
                                │ RTCPeerConnection.createOffer()
                                ▼
                    ┌────────────────────────┐
                    │ ICE GATHERING: GATHERING│
                    └───────────┬────────────┘
                                │ Host Candidates Generated (Local IP)
                                │ Server Reflexive Candidates (STUN Query)
                                │ Relay Candidates Generated (TURN Allocation)
                                ▼
                    ┌────────────────────────┐
                    │ ICE GATHERING: COMPLETE│
                    └────────────────────────┘
```

#### STUN / TURN Server Configuration Array
Doctor Strange validates that `iceServers` contains redundant global STUN endpoints:
```json
[
  { "urls": "stun:stun.l.google.com:19302" },
  { "urls": "stun:stun1.l.google.com:19302" },
  { "urls": "stun:stun2.l.google.com:19302" }
]
```

#### Candidate Type Priority Hierarchy
Doctor Strange prioritizes candidates according to RFC 8445:
$$\text{Priority} = 2^{24} \times \text{type\_preference} + 2^8 \times \text{local\_preference} + (256 - \text{component\_id})$$
- **Host Candidate (Direct LAN / P2P)**: Type Preference = 126
- **Server Reflexive Candidate (STUN / Public IP)**: Type Preference = 100
- **Relayed Candidate (TURN / Traversal Relay)**: Type Preference = 0

If ICE gathering transitions to `failed`, Doctor Strange immediately investigates whether the local network is behind a Symmetric NAT or enterprise carrier firewall blocking UDP ports 1024-65535.

---

## 16. MATHEMATICAL FOUNDATIONS OF DISTRIBUTED ANOMALY DETECTION & SWARM TELEMETRY

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHAPTER 16: ADVANCED STATISTICAL DETECTION ALGORITHMS           │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Target Metric Streams│ API Latency, Crash Rates, DB Contention, Memory Footprints       │
│ Analytical Core      │ Exponential Smoothing, Holt-Winters Forecasting, Z-Score Bands  │
│ False-Positive Rate  │ Target False Alarm Rate < 0.001% (3.89 Sigma Gaussian Tail)     │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 16.1 Exponential Moving Average (EMA) Filtering
Raw network latency measurements fluctuate wildly due to Wi-Fi retransmissions, mobile packet hops, and CPU scheduling jitter. Applying naive threshold checks results in false-positive alarms. Thanos and Thor process metric streams using a **Double-Smoothed Exponential Moving Average (EMA)**.

#### Mathematical Formulation
Let $x_t$ be the raw metric observation at discrete time step $t$.
Let $\alpha \in [0, 1]$ be the smoothing coefficient (decay factor), defined by:
$$\alpha = \frac{2}{N + 1}$$
Where $N$ represents the effective time window length (e.g., $N = 20$ samples).

The first-order smoothed series $S_t$ is defined recursively:
$$S_t = \alpha x_t + (1 - \alpha) S_{t-1}, \quad S_0 = x_0$$

To account for linear trending (e.g., progressive memory leaks or accelerating database connection saturation), Thanos calculates the trend estimation $b_t$ with trend smoothing parameter $\beta$:
$$b_t = \beta (S_t - S_{t-1}) + (1 - \beta) b_{t-1}, \quad b_0 = x_1 - x_0$$

The forecasted metric value $\hat{x}_{t+m}$ for $m$ steps into the future:
$$\hat{x}_{t+m} = S_t + m \cdot b_t$$

**Thanos Proactive Alert Trigger**: If $\hat{x}_{t+5} > \text{Threshold}$ while $x_t < \text{Threshold}$, Thanos identifies an **accelerating regression trend** and raises a proactive `P2_HIGH` warning before the platform suffers user-facing impact.

### 16.2 Holt-Winters Double Exponential Smoothing for Latency Profiling
For diurnal traffic patterns (where traffic peaks at 14:00 and 20:00 CET and troughs at 04:00 CET), Thor uses Holt-Winters additive smoothing:

$$S_t = \alpha (x_t - I_{t-L}) + (1 - \alpha)(S_{t-1} + b_{t-1})$$
$$b_t = \beta (S_t - S_{t-1}) + (1 - \beta) b_{t-1}$$
$$I_t = \gamma (x_t - S_t) + (1 - \gamma) I_{t-L}$$

Where:
- $L$ is the cycle period ($L = 288$ five-minute intervals per 24-hour cycle).
- $I_t$ represents the seasonal index factor.
- $\alpha = 0.2, \beta = 0.1, \gamma = 0.3$.

### 16.3 High-Order Quantile Estimation via the Greenwald-Khanna Algorithm
Calculating true 95th and 99th percentiles over streaming telemetry without storing millions of data points in memory requires an online space-efficient quantile summary.
Thor uses the **Greenwald-Khanna Algorithm** with space complexity $O\left(\frac{1}{\epsilon} \log(\epsilon N)\right)$:
For precision error $\epsilon = 0.01$ (allowing 1% error margin on percentiles):
The data structure maintains a sequence of tuples $v_i = (v_i, g_i, \Delta_i)$ where:
- $g_i = r_{\min}(v_i) - r_{\min}(v_{i-1})$
- $\Delta_i = r_{\max}(v_i) - r_{\min}(v_i)$

This allows Thor to compute the exact P95 latency across 100,000 requests using less than **48 KB of RAM**, ensuring that the swarm daemon maintains a near-zero memory footprint.

---

## 17. DATABASE INTERNAL MECHANICS, SCHEMA INVARIANTS & POSTGRESQL OPTIMIZATION

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHAPTER 17: SUPABASE POSTGRESQL PERFORMANCE RUNBOOK             │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Target Database      │ PostgreSQL 15.6 (Supabase Managed Engine)                       │
│ Storage Engine       │ Write-Ahead Log (WAL) / MVCC Multi-Version Concurrency          │
│ Subsystem Modules    │ migrations/, app/api/search, lib/supabase.ts, db pooler         │
│ Concurrency Target   │ 10,000 Concurrent Readers / Transaction Isolation = READ COMMITTED│
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 17.1 Query Plan Optimization & EXPLAIN ANALYZE Diagnostics
Thor and Loki audit slow queries using PostgreSQL query plan inspection:
```sql
EXPLAIN (ANALYZE, BUFFERS, SETTINGS, TIMING)
SELECT p.id, p.title, p.price, p.city, p.bedrooms
FROM public.listings p
WHERE p.is_active = true
  AND p.city = 'Prishtinë'
ORDER BY p.created_at DESC
LIMIT 12;
```

#### Diagnostic Indicators Flagged by Thor
1. **Sequential Scan on Large Tables (`Seq Scan on listings`)**:
   If a table has $> 5,000$ rows and the planner executes a sequential table scan rather than an `Index Scan` or `Bitmap Index Scan`, Thor flags a `P2_HIGH` database index deficiency.
   - **Remediation**: Create composite partial index:
     ```sql
     CREATE INDEX IF NOT EXISTS listings_active_city_created_idx
     ON public.listings (city, created_at DESC)
     WHERE is_active = true;
     ```
2. **Buffer Hit Ratio Degradation**:
   Thor monitors the cache hit ratio of PostgreSQL shared buffers:
   ```sql
   SELECT
     sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read) + 0.001) AS cache_hit_ratio
   FROM pg_statio_user_tables;
   ```
   **Threshold**: If $\text{cache\_hit\_ratio} < 0.98$ (less than 98% of blocks served from RAM memory buffers), disk I/O read operations are bottlenecking latency.

### 17.2 Complete Schema Invariant Catalog (All 12 Platform Tables)
Loki and Captain America enforce structural database invariants across the entire platform catalog:

```
┌───────────────────────────┬───────────────────────────────────┬────────────────────────────────────────┐
│ Table Identifier          │ Key Integrity Constraint          │ Invariant Validation Rule              │
├───────────────────────────┼───────────────────────────────────┼────────────────────────────────────────┤
│ public.profiles           │ Primary Key (id = auth.users.id)  │ role IN ('individual', 'agency')       │
│ public.listings           │ Foreign Key (user_id -> profiles) │ price > 0, area_m2 > 0, city NOT NULL  │
│ public.favorites          │ Unique (user_id, listing_id)      │ User cannot favorite listing twice     │
│ public.follows            │ Unique (follower_id, following_id)│ follower_id <> following_id (No self)  │
│ public.messages           │ Foreign Key (conversation_id)     │ content NOT NULL OR image_url NOT NULL │
│ public.conversations      │ Unique (participant_a, part_b)    │ Two users share exactly one direct room│
│ public.saved_searches     │ Foreign Key (user_id -> profiles) │ search_params JSONB NOT NULL           │
│ public.listing_reports    │ Foreign Key (listing_id, user_id) │ status IN ('PENDING', 'RESOLVED')      │
│ public.telemetry_events   │ Service-Role Insert Only          │ props IS JSONB, source IN ('web','mob')│
│ public.agent_incidents    │ SHA-256 Unique Fingerprint Window │ severity IN ('P1','P2','P3','P4')      │
│ public.agent_heartbeats   │ Primary Key (agent_name)          │ status IN ('HEALTHY','DEGRADED',etc.)  │
│ public.analytics_views    │ Foreign Key (listing_id)          │ view_count >= 0                        │
└───────────────────────────┴───────────────────────────────────┴────────────────────────────────────────┘
```

### 17.3 Connection Pool Sizing Equations
Thor audits the configuration of PgBouncer and Supabase direct connections using the classic **PostgreSQL Connection Sizing Theorem**:

$$\text{Optimal Pool Size} = ((\text{CPU Cores} \times 2) + \text{Disk Spindle Count})$$
For an 8-core virtualized database server on AWS EBS:
$$\text{Max Direct Connections} = (8 \times 2) + 1 = 17 \text{ connections}$$
Attempting to open 300 direct database connections causes severe context switching, lock thrashing, and RAM exhaustion. Thor asserts that all high-throughput application paths route through the **Transaction Pooler (Port 6543)** with connection reuse.

---

## 18. AUTOMATED CODE SURGERY & AST MUTATION ARCHITECTURE (IRON MAN DEEP DIVE)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHAPTER 18: AUTONOMOUS CODE REMEDIATION & AST SURGERY           │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Target Languages     │ TypeScript 5.x / ECMAScript 2024 / TSX (React 19)               │
│ Toolchain Interfaces │ TypeScript Compiler API (ts.CompilerHost), Git Plumbing Tools   │
│ Safety Constraint    │ Zero Unchecked Mutations / Mandate 100% Clean Compilation      │
│ Deployment Channel   │ GitHub Pull Request / Feature Branch Sandboxing                 │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 18.1 TypeScript Abstract Syntax Tree (AST) Diagnostic Parsing
When Iron Man receives an escalated defect ticket from Thanos, regex string replacement is too fragile for complex codebases. Unintended whitespace alterations or broken closing brackets can cause cascading build failures. Iron Man leverages the **TypeScript Compiler API** to parse target source files into formal Abstract Syntax Trees.

#### Compiler Diagnostic Ingestion Pipeline
```typescript
import ts from 'typescript'

export interface ParsedCompilerDiagnostic {
  file: string
  line: number
  character: number
  code: number
  category: 'error' | 'warning' | 'suggestion' | 'message'
  messageText: string
}

export function extractDiagnostics(cwd: string): ParsedCompilerDiagnostic[] {
  const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, 'tsconfig.json')
  if (!configPath) throw new Error('tsconfig.json not found')

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, cwd)

  const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options)
  const diagnostics = ts.getPreEmitDiagnostics(program)

  return diagnostics.map((d) => {
    let line = 0
    let character = 0
    let file = 'unknown'

    if (d.file && d.start !== undefined) {
      const pos = d.file.getLineAndCharacterOfPosition(d.start)
      line = pos.line + 1
      character = pos.character + 1
      file = d.file.fileName
    }

    return {
      file,
      line,
      character,
      code: d.code,
      category: 'error',
      messageText: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
    }
  })
}
```

### 18.2 Automated Patch Synthesis & LLM Reasoning Sandboxing
When a defect cannot be solved via mechanical syntax fixes, Iron Man synthesizes an AI reasoning prompt targeting the Gemini/Claude/OpenAI API:

#### The Iron Man Prompt Template Contract
```text
SYSTEM:
You are Iron Man, the autonomous code repair engine of Bleje Pronën.
You are surgical, precise, and adhere strictly to TypeScript strict mode.
You must output ONLY valid unified git diff format.
Do NOT include commentary, markdown backticks, or preamble.
The patch must resolve the diagnostic error completely without altering unrelated functionality.

CONTEXT:
Incident ID: {{incidentId}}
Severity: {{severity}}
Target File: {{filePath}}
Error Diagnostic: {{errorMessage}}
Stack Trace: {{stackTrace}}

SOURCE SNIPPET:
{{sourceCodeSnippetWithLineNumbers}}

CONSTRAINT RULES:
1. Preserve all existing docstrings, exports, and comments.
2. Ensure strict null checking compliance (no 'any' assertions).
3. Ensure component props match Base UI / Radix UI / React 19 standards.
```

### 18.3 Automated Git Plumbing Operations
Iron Man executes git operations using atomic plumbing commands rather than fragile porcelain scripts:

```bash
# 1. Fetch latest remote main branch without merging
git fetch origin main

# 2. Verify HEAD is clean
git diff-index --quiet HEAD --

# 3. Create branch pointing to current origin/main
git checkout -b agent/fix-<incident-id> origin/main

# 4. Apply surgical patch
git apply --check /tmp/patch-<incident-id>.diff
git apply /tmp/patch-<incident-id>.diff

# 5. Execute TypeScript compilation validation gate
./node_modules/.bin/tsc --noEmit

# 6. Commit patch with conventional commit syntax
git commit -m "fix(autofix): [Iron Man] resolve <incident-id> in <filename>" \
           -m "Automated patch generated and verified by Thanos Swarm." \
           -m "Fingerprint: <fingerprint>"

# 7. Push branch to GitHub
git push origin agent/fix-<incident-id>
```

---

## 19. COMPREHENSIVE VISUAL ERGONOMICS & WCAG 2.2 AA CONFORMANCE MATRIX (HAWKEYE DEEP DIVE)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHAPTER 19: ADVANCED VISUAL RELIABILITY & ACCESSIBILITY         │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Target Standards     │ WCAG 2.2 Level AA / Apple Human Interface Guidelines / Material │
│ Audit Scope          │ Color Contrast, Focus Indicators, Dynamic Text, Touch Boundaries│
│ Viewport Resolution  │ 320px - 430px (Mobile) / 768px (Tablet) / 1440px (Desktop)      │
│ Strictness           │ Zero Clipping / Zero Unstyled States / Zero Focus Traps         │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 19.1 Mathematical Color Contrast Ratio Formula (WCAG 2.2 AA)
Hawkeye evaluates visual accessibility using the official W3C Relative Luminance Theorem.
For any RGB color triplet $(R, G, B)$ normalized to $[0, 1]$:
The linear color component $C_{\text{linear}}$ is computed via gamma expansion:
$$C_{\text{linear}} = \begin{cases} \frac{C}{12.92} & \text{if } C \le 0.04045 \\ \left(\frac{C + 0.055}{1.055}\right)^{2.4} & \text{if } C > 0.04045 \end{cases}$$

The relative luminance $L$ of a color is defined by:
$$L = 0.2126 \cdot R_{\text{linear}} + 0.7152 \cdot G_{\text{linear}} + 0.0722 \cdot B_{\text{linear}}$$

The contrast ratio $\text{CR}$ between foreground color (luminance $L_1$) and background color (luminance $L_2$), where $L_1 > L_2$:
$$\text{CR} = \frac{L_1 + 0.05}{L_2 + 0.05}$$

#### Conformance Thresholds Enforced by Hawkeye
- **Body Text & Standard Typography**: $\text{CR} \ge 4.5:1$ (Fails if $< 4.5$).
- **Large Headlines ($\ge 24\text{px}$ or $\ge 18.5\text{px}$ bold)**: $\text{CR} \ge 3.0:1$.
- **Active Interactive Controls & Buttons**: $\text{CR} \ge 3.0:1$ against adjacent backgrounds.
- **Brand Primary Green (`#00675B`) on White Background (`#FFFFFF`)**:
  - $L_{\text{white}} = 1.0$
  - $L_{\text{green}} = 0.113$
  - $\text{CR} = \frac{1.0 + 0.05}{0.113 + 0.05} = \frac{1.05}{0.163} = 6.44:1 \implies \mathbf{PASS}$ (Exceeds 4.5:1 requirement).
- **Secondary Muted Text (`#6B7280` on White Background)**:
  - $\text{CR} = 4.65:1 \implies \mathbf{PASS}$ (Acceptable for secondary subtitles).
- **Secondary Muted Text (`#9CA3AF` on White Background)**:
  - $\text{CR} = 2.82:1 \implies \mathbf{FAIL}$ (Hawkeye flags `P3_WARNING` for illegible low-contrast captions).

### 19.2 Safe-Area Margins & Notch Geometry Across Devices
Hawkeye audits layout containers to ensure compliance with physical device enclosures:

```
┌─────────────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Physical Device Model   │ Top Inset    │ Bottom Inset │ Left Inset   │ Right Inset  │
├─────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ iPhone SE (2nd/3rd gen) │ 20 px        │ 0 px         │ 0 px         │ 0 px         │
│ iPhone 11 / 12 / 13 / 14│ 47 px        │ 34 px        │ 0 px         │ 0 px         │
│ iPhone 14 Pro / 15 / 16 │ 59 px        │ 34 px        │ 0 px         │ 0 px         │
│ iPad Pro 11" / 12.9"    │ 24 px        │ 20 px        │ 0 px         │ 0 px         │
│ Android Gesture Nav Bar │ 24 - 32 px   │ 16 - 24 px   │ 0 px         │ 0 px         │
└─────────────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

#### CSS Inset Enforcement Rules
1. Fixed bottom toolbars must declare:
   ```css
   padding-bottom: max(16px, env(safe-area-inset-bottom));
   ```
2. Fullscreen modal headers must declare:
   ```css
   padding-top: max(12px, env(safe-area-inset-top));
   ```

---

## 20. FULL SYNTHETIC E2E SCENARIO CATALOG & ASSERTION RUNBOOKS (CAPTAIN AMERICA DEEP DIVE)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHAPTER 20: 25 CANONICAL SYNTHETIC E2E SCENARIOS                │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Target Scope         │ Complete Platform User Journeys / Edge-Case Exploration         │
│ Execution Frequency  │ High Priority: Every 10m / Deep Funnels: Every 30m              │
│ Validation Protocol  │ Dual-Pass Network Retest / Zero False-Positive Tolerance        │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 20.1 Catalog of 25 Continuous Synthetic User Journeys

#### Scenario 01: Anonymous Marketplace Browse
- **Target**: `GET /listings?city=Prishtin%C3%AB&type=apartment`
- **Assertion**: HTTP 200, contains `<article>` or `[data-testid="listing-card"]`, minimum 1 item.

#### Scenario 02: Real-Time Search Query Autocomplete
- **Target**: `GET /api/search?q=Dardani&limit=5`
- **Assertion**: HTTP 200, response time $< 400 \text{ ms}$, returns array containing matches in neighborhood Dardania.

#### Scenario 03: Property Detail Route Hydration
- **Target**: `GET /prona/[id]` (valid sample ID)
- **Assertion**: HTTP 200, hero image loads, title is non-empty, price is formatted with euro currency (`€`).

#### Scenario 04: WhatsApp Direct Referral Link
- **Target**: WhatsApp contact button on property page
- **Assertion**: URI scheme matches `https://wa.me/383[0-9]{8}?text=...` with pre-filled listing title.

#### Scenario 05: Phone Call Native URI Generation
- **Target**: Telephone trigger button
- **Assertion**: URI scheme matches `tel:+383...` with non-empty phone string.

#### Scenario 06: Saved Searches Security Barrier
- **Target**: `GET /api/saved-searches` without Authorization header
- **Assertion**: HTTP 401 Unauthorized, zero private user records leaked.

#### Scenario 07: Telemetry Ingest Batch Validation
- **Target**: `POST /api/telemetry` with valid batch payload
- **Assertion**: HTTP 200 `{ accepted: 1, rejected: 0 }`.

#### Scenario 08: Telemetry Oversized Payload Rejection
- **Target**: `POST /api/telemetry` with $> 32 \text{ KB}$ payload
- **Assertion**: HTTP 413 Payload Too Large or HTTP 400 Bad Request.

#### Scenario 09: OTP Request with Invalid Email
- **Target**: `POST /api/send-otp` with `{ "email": "not-an-email" }`
- **Assertion**: HTTP 400 Bad Request `{ error: "Email format invalid" }`.

#### Scenario 10: OTP Request with Missing Identifier
- **Target**: `POST /api/send-otp` with `{}`
- **Assertion**: HTTP 400 Bad Request.

#### Scenario 11: Hub Index Sitemap API
- **Target**: `GET /api/hub-index`
- **Assertion**: HTTP 200, returns active city hubs (`Prishtinë`, `Tiranë`, `Prizren`, `Shkup`).

#### Scenario 12: Profile Social Stats Counter Sync
- **Target**: `GET /api/profile?id=[sample_id]`
- **Assertion**: `followers_count >= 0` and `following_count >= 0`.

#### Scenario 13: Followers List Modal Data Query
- **Target**: `GET /api/follow?user_id=[sample_id]&mode=followers`
- **Assertion**: HTTP 200, returns array of users with avatar, display name, and username.

#### Scenario 14: Following List Modal Data Query
- **Target**: `GET /api/follow?user_id=[sample_id]&mode=following`
- **Assertion**: HTTP 200, returns array of followed agencies and users.

#### Scenario 15: Storage Listing Image Accessibility
- **Target**: `HEAD /storage/v1/object/public/listings/[sample_image.webp]`
- **Assertion**: HTTP 200, `content-type` is image.

#### Scenario 16: Storage Avatar Image Accessibility
- **Target**: `HEAD /storage/v1/object/public/avatars/[sample_avatar.webp]`
- **Assertion**: HTTP 200.

#### Scenario 17: User Profile Public Bio Rendering
- **Target**: `GET /profili/[sample_id]`
- **Assertion**: HTTP 200, renders bio paragraph under "Rreth Meje" / "Rreth Kompanisë".

#### Scenario 18: Listings Loading Skeleton Alignment
- **Target**: `GET /listings/loading`
- **Assertion**: Renders clean responsive grid matching listing card geometry.

#### Scenario 19: Post Property Form Authorization Gate
- **Target**: `GET /posto-prona` without authenticated session
- **Assertion**: Redirects to `/login?returnUrl=%2Fposto-prona`.

#### Scenario 20: My Listings Dashboard Authorization Gate
- **Target**: `GET /postimet-e-mia` without authenticated session
- **Assertion**: Redirects to `/login?returnUrl=%2Fpostimet-e-mia`.

#### Scenario 21: Admin Dashboard Security Gate
- **Target**: `GET /admin` with non-admin session
- **Assertion**: Redirects to `/` or returns HTTP 403 Forbidden.

#### Scenario 22: Logout Endpoint Cache Eviction
- **Target**: `POST /api/logout`
- **Assertion**: Resets auth cookies and session headers.

#### Scenario 23: Cron Saved Searches Security
- **Target**: `GET /api/cron/saved-searches` without Bearer CRON_SECRET
- **Assertion**: HTTP 401 Unauthorized.

#### Scenario 24: Suffix Slash Normalization
- **Target**: `GET /listings/`
- **Assertion**: Clean HTTP 308 redirect or transparent rewrite to `/listings`.

#### Scenario 25: Robots.txt & Sitemap Discovery
- **Target**: `GET /robots.txt` and `GET /sitemap.xml`
- **Assertion**: HTTP 200, contains valid XML sitemap index.

---

## 21. AUTONOMOUS SWARM COMMAND LINE INTERFACE (CLI) & OPERATIONAL PLAYBOOK

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHAPTER 21: SWARM CLI CONTROL & OPERATOR MANUAL                │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Entrypoint Binary    │ services/swarm/index.ts                                         │
│ Invocation Methods   │ npm run swarm / npx tsx services/swarm/index.ts                 │
│ Operational Control  │ Thanos Command Subsystem / IPC Signals / CLI Interactive Mode   │
│ Target Operators     │ Lead Systems Architects, Infrastructure SREs, On-Call Engineers │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 21.1 Swarm CLI Command Reference
Thanos provides an interactive and programmatic command interface allowing human engineers to inspect live swarm metrics, manually trigger agent sweeps, un-isolate quarantined workers, or inject test anomalies.

```
┌───────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ Command Syntax                        │ Operational Function & Execution Output                │
├───────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ npm run swarm                         │ Boot Thanos and all 10 Marvel child agents 24/7        │
│ npm run swarm:test                    │ Execute the automated 7-stage smoke verification suite │
│ npm run typecheck                     │ Run the standalone TypeScript static verification gate │
│ swarm-cli status                      │ Output real-time JSON status report for all 10 agents   │
│ swarm-cli trigger <agent-id>          │ Force an immediate out-of-band inspection tick         │
│ swarm-cli reset <agent-id>            │ Reset a tripped circuit breaker and restore to HEALTHY │
│ swarm-cli isolate <agent-id>          │ Manually quarantine an agent for code maintenance      │
│ swarm-cli test-incident <agent-id>    │ Fire a synthetic test incident through deduplication   │
│ swarm-cli clear-dedup                 │ Flush in-memory SHA-256 fingerprint sliding cache      │
└───────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

### 21.2 Operator Runbook: Inspecting Live Swarm Status
To query the real-time operational status of the swarm in production:
```bash
# Query the live status report programmatically via Node
npx tsx -e '
  import { ThanosOrchestrator } from "./services/swarm/core/thanos";
  const thanos = new ThanosOrchestrator();
  console.log(JSON.stringify(thanos.getStatusReport(), null, 2));
'
```

#### Sample Real-Time Status Output
```json
{
  "thanos": {
    "status": "HEALTHY",
    "uptimeSeconds": 142850,
    "activeFingerprintsCount": 14,
    "supabaseConnected": true
  },
  "workers": {
    "iron-man": {
      "status": "HEALTHY",
      "isIsolated": false,
      "crashCount": 0,
      "secondsSinceLastHeartbeat": 12
    },
    "thor": {
      "status": "HEALTHY",
      "isIsolated": false,
      "crashCount": 0,
      "secondsSinceLastHeartbeat": 4
    },
    "hulk": {
      "status": "HEALTHY",
      "isIsolated": false,
      "crashCount": 0,
      "secondsSinceLastHeartbeat": 8
    },
    "hawkeye": {
      "status": "HEALTHY",
      "isIsolated": false,
      "crashCount": 0,
      "secondsSinceLastHeartbeat": 18
    },
    "captain-america": {
      "status": "HEALTHY",
      "isIsolated": false,
      "crashCount": 0,
      "secondsSinceLastHeartbeat": 24
    },
    "loki": {
      "status": "HEALTHY",
      "isIsolated": false,
      "crashCount": 0,
      "secondsSinceLastHeartbeat": 15
    },
    "black-widow": {
      "status": "HEALTHY",
      "isIsolated": false,
      "crashCount": 0,
      "secondsSinceLastHeartbeat": 10
    },
    "doctor-strange": {
      "status": "HEALTHY",
      "isIsolated": false,
      "crashCount": 0,
      "secondsSinceLastHeartbeat": 5
    },
    "spider-man": {
      "status": "HEALTHY",
      "isIsolated": false,
      "crashCount": 0,
      "secondsSinceLastHeartbeat": 9
    },
    "vision": {
      "status": "HEALTHY",
      "isIsolated": false,
      "crashCount": 0,
      "secondsSinceLastHeartbeat": 21
    }
  }
}
```

### 21.3 Operator Runbook: Resetting an Isolated Circuit Breaker
If an agent experienced repeated unexpected exceptions (e.g., Hawkeye crashed 5 times during a third-party CDN font outage) and was placed in `ISOLATED` status by Thanos:

```typescript
// Script to un-isolate Hawkeye once the upstream CDN recovers
import { ThanosOrchestrator } from './services/swarm/core/thanos'

async function restoreHawkeye(thanos: ThanosOrchestrator) {
  console.log('Restoring Hawkeye from circuit breaker isolation...')
  const success = await thanos.supervisor.resetWorker('hawkeye')
  if (success) {
    console.log('✔ Hawkeye successfully restored to HEALTHY state.')
  } else {
    console.error('✖ Failed to restore Hawkeye. Immediate crash occurred.')
  }
}
```

---

## 22. COMPLETE DISASTER RECOVERY DRILLS & CATASTROPHE SIMULATION PLAYBOOKS

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHAPTER 22: CHAOS ENGINEERING & DISASTER DRILLS                 │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Target Scenarios     │ Database Down / Network Split / DNS Blackhole / Memory Spike    │
│ Testing Objective    │ Verify Zero-Downtime Swarm Survivability & Automated Recovery   │
│ Safety Rule          │ Drills executed in isolated test environments or staging only   │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 22.1 Drill 01: Complete Supabase PostgreSQL Blackout
- **Simulation**: Cut network connectivity to `SWARM_SUPABASE_URL` by routing traffic to an unreachable IP or revoking database credentials.
- **Expected Swarm Response**:
  1. `SupabaseAdapter` intercepts network `ENOTFOUND` or `ETIMEDOUT`.
  2. Emits an internal warning: `[SupabaseAdapter] Running in memory-only mode`.
  3. All 10 child workers continue running their inspection loops without throwing unhandled promise rejections.
  4. Incidents are cached in the local in-memory map.
  5. AlertDispatcher continues sending critical notifications to Telegram/Discord.
  6. Once connectivity is restored, the memory buffer flushes to PostgreSQL automatically.
- **Verification Command**:
  ```bash
  SWARM_SUPABASE_URL=https://invalid-nonexistent-subdomain.supabase.co npm run swarm:test
  ```

### 22.2 Drill 02: Platform Root HTTP 500 Outage
- **Simulation**: Temporarily alter `targetWebUrl` to a route returning HTTP 500 Internal Server Error.
- **Expected Swarm Response**:
  1. Thor executes probe tick within 30 seconds.
  2. Identifies HTTP 500 status.
  3. Fired `P1_CRITICAL` incident: `Infrastructure 5xx Error on Root Web`.
  4. Deduplication engine hashes the signature and logs fingerprint `c29bd023...`.
  5. AlertDispatcher triggers push notification to Telegram.
  6. Thanos dispatches escalation signal to Iron Man.
  7. Iron Man verifies local TypeScript compilation and parses recent git commits.

### 22.3 Drill 03: Rogue Worker Infinite Loop / CPU Spike
- **Simulation**: Inject a CPU-intensive computation or unhandled rejection into a worker's `tick()` method.
- **Expected Swarm Response**:
  1. BaseSwarmWorker's `executeTickSafe()` catches the unhandled rejection.
  2. Worker state moves to `DEGRADED`.
  3. `SupervisorTree` logs crash count #1 and applies $2,000 \text{ ms}$ backoff delay.
  4. Sibling workers (Thor, Hulk, Iron Man) continue executing their intervals on schedule.
  5. If crashes reach 5 within 5 minutes, Thanos trips the circuit breaker to `ISOLATED`.
  6. Thanos remains 100% online with zero process termination.

### 22.4 Drill 04: Native Calling Permission Accidental Deletion
- **Simulation**: Remove `NSMicrophoneUsageDescription` from `mobile/app.json`.
- **Expected Swarm Response**:
  1. Doctor Strange executes inspection tick within 60 seconds.
  2. Reads `mobile/app.json` AST.
  3. Detects `ios.infoPlist.NSMicrophoneUsageDescription === undefined`.
  4. Raises `P1_CRITICAL`: `Native VoIP Microphone Permission Missing (iOS)`.
  5. Alert sent immediately to on-call mobile release engineer.

---

## 23. COMPLETE INCIDENT TRIAGE MATRICES & DIAGNOSTIC RUNBOOK ENCYCLOPEDIA

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHAPTER 23: THE MASTER DIAGNOSTIC ENCYCLOPEDIA                  │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Target Catalog       │ Every Possible Defect Code, Error Signature & Root Cause        │
│ Coverage             │ Infrastructure, Runtime, UI/UX, Security, Audio, Social Graph   │
│ Format               │ Defect Code -> Root Cause -> Diagnostic Steps -> Remediation    │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 23.1 Defect Code: `HTTP_500` (Internal Server Error)
* **Severity**: `P1_CRITICAL`
* **Detected By**: Agent 2 (Thor)
* **Root Cause**: Unhandled exception in Next.js Server Component or API Route handler.
* **Diagnostic Steps**:
  1. Inspect Next.js server logs via `journalctl -u blejepronen -n 100` or Vercel Runtime Logs.
  2. Look for uncaught database connection errors (`FATAL: remaining connection slots are reserved`).
  3. Check whether environment variables (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`) are undefined.
* **Remediation Protocol**:
  1. If database connection exhaustion: Restart PgBouncer or scale connection limit.
  2. If code error: Mobilize Iron Man to formulate a try/catch boundary returning structured `{ error: ... }`.

### 23.2 Defect Code: `LATENCY_SPIKE` (P95 Latency > 2000ms)
* **Severity**: `P2_HIGH`
* **Detected By**: Agent 2 (Thor)
* **Root Cause**: Unindexed PostgreSQL query, large unpaginated listing fetch, or cold-start edge latency.
* **Diagnostic Steps**:
  1. Execute `pg_stat_activity` query to identify long-running queries ($> 2.0 \text{ s}$).
  2. Inspect query execution plan via `EXPLAIN (ANALYZE, BUFFERS)`.
  3. Verify whether search query includes unindexed `LIKE '%...%'` text scans instead of full-text search indexes.
* **Remediation Protocol**:
  1. Apply GIN trigram index or composite index on `(city, property_type, price)`.
  2. Ensure all marketplace feeds enforce hard limit `LIMIT 12 OFFSET N`.

### 23.3 Defect Code: `RLS_SECURITY_BYPASS` (Public Write Access on Internal Table)
* **Severity**: `P1_CRITICAL`
* **Detected By**: Agent 6 (Loki)
* **Root Cause**: Table created without `ENABLE ROW LEVEL SECURITY` or with an over-permissive `USING (true)` policy granted to `public` / `anon`.
* **Diagnostic Steps**:
  1. Execute catalog check:
     ```sql
     SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
     ```
  2. Inspect active policies:
     ```sql
     SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = '<target_table>';
     ```
* **Remediation Protocol**:
  1. Immediately execute emergency security migration:
     ```sql
     ALTER TABLE public.<target_table> ENABLE ROW LEVEL SECURITY;
     REVOKE ALL ON public.<target_table> FROM anon;
     REVOKE ALL ON public.<target_table> FROM authenticated;
     GRANT ALL ON public.<target_table> TO service_role;
     ```

### 23.4 Defect Code: `HORIZONTAL_OVERFLOW_RISK` (Mobile Scroll Width Leak)
* **Severity**: `P2_HIGH`
* **Detected By**: Agent 4 (Hawkeye)
* **Root Cause**: Element with hardcoded CSS `width > 375px`, unconstrained flex container, or negative margin without `overflow-hidden`.
* **Diagnostic Steps**:
  1. Inspect `agent_incidents.metadata.culprits` for the specific DOM element tag and class.
  2. Search codebase for the offending CSS class name using `grep -rn "offending-class" app/ components/`.
* **Remediation Protocol**:
  1. Replace fixed pixel width (e.g., `w-[500px]`) with responsive classes (e.g., `w-full max-w-lg`).
  2. Add `overflow-x-hidden` to parent container `<main>` or `<body>`.

### 23.5 Defect Code: `MISSING_IOS_MIC_PERMISSION` (Native Audio Crash Vector)
* **Severity**: `P1_CRITICAL`
* **Detected By**: Agent 8 (Doctor Strange)
* **Root Cause**: `mobile/app.json` lacks `ios.infoPlist.NSMicrophoneUsageDescription`.
* **Diagnostic Steps**:
  1. Open `mobile/app.json`.
  2. Verify `expo.ios.infoPlist` block.
* **Remediation Protocol**:
  1. Add description string:
     ```json
     "NSMicrophoneUsageDescription": "Bleje Pronën ju lejon të realizoni thirrje zanore me shitësin dhe blerësin direkt në aplikacion."
     ```
  2. Run `npm run typecheck` in `mobile/`.

### 23.6 Defect Code: `FOLLOW_COUNTER_DESYNC` (Social Graph Count Mismatch)
* **Severity**: `P2_HIGH`
* **Detected By**: Agent 9 (Spider-Man)
* **Root Cause**: Client-side optimistic update failed to reconcile with backend PostgreSQL counter, or database trigger failed during concurrent writes.
* **Diagnostic Steps**:
  1. Compare `profiles.followers_count` with `SELECT count(*) FROM follows WHERE following_id = <user_id>`.
* **Remediation Protocol**:
  1. Run atomic reconciliation query:
     ```sql
     UPDATE public.profiles p
     SET followers_count = (SELECT count(*) FROM public.follows f WHERE f.following_id = p.id),
         following_count = (SELECT count(*) FROM public.follows f WHERE f.follower_id = p.id);
     ```
  2. Invalidate client profile cache key `bp_profile_cache_<user_id>`.

### 23.7 Defect Code: `STORAGE_BUCKET_NOT_FOUND` (Missing Media Bucket)
* **Severity**: `P1_CRITICAL`
* **Detected By**: Agent 10 (Vision)
* **Root Cause**: Storage bucket deleted, renamed, or environment pointed to incorrect Supabase project.
* **Diagnostic Steps**:
  1. Query Supabase Storage API: `GET /storage/v1/bucket`.
  2. Check whether `listings` and `avatars` exist in the returned JSON array.
* **Remediation Protocol**:
  1. Re-create missing bucket via Supabase Dashboard or SQL:
     ```sql
     INSERT INTO storage.buckets (id, name, public)
     VALUES ('listings', 'listings', true), ('avatars', 'avatars', true)
     ON CONFLICT (id) DO NOTHING;
     ```

### 23.8 Defect Code: `SYNTHETIC_FUNNEL_FAILURE` (Search Engine Breakdown)
* **Severity**: `P2_HIGH`
* **Detected By**: Agent 5 (Captain America)
* **Root Cause**: Search API route `/api/search` returning empty array or malformed JSON when searching valid cities.
* **Diagnostic Steps**:
  1. Execute manual probe: `curl -v "http://localhost:3000/api/search?q=Prishtine"`.
  2. Verify whether database search query is filtering by `is_active = true` and whether active listings exist in the database.
* **Remediation Protocol**:
  1. If no active listings exist: Seed staging database with verified test listings.
  2. If query syntax error: Inspect `app/api/search/route.ts` and verify parameter sanitization.

---

## 24. REAL-WORLD ARCHITECTURE BLUEPRINT & MULTI-CLOUD DEPLOYMENT TOPOLOGIES

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHAPTER 24: PRODUCTION TOPOLOGY & INFRASTRUCTURE MAP            │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Deployment Models    │ Hybrid Cloud: Vercel Edge + Supabase Cloud + Dedicated Host     │
│ Edge Routing         │ Cloudflare / NGINX Sidecar Reverse Proxy                        │
│ Telemetry Backhaul   │ Direct HTTPS REST / WSS WebSockets / Local Journald Logs        │
│ Process Architecture │ Single Master Node + Supervised In-Process Worker Threads       │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 24.1 High-Availability Multi-Region Architecture Topology
The Bleje Pronën platform and BP-ASOS Swarm operate across a resilient, distributed multi-tier infrastructure:

```
                           [INTERNET USERS: WEB & MOBILE]
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │          CLOUDFLARE EDGE CDN          │
                     │  (WAF, DDoS Shield, Anycast DNS, SSL) │
                     └───────────────────┬───────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │                                           │
                   ▼                                           ▼
       ┌───────────────────────┐                   ┌───────────────────────┐
       │   VERCEL EDGE / AWS   │                   │    SUPABASE BACKEND   │
       │ (Next.js 16 Web Apps) │                   │  (Postgres, Auth, RLS,│
       │  • App Router (SSR)   │                   │   Storage, Realtime)  │
       │  • Server Actions     │                   │  • Frankfurt eu-cent  │
       │  • API Route Handlers │                   │  • Pooler Port 6543   │
       └───────────┬───────────┘                   └───────────▲───────────┘
                   │                                           │
                   │               Telemetry Streams           │
                   └─────────────────────┬─────────────────────┘
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │       BP-ASOS 24/7 SWARM DAEMON       │
                     │    (Dedicated VPS / Systemd Host)     │
                     │  • Master Orchestrator: Thanos        │
                     │  • 10 Supervised Marvel Child Workers │
                     │  • Deduplication Engine & Alert Hub   │
                     └───────────────────┬───────────────────┘
                                         │
                     ┌───────────────────┴───────────────────┐
                     │                                       │
                     ▼                                       ▼
       ┌───────────────────────┐                   ┌───────────────────────┐
       │   TELEGRAM BOT API    │                   │   GITHUB REST API     │
       │ (Instant Mobile Alert │                   │ (Autonomous Branching │
       │  & Pager Dispatch)    │                   │  & Automated Fix PRs) │
       └───────────────────────┘                   └───────────────────────┘
```

### 24.2 Production NGINX Reverse Proxy Configuration (WebSocket & Edge Passthrough)
When hosting the swarm dashboard or Next.js origin behind a dedicated Linux NGINX instance:

```nginx
# /etc/nginx/sites-available/blejepronen.conf

upstream nextjs_upstream {
    server 127.0.0.1:3000;
    keepalive 64;
}

upstream swarm_upstream {
    server 127.0.0.1:4000;
    keepalive 32;
}

# HTTP to HTTPS Redirection
server {
    listen 80;
    listen [::]:80;
    server_name blejepronen.com www.blejepronen.com;
    return 301 https://$server_name$request_uri;
}

# Primary HTTPS Virtual Host
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name blejepronen.com www.blejepronen.com;

    # Modern TLS Security Configuration
    ssl_certificate /etc/letsencrypt/live/blejepronen.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/blejepronen.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Next.js Application Proxy
    location / {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }

    # Static Assets & Image CDN Caching
    location /_next/static/ {
        proxy_pass http://nextjs_upstream;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # Swarm Telemetry & Real-Time Status Endpoint
    location /swarm/ {
        proxy_pass http://swarm_upstream/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        auth_basic "Restricted Swarm Telemetry";
        auth_basic_user_file /etc/nginx/.htpasswd_swarm;
    }
}
```

---

## 25. MASTER SWARM LEXICON, ARCHITECTURAL GLOSSARY & MATHEMATICAL SYMBOL INDEX

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHAPTER 25: MASTER TERMINOLOGY & SYMBOL COMPENDIUM              │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Scope                │ Complete Exhaustive Glossary of Swarm Concepts & Equations      │
│ Target Readers       │ Distributed Systems Engineers, Security Auditors, Maintainers   │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 25.1 Architectural Acronym & Concept Lexicon
- **AST (Abstract Syntax Tree)**: The hierarchical, tree-structured syntactic representation of TypeScript and JavaScript source code used by Agent 1 (Iron Man) to perform structural diagnostics and code transformations.
- **BP-ASOS**: Bleje Pronën Autonomous Swarm Operating System, the complete 11-agent multi-agent supervisory runtime.
- **Circuit Breaker**: A fault-tolerance design pattern implemented in `SupervisorTree` with three operational states (`CLOSED`, `DEGRADED`, `OPEN`). Quarantines chronic crashers after 5 failures in 5 minutes to prevent CPU thrashing.
- **CLS (Cumulative Layout Shift)**: A Core Web Vital metric measuring unexpected visual layout shifts during page render. Audited continuously by Hawkeye.
- **Deduplication Sliding Window ($W$)**: The rolling time window ($3,600,000 \text{ ms} = 1 \text{ hour}$) during which identical incident signatures increment occurrence counters rather than firing duplicate alerts.
- **DTX (Discontinuous Transmission)**: Opus audio codec feature that suppresses packet transmission during speech pauses, saving mobile battery and bandwidth.
- **Erlang/OTP Supervision Tree**: The hierarchical fault-isolation model where a parent supervisor process (Thanos) manages the lifecycles and restart policies of supervised child processes (Marvel workers) without shared fatal failure states.
- **FEC (Forward Error Correction)**: An algorithmic technique in Opus VoIP streaming where redundant recovery data is embedded inside audio packets to reconstruct dropped packets without retransmission delay.
- **Fingerprint ($F$)**: The 64-character hexadecimal SHA-256 cryptographic hash uniquely identifying an incident’s root cause.
- **ICE (Interactive Connectivity Establishment)**: The RFC 8445 framework used by Doctor Strange and WebRTC to negotiate peer-to-peer network connections across NAT routers and firewalls.
- **JSEP (JavaScript Session Establishment Protocol)**: The RFC 8829 protocol governing the SDP offer/answer state machine in WebRTC.
- **MVCC (Multi-Version Concurrency Control)**: PostgreSQL's storage engine architecture allowing readers to not block writers and writers to not block readers.
- **One-For-One Supervision**: A supervisor strategy where if child process $A$ crashes, only child process $A$ is restarted; sibling child processes $B, C, \dots$ remain uninterrupted.
- **PLC (Packet Loss Concealment)**: Algorithmic interpolation in audio decoders that synthesizes replacement speech frames during wireless cellular dropouts.
- **RLS (Row-Level Security)**: PostgreSQL security subsystem that restricts row visibility and mutation based on user session context and SQL policies.
- **RSS (Resident Set Size)**: The portion of physical RAM memory occupied by a process. Monitored continuously across all workers via Node `process.memoryUsage().rss`.
- **SDP (Session Description Protocol)**: The format for describing multimedia communication sessions (audio codecs, sample rates, IP addresses, ports) in WebRTC.
- **STUN (Session Traversal Utilities for NAT)**: Lightweight network protocol (RFC 5389) that allows a mobile client behind a NAT to discover its public IP address and port mapping.
- **TTFB (Time to First Byte)**: The duration from initiating an HTTP request to receiving the first byte of response data from the origin server.
- **TURN (Traversal Using Relays around NAT)**: Network relay protocol (RFC 5766) that relays media packets when symmetric firewalls prevent direct P2P connections.
- **Z-Score ($Z$)**: The statistical measurement of a value's relationship to the mean in a group of values, measured in standard deviations. Used by Hulk to detect crash spikes.

### 25.2 Mathematical Symbol Index
- $F \in \{0, 1\}^{256}$: Cryptographic SHA-256 incident fingerprint hash.
- $W$: The sliding deduplication time window ($3,600,000 \text{ ms}$).
- $B$: Base backoff restart delay ($2,000 \text{ ms}$).
- $M$: Maximum backoff restart ceiling ($60,000 \text{ ms}$).
- $k$: The number of consecutive process crashes within the rolling window.
- $D(k)$: The exponential backoff recovery delay function: $D(k) = \min(B \times 2^{k-1}, M)$.
- $P_{50}, P_{90}, P_{95}, P_{99}$: The 50th, 90th, 95th, and 99th latency percentiles.
- $\text{CR}$: Color contrast ratio: $\text{CR} = \frac{L_1 + 0.05}{L_2 + 0.05} \ge 4.5:1$.
- $L$: Relative luminance of a color component ($[0.0, 1.0]$).
- $\mu$: The historical mean error count over a rolling 60-minute window.
- $\sigma$: The standard deviation of error counts.
- $Z$: The standardized Z-score anomaly metric: $Z = \frac{x - \mu}{\sigma + \epsilon}$.
- $J(t)$: Smoothed interarrival audio packet jitter in milliseconds.
- $\alpha, \beta, \gamma$: Smoothing coefficients for Exponential Moving Averages and Holt-Winters forecasting.

---

## 26. THE SOVEREIGN SWARM CODE OF CONDUCT & OPERATIONAL INVARIANTS

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHAPTER 26: SOVEREIGN OPERATIONAL INVARIANTS                    │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Mandate              │ Non-Negotiable Operational Rules for Swarm & Engineering Team   │
│ Philosophy           │ Flawless Craftsmanship / Zero Regression / Absolute Resilience  │
│ Verification Level   │ Continuous Autonomous Verification on Frame Zero                │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 26.1 The Ten Sacred Invariants of Bleje Pronën
1. **Never Ship an Un-Typechecked Commit**:
   No code change may enter the production tree unless `./node_modules/.bin/tsc --noEmit` exits with strictly code `0`. TypeScript strict mode is non-negotiable.
2. **Never Overwrite User Avatars on Social Login**:
   When a user authenticates via Google OAuth, existing custom avatars or OAuth picture URLs must be preserved; cartoon defaults must never overwrite active user imagery.
3. **Never Render a Partial-Height Followers Sheet**:
   Social graph relationships ("Ndjekësit" / "Të Ndjekurit") must always render as full-screen experiences with fluid tab switching, live counters, and instant in-list search.
4. **Never Leave Native Audio Permissions Undefined**:
   Both `NSMicrophoneUsageDescription` on iOS and `RECORD_AUDIO` on Android must exist in `app.json` at all times.
5. **Never Execute Direct Table Writes Without RLS**:
   Every table in the `public` schema must declare `ENABLE ROW LEVEL SECURITY`. Anon clients must never possess direct write access to internal telemetry or state catalogs.
6. **Never Display a Full-Page White Screen on Profile Load**:
   User profiles must hydrate optimistically on frame zero from local client cache (`bp_profile_cache`), reconciling asynchronously with network data.
7. **Never Let Horizontal Scroll Exceed Screen Width**:
   No viewport may permit `scrollWidth > innerWidth`. Fixed widths exceeding mobile bounds ($375-430\text{px}$) are strictly prohibited.
8. **Never Permit Unbounded Database Connections**:
   All high-concurrency read/write operations must route through the Supabase Transaction Pooler (port 6543) with pooled keep-alive configurations.
9. **Never Suppress Caught Errors Silently**:
   Every try/catch block must log to `telemetry_events` or propagate structured error responses. Swallowing exceptions in empty catch blocks is a capital engineering violation.
10. **Supreme Commander Thanos Governs All Tasks**:
    All 10 Marvel child agents operate under the direct, continuous command of Thanos. Every incident, heartbeat, recovery loop, and PR synthesis is arbitrated, deduplicated, and recorded in the sovereign registry.

---

```
==================================================================================================
                 OFFICIAL END OF BP-ASOS SOVEREIGN SWARM DIRECTIVES
                TOTAL OPERATIONAL ARCHITECTURE: FULLY ACTIVE & DEPLOYED
               THANOS (AGENT 0) + 10 MARVEL AGENTS MAINTAINING 24/7 VIGILANCE
==================================================================================================
```

---

## 27. THE COMPLETE SWARM TASK EXECUTION PROTOCOL & THANOS DISPATCH ALGORITHMS

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHAPTER 27: MULTI-AGENT TASK PIPELINE & DISPATCH ENGINE         │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Dispatch Model       │ Thanos Central Command / Multi-Agent Sequential & Parallel DAG  │
│ Orchestration Type   │ Directed Acyclic Graph (DAG) Task Scheduling                    │
│ Concurrency Control  │ Semaphore Memory-Capped Execution (Max 3 Concurrent Heavy Tasks)│
│ State Synchronization│ Event-Driven State Transitions with Checkpointed Heartbeats     │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 27.1 Multi-Agent Task Pipeline Architecture
Every operational task in Bleje Pronën-whether routine surveillance, code remediation, release verification, or disaster recovery-is structured as a **Directed Acyclic Graph (DAG)** orchestrated directly by Thanos. Child agents do not trigger ad-hoc side-effects on their own; they report observations to Thanos, and Thanos commands the subsequent agent in the pipeline.

```
                                [NEW TASK DISPATCHED BY THANOS]
                                                │
                                                ▼
                     ┌─────────────────────────────────────────────────────┐
                     │ STAGE 1: PERIMETER PROBE (Thor & Loki)              │
                     │ • Verify API Availability (Thor)                    │
                     │ • Verify Database & RLS Integrity (Loki)            │
                     └──────────────────────────┬──────────────────────────┘
                                                │
                                                ▼
                     ┌─────────────────────────────────────────────────────┐
                     │ STAGE 2: USER EXPERIENCE AUDIT (Hawkeye & Cap. Amer)│
                     │ • Headless Responsive Layout & Overflow (Hawkeye)   │
                     │ • 25 Synthetic User Conversion Funnels (Capt. Amer) │
                     └──────────────────────────┬──────────────────────────┘
                                                │
                                                ▼
                     ┌─────────────────────────────────────────────────────┐
                     │ STAGE 3: REAL-TIME SUBSYSTEM CHECK (Widow & Strange)│
                     │ • WebSocket Chat & Presence Latency (Black Widow)   │
                     │ • WebRTC Signaling & Native Audio Session (Strange) │
                     └──────────────────────────┬──────────────────────────┘
                                                │
                                                ▼
                     ┌─────────────────────────────────────────────────────┐
                     │ STAGE 4: DATA & MEDIA INTEGRITY (Spidey & Vision)   │
                     │ • Social Graph Reactivity & Hydration (Spider-Man)  │
                     │ • Storage Buckets & CDN Media Assets (Vision)       │
                     └──────────────────────────┬──────────────────────────┘
                                                │
                                                ▼
                     ┌─────────────────────────────────────────────────────┐
                     │ STAGE 5: REMEDIATION & ESCALATION (Iron Man & Thanos│
                     │ • Static Analysis & AST Patch Synthesis (Iron Man)  │
                     │ • GitHub PR Dispatch & Incident Persistence (Thanos)│
                     └─────────────────────────────────────────────────────┘
```

### 27.2 Production Workflow 1: New Release Verification Pipeline
Whenever a new code release is pushed to staging or production:
1. **Thor** interrogates endpoints (`/`, `/listings`, `/api/search`) to confirm deployment availability.
2. **Loki** probes database security boundaries to verify migrations did not disable RLS.
3. **Hawkeye** captures mobile snapshots at 375px, 390px, and 430px viewports to verify CSS styles did not introduce horizontal overflow.
4. **Captain America** runs the 5 canonical user journeys (Search -> View -> Contact -> Auth).
5. **Doctor Strange** audits `mobile/app.json` for audio permissions.
6. **Thanos** collates results into a unified release verification score ($[0, 100]$). If score $< 100$, Thanos flags the regression immediately.

### 27.3 Production Workflow 2: Zero-Day Crash Storm Autonomous Self-Healing
When a sudden influx of client errors occurs in production:
1. **Hulk** detects $Z \ge 4.0$ crash spike in `telemetry_events` table.
2. **Hulk** extracts the normalized top stack frame (e.g. `ProfileHeader.tsx:44`).
3. **Thanos** receives the defect, computes SHA-256 fingerprint, and dedupes incoming reports.
4. **Thanos** alerts the team via Telegram while simultaneously dispatching a high-priority command to **Iron Man**.
5. **Iron Man** parses the offending component AST, generates a surgical fix, verifies compilation with `./node_modules/.bin/tsc --noEmit`, and opens a GitHub Pull Request within 45 seconds of the initial crash.
6. **Engineer** taps `[Merge & Deploy]` on mobile phone.
7. **Thor** and **Hulk** verify crash rate drops back to $Z < 1.0$.

---

## 28. AGENT-BY-AGENT DETAILED OPERATIONAL HANDBOOKS (10 SUB-MANUALS)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHAPTER 28: THE 10 DETAILED AGENT OPERATIONAL HANDBOOKS         │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Scope                │ Deep Individual Operational Manuals for Agents 1 through 10     │
│ Contents             │ Environment Variables, Cadence, Invariants, Payloads, Metrics   │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 28.1 Agent 1: Iron Man Sub-Manual
* **Codename**: Iron Man
* **Title**: Autonomous Bug Repair & GitHub PR Engine
* **Source**: `services/swarm/workers/agent-workers.ts`
* **Cadence**: Baseline check every 60s; reactive escalation within 500ms.
* **Environment Dependencies**: `SWARM_GIT_WORKING_DIR`, `SWARM_GITHUB_TOKEN`, `SWARM_GITHUB_REPO`.
* **Execution Metrics**:
  - `compilerHealthy`: Boolean reflecting `./node_modules/.bin/tsc --noEmit` exit code.
  - `activePatchesCount`: Number of automated patches synthesized.
  - `lastCompileCheck`: ISO timestamp of latest compiler verification.
* **Non-Negotiable Rule**: Never push directly to `origin/main`. Always open a supervised PR on `agent/fix-*`.

### 28.2 Agent 2: Thor Sub-Manual
* **Codename**: Thor
* **Title**: Infrastructure, API Latency & Database Pool Health
* **Source**: `services/swarm/workers/agent-workers.ts`
* **Cadence**: Every 30 seconds.
* **Environment Dependencies**: `SWARM_TARGET_WEB_URL`, `SWARM_TARGET_API_URL`, `SWARM_DATABASE_URL`.
* **Execution Metrics**:
  - `p95LatencyMs`: Rolling 95th percentile latency in milliseconds.
  - `lastHttpCode`: Most recent HTTP response status code.
  - `endpointsTested`: Total endpoints probed in current cycle.
  - `failuresDetected`: Total failed endpoints in current cycle.
* **Non-Negotiable Rule**: Any HTTP 5xx response triggers an immediate `P1_CRITICAL` alert.

### 28.3 Agent 3: Hulk Sub-Manual
* **Codename**: Hulk
* **Title**: Runtime Exceptions & Crash Telemetry Interceptor
* **Source**: `services/swarm/workers/agent-workers.ts`
* **Cadence**: Every 15 seconds.
* **Environment Dependencies**: `SWARM_SUPABASE_URL`, `SWARM_SUPABASE_SERVICE_ROLE_KEY`.
* **Execution Metrics**:
  - `telemetryConnected`: Boolean indicating active connection to `telemetry_events`.
  - `recentErrorCount`: Number of error events in the preceding 5 minutes.
  - `activeCrashRatePerMin`: Calculated error frequency.
* **Non-Negotiable Rule**: If crash rate exceeds 5 errors/minute, raise a `P1_CRITICAL` alarm and mobilize Iron Man.

### 28.4 Agent 4: Hawkeye Sub-Manual
* **Codename**: Hawkeye
* **Title**: UI/UX Ergonomics, Safe-Area Bounds & Pixel Auditor
* **Source**: `services/swarm/workers/agent-workers.ts`
* **Cadence**: Every 5 minutes.
* **Environment Dependencies**: `SWARM_TARGET_WEB_URL`.
* **Execution Metrics**:
  - `hasViewportMeta`: Verifies `<meta name="viewport" content="width=device-width...">`.
  - `fixedWidthRisksCount`: Count of elements with fixed widths $> 430\text{px}$.
  - `htmlBytesChecked`: Size of analyzed DOM document.
* **Non-Negotiable Rule**: `scrollWidth > innerWidth` is an immediate `P2_HIGH` layout defect.

### 28.5 Agent 5: Captain America Sub-Manual
* **Codename**: Captain America
* **Title**: Synthetic User Journeys & End-to-End Funnels
* **Source**: `services/swarm/workers/agent-workers.ts`
* **Cadence**: Every 10 minutes.
* **Environment Dependencies**: `SWARM_TARGET_API_URL`.
* **Execution Metrics**:
  - `journeysTested`: Total synthetic flows executed (Search, Hub, Saved Searches).
  - `passedCount`: Total flows passing assertion criteria.
  - `allPassing`: Boolean reflecting 100% funnel health.
* **Non-Negotiable Rule**: Two-pass verification to eliminate false-positive alarms.

### 28.6 Agent 6: Loki Sub-Manual
* **Codename**: Loki
* **Title**: Security, Row-Level Security & OAuth Flow Integrity
* **Source**: `services/swarm/workers/agent-workers.ts`
* **Cadence**: Every 2 minutes.
* **Environment Dependencies**: `SWARM_SUPABASE_URL`, `SWARM_SUPABASE_ANON_KEY`.
* **Execution Metrics**:
  - `rlsEnforced`: Confirms anonymous insert to protected tables was rejected.
  - `lastProbeStatus`: HTTP status code returned on unauthorized write probe (401/403).
  - `lastSecurityCheck`: ISO timestamp of latest penetration audit.
* **Non-Negotiable Rule**: If anonymous client receives HTTP 200 on internal table insert, raise `P1_CRITICAL` security leak immediately.

### 28.7 Agent 7: Black Widow Sub-Manual
* **Codename**: Black Widow
* **Title**: Real-Time Chat & WebSocket State Monitor
* **Source**: `services/swarm/workers/agent-workers.ts`
* **Cadence**: Every 45 seconds.
* **Environment Dependencies**: `SWARM_TARGET_API_URL`, `SWARM_SUPABASE_URL`.
* **Execution Metrics**:
  - `conversationsStatus`: HTTP status of conversations gateway.
  - `chatEndpointHealthy`: Confirms status $< 500$.
* **Non-Negotiable Rule**: Real-time read receipts (`is_read: true`) must synchronize double checkmarks without page reload.

### 28.8 Agent 8: Doctor Strange Sub-Manual
* **Codename**: Doctor Strange
* **Title**: In-App Calling & WebRTC Audio Signaling
* **Source**: `services/swarm/workers/agent-workers.ts`
* **Cadence**: Every 60 seconds.
* **Environment Dependencies**: `SWARM_GIT_WORKING_DIR`.
* **Execution Metrics**:
  - `iosMicrophoneConfigured`: Confirms `NSMicrophoneUsageDescription` in `app.json`.
  - `androidMicrophoneConfigured`: Confirms `RECORD_AUDIO` in `android.permissions`.
  - `appJsonFound`: Confirms presence of native configuration file.
* **Non-Negotiable Rule**: Missing microphone description key is a `P1_CRITICAL` native release blocker.

### 28.9 Agent 9: Spider-Man Sub-Manual
* **Codename**: Spider-Man
* **Title**: Social Graph Reactivity & Instant Profile Hydration
* **Source**: `services/swarm/workers/agent-workers.ts`
* **Cadence**: Every 60 seconds.
* **Environment Dependencies**: `SWARM_TARGET_API_URL`.
* **Execution Metrics**:
  - `followEndpointLatencyMs`: Response time of `/api/follow` route.
  - `followEndpointStatus`: Clean HTTP handling of follow payloads.
* **Non-Negotiable Rule**: Follows/Following interface must be a full-screen experience with instant search, not an awkward bottom sheet.

### 28.10 Agent 10: Vision Sub-Manual
* **Codename**: Vision
* **Title**: Media Pipeline, Storage Buckets & Avatar Processing
* **Source**: `services/swarm/workers/agent-workers.ts`
* **Cadence**: Every 3 minutes.
* **Environment Dependencies**: `SWARM_SUPABASE_URL`.
* **Execution Metrics**:
  - `bucketsAudited`: Total storage buckets inspected (`listings`, `avatars`).
  - `brokenBucketsCount`: Number of buckets returning 404.
  - `storageHealthy`: Boolean confirming all buckets online.
* **Non-Negotiable Rule**: Storage bucket 404 is an immediate `P1_CRITICAL` asset pipeline failure.

---

## 29. EMERGENCY CRISIS PROTOCOLS & RED ALERT RUNBOOKS

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CHAPTER 29: RED ALERT CATASTROPHE RUNBOOKS                      │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Scope                │ Complete Platform Disaster Scenarios & Recovery Playbooks       │
│ Priority             │ Maximum / Immediate Pager Activation / Zero Latency Response    │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 29.1 Red Alert Runbook 01: Complete Supabase Database Outage
1. **Detection**: Thor detects `CONNECTION_FAILURE` on Supabase REST; Loki reports connection drops.
2. **Immediate Swarm Action**:
   - Thanos shifts persistence to **Memory-Mirror Mode**.
   - Dispatches `P1_CRITICAL` to Telegram with exact error code.
3. **Recovery Procedures**:
   - Log into Supabase Dashboard -> Project Settings -> Database.
   - Inspect CPU/RAM usage and PgBouncer connection pool saturation.
   - If database is unresponsive, trigger an immediate project restart via Supabase Dashboard.
   - Once database is back online, Thanos detects reconnection and automatically flushes buffered memory incidents to `public.agent_incidents`.

### 29.2 Red Alert Runbook 02: Vercel Edge Server Component Panic
1. **Detection**: Thor detects HTTP 500 across `/` and `/listings`.
2. **Immediate Swarm Action**:
   - Thor raises `P1_CRITICAL`.
   - AlertDispatcher pages engineering team.
   - Iron Man captures recent commit hash and parses Server Action logs.
3. **Recovery Procedures**:
   - Check Vercel Deployment Dashboard -> Deployments.
   - If latest deployment introduced a crash, execute an instantaneous rollback:
     ```bash
     vercel rollback
     ```
   - Thor verifies that HTTP 200 returns within 15 seconds.

### 29.3 Red Alert Runbook 03: RLS Security Policy Breach
1. **Detection**: Loki successfully inserts test payload via anonymous key into `telemetry_events` or `agent_incidents`.
2. **Immediate Swarm Action**:
   - Loki raises `P1_CRITICAL`.
   - AlertDispatcher triggers high-priority security alert.
3. **Recovery Procedures**:
   - Open Supabase SQL Editor immediately and execute:
     ```sql
     ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;
     REVOKE ALL ON public.telemetry_events FROM anon;
     REVOKE ALL ON public.telemetry_events FROM authenticated;
     GRANT ALL ON public.telemetry_events TO service_role;
     ```
   - Loki executes out-of-band probe to verify write is blocked (HTTP 401).

---

```
==================================================================================================
              BP-ASOS COMPENDIUM: MAXIMUM ENGINEERING EXCELLENCE ACHIEVED
               ALL 29 CHAPTERS COMPILED, VERIFIED, AND DEPLOYED IN PRODUCTION
               THANOS (AGENT 0) + 10 MARVEL AGENTS MAINTAINING 24/7/365 VIGILANCE
==================================================================================================
```
