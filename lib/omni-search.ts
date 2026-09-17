import { KOSOVO_LOCATIONS } from './kosovo-locations'

export type OmniEntityType = 'listing' | 'agency' | 'agent' | 'location'

export interface OmniListingPayload {
  type?: 'shitje' | 'qira'
  rooms?: number
  area_m2?: number
  apartment_type?: string
  condition?: string
  features?: string[]
  user_id?: string
  seller_name?: string
  seller_phone?: string
}

export interface OmniProfilePayload {
  phone?: string
  email_verified?: boolean
  account_type?: 'individual' | 'company'
  created_at?: string
  company_description?: string
  founded_year?: string
  listings_count?: number
}

export interface OmniLocationPayload {
  city: string
  neighborhood?: string
  isCity: boolean
  listingCount?: number
}

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
  payload?: OmniListingPayload | OmniProfilePayload | OmniLocationPayload
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
  cached?: boolean
}

/**
 * Normalizes text for typo-tolerant, accent-insensitive search.
 * Converts 'ë' -> 'e', 'ç' -> 'c', removes multiple spaces, etc.
 */
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
 * Curated trending queries for instant discovery recommendations.
 */
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

/**
 * Resolves matching Kosovo locations (cities & neighborhoods) for a given query.
 */
export function searchLocations(query: string, limit = 6): OmniResultItem[] {
  const cleanQ = normalizeSearchString(query)
  if (!cleanQ || cleanQ.length < 2) return []

  const matches: OmniResultItem[] = []

  // Check matching cities
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
        payload: {
          city,
          isCity: true,
        },
        targetUrl: `/listings?city=${encodeURIComponent(city)}`,
      })
    }

    // Check matching neighborhoods
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
          payload: {
            city,
            neighborhood: hood,
            isCity: false,
          },
          targetUrl: `/listings?city=${encodeURIComponent(city)}&neighborhood=${encodeURIComponent(hood)}`,
        })
      }
    }
  }

  // Sort by score and cap to limit
  return matches.sort((a, b) => b.score - a.score).slice(0, limit)
}
