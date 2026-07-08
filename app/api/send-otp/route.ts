import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        verification_code: code,
        verification_code_expires_at: expiresAt,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Save verification code error:', updateError)
      return NextResponse.json({ error: 'Failed to save verification code' }, { status: 500 })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not set')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background-color: #0A0F2E; color: #ffffff; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">Bleje Banesën</h1>
        </div>
        <p style="font-size: 16px; color: rgba(255,255,255,0.8); margin-bottom: 24px;">
          Për të verifikuar llogarinë tuaj, përdorni kodin e mëposhtëm:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <span style="display: inline-block; font-size: 42px; font-weight: 700; letter-spacing: 8px; color: #1B4FFF; background-color: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 16px 32px;">
            ${code}
          </span>
        </div>
        <p style="font-size: 14px; color: rgba(255,255,255,0.6); margin-bottom: 8px;">
          Kodi skadon pas 10 minutash.
        </p>
        <p style="font-size: 14px; color: rgba(255,255,255,0.4); margin-top: 24px;">
          Nëse nuk keni kërkuar ju këtë kod, mund ta injoroni këtë email.
        </p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bleje Banesën <noreply@blejebanesen.com>',
        to: user.email,
        subject: 'Kodi juaj i verifikimit - Bleje Banesën',
        html,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Resend API error:', res.status, text)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Send OTP error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
