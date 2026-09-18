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
            }
          }
        } catch {}
      }

      if (dataToUse && inMemoryListings.length === 0) {
        inMemoryListings = dataToUse
        subscribers.forEach((fn) => fn(dataToUse!))
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

export function subscribeCachedListings(fn: (listings: Listing[]) => void) {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}
