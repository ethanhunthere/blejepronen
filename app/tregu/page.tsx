import type { Metadata } from 'next'

import { MarketPage } from '@/components/MarketPage'
import { SITE_URL, marketPathEn, marketPathSq } from '@/lib/seo-slugs'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Tregu i Pronave në Kosovë — Statistika Live | Bleje Pronën',
  description:
    'Statistika të llogaritura në kohë reale: listime aktive, mesatarja e çmimit për m² dhe shpërndarja sipas lagjeve në të gjithë Kosovën.',
  alternates: {
    canonical: `${SITE_URL}/tregu`,
    languages: { sq: `${SITE_URL}/tregu`, en: `${SITE_URL}/en/market`, 'x-default': `${SITE_URL}/tregu` },
  },
}

export default function TreguOverview() {
  return <MarketPage lang="sq" />
}
