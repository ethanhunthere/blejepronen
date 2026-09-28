import { AppState, Platform } from 'react-native'

/**
 * blejepronen — Expo/RN telemetry client (wave-1 scaffold).
 *
 * Mirror of the web logger in `lib/telemetry.ts`: call `track(event, props)`
 * from any component or lib module and events are buffered, then POSTed to the
 * web app's `/api/telemetry` in batches of at most {@link TELEMETRY_MAX_BATCH}
 * events or every {@link TELEMETRY_FLUSH_MS}.
 *
 * Design rules:
 *  - Never throws, never blocks the JS thread, never retries a rejected batch.
 *    Telemetry loss is always preferable to a degraded app.
 *  - Bounded memory: the queue is capped, oldest events are dropped first.
 *  - Mobile-specific: the app can be killed at any moment, so the batch is also
 *    flushed when React Native reports the app leaving the foreground.
 *  - No dependency on any other module in `mobile/lib/` — the shared-contract
 *    import sweep happens in a later wave, so this file is intentionally
 *    self-contained. The endpoint mirrors `API_BASE_URL` in `mobile/lib/api.ts`.
 *
 * The authoritative event-name allowlist lives in the web route
 * `app/api/telemetry/route.ts`. Names accepted today:
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

/** Absolute ingest endpoint. Same origin as `API_BASE_URL` in `mobile/lib/api.ts`. */
export const TELEMETRY_API_BASE_URL = 'https://blejepronen.com'

/** Endpoint batches are POSTed to. */
export const TELEMETRY_ENDPOINT = `${TELEMETRY_API_BASE_URL}/api/telemetry`

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

/** Counters exposed through {@link runTelemetrySelfTest}. */
export interface TelemetryStats {
  /** True when dev logging is on (Metro `__DEV__`). */
  dev: boolean
  /** Always true in the app bundle; present for parity with the web logger. */
  enabled: boolean
  /** Events currently buffered, waiting for the next flush. */
  queued: number
  /** Events the endpoint accepted (2xx/204) since app start. */
  sent: number
  /** Events discarded since app start (rejected, oversized, queue overflow). */
  dropped: number
  /** Number of batches POSTed since app start. */
  flushes: number
  /** Last failure reason, or `null` when everything has succeeded. */
  lastError: string | null
  /** Endpoint batches are POSTed to. */
  endpoint: string
  /** `Platform.OS` auto-attached to every event. */
  platform: string
}

let queue: TelemetryEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let flushing = false
let appStateHooked = false

let sent = 0
let dropped = 0
let flushes = 0
let lastError: string | null = null

function devLog(message: string, detail?: unknown): void {
  if (!__DEV__) return
  if (detail === undefined) console.debug(`[telemetry] ${message}`)
  else console.debug(`[telemetry] ${message}`, detail)
}

/**
 * Exact UTF-8 byte length without `TextEncoder` (not guaranteed on Hermes).
 * Percent-encoding expands every non-ASCII byte to `%XX`, so counting the
 * escapes yields the real byte count.
 */
function byteLength(value: string): number {
  let encoded: string
  try {
    encoded = encodeURIComponent(value)
  } catch {
    // Lone surrogate or otherwise unencodable — fall back to a char count.
    return value.length
  }

  let bytes = 0
  for (let i = 0; i < encoded.length; i++) {
    if (encoded.charAt(i) === '%') {
      bytes += 1
      i += 2 // skip the two hex digits of this escape
    } else {
      bytes += 1
    }
  }
  return bytes
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

/**
 * Flush when the app leaves the foreground — the last reliable moment before
 * iOS/Android suspends or kills the process. Hooked once, lazily.
 */
function hookAppStateFlush(): void {
  if (appStateHooked) return
  appStateHooked = true

  try {
    AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') void flushTelemetry()
    })
  } catch (err) {
    devLog('could not attach AppState flush hook', err)
  }
}

/**
 * Record a telemetry event.
 *
 * Fire-and-forget: returns immediately, never throws. The event is buffered
 * until the batch is full, {@link TELEMETRY_FLUSH_MS} elapses, or the app
 * leaves the foreground.
 */
export function track(event: string, props?: TelemetryProps): void {
  if (typeof event !== 'string' || event.trim().length === 0) {
    devLog('ignored track() with an empty event name')
    return
  }

  const entry: TelemetryEvent = {
    event: event.trim(),
    // `platform` is a default dimension; explicit props may override it.
    props: { platform: Platform.OS, ...sanitizeProps(props) },
    ts: Date.now(),
  }

  devLog('track', entry)

  hookAppStateFlush()

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
 * Send the buffered batch now. Resolves with the number of events handed to the
 * endpoint (0 when nothing was queued or a flush is already in flight).
 *
 * Failures are swallowed and counted — a rejected batch is dropped, not
 * retried, so telemetry can never become a request loop.
 */
export async function flushTelemetry(): Promise<number> {
  if (flushing || queue.length === 0) return 0

  const batch = queue
  queue = []
  clearTimer()
  flushing = true

  const body: TelemetryBatch = { source: 'mobile', events: batch }

  try {
    const controller = new AbortController()
    const abortTimer = setTimeout(() => controller.abort(), FLUSH_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(TELEMETRY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
    dev: __DEV__,
    enabled: true,
    queued: queue.length,
    sent,
    dropped,
    flushes,
    lastError,
    endpoint: TELEMETRY_ENDPOINT,
    platform: Platform.OS,
  }
}

/** Result of {@link runTelemetrySelfTest}. */
export interface TelemetrySelfTestResult extends TelemetryStats {
  /** True when the round trip reached the endpoint and it answered 2xx/204. */
  ok: boolean
  /** Human-readable one-line verdict, handy to paste into a bug report. */
  verdict: string
}

/**
 * Self-test for the telemetry pipeline. Not wired into any screen — call it from
 * a dev-only affordance (or Metro's debugger console) when instrumenting in a
 * later wave:
 *
 *   const r = await runTelemetrySelfTest(); console.log(r.verdict)
 *
 * Emits one `telemetry_selftest` event, forces an immediate flush, and reports
 * the counters so you can tell "nothing was tracked" apart from "the endpoint
 * rejected us" (400 = unknown event name, 413 = oversized batch,
 * 503 = service-role key missing, 204 = migration not applied yet).
 */
export async function runTelemetrySelfTest(): Promise<TelemetrySelfTestResult> {
  track('telemetry_selftest', {
    origin: 'mobile',
    at: new Date().toISOString(),
  })

  await flushTelemetry()

  const stats = getTelemetryStats()
  const ok = stats.lastError === null && stats.sent > 0
  return {
    ...stats,
    ok,
    verdict: ok
      ? `ok — ${stats.sent} event(s) accepted by ${stats.endpoint}.`
      : `failed — ${stats.dropped} event(s) dropped; last error: ${stats.lastError ?? 'unknown'}.`,
  }
}
