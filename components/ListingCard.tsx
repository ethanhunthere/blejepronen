'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
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
  isFavorited?: boolean
  onToggleFavorite?: (id: string) => void
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('sq-AL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price)

const MAX_CYCLE_IMAGES = 6
const CYCLE_INTERVAL_MS = 1100

const ListingCard = React.memo(function ListingCard({ listing, priority = false, isFavorited = false, onToggleFavorite }: ListingCardProps) {
  const cycleImages = (listing.images || []).filter(Boolean).slice(0, MAX_CYCLE_IMAGES)
  const hasMultiple = cycleImages.length > 1

  const [activeIndex, setActiveIndex] = useState(0)
  const [hasInteracted, setHasInteracted] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopCycle = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setActiveIndex(0)
  }, [])

  const startCycle = useCallback(() => {
    if (!hasMultiple) return
    setHasInteracted(true)
    stopCycle()
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % cycleImages.length)
    }, CYCLE_INTERVAL_MS)
  }, [hasMultiple, cycleImages.length, stopCycle])

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  return (
    <Link href={`/listings/${listing.id}`}>
      <div
        className="group cursor-pointer h-full flex flex-col rounded-2xl overflow-hidden bg-white shadow-sm card-hover"
        onMouseEnter={startCycle}
        onMouseLeave={stopCycle}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] bg-gray-100 flex-shrink-0 overflow-hidden rounded-2xl">
          {cycleImages.length > 0 ? (
            <>
              <Image
                src={cycleImages[0]}
                alt={listing.title}
                fill
                priority={priority}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className={`object-cover transition-opacity duration-700 ease-out ${
                  hasMultiple && activeIndex !== 0 ? 'opacity-0' : 'opacity-100'
                }`}
              />
              {hasMultiple && hasInteracted && cycleImages.slice(1).map((img, idx) => {
                const i = idx + 1
                return (
                  <Image
                    key={img + i}
                    src={img}
                    alt={listing.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className={`object-cover transition-opacity duration-700 ease-out ${
                      i === activeIndex ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                )
              })}
            </>
          ) : null}

          {/* Bottom scrim + progress dots — only for multi-photo listings, only on hover */}
          {hasMultiple && (
            <>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="pointer-events-none absolute bottom-3 inset-x-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {cycleImages.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Type badge - quiet, uncolored (Airbnb style) */}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center bg-white/90 backdrop-blur-sm text-[#111827] text-[11px] font-semibold px-2.5 py-1 rounded-full">
              {listing.type === 'shitje' ? 'Shitje' : 'Me qira'}
            </span>
          </div>

          {/* Save + Featured stack */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
            <button
              type="button"
              aria-label={isFavorited ? 'Hiq nga të preferuarat' : 'Ruaj listimin'}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleFavorite?.(listing.id)
              }}
              onTouchEnd={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleFavorite?.(listing.id)
              }}
              className="bg-white/80 backdrop-blur-sm rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-transform duration-200 cursor-pointer touch-manipulation"
            >
              <Heart
                className={`h-4 w-4 ${isFavorited ? 'text-red-500' : 'text-gray-400'}`}
                fill={isFavorited ? 'currentColor' : 'none'}
              />
            </button>
            {listing.is_featured && (
              <span className="inline-flex items-center bg-[#111827] text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
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
