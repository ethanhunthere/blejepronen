'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, BedDouble, Maximize2, Heart, Tag } from 'lucide-react'
import type { Listing } from '@/lib/supabase'

export type ListingCardData = Pick<
  Listing,
  'id' | 'title' | 'price' | 'city' | 'address' | 'rooms' | 'area_m2' | 'type' | 'images' | 'is_featured'
>

interface ListingCardProps {
  listing: ListingCardData
  priority?: boolean
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('sq-AL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price)

const ListingCard = React.memo(function ListingCard({ listing, priority = false }: ListingCardProps) {
  const mainImage = listing.images?.[0] || ''

  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="group cursor-pointer h-full flex flex-col rounded-2xl overflow-hidden bg-white shadow-sm card-hover">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-gray-100 flex-shrink-0 overflow-hidden rounded-2xl">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={listing.title}
              fill
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            />
          ) : null}

          {/* Type badge — quiet, uncolored (Airbnb style) */}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center bg-white/90 backdrop-blur-sm text-[#111827] text-[11px] font-semibold px-2.5 py-1 rounded-full">
              {listing.type === 'shitje' ? 'Shitje' : 'Me qira'}
            </span>
          </div>

          {/* Save + Featured stack */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
            <button
              type="button"
              aria-label="Ruaj listimin"
              onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
              className="text-white hover:text-red-500 transition-colors duration-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] cursor-pointer"
            >
              <Heart className="h-5 w-5" />
            </button>
            {listing.is_featured && (
              <span className="inline-flex items-center bg-[#1B4FFF] text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                <Tag className="h-3 w-3 mr-1" />
                Featured
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col gap-2 p-4">
          <h3 className="font-semibold text-[#111827] text-sm leading-snug line-clamp-2 min-h-[40px]">
            {listing.title}
          </h3>

          <div className="flex items-center text-[#6B7280] text-[13px] truncate mt-1">
            <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
            <span className="truncate">{listing.city} · {listing.address}</span>
          </div>

          <div className="flex items-center gap-3 text-[13px] text-[#6B7280]">
            <div className="flex items-center gap-1 flex-shrink-0">
              <BedDouble className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">{listing.rooms} dhoma</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">{listing.area_m2} m²</span>
            </div>
          </div>

          <div className="flex items-baseline gap-1 mt-auto">
            <span className="text-[15px] font-semibold text-[#111827] whitespace-nowrap">
              {formatPrice(listing.price)}
            </span>
            {listing.type === 'qira' && <span className="text-[13px] text-[#6B7280]">/muaj</span>}
          </div>
        </div>
      </div>
    </Link>
  )
})

export default ListingCard

/** Skeleton loader for ListingCard */
export function ListingCardSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="aspect-[4/3] flex-shrink-0 rounded-2xl skeleton" />
      <div className="pt-3 space-y-2">
        <div className="h-4 w-40 rounded skeleton" />
        <div className="h-3.5 w-32 rounded skeleton" />
        <div className="h-3.5 w-28 rounded skeleton" />
        <div className="h-4 w-24 rounded skeleton" />
      </div>
    </div>
  )
}
