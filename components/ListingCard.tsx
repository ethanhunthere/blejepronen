'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, BedDouble, Maximize2, Heart, Star, Building2 } from 'lucide-react'
import type { Listing } from '@/lib/supabase'
import { cardImageSrc } from '@/lib/image-transform'

export type ListingCardData = Pick<
  Listing,
  'id' | 'title' | 'price' | 'city' | 'address' | 'rooms' | 'area_m2' | 'type' | 'images' | 'is_featured'
> & {
  apartment_type?: string | null
}

interface ListingCardProps {
  listing: ListingCardData
  priority?: boolean
  isFavorited?: boolean
  onToggleFavorite?: (id: string) => void
  showFavorite?: boolean
}

const formatPrice = (price?: number | null) => {
  if (price === undefined || price === null || isNaN(price) || price <= 0) {
    return 'Me marrëveshje'
  }
  return new Intl.NumberFormat('sq-AL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price)
}

const ListingCard = React.memo(function ListingCard({
  listing,
  priority = false,
  isFavorited = false,
  onToggleFavorite,
  showFavorite = true,
}: ListingCardProps) {
  const images = (listing.images || []).filter(Boolean)
  const coverImage = images[0] || null

  return (
    <article className="relative h-full group">
      <div className="h-full flex flex-col rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.06)] card-hover">
        {/* Cover Image Container */}
        <div className="relative aspect-[4/3] bg-slate-100 flex-shrink-0 overflow-hidden">
          {coverImage ? (
            <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.03]">
              <Image
                src={cardImageSrc(coverImage)}
                alt={listing.title}
                fill
                priority={priority}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
              Pa foto
            </div>
          )}

          {/* Type badge - quiet, architectural */}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center bg-white text-slate-800 text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full shadow-xs border border-black/5">
              {listing.type === 'shitje' ? 'Shitje' : 'Qira'}
            </span>
          </div>

          {/* Save + Featured stack (z-20 keeps Favorite above the stretched link overlay) */}
          <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
            {showFavorite && (
              <button
                type="button"
                aria-label={isFavorited ? 'Hiq nga të preferuarat' : 'Ruaj listimin'}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onToggleFavorite?.(listing.id)
                }}
                className="relative z-20 bg-white rounded-full w-11 h-11 flex items-center justify-center shadow-xs border border-black/5 hover:bg-white active:scale-90 transition-all duration-150 cursor-pointer"
              >
                <Heart
                  className={`h-4 w-4 transition-colors ${
                    isFavorited ? 'text-red-500 fill-red-500' : 'text-slate-600'
                  }`}
                />
              </button>
            )}
            {listing.is_featured && (
              <span className="inline-flex items-center gap-1 bg-gold text-gold-foreground text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-xs pointer-events-none">
                <Star className="h-2.5 w-2.5 fill-current" />
                E veçuar
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-4">
          <Link
            href={`/listings/${listing.id}`}
            prefetch={true}
            className="after:absolute after:inset-0 after:content-[''] after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[#00675B]"
          >
            <h3 className="font-semibold text-slate-900 text-[15px] leading-snug line-clamp-2 min-h-[42px] group-hover:text-[#00675B] transition-colors">
              {listing.title}
            </h3>
          </Link>

          <div className="flex items-center text-slate-500 text-xs truncate mt-1.5">
            <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0 text-slate-400" />
            <span className="truncate">{listing.address ? `${listing.city} · ${listing.address}` : listing.city}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 mt-2.5">
            {listing.rooms && listing.rooms > 0 ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <BedDouble className="h-3.5 w-3.5 text-slate-400" />
                <span>{listing.rooms} dhoma</span>
              </div>
            ) : listing.apartment_type ? (
              <div className="flex items-center gap-1 flex-shrink-0 text-[#00675B] font-medium">
                <Building2 className="h-3.5 w-3.5" />
                <span className="truncate max-w-[120px]">{listing.apartment_type}</span>
              </div>
            ) : null}
            {listing.area_m2 && listing.area_m2 > 0 ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
                <span>{listing.area_m2} m²</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-baseline justify-between gap-2 mt-auto pt-3 border-t border-slate-100">
            <div className="flex items-baseline gap-1">
              <span suppressHydrationWarning className="text-[17px] font-bold text-[#00675B] tracking-tight whitespace-nowrap">
                {formatPrice(listing.price)}
              </span>
              {listing.type === 'qira' && <span className="text-xs text-slate-500 font-normal">/muaj</span>}
            </div>
            {listing.type === 'shitje' && listing.price && listing.price > 0 && listing.area_m2 && listing.area_m2 > 0 ? (
              <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                ≈ €{Math.round(listing.price / listing.area_m2)}/m²
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
})

export default ListingCard

/** Skeleton loader for ListingCard */
export function ListingCardSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-200/70 shadow-xs">
      <div className="aspect-[4/3] flex-shrink-0 skeleton" />
      <div className="p-4 space-y-2.5">
        <div className="h-4 w-3/4 rounded skeleton" />
        <div className="h-3 w-1/2 rounded skeleton" />
        <div className="h-3 w-2/3 rounded skeleton" />
        <div className="h-4 w-1/3 rounded skeleton pt-2" />
      </div>
    </div>
  )
}
