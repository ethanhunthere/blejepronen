'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

const FAV_CACHE_KEY = 'blejepronen_fav_ids'

function getInitialFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(FAV_CACHE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function getInitialAuth(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return Boolean(localStorage.getItem('blejepronen_cached_user'))
  } catch {
    return false
  }
}

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(getInitialFavorites)
  const [isLoggedIn, setIsLoggedIn] = useState(getInitialAuth)
  const [loaded, setLoaded] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      const user = session?.user
      if (!user) {
        setIsLoggedIn(false)
        setLoaded(true)
        return
      }
      setIsLoggedIn(true)
      fetch('/api/favorites', { credentials: 'include' })
        .then(res => (res.ok ? res.json() : { listing_ids: [] }))
        .then(({ listing_ids }) => {
          if (!cancelled) {
            const ids = listing_ids || []
            setFavoriteIds(ids)
            try {
              sessionStorage.setItem(FAV_CACHE_KEY, JSON.stringify(ids))
            } catch {}
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
      toast.info('Kyçuni për të ruajtur pronat', {
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
    const next = isFav ? favoriteIds.filter(x => x !== id) : [...favoriteIds, id]
    setFavoriteIds(next)
    try {
      sessionStorage.setItem(FAV_CACHE_KEY, JSON.stringify(next))
    } catch {}

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
