import Link from 'next/link'

import { ListingsGrid } from '@/components/ListingsGrid'
import { fetchMarketStats } from '@/lib/listings-query'
import type { Listing } from '@/lib/supabase'
import {
  SITE_URL,
  TYPE_META,
  fmtInt,
  fmtPrice,
  hubPathEn,
  hubPathSq,
  marketPathSq,
  type HubType,
} from '@/lib/seo-slugs'

interface PropertyHubProps {
  city: string
  type: HubType
  hood?: string
  lang: 'sq' | 'en'
  rows: Listing[]
  total: number
  neighborhoods: { name: string; count: number }[]
}

/**
 * Server-rendered programmatic landing page body: real inventory, real
 * computed market statistics, extractable entity data for crawlers and LLM
 * grounding — no fabricated claims, every number derived from live rows.
 */
export async function PropertyHub({ city, type, hood, lang, rows, total, neighborhoods }: PropertyHubProps) {
  const stats = await fetchMarketStats(city)
  const meta = TYPE_META[type][lang]
  const where = hood ? (lang === 'sq' ? `${hood}, ${city}` : `${hood} in ${city}`) : city
  const median = stats?.medianSalePpm2 ?? null

  const h1 =
    lang === 'sq'
      ? `${meta.category} në ${where}`
      : `${meta.category} in ${where}`

  const intro =
    lang === 'sq'
      ? `Aktualisht ${total} pronë aktive ${meta.phrase} në ${where}.` +
        (median && type === 'shitje'
          ? ` Mesatarja e çmimit për m² në ${city} është ${fmtPrice(median)}, bazuar në listimet aktive.`
          : '') +
        ' Të dhënat përditësohen automatikisht sa herë që publikohet ose ndryshon një shpallje.'
      : `${total} active properties ${meta.phrase} in ${where}, Kosovo.` +
        (median && type === 'shitje'
          ? ` The current market average in ${city} is €${fmtInt(median)} per m², computed from active listings.`
          : '') +
        ' Figures refresh automatically as listings are published or updated.'

  const breadcrumb = [
    { name: lang === 'sq' ? 'Kreu' : 'Home', url: '/' },
    {
      name: lang === 'sq' ? 'Pronat' : 'Properties',
      url: lang === 'sq' ? '/listings' : '/listings',
    },
    { name: city, url: lang === 'sq' ? hubPathSq(city, type) : hubPathEn(city, type) },
    ...(hood ? [{ name: hood, url: lang === 'sq' ? hubPathSq(city, type, hood) : hubPathEn(city, type, hood) }] : []),
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ItemList',
        name: h1,
        numberOfItems: total,
        itemListElement: rows.slice(0, 24).map((r, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/listings/${r.id}`,
          name: r.title,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumb.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: `${SITE_URL}${b.url}`,
        })),
      },
      {
        '@type': 'Place',
        name: hood ? `${hood}, ${city}` : city,
        address: {
          '@type': 'PostalAddress',
          addressLocality: city,
          addressCountry: 'XK',
        },
      },
      ...(median
        ? [
            {
              '@type': 'Dataset',
              name:
                lang === 'sq'
                  ? `Statistika të tregut të pronave — ${city}`
                  : `Property market statistics — ${city}, Kosovo`,
              description:
                lang === 'sq'
                  ? 'Mesatarja e çmimit për m² dhe numri i listimeve aktive, llogaritur nga inventari live i Bleje Pronën.'
                  : 'Median price per m² and active listing counts computed from live Bleje Pronën inventory.',
              variableMeasured: [
                { '@type': 'PropertyValue', name: 'median_price_per_m2_eur', value: median },
                { '@type': 'PropertyValue', name: 'active_listings', value: total },
              ],
            },
          ]
        : []),
    ],
  }

  const otherType: HubType = type === 'shitje' ? 'qira' : 'shitje'

  return (
    <div className="bg-[#F7FAF9] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="text-xs text-gray-500 mb-4">
          <ol className="flex flex-wrap items-center gap-1.5">
            {breadcrumb.map((b, i) => (
              <li key={b.url + i} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true">/</span>}
                <Link href={b.url} className="hover:text-[#00675B] hover:underline">
                  {b.name}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#101828]">
          {h1}
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-gray-600">{intro}</p>

        {/* Extractable market stats strip */}
        {stats && (
          <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                {lang === 'sq' ? 'Listime aktive' : 'Active listings'}
              </dt>
              <dd className="text-xl font-extrabold text-[#101828] tabular-nums">{stats.total}</dd>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                {lang === 'sq' ? 'Për shitje' : 'For sale'}
              </dt>
              <dd className="text-xl font-extrabold text-[#101828] tabular-nums">{stats.forSale}</dd>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                {lang === 'sq' ? 'Me qira' : 'For rent'}
              </dt>
              <dd className="text-xl font-extrabold text-[#101828] tabular-nums">{stats.forRent}</dd>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                {lang === 'sq' ? 'Mesatarja €/m²' : 'Median €/m²'}
              </dt>
              <dd className="text-xl font-extrabold text-[#00675B] tabular-nums">
                {median ? fmtInt(median) : '—'}
              </dd>
            </div>
          </dl>
        )}

        {/* Inventory */}
        <div className="mt-8">
          {rows.length > 0 ? (
            <ListingsGrid rows={rows} />
          ) : (
            <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-6">
              {lang === 'sq'
                ? 'Nuk ka listime aktive me këto kritere momentalisht.'
                : 'No active listings match these criteria right now.'}
            </p>
          )}
        </div>

        {/* Cross-link mesh: sibling facets + neighborhood hubs + market page */}
        <div className="mt-10 flex flex-wrap gap-2">
          <Link
            href={lang === 'sq' ? hubPathSq(city, otherType) : hubPathEn(city, otherType)}
            className="text-xs font-semibold px-3 py-2 rounded-full bg-white border border-gray-200 text-[#00675B] hover:border-[#00675B]"
          >
            {lang === 'sq'
              ? `${TYPE_META[otherType].sq.category} në ${city}`
              : `${TYPE_META[otherType].en.category} in ${city}`}
          </Link>
          <Link
            href={marketPathSq(city)}
            className="text-xs font-semibold px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-[#00675B]"
          >
            {lang === 'sq' ? `Tregu i pronave — ${city}` : `Property market — ${city}`}
          </Link>
          {neighborhoods.slice(0, 8).map((n) => (
            <Link
              key={n.name}
              href={
                lang === 'sq'
                  ? hubPathSq(city, type, n.name)
                  : hubPathEn(city, type, n.name)
              }
              className="text-xs font-medium px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-[#00675B] hover:text-[#00675B]"
            >
              {n.name} ({n.count})
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
