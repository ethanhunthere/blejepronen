/**
 * ============================================================================
 * BLEJE PRONËN — STRONGLY TYPED SWARM EVENT BUS
 * File: services/swarm/core/event-bus.ts
 *
 * In-memory typed pub/sub bus backed by Node.js EventEmitter.
 * Provides high-throughput, zero-collision communication between Thanos and
 * all 10 child workers with listener isolation.
 * ============================================================================
 */

import { EventEmitter } from 'events'
import { SwarmEventMap } from '../types'

export class SwarmEventBus {
  private readonly emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter()
    // Support all 10 child agents + Thanos + multiple listeners without warning
    this.emitter.setMaxListeners(50)
  }

  /**
   * Emit a strongly typed event to all registered listeners.
   * Catches synchronous errors thrown by listeners so one rogue listener
   * cannot terminate the event loop.
   */
  emit<K extends keyof SwarmEventMap>(event: K, payload: SwarmEventMap[K]): boolean {
    return this.emitter.emit(event, payload)
  }

  /**
   * Subscribe to a typed swarm event
   */
  on<K extends keyof SwarmEventMap>(
    event: K,
    listener: (payload: SwarmEventMap[K]) => void
  ): this {
    const safeListener = (payload: SwarmEventMap[K]) => {
      try {
        listener(payload)
      } catch (err) {
        console.error(`[SwarmEventBus] Error in listener for "${event}":`, err)
      }
    }
    // Store reference so off() could potentially match if needed
    ;(safeListener as unknown as { _original: unknown })._original = listener
    this.emitter.on(event, safeListener as (...args: unknown[]) => void)
    return this
  }

  /**
   * Subscribe once to a typed swarm event
   */
  once<K extends keyof SwarmEventMap>(
    event: K,
    listener: (payload: SwarmEventMap[K]) => void
  ): this {
    const safeListener = (payload: SwarmEventMap[K]) => {
      try {
        listener(payload)
      } catch (err) {
        console.error(`[SwarmEventBus] Error in once-listener for "${event}":`, err)
      }
    }
    ;(safeListener as unknown as { _original: unknown })._original = listener
    this.emitter.once(event, safeListener as (...args: unknown[]) => void)
    return this
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof SwarmEventMap>(
    event: K,
    listener: (payload: SwarmEventMap[K]) => void
  ): this {
    // Find wrapper by matching _original
    const listeners = this.emitter.listeners(event)
    for (const l of listeners) {
      if ((l as unknown as { _original?: unknown })._original === listener || l === listener) {
        this.emitter.off(event, l as (...args: unknown[]) => void)
        break
      }
    }
    return this
  }

  /**
   * Clear listeners
   */
  removeAllListeners(event?: keyof SwarmEventMap): this {
    this.emitter.removeAllListeners(event)
    return this
  }

  listenerCount(event: keyof SwarmEventMap): number {
    return this.emitter.listenerCount(event)
  }
}
