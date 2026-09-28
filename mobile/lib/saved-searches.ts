import { supabase } from './supabase'

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return []
    return (data as SavedSearchItem[]) || []
  } catch {
    return []
  }
}

export async function createSavedSearch(params: SaveSearchParams): Promise<{ success: boolean; savedSearch?: SavedSearchItem; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Duhet të jeni i kyçur për të ruajtur një kërkim.' }
    }

    const row = {
      user_id: user.id,
      title: params.title?.slice(0, 80) || null,
      city: params.city || null,
      type: params.type === 'shitje' || params.type === 'qira' ? params.type : null,
      min_price: params.minPrice ?? null,
      max_price: params.maxPrice ?? null,
      rooms: params.rooms ?? null,
      min_area: params.minArea ?? null,
      max_area: params.maxArea ?? null,
      apartment_type: params.apartmentType || null,
      search_query: params.searchQuery?.slice(0, 100) || null,
      notify_push: params.notifyPush ?? true,
      notify_email: params.notifyEmail ?? true,
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .insert(row)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, savedSearch: data as SavedSearchItem }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Ndodhi një gabim.' }
  }
}

export async function removeSavedSearch(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id)

    return !error
  } catch {
    return false
  }
}
