import { NextResponse } from 'next/server'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://blejepronen.com'

export const revalidate = 86400

export async function GET() {
  const now = new Date().toISOString()
  const staticRoutes = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/listings', priority: '0.9', changefreq: 'daily' },
    { path: '/pronat', priority: '0.8', changefreq: 'weekly' },
    { path: '/tregu', priority: '0.8', changefreq: 'weekly' },
    { path: '/en/property', priority: '0.7', changefreq: 'weekly' },
    { path: '/en/market', priority: '0.7', changefreq: 'weekly' },
    { path: '/kontakti', priority: '0.5', changefreq: 'monthly' },
    { path: '/kushtet', priority: '0.3', changefreq: 'yearly' },
    { path: '/privatesia', priority: '0.3', changefreq: 'yearly' },
  ]

  const urls = staticRoutes
    .map(
      (r) => `  <url>
    <loc>${siteUrl}${r.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
