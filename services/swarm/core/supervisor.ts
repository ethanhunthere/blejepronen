/**
 * ============================================================================
 * BLEJE PRONËN : OTP-STYLE SUPERVISOR TREE
 * File: services/swarm/core/supervisor.ts
 *
 * Implements one-for-one child supervision over all 10 Marvel agents.
 * Catches worker crashes, computes exponential backoffs, isolates chronic
 * failures via circuit breakers, and monitors heartbeat SLAs without affecting
 * Thanos or healthy sibling workers.
 * ============================================================================
 */

import {
  ISwarmWorker,
  MarvelAgentId,
  AgentHealthStatus,
  MARVEL_SWARM_ROSTER,
} from '../types'
import { SwarmEventBus } from './event-bus'

export interface SupervisedWorkerState {
  readonly worker: ISwarmWorker
  status: AgentHealthStatus
  lastHeartbeatAt: number
  crashTimestamps: number[]
  restartTimer?: NodeJS.Timeout
  isIsolated: boolean
}

export class SupervisorTree {
  private readonly workers = new Map<MarvelAgentId, SupervisedWorkerState>()
  private readonly eventBus: SwarmEventBus
  private readonly maxCrashRetries: number
  private readonly circuitBreakerWindowMs: number
  private readonly baseBackoffMs = 2000
  private readonly maxBackoffMs = 60000

  private watchdogTimer?: NodeJS.Timeout

  constructor(
    eventBus: SwarmEventBus,
    maxCrashRetries = 5,
    circuitBreakerWindowMs = 300_000 // 5 minutes
  ) {
    this.eventBus = eventBus
    this.maxCrashRetries = maxCrashRetries
    this.circuitBreakerWindowMs = circuitBreakerWindowMs

    // Watchdog check every 30 seconds for deadlocks or missed heartbeats
    this.watchdogTimer = setInterval(() => this.auditHeartbeats(), 30_000)

    // Listen for crash events emitted by worker boundaries
    this.eventBus.on('worker:crashed', (data) => {
      this.handleWorkerCrash(data.agentId, data.error)
    })
  }

  /**
   * Register a Marvel child worker into the supervision tree
   */
  register(worker: ISwarmWorker): void {
    this.workers.set(worker.id, {
      worker,
      status: 'HEALTHY',
      lastHeartbeatAt: Date.now(),
      crashTimestamps: [],
      isIsolated: false,
    })
  }

  /**
   * Start all supervised workers
   */
  async startAll(): Promise<void> {
    for (const [id, state] of this.workers.entries()) {
      try {
        state.status = 'HEALTHY'
        state.lastHeartbeatAt = Date.now()
        await state.worker.start()
      } catch (err) {
        console.error(`[Supervisor] Initial startup error for ${id}:`, err)
        this.handleWorkerCrash(id, err instanceof Error ? err : new Error(String(err)))
      }
    }
  }

  /**
   * Stop all workers gracefully
   */
  async stopAll(): Promise<void> {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer)
    }

    for (const state of this.workers.values()) {
      if (state.restartTimer) {
        clearTimeout(state.restartTimer)
      }
      try {
        await state.worker.stop()
      } catch (err) {
        console.warn(`[Supervisor] Error stopping worker ${state.worker.id}:`, err)
      }
    }
  }

  /**
   * Record that a child worker emitted a heartbeat
   */
  recordHeartbeat(agentId: MarvelAgentId): void {
    const state = this.workers.get(agentId)
    if (state) {
      state.lastHeartbeatAt = Date.now()
      if (state.status === 'DEGRADED') {
        state.status = 'HEALTHY'
      }
    }
  }

  /**
   * Handle worker crash with exponential backoff and circuit breaker
   */
  async handleWorkerCrash(agentId: MarvelAgentId, error: Error): Promise<void> {
    const state = this.workers.get(agentId)
    if (!state) return

    const now = Date.now()
    // Retain only crashes within the rolling circuit-breaker window
    state.crashTimestamps = state.crashTimestamps.filter(
      (ts) => now - ts < this.circuitBreakerWindowMs
    )
    state.crashTimestamps.push(now)

    const codeName = MARVEL_SWARM_ROSTER[agentId]?.codeName || agentId

    // Check circuit breaker trip condition
    if (state.crashTimestamps.length >= this.maxCrashRetries) {
      state.status = 'ISOLATED'
      state.isIsolated = true
      console.error(
        `🚨 [Supervisor:CIRCUIT_BREAKER] Worker ${codeName} (${agentId}) crashed ${state.crashTimestamps.length} times in ${this.circuitBreakerWindowMs / 1000}s. ISOLATING WORKER.`
      )

      this.eventBus.emit('worker:isolated', {
        agentId,
        reason: `Exceeded crash limit (${this.maxCrashRetries} crashes within ${this.circuitBreakerWindowMs / 1000}s): ${error.message}`,
        crashCount: state.crashTimestamps.length,
      })

      // Attempt to safely stop the crashing worker
      try {
        await state.worker.stop()
      } catch {
        // ignore
      }
      return
    }

    // Calculate exponential backoff delay: 2s, 4s, 8s, 16s, up to 60s
    const attempts = state.crashTimestamps.length
    const backoffDelayMs = Math.min(
      this.baseBackoffMs * Math.pow(2, attempts - 1),
      this.maxBackoffMs
    )

    state.status = 'RESTARTING'
    console.warn(
      `[Supervisor] Worker ${codeName} crashed (attempt ${attempts}/${this.maxCrashRetries}). Restarting in ${backoffDelayMs}ms... Error: ${error.message}`
    )

    if (state.restartTimer) {
      clearTimeout(state.restartTimer)
    }

    state.restartTimer = setTimeout(async () => {
      try {
        await state.worker.stop()
        await state.worker.start()
        state.status = 'HEALTHY'
        state.lastHeartbeatAt = Date.now()
        console.log(`✅ [Supervisor] Worker ${codeName} successfully recovered.`)
        this.eventBus.emit('worker:recovered', { agentId })
      } catch (restartErr) {
        console.error(`[Supervisor] Worker ${codeName} failed to recover:`, restartErr)
        this.handleWorkerCrash(
          agentId,
          restartErr instanceof Error ? restartErr : new Error(String(restartErr))
        )
      }
    }, backoffDelayMs)
  }

  /**
   * Check for workers that missed their heartbeat SLA
   */
  private auditHeartbeats(): void {
    const now = Date.now()
    for (const [id, state] of this.workers.entries()) {
      if (state.isIsolated) continue

      const metadata = MARVEL_SWARM_ROSTER[id]
      if (!metadata) continue

      // For interval workers, allow up to 2.5x their interval before flagging
      const maxAllowedSilenceMs = Math.max(metadata.defaultIntervalMs * 2.5, 90_000)

      if (now - state.lastHeartbeatAt > maxAllowedSilenceMs && state.status === 'HEALTHY') {
        state.status = 'DEGRADED'
        console.warn(
          `⚠️ [Supervisor] Worker ${metadata.codeName} (${id}) missed heartbeat SLA (${Math.round((now - state.lastHeartbeatAt) / 1000)}s since last ping). Marked DEGRADED.`
        )
      }
    }
  }

  /**
   * Reset isolation for a worker (operator manual un-isolate)
   */
  async resetWorker(agentId: MarvelAgentId): Promise<boolean> {
    const state = this.workers.get(agentId)
    if (!state) return false

    state.crashTimestamps = []
    state.isIsolated = false
    state.status = 'RESTARTING'

    try {
      await state.worker.stop()
      await state.worker.start()
      state.status = 'HEALTHY'
      state.lastHeartbeatAt = Date.now()
      this.eventBus.emit('worker:recovered', { agentId })
      return true
    } catch (err) {
      this.handleWorkerCrash(agentId, err instanceof Error ? err : new Error(String(err)))
      return false
    }
  }

  /**
   * Retrieve live health overview of all 10 workers
   */
  getHealthOverview(): Record<
    MarvelAgentId,
    { status: AgentHealthStatus; isIsolated: boolean; crashCount: number; secondsSinceLastHeartbeat: number }
  > {
    const now = Date.now()
    const overview = {} as Record<
      MarvelAgentId,
      { status: AgentHealthStatus; isIsolated: boolean; crashCount: number; secondsSinceLastHeartbeat: number }
    >

    for (const [id, state] of this.workers.entries()) {
      overview[id] = {
        status: state.status,
        isIsolated: state.isIsolated,
        crashCount: state.crashTimestamps.length,
        secondsSinceLastHeartbeat: Math.floor((now - state.lastHeartbeatAt) / 1000),
      }
    }

    return overview
  }
}
