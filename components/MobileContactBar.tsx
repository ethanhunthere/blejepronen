'use client'

import { useEffect, useState } from 'react'
import { Phone, MessageCircle, Heart, Lock } from 'lucide-react'
import Link from 'next/link'
import { useFavorites } from '@/lib/useFavorites'
import { normalizePhoneNumber } from '@/lib/phone'
import { trackListingLead } from '@/lib/analytics'
import { createPublicSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface MobileContactBarProps {
  price: string
  pricePerSqm?: string | null
  listingId: string
  listingTitle?: string
  listingCity?: string
}

type ContactState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'ready'; phone: string | null }

export default function MobileContactBar({
  price,
  pricePerSqm,
  listingId,
  listingTitle,
  listingCity,
}: MobileContactBarProps) {
  const { favoriteIds, toggleFavorite } = useFavorites()
  const isFavorited = favoriteIds.includes(listingId)
  const [contact, setContact] = useState<ContactState>({ status: 'loading' })

  // Contact details are never server-rendered: resolve them after login.
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const supabase = createPublicSupabaseClient()
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
          if (mounted) setContact({ status: 'anon' })
          return
        }
        const res = await fetch(`/api/contact?listingId=${encodeURIComponent(listingId)}`, {
          credentials: 'same-origin',
        })
        if (!res.ok) {
          if (mounted) setContact({ status: 'ready', phone: null })
          return
        }
        const json = (await res.json()) as { phone?: string | null; isOwn?: boolean }
        if (mounted) setContact({ status: 'ready', phone: json.phone ?? null })
      } catch {
        if (mounted) setContact({ status: 'ready', phone: null })
      }
    })()
    return () => {
      mounted = false
    }
  }, [listingId])

  const phone = contact.status === 'ready' ? contact.phone : null
  const cleanPhone = phone ? normalizePhoneNumber(phone).replace(/\D/g, '') : ''
  const waGreeting = encodeURIComponent(
    `Përshëndetje! Po ju kontaktoj nga BlejePronën për pronën tuaj: "${listingTitle || 'Pronë'}"${listingCity ? ` në ${listingCity}` : ''} (https://blejepronen.com/listings/${listingId}). A është ende e lirë?`
  )
  const whatsAppUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waGreeting}` : null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200/80 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-4 pt-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Heart + Price */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleFavorite(listingId)
              if (!isFavorited) toast.success('U ruajt te të preferuarat!')
              else toast.info('U hoq nga të preferuarat.')
            }}
            className={`w-11 h-11 rounded-full border flex items-center justify-center flex-shrink-0 transition-all active:scale-95 cursor-pointer ${
              isFavorited
                ? 'border-rose-200 bg-rose-50 text-rose-500'
                : 'border-gray-200 bg-gray-50 text-gray-500'
            }`}
            aria-label={isFavorited ? 'Hiq nga të ruajturat' : 'Ruaj pronën'}
          >
            <Heart
              className="h-4 w-4"
              fill={isFavorited ? 'currentColor' : 'none'}
            />
          </button>

          <div className="min-w-0">
            <p className="text-base sm:text-lg font-black text-[#101828] leading-tight truncate">
              {price}
            </p>
            {pricePerSqm && (
              <p className="text-[11px] font-semibold text-gray-500 truncate">
                {pricePerSqm}/m²
              </p>
            )}
          </div>
        </div>

        {/* Right: Instant Contact CTAs */}
        <div className="flex items-center gap-2 shrink-0">
          {contact.status === 'anon' ? (
            <Link
              href={`/login?redirect=/listings/${listingId}`}
              className="min-h-[44px] h-11 px-4 rounded-xl bg-[#00675B] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Lock className="h-4 w-4" />
              <span>Kyçu për kontakt</span>
            </Link>
          ) : (
            <>
              {whatsAppUrl && (
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => void trackListingLead(listingId)}
                  className="min-h-[44px] h-11 px-4 rounded-xl bg-[#25D366] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  aria-label="Kontakto në WhatsApp"
                >
                  <MessageCircle className="h-4 w-4 fill-white" />
                  <span>WhatsApp</span>
                </a>
              )}

              {phone ? (
                <a
                  href={`tel:${normalizePhoneNumber(phone)}`}
                  onClick={() => void trackListingLead(listingId)}
                  className="min-h-[44px] h-11 px-4 rounded-xl bg-[#00675B] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  aria-label="Telefono shitësin"
                >
                  <Phone className="h-4 w-4" />
                  <span>Telefono</span>
                </a>
              ) : (
                <a
                  href="#seller-info"
                  className="min-h-[44px] h-11 px-4 rounded-xl bg-[#00675B] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <span>Detajet</span>
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
