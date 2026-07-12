import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, BedDouble, Maximize2, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
      <div className="group cursor-pointer h-full flex flex-col rounded-2xl overflow-hidden transition-all duration-300 bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 hover:-translate-y-1.5">
        {/* Image */}
        <div className="relative h-52 bg-gray-100 flex-shrink-0 overflow-hidden">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={listing.title}
              fill
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : null}
          {/* Gradient overlay at bottom of image */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
          <div className="absolute top-3 left-3">
            <Badge
              className={
                listing.type === 'shitje'
                  ? 'bg-[#1B4FFF] text-white font-semibold border border-[#1B4FFF]/30'
                  : 'bg-emerald-500/80 text-white font-semibold border border-emerald-400/30'
              }
            >
              {listing.type === 'shitje' ? 'Shitje' : 'Me qira'}
            </Badge>
          </div>
          {listing.is_featured && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-amber-500/70 text-white border border-amber-400/30">
                <Tag className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-[140px] p-4 flex flex-col">
          <h3 className="font-semibold text-[#1A1A2E] text-base leading-tight line-clamp-2 h-12 overflow-hidden mb-2">
            {listing.title}
          </h3>

          <p className="text-[#1B4FFF] font-bold text-2xl mb-3">
            {formatPrice(listing.price)}
            {listing.type === 'qira' && <span className="text-sm font-normal text-gray-400">/muaj</span>}
          </p>

          <div className="flex items-center text-gray-500 text-sm mb-3">
            <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">{listing.city} · {listing.address}</span>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-600 pt-3 border-t border-gray-100">
            <div className="flex items-center">
              <BedDouble className="h-4 w-4 mr-1.5 text-gray-400" />
              <span>{listing.rooms} dhoma</span>
            </div>
            <div className="flex items-center">
              <Maximize2 className="h-4 w-4 mr-1.5 text-gray-400" />
              <span>{listing.area_m2} m²</span>
            </div>
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
    <div className="h-full flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="h-52 flex-shrink-0 animate-pulse bg-gray-100" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
        <div className="flex gap-4 pt-3 border-t border-gray-100">
          <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  )
}
