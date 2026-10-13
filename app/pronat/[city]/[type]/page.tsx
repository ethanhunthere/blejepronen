import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PropertyHub } from '@/components/PropertyHub'
import { fetchHubStaticParams, fetchListingsServer, fetchMarketStats } from '@/lib/listings-query'
import {
  SITE_URL,
  cityFromSlug,
  hubDescriptionSq,
  hubPathEn,
  hubPathSq,
  hubTitleSq,
  slugify,
  type HubType,
} from '@/lib/seo-slugs'

import { generateHreflangAlternates, getGeoMeta } from '@/lib/geo-seo'

export const revalidate = 3600

export async function generateStaticParams() {
  const { cityTypes } = await fetchHubStaticParams()
  return cityTypes.map(({ city, type }) => ({ city: slugify(city), type }))
}

interface PageProps {
  params: Promise<{ city: string; type: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: citySlug, type } = await params
  const city = cityFromSlug(citySlug)
  if (!city || (type !== 'shitje' && type !== 'qira')) return {}
  const stats = await fetchMarketStats(city)
  const copy = { city, type: type as HubType, total: stats?.total ?? 0, medianPpm2: stats?.medianSalePpm2 ?? null }
  const sq = hubPathSq(city, type as HubType)
  return {
    title: hubTitleSq(copy),
    description: hubDescriptionSq(copy),
    alternates: generateHreflangAlternates(sq),
    other: getGeoMeta(city),
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

export default async function CityTypeHub({ params }: PageProps) {
  const { city: citySlug, type } = await params
  const city = cityFromSlug(citySlug)
  if (!city || (type !== 'shitje' && type !== 'qira')) notFound()

  const { rows, total } = await fetchListingsServer({ city, type, limit: 24 })
  const stats = await fetchMarketStats(city)

  return (
    <PropertyHub
      city={city}
      type={type as HubType}
      lang="sq"
      rows={rows}
      total={total}
      neighborhoods={stats?.neighborhoods ?? []}
    />
  )
}
