import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * POST/GET /api/analytics — per-listing funnel counters (audit §6).
 *
 * This is the *listing-attributed* analytics table (`listing_events`), i.e. the
 * numbers a host sees on "Postimet e Mia" (views / favourites / leads per
 * property). It is deliberately separate from `/api/telemetry`
 * (`telemetry_events`), which is anonymous product telemetry with no
 * per-listing read path.
 *
 * ── POST contract ────────────────────────────────────────────────────────────
 * Body: `{ listingId: string, event: 'view'|'favorite'|'lead', ownerId?: string }`
 *  - `view`     : auth OPTIONAL (anonymous browsing must count)
 *  - `favorite` : auth REQUIRED (a favourite is an authenticated action)
 *  - `lead`     : auth REQUIRED (contact-intent is attributed to a real user)
 *  - `ownerId`  : optional noise filter. When the authenticated caller IS the
 *                 listing owner the event is dropped (204) so hosts browsing
 *                 their own property do not inflate their funnel. Never a
 *                 security control — ownership is re-checked against the
 *                 `listings` row for authenticated callers.
 *
 * Responses
 *  204 (empty)   — recorded, or intentionally skipped: `listing_events` not
 *                  migrated yet (Postgres 42P01), listing gone, self-event,
 *                  or rate-limited. Analytics must never break a page, so
 *                  every "nothing stored" outcome is a 204, not an error.
 *  400 `{error}` — malformed body / unknown event / bad listingId
 *  401 `{error}` — auth required for this event and no session was presented
 *  503 `{error}` — service-role key not configured
 *
 * ── GET contract ─────────────────────────────────────────────────────────────
 * `?listingIds=<uuid>,<uuid>` (max 50, auth REQUIRED, owner-scoped)
 *  200 `{ available: boolean, stats: { [listingId]: {views, favorites, leads} }, counted, partial }`
 *      `available:false` when `listing_events` does not exist yet — the client
 *      then renders no counters at all instead of dishonest zeros.
 *  400 bad ids · 401 unauthenticated
 *
 * Schema-drift policy: `listing_events` is owned by a concurrent migration and
 * may not exist (42P01) or may use slightly different column names (42703).
 * Every write/read therefore tries an ordered list of payload shapes and
 * remembers the first one that worked for the life of the serverless instance.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EVENTS_TABLE = 'listing_events'
const LISTINGS_TABLE = 'listings'

/** Postgres `undefined_table` — table not created yet. */
const UNDEFINED_TABLE = '42P01'
/** Postgres `undefined_column` — table exists, column name differs. */
const UNDEFINED_COLUMN = '42703'

const ALLOWED_EVENTS = ['view', 'favorite', 'lead'] as const
type EventName = (typeof ALLOWED_EVENTS)[number]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Max listing ids accepted by the GET aggregate. */
const MAX_GET_IDS = 50

/** Row ceiling for the GET aggregate (host dashboards ask for <= 50 listings). */
const MAX_AGGREGATE_ROWS = 20_000

/** Only the most recent window is aggregated, so old rows stay cheap. */
const AGGREGATE_WINDOW_DAYS = 180

const DEV = process.env.NODE_ENV !== 'production'

// ── lightweight in-memory abuse guard ────────────────────────────────────────
// Serverless instances are short-lived, so this is a best-effort dampener
// against a single client hammering the endpoint in a loop — not a durable
// quota. Exceeding it is a silent 204 (same as "skipped"), never an error.
const VIEW_RATE_LIMIT_PER_MINUTE = 60
const viewBuckets = new Map<string, { windowStart: number; count: number }>()
let lastBucketSweep = Date.now()

function withinViewRateLimit(key: string): boolean {
  const now = Date.now()
  if (now - lastBucketSweep > 120_000) {
    lastBucketSweep = now
    for (const [k, v] of viewBuckets) {
      if (now - v.windowStart > 120_000) viewBuckets.delete(k)
    }
  }
  const bucket = viewBuckets.get(key)
  if (!bucket || now - bucket.windowStart > 60_000) {
    viewBuckets.set(key, { windowStart: now, count: 1 })
    return true
  }
  bucket.count += 1
  return bucket.count <= VIEW_RATE_LIMIT_PER_MINUTE
}

// ── clients & auth ───────────────────────────────────────────────────────────

/**
 * Service-role client. No anon fallback: `listing_events` is written only from
 * here (RLS denies clients), and a silent fallback would turn a missing secret
 * into mysteriously empty counters.
 */
function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Resolve the caller: session cookie first (web), then `Authorization: Bearer`
 * (the Expo app shares this endpoint and has no cookies).
 */
async function resolveUser(
  request: Request,
  admin: SupabaseClient | null
): Promise<User | null> {
  try {
    const serverSupabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()
    if (user) return user
  } catch {
    // cookies unavailable (edge/build) — fall through to the bearer path
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ') && admin) {
    const token = authHeader.slice('Bearer '.length).trim()
    if (!token) return null
    try {
      const {
        data: { user },
      } = await admin.auth.getUser(token)
      if (user) return user
    } catch {
      return null
    }
  }
  return null
}

function isMissingTable(error: { code?: string; message?: string }): boolean {
  return (
    error.code === UNDEFINED_TABLE ||
    /relation .* does not exist|Could not find the table/i.test(error.message ?? '')
  )
}

function isMissingColumn(error: { code?: string; message?: string }): boolean {
  return (
    error.code === UNDEFINED_COLUMN ||
    /column .* does not exist|Could not find the '.*' column/i.test(error.message ?? '')
  )
}

// ── drift-proof insert ───────────────────────────────────────────────────────

type InsertCandidate = Record<string, unknown>

/**
 * Ordered payload shapes, richest first. The concurrent migration owns the real
 * column set; if it names things differently one of the leaner shapes still
 * lands, and a completely unmigrated DB answers 42P01 → 204 no-op.
 */
function buildInsertCandidates(args: {
  listingId: string
  event: EventName
  userId: string | null
}): InsertCandidate[] {
  const { listingId, event, userId } = args
  const withUser = (extra: Record<string, unknown>): InsertCandidate => ({
    listing_id: listingId,
    ...(userId ? { user_id: userId } : {}),
    ...extra,
  })

  return [
    withUser({ event, source: 'api' }),
    withUser({ event }),
    withUser({ event_type: event }),
    { listing_id: listingId, event },
    { listing_id: listingId, event_type: event },
  ]
}

/** Index of the candidate shape that last worked (process-local memo). */
let preferredInsertCandidate = 0

/**
 * Insert one event, trying candidate shapes in order.
 * @returns 'inserted' | 'missing_table' | 'failed'
 */
async function insertEvent(
  admin: SupabaseClient,
  args: { listingId: string; event: EventName; userId: string | null }
): Promise<'inserted' | 'missing_table' | 'failed'> {
  const candidates = buildInsertCandidates(args)
  // Try the remembered shape first, then everything else in order.
  const order = [
    preferredInsertCandidate,
    ...candidates.map((_, i) => i).filter((i) => i !== preferredInsertCandidate),
  ]

  for (const index of order) {
    const payload = candidates[index]
    if (!payload) continue

    const { error } = await admin.from(EVENTS_TABLE).insert(payload)
    if (!error) {
      preferredInsertCandidate = index
      return 'inserted'
    }

    if (isMissingTable(error)) return 'missing_table'
    // A column-name mismatch means "try the next shape"; anything else
    // (RLS 42501, FK 23503, NOT NULL 23502, unique 23505) will not be fixed by
    // a different column set, so stop early and report failure.
    if (!isMissingColumn(error)) {
      console.error('[analytics] insert failed', error.code, error.message)
      return 'failed'
    }
    if (DEV) console.warn(`[analytics] candidate #${index} rejected (42703), trying next shape`)
  }

  console.error('[analytics] no insert shape matched listing_events')
  return 'failed'
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return NextResponse.json({ error: 'body_must_be_object' }, { status: 400 })
  }

  const body = payload as { listingId?: unknown; event?: unknown; ownerId?: unknown }
  const listingId = typeof body.listingId === 'string' ? body.listingId.trim() : ''
  const event = typeof body.event === 'string' ? body.event.trim().toLowerCase() : ''

  if (!listingId || !UUID_RE.test(listingId)) {
    return NextResponse.json({ error: 'invalid_listing_id' }, { status: 400 })
  }
  if (!ALLOWED_EVENTS.includes(event as EventName)) {
    return NextResponse.json({ error: 'unknown_event' }, { status: 400 })
  }

  const eventName = event as EventName
  const admin = getServiceClient()
  if (!admin) {
    console.error('[analytics] SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL not set')
    return NextResponse.json({ error: 'analytics_unavailable' }, { status: 503 })
  }

  const user = await resolveUser(request, admin)
  const requiresAuth = eventName === 'lead' || eventName === 'favorite'
  if (requiresAuth && !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Cheap dampener for anonymous view spam; keyed on the user when known.
  const rateKey = user?.id ?? `ip:${request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'}`
  if (eventName === 'view' && !withinViewRateLimit(rateKey)) {
    return new NextResponse(null, { status: 204 })
  }

  // Verify the listing exists and drop self-events. One indexed read; keeps
  // `listing_events` free of orphan rows (and of FK violations).
  try {
    const { data: listingRow, error: listingError } = await admin
      .from(LISTINGS_TABLE)
      .select('id,user_id')
      .eq('id', listingId)
      .maybeSingle()

    if (!listingError && !listingRow) return new NextResponse(null, { status: 204 })
    if (!listingError && listingRow && user && listingRow.user_id === user.id) {
      // Host looking at their own listing — not demand.
      return new NextResponse(null, { status: 204 })
    }
    // A drift/permission error on this read must not lose the event: fall
    // through and let the insert decide (an FK will reject a bogus id anyway).
    if (listingError && DEV) {
      console.warn('[analytics] ownership pre-check skipped:', listingError.code, listingError.message)
    }
  } catch (err) {
    if (DEV) console.warn('[analytics] ownership pre-check exception:', err)
  }

  const outcome = await insertEvent(admin, {
    listingId,
    event: eventName,
    userId: user?.id ?? null,
  })

  if (outcome === 'missing_table') {
    if (DEV) console.warn(`[analytics] ${EVENTS_TABLE} missing — dropped ${eventName} for ${listingId}`)
    return new NextResponse(null, { status: 204 })
  }
  // 'failed' is still a 204: the caller did nothing wrong and no UI should break.
  return new NextResponse(null, { status: 204 })
}

// ── GET (host dashboard aggregate) ───────────────────────────────────────────

interface ListingCounts {
  views: number
  favorites: number
  leads: number
}

function counterKey(event: string): keyof ListingCounts | null {
  const normalized = event.toLowerCase()
  if (normalized === 'view' || normalized === 'listing_view') return 'views'
  if (normalized === 'favorite' || normalized === 'favourite') return 'favorites'
  if (normalized === 'lead' || normalized === 'contact' || normalized === 'message') return 'leads'
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('listingIds') ?? ''
  const ids = Array.from(
    new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => UUID_RE.test(s))
    )
  ).slice(0, MAX_GET_IDS)

  if (ids.length === 0) {
    return NextResponse.json({ error: 'invalid_listing_ids' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'analytics_unavailable' }, { status: 503 })
  }

  const user = await resolveUser(request, admin)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Owner-scoping: only rows the caller actually owns can be reported on.
  const { data: owned, error: ownedError } = await admin
    .from(LISTINGS_TABLE)
    .select('id')
    .eq('user_id', user.id)
    .in('id', ids)

  if (ownedError) {
    console.error('[analytics] ownership lookup failed', ownedError.code, ownedError.message)
    return NextResponse.json({ error: 'stats_unavailable' }, { status: 500 })
  }

  const ownedIds = (owned ?? []).map((row) => row.id as string).filter(Boolean)
  if (ownedIds.length === 0) {
    return NextResponse.json({ available: true, stats: {}, counted: 0, partial: false })
  }

  const sinceIso = new Date(Date.now() - AGGREGATE_WINDOW_DAYS * 86_400_000).toISOString()

  // `select('*')` on purpose: naming columns is what breaks on schema drift.
  const baseQuery = () => admin.from(EVENTS_TABLE).select('*').in('listing_id', ownedIds)

  let rows: Record<string, unknown>[] | null = null
  let queryError: { code?: string; message?: string } | null = null

  const first = await baseQuery().gte('created_at', sinceIso).limit(MAX_AGGREGATE_ROWS)
  if (!first.error) {
    rows = (first.data ?? []) as Record<string, unknown>[]
  } else if (isMissingTable(first.error)) {
    return NextResponse.json({ available: false, stats: {}, counted: 0, partial: false })
  } else if (isMissingColumn(first.error)) {
    // No `created_at` column — drop the time window rather than lose the data.
    const second = await baseQuery().limit(MAX_AGGREGATE_ROWS)
    if (second.error) {
      if (isMissingTable(second.error)) {
        return NextResponse.json({ available: false, stats: {}, counted: 0, partial: false })
      }
      queryError = second.error
    } else {
      rows = (second.data ?? []) as Record<string, unknown>[]
    }
  } else {
    queryError = first.error
  }

  if (!rows) {
    console.error('[analytics] aggregate read failed', queryError?.code, queryError?.message)
    return NextResponse.json({ available: false, stats: {}, counted: 0, partial: false })
  }

  const stats: Record<string, ListingCounts> = {}
  for (const id of ownedIds) stats[id] = { views: 0, favorites: 0, leads: 0 }

  let counted = 0
  for (const row of rows) {
    const listingId = typeof row.listing_id === 'string' ? row.listing_id : null
    if (!listingId || !stats[listingId]) continue
    const rawEvent = row.event ?? row.event_type ?? row.name
    if (typeof rawEvent !== 'string') continue
    const bucket = counterKey(rawEvent)
    if (!bucket) continue
    // Ignore rows outside the window when the DB could not filter them.
    const createdAt = typeof row.created_at === 'string' ? Date.parse(row.created_at) : NaN
    if (Number.isFinite(createdAt) && createdAt < Date.parse(sinceIso)) continue
    stats[listingId][bucket] += 1
    counted += 1
  }

  return NextResponse.json({
    available: true,
    stats,
    counted,
    partial: rows.length >= MAX_AGGREGATE_ROWS,
  })
}
