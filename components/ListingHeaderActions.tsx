'use client'

import { useState } from 'react'
import { Heart, Share2, Check } from 'lucide-react'
import { useFavorites } from '@/lib/useFavorites'
import { toast } from 'sonner'

interface ListingHeaderActionsProps {
  listingId: string
  title: string
  price: string
  city: string
}

export default function ListingHeaderActions({
  listingId,
  title,
  price,
  city,
}: ListingHeaderActionsProps) {
  const [copied, setCopied] = useState(false)
  const { favoriteIds, toggleFavorite } = useFavorites()
  const isFav = favoriteIds.includes(listingId)

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : `https://blejepronen.com/listings/${listingId}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${title} | Bleje Pronën`,
          text: `Shiko këtë pronë në ${city}: ${title} (${price})`,
          url,
        })
        return
      } catch {
        // User canceled or share failed, fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Linku i pronës u kopjua me sukses!')
      setTimeout(() => setCopied(false), 2200)
    } catch {
      toast.error('Nuk u arrit kopjimi i linkut.')
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Share button */}
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs hover:border-gray-300 transition-all duration-150 cursor-pointer active:scale-95"
        title="Shpërndaj pronën"
        aria-label="Shpërndaj pronën"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-emerald-700">U kopjua</span>
          </>
        ) : (
          <>
            <Share2 className="h-3.5 w-3.5 text-gray-500" />
            <span>Shpërndaj</span>
          </>
        )}
      </button>

      {/* Save button */}
      <button
        type="button"
        onClick={() => {
          toggleFavorite(listingId)
          if (!isFav) {
            toast.success('Prona u ruajt te të preferuarat!')
          } else {
            toast.info('Prona u hoq nga të preferuarat.')
          }
        }}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-2xs transition-all duration-150 cursor-pointer active:scale-95 ${
          isFav
            ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
            : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:border-gray-300'
        }`}
        title={isFav ? 'Hiq nga të preferuarat' : 'Ruaj te të preferuarat'}
        aria-label={isFav ? 'Hiq nga të preferuarat' : 'Ruaj te të preferuarat'}
      >
        <Heart
          className={`h-3.5 w-3.5 ${isFav ? 'text-rose-500 fill-rose-500' : 'text-gray-500'}`}
        />
        <span>{isFav ? 'E ruajtur' : 'Ruaj'}</span>
      </button>
    </div>
  )
}
