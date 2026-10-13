/**
 * ============================================================================
 * BLEJE PRONËN : THANOS: SUPREME COMMANDER & MASTER ORCHESTRATOR
 * File: services/swarm/core/thanos.ts
 *
 * Agent 0: Thanos coordinates, supervises, and commands the entire 10-agent
 * Marvel monitoring and engineering swarm.
 *
 * Responsibilities:
 *   - Orchestrates the typed SwarmEventBus
 *   - Enforces the OTP-style SupervisorTree across all 10 child workers
 *   - Computes deterministic SHA-256 deduplication to eliminate duplicate alerts
 *   - Persists incidents and heartbeats to Supabase PostgreSQL with offline resilience
 *   - Escalates critical defects to Iron Man for compiler checks and auto-patching
 *   - Guarantees zero-downtime graceful recovery on crashes
 * ============================================================================
 */

import {
  MARVEL_SWARM_ROSTER,
  MarvelAgentId,
  IncidentReportPayload,
  HeartbeatPayload,
  AgentHealthStatus,
} from '../types'
import { loadSwarmConfig, SwarmConfig } from '../config'
import { SwarmEventBus } from './event-bus'
import { DeduplicationEngine } from './deduplicator'
import { SupervisorTree } from './supervisor'
import { SupabaseAdapter } from '../persistence/supabase-adapter'
import { AlertDispatcher } from '../alerts/alert-dispatcher'

// Import all 10 Marvel child agents
import {
  IronManWorker,
  ThorWorker,
  HulkWorker,
  HawkeyeWorker,
  CaptainAmericaWorker,
  LokiWorker,
  BlackWidowWorker,
  DoctorStrangeWorker,
  SpiderManWorker,
  VisionWorker,
} from '../workers/agent-workers'

export class ThanosOrchestrator {
  readonly id: MarvelAgentId = 'thanos'
  readonly metadata = MARVEL_SWARM_ROSTER['thanos']

  readonly config: SwarmConfig
  readonly eventBus: SwarmEventBus
  readonly deduplicator: DeduplicationEngine
  readonly supervisor: SupervisorTree
  readonly persistence: SupabaseAdapter
  readonly alertDispatcher: AlertDispatcher

  // Child Workers
  readonly ironMan: IronManWorker
  readonly thor: ThorWorker
  readonly hulk: HulkWorker
  readonly hawkeye: HawkeyeWorker
  readonly captainAmerica: CaptainAmericaWorker
  readonly loki: LokiWorker
  readonly blackWidow: BlackWidowWorker
  readonly doctorStrange: DoctorStrangeWorker
  readonly spiderMan: SpiderManWorker
  readonly vision: VisionWorker

  private isRunning = false
  private startTime = 0
  private pulseCount = 0
  private thanosHeartbeatTimer?: NodeJS.Timeout

  constructor(customConfig?: Partial<SwarmConfig>) {
    this.config = { ...loadSwarmConfig(), ...customConfig }
    this.eventBus = new SwarmEventBus()
    this.deduplicator = new DeduplicationEngine(this.config.dedupWindowMs)
    this.supervisor = new SupervisorTree(
      this.eventBus,
      this.config.maxCrashRetries,
      this.config.circuitBreakerWindowMs
    )
    this.persistence = new SupabaseAdapter(this.config)
    this.alertDispatcher = new AlertDispatcher(this.config)

    // Instantiate all 10 child workers
    this.ironMan = new IronManWorker(this.eventBus, this.config)
    this.thor = new ThorWorker(this.eventBus, this.config)
    this.hulk = new HulkWorker(this.eventBus, this.config)
    this.hawkeye = new HawkeyeWorker(this.eventBus, this.config)
    this.captainAmerica = new CaptainAmericaWorker(this.eventBus, this.config)
    this.loki = new LokiWorker(this.eventBus, this.config)
    this.blackWidow = new BlackWidowWorker(this.eventBus, this.config)
    this.doctorStrange = new DoctorStrangeWorker(this.eventBus, this.config)
    this.spiderMan = new SpiderManWorker(this.eventBus, this.config)
    this.vision = new VisionWorker(this.eventBus, this.config)

    // Register all 10 child workers with the Supervisor Tree
    this.supervisor.register(this.ironMan)
    this.supervisor.register(this.thor)
    this.supervisor.register(this.hulk)
    this.supervisor.register(this.hawkeye)
    this.supervisor.register(this.captainAmerica)
    this.supervisor.register(this.loki)
    this.supervisor.register(this.blackWidow)
    this.supervisor.register(this.doctorStrange)
    this.supervisor.register(this.spiderMan)
    this.supervisor.register(this.vision)

    this.wireEventHandlers()
  }

  /**
   * Boot Thanos and activate the entire Marvel swarm
   */
  async start(): Promise<void> {
    if (this.isRunning) return
    this.isRunning = true
    this.startTime = Date.now()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`🌌 [THANOS] Booting Autonomous Swarm for Bleje Pronën (${this.config.environment})`)
    console.log(`🎯 Target Platform URL: ${this.config.targetWebUrl}`)
    console.log(`💾 Supabase Adapter: ${this.persistence.isConnected ? 'Connected (PostgreSQL)' : 'Offline (Memory Fallback)'}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Start all 10 supervised child workers
    await this.supervisor.startAll()

    // Thanos self-heartbeat loop (keeps daemon event loop alive)
    this.emitThanosHeartbeat()
    this.thanosHeartbeatTimer = setInterval(() => {
      this.emitThanosHeartbeat()
    }, this.config.heartbeatIntervalMs)

    this.eventBus.emit('swarm:started', { timestamp: this.startTime })
    console.log('⚡ [THANOS] All 10 Marvel child workers active and under supervision.')
  }

  /**
   * Stop Thanos and cleanly terminate all child agents
   */
  async stop(reason = 'Normal shutdown'): Promise<void> {
    if (!this.isRunning) return
    this.isRunning = false

    console.log(`🛑 [THANOS] Terminating Swarm: ${reason}`)

    if (this.thanosHeartbeatTimer) {
      clearInterval(this.thanosHeartbeatTimer)
    }

    await this.supervisor.stopAll()
    this.deduplicator.destroy()

    this.eventBus.emit('swarm:stopped', { timestamp: Date.now(), reason })
    console.log('✨ [THANOS] All workers stopped safely. Swarm offline.')
  }

  /**
   * Attach process signal listeners for clean host termination
   */
  attachProcessSignalHandlers(): void {
    const handleSignal = async (signal: string) => {
      console.log(`\n[THANOS] Caught ${signal}. Initiating graceful swarm shutdown...`)
      await this.stop(`Signal ${signal}`)
      process.exit(0)
    }

    process.on('SIGINT', () => handleSignal('SIGINT'))
    process.on('SIGTERM', () => handleSignal('SIGTERM'))

    // 24/7 Process Crash Guards: prevent unexpected socket/network errors from bringing down Thanos
    process.on('unhandledRejection', (reason) => {
      console.error('🛡️ [THANOS:CRASH_GUARD] Unhandled Promise Rejection intercepted:', reason)
    })

    process.on('uncaughtException', (error) => {
      console.error('🛡️ [THANOS:CRASH_GUARD] Uncaught Exception intercepted:', error)
    })
  }

  /**
   * Wire central event bus routing
   */
  private wireEventHandlers(): void {
    // 1. Process Heartbeats
    this.eventBus.on('heartbeat:received', async (heartbeat: HeartbeatPayload) => {
      this.supervisor.recordHeartbeat(heartbeat.agentId)
      await this.persistence.upsertHeartbeat(heartbeat)
    })

    // 2. Process Incident Telemetry through Deduplicator
    this.eventBus.on('incident:detected', async (payload: IncidentReportPayload) => {
      const dedupResult = this.deduplicator.process(payload)

      if (dedupResult.isDuplicate) {
        this.eventBus.emit('incident:deduplicated', {
          fingerprint: dedupResult.fingerprint,
          count: dedupResult.occurrenceCount,
          agentId: payload.agentId,
        })

        // Update occurrence counter in database
        await this.persistence.recordIncident(
          payload,
          dedupResult.fingerprint,
          dedupResult.occurrenceCount
        )

        // Dispatch alert if threshold or cooldown dictates
        await this.alertDispatcher.dispatch(
          payload,
          dedupResult.fingerprint,
          dedupResult.occurrenceCount
        )
        return
      }

      // New Incident
      const incidentId = await this.persistence.recordIncident(
        payload,
        dedupResult.fingerprint,
        1
      )

      console.warn(
        `🚨 [THANOS:INCIDENT] [${payload.severity}] From ${payload.agentId.toUpperCase()}: "${payload.title}" (FP: ${dedupResult.fingerprint.slice(0, 8)})`
      )

      if (incidentId) {
        this.eventBus.emit('incident:persisted', {
          id: incidentId,
          fingerprint: dedupResult.fingerprint,
        })

        // Dispatch real-time alert (Telegram / Discord)
        await this.alertDispatcher.dispatch(payload, dedupResult.fingerprint, 1)

        // Escalate critical or high priority bugs to Iron Man
        if (payload.severity === 'P1_CRITICAL' || payload.severity === 'P2_HIGH') {
          this.ironMan.analyzeAndSynthesizePatch(incidentId, payload.title, payload.metadata)
        }
      }
    })

    // 3. Worker Crash Alerting
    this.eventBus.on('worker:crashed', (data) => {
      console.warn(
        `⚠️ [THANOS] Worker ${data.agentId} reported crash. Backoff restart active (attempt #${data.attempts}).`
      )
    })

    // 4. Worker Isolated Alerting
    this.eventBus.on('worker:isolated', (data) => {
      console.error(
        `💥 [THANOS:ISOLATION] Worker ${data.agentId} isolated by Circuit Breaker: ${data.reason}`
      )
    })
  }

  /**
   * Emit Thanos supreme commander heartbeat
   */
  private emitThanosHeartbeat(): void {
    const memory = process.memoryUsage()
    const memoryRssMb = Math.round((memory.rss / (1024 * 1024)) * 10) / 10

    const payload: HeartbeatPayload = {
      agentId: 'thanos',
      status: 'HEALTHY',
      memoryRssMb,
      metrics: {
        uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
        activeFingerprints: this.deduplicator.size,
        totalWorkersSupervised: 10,
      },
    }

    this.persistence.upsertHeartbeat(payload)

    this.pulseCount++
    if (this.pulseCount % 2 === 0) {
      const overview = this.supervisor.getHealthOverview()
      const healthyWorkers = Object.values(overview).filter((w) => w.status === 'HEALTHY').length
      const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000)
      console.log(
        `💓 [THANOS:PULSE] ${healthyWorkers}/10 Workers HEALTHY | Uptime: ${uptimeSec}s | Memory: ${memoryRssMb}MB | Cache: ${this.deduplicator.size}`
      )
    }
  }

  /**
   * Retrieve live diagnostic overview
   */
  getStatusReport(): {
    thanos: {
      status: AgentHealthStatus
      uptimeSeconds: number
      activeFingerprintsCount: number
      supabaseConnected: boolean
    }
    workers: Record<
      MarvelAgentId,
      { status: AgentHealthStatus; isIsolated: boolean; crashCount: number; secondsSinceLastHeartbeat: number }
    >
  } {
    return {
      thanos: {
        status: this.isRunning ? 'HEALTHY' : 'DEGRADED',
        uptimeSeconds: this.startTime > 0 ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
        activeFingerprintsCount: this.deduplicator.size,
        supabaseConnected: this.persistence.isConnected,
      },
      workers: this.supervisor.getHealthOverview(),
    }
  }
}
