import type { Metadata } from 'next'
import Link from 'next/link'

import { fetchHubStaticParams } from '@/lib/listings-query'
import { SITE_URL, hubPathSq } from '@/lib/seo-slugs'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Pronat sipas qytetit — Bleje Pronën',
  description:
    'Zgjidh qytetin dhe llojin e pronës për të parë listimet aktive, çmimet dhe statistikat e tregut.',
  alternates: {
    canonical: `${SITE_URL}/pronat`,
    languages: {
      sq: `${SITE_URL}/pronat`,
      en: `${SITE_URL}/en/property`,
      'x-default': `${SITE_URL}/pronat`,
    },
  },
  robots: { index: true, follow: true },
}

export default async function PronatIndex() {
  const { cityTypes } = await fetchHubStaticParams()

  return (
    <div className="min-h-screen bg-[#F2F7F7]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#101828]">
          Pronat sipas qytetit
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Hub-et e tregut me listime aktive — shitje dhe qira sipas komunës.
        </p>

        {cityTypes.length === 0 ? (
          <p className="mt-8 text-sm text-gray-500">
            Ende nuk ka hub-e të stokura. Shiko{' '}
            <Link href="/listings" className="font-semibold text-[#00675B] hover:underline">
              të gjitha pronat
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cityTypes.map(({ city, type }) => (
              <li key={`${city}-${type}`}>
                <Link
                  href={hubPathSq(city, type)}
                  className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#101828] hover:border-[#00675B]/40 hover:text-[#00675B] transition-colors min-h-[44px]"
                >
                  <span>{`${city} — ${type === 'shitje' ? 'Në shitje' : 'Me qira'}`}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
