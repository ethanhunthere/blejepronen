'use client'

import ListingCard from '@/components/ListingCard'
import { useFavorites } from '@/lib/useFavorites'
import type { Listing } from '@/lib/supabase'

interface ListingsGridProps {
  rows: Listing[]
  /** tailwind grid template per breakpoint context */
  className?: string
}

/**
 * Single client island for server-rendered hub/market pages: one favorites
 * subscription for the whole grid instead of one per card.
 */
export function ListingsGrid({ rows, className }: ListingsGridProps) {
  const { favoriteIds, toggleFavorite, isLoggedIn } = useFavorites()

  return (
    <div
      className={
        className ||
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
      }
    >
      {rows.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          isFavorited={isLoggedIn && favoriteIds.includes(listing.id)}
          onToggleFavorite={toggleFavorite}
        />
      ))}
    </div>
  )
}
