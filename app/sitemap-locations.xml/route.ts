import { NextResponse } from 'next/server'
import { fetchHubStaticParams } from '@/lib/listings-query'
import { hubPathEn, hubPathSq, marketPathEn, marketPathSq, slugify } from '@/lib/seo-slugs'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://blejepronen.com'

export const revalidate = 86400

export async function GET() {
  const now = new Date().toISOString()
  let hubParams = { cityTypes: [] as { city: string; type: 'shitje' | 'qira' }[], hoods: [] as { city: string; type: 'shitje' | 'qira'; hood: string }[], cities: [] as string[] }

  try {
    hubParams = await fetchHubStaticParams()
  } catch {
    // Fallback if DB is slow
  }

  const urls: string[] = []

  // City and Type Landing Hubs (sq & en)
  for (const { city, type } of hubParams.cityTypes) {
    const sqPath = hubPathSq(city, type)
    const enPath = hubPathEn(city, type)
    const citySlug = slugify(city)

    urls.push(`  <url>
    <loc>${siteUrl}${sqPath}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`)

    urls.push(`  <url>
    <loc>${siteUrl}${enPath}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`)

    // Programmatic Intent permutations
    if (type === 'shitje') {
      urls.push(`  <url>
    <loc>${siteUrl}/prona-ne-shitje/${citySlug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`)
      urls.push(`  <url>
    <loc>${siteUrl}/banesa-ne-shitje/${citySlug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`)
      urls.push(`  <url>
    <loc>${siteUrl}/shtepi-ne-shitje/${citySlug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`)
      urls.push(`  <url>
    <loc>${siteUrl}/truall-ne-shitje/${citySlug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`)
    } else {
      urls.push(`  <url>
    <loc>${siteUrl}/prona-me-qira/${citySlug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`)
      urls.push(`  <url>
    <loc>${siteUrl}/banesa-me-qira/${citySlug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`)
      urls.push(`  <url>
    <loc>${siteUrl}/zyre-me-qira/${citySlug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`)
    }
  }

  // Neighborhood Hubs
  for (const { city, type, hood } of hubParams.hoods) {
    const sqPath = hubPathSq(city, type, hood)
    const enPath = hubPathEn(city, type, hood)
    const citySlug = slugify(city)
    const hoodSlug = slugify(hood)

    urls.push(`  <url>
    <loc>${siteUrl}${sqPath}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`)

    urls.push(`  <url>
    <loc>${siteUrl}${enPath}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>`)

    if (type === 'shitje') {
      urls.push(`  <url>
    <loc>${siteUrl}/prona-ne-shitje/${citySlug}/${hoodSlug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`)
    } else {
      urls.push(`  <url>
    <loc>${siteUrl}/prona-me-qira/${citySlug}/${hoodSlug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`)
    }
  }

  // Market stats city hubs
  for (const city of hubParams.cities) {
    urls.push(`  <url>
    <loc>${siteUrl}${marketPathSq(city)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`)
    urls.push(`  <url>
    <loc>${siteUrl}${marketPathEn(city)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
