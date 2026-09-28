/**
 * blejepronen — web telemetry client (wave-1 scaffold).
 *
 * Tiny, dependency-free event logger. Call `track(event, props)` from client
 * components; events are buffered and POSTed to `/api/telemetry` in batches of
 * at most {@link TELEMETRY_MAX_BATCH} events or every {@link TELEMETRY_FLUSH_MS}.
 *
 * Design rules:
 *  - Never throws, never blocks the UI, never retries a rejected batch.
 *    Telemetry loss is always preferable to a broken page.
 *  - Bounded memory: the in-flight queue is capped and the oldest events are
 *    dropped first, so a dead endpoint cannot grow the heap.
 *  - Server components / RSC / build time: `track()` only dev-logs and does
 *    not buffer or perform any network I/O (there is no page lifecycle to
 *    flush on, and a build-time fetch would be silently dropped anyway).
 *
 * The authoritative event-name allowlist lives in `app/api/telemetry/route.ts`
 * (route files may only export HTTP handlers + segment config, so it is not
 * re-exported from there). Names accepted today:
 *
 *   app_open, app_background, auth_signup_submit, auth_login_submit,
 *   listing_view, listing_contact_call, listing_contact_message,
 *   search_submit, filter_apply, share_listing, app_error,
 *   telemetry_selftest
 *
 * Nothing is instrumented yet — that happens in a later wave.
 */

/** JSON-safe property bag attached to an event. */
export type TelemetryProps = Record<string, unknown>

/** One buffered event as it is sent over the wire. */
export interface TelemetryEvent {
  /** Event name; must be in the server allowlist or the whole batch is 400'd. */
  event: string
  /** Sanitized, primitive-only properties. */
  props: TelemetryProps
  /** Client-side wall-clock ms since epoch. Informational; the server stamps
   *  its own `created_at`. */
  ts: number
}

/** Request body accepted by `POST /api/telemetry`. */
export interface TelemetryBatch {
  source: TelemetrySource
  events: TelemetryEvent[]
}

/** Which client produced a batch. Stored in `props.source` by the route. */
export type TelemetrySource = 'web' | 'mobile'

/** Endpoint the batches are POSTed to. */
export const TELEMETRY_ENDPOINT = '/api/telemetry'

/** Flush as soon as this many events are queued. */
export const TELEMETRY_MAX_BATCH = 10

/** Flush at least this often, even if the batch is not full. */
export const TELEMETRY_FLUSH_MS = 5_000

/** Hard cap on buffered events; oldest are dropped past this. */
export const TELEMETRY_MAX_QUEUE = 50

/** Per-event property payload cap, in bytes (server enforces 4 KB too). */
const MAX_PROPS_BYTES = 4_096

/** Max keys kept per event. */
const MAX_PROPS_KEYS = 24

/** Max length kept for a string property value. */
const MAX_STRING_VALUE = 256

/** Abort a stuck flush after this long. */
const FLUSH_TIMEOUT_MS = 10_000

const DEV = process.env.NODE_ENV !== 'production'
const IS_BROWSER = typeof window !== 'undefined'

/**
 * Counters exposed through {@link runTelemetrySelfTest}. Kept module-level so a
 * single client instance accumulates them across the page lifetime.
 */
export interface TelemetryStats {
  /** True when dev logging is on. */
  dev: boolean
  /** True when running in a browser (i.e. batching + network are active). */
  browser: boolean
  /** Events currently buffered, waiting for the next flush. */
  queued: number
  /** Events the endpoint accepted (2xx) since page load. */
  sent: number
  /** Events discarded since page load (rejected, oversized, queue overflow). */
  dropped: number
  /** Number of batches POSTed since page load. */
  flushes: number
  /** Last failure reason, or `null` when everything has succeeded. */
  lastError: string | null
  /** Endpoint batches are POSTed to. */
  endpoint: string
}

let queue: TelemetryEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let flushing = false
let listenersAttached = false

let sent = 0
let dropped = 0
let flushes = 0
let lastError: string | null = null

function devLog(message: string, detail?: unknown): void {
  if (!DEV) return
  if (detail === undefined) console.debug(`[telemetry] ${message}`)
  else console.debug(`[telemetry] ${message}`, detail)
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

/**
 * Reduce an arbitrary props bag to a flat, JSON-safe, size-bounded object.
 * Nested structures are JSON-stringified so cycles cannot reach `JSON.stringify`
 * during the flush, and oversized values are truncated rather than dropped.
 */
function sanitizeProps(props: TelemetryProps | undefined): TelemetryProps {
  if (!props || typeof props !== 'object') return {}

  const out: TelemetryProps = {}
  let keys = 0

  for (const [key, value] of Object.entries(props)) {
    if (keys >= MAX_PROPS_KEYS) break
    if (value === undefined) continue

    if (value === null) {
      out[key] = null
      keys++
      continue
    }

    if (typeof value === 'boolean') {
      out[key] = value
      keys++
      continue
    }

    if (typeof value === 'number') {
      // NaN/Infinity are not representable in JSON — normalize to null.
      out[key] = Number.isFinite(value) ? value : null
      keys++
      continue
    }

    if (typeof value === 'string') {
      out[key] = value.length > MAX_STRING_VALUE ? `${value.slice(0, MAX_STRING_VALUE)}…` : value
      keys++
      continue
    }

    // Arrays / objects: serialize defensively; skip anything unserializable.
    try {
      const encoded = JSON.stringify(value)
      if (typeof encoded !== 'string') continue
      out[key] =
        encoded.length > MAX_STRING_VALUE ? `${encoded.slice(0, MAX_STRING_VALUE)}…` : encoded
      keys++
    } catch {
      devLog('dropped unserializable prop', key)
    }
  }

  try {
    if (byteLength(JSON.stringify(out)) > MAX_PROPS_BYTES) {
      devLog('props payload over cap, dropping all props for event')
      return {}
    }
  } catch {
    return {}
  }

  return out
}

function clearTimer(): void {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

function scheduleFlush(): void {
  if (timer !== null || flushing) return
  timer = setTimeout(() => {
    timer = null
    void flushTelemetry()
  }, TELEMETRY_FLUSH_MS)
}

/** Attach page-lifecycle flush hooks once, lazily, on the first browser track(). */
function attachLifecycleFlush(): void {
  if (listenersAttached || !IS_BROWSER) return
  listenersAttached = true

  const onHidden = () => {
    if (document.visibilityState === 'hidden') void flushTelemetry()
  }

  try {
    document.addEventListener('visibilitychange', onHidden, { passive: true })
    window.addEventListener('pagehide', () => void flushTelemetry(), { passive: true })
  } catch (err) {
    devLog('could not attach lifecycle flush hooks', err)
  }
}

/**
 * Record a telemetry event.
 *
 * Fire-and-forget: returns immediately, never throws. In the browser the event
 * is buffered until the batch is full or {@link TELEMETRY_FLUSH_MS} elapses.
 * Outside the browser it only dev-logs.
 */
export function track(event: string, props?: TelemetryProps): void {
  if (typeof event !== 'string' || event.trim().length === 0) {
    devLog('ignored track() with an empty event name')
    return
  }

  const entry: TelemetryEvent = {
    event: event.trim(),
    props: sanitizeProps(props),
    ts: Date.now(),
  }

  devLog('track', entry)

  if (!IS_BROWSER) {
    // Server component / build time: log only, never buffer or POST.
    return
  }

  attachLifecycleFlush()

  queue.push(entry)
  if (queue.length > TELEMETRY_MAX_QUEUE) {
    const overflow = queue.length - TELEMETRY_MAX_QUEUE
    queue.splice(0, overflow)
    dropped += overflow
    devLog(`queue overflow, dropped ${overflow} oldest event(s)`)
  }

  if (queue.length >= TELEMETRY_MAX_BATCH) {
    void flushTelemetry()
    return
  }

  scheduleFlush()
}

/**
 * Send the buffered batch now. Resolves with the number of events that were
 * handed to the endpoint (0 when nothing was queued or a flush is in flight).
 *
 * Failures are swallowed and counted — a rejected batch is dropped, not
 * retried, so telemetry can never become a request loop.
 */
export async function flushTelemetry(): Promise<number> {
  if (!IS_BROWSER) return 0
  if (flushing || queue.length === 0) return 0

  const batch = queue
  queue = []
  clearTimer()
  flushing = true

  const body: TelemetryBatch = { source: 'web', events: batch }

  try {
    const controller = new AbortController()
    const abortTimer = setTimeout(() => controller.abort(), FLUSH_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(TELEMETRY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        // Survive navigation/tab-close flushes.
        keepalive: true,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(abortTimer)
    }

    flushes += 1

    if (response.ok || response.status === 204) {
      sent += batch.length
      lastError = null
      devLog(`flushed ${batch.length} event(s)`)
    } else {
      dropped += batch.length
      lastError = `HTTP ${response.status}`
      devLog(`flush rejected with HTTP ${response.status}, dropped ${batch.length} event(s)`)
    }
  } catch (err) {
    flushes += 1
    dropped += batch.length
    lastError = err instanceof Error ? err.message : String(err)
    devLog(`flush failed, dropped ${batch.length} event(s)`, err)
  } finally {
    flushing = false
    // Events tracked while the POST was in flight still need a flush.
    if (queue.length > 0) scheduleFlush()
  }

  return batch.length
}

/** Snapshot of the client counters — safe to call anywhere, has no side effects. */
export function getTelemetryStats(): TelemetryStats {
  return {
    dev: DEV,
    browser: IS_BROWSER,
    queued: queue.length,
    sent,
    dropped,
    flushes,
    lastError,
    endpoint: TELEMETRY_ENDPOINT,
  }
}

/** Result of {@link runTelemetrySelfTest}. */
export interface TelemetrySelfTestResult extends TelemetryStats {
  /** True when the round trip reached the endpoint and it answered 2xx/204. */
  ok: boolean
  /** True when the test could only dev-log (server-side execution). */
  skipped: boolean
  /** Human-readable one-line verdict, handy to paste into a bug report. */
  verdict: string
}

/**
 * Self-test for the telemetry pipeline. Not wired into any UI — call it from the
 * browser console (`await (await import('@/lib/telemetry')).runTelemetrySelfTest()`)
 * or from a temporary dev button when instrumenting screens in a later wave.
 *
 * Emits one `telemetry_selftest` event, forces an immediate flush, and reports
 * the counters so you can tell "nothing was tracked" apart from "the endpoint
 * rejected us".
 */
export async function runTelemetrySelfTest(): Promise<TelemetrySelfTestResult> {
  track('telemetry_selftest', {
    origin: IS_BROWSER ? 'browser' : 'server',
    at: new Date().toISOString(),
  })

  if (!IS_BROWSER) {
    const stats = getTelemetryStats()
    return {
      ...stats,
      ok: false,
      skipped: true,
      verdict:
        'skipped — telemetry only batches and POSTs in the browser; server-side track() just dev-logs.',
    }
  }

  await flushTelemetry()

  const stats = getTelemetryStats()
  const ok = stats.lastError === null && stats.sent > 0
  return {
    ...stats,
    ok,
    skipped: false,
    verdict: ok
      ? `ok — ${stats.sent} event(s) accepted by ${stats.endpoint}.`
      : `failed — ${stats.dropped} event(s) dropped; last error: ${stats.lastError ?? 'unknown'}.`,
  }
}
