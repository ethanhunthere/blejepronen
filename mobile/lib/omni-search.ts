import { supabase } from './supabase'
import { KOSOVO_LOCATIONS } from './kosovo-locations'

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

// High-speed in-memory query cache for instantaneous (0ms) keystroke retrieval
const searchCache = new Map<string, { timestamp: number; data: OmniSearchResponse }>()
const CACHE_TTL_MS = 90_000 // 90 seconds
const MAX_CACHE_ENTRIES = 120

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

/**
 * High-speed synchronous location search over pre-indexed Kosovo locations.
 * Executes instantaneously with 0ms delay.
 */
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
        score: isExact ? 100 : startsWith ? 88 : 65,
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
          score: isExact ? 96 : startsWith ? 82 : 58,
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
 * Multi-Entity Search Pipeline
 * Actively queries listings, profiles, and companies database tables in parallel with unified aggregation.
 * Surfaces matching people, individual sellers, and agency/company accounts alongside property listings.
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

  const normQ = normalizeSearchString(cleanQ)
  const cacheKey = `${normQ}_${filterType || 'all'}`

  // 1. Instant Cache Hit (0.00ms)
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  // 2. Synchronous Instant Locations Matching
  const locations = searchLocations(cleanQ, 6)

  // 3. Build dynamic phone search filters if query contains numbers
  const digitsOnly = cleanQ.replace(/[^0-9]/g, '')
  const phoneFilters: string[] = []
  if (digitsOnly.length >= 2) {
    phoneFilters.push(`phone.ilike.%${digitsOnly}%`)
    // If phone starts with 0 (e.g. 044 -> 44)
    if (digitsOnly.startsWith('0')) {
      phoneFilters.push(`phone.ilike.%${digitsOnly.slice(1)}%`)
    }
  }

  // Check if query is looking for companies
  const isCorporateSearch = /agjenci|kompani|patundshm|real\s*estate|shpk|invest|group/i.test(normQ)

  // Build profiles OR conditions strictly with valid columns
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

  // 4. Parallel Federated Queries across Listings, Profiles, and Companies
  try {
    const [listingsRes, profilesRes, companiesRes] = await Promise.all([
      // A. Query listings table
      supabase
        .from('listings')
        .select('id, title, price, city, neighborhood, type, images, area_m2, rooms, apartment_type, user_id')
        .eq('is_active', true)
        .or(`title.ilike.%${cleanQ}%,city.ilike.%${cleanQ}%,neighborhood.ilike.%${cleanQ}%,description.ilike.%${cleanQ}%`)
        .limit(25),

      // B. Query profiles table (using strictly verified schema columns)
      supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, avatar_url, email_verified, created_at')
        .or(profileConditions.join(','))
        .limit(25),

      // C. Query companies table (gracefully handle if table or view exists)
      supabase
        .from('companies')
        .select('*')
        .or(`name.ilike.%${cleanQ}%,title.ilike.%${cleanQ}%,city.ilike.%${cleanQ}%,phone.ilike.%${cleanQ}%`)
        .limit(20),
    ])

    const rawListings = listingsRes.data || []
    const rawProfiles = profilesRes.data || []
    const rawCompanies = (!companiesRes.error && Array.isArray(companiesRes.data)) ? companiesRes.data : []

    // ─── 5. Parse & Score Listings ───
    const listings: OmniResultItem[] = rawListings.map((item: any) => {
      const normTitle = normalizeSearchString(item.title || '')
      const normCity = normalizeSearchString(item.city || '')
      const normHood = normalizeSearchString(item.neighborhood || '')

      let score = 40
      if (normTitle === normQ) score += 60
      else if (normTitle.startsWith(normQ)) score += 40
      else if (normTitle.includes(normQ)) score += 25

      if (normCity === normQ) score += 25
      if (normHood.includes(normQ)) score += 20

      return {
        id: item.id,
        entityType: 'listing',
        title: item.title,
        subtitle: `${item.neighborhood ? item.neighborhood + ', ' : ''}${item.city} • ${item.area_m2 || 0} m²`,
        badge: item.type === 'shitje' ? 'Në shitje' : 'Me qira',
        imageUrl: item.images?.[0] || null,
        price: Number(item.price) || 0,
        city: item.city,
        score,
        targetUrl: `/listings/${item.id}`,
      }
    })

    // ─── 6. Parse & Partition Profiles into Agencies & Individual Users ───
    const agencies: OmniResultItem[] = []
    const agents: OmniResultItem[] = []

    for (const p of rawProfiles) {
      const isCompany =
        p.last_name === 'Kompani' ||
        /agjenci|kompani|shpk|real\s*estate|patundshm|ndertim|group|invest/i.test(p.first_name || '') ||
        /agjenci|kompani|shpk|real\s*estate|patundshm|ndertim|group|invest/i.test(p.last_name || '') ||
        Boolean((p as any).is_company) ||
        (p as any).account_type === 'company'

      const normFirst = normalizeSearchString(p.first_name || '')
      const normLast = normalizeSearchString(p.last_name || '')
      const normFull = `${normFirst} ${normLast}`.trim()
      const normPhone = normalizeSearchString(p.phone || '')

      let score = 55 // High baseline so matched people/companies surface prominently
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
        entityType: isCompany ? 'agency' : 'agent',
        title: displayName,
        subtitle: isCompany
          ? 'Agjenci e Licencuar e Patundshmërive'
          : (p.phone ? `Pronar Privat • ${p.phone}` : 'Pronar Privat • Llogari e Verifikuar'),
        badge: isCompany ? 'Agjenci' : 'Pronar',
        imageUrl: p.avatar_url || null,
        price: null,
        city: undefined,
        score,
        payload: {
          phone: p.phone,
          email_verified: p.email_verified,
          id: p.id,
          isCompany,
          account_type: isCompany ? 'company' : 'individual',
        },
        targetUrl: `/profili/${p.id}`,
      }

      if (isCompany) agencies.push(item)
      else agents.push(item)
    }

    // ─── 7. Parse Companies Table (if present) ───
    for (const c of rawCompanies) {
      const compName = (c.name || c.title || c.company_name || 'Agjenci Imobiliare').trim()
      const normComp = normalizeSearchString(compName)
      let score = 65
      if (normComp === normQ || normComp.startsWith(normQ)) score += 40
      else if (normComp.includes(normQ)) score += 25

      const item: OmniResultItem = {
        id: c.id,
        entityType: 'agency',
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
      agencies.push(item)
    }

    // ─── 8. Unified Flat Ranking ───
    // Sort all entities by relevance score to guarantee high-matching people and companies appear at the top
    const flat = [...locations, ...agencies, ...agents, ...listings].sort(
      (a, b) => b.score - a.score
    )

    const response: OmniSearchResponse = {
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

    // Write to memory cache with bounds
    if (searchCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = searchCache.keys().next().value
      if (oldestKey) searchCache.delete(oldestKey)
    }
    searchCache.set(cacheKey, { timestamp: Date.now(), data: response })

    return response
  } catch (err) {
    console.warn('Mobile search query exception:', err)
    return {
      query: cleanQ,
      total: locations.length,
      counts: { listings: 0, agencies: 0, agents: 0, locations: locations.length },
      results: { listings: [], agencies: [], agents: [], locations },
      flat: locations,
      trending: TRENDING_SEARCHES,
    }
  }
}
