import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Supabase admin environment variables are not configured')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
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
    const { data: { user } } = await supabase.auth.getUser()

    let targetUserId = user?.id || ''
    let targetEmail = user?.email || ''

    if (!targetUserId && bodyEmail) {
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const foundUser = listData?.users.find(u => u.email?.toLowerCase() === bodyEmail)
      if (foundUser) {
        targetUserId = foundUser.id
        targetEmail = foundUser.email || bodyEmail
      }
    }

    if (!targetUserId || !targetEmail) {
      return NextResponse.json({ error: 'Ju lutemi kyçuni për të marrë kodin.' }, { status: 401 })
    }

    // Rate limit: allow one OTP request per 60 seconds per user
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('verification_code_expires_at')
      .eq('id', targetUserId)
      .maybeSingle()

    const COOLDOWN_SECONDS = 60
    const CODE_TTL_SECONDS = 600
    if (profile?.verification_code_expires_at) {
      const expiresAt = new Date(profile.verification_code_expires_at).getTime()
      const sentAt = expiresAt - CODE_TTL_SECONDS * 1000
      if (Date.now() - sentAt < COOLDOWN_SECONDS * 1000) {
        return NextResponse.json({ error: 'Prisni 60 sekonda para se të ridërgoni kodin.' }, { status: 429 })
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

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

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Kodi juaj i verifikimit</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F2F7F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F2F7F7; padding: 40px 16px;">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); border: 1px solid #E5E7EB;">
                  <tr>
                    <td style="background-color: #00675B; padding: 32px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Bleje Pronën</h1>
                      <p style="margin: 6px 0 0; color: rgba(255, 255, 255, 0.8); font-size: 13px; font-weight: 500;">Verifikimi i llogarisë suaj</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 36px 32px; text-align: center;">
                      <p style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #101828;">Mirë se vini në Bleje Pronën!</p>
                      <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #4B5563;">
                        Përdorni kodin e mëposhtëm 6-shifror për të konfirmuar llogarinë tuaj:
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
                        Nëse nuk e keni kërkuar ju këtë kod, mund ta injoroni këtë email.
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

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bleje Pronën <noreply@blejepronen.com>',
        to: targetEmail,
        subject: 'Kodi juaj i verifikimit - Bleje Pronën',
        html,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Resend API error:', res.status, text)
      return NextResponse.json({ error: 'Dështoi dërgimi i email-it.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Send OTP error:', err)
    return NextResponse.json({ error: 'Gabim i brendshëm i serverit.' }, { status: 500 })
  }
}
