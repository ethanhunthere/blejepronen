import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  OmniSearchResponse,
  OmniResultItem,
  searchLocations,
  normalizeSearchString,
  TRENDING_SEARCHES,
} from '@/lib/omni-search'

// Simple in-memory LRU cache for sub-5ms repeated queries
interface CacheEntry {
  data: OmniSearchResponse
  expiresAt: number
}
const SEARCH_CACHE = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30 * 1000 // 30 seconds
const MAX_CACHE_ENTRIES = 200

function getFromCache(key: string): OmniSearchResponse | null {
  const entry = SEARCH_CACHE.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    SEARCH_CACHE.delete(key)
    return null
  }
  return entry.data
}

function setToCache(key: string, data: OmniSearchResponse) {
  if (SEARCH_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = SEARCH_CACHE.keys().next().value
    if (oldestKey) SEARCH_CACHE.delete(oldestKey)
  }
  SEARCH_CACHE.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Supabase credentials are not configured')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawQuery = searchParams.get('q') || searchParams.get('query') || ''
    const filterType = searchParams.get('type') // 'listing' | 'agency' | 'agent' | 'location'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)

    const cleanQ = rawQuery.trim()
    const normQ = normalizeSearchString(cleanQ)

    if (!cleanQ || cleanQ.length < 1) {
      return NextResponse.json<OmniSearchResponse>({
        query: cleanQ,
        total: 0,
        counts: { listings: 0, agencies: 0, agents: 0, locations: 0 },
        results: { listings: [], agencies: [], agents: [], locations: [] },
        flat: [],
        trending: TRENDING_SEARCHES,
      })
    }

    const cacheKey = `${normQ}:${filterType || 'all'}:${limit}`
    const cached = getFromCache(cacheKey)
    if (cached) {
      return NextResponse.json({ ...cached, cached: true }, {
        headers: { 'X-Cache': 'HIT' },
      })
    }

    const supabase = getAdminClient()

    // 1. Locations Search (instant synchronous local-first matching)
    const matchedLocations: OmniResultItem[] = searchLocations(cleanQ, 6)

    // 2. Parallel Supabase queries for listings and profiles
    const [listingsRes, profilesRes] = await Promise.all([
      supabase
        .from('listings')
        .select('id, title, description, price, city, neighborhood, address, rooms, area_m2, type, images, apartment_type, condition, is_featured, created_at, profiles:user_id(id, first_name, last_name, phone, avatar_url, email_verified)')
        .eq('is_active', true)
        .or(`title.ilike.%${cleanQ}%,city.ilike.%${cleanQ}%,neighborhood.ilike.%${cleanQ}%,address.ilike.%${cleanQ}%,description.ilike.%${cleanQ}%`)
        .limit(limit),

      supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, avatar_url, email_verified, created_at')
        .or(`first_name.ilike.%${cleanQ}%,last_name.ilike.%${cleanQ}%,phone.ilike.%${cleanQ}%`)
        .limit(limit),
    ])

    const rawListings = listingsRes.data || []
    const rawProfiles = profilesRes.data || []

    // 3. Process & score listings
    const matchedListings: OmniResultItem[] = rawListings.map((item: any) => {
      const normTitle = normalizeSearchString(item.title || '')
      const normCity = normalizeSearchString(item.city || '')
      const normHood = normalizeSearchString(item.neighborhood || '')

      let score = 30
      if (normTitle === normQ) score += 70
      else if (normTitle.startsWith(normQ)) score += 50
      else if (normTitle.includes(normQ)) score += 35

      if (normCity === normQ) score += 30
      else if (normCity.startsWith(normQ)) score += 20

      if (normHood.includes(normQ)) score += 20
      if (item.is_featured) score += 10

      const subtitleParts: string[] = []
      if (item.neighborhood) subtitleParts.push(`${item.neighborhood}, ${item.city}`)
      else if (item.city) subtitleParts.push(item.city)

      if (item.area_m2) subtitleParts.push(`${item.area_m2} m²`)
      if (item.apartment_type) subtitleParts.push(item.apartment_type)
      else if (item.rooms) subtitleParts.push(`${item.rooms} dhoma`)

      const seller = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles

      return {
        id: item.id,
        entityType: 'listing' as const,
        title: item.title,
        subtitle: subtitleParts.join(' • '),
        badge: item.type === 'shitje' ? 'Në shitje' : 'Me qira',
        imageUrl: Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null,
        price: Number(item.price) || 0,
        city: item.city,
        score,
        payload: {
          type: item.type,
          rooms: item.rooms,
          area_m2: item.area_m2,
          apartment_type: item.apartment_type,
          condition: item.condition,
          user_id: item.user_id,
          seller_name: seller ? `${seller.first_name || ''} ${seller.last_name || ''}`.trim() : undefined,
          seller_phone: seller?.phone,
        },
        targetUrl: `/listings/${item.id}`,
      }
    })

    // 4. Process & partition profiles into Agencies and Agents
    const matchedAgencies: OmniResultItem[] = []
    const matchedAgents: OmniResultItem[] = []

    for (const p of rawProfiles) {
      const isCompany = p.last_name === 'Kompani'
      const normFirst = normalizeSearchString(p.first_name || '')
      const normLast = normalizeSearchString(p.last_name || '')
      const normPhone = normalizeSearchString(p.phone || '')

      let score = 40
      if (normFirst === normQ) score += 60
      else if (normFirst.startsWith(normQ)) score += 40
      else if (normFirst.includes(normQ)) score += 25

      if (normLast.includes(normQ)) score += 20
      if (normPhone.includes(normQ)) score += 30
      if (p.email_verified) score += 10

      const displayName = isCompany
        ? p.first_name
        : `${p.first_name} ${p.last_name}`.trim() || 'Përdorues'

      const item: OmniResultItem = {
        id: p.id,
        entityType: isCompany ? ('agency' as const) : ('agent' as const),
        title: displayName,
        subtitle: isCompany
          ? 'Agjenci e Verifikuar e Patundshmërive'
          : 'Përdorues / Pronar i Verifikuar',
        badge: p.email_verified ? 'Verifikuar' : undefined,
        imageUrl: p.avatar_url || '/avatars/avatar-1.png',
        price: null,
        city: undefined,
        score,
        payload: {
          phone: p.phone,
          email_verified: p.email_verified,
          account_type: isCompany ? 'company' : 'individual',
          created_at: p.created_at,
        },
        targetUrl: `/profili/${p.id}`,
      }

      if (isCompany) {
        matchedAgencies.push(item)
      } else {
        matchedAgents.push(item)
      }
    }

    // 5. Combine and sort
    matchedListings.sort((a, b) => b.score - a.score)
    matchedAgencies.sort((a, b) => b.score - a.score)
    matchedAgents.sort((a, b) => b.score - a.score)

    let flatResults: OmniResultItem[] = [
      ...matchedLocations,
      ...matchedListings,
      ...matchedAgencies,
      ...matchedAgents,
    ].sort((a, b) => b.score - a.score)

    if (filterType) {
      flatResults = flatResults.filter((item) => item.entityType === filterType)
    }

    const responseData: OmniSearchResponse = {
      query: cleanQ,
      total: flatResults.length,
      counts: {
        listings: matchedListings.length,
        agencies: matchedAgencies.length,
        agents: matchedAgents.length,
        locations: matchedLocations.length,
      },
      results: {
        listings: matchedListings,
        agencies: matchedAgencies,
        agents: matchedAgents,
        locations: matchedLocations,
      },
      flat: flatResults.slice(0, limit),
      trending: TRENDING_SEARCHES,
    }

    setToCache(cacheKey, responseData)

    return NextResponse.json(responseData, {
      headers: { 'X-Cache': 'MISS' },
    })
  } catch (err: any) {
    console.error('Omni-search API error:', err)
    return NextResponse.json(
      {
        error: 'search_error',
        message: 'Ndodhi një gabim gjatë kërkimit.',
        query: '',
        total: 0,
        counts: { listings: 0, agencies: 0, agents: 0, locations: 0 },
        results: { listings: [], agencies: [], agents: [], locations: [] },
        flat: [],
        trending: TRENDING_SEARCHES,
      },
      { status: 500 }
    )
  }
}
