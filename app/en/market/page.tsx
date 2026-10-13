import type { Metadata } from 'next'

import { MarketPage } from '@/components/MarketPage'
import { SITE_URL, marketPathEn, marketPathSq } from '@/lib/seo-slugs'

import { generateHreflangAlternates, getGeoMeta } from '@/lib/geo-seo'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Kosovo Property Market | Live Statistics | Bleje Pronën',
  description:
    'Real-time computed statistics: active listings, median price per m² and neighborhood distribution across Kosovo.',
  alternates: generateHreflangAlternates('/en/market'),
  other: getGeoMeta('prishtine'),
}

export default function EnMarketOverview() {
  return <MarketPage lang="en" />
}
