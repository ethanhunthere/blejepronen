/**
 * Trust-signal derivation — SINGLE SOURCE OF TRUTH for host/seller badges.
 *
 * ⚠️ This file is mirrored byte-for-byte at `mobile/lib/verification.ts`.
 *    Change one, change both (the two platforms must never disagree about who
 *    looks "verified", or the same seller shows a badge in the browser and no
 *    badge in the app).
 *
 * SECURITY RULE — badges must ONLY ever come from this function.
 *   • It is pure: no I/O, no auth context, no client state, no self-grant.
 *   • Every input is a *server-owned* column (profiles.email_verified is set by
 *     the OTP verification flow, profiles.phone by the account owner,
 *     profiles.created_at by Postgres). A client cannot promote itself by
 *     passing different numbers in — the caller must feed the row it read.
 *   • Never render a badge from a client-side flag, a query string, localStorage,
 *     a user_metadata blob, or an "isVerified" prop somebody invented. If the
 *     value did not come out of deriveTrustSignals(), it is not a badge.
 *
 * Drift-proof by design: the live `profiles` table does not carry every column
 * this file could theoretically use, so every field is optional and every
 * missing field degrades to the *weakest* signal (never to a stronger badge).
 */

export type TrustLevel = 'basic' | 'verified' | 'trusted'

/**
 * The only shape this module accepts. Deliberately loose (all optional) so a
 * `select('*')` row, a nested PostgREST join, or a hand-built object all work
 * without casting — named column selects are what break on schema drift.
 */
export interface TrustProfileInput {
  email_verified?: boolean | null
  phone?: string | null
  created_at?: string | null
  listings_count?: number | null
}

export interface TrustSignals {
  /** profiles.email_verified === true (OTP confirmed mailbox). */
  emailVerified: boolean
  /** A phone number with enough digits to be callable (>= TRUST_THRESHOLDS.minPhoneDigits). */
  phoneOnFile: boolean
  /** Account older than TRUST_THRESHOLDS.establishedAccountDays. */
  establishedAccount: boolean
  /** Single badge value the UI is allowed to render. */
  level: TrustLevel
}

/**
 * Thresholds are exported so tests/admin tooling can assert on them, and so the
 * two platforms provably share one number set. Do not tweak per-platform.
 */
export const TRUST_THRESHOLDS = {
  /** Account age (days) that counts as "established". */
  establishedAccountDays: 90,
  /** Active/sold listings that can substitute for account age at the trusted tier. */
  trustedListingsCount: 3,
  /** Minimum significant digits for a phone number to count as "on file". */
  minPhoneDigits: 6,
} as const

/** Albanian labels — the only strings the UI should show for a level. */
export const TRUST_LEVEL_LABELS: Record<TrustLevel, string> = {
  basic: 'Bazë',
  verified: 'I verifikuar',
  trusted: 'I besuar',
}

/** Short helper copy explaining what a level means (tooltips, report dialogs). */
export const TRUST_LEVEL_DESCRIPTIONS: Record<TrustLevel, string> = {
  basic: 'Llogari e re — ende pa sinjale identiteti.',
  verified: 'Email ose numër telefoni i konfirmuar.',
  trusted: 'Email + telefon i konfirmuar dhe llogari e vjetër ose shitës aktiv.',
}

/** True when the value is a usable phone number (>= minPhoneDigits digits). */
export function hasPhoneOnFile(phone?: string | null): boolean {
  if (typeof phone !== 'string') return false
  const digits = phone.replace(/\D/g, '')
  return digits.length >= TRUST_THRESHOLDS.minPhoneDigits
}

/**
 * Account age in whole days, or null when created_at is missing/unparseable.
 * A null age is *not* treated as established — unknown never upgrades a badge.
 */
export function accountAgeDays(createdAt?: string | null): number | null {
  if (!createdAt) return null
  const created = new Date(createdAt).getTime()
  if (!Number.isFinite(created)) return null
  const ageMs = Date.now() - created
  if (ageMs < 0) return 0 // clock skew / future-dated row: treat as brand new
  return Math.floor(ageMs / 86_400_000)
}

/**
 * Derive the trust badge for one profile row.
 *
 * Decision table (evaluated top-down, first match wins):
 * | level    | requirement                                                              |
 * |----------|--------------------------------------------------------------------------|
 * | trusted  | emailVerified AND phoneOnFile AND (establishedAccount OR listings_count>=3)|
 * | verified | emailVerified only                                                        |
 * | basic    | everything else (incl. unknown/missing data)                              |
 */
export function deriveTrustSignals(
  profile?: TrustProfileInput | null
): TrustSignals {
  const emailVerified = profile?.email_verified === true
  const phoneOnFile = hasPhoneOnFile(profile?.phone)

  const ageDays = accountAgeDays(profile?.created_at)
  const establishedAccount =
    ageDays !== null && ageDays >= TRUST_THRESHOLDS.establishedAccountDays

  const listingsCount =
    typeof profile?.listings_count === 'number' && Number.isFinite(profile.listings_count)
      ? profile.listings_count
      : 0

  let level: TrustLevel = 'basic'
  if (emailVerified && phoneOnFile && (establishedAccount || listingsCount >= TRUST_THRESHOLDS.trustedListingsCount)) {
    level = 'trusted'
  } else if (emailVerified) {
    // Phone-on-file alone is contactability, not verification: there is no
    // phone-OTP flow, so a self-typed number must never mint a trust tier.
    level = 'verified'
  }

  return { emailVerified, phoneOnFile, establishedAccount, level }
}

/** Convenience for JSX: `trustLabel(deriveTrustSignals(profile))` → "I besuar". */
export function trustLabel(signals: TrustSignals): string {
  return TRUST_LEVEL_LABELS[signals.level]
}

/** True when the UI should render any badge at all (basic renders nothing). */
export function shouldShowBadge(signals: TrustSignals): boolean {
  return signals.level !== 'basic'
}
