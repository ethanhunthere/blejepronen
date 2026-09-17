'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  ShieldCheck,
  ChevronRight,
  Loader2,
  Command,
} from 'lucide-react'
import {
  OmniResultItem,
  OmniSearchResponse,
  OmniEntityType,
  TRENDING_SEARCHES,
} from '@/lib/omni-search'

const RECENT_SEARCHES_KEY = 'blejepronen_recent_searches'
const MAX_RECENT = 6

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
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load recent searches on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch {}
  }, [])

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery)
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, initialQuery])

  // Save query to recent searches
  const saveRecentSearch = useCallback((searchTerm: string) => {
    const clean = searchTerm.trim()
    if (!clean || clean.length < 2) return
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

  // Execute debounced search against /api/search
  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      setLoading(false)
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setLoading(true)

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=25`)
        if (res.ok) {
          const data: OmniSearchResponse = await res.json()
          setResults(data)
          setSelectedIndex(0)
        }
      } catch (err) {
        console.warn('OmniSearch fetch notice:', err)
      } finally {
        setLoading(false)
      }
    }, 160)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [query])

  // Filtered displayed items based on activeTab
  const visibleItems = React.useMemo(() => {
    if (!results) return []
    if (activeTab === 'all') return results.flat
    if (activeTab === 'listing') return results.results.listings
    if (activeTab === 'agency') return results.results.agencies
    if (activeTab === 'agent') return results.results.agents
    if (activeTab === 'location') return results.results.locations
    return results.flat
  }, [results, activeTab])

  // Handle item selection / navigation
  const handleSelectItem = useCallback((item: OmniResultItem) => {
    saveRecentSearch(query || item.title)
    onClose()
    router.push(item.targetUrl)
  }, [query, router, onClose, saveRecentSearch])

  // Keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }

    if (!visibleItems || visibleItems.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        saveRecentSearch(query.trim())
        onClose()
        router.push(`/listings?search=${encodeURIComponent(query.trim())}`)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % visibleItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + visibleItems.length) % visibleItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = visibleItems[selectedIndex]
      if (selected) {
        handleSelectItem(selected)
      } else if (query.trim()) {
        saveRecentSearch(query.trim())
        onClose()
        router.push(`/listings?search=${encodeURIComponent(query.trim())}`)
      }
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
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
      className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kërko në Bleje Pronën"
        className="relative w-full max-w-2xl bg-white dark:bg-[#111A19] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,100,89,0.12)] overflow-hidden flex flex-col max-h-[85vh] my-auto sm:my-12 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <Search className="h-5 w-5 text-[#006459] dark:text-[#C8B882] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Kërko pronë, agjenci, qytet ose agjent..."
            className="flex-1 bg-transparent text-[16px] sm:text-[17px] font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 outline-none border-none"
          />
          {loading && (
            <Loader2 className="h-4 w-4 text-[#006459] animate-spin flex-shrink-0" />
          )}
          {query.length > 0 && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-md ml-1"
          >
            ESC
          </button>
        </div>

        {/* Entity Category Filter Tabs (when results exist) */}
        {results && results.total > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50/70 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 overflow-x-auto scrollbar-hide">
            <button
              type="button"
              onClick={() => {
                setActiveTab('all')
                setSelectedIndex(0)
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'all'
                  ? 'bg-[#006459] text-white shadow-xs'
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
                  setSelectedIndex(0)
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'listing'
                    ? 'bg-[#006459] text-white shadow-xs'
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
                  setSelectedIndex(0)
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'agency'
                    ? 'bg-[#006459] text-white shadow-xs'
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
                  setSelectedIndex(0)
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'agent'
                    ? 'bg-[#006459] text-white shadow-xs'
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
                  setSelectedIndex(0)
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'location'
                    ? 'bg-[#006459] text-white shadow-xs'
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
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors normal-case font-medium"
                    >
                      Pastro
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-2">
                    {recentSearches.map((item) => (
                      <div
                        key={item}
                        onClick={() => setQuery(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/10 hover:bg-[#006459]/10 hover:text-[#006459] dark:hover:text-[#C8B882] rounded-xl text-xs font-medium cursor-pointer transition-all group"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={(e) => removeRecentSearch(item, e)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Searches */}
              <div className="space-y-2">
                <div className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-[#C8B882]" /> Sugjerime & Trende
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-2">
                  {TRENDING_SEARCHES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuery(item)}
                      className="text-left px-3 py-2.5 rounded-2xl bg-gray-50 dark:bg-white/[0.04] hover:bg-[#006459]/10 hover:border-[#006459]/20 border border-gray-100 dark:border-white/5 text-xs font-medium text-gray-800 dark:text-white/90 transition-all flex items-center justify-between"
                    >
                      <span className="truncate">{item}</span>
                      <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Search Results */}
          {query.trim() && visibleItems.length > 0 && (
            <div className="space-y-1.5 py-1">
              {visibleItems.map((item, idx) => {
                const isSelected = idx === selectedIndex
                return (
                  <div
                    key={item.id}
                    data-index={idx}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-[#006459]/[0.08] dark:bg-white/10 ring-1 ring-[#006459]/25 shadow-xs'
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
                        <MapPin className="h-5 w-5 text-[#006459] dark:text-[#C8B882]" />
                      ) : item.entityType === 'agency' ? (
                        <Building2 className="h-5 w-5 text-[#006459] dark:text-[#C8B882]" />
                      ) : item.entityType === 'agent' ? (
                        <User className="h-5 w-5 text-gray-500 dark:text-gray-300" />
                      ) : (
                        <Home className="h-5 w-5 text-[#006459]" />
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
                                ? 'bg-[#006459]/10 text-[#006459] dark:bg-[#C8B882]/20 dark:text-[#C8B882]'
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
                          <span className="text-[14px] font-extrabold text-[#006459] dark:text-[#C8B882]">
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006459] text-white text-xs font-semibold hover:bg-[#005048] transition-all"
                >
                  Shfleto të gjitha pronat
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls Bar */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-[11px] text-gray-500 dark:text-white/50">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 font-mono text-[10px]">↓</kbd>
              Lundro
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 font-mono text-[10px]">↵</kbd>
              Zgjidh
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#006459] dark:text-[#C8B882]">
            Bleje Pronën Discovery Engine
          </span>
        </div>
      </div>
    </div>
  )
}
