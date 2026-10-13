import { NextResponse } from 'next/server'
import { createPublicSupabaseClient } from '@/lib/supabase'
import { CITY_GEO_MATRIX, normalizeGeoCityKey } from '@/lib/geo-seo'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://blejepronen.com'

export const revalidate = 1800 // Cache for 30 minutes

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const supabase = createPublicSupabaseClient()
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, description, price, city, neighborhood, type, area_m2, created_at, latitude, longitude')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = listings || []
  const now = new Date().toUTCString()

  const items = rows
    .map((l) => {
      const geoKey = normalizeGeoCityKey(l.city)
      const defaultGeo = CITY_GEO_MATRIX[geoKey] || CITY_GEO_MATRIX['prishtine']
      const lat = typeof l.latitude === 'number' ? l.latitude : defaultGeo.latitude
      const lng = typeof l.longitude === 'number' ? l.longitude : defaultGeo.longitude

      const cleanTitle = escapeXml(l.title || `Pronë në ${l.city}`)
      const priceText = l.price && l.price > 0 ? `€${Number(l.price).toLocaleString('de-DE')}` : 'Me marrëveshje'
      const typeText = l.type === 'qira' ? 'Me qira' : 'Në shitje'
      const areaText = l.area_m2 ? ` | ${l.area_m2}m²` : ''
      const locText = [l.neighborhood, l.city].filter(Boolean).join(', ')

      const desc = escapeXml(
        `${priceText} - ${typeText}${areaText} në ${locText}. ${l.description || 'Kontakto direkt pa komision në Bleje Pronën.'}`
      )
      const link = `${siteUrl}/listings/${l.id}`
      const pubDate = new Date(l.created_at).toUTCString()

      return `    <item>
      <title>${cleanTitle} (${priceText})</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>
      <geo:lat>${lat}</geo:lat>
      <geo:long>${lng}</geo:long>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Bleje Pronën | Shpalljet më të reja të patundshmërive</title>
    <link>${siteUrl}</link>
    <description>Shpalljet më të reja për banesa, shtëpi dhe troje në shitje dhe me qira në Kosovë, Shqipëri dhe Diasporë.</description>
    <language>sq</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
    },
  })
}
