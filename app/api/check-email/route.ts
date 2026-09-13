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
    const body = await request.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()

    // Query users in batches if necessary
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (error) {
      console.error('check-email listUsers error:', error)
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    const user = data.users.find((u) => u.email?.toLowerCase() === email)

    if (!user) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({
      exists: true,
      emailConfirmed: !!user.email_confirmed_at,
    })
  } catch (err) {
    console.error('check-email error:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
