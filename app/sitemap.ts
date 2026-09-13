import { createPublicSupabaseClient } from '@/lib/supabase'
import type { MetadataRoute } from 'next'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://blejepronen.com'

const POPULAR_CITIES = [
  'Prishtinë',
  'Prizren',
  'Pejë',
  'Gjakovë',
  'Gjilan',
  'Ferizaj',
  'Mitrovicë',
  'Fushë Kosovë',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  let listingUrls: MetadataRoute.Sitemap = []
  try {
    const supabase = createPublicSupabaseClient()
    const { data: listings } = await supabase
      .from('listings')
      .select('id,updated_at')
      .eq('is_active', true)
      .limit(2000)

    if (listings) {
      listingUrls = listings.map(l => {
        const listing = l as { id: string; updated_at: string }
        return {
          url: `${siteUrl}/listings/${listing.id}`,
          lastModified: new Date(listing.updated_at || now),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }
      })
    }
  } catch (err) {
    console.error('Failed to generate dynamic listing sitemap entries:', err)
  }

  let profileUrls: MetadataRoute.Sitemap = []
  try {
    const supabase = createPublicSupabaseClient()
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,updated_at')
      .limit(500)

    if (profiles) {
      profileUrls = profiles.map(p => {
        const prof = p as { id: string; updated_at?: string }
        return {
          url: `${siteUrl}/profili/${prof.id}`,
          lastModified: new Date(prof.updated_at || now),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }
      })
    }
  } catch (err) {
    console.error('Failed to generate dynamic profile sitemap entries:', err)
  }

  const cityUrls: MetadataRoute.Sitemap = POPULAR_CITIES.map(city => ({
    url: `${siteUrl}/listings?city=${encodeURIComponent(city)}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.75,
  }))

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/listings`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/listings?type=shitje`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${siteUrl}/listings?type=qira`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    ...cityUrls,
    {
      url: `${siteUrl}/kontakti`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteUrl}/kushtet`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/privatesia`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    ...listingUrls,
    ...profileUrls,
  ]
}

