import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('verification_code, verification_code_expires_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 500 })
    }

    if (profile.verification_code !== code) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    if (!profile.verification_code_expires_at || new Date(profile.verification_code_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expired' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        phone_verified: true,
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
