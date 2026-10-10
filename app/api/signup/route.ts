import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import {
  AUTH_COPY,
  OTP_TTL_MS,
  clientIp,
  consumeRequestBudget,
  evaluateSendBudget,
  findAuthUserByEmail,
  generateOtpCode,
  getAdminClient,
  invalidateEmailCache,
  isMissingSchemaError,
  isValidEmail,
  normalizeEmail,
  otpEmailHtml,
  patchUserMetadata,
  readOtpState,
  isLocked,
  recordOtpSend,
  sendOtpEmail,
} from '@/lib/auth-security'

/**
 * POST /api/signup
 *
 * Hardened for audit findings C2 (enumeration) and the account-takeover hole in
 * the "existing user" branch:
 *
 *  - The address is resolved through `findAuthUserByEmail` (indexed
 *    `profiles.email` first, bounded paginated `listUsers` fallback, TTL cache).
 *    The old unconditional `listUsers({ page: 1, perPage: 1000 })` directory
 *    fetch is gone.
 *  - A password is NEVER accepted for an account that has completed
 *    verification (`profiles.email_verified` / `user_metadata.email_verified`,
 *    which is what OTP verification and OAuth set). Re-submitting the register
 *    form for such an address returns the same generic "blocked" response as
 *    every other non-completing case — it never says whether the address exists
 *    or is verified.
 *  - Genuinely incomplete registrations still reuse their auth row (so the OTP
 *    screen's resend flow keeps working), but password reuse is budgeted per
 *    target through durable `user_metadata` counters, and the response is
 *    byte-identical to a fresh signup.
 *  - When a reuse is throttled we return the uniform success shape *without*
 *    sending mail. A 429 here would itself be an existence oracle, because a
 *    brand-new address can never be throttled.
 *  - OTP codes come from `crypto.randomInt`; per-IP signup volume is budgeted.
 */

const SIGNUP_IP_HOURLY_LIMIT = 20
/** Password-reuse attempts allowed per incomplete account per window. */
const PASSWORD_REUSE_LIMIT = 3
const PASSWORD_REUSE_WINDOW_MS = 10 * 60 * 1000

type ProfileRow = Record<string, unknown> & { id?: string }

async function fetchProfileRow(
  admin: SupabaseClient,
  userId: string
): Promise<ProfileRow | null> {
  try {
    // `select('*')` on purpose: the live table has drifted from schema.sql and
    // naming columns that may not exist turns a read into a hard 42703.
    const { data, error } = await admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.error('signup profile read error:', error.message)
      return null
    }
    return (data as ProfileRow | null) ?? null
  } catch (err) {
    console.error('signup profile read threw:', err)
    return null
  }
}

/** True once OTP verification or OAuth has activated the account. */
function isActivated(user: User, profile: ProfileRow | null): boolean {
  const meta = (user.user_metadata || {}) as Record<string, unknown>
  return profile?.email_verified === true || meta.email_verified === true
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

/**
 * Writes the profile row, tolerating the live schema not having `email` yet
 * (added by `supabase/migrations/20260928_001_profiles_email_unique.sql`).
 * The retry without `email` keeps signup working before the migration is run.
 */
async function upsertProfileWithDriftFallback(
  admin: SupabaseClient,
  row: ProfileRow,
  email: string
): Promise<boolean> {
  const withEmail = { ...row, email }
  let { error } = await admin.from('profiles').upsert(withEmail, { onConflict: 'id' })

  if (error && isMissingSchemaError(error)) {
    ;({ error } = await admin.from('profiles').upsert(row, { onConflict: 'id' }))
  }

  if (error) {
    console.error('Save verification code error:', error.message)
    return false
  }
  return true
}

/** Durable per-target budget on password reuse for incomplete registrations. */
function passwordReuseExhausted(user: User): boolean {
  const meta = (user.user_metadata || {}) as Record<string, unknown>
  const windowStart = Number(meta.pw_reuse_window_start)
  const count = Number(meta.pw_reuse_count)
  if (!Number.isFinite(windowStart) || Date.now() - windowStart > PASSWORD_REUSE_WINDOW_MS) {
    return false
  }
  return Number.isFinite(count) && count >= PASSWORD_REUSE_LIMIT
}

async function notePasswordReuse(admin: SupabaseClient, user: User): Promise<void> {
  const meta = (user.user_metadata || {}) as Record<string, unknown>
  const windowStart = Number(meta.pw_reuse_window_start)
  const now = Date.now()
  const fresh = !Number.isFinite(windowStart) || now - windowStart > PASSWORD_REUSE_WINDOW_MS
  const count = fresh ? 1 : Number(meta.pw_reuse_count) + 1

  await patchUserMetadata(admin, user, {
    pw_reuse_window_start: fresh ? now : windowStart,
    pw_reuse_count: Number.isFinite(count) ? count : 1,
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const email = normalizeEmail(body?.email)
    const password = typeof body?.password === 'string' ? body.password : ''
    const accountType = body?.accountType === 'company' ? 'company' : 'individual'
    const companyName =
      typeof body?.companyName === 'string' ? body.companyName.trim().slice(0, 120) : ''

    // Input-shape validation only. These messages say nothing about whether the
    // address is registered, so they may stay specific.
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: AUTH_COPY.invalidEmail }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: AUTH_COPY.weakPassword }, { status: 400 })
    }
    if (accountType === 'company' && !companyName) {
      return NextResponse.json({ error: AUTH_COPY.companyRequired }, { status: 400 })
    }

    // Coarse per-device brake. Keyed on IP only, so it cannot reveal anything
    // about the address being submitted.
    if (!consumeRequestBudget(`signup:${clientIp(request)}`, SIGNUP_IP_HOURLY_LIMIT)) {
      return NextResponse.json(
        { error: 'rate_limited', message: AUTH_COPY.rateLimited },
        { status: 429 }
      )
    }

    const admin = getAdminClient()
    const existing = await findAuthUserByEmail(admin, email)

    let userId: string
    /** Auth user as returned by create/update — carries fresh `user_metadata`. */
    let authUser: User
    let profile: ProfileRow | null = null

    if (existing) {
      profile = await fetchProfileRow(admin, existing.id)

      // ---- Account takeover guard -------------------------------------
      // An activated account must never accept a password from this endpoint.
      // The response is the same generic one used for every blocked signup.
      if (isActivated(existing, profile)) {
        console.warn('signup blocked: password rejected for an activated account', {
          userId: existing.id,
          ip: clientIp(request),
        })
        return NextResponse.json(
          { error: 'signup_blocked', message: AUTH_COPY.signupBlocked },
          { status: 409 }
        )
      }

      const otpState = readOtpState(existing)

      // Throttled reuse: stay silent and uniform. Returning 429/409 here would
      // distinguish "incomplete account" from "brand-new address".
      if (isLocked(otpState) || !evaluateSendBudget(otpState).allowed || passwordReuseExhausted(existing)) {
        console.warn('signup throttled for incomplete account; no mail sent', {
          userId: existing.id,
          locked: isLocked(otpState),
          ip: clientIp(request),
        })
        return NextResponse.json({
          success: true,
          email,
          message: AUTH_COPY.signupSuccess,
        })
      }

      userId = existing.id

      // Reuse the row: set the submitted password and refresh persona metadata,
      // preserving every other metadata key.
      const { data: updatedAuth, error: updateAuthError } = await admin.auth.admin.updateUserById(
        userId,
        {
          password,
          user_metadata: {
            ...(existing.user_metadata || {}),
            account_type: accountType,
            company_name: accountType === 'company' ? companyName : undefined,
            full_name: accountType === 'company' ? companyName : undefined,
            email_verified: false,
          },
        }
      )

      if (updateAuthError) {
        console.error('Update existing user password error:', updateAuthError.message)
        return NextResponse.json(
          { error: 'signup_blocked', message: AUTH_COPY.signupBlocked },
          { status: 409 }
        )
      }

      authUser = updatedAuth?.user ?? existing
      await notePasswordReuse(admin, authUser)
    } else {
      // Fresh registration. `email_confirm: true` is required by the existing
      // client flows (web + mobile sign in with the password immediately after
      // signup); product-level verification is `profiles.email_verified`, which
      // only /api/verify-otp may set.
      const { data: createData, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          account_type: accountType,
          company_name: accountType === 'company' ? companyName : undefined,
          full_name: accountType === 'company' ? companyName : undefined,
          email_verified: false,
        },
      })

      if (createError || !createData?.user) {
        // A miss in our lookup (stale cache, unbuilt index) surfaces here as
        // "already registered" — map it to the uniform blocked response rather
        // than leaking GoTrue's message.
        const alreadyRegistered = /already been registered|already registered/i.test(
          createError?.message || ''
        )
        console.error('Admin create user error:', createError?.message)
        return NextResponse.json(
          { error: 'signup_blocked', message: AUTH_COPY.signupBlocked },
          { status: alreadyRegistered ? 409 : 500 }
        )
      }

      userId = createData.user.id
      authUser = createData.user
      invalidateEmailCache(email)
      profile = await fetchProfileRow(admin, userId)
    }

    // ---- OTP ---------------------------------------------------------
    const code = generateOtpCode()
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()

    const saved = await upsertProfileWithDriftFallback(
      admin,
      {
        id: userId,
        first_name: accountType === 'company' ? companyName : asText(profile?.first_name, ''),
        last_name: asText(profile?.last_name, ''),
        phone: asText(profile?.phone, ''),
        verification_code: code,
        verification_code_expires_at: expiresAt,
        email_verified: false,
        avatar_url: asText(profile?.avatar_url, '/avatars/avatar-1.png'),
      },
      email
    )

    if (!saved) {
      return NextResponse.json(
        { error: 'otp_store_failed', message: AUTH_COPY.serverError },
        { status: 500 }
      )
    }

    // Mark the send against the per-target budget before dispatching so a
    // Resend failure cannot be used to bypass the cooldown.
    await recordOtpSend(admin, authUser, readOtpState(authUser))

    const delivered = await sendOtpEmail(
      email,
      code,
      'Kodi juaj i verifikimit - Bleje Pronën',
      otpEmailHtml(
        code,
        'Verifikimi i llogarisë suaj',
        'Mirë se vini në Bleje Pronën!',
        'Kodi juaj i verifikimit'
      )
    )

    if (!delivered) {
      return NextResponse.json(
        { error: 'email_failed', message: 'Dështoi dërgimi i email-it. Ju lutemi provoni përsëri.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      email,
      message: AUTH_COPY.signupSuccess,
    })
  } catch (err: unknown) {
    console.error('Signup API error:', err)
    return NextResponse.json({ error: 'internal_error', message: AUTH_COPY.serverError }, { status: 500 })
  }
}
