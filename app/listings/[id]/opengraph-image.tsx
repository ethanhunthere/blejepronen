import { ImageResponse } from 'next/og'

import { createPublicSupabaseClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'

export const alt = 'Bleje Pronën — shpallje pronë në Kosovë'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 3600

const fmt = (n: number) => new Intl.NumberFormat('de-DE').format(n)

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createPublicSupabaseClient()
  const { data } = await supabase
    .from('listings')
    .select('title,price,city,neighborhood,rooms,area_m2,type,images')
    .eq('id', id)
    .maybeSingle()

  const listing = data as Listing | null
  const price =
    listing?.price && listing.price > 0 ? `${fmt(listing.price)} €` : 'Me marrëveshje'
  const specs = [
    listing?.rooms ? `${listing.rooms} dhoma` : null,
    listing?.area_m2 ? `${listing.area_m2} m²` : null,
    listing?.neighborhood || listing?.city || null,
  ]
    .filter(Boolean)
    .join('  •  ')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#00392F',
          padding: 56,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#C8B882',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00392F',
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            B
          </div>
          <div style={{ color: '#FFFFFF', fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
            Bleje Pronën
          </div>
          <div style={{ color: '#9FC7BE', fontSize: 20, fontWeight: 600, marginLeft: 8 }}>
            {listing?.type === 'qira' ? 'ME QIRA' : 'NË SHITJE'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              color: '#FFFFFF',
              fontSize: 46,
              fontWeight: 800,
              letterSpacing: -1,
              lineHeight: 1.15,
              maxWidth: 1000,
            }}
          >
            {listing?.title || 'Pronë në Kosovë'}
          </div>
          {specs ? <div style={{ color: '#9FC7BE', fontSize: 26, fontWeight: 600 }}>{specs}</div> : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <div style={{ color: '#C8B882', fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>{price}</div>
          {listing?.area_m2 && listing?.price ? (
            <div style={{ color: '#9FC7BE', fontSize: 26, fontWeight: 600 }}>
              {`${fmt(Math.round(listing.price / listing.area_m2))} €/m²`}
            </div>
          ) : null}
        </div>
      </div>
    ),
    size
  )
}
