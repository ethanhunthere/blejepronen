'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loaded, setLoaded] = useState(false)
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
      fetch('/api/favorites', { credentials: 'include' })
        .then(res => (res.ok ? res.json() : { listing_ids: [] }))
        .then(({ listing_ids }) => {
          if (!cancelled) {
            setFavoriteIds(listing_ids || [])
            setLoaded(true)
          }
        })
        .catch((err) => {
          console.error('useFavorites: failed to load favorites', err)
          if (!cancelled) setLoaded(true)
        })
    })
    return () => { cancelled = true }
  }, [supabase])

  const toggleFavorite = useCallback((id: string) => {
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
    // Optimistic update
    setFavoriteIds(prev => (isFav ? prev.filter(x => x !== id) : [...prev, id]))

    fetch('/api/favorites', {
      method: isFav ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ listing_id: id }),
    })
      .then(res => {
        if (!res.ok) {
          console.error('useFavorites: toggle failed', res.status)
          // Rollback on failure
          setFavoriteIds(prev => (isFav ? [...prev, id] : prev.filter(x => x !== id)))
        }
      })
      .catch((err) => {
        console.error('useFavorites: network error on toggle', err)
        // Rollback on network error
        setFavoriteIds(prev => (isFav ? [...prev, id] : prev.filter(x => x !== id)))
      })
  }, [isLoggedIn, favoriteIds])

  return { favoriteIds, toggleFavorite, isLoggedIn, loaded }
}
