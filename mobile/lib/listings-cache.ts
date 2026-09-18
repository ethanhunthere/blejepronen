import AsyncStorage from '@react-native-async-storage/async-storage'
import { Listing } from './supabase'

const SHARED_LISTINGS_CACHE_KEY = '@blejepronen_shared_feed_listings_v3'

let inMemoryListings: Listing[] = []
let isHydrated = false
const subscribers = new Set<(listings: Listing[]) => void>()

// Immediately pre-hydrate in-memory cache from persistent disk storage
AsyncStorage.getItem(SHARED_LISTINGS_CACHE_KEY)
  .then((stored) => {
    if (stored && inMemoryListings.length === 0) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryListings = parsed
          isHydrated = true
          subscribers.forEach((fn) => fn(parsed))
        }
      } catch {}
    }
  })
  .catch(() => {})

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
