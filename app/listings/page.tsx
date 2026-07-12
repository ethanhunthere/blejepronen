'use client'

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from 'react'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ListingCard from '@/components/ListingCard'
import { Search, SlidersHorizontal, X, Loader2, CheckCircle2, Users, ChevronDown } from 'lucide-react'
import type { Listing, Profile } from '@/lib/supabase'
import { KOSOVO_LOCATIONS } from '@/lib/kosovo-locations'

const CITIES = Object.keys(KOSOVO_LOCATIONS)
const PAGE_SIZE = 12

type AgentResult = Pick<Profile, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'email_verified' | 'created_at'>

function ListingsContent() {
  const [listings, setListings] = useState<Listing[]>([])
  const [agentResults, setAgentResults] = useState<AgentResult[]>([])
  const [page, setPage] = useState(0)
  const [fetchState, setFetchState] = useState({ loading: true, hasMore: true })
  const [loadError, setLoadError] = useState(false)
  const [filters, setFilters] = useState({ city: '', type: '', minPrice: '', maxPrice: '', rooms: '', search: '', agentId: '', neighborhood: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
  // Close all custom dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        cityRef.current?.contains(target) ||
        neighborhoodRef.current?.contains(target) ||
        typeRef.current?.contains(target) ||
        roomsRef.current?.contains(target) ||
        sortRef.current?.contains(target)
      ) return
      setCityOpen(false)
      setNeighborhoodOpen(false)
      setTypeOpen(false)
      setRoomsOpen(false)
      setSortOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const [cityOpen, setCityOpen] = useState(false)
  const [neighborhoodOpen, setNeighborhoodOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [roomsOpen, setRoomsOpen] = useState(false)
  const cityRef = useRef<HTMLDivElement>(null)
  const neighborhoodRef = useRef<HTMLDivElement>(null)
  const typeRef = useRef<HTMLDivElement>(null)
  const roomsRef = useRef<HTMLDivElement>(null)
  const [searchInput, setSearchInput] = useState(filters.search)
  const [agentMap, setAgentMap] = useState<Record<string, AgentResult>>({})
  const selectedAgent = useMemo(() => (filters.agentId ? agentMap[filters.agentId] ?? null : null), [agentMap, filters.agentId])
  const router = useRouter()
  const searchDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const supabase = createClient()

  const fetchListings = useCallback(async (pageNum = 0) => {
    if (pageNum === 0) setPage(0)
    setFetchState(prev => ({ ...prev, loading: true, hasMore: pageNum === 0 ? true : prev.hasMore }))
    setLoadError(false)

    const searchTerm = filters.search.trim()

    let listingQuery = supabase
      .from('listings')
      .select('id,title,price,city,neighborhood,address,type,images,rooms,area_m2,is_featured,is_active,created_at,user_id,condition,floor,apartment_type,features')
      .eq('is_active', true)

    if (filters.city) listingQuery = listingQuery.eq('city', filters.city)
    if (filters.type) listingQuery = listingQuery.eq('type', filters.type)
    if (filters.minPrice) listingQuery = listingQuery.gte('price', Number(filters.minPrice))
    if (filters.maxPrice) listingQuery = listingQuery.lte('price', Number(filters.maxPrice))
    if (filters.rooms) listingQuery = listingQuery.gte('rooms', Number(filters.rooms))
    if (filters.agentId) listingQuery = listingQuery.eq('user_id', filters.agentId)
    if (filters.neighborhood) listingQuery = listingQuery.ilike('neighborhood', `%${filters.neighborhood}%`)

    if (searchTerm) {
      listingQuery = listingQuery.or(
        `title.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
      )
    }

    if (sortBy === 'price_asc') {
      listingQuery = listingQuery.order('price', { ascending: true })
    } else if (sortBy === 'price_desc') {
      listingQuery = listingQuery.order('price', { ascending: false })
    } else {
      listingQuery = listingQuery.order('created_at', { ascending: false })
    }

    listingQuery = listingQuery.range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    try {
      const [{ data: listingData, error: listingError }, { data: profileData }] = await Promise.all([
        listingQuery,
        searchTerm && pageNum === 0 && !filters.agentId
          ? supabase
              .from('profiles_public')
              .select('id,first_name,last_name,avatar_url,email_verified,created_at')
              .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
              .limit(20)
          : Promise.resolve({ data: [] })
      ])

      if (listingError) throw listingError

      const listingResults = (listingData || []) as unknown as Listing[]
      const agentResultsData = (profileData || []) as unknown as AgentResult[]

      if (pageNum === 0) {
        setListings(listingResults)
        setAgentResults(agentResultsData)
        if (agentResultsData.length > 0) {
          setAgentMap(prev => {
            const next = { ...prev }
            agentResultsData.forEach(agent => { next[agent.id] = agent })
            return next
          })
        }
      } else {
        setListings(prev => {
          const seen = new Set(prev.map(l => l.id))
          const newListings = listingResults.filter(l => !seen.has(l.id))
          return [...prev, ...newListings]
        })
      }

      setFetchState({ loading: false, hasMore: listingResults.length === PAGE_SIZE })
    } catch (err) {
      console.error('Fetch listings error:', err)
      setLoadError(true)
      setFetchState({ loading: false, hasMore: false })
    }
  }, [filters, sortBy, supabase])

  useEffect(() => {
    fetchListings(0)
  }, [fetchListings])

  useEffect(() => {
    return () => {
      clearTimeout(searchDebounceRef.current)
    }
  }, [])

  useEffect(() => {
    if (!filters.agentId || agentMap[filters.agentId]) return

    supabase
      .from('profiles_public')
      .select('id,first_name,last_name,avatar_url,email_verified')
      .eq('id', filters.agentId)
      .single()
      .then(({ data }) => {
        if (!data) return
        setAgentMap(prev => ({ ...prev, [data.id]: data as unknown as AgentResult }))
      })
  }, [filters.agentId, supabase, agentMap])

  const clearFilters = () => {
    setSearchInput('')
    setFilters({ city: '', type: '', minPrice: '', maxPrice: '', rooms: '', search: '', agentId: '', neighborhood: '' })
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="max-w-7xl 2xl:max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-[#1A1A2E] tracking-tight mb-2">Banesat në Shitje dhe me Qira</h1>
          <p className="text-gray-500 text-base">Gjej banesën e përsosur për ty</p>
        </div>

        {/* Search + Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 min-w-0 group shadow-sm rounded-xl border border-gray-200 focus-within:border-[#1B4FFF]/50 transition-colors duration-300 bg-white">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Kërko sipas banesës, adresës, qytetit..."
              className="w-full h-13 py-3.5 pl-11 pr-4 bg-transparent text-[#1A1A2E] placeholder:text-gray-400 outline-none rounded-xl text-sm"
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
              className="h-13 px-5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-all duration-200 inline-flex items-center justify-center cursor-pointer whitespace-nowrap"
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
            <button type="button" onClick={clearFilters} className="h-13 px-4 text-gray-400 hover:text-gray-600 transition-colors font-medium inline-flex items-center justify-center cursor-pointer whitespace-nowrap">
              <X className="h-4 w-4 mr-1" />
              Pastro
            </button>
          )}
        </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* City */}
            <div>
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2 block">Qyteti</label>
              <div className="relative" ref={cityRef}>
                <button
                  type="button"
                  onClick={() => { setCityOpen(!cityOpen); setNeighborhoodOpen(false); setTypeOpen(false); setRoomsOpen(false) }}
                  className="w-full h-11 px-3 bg-white border border-gray-200 hover:border-gray-300 text-[#1A1A2E] rounded-xl text-sm flex items-center justify-between transition-all"
                >
                  <span className={filters.city ? 'text-[#1A1A2E]' : 'text-gray-400'}>{filters.city || 'Të gjitha'}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${cityOpen ? 'rotate-180' : ''}`} />
                </button>
                {cityOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setFilters(prev => ({ ...prev, city: '', neighborhood: '' })); setCityOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${!filters.city ? 'text-[#1B4FFF] bg-[#1B4FFF]/10' : 'text-[#1A1A2E] hover:bg-gray-50'}`}
                    >
                      Të gjitha
                    </button>
                    {CITIES.map(city => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => { setFilters(prev => ({ ...prev, city, neighborhood: '' })); setCityOpen(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${filters.city === city ? 'text-[#1B4FFF] bg-[#1B4FFF]/10' : 'text-[#1A1A2E] hover:bg-gray-50'}`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Neighborhood */}
            <div>
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2 block">Lagjja</label>
              <div className="relative" ref={neighborhoodRef}>
                {filters.city ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setNeighborhoodOpen(!neighborhoodOpen); setCityOpen(false); setTypeOpen(false); setRoomsOpen(false) }}
                      className="w-full h-11 px-3 bg-white border border-gray-200 hover:border-gray-300 text-[#1A1A2E] rounded-xl text-sm flex items-center justify-between transition-all"
                    >
                      <span className={filters.neighborhood ? 'text-[#1A1A2E]' : 'text-gray-400'}>{filters.neighborhood || 'Të gjitha lagjet'}</span>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${neighborhoodOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {neighborhoodOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => { setFilters(prev => ({ ...prev, neighborhood: '' })); setNeighborhoodOpen(false) }}
                          className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${!filters.neighborhood ? 'text-[#1B4FFF] bg-[#1B4FFF]/10' : 'text-[#1A1A2E] hover:bg-gray-50'}`}
                        >
                          Të gjitha lagjet
                        </button>
                        {(KOSOVO_LOCATIONS[filters.city] || []).map(neighborhood => (
                          <button
                            key={neighborhood}
                            type="button"
                            onClick={() => { setFilters(prev => ({ ...prev, neighborhood })); setNeighborhoodOpen(false) }}
                            className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${filters.neighborhood === neighborhood ? 'text-[#1B4FFF] bg-[#1B4FFF]/10' : 'text-[#1A1A2E] hover:bg-gray-50'}`}
                          >
                            {neighborhood}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full h-11 px-3 bg-gray-50 border border-gray-100 text-gray-300 rounded-xl text-sm flex items-center justify-between cursor-not-allowed"
                  >
                    <span>Zgjedh qytetin fillimisht</span>
                    <ChevronDown className="h-4 w-4 text-gray-200" />
                  </button>
                )}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2 block">Lloji</label>
              <div className="relative" ref={typeRef}>
                <button
                  type="button"
                  onClick={() => { setTypeOpen(!typeOpen); setCityOpen(false); setNeighborhoodOpen(false); setRoomsOpen(false) }}
                  className="w-full h-11 px-3 bg-white border border-gray-200 hover:border-gray-300 text-[#1A1A2E] rounded-xl text-sm flex items-center justify-between transition-all"
                >
                  <span className={filters.type ? 'text-[#1A1A2E]' : 'text-gray-400'}>{filters.type === 'shitje' ? 'Shitje' : filters.type === 'qira' ? 'Me qira' : 'Të gjitha'}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${typeOpen ? 'rotate-180' : ''}`} />
                </button>
                {typeOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                    <button
                      type="button"
                      onClick={() => { setFilters(prev => ({ ...prev, type: '' })); setTypeOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${!filters.type ? 'text-[#1B4FFF] bg-[#1B4FFF]/10' : 'text-[#1A1A2E] hover:bg-gray-50'}`}
                    >
                      Të gjitha
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFilters(prev => ({ ...prev, type: 'shitje' })); setTypeOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${filters.type === 'shitje' ? 'text-[#1B4FFF] bg-[#1B4FFF]/10' : 'text-[#1A1A2E] hover:bg-gray-50'}`}
                    >
                      Shitje
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFilters(prev => ({ ...prev, type: 'qira' })); setTypeOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${filters.type === 'qira' ? 'text-[#1B4FFF] bg-[#1B4FFF]/10' : 'text-[#1A1A2E] hover:bg-gray-50'}`}
                    >
                      Me qira
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Min Price */}
            <div>
              <label htmlFor="filter-min-price" className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2 block">Çmimi min (€)</label>
              <input
                id="filter-min-price"
                type="number"
                placeholder="0"
                className="w-full h-11 px-3 bg-white border border-gray-200 hover:border-gray-300 text-[#1A1A2E] placeholder:text-gray-400 rounded-xl text-sm focus:border-[#1B4FFF]/50 focus:outline-none transition-all"
                value={filters.minPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
              />
            </div>

            {/* Max Price */}
            <div>
              <label htmlFor="filter-max-price" className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2 block">Çmimi max (€)</label>
              <input
                id="filter-max-price"
                type="number"
                placeholder="500,000"
                className="w-full h-11 px-3 bg-white border border-gray-200 hover:border-gray-300 text-[#1A1A2E] placeholder:text-gray-400 rounded-xl text-sm focus:border-[#1B4FFF]/50 focus:outline-none transition-all"
                value={filters.maxPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
              />
            </div>

            {/* Rooms */}
            <div>
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2 block">Dhoma</label>
              <div className="relative" ref={roomsRef}>
                <button
                  type="button"
                  onClick={() => { setRoomsOpen(!roomsOpen); setCityOpen(false); setNeighborhoodOpen(false); setTypeOpen(false) }}
                  className="w-full h-11 px-3 bg-white border border-gray-200 hover:border-gray-300 text-[#1A1A2E] rounded-xl text-sm flex items-center justify-between transition-all"
                >
                  <span className={filters.rooms ? 'text-[#1A1A2E]' : 'text-gray-400'}>{filters.rooms ? `${filters.rooms}+` : 'Të gjitha'}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${roomsOpen ? 'rotate-180' : ''}`} />
                </button>
                {roomsOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                    <button
                      type="button"
                      onClick={() => { setFilters(prev => ({ ...prev, rooms: '' })); setRoomsOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${!filters.rooms ? 'text-[#1B4FFF] bg-[#1B4FFF]/10' : 'text-[#1A1A2E] hover:bg-gray-50'}`}
                    >
                      Të gjitha
                    </button>
                    {[1,2,3,4,5].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setFilters(prev => ({ ...prev, rooms: String(r) })); setRoomsOpen(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${filters.rooms === String(r) ? 'text-[#1B4FFF] bg-[#1B4FFF]/10' : 'text-[#1A1A2E] hover:bg-gray-50'}`}
                      >
                        {r}+
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Agent Results */}
        {!fetchState.loading && agentResults.length > 0 && !filters.agentId && (
          <div className="mb-8">
            <h2 className="text-gray-600 text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Agjentë &amp; Shitës
            </h2>
            <div className="space-y-3">
              {agentResults.map(agent => {
                const initials = (agent.first_name?.[0] || '?').toUpperCase()
                return (
                  <div
                    key={agent.id}
                    className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 flex items-center gap-4 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                  >
                    {agent.avatar_url ? (
                      <Image
                        src={agent.avatar_url}
                        alt={`Foto e ${agent.first_name || 'agjentit'}`}
                        width={56}
                        height={56}
                        className="rounded-full object-cover border-2 border-[#1B4FFF]/30 w-14 h-14"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[#1B4FFF] flex items-center justify-center text-white font-bold border-2 border-[#1B4FFF]/30">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[#1A1A2E] font-bold text-base truncate">
                        {agent.first_name} {agent.last_name}
                      </p>
                      {agent.email_verified && (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full mt-1">
                          ✓ E verifikuar
                        </span>
                      )}
                      <p className="text-gray-400 text-xs mt-1">
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
                      className="text-sm font-medium text-[#1B4FFF] hover:text-[#1640CC] whitespace-nowrap transition-colors cursor-pointer"
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
        {!fetchState.loading && filters.agentId && selectedAgent && (
          <div className="mb-8">
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {selectedAgent.avatar_url ? (
                  <Image
                    src={selectedAgent.avatar_url}
                    alt={`Foto e ${selectedAgent.first_name || 'agjentit'}`}
                    width={64}
                    height={64}
                    className="rounded-full object-cover border-2 border-[#1B4FFF]/30 w-16 h-16"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#1B4FFF] flex items-center justify-center text-white text-xl font-bold border-2 border-[#1B4FFF]/30">
                    {(selectedAgent.first_name?.[0] || '?').toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-[#1A1A2E] font-bold text-lg truncate">
                    {selectedAgent.first_name} {selectedAgent.last_name}
                  </h2>
                  {selectedAgent.email_verified && (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full mt-1">
                      <CheckCircle2 className="h-3 w-3" /> E verifikuar
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilters(prev => ({ ...prev, agentId: '' }))
                  router.push('/listings', { scroll: false })
                }}
                className="h-10 px-4 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-all duration-200 inline-flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4 mr-1" />
                Pastro filtrin e agjentit
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {fetchState.loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse border border-gray-100">
                <div className="h-52 bg-gray-100" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-6 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-[#1A1A2E] mb-2">Shërbimi është i padisponueshëm</h3>
            <p className="text-gray-400 mb-6">Ju lutemi provoni përsëri më vonë.</p>
            <button type="button" onClick={() => fetchListings(0)} className="inline-flex items-center justify-center px-6 py-3 bg-[#1B4FFF] hover:bg-[#1640CC] text-white font-semibold rounded-xl transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-[#1B4FFF]/25">Provo përsëri</button>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 bg-gray-100 rounded-2xl" />
              <div className="absolute inset-x-4 top-2 h-8 bg-white border-2 border-gray-200 rounded-t-lg" />
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-b-[14px] border-b-gray-200" />
            </div>
            <h3 className="text-xl font-bold text-[#1A1A2E] mb-2">Nuk u gjetën banesa</h3>
            <p className="text-gray-400 mb-6">Provo të ndryshosh filtrat e kërkimit</p>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className="inline-flex items-center justify-center px-6 py-3 bg-[#1B4FFF] hover:bg-[#1640CC] text-white font-semibold rounded-xl transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-[#1B4FFF]/25">Pastro filtrat</button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p aria-live="polite" className="text-[13px] text-[#6B7280] font-medium">Gjenden {listings.length} banesa</p>
              <div className="relative flex-shrink-0" ref={sortRef}>
                <button
                  type="button"
                  onClick={() => setSortOpen(!sortOpen)}
                  className="h-9 px-3 bg-white border border-gray-200 hover:border-gray-300 text-[13px] font-medium text-gray-700 rounded-lg transition-all duration-200 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {sortBy === 'newest' ? 'Më të rejat' : sortBy === 'price_asc' ? 'Çmimi rritës' : 'Çmimi zbritës'}
                  <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`} />
                </button>
                {sortOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[160px] overflow-hidden">
                    {([
                      { value: 'newest', label: 'Më të rejat' },
                      { value: 'price_asc', label: 'Çmimi rritës' },
                      { value: 'price_desc', label: 'Çmimi zbritës' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setSortBy(opt.value); setSortOpen(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${sortBy === opt.value ? 'text-[#1B4FFF] bg-[#1B4FFF]/10' : 'text-[#1A1A2E] hover:bg-gray-50'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
              {listings.map((listing, index) => (
                <ListingCard key={listing.id} listing={listing} priority={index < 4} />
              ))}
            </div>
            {fetchState.hasMore && !fetchState.loading && listings.length > 0 && (
              <div className="text-center mt-12">
                <button
                  type="button"
                  onClick={() => {
                    const nextPage = page + 1
                    setPage(nextPage)
                    fetchListings(nextPage)
                  }}
                  className="px-8 py-3 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-all duration-200 mx-auto inline-flex items-center justify-center cursor-pointer"
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
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B4FFF]" />
      </div>
    }>
      <ListingsContent />
    </Suspense>
  )
}
