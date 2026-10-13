/**
 * ============================================================================
 * BLEJE PRONËN — DEDUPLICATION ENGINE
 * File: services/swarm/core/deduplicator.ts
 *
 * Computes deterministic SHA-256 fingerprints for reported anomalies and
 * suppresses duplicate alerts using an in-memory sliding-window cache.
 * ============================================================================
 */

import * as crypto from 'crypto'
import { IncidentReportPayload } from '../types'

export interface CachedFingerprintEntry {
  readonly fingerprint: string
  readonly agentId: string
  readonly title: string
  occurrenceCount: number
  firstSeenAt: number
  lastSeenAt: number
}

export interface DeduplicationResult {
  readonly isDuplicate: boolean
  readonly fingerprint: string
  readonly occurrenceCount: number
  readonly firstSeenAt: number
  readonly lastSeenAt: number
}

export class DeduplicationEngine {
  private readonly cache = new Map<string, CachedFingerprintEntry>()
  private readonly windowMs: number
  private pruneTimer?: NodeJS.Timeout

  constructor(windowMs = 3_600_000) {
    this.windowMs = windowMs
    // Periodically prune stale entries every 10 minutes
    this.pruneTimer = setInterval(() => this.pruneStaleEntries(), 600_000)
  }

  /**
   * Generates a deterministic SHA-256 fingerprint for an incident
   */
  computeFingerprint(payload: IncidentReportPayload): string {
    const normalizedAgent = payload.agentId.toLowerCase().trim()
    const normalizedTitle = payload.title.toLowerCase().trim()
    const normalizedLocation = (payload.locationOrUrl || '').toLowerCase().trim()
    const normalizedError = (payload.errorName || '').toLowerCase().trim()

    const rawSignature = `${normalizedAgent}|${normalizedTitle}|${normalizedLocation}|${normalizedError}`
    return crypto.createHash('sha256').update(rawSignature).digest('hex')
  }

  /**
   * Process an incident through the deduplicator.
   * If an identical fingerprint was recorded within the sliding window,
   * it increments the occurrence count and flags as duplicate.
   */
  process(payload: IncidentReportPayload): DeduplicationResult {
    const fingerprint = this.computeFingerprint(payload)
    const now = Date.now()
    const existing = this.cache.get(fingerprint)

    if (existing && now - existing.lastSeenAt < this.windowMs) {
      existing.occurrenceCount += 1
      existing.lastSeenAt = now
      return {
        isDuplicate: true,
        fingerprint,
        occurrenceCount: existing.occurrenceCount,
        firstSeenAt: existing.firstSeenAt,
        lastSeenAt: existing.lastSeenAt,
      }
    }

    // New or expired incident
    const entry: CachedFingerprintEntry = {
      fingerprint,
      agentId: payload.agentId,
      title: payload.title,
      occurrenceCount: 1,
      firstSeenAt: now,
      lastSeenAt: now,
    }
    this.cache.set(fingerprint, entry)

    return {
      isDuplicate: false,
      fingerprint,
      occurrenceCount: 1,
      firstSeenAt: now,
      lastSeenAt: now,
    }
  }

  /**
   * Manually check if a fingerprint is active in cache
   */
  get(fingerprint: string): CachedFingerprintEntry | undefined {
    return this.cache.get(fingerprint)
  }

  /**
   * Reset / clear cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Total active fingerprints in memory
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Remove entries that haven't been seen within the sliding window
   */
  private pruneStaleEntries(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastSeenAt >= this.windowMs) {
        this.cache.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer)
    }
    this.cache.clear()
  }
}
