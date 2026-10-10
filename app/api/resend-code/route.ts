import { NextResponse } from 'next/server'
import {
  AUTH_COPY,
  OTP_TTL_MS,
  clientIp,
  consumeRequestBudget,
  evaluateSendBudget,
  findAuthUserByEmail,
  generateOtpCode,
  getAdminClient,
  isMissingSchemaError,
  isValidEmail,
  normalizeEmail,
  otpEmailHtml,
  readOtpState,
  readPhantomOtpState,
  recordOtpSend,
  recordPhantomSend,
  sendOtpEmail,
} from '@/lib/auth-security'

/**
 * POST /api/resend-code
 *
 * Hardened for audit findings C2/C3:
 *
 *  - Address resolution goes through `findAuthUserByEmail` (indexed
 *    `profiles.email`, bounded paginated `listUsers` fallback, TTL cache)
 *    instead of pulling a thousand auth users on every request.
 *  - Rate limiting is durable and per target: a 60s cooldown plus an hourly
 *    send budget held in `auth.users.user_metadata` (`otp_last_sent_at`,
 *    `otp_send_count`), so it survives cold starts and extra instances.
 *  - Codes come from `crypto.randomInt`.
 *  - Responses are uniform. An address with no account gets the same cooldown,
 *    the same 429s and the same success body as a real one — it simply never
 *    receives mail — so this endpoint cannot be used to test whether an address
 *    is registered.
 */

/** Resend is the expensive path (it dispatches mail), so the IP budget is tight. */
const RESEND_IP_HOURLY_LIMIT = 20

function uniformSuccess() {
  return NextResponse.json({ success: true, message: AUTH_COPY.resendSuccess })
}

function cooldownResponse(remainingMs: number) {
  return NextResponse.json(
    { error: 'cooldown', message: AUTH_COPY.resendCooldown(Math.max(1, Math.ceil(remainingMs / 1000))) },
    { status: 429 }
  )
}

function budgetExhaustedResponse() {
  return NextResponse.json(
    { error: 'rate_limited', message: AUTH_COPY.rateLimited },
    { status: 429 }
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const email = normalizeEmail(body?.email)

    // Input shape only — this says nothing about whether the address exists.
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: AUTH_COPY.invalidEmail }, { status: 400 })
    }

    if (!consumeRequestBudget(`resend:${clientIp(request)}`, RESEND_IP_HOURLY_LIMIT)) {
      return budgetExhaustedResponse()
    }

    const admin = getAdminClient()
    const user = await findAuthUserByEmail(admin, email)

    // ---- Unknown address: identical behaviour, no mail --------------------
    if (!user) {
      const phantom = readPhantomOtpState(email)
      const phantomBudget = evaluateSendBudget(phantom)
      if (!phantomBudget.allowed) {
        return phantomBudget.cooldownRemainingMs > 0
          ? cooldownResponse(phantomBudget.cooldownRemainingMs)
          : budgetExhaustedResponse()
      }
      recordPhantomSend(email)
      return uniformSuccess()
    }

    // ---- Durable per-target budget ---------------------------------------
    const state = readOtpState(user)
    const budget = evaluateSendBudget(state)
    if (!budget.allowed) {
      return budget.cooldownRemainingMs > 0
        ? cooldownResponse(budget.cooldownRemainingMs)
        : budgetExhaustedResponse()
    }

    // ---- Issue a fresh code ------------------------------------------------
    const code = generateOtpCode()
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()

    const { data: updatedRows, error: profileError } = await admin
      .from('profiles')
      .update({
        verification_code: code,
        verification_code_expires_at: expiresAt,
      })
      .eq('id', user.id)
      // `select('*')`: never name columns that the live schema may have drifted
      // away from; we only need the row count back.
      .select('*')

    if (profileError) {
      console.error('Profile update error:', profileError.message)
      return NextResponse.json(
        { error: 'update_failed', message: AUTH_COPY.serverError },
        { status: 500 }
      )
    }

    // The auth row can exist without a profile row (the signup trigger is
    // best-effort). Create the minimum needed so the code is actually stored.
    if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
      const fallbackRow = {
        id: user.id,
        first_name: '',
        last_name: '',
        verification_code: code,
        verification_code_expires_at: expiresAt,
      }
      let { error: upsertError } = await admin
        .from('profiles')
        .upsert({ ...fallbackRow, email }, { onConflict: 'id' })

      if (upsertError && isMissingSchemaError(upsertError)) {
        ;({ error: upsertError } = await admin
          .from('profiles')
          .upsert(fallbackRow, { onConflict: 'id' }))
      }

      if (upsertError) {
        console.error('Profile upsert error in resend-code:', upsertError.message)
        return NextResponse.json(
          { error: 'update_failed', message: AUTH_COPY.serverError },
          { status: 500 }
        )
      }
    }

    // Consume the budget before dispatching, so a failing mail provider cannot
    // be used to request unlimited codes.
    await recordOtpSend(admin, user, state)

    const delivered = await sendOtpEmail(
      email,
      code,
      'Kodi juaj i ri i verifikimit - Bleje Pronën',
      otpEmailHtml(
        code,
        'Kodi i ri i verifikimit',
        'Kodi juaj i ri u krijua!',
        'Kodi juaj i ri i verifikimit'
      )
    )

    if (!delivered) {
      return NextResponse.json(
        { error: 'email_failed', message: 'Dështoi dërgimi i email-it. Provoni përsëri.' },
        { status: 500 }
      )
    }

    return uniformSuccess()
  } catch (err) {
    console.error('Resend code error:', err)
    return NextResponse.json({ error: 'internal_error', message: AUTH_COPY.serverError }, { status: 500 })
  }
}
