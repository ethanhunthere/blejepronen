import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { MarketPage } from '@/components/MarketPage'
import { fetchHubStaticParams, fetchMarketStats } from '@/lib/listings-query'
import { SITE_URL, cityFromSlug, fmtInt, marketPathEn, marketPathSq, slugify } from '@/lib/seo-slugs'

export const revalidate = 3600

export async function generateStaticParams() {
  const { cities } = await fetchHubStaticParams()
  return cities.map((city) => ({ city: slugify(city) }))
}

interface PageProps {
  params: Promise<{ city: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: slug } = await params
  const city = cityFromSlug(slug)
  if (!city) return {}
  const stats = await fetchMarketStats(city)
  if (!stats || stats.total === 0) return {}
  const median = stats.medianSalePpm2 ? ` Median €${fmtInt(stats.medianSalePpm2)}/m².` : ''
  const sq = marketPathSq(city)
  const en = marketPathEn(city)
  const description = `${stats.total} active listings in ${city}, Kosovo: ${stats.forSale} for sale, ${stats.forRent} for rent.${median} Live market statistics by Bleje Pronën.`
  return {
    title: `${city} Property Market — ${stats.total} Active Listings | Bleje Pronën`,
    description,
    alternates: {
      canonical: `${SITE_URL}${en}`,
      languages: { sq: `${SITE_URL}${sq}`, en: `${SITE_URL}${en}`, 'x-default': `${SITE_URL}${sq}` },
    },
    openGraph: {
      title: `${city} property market — live statistics`,
      description,
      url: `${SITE_URL}${en}`,
      siteName: 'Bleje Pronën',
      locale: 'en_US',
      alternateLocale: ['sq_AL'],
      type: 'website',
    },
  }
}

export default async function EnMarketCity({ params }: PageProps) {
  const { city: slug } = await params
  const city = cityFromSlug(slug)
  if (!city) notFound()
  const stats = await fetchMarketStats(city)
  if (!stats || stats.total === 0) notFound()
  return <MarketPage city={city} lang="en" />
}
