import AsyncStorage from '@react-native-async-storage/async-storage'
import { Listing } from './supabase'

const SHARED_LISTINGS_CACHE_KEY = '@blejepronen_shared_feed_listings_v3'
const LEGACY_HOME_KEY = '@blejepronen_home_listings_cache_v2'
const LEGACY_EXPLORE_KEY = '@blejepronen_explore_cache_v2'

let inMemoryListings: Listing[] = []
let isHydrated = false
let hydrationPromise: Promise<Listing[]> | null = null
const subscribers = new Set<(listings: Listing[]) => void>()

/**
 * Pre-hydrates the in-memory listings feed from persistent storage.
 * Bounded by a fast 80ms timeout so cold start is never blocked, while
 * ensuring frame-0 availability before the splash screen drops.
 */
export function waitForListingsCacheHydration(): Promise<Listing[]> {
  if (isHydrated) return Promise.resolve(inMemoryListings)
  if (hydrationPromise) return hydrationPromise

  hydrationPromise = (async () => {
    try {
      const stored = await Promise.race([
        AsyncStorage.getItem(SHARED_LISTINGS_CACHE_KEY),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 80)),
      ])

      let dataToUse: Listing[] | null = null
      let usedLegacyKey = false

      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            dataToUse = parsed
          }
        } catch {}
      }

      // Seamless migration from legacy separate cache keys
      if (!dataToUse) {
        try {
          const legacyExplore = await AsyncStorage.getItem(LEGACY_EXPLORE_KEY)
          if (legacyExplore) {
            const parsed = JSON.parse(legacyExplore)
            if (Array.isArray(parsed) && parsed.length > 0) {
              dataToUse = parsed
              usedLegacyKey = true
            }
          }
        } catch {}
      }

      if (!dataToUse) {
        try {
          const legacyHome = await AsyncStorage.getItem(LEGACY_HOME_KEY)
          if (legacyHome) {
            const parsed = JSON.parse(legacyHome)
            if (Array.isArray(parsed) && parsed.length > 0) {
              dataToUse = parsed
              usedLegacyKey = true
            }
          }
        } catch {}
      }

      if (dataToUse && inMemoryListings.length === 0) {
        inMemoryListings = dataToUse
        subscribers.forEach((fn) => fn(dataToUse!))

        if (usedLegacyKey) {
          // Promote the migrated payload to the shared key, then retire the legacy keys
          AsyncStorage.setItem(SHARED_LISTINGS_CACHE_KEY, JSON.stringify(inMemoryListings)).catch(
            () => {}
          )
          AsyncStorage.multiRemove([LEGACY_HOME_KEY, LEGACY_EXPLORE_KEY]).catch(() => {})
        }
      }
    } catch {
      // Non-fatal, continue with empty or in-memory cache
    } finally {
      isHydrated = true
    }
    return inMemoryListings
  })()

  return hydrationPromise
}

// Kick off hydration immediately upon bundle evaluation
waitForListingsCacheHydration().catch(() => {})

export function isListingsCacheHydrated(): boolean {
  return isHydrated
}

export function getCachedListings(): Listing[] {
  return inMemoryListings
}

export function hasCachedListings(): boolean {
  return inMemoryListings.length > 0
}

export function setCachedListings(data: Listing[]) {
  if (!Array.isArray(data) || data.length === 0) return
  inMemoryListings = data
  isHydrated = true
  subscribers.forEach((fn) => fn(data))
  AsyncStorage.setItem(SHARED_LISTINGS_CACHE_KEY, JSON.stringify(data)).catch(() => {})
}

export function getCachedListingById(id: string): Listing | null {
  if (!id) return null
  return inMemoryListings.find((l) => l.id === id) || null
}

export function updateCachedListing(updated: Listing) {
  if (!updated?.id) return
  const idx = inMemoryListings.findIndex((l) => l.id === updated.id)
  if (idx >= 0) {
    inMemoryListings[idx] = { ...inMemoryListings[idx], ...updated }
    subscribers.forEach((fn) => fn([...inMemoryListings]))
    AsyncStorage.setItem(SHARED_LISTINGS_CACHE_KEY, JSON.stringify(inMemoryListings)).catch(() => {})
  }
}

export function removeCachedListing(id: string) {
  if (!id) return
  const idx = inMemoryListings.findIndex((l) => l.id === id)
  if (idx >= 0) {
    inMemoryListings = inMemoryListings.filter((l) => l.id !== id)
    subscribers.forEach((fn) => fn([...inMemoryListings]))
    AsyncStorage.setItem(SHARED_LISTINGS_CACHE_KEY, JSON.stringify(inMemoryListings)).catch(() => {})
  }
}

export function subscribeCachedListings(fn: (listings: Listing[]) => void) {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}

// ─── L1/L2 Full Listing Detail Cache ──────────────────────────────────────────
const detailCache = new Map<string, Listing>()
const DETAIL_CACHE_MAX = 80

export function getCachedListingDetail(id: string): Listing | null {
  if (!id) return null
  return detailCache.get(id) || inMemoryListings.find((l) => l.id === id) || null
}

export function setCachedListingDetail(listing: Listing) {
  if (!listing?.id) return
  // Bound the cache: evict oldest insertion when full.
  if (detailCache.size >= DETAIL_CACHE_MAX && !detailCache.has(listing.id)) {
    const oldestKey = detailCache.keys().next().value
    if (oldestKey) detailCache.delete(oldestKey)
  }
  detailCache.set(listing.id, listing)
  updateCachedListing(listing)
}

// ─── Instant In-Memory Query Cache ───────────────────────────────────────────
const queryCache = new Map<string, { rows: Listing[]; total: number; timestamp: number }>()
const QUERY_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const QUERY_CACHE_MAX = 40

export function getCachedQueryListings(key: string): { rows: Listing[]; total: number } | null {
  if (!key) return null
  const entry = queryCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > QUERY_CACHE_TTL_MS) {
    queryCache.delete(key)
    return null
  }
  return { rows: entry.rows, total: entry.total }
}

export function setCachedQueryListings(key: string, result: { rows: Listing[]; total: number }) {
  if (!key || !result?.rows) return
  // Bound the cache: evict oldest insertion when full.
  if (queryCache.size >= QUERY_CACHE_MAX && !queryCache.has(key)) {
    const oldestKey = queryCache.keys().next().value
    if (oldestKey) queryCache.delete(oldestKey)
  }
  queryCache.set(key, { ...result, timestamp: Date.now() })
}

// ─── Optimistic Synchronous Filter Helper ────────────────────────────────────
// Enables frame-0 optimistic response when users toggle city chips or filters
import { CATEGORY_FILTER_TOKENS, type ListingsQueryParams } from './listings-query'

export function filterCachedListingsOptimistic(
  cached: Listing[],
  p: ListingsQueryParams = {}
): Listing[] {
  if (!cached || cached.length === 0) return []

  let matched = cached.filter((l) => {
    if (p.city && l.city && l.city.toLowerCase() !== p.city.toLowerCase()) {
      return false
    }
    if (p.type && l.type !== p.type) {
      return false
    }
    if (p.minPrice && l.price != null && l.price < Number(p.minPrice)) {
      return false
    }
    if (p.maxPrice && l.price != null && l.price > Number(p.maxPrice)) {
      return false
    }
    if (p.rooms && l.rooms != null && l.rooms < Number(p.rooms)) {
      return false
    }
    if (p.minArea && l.area_m2 != null && l.area_m2 < Number(p.minArea)) {
      return false
    }
    if (p.maxArea && l.area_m2 != null && l.area_m2 > Number(p.maxArea)) {
      return false
    }
    if (p.condition && l.condition && l.condition !== p.condition) {
      return false
    }
    if (p.featured && !l.is_featured) {
      return false
    }
    if (p.category && p.category !== 'all') {
      const tokens = CATEGORY_FILTER_TOKENS[p.category]
      if (tokens && tokens.length > 0) {
        const target = `${l.apartment_type || ''} ${l.condition || ''} ${l.title || ''}`.toLowerCase()
        const matches = tokens.some((t) => target.includes(t.toLowerCase()))
        if (!matches) return false
      }
    }
    if (p.search) {
      const q = p.search.toLowerCase()
      const haystack = `${l.title} ${l.city} ${l.neighborhood || ''} ${l.address || ''} ${l.description || ''}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  if (p.sort === 'price_asc') {
    matched.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
  } else if (p.sort === 'price_desc') {
    matched.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
  } else if (p.sort === 'area_asc') {
    matched.sort((a, b) => (a.area_m2 ?? 0) - (b.area_m2 ?? 0))
  } else if (p.sort === 'area_desc') {
    matched.sort((a, b) => (b.area_m2 ?? 0) - (a.area_m2 ?? 0))
  }

  return matched
}
