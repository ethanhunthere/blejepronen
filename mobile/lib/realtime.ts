import { supabase } from './supabase'

/**
 * Creates a collision-proof Supabase Realtime channel.
 *
 * Why this exists:
 * supabase-js keys channels by topic. Calling `supabase.channel(topic)` while a
 * previous channel with the SAME topic is still being torn down returns that
 * OLD, already-subscribed channel — and adding a `.on('postgres_changes', …)`
 * callback afterwards throws:
 *
 *   "cannot add 'postgres_changes' callbacks for realtime:<topic> after 'subscribe()'"
 *
 * This happens on screen remounts / fast navigation (e.g. tapping "Kalo" on the
 * complete-profile screen, which re-enters the tab navigator), because
 * `removeChannel()` completes asynchronously.
 *
 * The helper:
 *   1. proactively removes any stale channels sharing this base topic, then
 *   2. returns a brand-new channel with a unique topic suffix.
 */
export function createSafeChannel(baseTopic: string) {
  const prefix = `realtime:${baseTopic}`

  try {
    for (const existing of supabase.getChannels()) {
      if (existing.topic === prefix || existing.topic.startsWith(`${prefix}_`)) {
        supabase.removeChannel(existing)
      }
    }
  } catch (e) {
    console.warn('Realtime stale-channel cleanup notice:', e)
  }

  const uniqueTopic = `${baseTopic}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`

  return supabase.channel(uniqueTopic)
}