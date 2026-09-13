'use client'

import { Phone, MessageCircle, Heart } from 'lucide-react'
import { useFavorites } from '@/lib/useFavorites'
import { normalizePhoneNumber } from '@/lib/phone'
import { toast } from 'sonner'

interface MobileContactBarProps {
  price: string
  pricePerSqm?: string | null
  phone?: string | null
  listingId: string
  listingTitle?: string
  listingCity?: string
}

export default function MobileContactBar({
  price,
  pricePerSqm,
  phone,
  listingId,
  listingTitle,
  listingCity,
}: MobileContactBarProps) {
  const { favoriteIds, toggleFavorite } = useFavorites()
  const isFavorited = favoriteIds.includes(listingId)

  const cleanPhone = phone ? normalizePhoneNumber(phone).replace(/\D/g, '') : ''
  const waGreeting = encodeURIComponent(
    `Përshëndetje! Po ju kontaktoj nga BlejePronën për pronën tuaj: "${listingTitle || 'Pronë'}"${listingCity ? ` në ${listingCity}` : ''} (https://blejepronen.com/listings/${listingId}). A është ende e lirë?`
  )
  const whatsAppUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waGreeting}` : null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-4 pt-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
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
            className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 transition-all active:scale-95 ${
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
          {whatsAppUrl && (
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-3.5 rounded-xl bg-[#25D366] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              aria-label="Kontakto në WhatsApp"
            >
              <MessageCircle className="h-4 w-4 fill-white" />
              <span>WhatsApp</span>
            </a>
          )}

          {phone ? (
            <a
              href={`tel:${phone}`}
              className="h-10 px-3.5 rounded-xl bg-[#006459] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              aria-label="Telefono shitësin"
            >
              <Phone className="h-4 w-4" />
              <span>Telefono</span>
            </a>
          ) : (
            <a
              href="#contact-card"
              className="h-10 px-3.5 rounded-xl bg-[#006459] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <span>Detajet</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
