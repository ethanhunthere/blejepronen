import { supabase } from './supabase'
import { KOSOVO_LOCATIONS } from './kosovo-locations'
import { API_BASE_URL } from './api'

export type OmniEntityType = 'listing' | 'agency' | 'agent' | 'location'

export interface OmniResultItem {
  id: string
  entityType: OmniEntityType
  title: string
  subtitle: string
  badge?: string
  imageUrl?: string | null
  price?: number | null
  city?: string
  score: number
  payload?: any
  targetUrl: string
}

export interface OmniSearchResponse {
  query: string
  total: number
  counts: {
    listings: number
    agencies: number
    agents: number
    locations: number
  }
  results: {
    listings: OmniResultItem[]
    agencies: OmniResultItem[]
    agents: OmniResultItem[]
    locations: OmniResultItem[]
  }
  flat: OmniResultItem[]
  trending: string[]
}

export const TRENDING_SEARCHES = [
  'Prishtinë',
  'Banesa me qira',
  'Vila në shitje',
  'Pejë',
  'Dardania',
  'Prizren',
  'Penthouse',
  'Truall / Tokë',
]

export function normalizeSearchString(str: string): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ëË]/g, 'e')
    .replace(/[çÇ]/g, 'c')
    .trim()
}

export function searchLocations(query: string, limit = 6): OmniResultItem[] {
  const cleanQ = normalizeSearchString(query)
  if (!cleanQ || cleanQ.length < 2) return []

  const matches: OmniResultItem[] = []

  for (const [city, neighborhoods] of Object.entries(KOSOVO_LOCATIONS)) {
    const cleanCity = normalizeSearchString(city)
    if (cleanCity.includes(cleanQ)) {
      const isExact = cleanCity === cleanQ
      const startsWith = cleanCity.startsWith(cleanQ)
      matches.push({
        id: `loc-city-${city}`,
        entityType: 'location',
        title: city,
        subtitle: 'Qytet në Kosovë',
        badge: 'Qytet',
        score: isExact ? 100 : startsWith ? 85 : 60,
        city,
        payload: { city, isCity: true },
        targetUrl: `/listings?city=${encodeURIComponent(city)}`,
      })
    }

    for (const hood of neighborhoods) {
      const cleanHood = normalizeSearchString(hood)
      if (cleanHood.includes(cleanQ)) {
        const isExact = cleanHood === cleanQ
        const startsWith = cleanHood.startsWith(cleanQ)
        matches.push({
          id: `loc-hood-${city}-${hood}`,
          entityType: 'location',
          title: hood,
          subtitle: `Lagje në ${city}`,
          badge: city,
          score: isExact ? 95 : startsWith ? 80 : 55,
          city,
          payload: { city, neighborhood: hood, isCity: false },
          targetUrl: `/listings?city=${encodeURIComponent(city)}&neighborhood=${encodeURIComponent(hood)}`,
        })
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, limit)
}

/**
 * Executes a federated multi-entity search with network timeout and
 * offline resilient direct-to-Supabase fallback.
 */
export async function executeMobileOmniSearch(
  query: string,
  filterType?: string
): Promise<OmniSearchResponse> {
  const cleanQ = query.trim()
  if (!cleanQ) {
    return {
      query: '',
      total: 0,
      counts: { listings: 0, agencies: 0, agents: 0, locations: 0 },
      results: { listings: [], agencies: [], agents: [], locations: [] },
      flat: [],
      trending: TRENDING_SEARCHES,
    }
  }

  // 1. First attempt: call high-performance Next.js API route
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)

    const url = `${API_BASE_URL}/api/search?q=${encodeURIComponent(cleanQ)}${
      filterType ? `&type=${filterType}` : ''
    }&limit=25`

    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data: OmniSearchResponse = await res.json()
      if (data && data.results) {
        return data
      }
    }
  } catch (netErr) {
    // Graceful fallback to direct Supabase client query
  }

  // 2. Resilient Fallback: direct federated queries via Supabase client
  try {
    const normQ = normalizeSearchString(cleanQ)
    const locations = searchLocations(cleanQ, 5)

    const [listingsRes, profilesRes] = await Promise.all([
      supabase
        .from('listings')
        .select('id, title, price, city, neighborhood, type, images, area_m2, rooms, apartment_type')
        .eq('is_active', true)
        .or(`title.ilike.%${cleanQ}%,city.ilike.%${cleanQ}%,neighborhood.ilike.%${cleanQ}%,description.ilike.%${cleanQ}%`)
        .limit(20),

      supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, avatar_url, email_verified')
        .or(`first_name.ilike.%${cleanQ}%,last_name.ilike.%${cleanQ}%,phone.ilike.%${cleanQ}%`)
        .limit(20),
    ])

    const rawListings = listingsRes.data || []
    const rawProfiles = profilesRes.data || []

    const listings: OmniResultItem[] = rawListings.map((item: any) => {
      const normTitle = normalizeSearchString(item.title || '')
      let score = 30
      if (normTitle === normQ) score += 70
      else if (normTitle.startsWith(normQ)) score += 50
      else if (normTitle.includes(normQ)) score += 30

      return {
        id: item.id,
        entityType: 'listing',
        title: item.title,
        subtitle: `${item.neighborhood ? item.neighborhood + ', ' : ''}${item.city} • ${item.area_m2} m²`,
        badge: item.type === 'shitje' ? 'Në shitje' : 'Me qira',
        imageUrl: item.images?.[0] || null,
        price: Number(item.price) || 0,
        city: item.city,
        score,
        targetUrl: `/listings/${item.id}`,
      }
    })

    const agencies: OmniResultItem[] = []
    const agents: OmniResultItem[] = []

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
        : `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Përdorues'

      const item: OmniResultItem = {
        id: p.id,
        entityType: isCompany ? 'agency' : 'agent',
        title: displayName,
        subtitle: isCompany
          ? 'Agjenci e Verifikuar e Patundshmërive'
          : 'Llogari Personale • Pronar',
        badge: isCompany ? 'Kompani' : 'Pronar',
        imageUrl: p.avatar_url || null,
        price: null,
        score,
        payload: { phone: p.phone, email_verified: p.email_verified },
        targetUrl: `/listings?search=${encodeURIComponent(displayName)}`,
      }

      if (isCompany) agencies.push(item)
      else agents.push(item)
    }

    const flat = [...locations, ...listings, ...agencies, ...agents].sort(
      (a, b) => b.score - a.score
    )

    return {
      query: cleanQ,
      total: flat.length,
      counts: {
        listings: listings.length,
        agencies: agencies.length,
        agents: agents.length,
        locations: locations.length,
      },
      results: {
        listings,
        agencies,
        agents,
        locations,
      },
      flat,
      trending: TRENDING_SEARCHES,
    }
  } catch (err) {
    console.warn('Fallback search error:', err)
    return {
      query: cleanQ,
      total: 0,
      counts: { listings: 0, agencies: 0, agents: 0, locations: 0 },
      results: { listings: [], agencies: [], agents: [], locations: [] },
      flat: [],
      trending: TRENDING_SEARCHES,
    }
  }
}
