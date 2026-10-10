import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createServerSupabaseClient, getCookieDomain } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  AUTH_COPY,
  OTP_MAX_ATTEMPTS,
  clientIp,
  clearOtpCounters,
  consumeRequestBudget,
  findAuthUserByEmail,
  getAdminClient,
  isLocked,
  isValidEmail,
  normalizeEmail,
  readOtpState,
  readPhantomOtpState,
  recordOtpFailure,
  recordPhantomFailure,
  safeCodeEqual,
} from '@/lib/auth-security'

/**
 * POST /api/verify-otp
 *
 * Hardened for audit finding C3 (OTP brute force):
 *
 *  - Attempt counters moved out of a per-instance `Map` (which a cold start or a
 *    second serverless region reset to zero) into durable per-user state in
 *    `auth.users.user_metadata` (`otp_fail_count`, `otp_locked_until`), written
 *    with `auth.admin.updateUserById`. The long-term home for the same counters
 *    is `supabase/migrations/20260928_002_profiles_otp_lockout.sql`.
 *  - Codes are compared with `crypto.timingSafeEqual` behind a length check.
 *  - Addresses with no account get the same treatment through a bounded
 *    in-memory shadow, so "locked after 5 tries" no longer proves the address
 *    exists.
 *  - Wrong code, expired code, missing profile and unknown address all return
 *    one identical message; the directory scan is gone.
 */

/** Coarse per-device brake. Deliberately generous: shared NATs are common. */
const VERIFY_IP_HOURLY_LIMIT = 200

const SIX_DIGITS_RE = /^[0-9]{6}$/

type ProfileRow = Record<string, unknown> & { id?: string }

function uniformInvalid() {
  return NextResponse.json({ error: 'invalid', message: AUTH_COPY.otpInvalid }, { status: 400 })
}

function uniformLocked() {
  return NextResponse.json(
    { error: 'too_many_attempts', message: AUTH_COPY.otpLocked },
    { status: 429 }
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const code = typeof body?.code === 'string' ? body.code.trim() : ''
    const email = normalizeEmail(body?.email)
    const password = typeof body?.password === 'string' ? body.password : ''

    // Input shape only — reveals nothing about any account.
    if (!SIX_DIGITS_RE.test(code)) {
      return NextResponse.json(
        { error: 'invalid', message: 'Kodi duhet të ketë saktësisht 6 shifra.' },
        { status: 400 }
      )
    }

    if (!consumeRequestBudget(`verify-otp:${clientIp(request)}`, VERIFY_IP_HOURLY_LIMIT)) {
      return NextResponse.json(
        { error: 'rate_limited', message: AUTH_COPY.rateLimited },
        { status: 429 }
      )
    }

    const admin = getAdminClient()
    let user: User | null = null

    if (email) {
      if (!isValidEmail(email)) return uniformInvalid()
      user = await findAuthUserByEmail(admin, email)
    } else {
      // Fall back to the current authenticated session (web OTP screen).
      const supabase = await createServerSupabaseClient()
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser()
      if (!sessionUser) {
        return NextResponse.json(
          { error: 'unauthorized', message: 'Ju lutemi jepni email-in ose kyçuni.' },
          { status: 401 }
        )
      }
      user = sessionUser
    }

    // ---- Unknown address: behave exactly like a known one -----------------
    if (!user) {
      const phantom = readPhantomOtpState(email)
      if (isLocked(phantom)) return uniformLocked()
      const { justLocked } = recordPhantomFailure(email)
      return justLocked ? uniformLocked() : uniformInvalid()
    }

    // ---- Durable lockout check -------------------------------------------
    const otpState = readOtpState(user)
    if (isLocked(otpState)) return uniformLocked()

    const { data: profileData, error: profileError } = await admin
      .from('profiles')
      // `select('*')`: the live table has drifted, so naming columns risks a
      // hard 42703 on an otherwise healthy verification.
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Profile fetch error:', profileError.message)
      return uniformInvalid()
    }

    const profile = (profileData as ProfileRow | null) ?? null
    const storedCode = typeof profile?.verification_code === 'string' ? profile.verification_code : ''
    const expiresAt =
      typeof profile?.verification_code_expires_at === 'string'
        ? new Date(profile.verification_code_expires_at).getTime()
        : NaN

    // Missing profile, no pending code, or an expired code: one uniform answer.
    if (!profile || !storedCode || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
      return uniformInvalid()
    }

    if (!safeCodeEqual(code, storedCode)) {
      const { justLocked } = await recordOtpFailure(admin, user)
      console.warn('verify-otp failed attempt', {
        userId: user.id,
        attempts: otpState.failCount + 1,
        max: OTP_MAX_ATTEMPTS,
        locked: justLocked,
      })
      return justLocked ? uniformLocked() : uniformInvalid()
    }

    // ---- Success ----------------------------------------------------------
    const { error: updateError } = await admin
      .from('profiles')
      .update({
        email_verified: true,
        verification_code: null,
        verification_code_expires_at: null,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Verify update error:', updateError.message)
      return NextResponse.json(
        { error: 'update_failed', message: 'Dështoi përditësimi i profilit.' },
        { status: 500 }
      )
    }

    // Confirm in auth, flag the product-level verification and clear the OTP
    // counters in a single write. Existing metadata is spread in first because
    // GoTrue replaces `user_metadata` wholesale on some versions — a bare patch
    // would drop `account_type` / `company_name` / `onboarding_completed`.
    const { error: confirmAuthError } = await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      user_metadata: {
        ...(user.user_metadata || {}),
        email_verified: true,
        otp_fail_count: 0,
        otp_locked_until: null,
      },
    })

    if (confirmAuthError) {
      console.error('Confirm auth user error:', confirmAuthError.message)
      // Not fatal: the profile is already verified. Make sure the counters are
      // still cleared so a later attempt is not locked out by stale state.
      await clearOtpCounters(admin, user)
    }

    const response = NextResponse.json({
      success: true,
      message: AUTH_COPY.otpVerified,
    })

    if (password && email) {
      try {
        const cookieStore = await cookies()
        const host =
          request.headers.get('x-forwarded-host') ||
          request.headers.get('host') ||
          new URL(request.url).hostname
        const cookieDomain = getCookieDomain(host)

        const ssrClient = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                return cookieStore.getAll()
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                  const opts = cookieDomain ? { ...options, domain: cookieDomain } : options
                  try {
                    cookieStore.set(name, value, opts)
                  } catch {}
                  response.cookies.set(name, value, opts)
                })
              },
            },
          }
        )

        const { data: signInData, error: signInErr } = await ssrClient.auth.signInWithPassword({
          email,
          password,
        })

        if (!signInErr && signInData?.session) {
          const finalResponse = NextResponse.json({
            success: true,
            message: AUTH_COPY.otpVerified,
          })
          response.cookies.getAll().forEach((cookie) => {
            finalResponse.cookies.set(cookie)
          })
          return finalResponse
        }
      } catch (authErr) {
        console.warn('Server session creation notice in verify-otp:', authErr)
      }
    }

    return response
  } catch (err) {
    console.error('Verify OTP error:', err)
    return NextResponse.json(
      { error: 'internal_error', message: AUTH_COPY.serverError },
      { status: 500 }
    )
  }
}
