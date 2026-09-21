import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COOLDOWN_SECONDS = 60

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
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Shkruani një email të vlefshëm.' }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()

    // Find user
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (listError) {
      console.error('List users error:', listError)
      return NextResponse.json({ error: 'Gabim në lidhje me serverin.' }, { status: 500 })
    }

    const user = listData.users.find(u => u.email?.toLowerCase() === email)

    if (!user) {
      return NextResponse.json({ error: 'Përdoruesi me këtë email nuk u gjet.' }, { status: 404 })
    }

    // Rate limit: check if a code was recently generated
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('verification_code_expires_at')
      .eq('id', user.id)
      .single()

    const CODE_TTL_SECONDS = 600
    if (profile?.verification_code_expires_at) {
      const expiresAt = new Date(profile.verification_code_expires_at).getTime()
      const sentAt = expiresAt - CODE_TTL_SECONDS * 1000
      const elapsed = (Date.now() - sentAt) / 1000
      if (elapsed < COOLDOWN_SECONDS) {
        const remaining = Math.ceil(COOLDOWN_SECONDS - elapsed)
        return NextResponse.json(
          { error: `Ju lutemi prisni ${remaining} sekonda para se të kërkoni një kod të ri.` },
          { status: 429 }
        )
      }
    }

    // Generate fresh 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        verification_code: code,
        verification_code_expires_at: expiresAt,
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return NextResponse.json({ error: 'Gabim gjatë përditësimit të kodit.' }, { status: 500 })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json({ error: 'Shërbimi i email-it nuk është i konfiguruar.' }, { status: 500 })
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Kodi juaj i ri i verifikimit</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F2F7F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F2F7F7; padding: 40px 16px;">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); border: 1px solid #E5E7EB;">
                  <tr>
                    <td style="background-color: #00675B; padding: 32px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Bleje Pronën</h1>
                      <p style="margin: 6px 0 0; color: rgba(255, 255, 255, 0.8); font-size: 13px; font-weight: 500;">Kodi i ri i verifikimit</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 36px 32px; text-align: center;">
                      <p style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #101828;">Kodi juaj i ri u krijua!</p>
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
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bleje Pronën <noreply@blejepronen.com>',
        to: email,
        subject: `Kodi juaj i ri i verifikimit: ${code} - Bleje Pronën`,
        html: emailHtml,
      }),
    })

    if (!resendRes.ok) {
      console.error('Resend error:', await resendRes.text())
      return NextResponse.json({ error: 'Dështoi dërgimi i email-it. Provoni përsëri.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Kodi u ridërgua me sukses.' })
  } catch (err) {
    console.error('Resend code error:', err)
    return NextResponse.json({ error: 'Gabim i brendshëm i serverit.' }, { status: 500 })
  }
}
