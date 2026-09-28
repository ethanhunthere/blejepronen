import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PropertyHub } from '@/components/PropertyHub'
import { fetchHubStaticParams, fetchListingsServer, fetchMarketStats } from '@/lib/listings-query'
import {
  SITE_URL,
  cityFromSlug,
  hoodFromSlug,
  hubDescriptionSq,
  hubPathEn,
  hubPathSq,
  hubTitleSq,
  slugify,
  type HubType,
} from '@/lib/seo-slugs'

export const revalidate = 3600

export async function generateStaticParams() {
  const { hoods } = await fetchHubStaticParams()
  return hoods.map(({ city, type, hood }) => ({ city: slugify(city), type, hood: slugify(hood) }))
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
    title: hubTitleSq(copy),
    description: hubDescriptionSq(copy),
    alternates: {
      canonical: `${SITE_URL}${sq}`,
      languages: { sq: `${SITE_URL}${sq}`, en: `${SITE_URL}${en}`, 'x-default': `${SITE_URL}${sq}` },
    },
    openGraph: {
      title: hubTitleSq(copy),
      description: hubDescriptionSq(copy),
      url: `${SITE_URL}${sq}`,
      siteName: 'Bleje Pronën',
      locale: 'sq_AL',
      alternateLocale: ['en_US'],
      type: 'website',
    },
  }
}

export default async function NeighborhoodHub({ params }: PageProps) {
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
      lang="sq"
      rows={rows}
      total={total}
      neighborhoods={stats?.neighborhoods ?? []}
    />
  )
}
