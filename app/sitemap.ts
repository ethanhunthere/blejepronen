import { createServerSupabaseClient } from '@/lib/supabase'
import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerSupabaseClient()
  const { data: listings } = await supabase
    .from('listings')
    .select('id,updated_at')
    .eq('is_active', true)
    .limit(1000)

  const listingUrls = (listings || []).map(l => {
    const listing = l as { id: string; updated_at: string }
    return {
      url: `${siteUrl}/listings/${listing.id}`,
      lastModified: new Date(listing.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }
  })

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/listings`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    ...listingUrls,
  ]
}
