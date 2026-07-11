import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export function getCookieDomain(hostname: string): string | undefined {
  if (!hostname || hostname === 'localhost') return undefined
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (siteUrl) {
    try {
      const configuredHostname = new URL(siteUrl).hostname
      if (configuredHostname && hostname.endsWith(configuredHostname)) {
        // Strip a leading www. and always prefix with a dot so the cookie
        // is valid for both the apex domain and any subdomains.
        const rootDomain = configuredHostname.replace(/^www\./, '')
        return `.${rootDomain}`
      }
    } catch {
      // fall through
    }
  }
  return undefined
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          email_verified: boolean
          avatar_url: string | null
          verification_code: string | null
          verification_code_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          email_verified?: boolean
          avatar_url?: string | null
          verification_code?: string | null
          verification_code_expires_at?: string | null
        }
        Update: {
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          email_verified?: boolean
          avatar_url?: string | null
          verification_code?: string | null
          verification_code_expires_at?: string | null
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
          neighborhood: string | null
          address: string
          rooms: number
          area_m2: number
          type: 'shitje' | 'qira'
          condition: string | null
          floor: string | null
          apartment_type: string | null
          features: string[]
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
          neighborhood?: string | null
          address: string
          rooms: number
          area_m2: number
          type: 'shitje' | 'qira'
          condition?: string | null
          floor?: string | null
          apartment_type?: string | null
          features?: string[]
          images?: string[]
        }
        Update: {
          title?: string
          description?: string
          price?: number
          city?: string
          neighborhood?: string | null
          address?: string
          rooms?: number
          area_m2?: number
          type?: 'shitje' | 'qira'
          condition?: string | null
          floor?: string | null
          apartment_type?: string | null
          features?: string[]
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
        }
      }
      conversations: {
        Row: {
          id: string
          listing_id: string
          buyer_id: string
          seller_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          buyer_id: string
          seller_id: string
        }
        Update: {
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          created_at: string
          is_read: boolean
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          is_read?: boolean
        }
        Update: {
          is_read?: boolean
        }
      }
    }
  }
}

// Module-level singleton for the browser client so the same Supabase
// instance is reused across the app, preventing duplicate token refresh
// requests and auth state mismatches.
let _browserClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    if (!_browserClient) {
      const isHttps = window.location.protocol === 'https:'
      _browserClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            flowType: 'pkce',
            autoRefreshToken: true,
            persistSession: true,
            // The OAuth code is exchanged server-side in /auth/callback; do not
            // let the browser client try to parse tokens from the URL.
            detectSessionInUrl: false,
          },
          cookieOptions: {
            path: '/',
            sameSite: 'lax',
            secure: isHttps,
            domain: getCookieDomain(window.location.hostname),
          },
        }
      )
    }
    return _browserClient
  }

  // SSR fallback: always return a fresh instance because there is no
  // shared module state during server rendering.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    }
  )
}

export async function createServerSupabaseClient() {
  const { createServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return createServerClient(
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

// Cookie-less public client for fully static server components (e.g. homepage,
// sitemap). Uses the anon key and only reads public/unprotected data so the
// page can be statically generated and cached with ISR.
export function createPublicSupabaseClient(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// Service-role client for admin-only server operations. Falls back to the
// cookie-based server client when the service role key is not configured so
// local development without it does not crash.
export async function createAdminSupabaseClient(): Promise<SupabaseClient> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    // Fall back to a cookie-less public client so build-time static generation
    // (e.g. generateStaticParams) does not fail when cookies are unavailable.
    return createPublicSupabaseClient()
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// -- Utility types --
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Listing = Database['public']['Tables']['listings']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']

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
