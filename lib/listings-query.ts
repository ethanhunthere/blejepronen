import { createPublicSupabaseClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'

export const LISTING_CARD_COLUMNS =
  'id,title,price,city,neighborhood,address,type,images,rooms,area_m2,is_featured,is_active,created_at,user_id,condition,floor,apartment_type,features'

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
 * Single source of truth for catalog filtering/sorting, shared by the
 * server-rendered catalog page, programmatic hubs, and (semantically) the
 * client explorer — one query shape, one index story, no drift.
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

  const rawSearch = (p.search || '').trim()
  if (rawSearch) {
    const sanitized = rawSearch.replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim()
    if (sanitized) {
      q = q.or(
        `title.ilike.%${sanitized}%,address.ilike.%${sanitized}%,city.ilike.%${sanitized}%,neighborhood.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
      )
    }
  }

  const sort = p.sort || 'newest'
  if (sort === 'price_asc') q = q.order('price', { ascending: true })
  else if (sort === 'price_desc') q = q.order('price', { ascending: false })
  else if (sort === 'area_desc') q = q.order('area_m2', { ascending: false, nullsFirst: false })
  else if (sort === 'area_asc') q = q.order('area_m2', { ascending: true, nullsFirst: false })
  else q = q.order('created_at', { ascending: false })

  return q
}

export async function fetchListingsServer(
  p: ListingsQueryParams
): Promise<{ rows: Listing[]; total: number }> {
  const supabase = createPublicSupabaseClient()
  const page = p.page ?? 0
  const limit = p.limit ?? 12

  let query = supabase
    .from('listings')
    .select(LISTING_CARD_COLUMNS, { count: 'exact' })
    .eq('is_active', true) as unknown as FilterableQuery

  query = applyListingsFilters(query, p)
  query = query.range(page * limit, (page + 1) * limit - 1)

  const { data, count, error } = (await query) as unknown as {
    data: Listing[] | null
    count: number | null
    error: { message: string } | null
  }

  if (error) {
    console.error('fetchListingsServer error:', error.message)
    return { rows: [], total: 0 }
  }
  return { rows: (data || []) as Listing[], total: count ?? 0 }
}

/** Municipality-level market statistics computed from live inventory (GEO entity data). */
export async function fetchMarketStats(city: string | null): Promise<{
  total: number
  forSale: number
  forRent: number
  medianSalePpm2: number | null
  minSale: number | null
  maxSale: number | null
  neighborhoods: { name: string; count: number }[]
  latestUpdate: string | null
} | null> {
  const supabase = createPublicSupabaseClient()
  let query = supabase
    .from('listings')
    .select('price, area_m2, type, neighborhood, updated_at, created_at', { count: 'exact' })
    .eq('is_active', true)
  if (city) query = query.eq('city', city)

  const { data, count, error } = await query
  if (error || !data) return null

  const sale = data.filter((r) => r.type === 'shitje' && r.price && r.price > 0)
  const rent = data.filter((r) => r.type === 'qira')
  const ppms = sale
    .filter((r) => r.area_m2 && r.area_m2 > 0)
    .map((r) => r.price / r.area_m2)
    .sort((a, b) => a - b)
  const median = ppms.length ? ppms[Math.floor(ppms.length / 2)] : null

  const byHood = new Map<string, number>()
  for (const r of data) {
    const key = (r.neighborhood || '').trim()
    if (!key) continue
    byHood.set(key, (byHood.get(key) || 0) + 1)
  }
  const neighborhoods = [...byHood.entries()]
    .map(([name, cnt]) => ({ name, count: cnt }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  const latest = data.reduce<string | null>(
    (acc, r) => (!acc || (r.updated_at || r.created_at || '') > acc ? (r.updated_at || r.created_at || acc) : acc),
    null
  )

  return {
    total: count ?? data.length,
    forSale: sale.length,
    forRent: rent.length,
    medianSalePpm2: median ? Math.round(median) : null,
    minSale: sale.length ? Math.min(...sale.map((r) => r.price)) : null,
    maxSale: sale.length ? Math.max(...sale.map((r) => r.price)) : null,
    neighborhoods,
    latestUpdate: latest,
  }
}
