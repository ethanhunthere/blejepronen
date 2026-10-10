import type { MetadataRoute } from 'next'

import { createPublicSupabaseClient } from '@/lib/supabase'
import { fetchHubStaticParams } from '@/lib/listings-query'
import {
  SITE_URL,
  hubPathEn,
  hubPathSq,
  marketPathEn,
  marketPathSq,
} from '@/lib/seo-slugs'

export const revalidate = 3600

interface ListingRow {
  id: string
  updated_at: string | null
}

interface ProfileRow {
  id: string
  updated_at?: string | null
}

function langAlternates(sqPath: string, enPath: string) {
  return {
    languages: {
      sq: `${SITE_URL}${sqPath}`,
      en: `${SITE_URL}${enPath}`,
    },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const supabase = createPublicSupabaseClient()

  const [listingsRes, profilesRes, hostsRes, hubParams] = await Promise.all([
    supabase.from('listings').select('id,updated_at').eq('is_active', true).limit(5000),
    supabase.from('profiles').select('id,updated_at').limit(1000),
    supabase.from('listings').select('user_id').eq('is_active', true).limit(5000),
    fetchHubStaticParams(),
  ])

  const listings = (listingsRes.data || []) as ListingRow[]
  // Only host profiles with live inventory belong in the sitemap — submitting
  // empty profiles invites crawl waste and PII surface for no user value.
  const hostIds = new Set(
    ((hostsRes.data || []) as { user_id: string }[]).map((r) => r.user_id)
  )
  const profiles = ((profilesRes.data || []) as ProfileRow[]).filter((p) => hostIds.has(p.id))

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/listings`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    {
      url: `${SITE_URL}/tregu`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.75,
      alternates: langAlternates('/tregu', '/en/market'),
    },
    {
      url: `${SITE_URL}/en/market`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: langAlternates('/tregu', '/en/market'),
    },
    { url: `${SITE_URL}/kontakti`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/kushtet`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privatesia`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  for (const { city, type } of hubParams.cityTypes) {
    const sq = hubPathSq(city, type)
    const en = hubPathEn(city, type)
    entries.push(
      {
        url: `${SITE_URL}${sq}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.85,
        alternates: langAlternates(sq, en),
      },
      {
        url: `${SITE_URL}${en}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.7,
        alternates: langAlternates(sq, en),
      }
    )
  }

  for (const city of hubParams.cities) {
    const sq = marketPathSq(city)
    const en = marketPathEn(city)
    entries.push(
      {
        url: `${SITE_URL}${sq}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.75,
        alternates: langAlternates(sq, en),
      },
      {
        url: `${SITE_URL}${en}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.65,
        alternates: langAlternates(sq, en),
      }
    )
  }

  for (const { city, type, hood } of hubParams.hoods) {
    const sq = hubPathSq(city, type, hood)
    const en = hubPathEn(city, type, hood)
    entries.push(
      {
        url: `${SITE_URL}${sq}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: langAlternates(sq, en),
      },
      {
        url: `${SITE_URL}${en}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.55,
        alternates: langAlternates(sq, en),
      }
    )
  }

  for (const l of listings) {
    entries.push({
      url: `${SITE_URL}/listings/${l.id}`,
      lastModified: new Date(l.updated_at || now),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  for (const p of profiles) {
    entries.push({
      url: `${SITE_URL}/profili/${p.id}`,
      lastModified: new Date(p.updated_at || now),
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  }

  return entries
}
