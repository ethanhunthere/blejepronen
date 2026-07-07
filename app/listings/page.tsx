'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ListingCard from '@/components/ListingCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, SlidersHorizontal, X, Loader2 } from 'lucide-react'
import type { Listing } from '@/lib/supabase'

const CITIES = ['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Gjilan', 'Mitrovicë', 'Ferizaj']
const PAGE_SIZE = 12

function ListingsContent() {
  const searchParams = useSearchParams()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [filters, setFilters] = useState({
    city: searchParams.get('city') || '',
    type: searchParams.get('type') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    rooms: searchParams.get('rooms') || '',
    search: searchParams.get('search') || ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [searchInput, setSearchInput] = useState(filters.search)
  const searchDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const supabase = createClient()

  const fetchListings = useCallback(async (pageNum = 0) => {
    setLoading(true)
    let query = supabase
      .from('listings')
      .select('id,title,price,city,address,type,images,rooms,area_m2,is_featured,is_active,created_at,user_id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    if (filters.city) query = query.eq('city', filters.city)
    if (filters.type) query = query.eq('type', filters.type)
    if (filters.minPrice) query = query.gte('price', Number(filters.minPrice))
    if (filters.maxPrice) query = query.lte('price', Number(filters.maxPrice))
    if (filters.rooms) query = query.eq('rooms', Number(filters.rooms))
    if (filters.search) query = query.ilike('title', `%${filters.search}%`)

    const { data } = await query
    const results = (data || []) as unknown as Listing[]

    if (pageNum === 0) {
      setListings(results)
    } else {
      setListings(prev => [...prev, ...results])
    }

    if (results.length < PAGE_SIZE) {
      setHasMore(false)
    }

    setLoading(false)
  }, [filters, supabase])

  useEffect(() => {
    setPage(0)
    setHasMore(true)
    fetchListings(0)
  }, [fetchListings])

  useEffect(() => {
    return () => {
      clearTimeout(searchDebounceRef.current)
    }
  }, [])

  const clearFilters = () => {
    setSearchInput('')
    setFilters({ city: '', type: '', minPrice: '', maxPrice: '', rooms: '', search: '' })
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  return (
    <div className="min-h-screen bg-[#0A0F2E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Banesat në shitje dhe me qira</h1>
          <p className="text-gray-400">Gjej banesën e përsosur për ty</p>
        </div>

        {/* Search + Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Kërko banesa..."
              className="pl-10 h-11 bg-white/10 text-white placeholder:text-white/40 border-white/10"
              value={searchInput}
              onChange={(e) => {
                const value = e.target.value
                setSearchInput(value)
                clearTimeout(searchDebounceRef.current)
                searchDebounceRef.current = setTimeout(() => {
                  setFilters(prev => ({ ...prev, search: value }))
                }, 400)
              }}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="h-11 px-4 border border-white/20 bg-transparent text-white hover:bg-white/10 whitespace-nowrap rounded-xl font-medium transition-colors inline-flex items-center justify-center"
              onClick={() => setShowFilters(!showFilters)}
            >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filtro
            {hasActiveFilters && (
              <span className="ml-2 bg-[#1B4FFF] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {Object.values(filters).filter(v => v !== '').length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="h-11 px-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl font-medium transition-colors inline-flex items-center justify-center">
              <X className="h-4 w-4 mr-1" />
              Pastro
            </button>
          )}
        </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-[#111936] rounded-2xl border border-white/10 p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* City */}
            <div>
              <label htmlFor="filter-city" className="text-xs font-medium text-gray-400 mb-2 block">Qyteti</label>
              <select
                id="filter-city"
                className="w-full min-h-11 h-11 px-3 rounded-lg border border-white/10 text-sm bg-[#111936] text-white focus:outline-none focus:ring-2 focus:ring-[#1B4FFF]"
                value={filters.city}
                onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
              >
                <option value="">Të gjitha</option>
                {CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label htmlFor="filter-type" className="text-xs font-medium text-gray-400 mb-2 block">Lloji</label>
              <select
                id="filter-type"
                className="w-full min-h-11 h-11 px-3 rounded-lg border border-white/10 text-sm bg-[#111936] text-white focus:outline-none focus:ring-2 focus:ring-[#1B4FFF]"
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="">Të gjitha</option>
                <option value="shitje">Shitje</option>
                <option value="qira">Me qira</option>
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label htmlFor="filter-min-price" className="text-xs font-medium text-gray-400 mb-2 block">Çmimi min (€)</label>
              <Input
                id="filter-min-price"
                type="number"
                placeholder="0"
                className="min-h-11 h-11 text-sm bg-white/10 text-white placeholder:text-white/40 border-white/10"
                value={filters.minPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
              />
            </div>

            {/* Max Price */}
            <div>
              <label htmlFor="filter-max-price" className="text-xs font-medium text-gray-400 mb-2 block">Çmimi max (€)</label>
              <Input
                id="filter-max-price"
                type="number"
                placeholder="500,000"
                className="min-h-11 h-11 text-sm bg-white/10 text-white placeholder:text-white/40 border-white/10"
                value={filters.maxPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
              />
            </div>

            {/* Rooms */}
            <div>
              <label htmlFor="filter-rooms" className="text-xs font-medium text-gray-400 mb-2 block">Dhoma</label>
              <select
                id="filter-rooms"
                className="w-full min-h-11 h-11 px-3 rounded-lg border border-white/10 text-sm bg-[#111936] text-white focus:outline-none focus:ring-2 focus:ring-[#1B4FFF]"
                value={filters.rooms}
                onChange={(e) => setFilters(prev => ({ ...prev, rooms: e.target.value }))}
              >
                <option value="">Të gjitha</option>
                {[1,2,3,4,5].map(r => (
                  <option key={r} value={r}>{r}+</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[#111936] rounded-2xl overflow-hidden animate-pulse border border-white/10">
                <div className="h-52 bg-gray-700" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-700 rounded w-3/4" />
                  <div className="h-6 bg-gray-700 rounded w-1/2" />
                  <div className="h-4 bg-gray-700 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold text-gray-200 mb-2">Nuk u gjetën banesa</h3>
            <p className="text-gray-400 mb-6">Provo të ndryshosh filtrat e kërkimit</p>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors">Pastro filtrat</button>
            )}
          </div>
        ) : (
          <>
            <p aria-live="polite" className="text-sm text-gray-400 mb-4">{listings.length} banesa të gjetura</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing, index) => (
                <ListingCard key={listing.id} listing={listing} priority={index < 4} />
              ))}
            </div>
            {hasMore && !loading && listings.length > 0 && (
              <div className="text-center mt-10">
                <button
                  type="button"
                  onClick={() => {
                    const nextPage = page + 1
                    setPage(nextPage)
                    fetchListings(nextPage)
                  }}
                  className="px-8 h-11 border border-white/20 bg-transparent text-white hover:bg-white/10 rounded-xl font-medium transition-colors inline-flex items-center justify-center"
                >
                  Ngarko më shumë banesa
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ListingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0F2E] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B4FFF]" />
      </div>
    }>
      <ListingsContent />
    </Suspense>
  )
}
