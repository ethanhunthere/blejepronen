import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    const password = typeof body?.password === 'string' ? body.password : ''
    const accountType = body?.accountType === 'company' ? 'company' : 'individual'
    const companyName = typeof body?.companyName === 'string' ? body.companyName.trim() : ''

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Shkruani një adresë email-i të vlefshme.' }, { status: 400 })
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' }, { status: 400 })
    }

    if (accountType === 'company' && !companyName) {
      return NextResponse.json({ error: 'Emri i kompanisë është i detyrueshëm.' }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()

    // Check if user already exists
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (listError) {
      console.error('List users error:', listError)
      return NextResponse.json({ error: 'Gabim në lidhje me serverin. Ju lutemi provoni përsëri.' }, { status: 500 })
    }

    const existingUser = listData.users.find(u => u.email?.toLowerCase() === email)

    let userId: string

    if (existingUser) {
      if (existingUser.email_confirmed_at) {
        return NextResponse.json(
          { error: 'Një llogari me këtë email ekziston tashmë. Ju lutemi hyni në llogari.' },
          { status: 400 }
        )
      }

      // User exists but has never confirmed email -> update password and metadata
      userId = existingUser.id
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          account_type: accountType,
          company_name: accountType === 'company' ? companyName : undefined,
          full_name: accountType === 'company' ? companyName : undefined,
          email_verified: false,
        },
      })

      if (updateAuthError) {
        console.error('Update existing user password error:', updateAuthError)
        return NextResponse.json({ error: 'Gabim gjatë përditësimit të llogarisë. Provoni përsëri.' }, { status: 500 })
      }
    } else {
      // Create fresh user in Supabase without triggering Supabase's built-in mailer
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
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
        console.error('Admin create user error:', createError)
        return NextResponse.json({ error: createError?.message || 'Gabim gjatë krijimit të llogarisë.' }, { status: 500 })
      }

      userId = createData.user.id
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Ensure profile row exists and save OTP code
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, phone, avatar_url')
      .eq('id', userId)
      .maybeSingle()

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        first_name: accountType === 'company' ? companyName : (existingProfile?.first_name ?? ''),
        last_name: existingProfile?.last_name ?? '',
        phone: existingProfile?.phone ?? '',
        verification_code: code,
        verification_code_expires_at: expiresAt,
        email_verified: false,
        avatar_url: existingProfile?.avatar_url || '/avatars/avatar-1.png',
      })

    if (profileUpdateError) {
      console.error('Save verification code error:', profileUpdateError)
      return NextResponse.json({ error: 'Gabim gjatë ruajtjes së kodit të verifikimit.' }, { status: 500 })
    }

    // Send email using verified Resend API
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not set')
      return NextResponse.json({ error: 'Shërbimi i email-it nuk është i konfiguruar.' }, { status: 500 })
    }

    const emailHtml = `
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
                    <td style="background-color: #006459; padding: 32px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Bleje Pronën</h1>
                      <p style="margin: 6px 0 0; color: rgba(255, 255, 255, 0.8); font-size: 13px; font-weight: 500;">Verifikimi i llogarisë suaj</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 36px 32px; text-align: center;">
                      <p style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #101828;">Mirë se vini në Bleje Pronën!</p>
                      <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #4B5563;">
                        Përdorni kodin e mëposhtëm 6-shifror për të konfirmuar email-in dhe për të aktivizuar llogarinë tuaj:
                      </p>
                      <div style="margin: 0 auto 28px; display: inline-block; background-color: #F2F7F7; border: 2px dashed #006459; border-radius: 14px; padding: 16px 36px;">
                        <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #006459;">
                          ${code}
                        </span>
                      </div>
                      <p style="margin: 0; font-size: 13px; color: #6B7280;">
                        Ky kod skadon pas <strong>10 minutash</strong>.
                      </p>
                      <hr style="margin: 32px 0; border: none; border-top: 1px solid #F3F4F6;" />
                      <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9CA3AF;">
                        Nëse nuk e keni kërkuar ju këtë regjistrim, ju lutemi ta injoroni këtë email.
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
        subject: `Kodi juaj i verifikimit: ${code} - Bleje Pronën`,
        html: emailHtml,
      }),
    })

    if (!resendRes.ok) {
      const errText = await resendRes.text()
      console.error('Resend email send error:', resendRes.status, errText)
      return NextResponse.json({ error: 'Dështoi dërgimi i email-it. Ju lutemi provoni përsëri.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      email,
      message: 'Kodi i verifikimit u dërgua me sukses.',
    })
  } catch (err: unknown) {
    console.error('Signup API error:', err)
    return NextResponse.json({ error: 'Gabim i brendshëm i serverit.' }, { status: 500 })
  }
}
