'use client'

import { useEffect, useRef, useState } from 'react'
import { Bookmark, BookmarkCheck, Loader2, Lock, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { createPublicSupabaseClient } from '@/lib/supabase'

export interface SavedSearchSnapshot {
  search?: string
  city?: string
  type?: '' | 'shitje' | 'qira'
  minPrice?: string
  maxPrice?: string
  rooms?: string
  minArea?: string
  maxArea?: string
  apartment_type?: string
}

interface SavedSearchRow {
  id: string
  title: string | null
  city: string | null
  type: string | null
  created_at: string
}

interface SavedSearchesMenuProps {
  current: SavedSearchSnapshot
}

function summarize(s: SavedSearchSnapshot): string {
  const parts: string[] = []
  if (s.city) parts.push(s.city)
  if (s.type === 'shitje') parts.push('për shitje')
  if (s.type === 'qira') parts.push('me qira')
  if (s.search) parts.push(`"${s.search}"`)
  if (s.minPrice || s.maxPrice) {
    parts.push(`${s.minPrice || '0'}–${s.maxPrice || '∞'} €`)
  }
  if (s.rooms) parts.push(`${s.rooms}+ dhoma`)
  return parts.length ? parts.join(' • ') : 'Të gjitha pronat'
}

export default function SavedSearchesMenu({ current }: SavedSearchesMenuProps) {
  const [open, setOpen] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [items, setItems] = useState<SavedSearchRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createPublicSupabaseClient()
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(Boolean(session))
      if (!session) setItems([])
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open || !authed) return
    let mounted = true
    setLoading(true)
    fetch('/api/saved-searches', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { savedSearches?: SavedSearchRow[] } | null) => {
        if (mounted) setItems(json?.savedSearches ?? [])
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [open, authed])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: summarize(current),
          city: current.city || null,
          type: current.type || null,
          minPrice: current.minPrice ? Number(current.minPrice) : null,
          maxPrice: current.maxPrice ? Number(current.maxPrice) : null,
          rooms: current.rooms ? Number(current.rooms) : null,
          minArea: current.minArea ? Number(current.minArea) : null,
          maxArea: current.maxArea ? Number(current.maxArea) : null,
          apartmentType: current.apartment_type || null,
          searchQuery: current.search || null,
        }),
      })
      if (res.status === 201) {
        toast.success('Kërkimi u ruajt. Do t\'ju njoftojmë për prona të reja.')
        const json = (await res.json()) as { savedSearch?: SavedSearchRow }
        if (json.savedSearch) setItems((prev) => [json.savedSearch as SavedSearchRow, ...prev])
      } else if (res.status === 503) {
        toast.info('Shërbimi i njoftimeve po përgatitet — provoni sërish së shpejti.')
      } else {
        toast.error('Nuk u ruajt dot kërkimi. Provoni përsëri.')
      }
    } catch {
      toast.error('Nuk u ruajt dot kërkimi. Provoni përsëri.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    try {
      await fetch(`/api/saved-searches?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      toast.info('Kërkimi u fshi.')
    } catch {
      toast.error('Nuk u fshi dot. Provoni përsëri.')
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Kërkimet e ruajtura"
        aria-expanded={open}
        className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
          open
            ? 'border-[#00675B] bg-[#00675B]/5 text-[#00675B]'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 shadow-2xs'
        }`}
      >
        <Bookmark className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-2xl border border-gray-200 shadow-lg z-50 p-3">
          <p className="text-xs font-bold text-gray-900 mb-2">Kërkimet e ruajtura</p>

          {!authed ? (
            <a
              href="/login?next=/listings"
              className="flex items-center gap-2 text-xs font-semibold text-[#00675B] hover:underline py-2"
            >
              <Lock className="h-3.5 w-3.5" />
              Kyçuni për të ruajtur kërkimet
            </a>
          ) : loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">
              Ende s&apos;keni kërkime të ruajtura. Ruani filtrat aktualë për t&apos;u njoftuar kur
              shtohen prona të reja.
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-56 overflow-y-auto mb-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <BookmarkCheck className="h-3.5 w-3.5 text-[#00675B] shrink-0" />
                  <span className="flex-1 min-w-0 text-xs font-medium text-gray-800 truncate">
                    {item.title || summarize({ city: item.city || undefined, type: (item.type as SavedSearchSnapshot['type']) || undefined })}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    aria-label="Fshi kërkimin"
                    className="text-gray-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {authed && (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="w-full min-h-[40px] rounded-xl bg-[#00675B] hover:bg-[#004D43] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bookmark className="h-3.5 w-3.5" />}
              Ruaj kërkimin aktual
            </button>
          )}
        </div>
      )}
    </div>
  )
}
