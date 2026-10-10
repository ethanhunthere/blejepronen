import Link from 'next/link'

import { ListingsGrid } from '@/components/ListingsGrid'
import { ALL_CITIES } from '@/lib/kosovo-locations'
import { createPublicSupabaseClient } from '@/lib/supabase'
import { fetchMarketStats, fetchListingsServer } from '@/lib/listings-query'
import type { Listing } from '@/lib/supabase'
import { SITE_URL, fmtInt, fmtPrice, marketPathEn, marketPathSq, slugify } from '@/lib/seo-slugs'

interface MarketPageProps {
  city?: string
  lang: 'sq' | 'en'
}

/**
 * Market-intelligence entity page: computed, extractable statistics over live
 * inventory (counts, median €/m², price span, neighborhood distribution) plus
 * the freshest listings — the GEO grounding surface for AI search engines.
 */
export async function MarketPage({ city, lang }: MarketPageProps) {
  const supabase = createPublicSupabaseClient()

  let latestQuery = supabase
    .from('listings')
    .select('id,title,price,city,neighborhood,address,type,images,rooms,area_m2,is_featured,is_active,created_at,user_id,condition,floor,apartment_type,features')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(8)
  if (city) latestQuery = latestQuery.eq('city', city)

  const [stats, latestRes] = await Promise.all([
    fetchMarketStats(city ?? null),
    latestQuery,
  ])
  const latest = latestRes.data

  if (!stats) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm font-semibold text-[#101828]">
          {lang === 'sq' ? 'Statistikat nuk mund të ngarkoheshin.' : 'Statistics could not be loaded.'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {lang === 'sq' ? 'Provoni të rifreskoni faqen pas pak.' : 'Please refresh in a moment.'}
        </p>
      </div>
    )
  }

  const title = city ? (lang === 'sq' ? `Tregu i pronave në ${city}` : `Property market in ${city}, Kosovo`) : lang === 'sq' ? 'Tregu i pronave në Kosovë' : 'Kosovo property market'

  const breadcrumb = [
    { name: lang === 'sq' ? 'Kreu' : 'Home', url: '/' },
    { name: lang === 'sq' ? 'Tregu' : 'Market', url: lang === 'sq' ? '/tregu' : '/en/market' },
    ...(city ? [{ name: city, url: lang === 'sq' ? marketPathSq(city) : marketPathEn(city) }] : []),
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Dataset',
        name: `${title} — ${lang === 'sq' ? 'statistika live' : 'live statistics'}`,
        description:
          lang === 'sq'
            ? 'Statistika të llogaritura nga inventari live i shpalljeve në Bleje Pronën.'
            : 'Statistics computed from the live listing inventory of Bleje Pronën.',
        license: `${SITE_URL}/kushtet`,
        variableMeasured: [
          { '@type': 'PropertyValue', name: 'active_listings', value: stats.total },
          { '@type': 'PropertyValue', name: 'listings_for_sale', value: stats.forSale },
          { '@type': 'PropertyValue', name: 'listings_for_rent', value: stats.forRent },
          ...(stats.medianSalePpm2
            ? [{ '@type': 'PropertyValue', name: 'median_price_per_m2_eur', value: stats.medianSalePpm2 }]
            : []),
        ],
        temporalCoverage: stats.latestUpdate ? `${stats.latestUpdate.slice(0, 10)}/..` : undefined,
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
      ...(city
        ? [
            {
              '@type': 'AdministrativeArea',
              name: city,
              address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: 'XK' },
            },
          ]
        : [
            {
              '@type': 'Country',
              name: 'Kosovo',
              alternateName: 'Kosovë',
            },
          ]),
    ],
  }

  const statCard = (label: string, value: string, accent = false) => (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-xl font-extrabold tabular-nums ${accent ? 'text-[#00675B]' : 'text-[#101828]'}`}>
        {value}
      </div>
    </div>
  )

  return (
    <div className="bg-[#F7FAF9] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
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

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#101828]">{title}</h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-gray-600">
          {lang === 'sq'
            ? `Të dhëna të llogaritura në kohë reale nga ${stats.total} listime aktive${city ? ` në ${city}` : ' në të gjithë Kosovën'}. Përdorimi: krahasimi i çmimeve, vendimmarrje blerjeje dhe qiradhënieje.`
            : `Real-time figures computed from ${stats.total} active listings${city ? ` in ${city}` : ' across Kosovo'}. Use them to compare prices and inform buying or renting decisions.`}
        </p>

        <dl className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCard(lang === 'sq' ? 'Listime aktive' : 'Active listings', fmtInt(stats.total))}
          {statCard(lang === 'sq' ? 'Për shitje' : 'For sale', fmtInt(stats.forSale))}
          {statCard(lang === 'sq' ? 'Me qira' : 'For rent', fmtInt(stats.forRent))}
          {statCard(
            lang === 'sq' ? 'Mesatarja €/m²' : 'Median €/m²',
            stats.medianSalePpm2 ? fmtInt(stats.medianSalePpm2) : '—',
            true
          )}
          {statCard(
            lang === 'sq' ? 'Spanja e çmimeve' : 'Price span',
            stats.minSale && stats.maxSale ? `${fmtInt(stats.minSale)}–${fmtInt(stats.maxSale)} €` : '—'
          )}
        </dl>

        {stats.neighborhoods.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-[#101828]">
              {lang === 'sq' ? `Lagjet me më së shumti listime${city ? ` në ${city}` : ''}` : `Neighborhoods with the most listings${city ? ` in ${city}` : ''}`}
            </h2>
            <div className="mt-3 overflow-hidden bg-white border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="px-4 py-2.5 font-semibold">{lang === 'sq' ? 'Lagjia' : 'Neighborhood'}</th>
                    <th className="px-4 py-2.5 font-semibold text-right">{lang === 'sq' ? 'Listime' : 'Listings'}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.neighborhoods.map((n) => (
                    <tr key={n.name} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2.5 text-gray-700">
                        <Link
                          href={
                            city
                              ? `/${lang === 'sq' ? 'pronat' : 'en/property'}/${slugify(city)}/shitje/${slugify(n.name)}`
                              : `/${lang === 'sq' ? 'listings' : 'listings'}?neighborhood=${encodeURIComponent(n.name)}`
                          }
                          className="hover:text-[#00675B] hover:underline"
                        >
                          {n.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{n.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!city && (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-[#101828]">
              {lang === 'sq' ? 'Tregjet sipas komunës' : 'Markets by municipality'}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {ALL_CITIES.map((c) => (
                <Link
                  key={c}
                  href={lang === 'sq' ? marketPathSq(c) : marketPathEn(c)}
                  className="text-xs font-medium px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-[#00675B] hover:text-[#00675B]"
                >
                  {c}
                </Link>
              ))}
            </div>
          </section>
        )}

        {(latest as Listing[] | null)?.length ? (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-[#101828]">
              {lang === 'sq' ? 'Listimet më të reja' : 'Latest listings'}
            </h2>
            <div className="mt-3">
              <ListingsGrid rows={latest as Listing[]} />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
