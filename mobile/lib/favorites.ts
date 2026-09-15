import { supabase } from './supabase'

/**
 * Favorites ("Të Ruajturat") — DB-backed via the Supabase `favorites`
 * table (RLS: users can only see and manage their own rows).
 */

export async function fetchFavoriteIds(): Promise<Record<string, boolean>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return {}

    const { data, error } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', user.id)

    if (error) {
      console.warn('Favorites fetch notice:', error.message)
      return {}
    }

    const map: Record<string, boolean> = {}
    for (const row of (data || []) as Array<{ listing_id: string }>) {
      map[row.listing_id] = true
    }
    return map
  } catch (e) {
    console.warn('Favorites fetch exception:', e)
    return {}
  }
}

/**
 * Persist a favorite toggle. Optimistic callers should revert on `false`.
 */
export async function persistFavoriteToggle(
  listingId: string,
  wasFavorite: boolean
): Promise<boolean> {
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
    console.warn('Favorite sync notice:', e)
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
      .select('listings(*)')
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