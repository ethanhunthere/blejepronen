import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { createServerSupabaseClient } from '@/lib/supabase'
import { hubPathEn, hubPathSq, marketPathEn, marketPathSq } from '@/lib/seo-slugs'

export const dynamic = 'force-dynamic'

interface RevalidatePayload {
  city?: unknown
  type?: unknown
  neighborhood?: unknown
  id?: unknown
}

export async function POST(request: Request) {
  let user = null
  try {
    const serverSupabase = await createServerSupabaseClient()
    const {
      data: { user: cookieUser },
    } = await serverSupabase.auth.getUser()
    user = cookieUser
  } catch {}

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: RevalidatePayload = {}
  try {
    payload = (await request.json()) as RevalidatePayload
  } catch {
    payload = {}
  }

  const paths = new Set<string>(['/', '/listings', '/tregu', '/en/market', '/sitemap.xml'])

  const city = typeof payload.city === 'string' && payload.city.trim() ? payload.city.trim() : null
  const type = payload.type === 'shitje' || payload.type === 'qira' ? payload.type : null
  const hood =
    typeof payload.neighborhood === 'string' && payload.neighborhood.trim()
      ? payload.neighborhood.trim()
      : null
  const id = typeof payload.id === 'string' && payload.id.trim() ? payload.id.trim() : null

  if (id) paths.add(`/listings/${encodeURIComponent(id)}`)

  if (city && type) {
    paths.add(hubPathSq(city, type))
    paths.add(hubPathEn(city, type))
    if (hood) {
      paths.add(hubPathSq(city, type, hood))
      paths.add(hubPathEn(city, type, hood))
    }
    paths.add(marketPathSq(city))
    paths.add(marketPathEn(city))
  } else if (city) {
    paths.add(marketPathSq(city))
    paths.add(marketPathEn(city))
  }

  const revalidated: string[] = []
  for (const path of paths) {
    try {
      revalidatePath(path)
      revalidated.push(path)
    } catch (err) {
      console.error('revalidatePath failed for', path, err)
    }
  }

  return NextResponse.json({ revalidated })
}
