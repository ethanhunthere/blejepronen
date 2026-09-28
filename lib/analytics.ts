'use client'

/**
 * Listing analytics — client half of the baseline funnel (audit §6).
 *
 * Wire contract (server half lives in `app/api/analytics/route.ts`):
 *   POST /api/analytics  { listingId: string, event: 'view'|'favorite'|'lead', ownerId?: string }
 *     → 204 always on success / no-op (never blocks or breaks the page)
 *   GET  /api/analytics?listingIds=a,b,c   (auth required, owner-scoped)
 *     → { available: boolean, stats: Record<listingId, {views, favorites, leads}> }
 *
 * Design rules:
 *  • Fire-and-forget. Analytics must NEVER throw into a render path or fail a
 *    user action — every entry point swallows errors and resolves.
 *  • Honest counters. No optimistic inflation, no client-side totals: the
 *    numbers shown in "Postimet e Mia" come from the server aggregate.
 *  • Schema-drift safe. `listing_events` may not exist yet on the live DB; the
 *    route answers 204 and this module treats that as success.
 *
 * ⚠️ `useTrackListingView` / `<ListingViewTracker />` are the ONLY supported way
 *    to record a detail-page view. The listing detail page
 *    (app/listings/[id]/page.tsx) is a server component owned by another
 *    workstream — it must not be edited here, so the tracker is exported for the
 *    integrator to drop in (see the header of ListingViewTracker below).
 */

import { useEffect } from 'react'

export type ListingEventName = 'view' | 'favorite' | 'lead'

export const ANALYTICS_ENDPOINT = '/api/analytics'

/** Per-listing counters returned by GET /api/analytics. */
export interface ListingStats {
  views: number
  favorites: number
  leads: number
}

export const EMPTY_LISTING_STATS: ListingStats = { views: 0, favorites: 0, leads: 0 }

/** Max ids the host dashboard asks about in one call (server enforces the same cap). */
export const MAX_STATS_IDS = 50

// ── view de-duplication ──────────────────────────────────────────────────────
// A view is one "someone opened this listing" signal, not one render. React 19
// Strict Mode double-invokes effects and client-side navigation remounts pages,
// so dedupe in memory for the tab lifetime and in sessionStorage across
// soft navigations. This is a noise filter only — it is NOT a security control
// (the server also drops views from the listing's own owner).
const firedViews = new Set<string>()

function viewAlreadyFired(listingId: string): boolean {
  if (firedViews.has(listingId)) return true
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (window.sessionStorage.getItem(`bp:viewed:${listingId}`) === '1') {
        firedViews.add(listingId)
        return true
      }
    }
  } catch {
    // private mode / storage disabled — in-memory dedupe still applies
  }
  return false
}

function markViewFired(listingId: string): void {
  firedViews.add(listingId)
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(`bp:viewed:${listingId}`, '1')
    }
  } catch {
    // ignore
  }
}

/** Test/preview helper: forget the in-tab view dedupe state. */
export function resetViewDedupe(listingId?: string): void {
  if (listingId) {
    firedViews.delete(listingId)
    try {
      window.sessionStorage?.removeItem(`bp:viewed:${listingId}`)
    } catch {
      // ignore
    }
    return
  }
  firedViews.clear()
}

// ── event emitter ────────────────────────────────────────────────────────────

export interface TrackEventOptions {
  /**
   * Pass the listing owner's id when it is already known (detail pages have it).
   * The route drops self-events so a host browsing their own listing does not
   * inflate their funnel. Noise filter only — never a trust decision.
   */
  ownerId?: string | null
  /** Abort signal for callers that want to cancel on unmount. */
  signal?: AbortSignal
}

/**
 * Send one funnel event. Resolves `true` when the server accepted (or
 * deliberately no-op'd) it, `false` on any failure. Never throws.
 */
export async function trackListingEvent(
  listingId: string | null | undefined,
  event: ListingEventName,
  options: TrackEventOptions = {}
): Promise<boolean> {
  if (!listingId || typeof listingId !== 'string') return false

  try {
    const res = await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      // Same-origin cookies carry the web session; the route also accepts a
      // Bearer token so the mobile app can hit the identical endpoint.
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId,
        event,
        ...(options.ownerId ? { ownerId: options.ownerId } : {}),
      }),
      signal: options.signal,
    })
    // 204 = recorded OR intentionally skipped (table not migrated yet / own
    // listing / duplicate). Both are "nothing to do".
    return res.ok || res.status === 204
  } catch {
    return false
  }
}

/** A visitor favourited the listing (call from the heart toggle, after success). */
export function trackListingFavorite(
  listingId: string | null | undefined,
  options: TrackEventOptions = {}
): Promise<boolean> {
  return trackListingEvent(listingId, 'favorite', options)
}

/**
 * A visitor started contact: opened the phone number, sent a message, or
 * submitted the contact form. Auth is REQUIRED by the route for this event.
 */
export function trackListingLead(
  listingId: string | null | undefined,
  options: TrackEventOptions = {}
): Promise<boolean> {
  return trackListingEvent(listingId, 'lead', options)
}

// ── view tracking ────────────────────────────────────────────────────────────

export interface UseTrackListingViewOptions extends TrackEventOptions {
  /** Set false to suspend tracking (e.g. preview mode, owner preview). */
  enabled?: boolean
}

/**
 * Record exactly one `view` per listing per browser tab.
 *
 * INTEGRATION (app/listings/[id]/page.tsx is a server component, so the hook
 * cannot be called there directly — render the client component below, or call
 * this hook from any existing client child):
 *
 *   import { ListingViewTracker } from '@/lib/analytics'
 *   ...
 *   <ListingViewTracker listingId={listing.id} ownerId={listing.user_id} />
 */
export function useTrackListingView(
  listingId: string | null | undefined,
  options: UseTrackListingViewOptions = {}
): void {
  const { ownerId = null, enabled = true, signal } = options

  useEffect(() => {
    if (!enabled || !listingId) return
    if (viewAlreadyFired(listingId)) return
    markViewFired(listingId)
    void trackListingEvent(listingId, 'view', { ownerId, signal })
    // Deliberately keyed on the listing id only: re-running because a parent
    // re-rendered an inline options object would double-count views.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, enabled, ownerId])
}

export interface ListingViewTrackerProps {
  listingId: string
  ownerId?: string | null
  enabled?: boolean
}

/**
 * Drop-in client component for the (server-rendered) listing detail page.
 * Renders nothing; its only job is to fire one `view` event on mount.
 *
 * Paste inside the detail page's JSX (anywhere in the tree):
 *   <ListingViewTracker listingId={listing.id} ownerId={listing.user_id} />
 */
export function ListingViewTracker({
  listingId,
  ownerId = null,
  enabled = true,
}: ListingViewTrackerProps): null {
  useTrackListingView(listingId, { ownerId, enabled })
  return null
}

// ── host dashboard read path ─────────────────────────────────────────────────

export interface ListingStatsResult {
  /** false when `listing_events` does not exist yet (route answered 204/empty). */
  available: boolean
  stats: Record<string, ListingStats>
}

/**
 * Fetch funnel counts for the caller's OWN listings (the route re-checks
 * ownership server-side; ids belonging to somebody else are simply omitted).
 * Returns `{ available: false, stats: {} }` when the table is not migrated yet
 * or the request fails — callers must render nothing in that case rather than
 * showing fake zeros.
 */
export async function fetchMyListingStats(
  listingIds: string[],
  options: { signal?: AbortSignal } = {}
): Promise<ListingStatsResult> {
  const ids = Array.from(new Set(listingIds.filter(Boolean))).slice(0, MAX_STATS_IDS)
  if (ids.length === 0) return { available: false, stats: {} }

  try {
    const res = await fetch(`${ANALYTICS_ENDPOINT}?listingIds=${encodeURIComponent(ids.join(','))}`, {
      credentials: 'same-origin',
      signal: options.signal,
    })
    if (!res.ok) return { available: false, stats: {} }
    const json = (await res.json().catch(() => null)) as {
      available?: boolean
      stats?: Record<string, Partial<ListingStats>>
    } | null
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
  } catch {
    return { available: false, stats: {} }
  }
}
