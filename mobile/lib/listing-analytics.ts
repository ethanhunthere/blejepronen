/**
 * Listing analytics — Expo mirror of `lib/analytics.ts` (web).
 *
 * Same wire contract, same endpoint, same event names; the only difference is
 * transport auth: the app has no cookies, so every call sends the Supabase
 * session's access token as `Authorization: Bearer …` to the *web* API
 * (blejepronen.com), exactly like `mobile/lib/api.ts` does.
 *
 *   POST {API_BASE_URL}/api/analytics  { listingId, event, ownerId? }
 *        event ∈ 'view' | 'favorite' | 'lead'   (view: auth optional,
 *        favorite/lead: auth required — the route answers 401 otherwise)
 *   GET  {API_BASE_URL}/api/analytics?listingIds=a,b,c
 *        → { available, stats: { [id]: { views, favorites, leads } } }
 *
 * Design rules (identical to web):
 *  • Fire-and-forget: never throws, never blocks navigation, never retried.
 *  • `listing_events` may not be migrated yet — the route answers 204 and this
 *    module treats that as success, so the app works today on the live schema.
 *  • Counters shown to a host always come from the GET aggregate, never from
 *    optimistic local math.
 */

import { useEffect } from 'react'
import { supabase } from './supabase'
import { API_BASE_URL } from './api'

export type ListingEventName = 'view' | 'favorite' | 'lead'

export const ANALYTICS_PATH = '/api/analytics'

/** Per-listing counters returned by GET /api/analytics. */
export interface ListingStats {
  views: number
  favorites: number
  leads: number
}

export const EMPTY_LISTING_STATS: ListingStats = { views: 0, favorites: 0, leads: 0 }

/** Max ids the host dashboard asks about in one call (server enforces the same cap). */
export const MAX_STATS_IDS = 50

/** Hard timeout so a dead endpoint can never wedge a screen. */
const REQUEST_TIMEOUT_MS = 10_000

// One view per listing per app session: focus events remount screens, and a
// view is "someone opened this listing", not "this component rendered".
const firedViews = new Set<string>()

/** Test/preview helper: forget the in-session view dedupe state. */
export function resetViewDedupe(listingId?: string): void {
  if (listingId) firedViews.delete(listingId)
  else firedViews.clear()
}

async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  token: string | null = null
): Promise<Response | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export interface TrackEventOptions {
  /**
   * Listing owner id when already known. The route drops events from the
   * owner so a host browsing their own property does not inflate the funnel.
   * Noise filter only — never a trust decision.
   */
  ownerId?: string | null
}

/**
 * Send one funnel event. Resolves `true` when the server accepted (or
 * deliberately skipped) it, `false` on any failure. Never throws.
 */
export async function trackListingEvent(
  listingId: string | null | undefined,
  event: ListingEventName,
  options: TrackEventOptions = {}
): Promise<boolean> {
  if (!listingId || typeof listingId !== 'string') return false

  // 'favorite' and 'lead' require auth server-side; skip the round trip when
  // there is no session at all (the caller still gets a clean `false`).
  const token = await getAccessToken()
  if (!token && event !== 'view') return false

  const res = await fetchWithTimeout(
    `${API_BASE_URL}${ANALYTICS_PATH}`,
    {
      method: 'POST',
      body: JSON.stringify({
        listingId,
        event,
        ...(options.ownerId ? { ownerId: options.ownerId } : {}),
      }),
    },
    token
  )

  if (!res) return false
  return res.ok || res.status === 204
}

/** A visitor favourited the listing (call after the favourite write succeeded). */
export function trackListingFavorite(
  listingId: string | null | undefined,
  options: TrackEventOptions = {}
): Promise<boolean> {
  return trackListingEvent(listingId, 'favorite', options)
}

/** A visitor started contact (call reveal / message send). Auth required. */
export function trackListingLead(
  listingId: string | null | undefined,
  options: TrackEventOptions = {}
): Promise<boolean> {
  return trackListingEvent(listingId, 'lead', options)
}

export interface UseTrackListingViewOptions extends TrackEventOptions {
  /** Set false to suspend tracking (preview mode, owner preview, …). */
  enabled?: boolean
}

/**
 * Record exactly one `view` per listing per app session.
 *
 * INTEGRATION for `mobile/app/listings/[id].tsx` (owned by another workstream):
 *   import { useTrackListingView } from '@/lib/listing-analytics'
 *   …inside the screen component:
 *   useTrackListingView(listing?.id, { ownerId: listing?.user_id })
 * or render `<ListingViewTracker listingId={listing.id} ownerId={listing.user_id} />`.
 */
export function useTrackListingView(
  listingId: string | null | undefined,
  options: UseTrackListingViewOptions = {}
): void {
  const { ownerId = null, enabled = true } = options

  useEffect(() => {
    if (!enabled || !listingId) return
    if (firedViews.has(listingId)) return
    firedViews.add(listingId)
    void trackListingEvent(listingId, 'view', { ownerId })
    // Keyed on the listing id only: an inline options object identity change
    // must not re-fire (and double-count) the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, enabled, ownerId])
}

export interface ListingViewTrackerProps {
  listingId: string | null | undefined
  ownerId?: string | null
  enabled?: boolean
}

/**
 * Renders nothing; fires one `view` on mount. Kept JSX-free on purpose so it
 * can live in a `.ts` module next to the rest of the analytics client.
 */
export function ListingViewTracker({
  listingId,
  ownerId = null,
  enabled = true,
}: ListingViewTrackerProps): null {
  useTrackListingView(listingId ?? null, { ownerId, enabled })
  return null
}

// ── host dashboard read path ─────────────────────────────────────────────────

export interface ListingStatsResult {
  /** false when `listing_events` is not migrated yet or the call failed. */
  available: boolean
  stats: Record<string, ListingStats>
}

interface StatsResponse {
  available?: boolean
  stats?: Record<string, Partial<ListingStats>>
}

/**
 * Funnel counts for the caller's OWN listings (the route re-checks ownership;
 * somebody else's ids are simply omitted). Returns `available:false` when the
 * events table does not exist yet — render nothing in that case, never zeros.
 */
export async function fetchMyListingStats(
  listingIds: string[]
): Promise<ListingStatsResult> {
  const ids = Array.from(new Set((listingIds ?? []).filter(Boolean))).slice(0, MAX_STATS_IDS)
  if (ids.length === 0) return { available: false, stats: {} }

  const token = await getAccessToken()
  if (!token) return { available: false, stats: {} }

  const res = await fetchWithTimeout(
    `${API_BASE_URL}${ANALYTICS_PATH}?listingIds=${encodeURIComponent(ids.join(','))}`,
    { method: 'GET' },
    token
  )
  if (!res || !res.ok) return { available: false, stats: {} }

  let json: StatsResponse | null = null
  try {
    json = (await res.json()) as StatsResponse
  } catch {
    return { available: false, stats: {} }
  }

  if (!json || json.available !== true || !json.stats) {
    return { available: false, stats: {} }
  }

  const stats: Record<string, ListingStats> = {}
  for (const id of ids) {
    const row = json.stats[id]
    if (!row) continue
    stats[id] = {
      views: Number(row.views) || 0,
      favorites: Number(row.favorites) || 0,
      leads: Number(row.leads) || 0,
    }
  }
  return { available: true, stats }
}
