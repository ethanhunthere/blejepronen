'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ListingCard from '@/components/ListingCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, SlidersHorizontal, X, Loader2 } from 'lucide-react'
import type { Listing } from '@/lib/supabase'

const CITIES = ['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Gjilan', 'Mitrovicë', 'Ferizaj']

function ListingsContent() {
  const searchParams = useSearchParams()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    city: searchParams.get('city') || '',
    type: searchParams.get('type') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    rooms: searchParams.get('rooms') || '',
    search: searchParams.get('search') || ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const supabase = createClient()

  const fetchListings = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('listings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (filters.city) query = query.eq('city', filters.city)
    if (filters.type) query = query.eq('type', filters.type)
    if (filters.minPrice) query = query.gte('price', Number(filters.minPrice))
    if (filters.maxPrice) query = query.lte('price', Number(filters.maxPrice))
    if (filters.rooms) query = query.eq('rooms', Number(filters.rooms))
    if (filters.search) query = query.ilike('title', `%${filters.search}%`)

    const { data } = await query
    setListings(data || [])
    setLoading(false)
  }, [filters])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  const clearFilters = () => {
    setFilters({ city: '', type: '', minPrice: '', maxPrice: '', rooms: '', search: '' })
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Banesat në shitje dhe me qira</h1>
          <p className="text-gray-500">Gjej banesën e përsosur për ty</p>
        </div>

        {/* Search + Filter Toggle */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Kërko banesa..."
              className="pl-10 h-11 bg-white border-gray-200"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <Button
            variant="outline"
            className="h-11 px-4 border-gray-200 bg-white"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filtro
            {hasActiveFilters && (
              <span className="ml-2 bg-[#1B4FFF] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {Object.values(filters).filter(v => v !== '').length}
              </span>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="h-11 text-gray-500">
              <X className="h-4 w-4 mr-1" />
              Pastro
            </Button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* City */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Qyteti</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4FFF]"
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
              <label className="text-xs font-medium text-gray-500 mb-2 block">Lloji</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4FFF]"
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
              <label className="text-xs font-medium text-gray-500 mb-2 block">Çmimi min (€)</label>
              <Input
                type="number"
                placeholder="0"
                className="h-10 text-sm"
                value={filters.minPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Çmimi max (€)</label>
              <Input
                type="number"
                placeholder="500,000"
                className="h-10 text-sm"
                value={filters.maxPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
              />
            </div>

            {/* Rooms */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Dhoma</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4FFF]"
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
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-52 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-6 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nuk u gjetën banesa</h3>
            <p className="text-gray-500 mb-6">Provo të ndryshosh filtrat e kërkimit</p>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline">Pastro filtrat</Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{listings.length} banesa të gjetura</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ListingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B4FFF]" />
      </div>
    }>
      <ListingsContent />
    </Suspense>
  )
}
