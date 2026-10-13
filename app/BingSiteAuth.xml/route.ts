import { NextResponse } from 'next/server'

export const dynamic = 'force-static'
export const revalidate = 86400

export async function GET() {
  const token = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || '442D1574441584A22F5F30F1536E4F18'
  const xml = `<?xml version="1.0"?>
<users>
  <user>${token}</user>
</users>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
