import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string
          last_name: string
          phone: string | null
          phone_verified: boolean
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          phone?: string | null
          phone_verified?: boolean
          avatar_url?: string | null
        }
        Update: {
          first_name?: string
          last_name?: string
          phone?: string | null
          phone_verified?: boolean
          avatar_url?: string | null
        }
      }
      listings: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          price: number
          city: string
          address: string
          rooms: number
          area_m2: number
          type: 'shitje' | 'qira'
          images: string[]
          is_active: boolean
          is_featured: boolean
          free_trial_until: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          title: string
          description: string
          price: number
          city: string
          address: string
          rooms: number
          area_m2: number
          type: 'shitje' | 'qira'
          images?: string[]
        }
        Update: {
          title?: string
          description?: string
          price?: number
          city?: string
          address?: string
          rooms?: number
          area_m2?: number
          type?: 'shitje' | 'qira'
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
        }
      }
    }
  }
}

// Singleton browser client to prevent multiple Supabase instances from
// independently refreshing the auth token and hitting 429 rate limits.
let browserClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (typeof window !== 'undefined' && browserClient) {
    return browserClient
  }

  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  )

  if (typeof window !== 'undefined') {
    browserClient = client
  }

  return client
}

export async function createServerSupabaseClient() {
  const { createServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// -- Utility types --
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Listing = Database['public']['Tables']['listings']['Row']

export type City =
  | 'Prishtinë'
  | 'Prizren'
  | 'Pejë'
  | 'Gjakovë'
  | 'Gjilan'
  | 'Mitrovicë'
  | 'Ferizaj'

export type ListingType = 'shitje' | 'qira'

export const CITIES: City[] = [
  'Prishtinë',
  'Prizren',
  'Pejë',
  'Gjakovë',
  'Gjilan',
  'Mitrovicë',
  'Ferizaj',
]

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  shitje: 'Shitje',
  qira: 'Qira',
}
