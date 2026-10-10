import type { Metadata } from 'next'

import { ListingsExplorer } from '@/components/ListingsExplorer'
import { fetchListingsServer, type ListingsQueryParams, type ListingsSort } from '@/lib/listings-query'

const SITE_URL = 'https://blejepronen.com'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const first = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? '') : (v ?? '')

/**
 * URL pagination is 1-based (…?page=1 is the first page) while Supabase
 * `.range()` takes a 0-based index — normalize here so page=1 → range(0, 11)
 * instead of skipping the first 12 listings. Invalid/absent values fall back
 * to the first page.
 */
function pageIndexFrom(sp: Record<string, string | string[] | undefined>): number {
  return Math.max(0, (Number(first(sp.page)) || 1) - 1)
}

function toQueryParams(sp: Record<string, string | string[] | undefined>): ListingsQueryParams {
  return {
    search: first(sp.search),
    city: first(sp.city),
    neighborhood: first(sp.neighborhood),
    type: (first(sp.type) as '' | 'shitje' | 'qira') || '',
    minPrice: first(sp.minPrice),
    maxPrice: first(sp.maxPrice),
    rooms: first(sp.rooms),
    minArea: first(sp.minArea),
    maxArea: first(sp.maxArea),
    condition: first(sp.condition),
    apartment_type: first(sp.apartment_type),
    floor: first(sp.floor),
    features: first(sp.features) ? first(sp.features).split(',').filter(Boolean) : [],
    agentId: first(sp.agentId),
    sort: (first(sp.sort) as ListingsSort) || 'newest',
    page: pageIndexFrom(sp),
    limit: 12,
  }
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams
  const city = first(sp.city)
  const type = first(sp.type)
  const filtered = Boolean(city || type || first(sp.search) || first(sp.minPrice) || first(sp.maxPrice))

  const typeLabel = type === 'shitje' ? 'për shitje' : type === 'qira' ? 'me qira' : ''
  const title = city
    ? `Prona ${typeLabel} në ${city} — Katalogu | Bleje Pronën`.replace('  ', ' ')
    : type
    ? `Prona ${typeLabel} në Kosovë — Katalogu | Bleje Pronën`
    : 'Katalogu i Pronave në Kosovë — Blije, Shit & Jep me Qira | Bleje Pronën'

  const description = city
    ? `Shfletoni pronat aktive ${typeLabel} në ${city}: banesa, shtëpi, lokale dhe truall me çmime, foto dhe kontakt direkt me pronarin.`
    : 'Katalogu i plotë i pronave aktive në Kosovë — banesa, shtëpi, vila, lokale dhe truall. Filtroni sipas qytetit, çmimit, sipërfaqes dhe veçorive.'

  // Faceted governance: the explorer is a browse surface; indexable facet
  // landing pages live under /pronat/... — parameterized views canonical
  // to the base catalog and stay out of the index. Pagination (page-only)
  // is NOT a facet: each page self-references so crawlers can index
  // listings beyond page 1.
  const pageIndex = pageIndexFrom(sp)
  const canonical =
    filtered || pageIndex === 0
      ? `${SITE_URL}/listings`
      : `${SITE_URL}/listings?page=${pageIndex + 1}`

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: filtered ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Bleje Pronën',
      locale: 'sq_AL',
      type: 'website',
    },
  }
}

export default async function ListingsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const params = toQueryParams(sp)
  const { rows, total } = await fetchListingsServer(params)

  const initialParams: Record<string, string> = {}
  for (const [k, v] of Object.entries(sp)) {
    const val = first(v)
    if (val) initialParams[k] = val
  }

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Katalogu i pronave — Bleje Pronën',
    numberOfItems: total,
    itemListElement: rows.map((r, i) => ({
      '@type': 'ListItem',
      position: (params.page ?? 0) * 12 + i + 1,
      url: `${SITE_URL}/listings/${r.id}`,
      name: r.title,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <ListingsExplorer initialRows={rows} initialTotal={total} initialParams={initialParams} />
    </>
  )
}
