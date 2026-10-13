/**
 * ============================================================================
 * BLEJE PRONËN — SUPABASE PERSISTENCE ADAPTER
 * File: services/swarm/persistence/supabase-adapter.ts
 *
 * Persists swarm incidents and heartbeats to Supabase PostgreSQL with
 * graceful offline/local fallback mode so the swarm remains resilient even
 * if the database connection temporarily fluctuates.
 * ============================================================================
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SwarmConfig } from '../config'
import {
  HeartbeatPayload,
  IncidentReportPayload,
  IncidentStatus,
  IncidentRecord,
} from '../types'

export class SupabaseAdapter {
  private client: SupabaseClient | null = null
  private readonly enabled: boolean
  private readonly inMemoryIncidents = new Map<string, IncidentRecord>()

  constructor(config: SwarmConfig) {
    if (config.supabaseUrl && config.supabaseServiceRoleKey) {
      try {
        this.client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })
        this.enabled = true
      } catch (err) {
        console.warn('[SupabaseAdapter] Failed to initialize Supabase client. Running in memory-only mode:', err)
        this.enabled = false
      }
    } else {
      this.enabled = false
    }
  }

  get isConnected(): boolean {
    return this.enabled && this.client !== null
  }

  /**
   * Upsert worker heartbeat telemetry
   */
  async upsertHeartbeat(payload: HeartbeatPayload): Promise<void> {
    if (!this.client) return

    try {
      const { error } = await this.client
        .from('agent_heartbeats')
        .upsert(
          {
            agent_name: payload.agentId,
            last_heartbeat_at: new Date().toISOString(),
            status: payload.status,
            memory_rss_mb: payload.memoryRssMb,
            metrics: payload.metrics || {},
          },
          { onConflict: 'agent_name' }
        )

      if (error) {
        // Table might not exist yet if migration hasn't been executed
        if (error.code !== '42P01') {
          console.warn(`[SupabaseAdapter] Heartbeat upsert error for ${payload.agentId}:`, error.message)
        }
      }
    } catch (err) {
      console.warn(`[SupabaseAdapter] Heartbeat network exception for ${payload.agentId}:`, err)
    }
  }

  /**
   * Record or update an incident in public.agent_incidents
   */
  async recordIncident(
    payload: IncidentReportPayload,
    fingerprint: string,
    occurrenceCount: number
  ): Promise<string | null> {
    const nowIso = new Date().toISOString()

    // Keep local in-memory mirror
    const localId = `inc_${fingerprint.slice(0, 12)}`
    this.inMemoryIncidents.set(fingerprint, {
      id: localId,
      agentName: payload.agentId,
      severity: payload.severity,
      title: payload.title,
      description: payload.description,
      fingerprint,
      status: 'DETECTED',
      occurrenceCount,
      stackTrace: payload.stackTrace || null,
      metadata: payload.metadata || {},
      createdAt: nowIso,
      updatedAt: nowIso,
    })

    if (!this.client) return localId

    try {
      // Check if an existing open incident with this fingerprint exists
      const { data: existing } = await this.client
        .from('agent_incidents')
        .select('id, occurrence_count')
        .eq('fingerprint', fingerprint)
        .neq('status', 'RESOLVED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        // Update occurrence count and updated_at
        const { error: updateError } = await this.client
          .from('agent_incidents')
          .update({
            occurrence_count: existing.occurrence_count + 1,
            updated_at: nowIso,
          })
          .eq('id', existing.id)

        if (updateError && updateError.code !== '42P01') {
          console.warn('[SupabaseAdapter] Incident count update error:', updateError.message)
        }
        return existing.id
      }

      // Insert new incident row
      const { data: inserted, error: insertError } = await this.client
        .from('agent_incidents')
        .insert({
          agent_name: payload.agentId,
          severity: payload.severity,
          title: payload.title,
          description: payload.description,
          fingerprint,
          status: 'DETECTED',
          occurrence_count: occurrenceCount,
          stack_trace: payload.stackTrace || null,
          metadata: {
            ...payload.metadata,
            location: payload.locationOrUrl,
            errorName: payload.errorName,
          },
        })
        .select('id')
        .single()

      if (insertError) {
        if (insertError.code !== '42P01') {
          console.warn('[SupabaseAdapter] Incident insert error:', insertError.message)
        }
        return localId
      }

      return inserted?.id || localId
    } catch (err) {
      console.warn('[SupabaseAdapter] Incident write exception:', err)
      return localId
    }
  }

  /**
   * Update incident lifecycle status (e.g. to ANALYZING or RESOLVED)
   */
  async updateIncidentStatus(incidentId: string, status: IncidentStatus): Promise<void> {
    if (!this.client) return

    try {
      await this.client
        .from('agent_incidents')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', incidentId)
    } catch (err) {
      console.warn(`[SupabaseAdapter] Failed to update incident ${incidentId} to ${status}:`, err)
    }
  }

  getInMemoryIncidents(): IncidentRecord[] {
    return Array.from(this.inMemoryIncidents.values())
  }
}
