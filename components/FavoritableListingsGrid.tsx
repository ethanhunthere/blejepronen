'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Listing } from '@/lib/supabase'
import ListingCard from './ListingCard'
import AnimateOnScroll from './AnimateOnScroll'

interface FavoritableListingsGridProps {
  listings: Listing[]
}

export default function FavoritableListingsGrid({ listings }: FavoritableListingsGridProps) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return
      setIsLoggedIn(true)
      fetch('/api/favorites', { credentials: 'include' })
        .then(res => (res.ok ? res.json() : { listing_ids: [] }))
        .then(({ listing_ids }) => {
          if (!cancelled) setFavoriteIds(listing_ids || [])
        })
        .catch((err) => {
          console.error('FavoritableListingsGrid: failed to load favorites', err)
        })
    })
    return () => { cancelled = true }
  }, [supabase])

  const handleToggleFavorite = useCallback((id: string) => {
    if (!isLoggedIn) {
      toast.info('Kyçuni për të ruajtur banesat', {
        action: {
          label: 'Kyçu',
          onClick: () => {
            window.location.href = '/login'
          },
        },
      })
      return
    }
    const isFav = favoriteIds.includes(id)
    setFavoriteIds(prev => (isFav ? prev.filter(x => x !== id) : [...prev, id]))

    fetch('/api/favorites', {
      method: isFav ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ listing_id: id }),
    })
      .then(res => {
        if (!res.ok) {
          console.error('FavoritableListingsGrid: toggle failed', res.status)
          setFavoriteIds(prev => (isFav ? [...prev, id] : prev.filter(x => x !== id)))
        }
      })
      .catch((err) => {
        console.error('FavoritableListingsGrid: network error on toggle', err)
        setFavoriteIds(prev => (isFav ? [...prev, id] : prev.filter(x => x !== id)))
      })
  }, [isLoggedIn, favoriteIds])

  return (
    <AnimateOnScroll className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
      {listings.map((listing) => (
        <div key={listing.id} className="aos-fade-up">
          <ListingCard
            listing={listing}
            isFavorited={favoriteIds.includes(listing.id)}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>
      ))}
    </AnimateOnScroll>
  )
}
