export interface SavedSearchItem {
  id: string
  user_id: string
  title: string | null
  city: string | null
  type: 'shitje' | 'qira' | null
  min_price: number | null
  max_price: number | null
  rooms: number | null
  min_area: number | null
  max_area: number | null
  apartment_type: string | null
  search_query: string | null
  notify_push: boolean
  notify_email: boolean
  last_notified_at: string
  created_at: string
}

export interface SaveSearchParams {
  title?: string
  city?: string
  type?: 'shitje' | 'qira' | ''
  minPrice?: number
  maxPrice?: number
  rooms?: number
  minArea?: number
  maxArea?: number
  apartmentType?: string
  searchQuery?: string
  notifyPush?: boolean
  notifyEmail?: boolean
}

export async function fetchSavedSearches(): Promise<SavedSearchItem[]> {
  try {
    const res = await fetch('/api/saved-searches')
    if (!res.ok) return []
    const data = await res.json()
    return data.savedSearches || []
  } catch {
    return []
  }
}

export async function createSavedSearch(params: SaveSearchParams): Promise<{ success: boolean; savedSearch?: SavedSearchItem; error?: string }> {
  try {
    const res = await fetch('/api/saved-searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.message || data.error }
    return { success: true, savedSearch: data.savedSearch }
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Lidhja dështoi'
    return { success: false, error }
  }
}

export async function removeSavedSearch(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/saved-searches?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch {
    return false
  }
}
