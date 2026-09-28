import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/telemetry — ingest for the batched event loggers in
 * `lib/telemetry.ts` (web) and `mobile/lib/telemetry.ts` (Expo).
 *
 * Contract
 * --------
 * Body: `{ source: 'web' | 'mobile', events: [{ event, props?, ts? }] }`
 *  - max 10 events per batch (matches the client flush threshold)
 *  - every `event` must be in {@link ALLOWED_EVENTS}; one unknown name rejects
 *    the whole batch with 400 so typos surface immediately instead of silently
 *    poisoning the funnel numbers
 *  - total body must be <= 32 KB
 *  - each `props` object must serialize to <= 4 KB
 *
 * Responses
 * ---------
 *  200 `{ accepted, rejected }` — inserted
 *  204 (empty)                  — `telemetry_events` does not exist yet
 *                                 (Postgres 42P01): the batch is dropped, not
 *                                 an error, so the migration can lag the deploy
 *  400 `{ error }`              — malformed / unknown event / oversized props
 *  413 `{ error }`              — body over 32 KB
 *  503 `{ error }`              — service-role key not configured
 *  500 `{ error }`              — unexpected database failure
 *
 * Writes go through the service-role client only: `telemetry_events` has RLS
 * enabled with zero policies, so anon/authenticated can neither read nor write
 * it (see supabase/migrations/20260928_telemetry.sql).
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TABLE = 'telemetry_events'

/** Postgres `undefined_table` — table not created yet. */
const UNDEFINED_TABLE = '42P01'

/** Hard body cap: 32 KB. */
const MAX_BODY_BYTES = 32 * 1024

/** Max events accepted per batch. */
const MAX_BATCH_EVENTS = 10

/** Max serialized size of a single event's `props`. */
const MAX_PROPS_BYTES = 4 * 1024

/** Max length of an event name. */
const MAX_EVENT_NAME_LENGTH = 64

/**
 * Allowlist of event names the ingest accepts. Keep this in sync with the list
 * documented at the top of `lib/telemetry.ts` and `mobile/lib/telemetry.ts`.
 *
 * Deliberately not exported: App Router route files may only export HTTP
 * handlers and route-segment config, and an extra export fails `next build`'s
 * generated route type check.
 */
const ALLOWED_EVENTS = [
  'app_open',
  'app_background',
  'auth_signup_submit',
  'auth_login_submit',
  'listing_view',
  'listing_contact_call',
  'listing_contact_message',
  'search_submit',
  'filter_apply',
  'share_listing',
  'app_error',
  'telemetry_selftest',
] as const

const ALLOWED = new Set<string>(ALLOWED_EVENTS)

type Source = 'web' | 'mobile'

interface TelemetryRow {
  event: string
  props: Record<string, unknown>
}

const DEV = process.env.NODE_ENV !== 'production'

function badRequest(reason: string, detail?: string) {
  return NextResponse.json(
    { error: 'invalid_telemetry_payload', reason, ...(detail ? { detail } : {}) },
    { status: 400 }
  )
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

/** True for `{}`-style plain objects only — rejects arrays, null and class-ish values. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Service-role client. There is deliberately no anon fallback: with RLS enabled
 * and zero policies an anon insert would always fail, and a silent fallback
 * would turn "misconfigured secret" into "mysteriously empty telemetry table".
 */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function parseSource(value: unknown): Source | null {
  return value === 'web' || value === 'mobile' ? value : null
}

export async function POST(request: Request) {
  // Cheap pre-flight reject before the body is ever read into memory.
  const declared = Number.parseInt(request.headers.get('content-length') ?? '', 10)
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'payload_too_large', limitBytes: MAX_BODY_BYTES },
      { status: 413 }
    )
  }

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return badRequest('unreadable_body')
  }

  if (raw.length === 0) return badRequest('empty_body')
  if (byteLength(raw) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'payload_too_large', limitBytes: MAX_BODY_BYTES },
      { status: 413 }
    )
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return badRequest('invalid_json')
  }

  if (!isPlainObject(payload)) return badRequest('body_must_be_object')

  const source = parseSource(payload.source)
  if (!source) return badRequest('invalid_source')

  const events = payload.events
  if (!Array.isArray(events) || events.length === 0) return badRequest('events_must_be_nonempty_array')
  if (events.length > MAX_BATCH_EVENTS) {
    return badRequest('too_many_events', `max ${MAX_BATCH_EVENTS} per batch`)
  }

  const rows: TelemetryRow[] = []
  for (const item of events) {
    if (!isPlainObject(item)) return badRequest('event_must_be_object')

    const event = item.event
    if (typeof event !== 'string' || event.trim().length === 0) {
      return badRequest('event_name_must_be_string')
    }
    if (event.length > MAX_EVENT_NAME_LENGTH) {
      return badRequest('event_name_too_long')
    }
    if (!ALLOWED.has(event)) {
      return badRequest('unknown_event', event)
    }

    let props: Record<string, unknown> = {}
    if (item.props !== undefined) {
      if (!isPlainObject(item.props)) return badRequest('props_must_be_object', event)
      try {
        if (byteLength(JSON.stringify(item.props)) > MAX_PROPS_BYTES) {
          return badRequest('props_too_large', event)
        }
      } catch {
        return badRequest('props_not_serializable', event)
      }
      props = item.props
    }

    // `source` is server-derived and spread last so a client cannot spoof it.
    rows.push({ event, props: { ...props, source } })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    console.error('[telemetry] SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL not set')
    return NextResponse.json({ error: 'telemetry_unavailable' }, { status: 503 })
  }

  const { error } = await supabase.from(TABLE).insert(rows)

  if (error) {
    const missingTable =
      error.code === UNDEFINED_TABLE ||
      /relation .* does not exist|Could not find the table/i.test(error.message ?? '')

    if (missingTable) {
      // Migration not applied yet — acknowledge and drop, never error the client.
      if (DEV) console.warn(`[telemetry] ${TABLE} missing, dropped ${rows.length} event(s)`)
      return new NextResponse(null, { status: 204 })
    }

    console.error('[telemetry] insert failed', error.code, error.message)
    return NextResponse.json({ error: 'telemetry_insert_failed' }, { status: 500 })
  }

  if (DEV) console.debug(`[telemetry] accepted ${rows.length} event(s) from ${source}`)

  return NextResponse.json({ accepted: rows.length, rejected: 0 })
}
