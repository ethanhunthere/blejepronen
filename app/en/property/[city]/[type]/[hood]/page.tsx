import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PropertyHub } from '@/components/PropertyHub'
import { createPublicSupabaseClient } from '@/lib/supabase'
import { fetchListingsServer, fetchMarketStats } from '@/lib/listings-query'
import {
  SITE_URL,
  cityFromSlug,
  hoodFromSlug,
  hubDescriptionEn,
  hubPathEn,
  hubPathSq,
  hubTitleEn,
  slugify,
  type HubType,
} from '@/lib/seo-slugs'

export const revalidate = 3600

interface Row {
  city: string | null
  type: string | null
  neighborhood: string | null
}

export async function generateStaticParams() {
  const supabase = createPublicSupabaseClient()
  const { data } = await supabase
    .from('listings')
    .select('city,type,neighborhood')
    .eq('is_active', true)
    .not('neighborhood', 'is', null)
    .limit(5000)
  const seen = new Set<string>()
  const params: { city: string; type: string; hood: string }[] = []
  for (const r of (data || []) as Row[]) {
    if (!r.city || !r.neighborhood || (r.type !== 'shitje' && r.type !== 'qira')) continue
    const key = `${r.city}|${r.type}|${r.neighborhood}`
    if (seen.has(key)) continue
    seen.add(key)
    params.push({ city: slugify(r.city), type: r.type, hood: slugify(r.neighborhood) })
  }
  return params
}

interface PageProps {
  params: Promise<{ city: string; type: string; hood: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: citySlug, type, hood: hoodSlug } = await params
  const city = cityFromSlug(citySlug)
  if (!city || (type !== 'shitje' && type !== 'qira')) return {}
  const hood = hoodFromSlug(hoodSlug)
  const { total } = await fetchListingsServer({ city, type, neighborhood: hood, limit: 1 })
  const stats = await fetchMarketStats(city)
  const copy = { city, type: type as HubType, hood, total, medianPpm2: stats?.medianSalePpm2 ?? null }
  const sq = hubPathSq(city, type as HubType, hood)
  const en = hubPathEn(city, type as HubType, hood)
  return {
    title: hubTitleEn(copy),
    description: hubDescriptionEn(copy),
    alternates: {
      canonical: `${SITE_URL}${en}`,
      languages: { sq: `${SITE_URL}${sq}`, en: `${SITE_URL}${en}`, 'x-default': `${SITE_URL}${sq}` },
    },
    openGraph: {
      title: hubTitleEn(copy),
      description: hubDescriptionEn(copy),
      url: `${SITE_URL}${en}`,
      siteName: 'Bleje Pronën',
      locale: 'en_US',
      alternateLocale: ['sq_AL'],
      type: 'website',
    },
  }
}

export default async function EnNeighborhoodHub({ params }: PageProps) {
  const { city: citySlug, type, hood: hoodSlug } = await params
  const city = cityFromSlug(citySlug)
  if (!city || (type !== 'shitje' && type !== 'qira')) notFound()
  const hood = hoodFromSlug(hoodSlug)

  const { rows, total } = await fetchListingsServer({ city, type, neighborhood: hood, limit: 24 })
  if (total < 3) notFound()

  const stats = await fetchMarketStats(city)

  return (
    <PropertyHub
      city={city}
      type={type as HubType}
      hood={hood}
      lang="en"
      rows={rows}
      total={total}
      neighborhoods={stats?.neighborhoods ?? []}
    />
  )
}
