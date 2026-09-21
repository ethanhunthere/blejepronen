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

interface RawListing {
  id: string
  title?: string | null
  city?: string | null
  neighborhood?: string | null
  is_featured?: boolean | null
  area_m2?: number | null
  apartment_type?: string | null
  rooms?: number | null
  profiles?: { first_name?: string | null; last_name?: string | null; phone?: string | null } | { first_name?: string | null; last_name?: string | null; phone?: string | null }[] | null
  type?: string | null
  images?: string[] | null
  price?: number | string | null
  condition?: string | null
  user_id?: string | null
}

interface RawProfile {
  id: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  avatar_url?: string | null
  city?: string | null
  is_company?: boolean | null
  account_type?: string | null
  verified?: boolean | null
  email_verified?: boolean | null
  created_at?: string | null
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

    // Build dynamic phone search filters if query contains numbers
    const digitsOnly = cleanQ.replace(/[^0-9]/g, '')
    const phoneFilters: string[] = []
    if (digitsOnly.length >= 2) {
      phoneFilters.push(`phone.ilike.%${digitsOnly}%`)
      if (digitsOnly.startsWith('0')) {
        phoneFilters.push(`phone.ilike.%${digitsOnly.slice(1)}%`)
      }
    }

    const isCorporateSearch = /agjenci|kompani|patundshm|real\s*estate|shpk|invest|group/i.test(normQ)

    const profileConditions: string[] = [
      `first_name.ilike.%${cleanQ}%`,
      `last_name.ilike.%${cleanQ}%`,
      ...phoneFilters,
    ]
    if (isCorporateSearch) {
      profileConditions.push('last_name.ilike.%Kompani%')
      profileConditions.push('first_name.ilike.%Agjenci%')
      profileConditions.push('first_name.ilike.%Kompani%')
    }

    // 2. Parallel Supabase queries for listings, profiles, and companies
    const [listingsRes, profilesRes, companiesRes] = await Promise.all([
      supabase
        .from('listings')
        .select('id, title, description, price, city, neighborhood, address, rooms, area_m2, type, images, apartment_type, condition, is_featured, created_at, profiles:user_id(id, first_name, last_name, phone, avatar_url, email_verified)')
        .eq('is_active', true)
        .or(`title.ilike.%${cleanQ}%,city.ilike.%${cleanQ}%,neighborhood.ilike.%${cleanQ}%,address.ilike.%${cleanQ}%,description.ilike.%${cleanQ}%`)
        .limit(limit),

      supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, avatar_url, email_verified, created_at')
        .or(profileConditions.join(','))
        .limit(limit),

      supabase
        .from('companies')
        .select('*')
        .or(`name.ilike.%${cleanQ}%,title.ilike.%${cleanQ}%,city.ilike.%${cleanQ}%,phone.ilike.%${cleanQ}%`)
        .limit(limit),
    ])

    const rawListings = listingsRes.data || []
    const rawProfiles = profilesRes.data || []
    const rawCompanies = (!companiesRes.error && Array.isArray(companiesRes.data)) ? companiesRes.data : []

    // 3. Process & score listings
    const matchedListings: OmniResultItem[] = (rawListings as unknown as RawListing[]).map((item) => {
      const normTitle = normalizeSearchString(item.title || '')
      const normCity = normalizeSearchString(item.city || '')
      const normHood = normalizeSearchString(item.neighborhood || '')

      let score = 40
      if (normTitle === normQ) score += 60
      else if (normTitle.startsWith(normQ)) score += 40
      else if (normTitle.includes(normQ)) score += 25

      if (normCity === normQ) score += 25
      else if (normCity.startsWith(normQ)) score += 15

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
        title: item.title || 'Pronë',
        subtitle: subtitleParts.join(' • '),
        badge: item.type === 'shitje' ? 'Në shitje' : 'Me qira',
        imageUrl: Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null,
        price: Number(item.price) || 0,
        city: item.city || undefined,
        score,
        payload: {
          // Supabase returns `type` as string|null — normalize to the payload union
          type: item.type === 'shitje' || item.type === 'qira' ? item.type : undefined,
          rooms: item.rooms ?? undefined,
          area_m2: item.area_m2 ?? undefined,
          apartment_type: item.apartment_type ?? undefined,
          condition: item.condition ?? undefined,
          user_id: item.user_id ?? undefined,
          seller_name: seller ? `${seller.first_name || ''} ${seller.last_name || ''}`.trim() || undefined : undefined,
          seller_phone: seller?.phone ?? undefined,
        },
        targetUrl: `/listings/${item.id}`,
      }
    })

    // 4. Process & partition profiles into Agencies and Agents
    const matchedAgencies: OmniResultItem[] = []
    const matchedAgents: OmniResultItem[] = []

    for (const p of (rawProfiles as unknown as RawProfile[])) {
      const isCompany =
        p.last_name === 'Kompani' ||
        /agjenci|kompani|shpk|real\s*estate|patundshm|ndertim|group|invest/i.test(p.first_name || '') ||
        /agjenci|kompani|shpk|real\s*estate|patundshm|ndertim|group|invest/i.test(p.last_name || '') ||
        Boolean(p.is_company) ||
        p.account_type === 'company'

      const normFirst = normalizeSearchString(p.first_name || '')
      const normLast = normalizeSearchString(p.last_name || '')
      const normFull = `${normFirst} ${normLast}`.trim()
      const normPhone = normalizeSearchString(p.phone || '')

      let score = 55
      if (normFull === normQ || normFirst === normQ) score += 50
      else if (normFull.startsWith(normQ) || normFirst.startsWith(normQ)) score += 40
      else if (normFull.includes(normQ) || normFirst.includes(normQ)) score += 25

      if (normLast && (normLast === normQ || normLast.startsWith(normQ))) score += 30
      if (normPhone && (normPhone.includes(normQ) || (digitsOnly && normPhone.includes(digitsOnly)))) score += 45
      if (p.email_verified) score += 10
      if (isCompany) score += 8

      const displayName = isCompany
        ? (p.first_name || p.last_name || 'Agjenci Imobiliare').trim()
        : `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Përdorues i Bleje Pronën'

      const item: OmniResultItem = {
        id: p.id,
        entityType: isCompany ? ('agency' as const) : ('agent' as const),
        title: displayName,
        subtitle: isCompany
          ? 'Agjenci e Licencuar e Patundshmërive'
          : (p.phone ? `Pronar Privat • ${p.phone}` : 'Pronar Privat • Llogari e Verifikuar'),
        badge: isCompany ? 'Agjenci' : 'Pronar',
        imageUrl: p.avatar_url || '/avatars/avatar-1.png',
        price: null,
        city: undefined,
        score,
        payload: {
          phone: p.phone || undefined,
          email_verified: Boolean(p.email_verified),
          id: p.id,
          isCompany,
          account_type: isCompany ? 'company' : 'individual',
          created_at: p.created_at || undefined,
        },
        targetUrl: `/profili/${p.id}`,
      }

      if (isCompany) {
        matchedAgencies.push(item)
      } else {
        matchedAgents.push(item)
      }
    }

    // 5. Process Companies table (if present)
    for (const c of rawCompanies) {
      const compName = (c.name || c.title || c.company_name || 'Agjenci Imobiliare').trim()
      const normComp = normalizeSearchString(compName)
      let score = 65
      if (normComp === normQ || normComp.startsWith(normQ)) score += 40
      else if (normComp.includes(normQ)) score += 25

      const item: OmniResultItem = {
        id: c.id,
        entityType: 'agency' as const,
        title: compName,
        subtitle: c.city ? `Agjenci Imobiliare në ${c.city}` : 'Agjenci e Licencuar e Patundshmërive',
        badge: 'Agjenci',
        imageUrl: c.logo_url || c.avatar_url || null,
        price: null,
        city: c.city || undefined,
        score,
        payload: {
          phone: c.phone,
          email_verified: true,
          id: c.id,
          isCompany: true,
          account_type: 'company',
        },
        targetUrl: `/profili/${c.id}`,
      }
      matchedAgencies.push(item)
    }

    // 6. Combine and sort
    matchedListings.sort((a, b) => b.score - a.score)
    matchedAgencies.sort((a, b) => b.score - a.score)
    matchedAgents.sort((a, b) => b.score - a.score)

    let flatResults: OmniResultItem[] = [
      ...matchedLocations,
      ...matchedAgencies,
      ...matchedAgents,
      ...matchedListings,
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
  } catch (err: unknown) {
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
