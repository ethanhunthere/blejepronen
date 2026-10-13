import type { Metadata } from 'next'

import { MarketPage } from '@/components/MarketPage'
import { SITE_URL, marketPathEn, marketPathSq } from '@/lib/seo-slugs'

import { generateHreflangAlternates, getGeoMeta } from '@/lib/geo-seo'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Tregu i Pronave në Kosovë | Statistika Live | Bleje Pronën',
  description:
    'Statistika të llogaritura në kohë reale: listime aktive, mesatarja e çmimit për m² dhe shpërndarja sipas lagjeve në të gjithë Kosovën.',
  alternates: generateHreflangAlternates('/tregu'),
  other: getGeoMeta('prishtine'),
}

export default function TreguOverview() {
  return <MarketPage lang="sq" />
}
