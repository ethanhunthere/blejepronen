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
      <div className={`group h-full flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:bg-white/15 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1 ${
        listing.type === 'shitje'
          ? 'bg-white/10 border border-white/20'
          : 'bg-[#0D1F3C] border border-blue-500/20'
      }`}>
        {/* Image */}
        <div className="relative h-52 bg-white/5 flex-shrink-0">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={listing.title}
              fill
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
            />
          ) : null}
          <div className="absolute top-3 left-3">
            <Badge
              className={
                listing.type === 'shitje'
                  ? 'bg-[#1B4FFF]/80 text-white border border-[#1B4FFF]/30'
                  : 'bg-emerald-500/70 text-white border border-emerald-400/30'
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
        <div className="flex-1 min-h-[140px] bg-gradient-to-b from-white/5 to-transparent p-4 flex flex-col">
          <h3 className="font-semibold text-white text-base leading-tight line-clamp-2 h-12 overflow-hidden mb-2">
            {listing.title}
          </h3>

          <p className="text-white font-bold text-2xl mb-3">
            {formatPrice(listing.price)}
            {listing.type === 'qira' && <span className="text-sm font-normal text-white/50">/muaj</span>}
          </p>

          <div className="flex items-center text-white/60 text-sm mb-3">
            <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">{listing.city} · {listing.address}</span>
          </div>

          <div className="flex items-center space-x-4 text-sm text-white/70 pt-3 border-t border-white/10">
            <div className="flex items-center">
              <BedDouble className="h-4 w-4 mr-1.5 text-white/40" />
              <span>{listing.rooms} dhoma</span>
            </div>
            <div className="flex items-center">
              <Maximize2 className="h-4 w-4 mr-1.5 text-white/40" />
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
    <div className="h-full flex flex-col bg-white/8 border border-white/15 rounded-2xl overflow-hidden">
      <div className="h-52 flex-shrink-0 animate-pulse bg-white/5" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-48 animate-pulse rounded bg-white/10" />
        <div className="h-8 w-32 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-36 animate-pulse rounded bg-white/10" />
        <div className="flex gap-4 pt-3 border-t border-white/10">
          <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
        </div>
      </div>
    </div>
  )
}
