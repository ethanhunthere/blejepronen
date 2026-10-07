'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Search,
  X,
  MapPin,
  Building2,
  User,
  Home,
  Clock,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import {
  OmniResultItem,
  OmniSearchResponse,
  OmniEntityType,
  TRENDING_SEARCHES,
} from '@/lib/omni-search'

const RECENT_SEARCHES_KEY = 'blejepronen_recent_searches'
const MAX_RECENT = 6
const MAX_QUERY_LENGTH = 40

interface OmniSearchModalProps {
  isOpen: boolean
  onClose: () => void
  initialQuery?: string
}

export default function OmniSearchModal({
  isOpen,
  onClose,
  initialQuery = '',
}: OmniSearchModalProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState<'all' | OmniEntityType>('all')
  const [results, setResults] = useState<OmniSearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Empty state items unified list for arrow-key navigation
  const emptyStateItems = useMemo(() => {
    const items: { type: 'recent' | 'trending'; text: string; id: string }[] = []
    recentSearches.forEach((text, i) => {
      items.push({ type: 'recent', text, id: `recent-${i}-${text}` })
    })
    TRENDING_SEARCHES.forEach((text, i) => {
      items.push({ type: 'trending', text, id: `trending-${i}-${text}` })
    })
    return items
  }, [recentSearches])

  // Load recent searches on mount, filtering out legacy titles (> 40 chars)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          const valid = parsed
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter((item) => item.length >= 2 && item.length <= MAX_QUERY_LENGTH)
            .slice(0, MAX_RECENT)
          setRecentSearches(valid)
        }
      }
    } catch {}
  }, [])

  // Auto-focus input when opened & sync initialQuery
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery)
      setSelectedIndex(-1)
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initialQuery])

  // Lock body scroll and handle global Escape key when modal is open
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [isOpen, onClose])

  // Save user-typed query to recent searches (prevent saving property titles)
  const saveRecentSearch = useCallback((searchTerm: string) => {
    const clean = searchTerm.trim()
    if (!clean || clean.length < 2 || clean.length > MAX_QUERY_LENGTH) return
    try {
      setRecentSearches((prev) => {
        const next = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT)
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
        return next
      })
    } catch {}
  }, [])

  const removeRecentSearch = useCallback((searchTerm: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      setRecentSearches((prev) => {
        const next = prev.filter((item) => item !== searchTerm)
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
        return next
      })
    } catch {}
  }, [])

  const clearAllRecentSearches = useCallback(() => {
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY)
      setRecentSearches([])
    } catch {}
  }, [])

  // Execute debounced search against /api/search with AbortController
  useEffect(() => {
    const trimmed = query.trim()

    // Cancel pending timer and inflight request
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    if (!trimmed) {
      setResults(null)
      setLoading(false)
      setSelectedIndex(-1)
      return
    }

    setLoading(true)

    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=25`, {
          signal: controller.signal,
        })
        if (!controller.signal.aborted && res.ok) {
          const data: OmniSearchResponse = await res.json()
          if (!controller.signal.aborted) {
            setResults(data)
            setSelectedIndex(-1)
          }
        }
      } catch (err: unknown) {
        if (
          (err instanceof DOMException && err.name === 'AbortError') ||
          (err as { name?: string })?.name === 'AbortError'
        ) {
          return // Silently ignore aborts
        }
        console.warn('OmniSearch fetch notice:', err)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }, 160)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [query])

  // Filtered displayed items based on activeTab
  const visibleItems = useMemo(() => {
    if (!results) return []
    if (activeTab === 'all') return results.flat
    if (activeTab === 'listing') return results.results.listings
    if (activeTab === 'agency') return results.results.agencies
    if (activeTab === 'agent') return results.results.agents
    if (activeTab === 'location') return results.results.locations
    return results.flat
  }, [results, activeTab])

  // Submit raw query search to listings
  const handleSearchQuery = useCallback((searchTerm: string) => {
    const clean = searchTerm.trim()
    if (!clean) return
    saveRecentSearch(clean)
    onClose()
    router.push(`/listings?search=${encodeURIComponent(clean)}`)
  }, [saveRecentSearch, onClose, router])

  // Handle item selection / navigation (ONLY save query, never item title!)
  const handleSelectItem = useCallback((item: OmniResultItem) => {
    const clean = query.trim()
    if (clean && clean.length >= 2 && clean.length <= MAX_QUERY_LENGTH) {
      saveRecentSearch(clean)
    }
    onClose()
    router.push(item.targetUrl)
  }, [query, router, onClose, saveRecentSearch])

  // Keyboard navigation across empty state (recents/trending) and search results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }

    const trimmed = query.trim()

    // 1. Empty State Navigation (recents & trending)
    if (!trimmed) {
      const totalEmpty = emptyStateItems.length
      if (totalEmpty === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1 >= totalEmpty ? 0 : prev + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev <= 0 ? (prev === 0 ? -1 : totalEmpty - 1) : prev - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < totalEmpty) {
          const selected = emptyStateItems[selectedIndex]
          setQuery(selected.text)
          setSelectedIndex(-1)
          inputRef.current?.focus()
        }
      }
      return
    }

    // 2. Active Search Results Navigation
    const totalResults = visibleItems.length

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (totalResults > 0) {
        setSelectedIndex((prev) => (prev + 1 >= totalResults ? 0 : prev + 1))
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (totalResults > 0) {
        setSelectedIndex((prev) => (prev <= 0 ? (prev === 0 ? -1 : totalResults - 1) : prev - 1))
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // Decoupled Enter: only select result item if explicitly navigated into with arrow keys
      if (selectedIndex >= 0 && selectedIndex < totalResults) {
        const selected = visibleItems[selectedIndex]
        if (selected) {
          handleSelectItem(selected)
          return
        }
      }
      // Otherwise, search the user-typed query without forcing item 0 selection
      handleSearchQuery(trimmed)
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current || selectedIndex < 0) return
    const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!isOpen) return null

  const formatPrice = (price?: number | null) => {
    if (!price || price <= 0) return 'Me marrëveshje'
    return new Intl.NumberFormat('sq-AL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex sm:items-start sm:justify-center p-0 sm:p-4 md:p-6 bg-black/60 sm:backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kërko në Bleje Pronën"
        className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:max-w-2xl bg-white dark:bg-[#111A19] rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl sm:border sm:border-gray-200 sm:dark:border-white/10 overflow-hidden flex flex-col my-0 sm:my-12 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="flex items-center gap-2 sm:gap-3 px-3.5 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 sm:py-4 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-[#111A19] flex-shrink-0">
          {/* Mobile Dedicated Close/Back Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Kthehu dhe mbyll"
            className="sm:hidden flex items-center justify-center min-w-[44px] min-h-[44px] -ml-1 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded-full active:bg-gray-100 dark:active:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Desktop Search Icon */}
          <Search className="hidden sm:block h-5 w-5 text-[#00675B] dark:text-[#C8B882] flex-shrink-0" />

          {/* Search Input */}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={Boolean(results && results.total > 0)}
            aria-autocomplete="list"
            aria-controls="omni-search-results"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(-1)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Kërko pronë, agjenci, qytet ose agjent..."
            className="flex-1 min-w-0 bg-transparent text-[16px] sm:text-[17px] font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 outline-none border-none py-1"
          />

          {loading && (
            <Loader2 className="h-4 w-4 text-[#00675B] animate-spin flex-shrink-0" />
          )}

          {query.length > 0 && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setSelectedIndex(-1)
                inputRef.current?.focus()
              }}
              aria-label="Pastro kërkimin"
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Desktop Escape badge */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Mbyll me ESC"
            className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-md ml-1 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Entity Category Filter Tabs (when results exist) */}
        {results && results.total > 0 && (
          <div className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gray-50/70 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 overflow-x-auto scrollbar-hide flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('all')
                setSelectedIndex(-1)
              }}
              className={`px-3 py-1.5 min-h-[36px] sm:min-h-0 flex items-center rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'all'
                  ? 'bg-[#00675B] text-white shadow-xs'
                  : 'text-gray-600 dark:text-white/70 hover:bg-gray-200/60 dark:hover:bg-white/10'
              }`}
            >
              Të gjitha ({results.total})
            </button>

            {results.counts.listings > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('listing')
                  setSelectedIndex(-1)
                }}
                className={`px-3 py-1.5 min-h-[36px] sm:min-h-0 flex items-center rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'listing'
                    ? 'bg-[#00675B] text-white shadow-xs'
                    : 'text-gray-600 dark:text-white/70 hover:bg-gray-200/60 dark:hover:bg-white/10'
                }`}
              >
                Prona ({results.counts.listings})
              </button>
            )}

            {results.counts.agencies > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('agency')
                  setSelectedIndex(-1)
                }}
                className={`px-3 py-1.5 min-h-[36px] sm:min-h-0 flex items-center rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'agency'
                    ? 'bg-[#00675B] text-white shadow-xs'
                    : 'text-gray-600 dark:text-white/70 hover:bg-gray-200/60 dark:hover:bg-white/10'
                }`}
              >
                Agjenci ({results.counts.agencies})
              </button>
            )}

            {results.counts.agents > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('agent')
                  setSelectedIndex(-1)
                }}
                className={`px-3 py-1.5 min-h-[36px] sm:min-h-0 flex items-center rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'agent'
                    ? 'bg-[#00675B] text-white shadow-xs'
                    : 'text-gray-600 dark:text-white/70 hover:bg-gray-200/60 dark:hover:bg-white/10'
                }`}
              >
                Agjentë ({results.counts.agents})
              </button>
            )}

            {results.counts.locations > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('location')
                  setSelectedIndex(-1)
                }}
                className={`px-3 py-1.5 min-h-[36px] sm:min-h-0 flex items-center rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'location'
                    ? 'bg-[#00675B] text-white shadow-xs'
                    : 'text-gray-600 dark:text-white/70 hover:bg-gray-200/60 dark:hover:bg-white/10'
                }`}
              >
                Lokacione ({results.counts.locations})
              </button>
            )}
          </div>
        )}

        {/* Modal Body / Results List */}
        <div
          ref={listRef}
          id="omni-search-results"
          role="listbox"
          className="flex-1 overflow-y-auto overscroll-contain p-3 divide-y divide-gray-100/60 dark:divide-white/5"
        >
          {/* Default Empty Query State: Recent & Trending */}
          {!query.trim() && (
            <div className="py-2 space-y-6">
              {recentSearches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Kërkimet e fundit
                    </span>
                    <button
                      type="button"
                      onClick={clearAllRecentSearches}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors normal-case font-medium min-h-[44px] sm:min-h-0 px-2 py-1 flex items-center"
                    >
                      Pastro
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 px-2">
                    {recentSearches.map((item, idx) => {
                      const isSelected = selectedIndex === idx
                      return (
                        <div
                          key={`recent-${item}`}
                          data-index={idx}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setQuery(item)
                            setSelectedIndex(-1)
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all min-h-[40px] sm:min-h-0 ${
                            isSelected
                              ? 'bg-[#00675B] text-white shadow-xs ring-2 ring-[#00675B]/30'
                              : 'bg-gray-100 dark:bg-white/10 hover:bg-[#00675B]/10 hover:text-[#00675B] dark:hover:text-[#C8B882] text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={(e) => removeRecentSearch(item, e)}
                            aria-label={`Hiq ${item} nga kërkimet e fundit`}
                            className={`p-1 -mr-1 rounded-md transition-colors ${
                              isSelected
                                ? 'text-white/80 hover:text-white'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'
                            }`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Trending Searches */}
              <div className="space-y-2">
                <div className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-[#C8B882]" /> Sugjerime & Trende
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 px-2">
                  {TRENDING_SEARCHES.map((item, tIdx) => {
                    const globalIdx = recentSearches.length + tIdx
                    const isSelected = selectedIndex === globalIdx
                    return (
                      <button
                        key={`trending-${item}`}
                        type="button"
                        data-index={globalIdx}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setQuery(item)
                          setSelectedIndex(-1)
                        }}
                        className={`text-left px-3.5 py-3 rounded-2xl border text-xs font-medium min-h-[44px] transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#00675B] text-white border-[#00675B] shadow-xs'
                            : 'bg-gray-50 dark:bg-white/[0.04] hover:bg-[#00675B]/10 hover:border-[#00675B]/20 border-gray-100 dark:border-white/5 text-gray-800 dark:text-white/90'
                        }`}
                      >
                        <span className="truncate">{item}</span>
                        <ChevronRight
                          className={`h-3.5 w-3.5 flex-shrink-0 ${
                            isSelected ? 'text-white' : 'text-gray-400'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Active Search Results */}
          {query.trim() && visibleItems.length > 0 && (
            <div className="space-y-1.5 py-1">
              {/* Direct query search row: allows users on mobile and desktop to search all listings directly */}
              <div
                onClick={() => handleSearchQuery(query)}
                className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer bg-gray-50/80 dark:bg-white/[0.03] hover:bg-[#00675B]/10 dark:hover:bg-white/[0.08] border border-gray-100 dark:border-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#00675B]/10 dark:bg-[#C8B882]/20 flex items-center justify-center text-[#00675B] dark:text-[#C8B882] flex-shrink-0">
                  <Search className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    Kërko për &ldquo;{query.trim()}&rdquo;
                  </p>
                  <p className="text-xs text-gray-500 dark:text-white/60">
                    Shfaq të gjitha pronat që përputhen me kërkimin
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-[#00675B] dark:text-[#C8B882] flex-shrink-0" />
              </div>

              {visibleItems.map((item, idx) => {
                const isSelected = idx === selectedIndex
                return (
                  <div
                    key={item.id}
                    data-index={idx}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-[#00675B]/[0.08] dark:bg-white/10 ring-1 ring-[#00675B]/25 shadow-xs'
                        : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Entity Icon / Image Avatar */}
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-white/10 flex items-center justify-center border border-gray-200/60 dark:border-white/10">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : item.entityType === 'location' ? (
                        <MapPin className="h-5 w-5 text-[#00675B] dark:text-[#C8B882]" />
                      ) : item.entityType === 'agency' ? (
                        <Building2 className="h-5 w-5 text-[#00675B] dark:text-[#C8B882]" />
                      ) : item.entityType === 'agent' ? (
                        <User className="h-5 w-5 text-gray-500 dark:text-gray-300" />
                      ) : (
                        <Home className="h-5 w-5 text-[#00675B]" />
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14.5px] font-bold text-gray-900 dark:text-white truncate">
                          {item.title}
                        </span>

                        {item.badge && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                              item.entityType === 'agency'
                                ? 'bg-[#00675B]/10 text-[#00675B] dark:bg-[#C8B882]/20 dark:text-[#C8B882]'
                                : item.badge === 'Në shitje'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 dark:text-white/60 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>

                    {/* Price or Action Indicator */}
                    <div className="flex items-center gap-2 flex-shrink-0 text-right">
                      {item.price !== null && item.price !== undefined ? (
                        <div className="text-right">
                          <span className="text-[14px] font-extrabold text-[#00675B] dark:text-[#C8B882]">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 group-hover:text-gray-700">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Zero Results State */}
          {query.trim() && !loading && results && visibleItems.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Nuk u gjet asnjë rezultat për &ldquo;{query}&rdquo;
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Provoni të kërkoni një emër tjetër qyteti (psh. Prishtinë, Prizren) ose pastroni filtrat.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    router.push('/listings')
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00675B] text-white text-xs font-semibold hover:bg-[#004D43] min-h-[44px] transition-all"
                >
                  Shfleto të gjitha pronat
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls Bar */}
        <div className="px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:py-3 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-[11px] text-gray-500 dark:text-white/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 font-mono text-[10px]">↓</kbd>
              Lundro
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 font-mono text-[10px]">↵</kbd>
              {selectedIndex >= 0 ? 'Zgjidh artikullin' : query.trim() ? 'Kërko të gjitha' : 'Zgjidh'}
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#00675B] dark:text-[#C8B882]">
            Bleje Pronën Discovery Engine
          </span>
        </div>
      </div>
    </div>
  )
}
