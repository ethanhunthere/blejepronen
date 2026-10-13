import { NextResponse } from 'next/server'
import { createPublicSupabaseClient } from '@/lib/supabase'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://blejepronen.com'

export const revalidate = 3600

export async function GET() {
  const supabase = createPublicSupabaseClient()
  const { data: listings } = await supabase
    .from('listings')
    .select('id, updated_at, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(10000)

  const rows = listings || []
  const defaultDate = new Date().toISOString()

  const urls = rows
    .map((l) => {
      const lastMod = l.updated_at ? new Date(l.updated_at).toISOString() : l.created_at ? new Date(l.created_at).toISOString() : defaultDate
      return `  <url>
    <loc>${siteUrl}/listings/${l.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
