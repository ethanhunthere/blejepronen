import { NextResponse } from 'next/server'

import { fetchHubStaticParams } from '@/lib/listings-query'
import { slugify } from '@/lib/seo-slugs'

export const revalidate = 3600

export async function GET() {
  const { cityTypes, hoods, cities } = await fetchHubStaticParams()
  return NextResponse.json({
    cityTypes: cityTypes.map(({ city, type }) => `${slugify(city)}/${type}`),
    hoods: hoods.map(({ city, type, hood }) => `${slugify(city)}/${type}/${slugify(hood)}`),
    cities: cities.map((city) => slugify(city)),
  })
}
