import { NextResponse } from 'next/server'
import { slugify } from '@/lib/seo-slugs'
import { ALL_CITIES } from '@/lib/kosovo-locations'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://blejepronen.com'

export const revalidate = 86400

// Expanded cities covering Kosovo, Albania, and North Macedonia
const REGIONAL_CITIES = [
  ...ALL_CITIES,
  'Tiranë',
  'Durrës',
  'Vlorë',
  'Shkodër',
  'Sarandë',
  'Shkup',
  'Tetovë',
  'Gostivar',
]

const CATEGORY_TRANSACTIONS = [
  { prefix: 'banesa-ne-shitje', priority: '0.9' },
  { prefix: 'banesa-me-qira', priority: '0.9' },
  { prefix: 'shtepi-ne-shitje', priority: '0.85' },
  { prefix: 'shtepi-me-qira', priority: '0.8' },
  { prefix: 'truall-ne-shitje', priority: '0.85' },
  { prefix: 'lokale-ne-shitje', priority: '0.8' },
  { prefix: 'lokale-me-qira', priority: '0.8' },
  { prefix: 'zyre-me-qira', priority: '0.8' },
  { prefix: 'prona-ne-shitje', priority: '0.9' },
  { prefix: 'prona-me-qira', priority: '0.9' },
]

export async function GET() {
  const now = new Date().toISOString()
  const urls: string[] = []

  for (const city of REGIONAL_CITIES) {
    const citySlug = slugify(city)
    for (const cat of CATEGORY_TRANSACTIONS) {
      urls.push(`  <url>
    <loc>${siteUrl}/${cat.prefix}/${citySlug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${cat.priority}</priority>
  </url>`)
    }
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
