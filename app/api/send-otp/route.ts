import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import {
  consumeRequestBudget,
  evaluateSendBudget,
  findAuthUserByEmail,
  generateOtpCode,
  getAdminClient,
  otpEmailHtml,
  readOtpState,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
} from '@/lib/auth-security'

const UNIFORM_BODY = {
  success: true,
  message: 'Nëse llogaria ekziston dhe është e pakonfirmuar, kodi u dërgua me email.',
}

export async function POST(request: Request) {
  try {
    let bodyEmail = ''
    try {
      const body = await request.json()
      if (typeof body?.email === 'string') {
        bodyEmail = body.email.trim().toLowerCase()
      }
    } catch {}

    const supabaseAdmin = getAdminClient()
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let targetUserId = user?.id || ''
    let targetEmail = user?.email || ''

    if (!targetUserId && bodyEmail) {
      // Cached, indexed lookup — never a full directory scan.
      const found = await findAuthUserByEmail(supabaseAdmin, bodyEmail)
      if (found) {
        targetUserId = found.id
        targetEmail = found.email || bodyEmail
      }
    }

    // Uniform response: unknown addresses get the same 200 body so the
    // endpoint can never be used as an enumeration oracle.
    if (!targetUserId || !targetEmail) {
      return NextResponse.json(UNIFORM_BODY)
    }

    if (!consumeRequestBudget(`otp-send:${targetUserId}`, 10)) {
      return NextResponse.json(UNIFORM_BODY)
    }

    const { data: profileRow } = await supabaseAdmin
      .from('profiles')
      .select('verification_code_expires_at, otp_fail_count, otp_locked_until')
      .eq('id', targetUserId)
      .maybeSingle()

    const state = readOtpState({
      user_metadata: {
        otp_fail_count: profileRow?.otp_fail_count,
        otp_locked_until: profileRow?.otp_locked_until,
      },
    } as never)
    const budget = evaluateSendBudget(state)
    if (!budget.allowed) {
      // Same uniform body: cooldown/lockout must not be observable.
      return NextResponse.json(UNIFORM_BODY)
    }

    if (profileRow?.verification_code_expires_at) {
      const expiresAt = new Date(profileRow.verification_code_expires_at).getTime()
      const sentAt = expiresAt - OTP_TTL_MS
      if (Date.now() - sentAt < OTP_RESEND_COOLDOWN_MS) {
        return NextResponse.json(UNIFORM_BODY)
      }
    }

    const code = generateOtpCode()
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        verification_code: code,
        verification_code_expires_at: expiresAt,
      })
      .eq('id', targetUserId)

    if (updateError) {
      console.error('Save verification code error:', updateError)
      return NextResponse.json({ error: 'Dështoi ruajtja e kodit të verifikimit.' }, { status: 500 })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not set')
      return NextResponse.json({ error: 'Shërbimi i email-it nuk është i konfiguruar.' }, { status: 500 })
    }

    const html = otpEmailHtml(
      code,
      'Bleje Pronën',
      'Përdorni kodin e mëposhtëm 6-shifror për të konfirmuar llogarinë tuaj:',
      'Verifikimi i llogarisë suaj'
    )

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bleje Pronën <noreply@blejepronen.com>',
        to: targetEmail,
        // The code lives in the body only — subjects are indexed, previewed
        // and logged by mail infrastructure.
        subject: 'Kodi juaj i verifikimit - Bleje Pronën',
        html,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Resend API error:', res.status, text)
      return NextResponse.json({ error: 'Dështoi dërgimi i email-it.' }, { status: 500 })
    }

    return NextResponse.json(UNIFORM_BODY)
  } catch (err) {
    console.error('Send OTP error:', err)
    return NextResponse.json({ error: 'Gabim i brendshëm i serverit.' }, { status: 500 })
  }
}
