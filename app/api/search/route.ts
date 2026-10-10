import { NextResponse } from 'next/server'
import { createPublicSupabaseClient } from '@/lib/supabase'
import {
  buildIlikeOr,
  buildOrFilter,
  sanitizeSearchTerm,
} from '@/lib/search-sanitize'
import {
  OmniSearchResponse,
  OmniResultItem,
  searchLocations,
  normalizeSearchString,
  TRENDING_SEARCHES,
} from '@/lib/omni-search'

/**
 * GET /api/search — federated omni-search.
 *
 * Hardened for audit findings C5 (PostgREST injection) and C6 (privacy):
 *
 *  C5 — every user-supplied term passes through `sanitizeSearchTerm()` before it
 *  is interpolated into a `.or(...)` / `ilike` filter. The old code embedded the
 *  raw `q` parameter, so `?q=prishtine,price.gt.0` appended conditions and
 *  `?q=%` turned the endpoint into a full-table scanner.
 *
 *  C6 — the endpoint now runs on the anon/public client instead of the service
 *  role, so Postgres RLS is the access boundary rather than a comment in this
 *  file. No phone number is selected, scored or returned for any entity:
 *  listings keep `seller_name` only, and searching by phone fragment (which let
 *  an anonymous caller harvest numbers one digit at a time) is gone.
 *
 * Both queries are drift-proof: the profiles read prefers the `profiles_public`
 * view and falls back to the table, and the listings read retries without the
 * embedded seller when the embed is not readable for anon. A rejected relation
 * degrades to "no results for that entity", never to a 500.
 */

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

function emptyResponse(query: string): OmniSearchResponse {
  return {
    query,
    total: 0,
    counts: { listings: 0, agencies: 0, agents: 0, locations: 0 },
    results: { listings: [], agencies: [], agents: [], locations: [] },
    flat: [],
    trending: TRENDING_SEARCHES,
  }
}

/**
 * Listing columns for search results. `description` and `address` stay out of
 * the projection (they are only needed as filter targets) — they are long, they
 * are not rendered by the search UI, and every byte here is cached.
 *
 * NOTE: no `phone` anywhere. The seller embed deliberately selects name/avatar
 * only; contact details are resolved on the listing page, not in search.
 */
const LISTING_COLUMNS =
  'id, title, price, city, neighborhood, rooms, area_m2, type, images, apartment_type, condition, is_featured, created_at, user_id'
const SELLER_EMBED = ', profiles:user_id(id, first_name, last_name, avatar_url, email_verified)'

/** Public, non-contact profile columns. Never add phone/email here. */
const PROFILE_COLUMNS = 'id, first_name, last_name, avatar_url, email_verified, created_at'

interface RawListing {
  id: string
  title?: string | null
  city?: string | null
  neighborhood?: string | null
  is_featured?: boolean | null
  area_m2?: number | null
  apartment_type?: string | null
  rooms?: number | null
  profiles?: RawSeller | RawSeller[] | null
  type?: string | null
  images?: string[] | null
  price?: number | string | null
  condition?: string | null
  user_id?: string | null
}

interface RawSeller {
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
  email_verified?: boolean | null
}

interface RawProfile {
  id: string
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
  created_at?: string | null
  email_verified?: boolean | null
}

interface RawCompany {
  id: string
  name?: string | null
  title?: string | null
  company_name?: string | null
  city?: string | null
  logo_url?: string | null
  avatar_url?: string | null
}

const CORPORATE_QUERY_RE = /agjenci|kompani|patundshm|real\s*estate|shpk|invest|group/i
const CORPORATE_NAME_RE = /agjenci|kompani|shpk|real\s*estate|patundshm|ndertim|group|invest/i

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawQuery = searchParams.get('q') || searchParams.get('query') || ''
    const filterType = searchParams.get('type') // 'listing' | 'agency' | 'agent' | 'location'

    const parsedLimit = Number.parseInt(searchParams.get('limit') || '20', 10)
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 20

    // --- C5: sanitize once, use everywhere ---------------------------------
    const safeQuery = sanitizeSearchTerm(rawQuery)

    if (!safeQuery) {
      return NextResponse.json(emptyResponse(''))
    }

    const normQ = normalizeSearchString(safeQuery)
    // Cache key is built from the *sanitized* term, so syntax-only variants
    // (`%`, `,`, quotes) collapse onto one entry instead of filling the cache.
    const cacheKey = `${normQ}:${filterType || 'all'}:${limit}`
    const cached = getFromCache(cacheKey)
    if (cached) {
      return NextResponse.json({ ...cached, cached: true }, {
        headers: { 'X-Cache': 'HIT' },
      })
    }

    // --- C6: anon client, RLS is the boundary ------------------------------
    const supabase = createPublicSupabaseClient()

    // 1. Locations Search (instant synchronous local-first matching)
    const matchedLocations: OmniResultItem[] = searchLocations(safeQuery, 6)

    const isCorporateSearch = CORPORATE_QUERY_RE.test(normQ)

    const profileConditions = buildIlikeOr(safeQuery, ['first_name', 'last_name'])
    const profileFilter = profileConditions
      ? buildOrFilter(
          isCorporateSearch
            ? [
                profileConditions,
                'last_name.ilike.%Kompani%',
                'first_name.ilike.%Agjenci%',
                'first_name.ilike.%Kompani%',
              ]
            : [profileConditions]
        )
      : null

    const listingFilter = buildIlikeOr(safeQuery, [
      'title',
      'city',
      'neighborhood',
      'address',
      'description',
    ])

    const companyFilter = buildIlikeOr(safeQuery, ['name', 'title', 'city'])

    // 2. Parallel queries. Each one is independent and error-tolerant: a
    // relation the anon role cannot read yields an empty result set for that
    // entity type instead of failing the whole search.
    const [listingsRes, profilesRes, companiesRes] = await Promise.all([
      (async () => {
        if (!listingFilter) return null
        const withSeller = await supabase
          .from('listings')
          .select(LISTING_COLUMNS + SELLER_EMBED)
          .eq('is_active', true)
          .or(listingFilter)
          .limit(limit)

        if (!withSeller.error) return withSeller

        // The embedded profiles resource is not readable for anon until the
        // public-profile migration is applied — retry without it so listing
        // results survive.
        return supabase
          .from('listings')
          .select(LISTING_COLUMNS)
          .eq('is_active', true)
          .or(listingFilter)
          .limit(limit)
      })(),

      (async () => {
        if (!profileFilter) return null
        // Prefer the non-sensitive view; fall back to the table for deployments
        // where the view has not been created yet.
        const viaView = await supabase
          .from('profiles_public')
          .select(PROFILE_COLUMNS)
          .or(profileFilter)
          .limit(limit)

        if (!viaView.error) return viaView

        return supabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .or(profileFilter)
          .limit(limit)
      })(),

      companyFilter
        ? supabase.from('companies').select('*').or(companyFilter).limit(limit)
        : Promise.resolve(null),
    ])

    if (listingsRes?.error) {
      console.warn('omni-search listings error:', listingsRes.error.message)
    }
    if (profilesRes?.error) {
      console.warn('omni-search profiles error:', profilesRes.error.message)
    }

    const rawListings = (listingsRes?.data ?? []) as unknown as RawListing[]
    const rawProfiles = (profilesRes?.data ?? []) as unknown as RawProfile[]
    const rawCompanies =
      companiesRes && !companiesRes.error && Array.isArray(companiesRes.data)
        ? (companiesRes.data as unknown as RawCompany[])
        : []

    // 3. Process & score listings
    const matchedListings: OmniResultItem[] = rawListings.map((item) => {
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
          // C6: seller *name* stays, seller phone is gone from anonymous search.
          seller_name: seller
            ? `${seller.first_name || ''} ${seller.last_name || ''}`.trim() || undefined
            : undefined,
        },
        targetUrl: `/listings/${item.id}`,
      }
    })

    // 4. Process & partition profiles into Agencies and Agents
    const matchedAgencies: OmniResultItem[] = []
    const matchedAgents: OmniResultItem[] = []

    for (const p of rawProfiles) {
      const isCompany =
        p.last_name === 'Kompani' ||
        CORPORATE_NAME_RE.test(p.first_name || '') ||
        CORPORATE_NAME_RE.test(p.last_name || '')

      const normFirst = normalizeSearchString(p.first_name || '')
      const normLast = normalizeSearchString(p.last_name || '')
      const normFull = `${normFirst} ${normLast}`.trim()

      let score = 55
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
        entityType: isCompany ? ('agency' as const) : ('agent' as const),
        title: displayName,
        subtitle: isCompany
          ? 'Agjenci'
          : p.email_verified
            ? 'Pronar Privat • Llogari e Verifikuar'
            : 'Pronar Privat',
        badge: isCompany ? 'Agjenci' : 'Pronar',
        imageUrl: p.avatar_url || '/avatars/avatar-1.png',
        price: null,
        city: undefined,
        score,
        payload: {
          // C6: no phone. Contact details live behind the listing/profile page.
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
          // Legacy companies rows carry no verification state — never mint one.
          email_verified: false,
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
      ...emptyResponse(safeQuery),
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
        ...emptyResponse(''),
      },
      { status: 500 }
    )
  }
}
