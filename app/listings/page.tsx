'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'

import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ListingCard from '@/components/ListingCard'
import { Input } from '@/components/ui/input'
import { Search, SlidersHorizontal, X, Loader2, CheckCircle2 } from 'lucide-react'
import type { Listing, Profile } from '@/lib/supabase'

const CITIES = ['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Gjilan', 'Mitrovicë', 'Ferizaj']
const PAGE_SIZE = 12

type AgentResult = Pick<Profile, 'id' | 'first_name' | 'last_name' | 'email' | 'avatar_url' | 'email_verified' | 'created_at'>

function ListingsContent() {
  const searchParams = useSearchParams()
  const [listings, setListings] = useState<Listing[]>([])
  const [agentResults, setAgentResults] = useState<AgentResult[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [filters, setFilters] = useState({
    city: searchParams.get('city') || '',
    type: searchParams.get('type') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    rooms: searchParams.get('rooms') || '',
    search: searchParams.get('search') || '',
    agentId: searchParams.get('agentId') || '',
    neighborhood: searchParams.get('neighborhood') || ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [searchInput, setSearchInput] = useState(filters.search)
  const [selectedAgent, setSelectedAgent] = useState<AgentResult | null>(null)
  const router = useRouter()
  const searchDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const supabase = createClient()

  const applyCommonFilters = (query: any) => {
    if (filters.city) query = query.eq('city', filters.city)
    if (filters.type) query = query.eq('type', filters.type)
    if (filters.minPrice) query = query.gte('price', Number(filters.minPrice))
    if (filters.maxPrice) query = query.lte('price', Number(filters.maxPrice))
    if (filters.rooms) query = query.eq('rooms', Number(filters.rooms))
    if (filters.agentId) query = query.eq('user_id', filters.agentId)
    if (filters.neighborhood) query = query.ilike('neighborhood', `%${filters.neighborhood}%`)
    return query
  }

  const fetchListings = useCallback(async (pageNum = 0) => {
    setLoading(true)

    const searchTerm = filters.search.trim()

    let listingQuery = applyCommonFilters(
      supabase
        .from('listings')
        .select('id,title,price,city,address,type,images,rooms,area_m2,is_featured,is_active,created_at,user_id')
        .eq('is_active', true)
    )

    if (searchTerm) {
      listingQuery = listingQuery.or(
        `title.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
      )
    }

    listingQuery = listingQuery
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    const [{ data: listingData }, { data: profileData }] = await Promise.all([
      listingQuery,
      searchTerm && pageNum === 0 && !filters.agentId
        ? supabase
            .from('profiles')
            .select('id,first_name,last_name,email,avatar_url,email_verified,created_at')
            .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
            .limit(20)
        : Promise.resolve({ data: [] })
    ])

    const listingResults = (listingData || []) as unknown as Listing[]
    const agentResultsData = (profileData || []) as unknown as AgentResult[]

    if (pageNum === 0) {
      setListings(listingResults)
      setAgentResults(agentResultsData)
    } else {
      setListings(prev => {
        const seen = new Set(prev.map(l => l.id))
        const newListings = listingResults.filter(l => !seen.has(l.id))
        return [...prev, ...newListings]
      })
    }

    setHasMore(listingResults.length === PAGE_SIZE)
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

  useEffect(() => {
    if (!filters.agentId) {
      setSelectedAgent(null)
      return
    }

    supabase
      .from('profiles')
      .select('id,first_name,last_name,email,avatar_url,email_verified')
      .eq('id', filters.agentId)
      .single()
      .then(({ data }) => {
        setSelectedAgent((data || null) as unknown as AgentResult | null)
      })
  }, [filters.agentId, supabase])

  const clearFilters = () => {
    setSearchInput('')
    setFilters({ city: '', type: '', minPrice: '', maxPrice: '', rooms: '', search: '', agentId: '', neighborhood: '' })
    setSelectedAgent(null)
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  return (
    <div className="min-h-screen bg-[#0A0F2E]">
      <div className="max-w-7xl 2xl:max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              placeholder="Kërko sipas banesës, adresës, qytetit..."
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
              className="h-11 px-5 border-2 border-white bg-transparent text-white hover:bg-white hover:text-[#1B4FFF] whitespace-nowrap rounded-xl font-semibold transition-colors inline-flex items-center justify-center cursor-pointer"
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
            <button type="button" onClick={clearFilters} className="h-11 px-5 border-2 border-white text-white hover:bg-white hover:text-[#1B4FFF] rounded-xl font-semibold transition-colors inline-flex items-center justify-center cursor-pointer">
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
              <label htmlFor="filter-city" className="text-sm font-medium text-gray-400 mb-2 block">Qyteti</label>
              <select
                id="filter-city"
                className="w-full min-h-11 h-11 px-3 rounded-lg border border-white/10 text-sm bg-[#111936] text-white focus:outline-none focus:ring-2 focus:ring-[#1B4FFF]"
                value={filters.city}
                onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value, neighborhood: '' }))}
              >
                <option value="">Të gjitha</option>
                {CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Neighborhood */}
            <div>
              <label htmlFor="filter-neighborhood" className="text-sm font-medium text-gray-400 mb-2 block">Lagjja</label>
              <Input
                id="filter-neighborhood"
                type="text"
                placeholder="p.sh. Dardania"
                className="min-h-11 h-11 text-sm bg-white/10 text-white placeholder:text-white/40 border-white/10"
                value={filters.neighborhood}
                onChange={(e) => setFilters(prev => ({ ...prev, neighborhood: e.target.value }))}
              />
            </div>

            {/* Type */}
            <div>
              <label htmlFor="filter-type" className="text-sm font-medium text-gray-400 mb-2 block">Lloji</label>
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
              <label htmlFor="filter-min-price" className="text-sm font-medium text-gray-400 mb-2 block">Çmimi min (€)</label>
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
              <label htmlFor="filter-max-price" className="text-sm font-medium text-gray-400 mb-2 block">Çmimi max (€)</label>
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
              <label htmlFor="filter-rooms" className="text-sm font-medium text-gray-400 mb-2 block">Dhoma</label>
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

        {/* Agent Results */}
        {!loading && agentResults.length > 0 && !filters.agentId && (
          <div className="mb-8">
            <h2 className="text-white/60 text-sm font-medium mb-3">Agjentë & Shitës</h2>
            <div className="space-y-3">
              {agentResults.map(agent => {
                const initials = (agent.first_name?.[0] || '?').toUpperCase()
                return (
                  <div
                    key={agent.id}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4"
                  >
                    {agent.avatar_url ? (
                      <img
                        src={agent.avatar_url}
                        alt=""
                        className="w-14 h-14 rounded-full object-cover border border-white/10"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[#1B4FFF] flex items-center justify-center text-white font-bold">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold truncate">
                        {agent.first_name} {agent.last_name}
                      </p>
                      {agent.email_verified && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-400 mt-0.5">
                          ✓ E verifikuar
                        </span>
                      )}
                      <p className="text-white/40 text-xs mt-0.5">
                        Anëtar që {new Date(agent.created_at).toLocaleDateString('sq-AL', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('')
                        router.push(`/listings?agentId=${agent.id}`, { scroll: false })
                        setFilters(prev => ({ ...prev, search: '', agentId: agent.id }))
                      }}
                      className="text-sm font-medium text-[#1B4FFF] hover:text-[#1640CC] whitespace-nowrap cursor-pointer"
                    >
                      Shiko banesat →
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Selected Agent */}
        {!loading && filters.agentId && selectedAgent && (
          <div className="mb-8">
            <div className="bg-white/8 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {selectedAgent.avatar_url ? (
                  <img
                    src={selectedAgent.avatar_url}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#1B4FFF] flex items-center justify-center text-white text-xl font-bold">
                    {(selectedAgent.first_name?.[0] || selectedAgent.email?.[0] || '?').toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-white font-semibold text-lg truncate">
                    {selectedAgent.first_name} {selectedAgent.last_name}
                  </h2>
                  <p className="text-white/50 text-sm truncate">{selectedAgent.email}</p>
                  {selectedAgent.email_verified && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-400 mt-1">
                      <CheckCircle2 className="h-3 w-3" /> E verifikuar
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilters(prev => ({ ...prev, agentId: '' }))
                  setSelectedAgent(null)
                  router.push('/listings', { scroll: false })
                }}
                className="h-10 px-4 border-2 border-white text-white hover:bg-white hover:text-[#1B4FFF] rounded-xl font-semibold transition-colors inline-flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4 mr-1" />
                Pastro filtrin e agjentit
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
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
              <button type="button" onClick={clearFilters} className="w-full sm:w-auto h-11 inline-flex items-center justify-center rounded-xl border-2 border-white bg-transparent px-5 font-semibold text-white hover:bg-white hover:text-[#1B4FFF] transition-colors cursor-pointer">Pastro filtrat</button>
            )}
          </div>
        ) : (
          <>
            <p aria-live="polite" className="text-sm text-gray-400 mb-4">{listings.length} banesa të gjetura</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
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
                  className="w-full sm:w-auto px-6 h-11 border-2 border-white bg-transparent text-white hover:bg-white hover:text-[#1B4FFF] rounded-xl font-semibold transition-colors inline-flex items-center justify-center cursor-pointer"
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
