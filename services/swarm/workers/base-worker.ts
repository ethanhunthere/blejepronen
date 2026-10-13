/**
 * ============================================================================
 * BLEJE PRONËN — BASE SWARM WORKER
 * File: services/swarm/workers/base-worker.ts
 *
 * Abstract foundation for all 10 specialized Marvel child agents.
 * Enforces standardized heartbeat emissions, error wrapping, interval scheduling,
 * and structured incident reporting.
 * ============================================================================
 */

import {
  ISwarmWorker,
  MarvelAgentId,
  MarvelAgentMetadata,
  AgentHealthStatus,
  IncidentSeverity,
  IncidentReportPayload,
  HeartbeatPayload,
  MARVEL_SWARM_ROSTER,
} from '../types'
import { SwarmEventBus } from '../core/event-bus'

export abstract class BaseSwarmWorker implements ISwarmWorker {
  readonly id: MarvelAgentId
  readonly metadata: MarvelAgentMetadata
  protected readonly eventBus: SwarmEventBus

  protected status: AgentHealthStatus = 'HEALTHY'
  protected intervalTimer?: NodeJS.Timeout
  protected heartbeatTimer?: NodeJS.Timeout
  protected isRunning = false
  protected metrics: Record<string, unknown> = {}

  constructor(id: MarvelAgentId, eventBus: SwarmEventBus) {
    this.id = id
    this.metadata = MARVEL_SWARM_ROSTER[id]
    this.eventBus = eventBus
  }

  getStatus(): AgentHealthStatus {
    return this.status
  }

  setStatus(status: AgentHealthStatus): void {
    this.status = status
  }

  getMetrics(): Record<string, unknown> {
    return {
      ...this.metrics,
      uptimeSeconds: Math.floor(process.uptime()),
    }
  }

  /**
   * Start the worker. If executionMode is 'interval', kicks off the timer loop.
   */
  async start(): Promise<void> {
    if (this.isRunning) return
    this.isRunning = true
    this.status = 'HEALTHY'

    this.emitHeartbeat()

    // Consistent heartbeat pulse every 30 seconds for all agents
    this.heartbeatTimer = setInterval(() => {
      if (this.isRunning) {
        this.emitHeartbeat()
      }
    }, 30_000)

    if (this.metadata.executionMode === 'interval' && this.metadata.defaultIntervalMs > 0) {
      // Execute initial tick after a brief 2-second stagger
      setTimeout(() => {
        if (this.isRunning) {
          this.executeTickSafe()
        }
      }, 2000)

      this.intervalTimer = setInterval(() => {
        if (this.isRunning) {
          this.executeTickSafe()
        }
      }, this.metadata.defaultIntervalMs)
    }

    this.eventBus.emit('worker:started', { agentId: this.id })
  }

  /**
   * Stop the worker and clean up interval timers.
   */
  async stop(): Promise<void> {
    this.isRunning = false
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer)
      this.intervalTimer = undefined
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  /**
   * Periodic inspection loop implemented by concrete child workers.
   */
  abstract tick(): Promise<void>

  /**
   * Wrap tick execution in an isolated boundary.
   */
  protected async executeTickSafe(): Promise<void> {
    try {
      await this.tick()
      this.emitHeartbeat()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.status = 'DEGRADED'
      console.error(`[Worker:${this.metadata.codeName}] Tick failure:`, error.message)
      // Supervisor catches this via worker:crashed event
      this.eventBus.emit('worker:crashed', {
        agentId: this.id,
        error,
        attempts: 1,
        nextRetryDelayMs: 5000,
      })
    }
  }

  /**
   * Report an anomaly or bug up to Thanos
   */
  protected reportIncident(params: {
    severity: IncidentSeverity
    title: string
    description: string
    locationOrUrl?: string
    errorName?: string
    stackTrace?: string
    metadata?: Record<string, unknown>
  }): void {
    const payload: IncidentReportPayload = {
      agentId: this.id,
      severity: params.severity,
      title: params.title,
      description: params.description,
      locationOrUrl: params.locationOrUrl,
      errorName: params.errorName,
      stackTrace: params.stackTrace,
      metadata: params.metadata,
    }

    // Thanos event bus receives this and computes fingerprint
    this.eventBus.emit('incident:detected', {
      ...payload,
      fingerprint: '', // Computed centrally by Thanos Deduplicator
    })
  }

  /**
   * Emit heartbeat telemetry
   */
  protected emitHeartbeat(): void {
    const memory = process.memoryUsage()
    const memoryRssMb = Math.round((memory.rss / (1024 * 1024)) * 10) / 10

    const payload: HeartbeatPayload = {
      agentId: this.id,
      status: this.status,
      memoryRssMb,
      metrics: this.getMetrics(),
    }

    this.eventBus.emit('heartbeat:received', payload)
  }
}
