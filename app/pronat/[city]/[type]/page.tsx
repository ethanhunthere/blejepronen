import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PropertyHub } from '@/components/PropertyHub'
import { ALL_CITIES } from '@/lib/kosovo-locations'
import { fetchListingsServer, fetchMarketStats } from '@/lib/listings-query'
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

export const revalidate = 3600

const TYPES: HubType[] = ['shitje', 'qira']

export function generateStaticParams() {
  return ALL_CITIES.flatMap((city) => TYPES.map((type) => ({ city: slugify(city), type })))
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

export default async function CityTypeHub({ params }: PageProps) {
  const { city: citySlug, type } = await params
  const city = cityFromSlug(citySlug)
  if (!city || (type !== 'shitje' && type !== 'qira')) notFound()

  const { rows, total } = await fetchListingsServer({ city, type, limit: 24 })
  // Thin-content governance: facets without real inventory are not landing pages.
  if (total < 3) notFound()

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
