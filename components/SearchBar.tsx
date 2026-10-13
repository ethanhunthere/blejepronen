'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Search, MapPin, Building2, User, Home, ArrowRight, Loader2 } from 'lucide-react'
import type { OmniSearchResponse, OmniResultItem } from '@/lib/omni-search'

interface SearchBarProps {
  className?: string
  placeholder?: string
  buttonText?: string
}

const TRANSACTION_TABS = [
  { key: '', label: 'Të gjitha' },
  { key: 'shitje', label: 'Bli' },
  { key: 'qira', label: 'Qira' },
] as const

type TransactionType = (typeof TRANSACTION_TABS)[number]['key']

function formatPrice(price?: number | null) {
  if (!price || price <= 0) return 'Me marrëveshje'
  return new Intl.NumberFormat('de-DE').format(price) + ' €'
}

function SearchBar({
  className = '',
  placeholder = 'Kërko prona, shtëpi, banesa, profile, agjenci ose qytete...',
  buttonText = 'Kërko',
}: SearchBarProps) {
  const [value, setValue] = useState('')
  const [typeFilter, setTypeFilter] = useState<TransactionType>('')
  const [suggestions, setSuggestions] = useState<OmniSearchResponse | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const router = useRouter()

  // Flattened suggestions for keyboard navigation
  const flatItems = React.useMemo<OmniResultItem[]>(() => {
    if (!suggestions) return []
    const items: OmniResultItem[] = []
    if (suggestions.results.agents?.length) items.push(...suggestions.results.agents.slice(0, 2))
    if (suggestions.results.agencies?.length) items.push(...suggestions.results.agencies.slice(0, 2))
    if (suggestions.results.listings?.length) items.push(...suggestions.results.listings.slice(0, 4))
    if (suggestions.results.locations?.length) items.push(...suggestions.results.locations.slice(0, 3))
    return items
  }, [suggestions])

  // Live debounced search suggestions
  useEffect(() => {
    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setSuggestions(null)
      setIsOpen(false)
      setLoading(false)
      return
    }

    setLoading(true)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=6`, {
          signal: controller.signal,
        })
        if (res.ok) {
          const data: OmniSearchResponse = await res.json()
          setSuggestions(data)
          setIsOpen(true)
          setSelectedIndex(-1)
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Search suggestions error:', err)
        }
      } finally {
        setLoading(false)
      }
    }, 180)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value])

  // Outside click & Escape to dismiss suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // URL payload consumed by /listings: search, type (shitje|qira)
  const buildListingsHref = useCallback(() => {
    const trimmed = value.trim()
    const params: string[] = []
    if (trimmed) params.push(`search=${encodeURIComponent(trimmed)}`)
    if (typeFilter) params.push(`type=${encodeURIComponent(typeFilter)}`)
    return params.length > 0 ? `/listings?${params.join('&')}` : '/listings'
  }, [value, typeFilter])

  const runSearch = useCallback(() => {
    setIsOpen(false)
    router.push(buildListingsHref())
  }, [router, buildListingsHref])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (selectedIndex >= 0 && flatItems[selectedIndex]) {
      const selected = flatItems[selectedIndex]
      setIsOpen(false)
      router.push(selected.targetUrl)
      return
    }
    runSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || flatItems.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        runSearch()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && flatItems[selectedIndex]) {
        const item = flatItems[selectedIndex]
        setIsOpen(false)
        router.push(item.targetUrl)
      } else {
        runSearch()
      }
    }
  }

  const hasAnyResults = suggestions && (
    (suggestions.results.agents?.length ?? 0) > 0 ||
    (suggestions.results.agencies?.length ?? 0) > 0 ||
    (suggestions.results.listings?.length ?? 0) > 0 ||
    (suggestions.results.locations?.length ?? 0) > 0
  )

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <form
        role="search"
        aria-label="Kërkim i pronave"
        onSubmit={handleSubmit}
        className="w-full"
      >
        <div
          className={`relative bg-white rounded-full border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.09)] hover:border-slate-300 focus-within:shadow-[0_4px_20px_rgba(0,103,91,0.12)] focus-within:border-[#00675B]/40 transition-all duration-200 px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 ${className}`}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 text-[#00675B] animate-spin flex-shrink-0 ml-1.5" />
          ) : (
            <Search className="h-4 w-4 text-[#00675B] flex-shrink-0 ml-1.5" />
          )}
          <input
            ref={inputRef}
            type="text"
            name="q"
            placeholder={placeholder}
            aria-label="Kërko prona, shtëpi, banesa, profile, agjenci ose qytete"
            autoComplete="off"
            className="flex-1 min-w-0 text-[14.5px] sm:text-[16px] text-slate-900 placeholder:text-slate-400 outline-none border-none bg-transparent"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              if (!isOpen && e.target.value.trim().length >= 2) {
                setIsOpen(true)
              }
            }}
            onFocus={() => {
              if (value.trim().length >= 2 && suggestions) {
                setIsOpen(true)
              }
            }}
            onKeyDown={handleKeyDown}
          />

          <button
            type="submit"
            className="flex-shrink-0 min-h-[42px] bg-[#00675B] text-white px-5 sm:px-6 py-2 rounded-full text-sm sm:text-[15px] font-medium tracking-tight hover:bg-[#004D43] transition-colors duration-150 cursor-pointer flex items-center justify-center shadow-sm"
          >
            {buttonText}
          </button>
        </div>

        {/* Transaction tabs (Bli / Qira) */}
        <div className="mt-2.5 flex items-center justify-center">
          <div
            role="group"
            aria-label="Lloji i transaksionit"
            className="flex items-center gap-1 rounded-full bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06)] p-1"
          >
            {TRANSACTION_TABS.map((tab) => (
              <button
                key={tab.key || 'all'}
                type="button"
                aria-pressed={typeFilter === tab.key}
                onClick={() => setTypeFilter(tab.key)}
                className={`min-h-[44px] sm:min-h-0 px-4 sm:px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors duration-150 cursor-pointer ${
                  typeFilter === tab.key
                    ? 'bg-[#00675B] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Live Auto-Suggestions Dropdown (Properties, Homes, Profiles, Agencies, Locations) */}
      {isOpen && value.trim().length >= 2 && (
        <div className="absolute top-[52px] left-0 right-0 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-[440px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {hasAnyResults ? (
            <>
              {/* 1. Profiles & People & Agencies */}
              {((suggestions?.results.agents?.length ?? 0) > 0 || (suggestions?.results.agencies?.length ?? 0) > 0) && (
                <div className="p-2 sm:p-2.5">
                  <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3 w-3 text-[#00675B]" />
                    <span>Profile & Agjenci</span>
                  </div>
                  <div className="space-y-1">
                    {[
                      ...(suggestions?.results.agents || []),
                      ...(suggestions?.results.agencies || []),
                    ]
                      .slice(0, 3)
                      .map((profile) => {
                        const isSelected = flatItems[selectedIndex]?.id === profile.id
                        return (
                          <Link
                            key={profile.id}
                            href={profile.targetUrl}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-colors ${
                              isSelected ? 'bg-emerald-50 text-[#00675B]' : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                                <Image
                                  src={profile.imageUrl || '/avatars/avatar-1.png'}
                                  alt=""
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13.5px] font-semibold truncate leading-tight">
                                  {profile.title}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">
                                  {profile.subtitle || 'Profil'}
                                </p>
                              </div>
                            </div>
                            <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {profile.badge || 'Profil'}
                            </span>
                          </Link>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* 2. Properties & Homes */}
              {(suggestions?.results.listings?.length ?? 0) > 0 && (
                <div className="p-2 sm:p-2.5">
                  <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Home className="h-3 w-3 text-[#00675B]" />
                    <span>Prona & Shtëpi</span>
                  </div>
                  <div className="space-y-1">
                    {suggestions?.results.listings.slice(0, 4).map((listing) => {
                      const isSelected = flatItems[selectedIndex]?.id === listing.id
                      return (
                        <Link
                          key={listing.id}
                          href={listing.targetUrl}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-colors ${
                            isSelected ? 'bg-emerald-50 text-[#00675B]' : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {listing.imageUrl ? (
                              <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                                <Image src={listing.imageUrl} alt="" fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-[#00675B] flex items-center justify-center flex-shrink-0">
                                <Home className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[13.5px] font-semibold truncate leading-tight">
                                {listing.title}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {listing.subtitle}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-[12.5px] font-bold text-[#00675B]">
                              {formatPrice(listing.price)}
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 3. Cities & Neighborhoods */}
              {(suggestions?.results.locations?.length ?? 0) > 0 && (
                <div className="p-2 sm:p-2.5">
                  <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-[#00675B]" />
                    <span>Qytete & Lagje</span>
                  </div>
                  <div className="space-y-1">
                    {suggestions?.results.locations.slice(0, 3).map((loc) => {
                      const isSelected = flatItems[selectedIndex]?.id === loc.id
                      return (
                        <Link
                          key={loc.id}
                          href={loc.targetUrl}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-colors ${
                            isSelected ? 'bg-emerald-50 text-[#00675B]' : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="h-4 w-4 text-[#00675B] flex-shrink-0" />
                            <span className="text-[13.5px] font-medium text-slate-800 truncate">
                              {loc.title}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">{loc.subtitle}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* View all results button */}
              <div className="p-2 bg-slate-50/70">
                <button
                  type="button"
                  onClick={runSearch}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-[#00675B] hover:text-[#004D43] hover:bg-emerald-100/50 rounded-xl transition-colors cursor-pointer"
                >
                  <span>Shiko të gjitha rezultatet për &quot;{value.trim()}&quot;</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm font-medium text-slate-600 mb-2">
                Nuk u gjet asnjë rezultat për &quot;{value.trim()}&quot;
              </p>
              <button
                type="button"
                onClick={runSearch}
                className="text-xs font-semibold text-[#00675B] hover:underline cursor-pointer"
              >
                Kërko në të gjitha pronat gjithsesi &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default React.memo(SearchBar)
