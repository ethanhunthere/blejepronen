import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000
const attempts = new Map<string, { count: number; lockedUntil?: number }>()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const code = typeof body?.code === 'string' ? body.code.trim() : ''

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check lockout from previous failed attempts
    const attempt = attempts.get(user.id)
    if (attempt?.lockedUntil && Date.now() < attempt.lockedUntil) {
      return NextResponse.json({ error: 'too_many_attempts', message: 'Shumë përpjekje. Prisni pak.' }, { status: 429 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('verification_code, verification_code_expires_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 500 })
    }

    if (!profile.verification_code_expires_at || new Date(profile.verification_code_expires_at) < new Date()) {
      attempts.delete(user.id)
      return NextResponse.json({ error: 'expired', message: 'Kodi ka skaduar. Kërkoni një kod të ri.' }, { status: 400 })
    }

    if (profile.verification_code !== code) {
      const nextAttempt: { count: number; lockedUntil?: number } = attempt ? { count: attempt.count + 1 } : { count: 1 }
      if (nextAttempt.count >= MAX_ATTEMPTS) {
        nextAttempt.lockedUntil = Date.now() + LOCKOUT_MS
      }
      attempts.set(user.id, nextAttempt)
      return NextResponse.json({ error: 'invalid', message: 'Kodi është i gabuar.' }, { status: 400 })
    }

    attempts.delete(user.id)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email_verified: true,
        verification_code: null,
        verification_code_expires_at: null,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Verify update error:', updateError)
      return NextResponse.json({ error: 'Failed to verify profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Verify OTP error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
