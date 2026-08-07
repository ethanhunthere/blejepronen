'use client'

import { Phone, Heart } from 'lucide-react'
import { useFavorites } from '@/lib/useFavorites'

interface MobileContactBarProps {
  price: string
  pricePerSqm?: string | null
  phone?: string | null
  listingId: string
}

export default function MobileContactBar({ price, pricePerSqm, phone, listingId }: MobileContactBarProps) {
  const { favoriteIds, toggleFavorite } = useFavorites()
  const isFavorited = favoriteIds.includes(listingId)

  const scrollToContact = () => {
    if (typeof window === 'undefined') return
    const el = document.getElementById('contact-card')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-100 shadow-lg px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleFavorite(listingId)
            }}
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ease-out touch-manipulation cursor-pointer hover:shadow-md active:scale-95 ${
              isFavorited
                ? 'border-red-200 bg-red-50 text-red-500'
                : 'border-gray-200 bg-white text-gray-400 hover:border-red-200 hover:text-red-400'
            }`}
            aria-label={isFavorited ? 'Hiq nga të ruajturat' : 'Ruaj banesën'}
          >
            <Heart
              className="h-5 w-5"
              fill={isFavorited ? 'currentColor' : 'none'}
            />
          </button>
          <div className="min-w-0">
            <p className="text-xl font-black text-[#1A1A2E] truncate">{price}</p>
            {pricePerSqm && (
              <p className="text-xs text-gray-400 truncate">{pricePerSqm}</p>
            )}
          </div>
        </div>
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="shrink-0 inline-flex items-center min-h-[44px] gap-2 bg-[#006459] text-white font-bold px-5 py-3 rounded-2xl text-sm hover:bg-[#005048] hover:shadow-lg hover:shadow-[#006459]/25 active:scale-95 transition-all duration-200 ease-out cursor-pointer"
          >
            <Phone className="h-4 w-4" />
            Kontakto
          </a>
        ) : (
          <button
            type="button"
            onClick={scrollToContact}
            className="shrink-0 inline-flex items-center min-h-[44px] gap-2 bg-[#006459] text-white font-bold px-5 py-3 rounded-2xl text-sm hover:bg-[#005048] hover:shadow-lg hover:shadow-[#006459]/25 active:scale-95 transition-all duration-200 ease-out cursor-pointer"
          >
            <Phone className="h-4 w-4" />
            Kontakto
          </button>
        )}
      </div>
    </div>
  )
}
