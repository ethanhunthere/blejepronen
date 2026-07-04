import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, BedDouble, Maximize2, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Listing } from '@/lib/supabase'

interface ListingCardProps {
  listing: Listing
}

const ListingCard = React.memo(function ListingCard({ listing }: ListingCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sq-AL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const mainImage = listing.images?.[0] || '/placeholder-house.jpg'

  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 border border-gray-100 cursor-pointer">
        {/* Image */}
        <div className="relative h-52 bg-gray-100">
          <Image
            src={mainImage}
            alt={listing.title}
            fill
            className="object-cover"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-house.jpg'
            }}
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
            <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-2 flex-1 mr-2">
              {listing.title}
            </h3>
          </div>

          <p className="text-2xl font-bold text-[#1B4FFF] mb-3">
            {formatPrice(listing.price)}
            {listing.type === 'qira' && <span className="text-sm font-normal text-gray-500">/muaj</span>}
          </p>

          <div className="flex items-center text-gray-500 text-sm mb-3">
            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="truncate">{listing.city} · {listing.address}</span>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-600 pt-3 border-t border-gray-50">
            <div className="flex items-center">
              <BedDouble className="h-4 w-4 mr-1 text-gray-400" />
              <span>{listing.rooms} dhoma</span>
            </div>
            <div className="flex items-center">
              <Maximize2 className="h-4 w-4 mr-1 text-gray-400" />
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
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      <div className="h-52 animate-pulse bg-gray-200" />
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
