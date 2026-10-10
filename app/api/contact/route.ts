import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { createServerSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

async function resolveUser(request: Request) {
  try {
    const serverSupabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()
    if (user) return user
  } catch {
    // no cookie session
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (url && anonKey) {
      const client = createClient(url, anonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
      const {
        data: { user },
      } = await client.auth.getUser()
      if (user) return user
    }
  }
  return null
}

/**
 * Authenticated contact resolution. Listing pages never server-render phone
 * numbers into public HTML; the contact CTAs fetch them from here after login.
 *
 *   GET /api/contact?listingId=<id>            → { phone, isOwn }
 *   GET /api/contact?userId=<id>               → { phone }
 *   GET /api/contact?userIds=<id,id,…> (≤20)   → { phones: { [id]: phone|null } }
 */
export async function GET(request: Request) {
  const user = await resolveUser(request)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized', message: 'Ju lutemi kyçuni.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const listingId = searchParams.get('listingId')
  const userId = searchParams.get('userId')
  const userIds = searchParams.get('userIds')

  const supabase = getAdminClient()

  if (userIds) {
    const ids = [...new Set(userIds.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, 20)
    if (ids.length === 0) {
      return NextResponse.json({ phones: {} })
    }
    const { data, error } = await supabase.from('profiles').select('id, phone').in('id', ids)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const phones: Record<string, string | null> = {}
    for (const id of ids) phones[id] = null
    for (const row of data || []) {
      phones[row.id] = typeof row.phone === 'string' && row.phone.trim() ? row.phone.trim() : null
    }
    return NextResponse.json({ phones })
  }

  if (userId) {
    const { data, error } = await supabase.from('profiles').select('phone').eq('id', userId).maybeSingle()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const phone = typeof data?.phone === 'string' && data.phone.trim() ? data.phone.trim() : null
    return NextResponse.json({ phone, isOwn: userId === user.id })
  }

  if (!listingId) {
    return NextResponse.json({ error: 'missing_id', message: 'ID e listimit mungon.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('listings')
    .select('user_id, profiles:profiles(phone)')
    .eq('id', listingId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'not_found', message: 'Listimi nuk u gjet.' }, { status: 404 })
  }

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
  const phone = typeof profile?.phone === 'string' && profile.phone.trim() ? profile.phone.trim() : null

  return NextResponse.json({ phone, isOwn: data.user_id === user.id })
}
