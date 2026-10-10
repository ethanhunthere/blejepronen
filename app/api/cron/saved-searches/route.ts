import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_SEARCHES_PER_RUN = 50
const MAX_MATCHES_PER_SEARCH = 5

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

interface SavedSearchRow {
  id: string
  user_id: string
  title: string | null
  city: string | null
  type: string | null
  min_price: number | null
  max_price: number | null
  rooms: number | null
  min_area: number | null
  max_area: number | null
  apartment_type: string | null
  search_query: string | null
  notify_push: boolean
  notify_email: boolean
  last_notified_at: string
}

interface MatchedListing {
  id: string
  title: string
  price: number | null
  city: string | null
}

export async function GET(request: Request) {
  // Vercel Cron invokes with Authorization: Bearer <CRON_SECRET>.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'cron_unconfigured', message: 'CRON_SECRET is not set in Vercel.' },
      { status: 503 }
    )
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = getAdminClient()

  const { data: searches, error } = await admin
    .from('saved_searches')
    .select('*')
    .or('notify_push.eq.true,notify_email.eq.true')
    .order('last_notified_at', { ascending: true })
    .limit(MAX_SEARCHES_PER_RUN)

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ processed: 0, note: 'saved_searches not migrated yet' })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let notified = 0
  for (const s of (searches || []) as SavedSearchRow[]) {
    let query = admin
      .from('listings')
      .select('id,title,price,city')
      .eq('is_active', true)
      .gt('created_at', s.last_notified_at)
      .order('created_at', { ascending: false })
      .limit(MAX_MATCHES_PER_SEARCH)
    if (s.city) query = query.eq('city', s.city)
    if (s.type) query = query.eq('type', s.type)
    if (s.min_price != null) query = query.gte('price', s.min_price)
    if (s.max_price != null) query = query.lte('price', s.max_price)
    if (s.rooms != null) query = query.gte('rooms', s.rooms)
    if (s.min_area != null) query = query.gte('area_m2', s.min_area)
    if (s.max_area != null) query = query.lte('area_m2', s.max_area)
    if (s.apartment_type) query = query.eq('apartment_type', s.apartment_type)
    if (s.search_query) {
      const safe = s.search_query.replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim()
      if (safe) query = query.ilike('title', `%${safe}%`)
    }

    const { data: matches } = await query
    const rows = (matches || []) as MatchedListing[]

    if (rows.length > 0) {
      await notifyUser(admin, s, rows)
      notified += 1
    }

    await admin
      .from('saved_searches')
      .update({ last_notified_at: new Date().toISOString() })
      .eq('id', s.id)
  }

  return NextResponse.json({ processed: (searches || []).length, notified })
}

async function notifyUser(
  admin: ReturnType<typeof getAdminClient>,
  search: SavedSearchRow,
  matches: MatchedListing[]
) {
  const first = matches[0]
  const more = matches.length > 1 ? ` +${matches.length - 1} të tjera` : ''
  const body = `Pronë e re: ${first.title}${more} — ${first.city || 'Kosovë'}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blejepronen.com'

  if (search.notify_push) {
    try {
      const { data } = await admin.auth.admin.getUserById(search.user_id)
      const tokens = (data?.user?.user_metadata?.push_tokens as string[] | undefined) || []
      if (tokens.length > 0) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            tokens.slice(0, 5).map((token) => ({
              to: token,
              sound: 'default',
              title: 'Bleje Pronën — kërkimi i ruajtur',
              body,
              data: { url: `${siteUrl}/listings/${first.id}` },
            }))
          ),
        }).catch(() => {})
      }
    } catch {
      // push is best-effort; email below still covers the user
    }
  }

  if (search.notify_email && process.env.RESEND_API_KEY) {
    const to = await userEmail(admin, search.user_id)
    if (to) {
      const items = matches
        .map(
          (m) =>
            `<li style="margin:0 0 10px"><a href="${siteUrl}/listings/${m.id}" style="color:#00675B;font-weight:600;text-decoration:none">${m.title}</a><br/><span style="color:#6B7280;font-size:13px">${m.city || ''}</span></li>`
        )
        .join('')
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Bleje Pronën <noreply@blejepronen.com>',
          to,
          subject: `Prona të reja për kërkimin tuaj (${matches.length})`,
          html: `<div style="font-family:sans-serif;padding:24px"><h2 style="margin:0 0 12px;color:#101828">${search.title || 'Kërkimi i ruajtur'}</h2><ul style="padding-left:18px;margin:0">${items}</ul><p style="color:#6B7280;font-size:13px;margin-top:16px">Bleje Pronën — pa provizion, direkt nga pronari.</p></div>`,
        }),
      }).catch(() => {})
    }
  }
}

async function userEmail(admin: ReturnType<typeof getAdminClient>, userId: string): Promise<string | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(userId)
    return data?.user?.email ?? null
  } catch {
    return null
  }
}
