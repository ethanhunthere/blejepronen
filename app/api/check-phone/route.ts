import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizePhoneNumber } from '@/lib/phone'

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
    const rawPhone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    const userId = typeof body?.userId === 'string' ? body.userId : ''

    if (!rawPhone) {
      return NextResponse.json({ available: true, normalized: '' })
    }

    const normalized = normalizePhoneNumber(rawPhone)

    const supabaseAdmin = getAdminClient()

    // Fetch all existing profiles with non-empty phones
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, phone')
      .neq('phone', '')
      .not('phone', 'is', null)

    if (error) {
      console.error('Error fetching profiles for phone check:', error)
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    // Check if any other user has this phone number
    const duplicate = profiles?.find((p) => {
      if (userId && p.id === userId) return false
      const existingNorm = normalizePhoneNumber(p.phone || '')
      return (
        existingNorm === normalized ||
        p.phone === normalized ||
        p.phone === rawPhone
      )
    })

    if (duplicate) {
      return NextResponse.json(
        {
          available: false,
          error: 'Ky numër telefoni është i regjistruar tashmë në një llogari tjetër.',
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      available: true,
      normalized,
    })
  } catch (err) {
    console.error('check-phone API error:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
