/**
 * Server-only auth security helpers (audit findings C1–C4).
 *
 * Imported ONLY by Node-runtime route handlers. It pulls in `node:crypto` and
 * reads the service-role key, so it must never be imported from a client
 * component or from `lib/supabase.ts` (which client components do import).
 *
 * What lives here:
 *  - CSPRNG OTP generation (replaces `Math.random()`).
 *  - Durable per-user OTP lockout state in `auth.users.user_metadata`
 *    (replaces the per-instance in-memory `Map` that a horizontal scale-out or
 *    a cold start wiped — audit finding C3).
 *  - Email → user resolution that prefers an indexed `profiles.email` lookup
 *    and only falls back to a paginated `auth.admin.listUsers()` scan, with a
 *    short-TTL cache (replaces the unconditional `listUsers({perPage: 1000})`
 *    full-directory fetch — audit finding C2).
 *  - Uniform Albanian response copy so no endpoint leaks whether an address is
 *    registered, confirmed, locked or throttled.
 */
import { randomInt, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient, User } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Email helpers
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 254

export function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

export function isValidEmail(email: string): boolean {
  return email.length > 0 && email.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(email)
}

// ---------------------------------------------------------------------------
// OTP generation / comparison
// ---------------------------------------------------------------------------

/**
 * Six-digit code from a CSPRNG. `crypto.randomInt` is unbiased (it rejects
 * modulo-skewed draws internally), unlike `Math.floor(Math.random() * 900000)`.
 */
export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** Length-safe constant-time comparison for short secrets (OTP codes). */
export function safeCodeEqual(provided: unknown, expected: unknown): boolean {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false
  if (provided.length === 0 || expected.length === 0) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return provided === expected
  }
}

// ---------------------------------------------------------------------------
// Admin client
// ---------------------------------------------------------------------------

export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Supabase admin environment variables are not configured')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ---------------------------------------------------------------------------
// Live-schema drift tolerance
// ---------------------------------------------------------------------------

type PostgrestErrorLike = { code?: string; message?: string } | null | undefined

/** True when a query failed because the live schema lacks the column/table. */
export function isMissingSchemaError(error: PostgrestErrorLike): boolean {
  if (!error) return false
  // 42703 undefined_column, 42P01 undefined_table, 42883 undefined_function
  if (error.code === '42703' || error.code === '42P01' || error.code === '42883') return true
  const message = (error.message || '').toLowerCase()
  return (
    message.includes('could not find the') ||
    message.includes('does not exist') ||
    message.includes('undefined_column') ||
    message.includes('undefined_table')
  )
}

/** True when a query failed because RLS/grants hide the relation from anon. */
export function isPermissionError(error: PostgrestErrorLike): boolean {
  if (!error) return false
  if (error.code === '42501') return true
  const message = (error.message || '').toLowerCase()
  return message.includes('permission denied') || message.includes('row-level security')
}

// ---------------------------------------------------------------------------
// Email → user resolution (indexed lookup first, bounded scan as fallback)
// ---------------------------------------------------------------------------

const POSITIVE_CACHE_TTL_MS = 5 * 60 * 1000
const NEGATIVE_CACHE_TTL_MS = 20 * 1000
const EMAIL_CACHE_MAX_ENTRIES = 5_000
const LIST_USERS_PAGE_SIZE = 1_000
const LIST_USERS_MAX_PAGES = 25

type EmailCacheEntry = { userId: string | null; expiresAt: number }

/**
 * Module-level cache. Only the *id* is cached — never the user object — so
 * `user_metadata` (which carries the OTP lockout counters) is always re-read
 * fresh from GoTrue.
 */
const emailIdCache = new Map<string, EmailCacheEntry>()

function readEmailCache(email: string): string | null | undefined {
  const entry = emailIdCache.get(email)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    emailIdCache.delete(email)
    return undefined
  }
  return entry.userId
}

function writeEmailCache(email: string, userId: string | null) {
  if (emailIdCache.size >= EMAIL_CACHE_MAX_ENTRIES) {
    const oldest = emailIdCache.keys().next().value
    if (oldest !== undefined) emailIdCache.delete(oldest)
  }
  emailIdCache.set(email, {
    userId,
    expiresAt: Date.now() + (userId ? POSITIVE_CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS),
  })
}

/** Call after creating/updating an account so a stale miss cannot win. */
export function invalidateEmailCache(email: string) {
  emailIdCache.delete(normalizeEmail(email))
}

/**
 * Resolves an auth user id from `profiles.email` (added by
 * `supabase/migrations/20260928_001_profiles_email_unique.sql`).
 *
 * Returns `null` when the indexed column is usable but has no row, and
 * `'unavailable'` when the live schema does not have the column yet — the
 * caller must then fall back to the bounded directory scan.
 */
async function lookupIdViaProfiles(
  admin: SupabaseClient,
  email: string
): Promise<string | null | 'unavailable'> {
  try {
    const { data, error } = await admin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .limit(1)
      .maybeSingle()

    if (error) {
      if (isMissingSchemaError(error) || isPermissionError(error)) return 'unavailable'
      console.error('profiles.email lookup error:', error.message)
      return 'unavailable'
    }

    const row = data as { id?: string | null } | null
    return typeof row?.id === 'string' && row.id ? row.id : null
  } catch (err) {
    console.error('profiles.email lookup threw:', err)
    return 'unavailable'
  }
}

/**
 * Bounded replacement for `listUsers({ page: 1, perPage: 1000 })`.
 *
 * Pages through the directory and exits as soon as the address is found or the
 * last page is reached, instead of always fetching a thousand user records and
 * scanning them in JS.
 */
async function scanDirectoryForEmail(
  admin: SupabaseClient,
  email: string
): Promise<User | null> {
  for (let page = 1; page <= LIST_USERS_MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: LIST_USERS_PAGE_SIZE,
    })

    if (error) {
      console.error('listUsers fallback error:', error.message)
      return null
    }

    const users = data?.users ?? []
    const hit = users.find((u) => (u.email || '').toLowerCase() === email)
    if (hit) return hit
    if (users.length < LIST_USERS_PAGE_SIZE) break // early exit: final page
  }
  return null
}

/**
 * Finds an auth user by email address.
 *
 * Order: module cache → indexed `profiles.email` → bounded `listUsers` scan.
 * Always returns a freshly fetched `User` (fresh `user_metadata`) or `null`.
 */
export async function findAuthUserByEmail(
  admin: SupabaseClient,
  rawEmail: unknown
): Promise<User | null> {
  const email = normalizeEmail(rawEmail)
  if (!isValidEmail(email)) return null

  const cached = readEmailCache(email)
  if (cached === null) return null

  if (cached) {
    const { data, error } = await admin.auth.admin.getUserById(cached)
    if (!error && data?.user) return data.user
    // Id vanished (deleted account) — drop the entry and fall through.
    emailIdCache.delete(email)
  }

  const viaProfiles = await lookupIdViaProfiles(admin, email)
  if (typeof viaProfiles === 'string') {
    const { data, error } = await admin.auth.admin.getUserById(viaProfiles)
    if (!error && data?.user) {
      writeEmailCache(email, data.user.id)
      return data.user
    }
  }

  // `null` from profiles means "column exists, no row". The backfill may not
  // have run yet, so the directory scan still has to confirm absence.
  const scanned = await scanDirectoryForEmail(admin, email)
  writeEmailCache(email, scanned?.id ?? null)
  return scanned
}

// ---------------------------------------------------------------------------
// Durable OTP lockout + send throttling (auth user_metadata)
// ---------------------------------------------------------------------------

export const OTP_MAX_ATTEMPTS = 5
export const OTP_LOCKOUT_MS = 15 * 60 * 1000
/** Lifetime of an issued verification code (kept in sync with the email copy). */
export const OTP_TTL_MS = 10 * 60 * 1000
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000
export const OTP_RESEND_HOURLY_LIMIT = 5
export const OTP_SEND_WINDOW_MS = 60 * 60 * 1000

export interface OtpState {
  failCount: number
  lockedUntil: number | null
  sendCount: number
  lastSentAt: number | null
}

function toTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime()
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function toCount(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/** Reads lockout/throttle counters out of `user_metadata`, expiring stale ones. */
export function readOtpState(user: User | null | undefined): OtpState {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
  const now = Date.now()

  const lockedUntilRaw = toTimestamp(meta.otp_locked_until)
  const lockedUntil = lockedUntilRaw !== null && lockedUntilRaw > now ? lockedUntilRaw : null

  const lastSentRaw = toTimestamp(meta.otp_last_sent_at)
  const lastSentAt =
    lastSentRaw !== null && now - lastSentRaw <= OTP_SEND_WINDOW_MS ? lastSentRaw : null

  return {
    failCount: lockedUntil ? toCount(meta.otp_fail_count) : 0,
    lockedUntil,
    sendCount: lastSentAt ? toCount(meta.otp_send_count) : 0,
    lastSentAt,
  }
}

export function isLocked(state: OtpState): boolean {
  return state.lockedUntil !== null && state.lockedUntil > Date.now()
}

/**
 * Persists a metadata patch.
 *
 * Existing metadata is always spread in first: GoTrue's admin update replaces
 * `user_metadata` wholesale on some versions, and a bare patch would otherwise
 * wipe `account_type` / `company_name` / `onboarding_completed`.
 * Never throws — OTP throttling must not take down verification.
 */
export async function patchUserMetadata(
  admin: SupabaseClient,
  user: User,
  patch: Record<string, unknown>
): Promise<User | null> {
  try {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata || {}), ...patch },
    })
    if (error) {
      console.error('patchUserMetadata error:', error.message)
      return null
    }
    return data?.user ?? null
  } catch (err) {
    console.error('patchUserMetadata threw:', err)
    return null
  }
}

/** Registers a failed OTP attempt; returns the fresh state (lock applied at the limit). */
export async function recordOtpFailure(
  admin: SupabaseClient,
  user: User
): Promise<{ state: OtpState; justLocked: boolean }> {
  const current = readOtpState(user)
  const failCount = current.failCount + 1
  const justLocked = failCount >= OTP_MAX_ATTEMPTS
  const lockedUntil = justLocked ? Date.now() + OTP_LOCKOUT_MS : null

  const next: OtpState = {
    failCount,
    lockedUntil,
    sendCount: current.sendCount,
    lastSentAt: current.lastSentAt,
  }

  // The stored counter resets when the lock engages so the next window starts
  // clean; `lockedUntil` is the authoritative signal until it expires.
  await patchUserMetadata(admin, user, {
    otp_fail_count: justLocked ? 0 : failCount,
    otp_locked_until: lockedUntil,
  })

  return { state: next, justLocked }
}

/** Clears counters after a successful verification. */
export async function clearOtpCounters(admin: SupabaseClient, user: User): Promise<void> {
  await patchUserMetadata(admin, user, { otp_fail_count: 0, otp_locked_until: null })
}

/**
 * Records a dispatched OTP email and reports whether the send budget was
 * exceeded. `cooldownRemainingMs` / `hourlyExhausted` let the caller return the
 * same response it would return for an unknown address (no enumeration oracle).
 */
export function evaluateSendBudget(state: OtpState): {
  allowed: boolean
  cooldownRemainingMs: number
  hourlyExhausted: boolean
} {
  const now = Date.now()
  const cooldownRemainingMs =
    state.lastSentAt !== null
      ? Math.max(0, state.lastSentAt + OTP_RESEND_COOLDOWN_MS - now)
      : 0

  if (cooldownRemainingMs > 0) {
    return { allowed: false, cooldownRemainingMs, hourlyExhausted: false }
  }
  if (state.sendCount >= OTP_RESEND_HOURLY_LIMIT) {
    return { allowed: false, cooldownRemainingMs: 0, hourlyExhausted: true }
  }
  return { allowed: true, cooldownRemainingMs: 0, hourlyExhausted: false }
}

export async function recordOtpSend(
  admin: SupabaseClient,
  user: User,
  state: OtpState
): Promise<void> {
  await patchUserMetadata(admin, user, {
    otp_send_count: state.sendCount + 1,
    otp_last_sent_at: Date.now(),
  })
}

// ---------------------------------------------------------------------------
// Phantom state for unknown addresses
// ---------------------------------------------------------------------------
//
// Uniform responses only hold if an address that does NOT exist behaves like
// one that does: same cooldown, same lockout after the same number of failures.
// There is no user row to hang durable state on, so unknown addresses get a
// bounded in-memory shadow. Best effort (a cold start clears it) but it removes
// the cheap timing/behaviour oracle.

const PHANTOM_TTL_MS = OTP_LOCKOUT_MS
const PHANTOM_MAX_ENTRIES = 2_000

interface PhantomEntry {
  failCount: number
  lockedUntil: number | null
  lastSentAt: number | null
  sendCount: number
  expiresAt: number
}

const phantomState = new Map<string, PhantomEntry>()

function prunePhantom() {
  if (phantomState.size < PHANTOM_MAX_ENTRIES) return
  const now = Date.now()
  for (const [key, entry] of phantomState) {
    if (entry.expiresAt <= now) phantomState.delete(key)
  }
  while (phantomState.size >= PHANTOM_MAX_ENTRIES) {
    const oldest = phantomState.keys().next().value
    if (oldest === undefined) break
    phantomState.delete(oldest)
  }
}

function getPhantom(email: string): PhantomEntry {
  const existing = phantomState.get(email)
  if (existing && existing.expiresAt > Date.now()) return existing
  return { failCount: 0, lockedUntil: null, lastSentAt: null, sendCount: 0, expiresAt: 0 }
}

/** Mirrors `readOtpState` for an address with no account. */
export function readPhantomOtpState(rawEmail: unknown): OtpState {
  const entry = getPhantom(normalizeEmail(rawEmail))
  const now = Date.now()
  return {
    failCount: entry.lockedUntil && entry.lockedUntil > now ? 0 : entry.failCount,
    lockedUntil: entry.lockedUntil && entry.lockedUntil > now ? entry.lockedUntil : null,
    sendCount: entry.sendCount,
    lastSentAt: entry.lastSentAt,
  }
}

export function recordPhantomFailure(rawEmail: unknown): { justLocked: boolean } {
  const email = normalizeEmail(rawEmail)
  prunePhantom()
  const entry = getPhantom(email)
  const failCount = entry.failCount + 1
  const justLocked = failCount >= OTP_MAX_ATTEMPTS
  phantomState.set(email, {
    failCount: justLocked ? 0 : failCount,
    lockedUntil: justLocked ? Date.now() + OTP_LOCKOUT_MS : null,
    lastSentAt: entry.lastSentAt,
    sendCount: entry.sendCount,
    expiresAt: Date.now() + PHANTOM_TTL_MS,
  })
  return { justLocked }
}

export function recordPhantomSend(rawEmail: unknown): void {
  const email = normalizeEmail(rawEmail)
  prunePhantom()
  const entry = getPhantom(email)
  phantomState.set(email, {
    ...entry,
    sendCount: entry.sendCount + 1,
    lastSentAt: Date.now(),
    expiresAt: Date.now() + PHANTOM_TTL_MS,
  })
}

// ---------------------------------------------------------------------------
// Per-IP request budget (coarse abuse brake; not a substitute for the above)
// ---------------------------------------------------------------------------

const IP_BUDGET_TTL_MS = 60 * 60 * 1000
const IP_BUDGET_MAX_ENTRIES = 5_000
const ipBudget = new Map<string, { count: number; windowStart: number }>()

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  // Vercel prepends the client-supplied value; the LAST hop is the edge's.
  if (forwarded) return forwarded.split(',').pop()?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

/**
 * Consumes one unit of a per-key hourly budget. Returns false when exhausted.
 */
export function consumeRequestBudget(key: string, limit: number): boolean {
  const now = Date.now()
  if (ipBudget.size >= IP_BUDGET_MAX_ENTRIES) {
    for (const [k, v] of ipBudget) {
      if (now - v.windowStart > IP_BUDGET_TTL_MS) ipBudget.delete(k)
    }
  }
  const entry = ipBudget.get(key)
  if (!entry || now - entry.windowStart > IP_BUDGET_TTL_MS) {
    ipBudget.set(key, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= limit) return false
  entry.count += 1
  return true
}

// ---------------------------------------------------------------------------
// Uniform response copy (Albanian)
// ---------------------------------------------------------------------------

/**
 * One message per *class* of outcome, never per account state. Nothing here may
 * distinguish "unknown address" from "known but confirmed", "locked" or
 * "throttled".
 */
export const AUTH_COPY = {
  invalidEmail: 'Shkruani një adresë email-i të vlefshme.',
  weakPassword: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.',
  companyRequired: 'Emri i kompanisë është i detyrueshëm.',
  /** Any signup that cannot proceed because the address is already in use. */
  signupBlocked:
    'Nuk mundëm ta vazhdojmë regjistrimin me këto të dhëna. Nëse keni llogari, hyni në të ose përdorni "Keni harruar fjalëkalimin?".',
  signupSuccess: 'Kodi i verifikimit u dërgua me sukses.',
  /** Wrong code, expired code, unknown address and missing profile all look identical. */
  otpInvalid: 'Kodi është i gabuar ose ka skaduar. Kërkoni një kod të ri nëse është e nevojshme.',
  otpLocked: 'Shumë përpjekje të dështuara. Për siguri, prisni 15 minuta dhe provoni përsëri.',
  otpVerified: 'Email-i u konfirmua me sukses!',
  resendSuccess: 'Kodi u ridërgua me sukses.',
  resendCooldown: (seconds: number) =>
    `Ju lutemi prisni ${seconds} sekonda para se të kërkoni një kod të ri.`,
  rateLimited: 'Shumë kërkesa. Ju lutemi provoni përsëri më vonë.',
  serverError: 'Gabim i brendshëm i serverit.',
  networkError: 'Gabim në lidhje me serverin. Ju lutemi provoni përsëri.',
} as const

/** Resend delivery uses this shared branded shell (Bleje Pronën house style). */
export function otpEmailHtml(code: string, heading: string, intro: string, title: string): string {
  return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #F2F7F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F2F7F7; padding: 40px 16px;">
              <tr>
                <td align="center">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); border: 1px solid #E5E7EB;">
                    <tr>
                      <td style="background-color: #00675B; padding: 32px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Bleje Pronën</h1>
                        <p style="margin: 6px 0 0; color: rgba(255, 255, 255, 0.8); font-size: 13px; font-weight: 500;">${heading}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 36px 32px; text-align: center;">
                        <p style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #101828;">${intro}</p>
                        <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #4B5563;">
                          Përdorni kodin e mëposhtëm 6-shifror për të verifikuar llogarinë tuaj:
                        </p>
                        <div style="margin: 0 auto 28px; display: inline-block; background-color: #F2F7F7; border: 2px dashed #00675B; border-radius: 14px; padding: 16px 36px;">
                          <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #00675B;">
                            ${code}
                          </span>
                        </div>
                        <p style="margin: 0; font-size: 13px; color: #6B7280;">
                          Ky kod skadon pas <strong>10 minutash</strong>.
                        </p>
                        <hr style="margin: 32px 0; border: none; border-top: 1px solid #F3F4F6;" />
                        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9CA3AF;">
                          Nëse nuk e keni kërkuar ju këtë kod, ju lutemi ta injoroni këtë email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
}

/** Sends the OTP mail through Resend. Returns true on accepted delivery. */
export async function sendOtpEmail(
  to: string,
  code: string,
  subject: string,
  html: string
): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.error('RESEND_API_KEY is not set')
    return false
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Bleje Pronën <noreply@blejepronen.com>',
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    console.error('Resend email send error:', res.status, await res.text())
    return false
  }
  return true
}
