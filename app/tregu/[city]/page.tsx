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
  const median = stats.medianSalePpm2 ? ` Mesatarja ${fmtInt(stats.medianSalePpm2)} €/m².` : ''
  const sq = marketPathSq(city)
  const en = marketPathEn(city)
  const description = `${stats.total} listime aktive në ${city}: ${stats.forSale} për shitje, ${stats.forRent} me qira.${median} Statistika live të tregut nga Bleje Pronën.`
  return {
    title: `Tregu i Pronave në ${city} — ${stats.total} listime aktive | Bleje Pronën`,
    description,
    alternates: {
      canonical: `${SITE_URL}${sq}`,
      languages: { sq: `${SITE_URL}${sq}`, en: `${SITE_URL}${en}`, 'x-default': `${SITE_URL}${sq}` },
    },
    openGraph: {
      title: `Tregu i Pronave në ${city} — statistika live`,
      description,
      url: `${SITE_URL}${sq}`,
      siteName: 'Bleje Pronën',
      locale: 'sq_AL',
      alternateLocale: ['en_US'],
      type: 'website',
    },
  }
}

export default async function TreguCity({ params }: PageProps) {
  const { city: slug } = await params
  const city = cityFromSlug(slug)
  if (!city) notFound()
  const stats = await fetchMarketStats(city)
  if (!stats || stats.total === 0) notFound()
  return <MarketPage city={city} lang="sq" />
}
