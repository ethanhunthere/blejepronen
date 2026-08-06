'use client'

import { useFavorites } from '@/lib/useFavorites'
import type { Listing } from '@/lib/supabase'
import ListingCard from './ListingCard'
import AnimateOnScroll from './AnimateOnScroll'

interface FavoritableListingsGridProps {
  listings: Listing[]
}

export default function FavoritableListingsGrid({ listings }: FavoritableListingsGridProps) {
  const { favoriteIds, toggleFavorite } = useFavorites()

  return (
    <AnimateOnScroll className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2000px]:grid-cols-6 min-[2500px]:grid-cols-8 min-[3000px]:grid-cols-10 min-[4000px]:grid-cols-12 gap-6 items-stretch">
      {listings.map((listing) => (
        <div key={listing.id} className="aos-fade-up">
          <ListingCard
            listing={listing}
            isFavorited={favoriteIds.includes(listing.id)}
            onToggleFavorite={toggleFavorite}
          />
        </div>
      ))}
    </AnimateOnScroll>
  )
}
