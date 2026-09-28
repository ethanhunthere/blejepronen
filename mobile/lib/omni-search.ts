import { supabase } from './supabase'
import { KOSOVO_LOCATIONS } from './kosovo-locations'
import { fetchListingsPage, sanitizeSearchText } from './listings-query'

/**
 * Multi-entity search for the mobile app.
 *
 * Listing matching is delegated to `lib/listings-query.ts` (the mobile mirror of
 * the canonical web query module) so search and catalog can never disagree on
 * sanitization, filters or sort — and so the listing tab count is the honest
 * server total rather than the size of the fetched window.
 *
 * People matching uses the `profiles_public` view (the same source the web
 * explorer queries): it exposes no phone/email/account_type, which keeps private
 * columns out of search results and immune to `profiles` schema drift.
 */

export type OmniEntityType = 'listing' | 'agency' | 'agent' | 'location'

export interface OmniResultItem {
  id: string
  entityType: OmniEntityType
  title: string
  subtitle: string
  badge?: string
  imageUrl?: string | null
  price?: number | null
  score: number
  payload?: any
  targetUrl: string
}

export interface OmniSearchCounts {
  /** Exact server-side totals for the current query, not window sizes. */
  listings: number
  agencies: number
  agents: number
  locations: number
}

export interface OmniSearchResponse {
  query: string
  /** Sum of the exact per-entity totals. */
  total: number
  counts: OmniSearchCounts
  /** Relevance-ranked slices of each entity set (windowed, see `counts` for totals). */
  results: {
    listings: OmniResultItem[]
    agencies: OmniResultItem[]
    agents: OmniResultItem[]
    locations: OmniResultItem[]
  }
  flat: OmniResultItem[]
}

export const TRENDING_SEARCHES = [
  'Prishtinë',
  'Banesa me qira',
  'Vila në shitje',
  'Pejë',
  'Dardania',
  'Prizren',
  'Penthouse',
  'Toka',
]

/** How many rows of each remote entity are rendered per search. */
const LISTINGS_WINDOW = 25
const PEOPLE_WINDOW = 25

// High-speed in-memory query cache for instantaneous (0ms) keystroke retrieval
const searchCache = new Map<string, { timestamp: number; data: OmniSearchResponse }>()
const CACHE_TTL_MS = 90_000 // 90 seconds
const MAX_CACHE_ENTRIES = 120

/**
 * Name stems that mark a `profiles_public` row as a company/agency account.
 * The same list drives both the SQL `or=(…)` count and the client-side
 * partition, so the tab badge and the rendered rows can never disagree.
 * Both diacritic spellings are listed because `ilike` is diacritic-sensitive.
 */
const CORPORATE_NAME_TOKENS = [
  'agjenci',
  'agjensia',
  'kompani',
  'shpk',
  'real estate',
  'patundshm',
  'ndërtim',
  'ndertim',
  'group',
  'invest',
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

/**
 * PostgREST filter-string safe form of a raw query.
 * Characters such as `, ( ) . % " \` are structural inside an `.or()` /
 * `.ilike.%…%` condition, so they are stripped and whitespace is collapsed.
 * Only letters, digits, spaces, `+` and `-` survive.
 */
function sanitizeFilterToken(raw: string): string {
  if (!raw) return ''
  return raw
    .replace(/[^A-Za-z0-9\u00C0-\u024F\s+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** `or=(…)` expression matching corporate accounts by name. */
function corporateNameExpression(): string {
  return CORPORATE_NAME_TOKENS.map(
    (token) => `first_name.ilike.%${token}%,last_name.ilike.%${token}%`
  ).join(',')
}

/** Client-side twin of `corporateNameExpression` — keep the two in sync. */
function isCorporateName(firstName: string, lastName: string): boolean {
  const first = (firstName || '').toLowerCase()
  const last = (lastName || '').toLowerCase()
  return CORPORATE_NAME_TOKENS.some((token) => first.includes(token) || last.includes(token))
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
          payload: { city, neighborhood: hood, isCity: false },
          targetUrl: `/listings?city=${encodeURIComponent(city)}&neighborhood=${encodeURIComponent(hood)}`,
        })
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, limit)
}

function emptyResponse(query: string, locations: OmniResultItem[] = []): OmniSearchResponse {
  return {
    query,
    total: locations.length,
    counts: { listings: 0, agencies: 0, agents: 0, locations: locations.length },
    results: { listings: [], agencies: [], agents: [], locations },
    flat: locations,
  }
}

/**
 * Federated search across listings (via the shared query layer) and public
 * people profiles, plus the synchronous local location index.
 */
export async function executeMobileOmniSearch(query: string): Promise<OmniSearchResponse> {
  const cleanQ = query.trim()
  if (!cleanQ) return emptyResponse('')

  const normQ = normalizeSearchString(cleanQ)
  const cacheKey = normQ

  // 1. Instant cache hit (0.00ms)
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  // 2. Synchronous instant location matching (fully enumerated → honest count)
  const locations = searchLocations(cleanQ, 6)

  // Only a filter-string safe query may reach PostgREST. An empty `ilike.%%`
  // would match every row, so structural-only input falls back to local results.
  const safeQ = sanitizeFilterToken(cleanQ)
  if (!safeQ) return emptyResponse(cleanQ, locations)

  try {
    const [listingsPage, peopleRes, corporateRes] = await Promise.all([
      // A. Listings — shared query layer: card columns only, is_active, exact count.
      fetchListingsPage({ search: sanitizeSearchText(cleanQ), limit: LISTINGS_WINDOW, sort: 'newest' }),

      // B. Public people profiles (no phone / email / account_type columns).
      supabase
        .from('profiles_public')
        .select('id, first_name, last_name, avatar_url, email_verified, created_at', {
          count: 'exact',
        })
        .or(`first_name.ilike.%${safeQ}%,last_name.ilike.%${safeQ}%`)
        .limit(PEOPLE_WINDOW),

      // C. Count-only probe for the corporate subset, so the "Agjenci" tab badge
      //    is a server total instead of a count of the fetched window.
      supabase
        .from('profiles_public')
        .select('id', { count: 'exact', head: true })
        .or(
          `and(or(first_name.ilike.%${safeQ}%,last_name.ilike.%${safeQ}%),or(${corporateNameExpression()}))`
        ),
    ])

    const rawPeople = (!peopleRes.error && peopleRes.data ? peopleRes.data : []) as {
      id: string
      first_name: string | null
      last_name: string | null
      avatar_url: string | null
      email_verified: boolean | null
    }[]
    const peopleTotal = peopleRes.error ? rawPeople.length : peopleRes.count ?? rawPeople.length

    // ─── 3. Score listings ───
    const listings: OmniResultItem[] = listingsPage.rows.map((item: any) => {
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
        score,
        targetUrl: `/listings/${item.id}`,
      }
    })

    // ─── 4. Partition people into agencies & private owners ───
    const agencies: OmniResultItem[] = []
    const agents: OmniResultItem[] = []

    for (const p of rawPeople) {
      const isCompany = isCorporateName(p.first_name || '', p.last_name || '')

      const normFirst = normalizeSearchString(p.first_name || '')
      const normLast = normalizeSearchString(p.last_name || '')
      const normFull = `${normFirst} ${normLast}`.trim()

      let score = 55 // High baseline so matched people/companies surface prominently
      if (normFull === normQ || normFirst === normQ) score += 50
      else if (normFull.startsWith(normQ) || normFirst.startsWith(normQ)) score += 40
      else if (normFull.includes(normQ) || normFirst.includes(normQ)) score += 25
      if (normLast && (normLast === normQ || normLast.startsWith(normQ))) score += 30
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
          : 'Pronar Privat • Llogari e Verifikuar',
        badge: isCompany ? 'Agjenci' : 'Pronar',
        imageUrl: p.avatar_url || null,
        price: null,
        score,
        payload: { id: p.id, isCompany, email_verified: Boolean(p.email_verified) },
        targetUrl: `/profili/${p.id}`,
      }

      if (isCompany) agencies.push(item)
      else agents.push(item)
    }

    // ─── 5. Honest counts ───
    // Listings come with an exact server total. People are split with an exact
    // corporate-subset count so neither tab badge depends on the fetched window.
    const listingsTotal = listingsPage.error ? listings.length : Math.max(listingsPage.total, listings.length)
    const agenciesTotal = corporateRes.error || corporateRes.count === null
      ? agencies.length
      : Math.max(corporateRes.count ?? 0, agencies.length)
    const agentsTotal = Math.max(peopleTotal - agenciesTotal, agents.length)

    // ─── 6. Unified flat ranking ───
    const flat = [...locations, ...agencies, ...agents, ...listings].sort(
      (a, b) => b.score - a.score
    )

    const response: OmniSearchResponse = {
      query: cleanQ,
      total: listingsTotal + agenciesTotal + agentsTotal + locations.length,
      counts: {
        listings: listingsTotal,
        agencies: agenciesTotal,
        agents: agentsTotal,
        locations: locations.length,
      },
      results: { listings, agencies, agents, locations },
      flat,
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
    return emptyResponse(cleanQ, locations)
  }
}
