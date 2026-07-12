'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      if (!user) {
        setLoaded(true)
        return
      }
      setIsLoggedIn(true)
      fetch('/api/favorites')
        .then(res => (res.ok ? res.json() : { listing_ids: [] }))
        .then(({ listing_ids }) => {
          if (!cancelled) {
            setFavoriteIds(listing_ids || [])
            setLoaded(true)
          }
        })
        .catch(() => {
          if (!cancelled) setLoaded(true)
        })
    })
    return () => { cancelled = true }
  }, [supabase])

  const toggleFavorite = useCallback((id: string) => {
    if (!isLoggedIn) {
      router.push('/login')
      return
    }
    const isFav = favoriteIds.includes(id)
    // Optimistic update
    setFavoriteIds(prev => (isFav ? prev.filter(x => x !== id) : [...prev, id]))

    fetch('/api/favorites', {
      method: isFav ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: id }),
    })
      .then(res => {
        if (!res.ok) {
          // Rollback on failure
          setFavoriteIds(prev => (isFav ? [...prev, id] : prev.filter(x => x !== id)))
        }
      })
      .catch(() => {
        // Rollback on network error
        setFavoriteIds(prev => (isFav ? [...prev, id] : prev.filter(x => x !== id)))
      })
  }, [isLoggedIn, favoriteIds, router])

  return { favoriteIds, toggleFavorite, isLoggedIn, loaded }
}
