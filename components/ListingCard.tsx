import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, BedDouble, Maximize2, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Listing } from '@/lib/supabase'

interface ListingCardProps {
  listing: Listing
  priority?: boolean
}

const ListingCard = React.memo(function ListingCard({ listing, priority = false }: ListingCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sq-AL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const mainImage = listing.images?.[0] || ''

  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="bg-[#111936] rounded-2xl overflow-hidden shadow-sm border border-white/10 cursor-pointer listing-card-hover">
        {/* Image */}
        <div className="relative h-48 sm:h-52 bg-slate-800">
          <Image
            src={mainImage}
            alt={listing.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
          <div className="absolute top-3 left-3">
            <Badge className={listing.type === 'shitje' ? 'bg-[#1B4FFF] text-white' : 'bg-emerald-500 text-white'}>
              {listing.type === 'shitje' ? 'Shitje' : 'Me qira'}
            </Badge>
          </div>
          {listing.is_featured && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-amber-500 text-white">
                <Tag className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-white text-base leading-tight line-clamp-2 flex-1 mr-2">
              {listing.title}
            </h3>
          </div>

          <p className="text-xl sm:text-2xl font-bold text-[#1B4FFF] mb-3">
            {formatPrice(listing.price)}
            {listing.type === 'qira' && <span className="text-sm font-normal text-slate-400">/muaj</span>}
          </p>

          <div className="flex items-center text-slate-400 text-sm mb-3">
            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="truncate">{listing.city} · {listing.address}</span>
          </div>

          <div className="flex items-center space-x-4 text-sm text-slate-300 pt-3 border-t border-white/10">
            <div className="flex items-center">
              <BedDouble className="h-4 w-4 mr-1 text-slate-400" />
              <span>{listing.rooms} dhoma</span>
            </div>
            <div className="flex items-center">
              <Maximize2 className="h-4 w-4 mr-1 text-slate-400" />
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
    <div className="bg-[#111936] rounded-2xl overflow-hidden shadow-sm border border-white/10">
      <div className="h-48 sm:h-52 animate-pulse bg-slate-700" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-700" />
        <div className="h-8 w-32 animate-pulse rounded bg-slate-700" />
        <div className="h-4 w-36 animate-pulse rounded bg-slate-700" />
        <div className="flex gap-4 pt-3 border-t border-white/10">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
          <div className="h-4 w-16 animate-pulse rounded bg-slate-700" />
        </div>
      </div>
    </div>
  )
}
