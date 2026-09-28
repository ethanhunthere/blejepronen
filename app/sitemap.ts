import type { MetadataRoute } from 'next'

import { ALL_CITIES } from '@/lib/kosovo-locations'
import { createPublicSupabaseClient } from '@/lib/supabase'
import {
  SITE_URL,
  hubPathEn,
  hubPathSq,
  hoodFromSlug,
  marketPathEn,
  marketPathSq,
  slugify,
  type HubType,
} from '@/lib/seo-slugs'

export const revalidate = 3600

const HUB_MIN_INVENTORY = 3

interface MatrixRow {
  id: string
  updated_at: string | null
  city: string | null
  type: string | null
  neighborhood: string | null
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

  const [listingsRes, profilesRes] = await Promise.all([
    supabase
      .from('listings')
      .select('id,updated_at,city,type,neighborhood')
      .eq('is_active', true)
      .limit(5000),
    supabase.from('profiles').select('id,updated_at').limit(1000),
  ])

  const rows = (listingsRes.data || []) as MatrixRow[]
  const profiles = (profilesRes.data || []) as ProfileRow[]

  const cityTypeCounts = new Map<string, number>()
  const cityCounts = new Map<string, number>()
  for (const r of rows) {
    if (!r.city) continue
    cityCounts.set(r.city, (cityCounts.get(r.city) || 0) + 1)
    if (r.type === 'shitje' || r.type === 'qira') {
      const key = `${r.city}|${r.type}`
      cityTypeCounts.set(key, (cityTypeCounts.get(key) || 0) + 1)
    }
  }

  const hoodKeys = new Set<string>()
  for (const r of rows) {
    if (!r.city || !r.neighborhood || (r.type !== 'shitje' && r.type !== 'qira')) continue
    hoodKeys.add(`${r.city}|${r.type}|${r.neighborhood}`)
  }
  const hoodEntries: { city: string; type: HubType; hood: string; total: number }[] = []
  for (const key of hoodKeys) {
    const [city, type, neighborhood] = key.split('|')
    const readable = hoodFromSlug(slugify(neighborhood)).toLowerCase()
    let total = 0
    for (const r of rows) {
      if (
        r.city === city &&
        r.type === type &&
        r.neighborhood &&
        r.neighborhood.toLowerCase().includes(readable)
      ) {
        total += 1
      }
    }
    if (total >= HUB_MIN_INVENTORY) {
      hoodEntries.push({ city, type: type as HubType, hood: hoodFromSlug(slugify(neighborhood)), total })
    }
  }

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

  for (const city of ALL_CITIES) {
    for (const type of ['shitje', 'qira'] as HubType[]) {
      const total = cityTypeCounts.get(`${city}|${type}`) || 0
      if (total < HUB_MIN_INVENTORY) continue
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

    const cityTotal = cityCounts.get(city) || 0
    if (cityTotal > 0) {
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
  }

  for (const { city, type, hood } of hoodEntries) {
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

  for (const l of rows) {
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
