import AsyncStorage from '@react-native-async-storage/async-storage'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { getSyncAuthUser, subscribeAuthCache } from './auth-cache'

/**
 * Enterprise-grade Reactive Favorites Store:
 * 1. Synchronous In-Memory Map (0ms read time for FlatLists & cards)
 * 2. Cross-Screen Reactive Subscription Bus (Single frame update across Home, Listings, Detail, Profile)
 * 3. Guest Authorization Guard (Strict rejection for unauthenticated users, preventing orphaned local state)
 * 4. Deterministic Bidirectional Heart & Unheart Lifecycle (Atomic UPSERT on like, DELETE on unlike)
 * 5. SWR Background Hydration & Rollback on Network Failure
 */

const FAVORITES_CACHE_KEY = '@blejepronen_favs_map_v2'
let inMemoryFavorites: Record<string, boolean> | null = null
let isRevalidating = false
/** Monotonic generation token: a revalidate that started before a local
 *  toggle must not overwrite the optimistic state with a stale server map. */
let revalidateGeneration = 0
const subscribers = new Set<(favs: Record<string, boolean>) => void>()

// Automatically synchronize favorites lifecycle with user authentication state
subscribeAuthCache((state) => {
  if (!state.user) {
    inMemoryFavorites = {}
    notifySubscribers()
  } else {
    // When a user logs in or switches, refresh favorites
    fetchFavoriteIds().catch(() => {})
  }
})

function notifySubscribers() {
  const snapshot = { ...(inMemoryFavorites || {}) }
  subscribers.forEach((fn) => {
    try {
      fn(snapshot)
    } catch (err) {
      console.warn('Favorite subscriber notice:', err)
    }
  })
}

export function subscribeFavorites(callback: (favs: Record<string, boolean>) => void): () => void {
  subscribers.add(callback)
  return () => {
    subscribers.delete(callback)
  }
}

export function getFavoritesMap(): Record<string, boolean> {
  return inMemoryFavorites ? { ...inMemoryFavorites } : {}
}

export function isListingFavorite(listingId: string): boolean {
  return Boolean(inMemoryFavorites?.[listingId])
}

async function backgroundRevalidateFavorites(userId: string) {
  if (isRevalidating) return
  isRevalidating = true
  const generation = ++revalidateGeneration
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId)

    // A newer revalidate or a local toggle started while this request was in
    // flight — discard the stale server map rather than clobber optimistic UI.
    if (generation !== revalidateGeneration) return

    if (!error && data) {
      const freshMap: Record<string, boolean> = {}
      for (const row of data as Array<{ listing_id: string }>) {
        freshMap[row.listing_id] = true
      }
      inMemoryFavorites = freshMap
      notifySubscribers()
      AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(freshMap)).catch(() => {})
    }
  } catch (err) {
    // Silent background catch
  } finally {
    if (generation === revalidateGeneration) {
      isRevalidating = false
    }
  }
}

export function clearFavoritesCache() {
  inMemoryFavorites = {}
  notifySubscribers()
  AsyncStorage.removeItem(FAVORITES_CACHE_KEY).catch(() => {})
}

export async function fetchFavoriteIds(): Promise<Record<string, boolean>> {
  // 1. Instant 0ms in-memory cache return
  if (inMemoryFavorites !== null) {
    const syncUser = getSyncAuthUser()
    if (syncUser) {
      backgroundRevalidateFavorites(syncUser.id)
    } else {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) backgroundRevalidateFavorites(user.id)
      }).catch(() => {})
    }
    return inMemoryFavorites
  }

  // 2. Sub-5ms local storage cache return
  try {
    const local = await AsyncStorage.getItem(FAVORITES_CACHE_KEY)
    if (local) {
      inMemoryFavorites = JSON.parse(local)
      notifySubscribers()
      const syncUser = getSyncAuthUser()
      if (syncUser) {
        backgroundRevalidateFavorites(syncUser.id)
      } else {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) backgroundRevalidateFavorites(user.id)
        }).catch(() => {})
      }
      return inMemoryFavorites!
    }
  } catch {}

  // 3. First-run network fetch
  try {
    const user = getSyncAuthUser() || (await supabase.auth.getUser()).data.user
    if (!user) {
      inMemoryFavorites = {}
      notifySubscribers()
      return {}
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', user.id)

    if (error) throw error

    const map: Record<string, boolean> = {}
    for (const row of (data || []) as Array<{ listing_id: string }>) {
      map[row.listing_id] = true
    }
    inMemoryFavorites = map
    notifySubscribers()
    AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(map)).catch(() => {})
    return map
  } catch (e) {
    inMemoryFavorites = inMemoryFavorites || {}
    notifySubscribers()
    return inMemoryFavorites
  }
}

/**
 * Deterministic toggle for any listing:
 * - Rejects unauthenticated guest interactions without mutating state
 * - Reads live status directly from the in-memory store (immune to closure bugs)
 * - Fires instantaneous optimistic UI update across all subscribers
 * - Synchronizes with Supabase using explicit UPSERT (like) or DELETE (unlike)
 * - Automatically rolls back upon network or database failure
 */
export async function toggleFavorite(listingId: string): Promise<{
  success: boolean
  isFavorite: boolean
  requiresAuth?: boolean
}> {
  // 1. GUEST GUARD: Reject without mutating state
  const user = getSyncAuthUser()
  if (!user) {
    return { success: false, isFavorite: false, requiresAuth: true }
  }

  if (!inMemoryFavorites) inMemoryFavorites = {}

  // Current state before toggle
  const currentlyFavorited = Boolean(inMemoryFavorites[listingId])
  const nextFavorited = !currentlyFavorited

  // Invalidate any in-flight revalidate so it cannot overwrite this toggle.
  revalidateGeneration++
  isRevalidating = false

  // 2. Instant Optimistic In-Memory & Cache Update
  if (nextFavorited) {
    inMemoryFavorites[listingId] = true
  } else {
    delete inMemoryFavorites[listingId]
  }
  notifySubscribers()
  AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(inMemoryFavorites)).catch(() => {})

  // 3. Network Synchronization
  try {
    if (nextFavorited) {
      const { error } = await supabase.from('favorites').upsert(
        { user_id: user.id, listing_id: listingId },
        { onConflict: 'user_id,listing_id' }
      )
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
      if (error) throw error
    }

    return { success: true, isFavorite: nextFavorited }
  } catch (err) {
    console.warn('Favorite toggle network error, rolling back:', err)
    // Rollback
    if (currentlyFavorited) {
      inMemoryFavorites[listingId] = true
    } else {
      delete inMemoryFavorites[listingId]
    }
    notifySubscribers()
    AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(inMemoryFavorites)).catch(() => {})
    return { success: false, isFavorite: currentlyFavorited }
  }
}

/**
 * Backward-compatible helper with deterministic state resolution.
 */
export async function persistFavoriteToggle(
  listingId: string,
  wasFavorite?: boolean
): Promise<boolean> {
  const user = getSyncAuthUser()
  if (!user) return false

  if (!inMemoryFavorites) inMemoryFavorites = {}

  // Prefer the LIVE in-memory state over the caller's stale `wasFavorite`
  // snapshot — a concurrent toggle or a revalidate in flight must not be
  // reversed by a late-arriving optimistic write.
  const currentlyFavorited = Boolean(inMemoryFavorites[listingId])
  const nextFavorited = !currentlyFavorited

  // Invalidate any in-flight revalidate so it cannot overwrite this toggle.
  revalidateGeneration++
  isRevalidating = false

  if (nextFavorited) {
    inMemoryFavorites[listingId] = true
  } else {
    delete inMemoryFavorites[listingId]
  }
  notifySubscribers()
  AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(inMemoryFavorites)).catch(() => {})

  try {
    if (currentlyFavorited) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
      if (error) throw error
    } else {
      const { error } = await supabase.from('favorites').upsert(
        { user_id: user.id, listing_id: listingId },
        { onConflict: 'user_id,listing_id' }
      )
      if (error) throw error
    }
    return true
  } catch (e) {
    console.warn('Favorite sync rollback:', e)
    if (currentlyFavorited) {
      inMemoryFavorites[listingId] = true
    } else {
      delete inMemoryFavorites[listingId]
    }
    notifySubscribers()
    AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(inMemoryFavorites)).catch(() => {})
    return false
  }
}

/**
 * React hook for seamless real-time favorites synchronization across all screens.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => getFavoritesMap())

  useEffect(() => {
    setFavorites(getFavoritesMap())

    fetchFavoriteIds().then((favs) => {
      setFavorites(favs)
    }).catch(() => {})

    const unsubscribe = subscribeFavorites((updatedFavs) => {
      setFavorites(updatedFavs)
    })

    return unsubscribe
  }, [])

  const handleToggle = useCallback((listingId: string) => {
    return toggleFavorite(listingId)
  }, [])

  const checkIsFavorite = useCallback(
    (listingId: string) => Boolean(favorites[listingId]),
    [favorites]
  )

  return {
    favorites,
    isFavorite: checkIsFavorite,
    toggleFavorite: handleToggle,
    removeFavorite,
    reload: fetchFavoriteIds,
  }
}

/**
 * Deterministically remove a listing from favorites with optimistic broadcast & rollback.
 */
export async function removeFavorite(listingId: string): Promise<{
  success: boolean
  requiresAuth?: boolean
}> {
  const user = getSyncAuthUser()
  if (!user) {
    return { success: false, requiresAuth: true }
  }

  if (!inMemoryFavorites) inMemoryFavorites = {}
  const wasFavorited = Boolean(inMemoryFavorites[listingId])
  delete inMemoryFavorites[listingId]
  notifySubscribers()
  AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(inMemoryFavorites)).catch(() => {})

  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
    if (error) throw error

    return { success: true }
  } catch (err) {
    console.warn('Remove favorite network error, rolling back:', err)
    if (wasFavorited) {
      inMemoryFavorites[listingId] = true
      notifySubscribers()
      AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(inMemoryFavorites)).catch(() => {})
    }
    return { success: false }
  }
}

/**
 * Fetch full listing records the user has saved, newest save first.
 */
export async function fetchFavoriteListings(): Promise<any[]> {
  try {
    const user = getSyncAuthUser()
    const currentUserId = user?.id || (await supabase.auth.getUser()).data.user?.id
    if (!currentUserId) return []

    const { data, error } = await supabase
      .from('favorites')
      .select('listings(id,title,price,city,neighborhood,address,type,images,rooms,area_m2,is_featured,is_active,created_at,updated_at,condition,floor,apartment_type,features)')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Saved listings fetch notice:', error.message)
      return []
    }

    const items = ((data || []) as any[])
      .map((row) => row.listings)
      .filter(Boolean)

    // Replace the in-memory map with the authoritative server set — never
    // merge (a merge would keep deleted favorites stuck as `true` forever).
    const freshMap: Record<string, boolean> = {}
    items.forEach((item: any) => {
      if (item?.id) freshMap[item.id] = true
    })
    inMemoryFavorites = freshMap
    notifySubscribers()
    AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(freshMap)).catch(() => {})

    return items
  } catch (e) {
    console.warn('Saved listings fetch exception:', e)
    return []
  }
}