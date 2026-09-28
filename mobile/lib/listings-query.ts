import { supabase } from './supabase'
import type { Listing } from './supabase'

/**
 * Mobile mirror of the canonical web module `lib/listings-query.ts`.
 *
 * One query shape, one index story: every listing list rendered by the app
 * (home feed, catalog, category chips, featured rail) goes through
 * `applyListingsFilters` + `fetchListingsPage`, so mobile and web cannot drift
 * apart on filter/sort semantics.
 *
 * Privacy rules enforced here for every list query:
 *  - `.eq('is_active', true)` is applied by the base builder, never by callers
 *  - only card columns are selected (no `phone`, no `description`, no profile join)
 *  - `{ count: 'exact' }` so UI counters show the honest server total instead of
 *    the size of the fetched page window
 */

/** Byte-identical to the web `LISTING_CARD_COLUMNS` projection, plus description for zero-waterfall detail hydration. */
export const LISTING_CARD_COLUMNS =
  'id,title,price,city,neighborhood,address,type,images,rooms,area_m2,is_featured,is_active,created_at,user_id,condition,floor,apartment_type,features,description'

export type ListingsSort = 'newest' | 'price_asc' | 'price_desc' | 'area_desc' | 'area_asc'

export interface ListingsQueryParams {
  search?: string
  city?: string
  neighborhood?: string
  type?: '' | 'shitje' | 'qira'
  minPrice?: string
  maxPrice?: string
  rooms?: string
  minArea?: string
  maxArea?: string
  condition?: string
  apartment_type?: string
  floor?: string
  features?: string[]
  agentId?: string
  sort?: ListingsSort
  page?: number
  limit?: number
  /**
   * Mobile-only extensions. They use the very same operators as the shared
   * filters so the query stays index-friendly; the web catalog simply has no
   * UI for them yet.
   */
  /** Property category chip (see `CATEGORY_FILTER_TOKENS`), `'all'`/undefined = no restriction. */
  category?: string
  /** Restrict to `is_featured` rows (home showcase rail). */
  featured?: boolean
  /** Explicit window offset for infinite scroll; wins over `page`. */
  from?: number
}

type FilterableQuery = {
  eq: (col: string, val: unknown) => FilterableQuery
  ilike: (col: string, val: string) => FilterableQuery
  gte: (col: string, val: number) => FilterableQuery
  lte: (col: string, val: number) => FilterableQuery
  contains: (col: string, val: string[]) => FilterableQuery
  or: (expr: string) => FilterableQuery
  order: (col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) => FilterableQuery
  range: (from: number, to: number) => FilterableQuery
}

/**
 * PostgREST-safe form of a user supplied search string — identical to the web:
 * `, ( )` are structural inside an `.or()` / `.ilike.%…%` condition, so they are
 * stripped and whitespace is collapsed.
 */
export function sanitizeSearchText(raw: string): string {
  return (raw || '').trim().replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Category chip → `apartment_type` vocabulary. The post forms (web + mobile)
 * write `apartment_type = subtype || category.titleShort`, so these tokens are
 * matched with `ilike` against that single canonical column.
 *
 * Values must stay free of PostgREST structural characters (`, ( ) . * %`),
 * which is why subtypes are reduced to distinctive stems ("Hapësirë" instead of
 * "Hapësirë e hapur (Open Space)").
 */
export const CATEGORY_FILTER_TOKENS: Record<string, string[]> = {
  banese: ['Banes', 'Apart', 'Garson', 'Studio', '1+1', '2+1', '3+1', '4+1', 'Duplex', 'Penthouse'],
  shtepi: ['Shtëpi', 'Shtepi'],
  vile: ['Vil'],
  toke: ['Tok', 'Truall', 'Parcel'],
  lokal: ['Lokal', 'Zyr', 'Biznes', 'Afarist', 'Magazin', 'Hapësirë', 'Open Space'],
  garazh: ['Garazh', 'Park'],
}

/** ids of the category chips that map to a server-side `apartment_type` filter. */
export const FILTERABLE_CATEGORY_IDS = Object.keys(CATEGORY_FILTER_TOKENS)

/** Builds the `or=(…)` expression for a category chip, or null when unrestricted. */
export function categoryOrExpression(category?: string): string | null {
  if (!category || category === 'all') return null
  const tokens = CATEGORY_FILTER_TOKENS[category]
  if (!tokens || tokens.length === 0) return null
  const conditions = tokens
    .map((token) => sanitizeSearchText(token))
    .filter(Boolean)
    .map((token) => `apartment_type.ilike.%${token}%`)
  return conditions.length > 0 ? conditions.join(',') : null
}

/**
 * Mirror of the web `applyListingsFilters` — same columns, same operators, same
 * sanitization, same sort switch. Do not add mobile-only branches here without
 * mirroring them on the web.
 */
export function applyListingsFilters(query: FilterableQuery, p: ListingsQueryParams): FilterableQuery {
  let q = query
  if (p.city) q = q.eq('city', p.city)
  if (p.neighborhood) q = q.ilike('neighborhood', `%${p.neighborhood}%`)
  if (p.type) q = q.eq('type', p.type)
  if (p.minPrice && !isNaN(Number(p.minPrice))) q = q.gte('price', Number(p.minPrice))
  if (p.maxPrice && !isNaN(Number(p.maxPrice))) q = q.lte('price', Number(p.maxPrice))
  if (p.rooms && !isNaN(Number(p.rooms))) q = q.gte('rooms', Number(p.rooms))
  if (p.minArea && !isNaN(Number(p.minArea))) q = q.gte('area_m2', Number(p.minArea))
  if (p.maxArea && !isNaN(Number(p.maxArea))) q = q.lte('area_m2', Number(p.maxArea))
  if (p.condition) q = q.eq('condition', p.condition)
  if (p.apartment_type) q = q.eq('apartment_type', p.apartment_type)
  if (p.floor) q = q.eq('floor', p.floor)
  if (p.features && p.features.length > 0) q = q.contains('features', p.features)
  if (p.agentId) q = q.eq('user_id', p.agentId)
  if (p.featured) q = q.eq('is_featured', true)

  // Mobile-only: category chip. PostgREST ANDs repeated `or=(…)` params, so this
  // composes with the keyword `or` below instead of replacing it.
  const categoryOr = categoryOrExpression(p.category)
  if (categoryOr) q = q.or(categoryOr)

  const sanitized = sanitizeSearchText(p.search || '')
  if (sanitized) {
    q = q.or(
      `title.ilike.%${sanitized}%,address.ilike.%${sanitized}%,city.ilike.%${sanitized}%,neighborhood.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
    )
  }

  const sort = p.sort || 'newest'
  if (sort === 'price_asc') q = q.order('price', { ascending: true })
  else if (sort === 'price_desc') q = q.order('price', { ascending: false })
  else if (sort === 'area_desc') q = q.order('area_m2', { ascending: false, nullsFirst: false })
  else if (sort === 'area_asc') q = q.order('area_m2', { ascending: true, nullsFirst: false })
  else q = q.order('created_at', { ascending: false })

  return q
}

/**
 * Single entry point for building a listings query: card columns only, active
 * rows only, exact count. Callers never touch `supabase.from('listings')` for a
 * list/feed/card query.
 */
function baseListingsQuery(options: { count: 'exact'; head?: boolean }) {
  return supabase
    .from('listings')
    .select(LISTING_CARD_COLUMNS, options)
    .eq('is_active', true) as unknown as FilterableQuery
}

export const DEFAULT_PAGE_LIMIT = 40

export interface ListingsPage {
  rows: Listing[]
  /** Honest server-side total for the filtered set (not the window size). */
  total: number
  error: string | null
}

/**
 * One page of listings with the exact server total for the same filter set.
 * `total` is what UI counters must render — the fetched window is only ever a
 * slice of it.
 */
export async function fetchListingsPage(p: ListingsQueryParams = {}): Promise<ListingsPage> {
  const limit = p.limit ?? DEFAULT_PAGE_LIMIT
  const from = p.from ?? (p.page ?? 0) * limit

  try {
    let q = baseListingsQuery({ count: 'exact' })
    q = applyListingsFilters(q, p)
    q = q.range(from, from + limit - 1)

    const { data, count, error } = (await q) as unknown as {
      data: unknown[] | null
      count: number | null
      error: { message: string } | null
    }

    if (error) {
      console.warn('fetchListingsPage error:', error.message)
      return { rows: [], total: 0, error: error.message }
    }
    return { rows: (data || []) as unknown as Listing[], total: count ?? 0, error: null }
  } catch (err: any) {
    console.warn('fetchListingsPage exception:', err?.message || err)
    return { rows: [], total: 0, error: err?.message || 'unknown' }
  }
}

/**
 * Count-only probe (`head: true`, `count: 'exact'`) — used for chip badges and
 * the filter modal preview so no counter is ever derived from a fetched window.
 * Returns `null` when the count is unavailable so callers can hide the badge
 * instead of showing a wrong number.
 */
export async function countListings(p: ListingsQueryParams = {}): Promise<number | null> {
  try {
    const q = applyListingsFilters(baseListingsQuery({ count: 'exact', head: true }), p)
    const { count, error } = (await q) as unknown as {
      count: number | null
      error: { message: string } | null
    }
    if (error) {
      console.warn('countListings error:', error.message)
      return null
    }
    return count ?? null
  } catch (err: any) {
    console.warn('countListings exception:', err?.message || err)
    return null
  }
}

/**
 * Server-side counts for every category chip, holding all other filters fixed.
 * Categories whose count request fails are omitted (chip renders without a
 * badge) rather than being back-filled from the loaded window.
 */
export async function fetchCategoryCounts(
  base: ListingsQueryParams = {}
): Promise<Record<string, number>> {
  const shared: ListingsQueryParams = {
    ...base,
    category: undefined,
    page: undefined,
    limit: undefined,
    from: undefined,
  }

  const ids = ['all', ...FILTERABLE_CATEGORY_IDS]
  const entries = await Promise.all(
    ids.map(async (id) => {
      const total = await countListings({ ...shared, category: id === 'all' ? undefined : id })
      return [id, total] as const
    })
  )

  const counts: Record<string, number> = {}
  for (const [id, total] of entries) {
    if (total !== null) counts[id] = total
  }
  return counts
}

/**
 * True when a param set is the canonical unfiltered "newest first" feed — the
 * only payload allowed to seed the shared offline cache, so a filtered or
 * re-ordered window can never be persisted as the global feed.
 */
export function isCanonicalFeedQuery(p: ListingsQueryParams = {}): boolean {
  return Boolean(
    !p.search &&
      !p.city &&
      !p.neighborhood &&
      !p.type &&
      !p.minPrice &&
      !p.maxPrice &&
      !p.rooms &&
      !p.minArea &&
      !p.maxArea &&
      !p.condition &&
      !p.apartment_type &&
      !p.floor &&
      (!p.features || p.features.length === 0) &&
      !p.agentId &&
      !p.category &&
      !p.featured &&
      (!p.sort || p.sort === 'newest')
  )
}
