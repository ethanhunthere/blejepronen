import type { Metadata } from 'next'

import { MarketPage } from '@/components/MarketPage'
import { SITE_URL, marketPathEn, marketPathSq } from '@/lib/seo-slugs'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Kosovo Property Market — Live Statistics | Bleje Pronën',
  description:
    'Real-time computed statistics: active listings, median price per m² and neighborhood distribution across Kosovo.',
  alternates: {
    canonical: `${SITE_URL}/en/market`,
    languages: { sq: `${SITE_URL}/tregu`, en: `${SITE_URL}/en/market`, 'x-default': `${SITE_URL}/tregu` },
  },
}

export default function EnMarketOverview() {
  return <MarketPage lang="en" />
}
