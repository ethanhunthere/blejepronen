import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PropertyHub } from '@/components/PropertyHub'
import { fetchHubStaticParams, fetchListingsServer, fetchMarketStats } from '@/lib/listings-query'
import {
  SITE_URL,
  cityFromSlug,
  hubDescriptionEn,
  hubPathEn,
  hubPathSq,
  hubTitleEn,
  slugify,
  type HubType,
} from '@/lib/seo-slugs'

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
  const en = hubPathEn(city, type as HubType)
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

export default async function EnCityTypeHub({ params }: PageProps) {
  const { city: citySlug, type } = await params
  const city = cityFromSlug(citySlug)
  if (!city || (type !== 'shitje' && type !== 'qira')) notFound()

  const { rows, total } = await fetchListingsServer({ city, type, limit: 24 })
  if (total < 3) notFound()

  const stats = await fetchMarketStats(city)

  return (
    <PropertyHub
      city={city}
      type={type as HubType}
      lang="en"
      rows={rows}
      total={total}
      neighborhoods={stats?.neighborhoods ?? []}
    />
  )
}
