import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * POST /api/reports — listing abuse reports (audit §6, marketplace integrity).
 *
 * Contract
 * --------
 * Body: `{ listingId: string, reason: ReportReason, note?: string }`
 *   reason ∈ spam | fraudulent | duplicate | offensive | other
 *   note   : required (>= 5 chars) when reason === 'other', optional otherwise,
 *            max 1000 chars.
 *
 * Responses
 *  201 `{ success: true, duplicate?: true }` — report stored (or the same user
 *            already reported this listing, which is idempotent by design)
 *  400 `{ error, message }` — malformed body / unknown reason / missing note
 *  401 `{ error, message }` — no session (cookie or Bearer)
 *  403 `{ error, message }` — reporting your own listing
 *  404 `{ error, message }` — listing does not exist
 *  429 `{ error, message, retryAfterMinutes }` — rate limit (5 reports/user/hour)
 *  503 `{ error, message }` — service role missing, OR `listing_reports` has not
 *            been migrated yet (Postgres 42P01). The message is user-facing
 *            Albanian: the UI shows it verbatim, so keep it friendly.
 *
 * Rules enforced here (never trust the client components):
 *  • auth required — anonymous reports are not accepted;
 *  • self-reports rejected (owner moderation is a lifecycle action, not a report);
 *  • per-user hourly quota, in-memory. Serverless instances are short-lived so
 *    this is a dampener against loops/spam, not a durable quota — the durable
 *    guard is a unique index + the moderation queue (see migration
 *    20260928_host_lifecycle.sql).
 *
 * Schema drift: `listing_reports` is created by a concurrent migration and may
 * not exist yet. Writes try an ordered list of payload shapes so a column-name
 * difference still lands; a genuinely missing table answers 503 with a friendly
 * message rather than a stack trace.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const REPORTS_TABLE = 'listing_reports'
const LISTINGS_TABLE = 'listings'

const UNDEFINED_TABLE = '42P01'
const UNDEFINED_COLUMN = '42703'

const ALLOWED_REASONS = ['spam', 'fraudulent', 'duplicate', 'offensive', 'other'] as const
type ReportReason = (typeof ALLOWED_REASONS)[number]

/** Albanian labels — mirrored in the report UI components. */
const REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam',
  fraudulent: 'Mashtrim / mashtrues',
  duplicate: 'Shpallje e dyfishtë',
  offensive: 'Përmbajtje ofenduese',
  other: 'Tjetër',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_NOTE_LENGTH = 1000
const MIN_OTHER_NOTE_LENGTH = 5

/** Quota: 5 reports per user per rolling hour. */
const RATE_LIMIT_PER_HOUR = 5
const RATE_WINDOW_MS = 60 * 60 * 1000

const REPORTS_UNAVAILABLE_MESSAGE =
  'Sistemi i raportimit është përkohësisht jashtë funksionit. Ju lutemi provoni përsëri më vonë — nëse është urgjente, na shkruani te faqja e kontaktit.'

const DEV = process.env.NODE_ENV !== 'production'

// ── in-memory rolling-window quota ───────────────────────────────────────────
const reportLog = new Map<string, number[]>()
let lastSweep = Date.now()

function sweepStaleEntries(now: number): void {
  if (now - lastSweep < RATE_WINDOW_MS) return
  lastSweep = now
  for (const [key, stamps] of reportLog) {
    const fresh = stamps.filter((t) => now - t < RATE_WINDOW_MS)
    if (fresh.length === 0) reportLog.delete(key)
    else reportLog.set(key, fresh)
  }
}

/** Returns remaining quota info; records the attempt when `consume` is true. */
function checkRateLimit(userId: string, consume: boolean): { allowed: boolean; retryAfterMinutes: number } {
  const now = Date.now()
  sweepStaleEntries(now)
  const stamps = (reportLog.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS)

  if (stamps.length >= RATE_LIMIT_PER_HOUR) {
    const oldest = Math.min(...stamps)
    return { allowed: false, retryAfterMinutes: Math.max(1, Math.ceil((oldest + RATE_WINDOW_MS - now) / 60_000)) }
  }
  if (consume) {
    stamps.push(now)
    reportLog.set(userId, stamps)
  }
  return { allowed: true, retryAfterMinutes: 0 }
}

// ── clients & auth ───────────────────────────────────────────────────────────

function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Session cookie first (web), then `Authorization: Bearer` (Expo app). */
async function resolveUser(request: Request, admin: SupabaseClient | null): Promise<User | null> {
  try {
    const serverSupabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()
    if (user) return user
  } catch {
    // no cookies available — fall through to bearer
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

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status })
}

// ── drift-proof insert ───────────────────────────────────────────────────────

type InsertCandidate = Record<string, unknown>

function buildInsertCandidates(args: {
  listingId: string
  reporterId: string
  reason: ReportReason
  note: string
}): InsertCandidate[] {
  const { listingId, reporterId, reason, note } = args
  return [
    { listing_id: listingId, reporter_id: reporterId, reason, note },
    { listing_id: listingId, reporter_id: reporterId, reason, details: note },
    { listing_id: listingId, reporter_id: reporterId, reason },
    { listing_id: listingId, user_id: reporterId, reason, note },
    { listing_id: listingId, reported_by: reporterId, reason, note },
  ]
}

let preferredInsertCandidate = 0

async function insertReport(
  admin: SupabaseClient,
  args: { listingId: string; reporterId: string; reason: ReportReason; note: string }
): Promise<'inserted' | 'missing_table' | 'failed'> {
  const candidates = buildInsertCandidates(args)
  const order = [
    preferredInsertCandidate,
    ...candidates.map((_, i) => i).filter((i) => i !== preferredInsertCandidate),
  ]

  for (const index of order) {
    const payload = candidates[index]
    if (!payload) continue

    const { error } = await admin.from(REPORTS_TABLE).insert(payload)
    if (!error) {
      preferredInsertCandidate = index
      return 'inserted'
    }
    if (isMissingTable(error)) return 'missing_table'
    if (!isMissingColumn(error)) {
      console.error('[reports] insert failed', error.code, error.message)
      return 'failed'
    }
    if (DEV) console.warn(`[reports] candidate #${index} rejected (42703), trying next shape`)
  }

  console.error('[reports] no insert shape matched listing_reports')
  return 'failed'
}

/**
 * Best-effort "already reported by this user" check. `select('*')` + JS-side
 * matching keeps it drift-proof; any error means "unknown", and we allow the
 * insert (a duplicate row is far less harmful than a rejected honest report).
 */
async function alreadyReported(
  admin: SupabaseClient,
  listingId: string,
  reporterId: string
): Promise<boolean> {
  try {
    const { data, error } = await admin
      .from(REPORTS_TABLE)
      .select('*')
      .eq('listing_id', listingId)
      .limit(200)
    if (error || !data) return false
    return (data as Record<string, unknown>[]).some((row) => {
      const who = row.reporter_id ?? row.user_id ?? row.reported_by
      return typeof who === 'string' && who === reporterId
    })
  } catch {
    return false
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return json(400, { error: 'invalid_json', message: 'Kërkesa nuk u lexua dot.' })
  }

  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return json(400, { error: 'body_must_be_object', message: 'Kërkesë e pavlefshme.' })
  }

  const body = payload as { listingId?: unknown; reason?: unknown; note?: unknown }
  const listingId = typeof body.listingId === 'string' ? body.listingId.trim() : ''
  const reasonRaw = typeof body.reason === 'string' ? body.reason.trim().toLowerCase() : ''
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, MAX_NOTE_LENGTH) : ''

  if (!listingId || !UUID_RE.test(listingId)) {
    return json(400, { error: 'invalid_listing_id', message: 'Shpallja e zgjedhur nuk është e vlefshme.' })
  }
  if (!ALLOWED_REASONS.includes(reasonRaw as ReportReason)) {
    return json(400, { error: 'unknown_reason', message: 'Zgjidhni një arsye të vlefshme për raportimin.' })
  }
  const reason = reasonRaw as ReportReason
  if (reason === 'other' && note.length < MIN_OTHER_NOTE_LENGTH) {
    return json(400, {
      error: 'note_required',
      message: `Për arsyen "${REASON_LABELS.other}" shkruani një shënim të shkurtër (të paktën ${MIN_OTHER_NOTE_LENGTH} karaktere).`,
    })
  }

  const admin = getServiceClient()
  if (!admin) {
    console.error('[reports] SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL not set')
    return json(503, { error: 'reports_unavailable', message: REPORTS_UNAVAILABLE_MESSAGE })
  }

  const user = await resolveUser(request, admin)
  if (!user) {
    return json(401, { error: 'unauthorized', message: 'Duhet të jeni i kyçur për të raportuar një shpallje.' })
  }

  // The listing must exist, and you may not report your own property.
  const { data: listingRow, error: listingError } = await admin
    .from(LISTINGS_TABLE)
    .select('id,user_id')
    .eq('id', listingId)
    .maybeSingle()

  if (listingError) {
    console.error('[reports] listing lookup failed', listingError.code, listingError.message)
    return json(503, { error: 'reports_unavailable', message: REPORTS_UNAVAILABLE_MESSAGE })
  }
  if (!listingRow) {
    return json(404, { error: 'listing_not_found', message: 'Kjo shpallje nuk ekziston më.' })
  }
  if (listingRow.user_id === user.id) {
    return json(403, {
      error: 'own_listing',
      message: 'Nuk mund të raportoni shpalljen tuaj. Përdorni "Postimet e Mia" për ta ndaluar ose fshirë atë.',
    })
  }

  const quota = checkRateLimit(user.id, false)
  if (!quota.allowed) {
    return json(429, {
      error: 'rate_limited',
      message: `Keni arritur limitin prej ${RATE_LIMIT_PER_HOUR} raportimesh në një orë. Provoni përsëri pas rreth ${quota.retryAfterMinutes} minutash.`,
      retryAfterMinutes: quota.retryAfterMinutes,
    })
  }

  if (await alreadyReported(admin, listingId, user.id)) {
    return json(201, {
      success: true,
      duplicate: true,
      message: 'Faleminderit — këtë shpallje e keni raportuar më parë. Ekipi ynë po e shqyrton atë.',
    })
  }

  const outcome = await insertReport(admin, {
    listingId,
    reporterId: user.id,
    reason,
    note,
  })

  if (outcome === 'missing_table') {
    console.error(`[reports] ${REPORTS_TABLE} does not exist yet — apply the migration`)
    return json(503, { error: 'reports_unavailable', message: REPORTS_UNAVAILABLE_MESSAGE })
  }
  if (outcome === 'failed') {
    return json(503, {
      error: 'report_failed',
      message: 'Raportimi nuk u regjistrua dot. Ju lutemi provoni përsëri më vonë.',
    })
  }

  // Only count a quota slot once the report is actually stored.
  checkRateLimit(user.id, true)

  if (DEV) console.debug(`[reports] accepted ${reason} on ${listingId} from ${user.id}`)

  return json(201, {
    success: true,
    message: 'Faleminderit. Raportimi u dërgua te ekipi moderues dhe do të shqyrtohet së shpejti.',
  })
}
