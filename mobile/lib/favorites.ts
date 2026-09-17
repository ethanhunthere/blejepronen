import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

/**
 * Ultra-low latency Favorites System:
 * 1. In-memory hot cache: instant 0ms resolution for render loops & FlatLists
 * 2. AsyncStorage cold cache: instant hydration on cold start without waiting for Supabase
 * 3. SWR (Stale-While-Revalidate): background fetch updates cache silently
 * 4. Zero-delay optimistic writes: local state flips immediately; rollback on network failure
 */

const FAVORITES_CACHE_KEY = '@blejepronen_favs_map_v2'
let inMemoryFavorites: Record<string, boolean> | null = null
let isRevalidating = false

async function backgroundRevalidateFavorites(userId: string) {
  if (isRevalidating) return
  isRevalidating = true
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId)

    if (!error && data) {
      const freshMap: Record<string, boolean> = {}
      for (const row of data as Array<{ listing_id: string }>) {
        freshMap[row.listing_id] = true
      }
      inMemoryFavorites = freshMap
      AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(freshMap)).catch(() => {})
    }
  } catch (err) {
    // Silent background catch
  } finally {
    isRevalidating = false
  }
}

export async function fetchFavoriteIds(): Promise<Record<string, boolean>> {
  // 1. Instant 0ms in-memory cache return
  if (inMemoryFavorites !== null) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) backgroundRevalidateFavorites(user.id)
    }).catch(() => {})
    return inMemoryFavorites
  }

  // 2. Sub-5ms local storage cache return
  try {
    const local = await AsyncStorage.getItem(FAVORITES_CACHE_KEY)
    if (local) {
      inMemoryFavorites = JSON.parse(local)
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) backgroundRevalidateFavorites(user.id)
      }).catch(() => {})
      return inMemoryFavorites!
    }
  } catch {}

  // 3. First-run network fetch
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      inMemoryFavorites = {}
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
    AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(map)).catch(() => {})
    return map
  } catch (e) {
    inMemoryFavorites = inMemoryFavorites || {}
    return inMemoryFavorites
  }
}

/**
 * Persist a favorite toggle with zero-latency optimistic write-through.
 */
export async function persistFavoriteToggle(
  listingId: string,
  wasFavorite: boolean
): Promise<boolean> {
  // 1. Instant local-first mutation
  if (!inMemoryFavorites) inMemoryFavorites = {}
  if (wasFavorite) {
    delete inMemoryFavorites[listingId]
  } else {
    inMemoryFavorites[listingId] = true
  }
  AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(inMemoryFavorites)).catch(() => {})

  // 2. Background network synchronization
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    if (wasFavorite) {
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
    // Rollback local state on network failure
    if (wasFavorite) {
      inMemoryFavorites[listingId] = true
    } else {
      delete inMemoryFavorites[listingId]
    }
    AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(inMemoryFavorites)).catch(() => {})
    return false
  }
}

/**
 * Fetch full listing records the user has saved, newest save first.
 */
export async function fetchFavoriteListings(): Promise<any[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('favorites')
      .select('listings(id,title,price,city,neighborhood,address,type,images,rooms,area_m2,is_featured,is_active,created_at,updated_at,condition,floor,apartment_type,features)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Saved listings fetch notice:', error.message)
      return []
    }

    return ((data || []) as any[])
      .map((row) => row.listings)
      .filter(Boolean)
  } catch (e) {
    console.warn('Saved listings fetch exception:', e)
    return []
  }
}