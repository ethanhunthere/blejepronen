'use client'

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useFavorites } from '@/lib/useFavorites'
import ListingCard, { ListingCardSkeleton } from '@/components/ListingCard'
import {
  Search,
  SlidersHorizontal,
  X,
  Loader2,
  CheckCircle2,
  ChevronDown,
  MapPin,
  Building2,
  Check,
  ArrowUpDown,
} from 'lucide-react'
import type { Listing, Profile } from '@/lib/supabase'
import { KOSOVO_LOCATIONS } from '@/lib/kosovo-locations'

const ALL_CITIES = Object.keys(KOSOVO_LOCATIONS)
const POPULAR_CITIES = [
  'Prishtinë',
  'Prizren',
  'Pejë',
  'Gjakovë',
  'Gjilan',
  'Ferizaj',
  'Mitrovicë',
  'Fushë Kosovë',
  'Vushtrri',
]

const PAGE_SIZE = 12

const CONDITIONS = [
  { value: 'e-re', label: 'E re' },
  { value: 'rinovuar', label: 'E rinovuar' },
  { value: 'e-vjeter', label: 'E vjetër' },
  { value: 'ka-nevojë-për-rinovim', label: 'Ka nevojë për rinovim' },
]

const APARTMENT_TYPES = [
  'Studio',
  '1+1',
  '2+1',
  '3+1',
  '4+1',
  '5+1',
  'Vilë',
  'Duplex',
]

const FLOORS = ['Bodrum', 'P/D', '1', '2', '3', '4', '5', '6', '7+']

const FEATURES_LIST = [
  { id: 'Parking', label: 'Parking' },
  { id: 'Ashensor', label: 'Ashensor' },
  { id: 'Ballkon', label: 'Ballkon' },
  { id: 'Ngrohje qendrore', label: 'Ngrohje qendrore' },
  { id: 'Klimë', label: 'Klimë' },
  { id: 'Mobilie', label: 'Mobiluar' },
  { id: 'Siguri 24h', label: 'Siguri 24h' },
  { id: 'Panoramë', label: 'Pamje panoramike' },
  { id: 'Kopësht', label: 'Kopësht' },
  { id: 'Bodrum', label: 'Bodrum / Depo' },
]

const PRICE_PRESETS_SALE = [
  { label: '< 50,000 €', min: '', max: '50000' },
  { label: '50k – 100k €', min: '50000', max: '100000' },
  { label: '100k – 150k €', min: '100000', max: '150000' },
  { label: '150k – 250k €', min: '150000', max: '250000' },
  { label: '> 250,000 €', min: '250000', max: '' },
]

const PRICE_PRESETS_RENT = [
  { label: '< 250 €', min: '', max: '250' },
  { label: '250 – 400 €', min: '250', max: '400' },
  { label: '400 – 600 €', min: '400', max: '600' },
  { label: '600 – 1,000 €', min: '600', max: '1000' },
  { label: '> 1,000 €', min: '1000', max: '' },
]

const AREA_PRESETS = [
  { label: '< 50 m²', min: '', max: '50' },
  { label: '50 – 80 m²', min: '50', max: '80' },
  { label: '80 – 120 m²', min: '80', max: '120' },
  { label: '120 – 200 m²', min: '120', max: '200' },
  { label: '> 200 m²', min: '200', max: '' },
]

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'area_desc' | 'area_asc'

interface FilterState {
  search: string
  city: string
  neighborhood: string
  type: '' | 'shitje' | 'qira'
  minPrice: string
  maxPrice: string
  rooms: string
  minArea: string
  maxArea: string
  condition: string
  apartment_type: string
  floor: string
  features: string[]
  agentId: string
}

type AgentResult = Pick<
  Profile,
  'id' | 'first_name' | 'last_name' | 'avatar_url' | 'email_verified' | 'created_at'
>

function ListingsContent() {
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const { favoriteIds, toggleFavorite } = useFavorites()

  // ---- Filter State ----
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    city: '',
    neighborhood: '',
    type: '',
    minPrice: '',
    maxPrice: '',
    rooms: '',
    minArea: '',
    maxArea: '',
    condition: '',
    apartment_type: '',
    floor: '',
    features: [],
    agentId: '',
  })

  const [searchInput, setSearchInput] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')

  // ---- Data State ----
  const [listings, setListings] = useState<Listing[]>([])
  const [page, setPage] = useState(0)
  const [fetchState, setFetchState] = useState({ loading: true, hasMore: true })
  const [loadError, setLoadError] = useState(false)
  const [agentMap, setAgentMap] = useState<Record<string, AgentResult>>({})

  // ---- UI Popovers State ----
  const [cityOpen, setCityOpen] = useState(false)
  const [citySearchQuery, setCitySearchQuery] = useState('')
  const [neighborhoodOpen, setNeighborhoodOpen] = useState(false)
  const [neighborhoodSearchQuery, setNeighborhoodSearchQuery] = useState('')
  const [priceOpen, setPriceOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [moreFiltersModalOpen, setMoreFiltersModalOpen] = useState(false)

  // Temp state for modal
  const [tempModalFilters, setTempModalFilters] = useState({
    minArea: '',
    maxArea: '',
    condition: '',
    apartment_type: '',
    floor: '',
    features: [] as string[],
  })

  // Refs for click outside
  const cityRef = useRef<HTMLDivElement>(null)
  const neighborhoodRef = useRef<HTMLDivElement>(null)
  const priceRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastAppliedSearchRef = useRef<string | null>(null)

  // Read URL params whenever URL search params change (e.g. navigation to /listings?type=qira)
  useEffect(() => {
    const currentParamsString = searchParams.toString()
    if (lastAppliedSearchRef.current === currentParamsString) return
    lastAppliedSearchRef.current = currentParamsString

    const pSearch = searchParams.get('search') || ''
    const pCity = searchParams.get('city') || ''
    const pNeighborhood = searchParams.get('neighborhood') || ''
    const pType = (searchParams.get('type') as '' | 'shitje' | 'qira') || ''
    const pMinPrice = searchParams.get('minPrice') || ''
    const pMaxPrice = searchParams.get('maxPrice') || ''
    const pRooms = searchParams.get('rooms') || ''
    const pMinArea = searchParams.get('minArea') || ''
    const pMaxArea = searchParams.get('maxArea') || ''
    const pCondition = searchParams.get('condition') || ''
    const pApartmentType = searchParams.get('apartment_type') || ''
    const pFloor = searchParams.get('floor') || ''
    const pFeaturesParam = searchParams.get('features')
    const pFeatures = pFeaturesParam ? pFeaturesParam.split(',') : []
    const pAgentId = searchParams.get('agentId') || ''
    const pSort = (searchParams.get('sort') as SortOption) || 'newest'

    setSearchInput(pSearch)
    setSortBy(pSort)
    setFilters({
      search: pSearch,
      city: pCity,
      neighborhood: pNeighborhood,
      type: pType,
      minPrice: pMinPrice,
      maxPrice: pMaxPrice,
      rooms: pRooms,
      minArea: pMinArea,
      maxArea: pMaxArea,
      condition: pCondition,
      apartment_type: pApartmentType,
      floor: pFloor,
      features: pFeatures,
      agentId: pAgentId,
    })
  }, [searchParams])

  // Sync to URL
  const updateUrlParams = useCallback(
    (newFilters: FilterState, newSort: SortOption) => {
      if (typeof window === 'undefined') return
      const params = new URLSearchParams()

      if (newFilters.search.trim()) params.set('search', newFilters.search.trim())
      if (newFilters.city) params.set('city', newFilters.city)
      if (newFilters.neighborhood) params.set('neighborhood', newFilters.neighborhood)
      if (newFilters.type) params.set('type', newFilters.type)
      if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice)
      if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice)
      if (newFilters.rooms) params.set('rooms', newFilters.rooms)
      if (newFilters.minArea) params.set('minArea', newFilters.minArea)
      if (newFilters.maxArea) params.set('maxArea', newFilters.maxArea)
      if (newFilters.condition) params.set('condition', newFilters.condition)
      if (newFilters.apartment_type) params.set('apartment_type', newFilters.apartment_type)
      if (newFilters.floor) params.set('floor', newFilters.floor)
      if (newFilters.features.length > 0) params.set('features', newFilters.features.join(','))
      if (newFilters.agentId) params.set('agentId', newFilters.agentId)
      if (newSort !== 'newest') params.set('sort', newSort)

      const qs = params.toString()
      lastAppliedSearchRef.current = qs
      const newUrl = qs ? `/listings?${qs}` : '/listings'
      window.history.replaceState(null, '', newUrl)
    },
    []
  )

  // Click outside handling
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (cityRef.current && !cityRef.current.contains(target)) setCityOpen(false)
      if (neighborhoodRef.current && !neighborhoodRef.current.contains(target)) setNeighborhoodOpen(false)
      if (priceRef.current && !priceRef.current.contains(target)) setPriceOpen(false)
      if (sortRef.current && !sortRef.current.contains(target)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoreFiltersModalOpen(false)
        setCityOpen(false)
        setNeighborhoodOpen(false)
        setPriceOpen(false)
        setSortOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Query Supabase
  const fetchListings = useCallback(
    async (pageNum = 0) => {
      if (pageNum === 0) setPage(0)
      setFetchState(prev => ({
        ...prev,
        loading: true,
        hasMore: pageNum === 0 ? true : prev.hasMore,
      }))
      setLoadError(false)

      let listingQuery = supabase
        .from('listings')
        .select(
          'id,title,price,city,neighborhood,address,type,images,rooms,area_m2,is_featured,is_active,created_at,user_id,condition,floor,apartment_type,features'
        )
        .eq('is_active', true)

      if (filters.city) {
        listingQuery = listingQuery.eq('city', filters.city)
      }
      if (filters.neighborhood) {
        listingQuery = listingQuery.ilike('neighborhood', `%${filters.neighborhood}%`)
      }
      if (filters.type) {
        listingQuery = listingQuery.eq('type', filters.type)
      }
      if (filters.minPrice && !isNaN(Number(filters.minPrice))) {
        listingQuery = listingQuery.gte('price', Number(filters.minPrice))
      }
      if (filters.maxPrice && !isNaN(Number(filters.maxPrice))) {
        listingQuery = listingQuery.lte('price', Number(filters.maxPrice))
      }
      if (filters.rooms && !isNaN(Number(filters.rooms))) {
        listingQuery = listingQuery.gte('rooms', Number(filters.rooms))
      }
      if (filters.minArea && !isNaN(Number(filters.minArea))) {
        listingQuery = listingQuery.gte('area_m2', Number(filters.minArea))
      }
      if (filters.maxArea && !isNaN(Number(filters.maxArea))) {
        listingQuery = listingQuery.lte('area_m2', Number(filters.maxArea))
      }
      if (filters.condition) {
        listingQuery = listingQuery.eq('condition', filters.condition)
      }
      if (filters.apartment_type) {
        listingQuery = listingQuery.eq('apartment_type', filters.apartment_type)
      }
      if (filters.floor) {
        listingQuery = listingQuery.eq('floor', filters.floor)
      }
      if (filters.features.length > 0) {
        listingQuery = listingQuery.contains('features', filters.features)
      }
      if (filters.agentId) {
        listingQuery = listingQuery.eq('user_id', filters.agentId)
      }

      // Keyword Search Sanitization
      const rawSearch = filters.search.trim()
      if (rawSearch) {
        const sanitized = rawSearch
          .replace(/[,()]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        if (sanitized) {
          listingQuery = listingQuery.or(
            `title.ilike.%${sanitized}%,address.ilike.%${sanitized}%,city.ilike.%${sanitized}%,neighborhood.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
          )
        }
      }

      // Sorting
      if (sortBy === 'price_asc') {
        listingQuery = listingQuery.order('price', { ascending: true })
      } else if (sortBy === 'price_desc') {
        listingQuery = listingQuery.order('price', { ascending: false })
      } else if (sortBy === 'area_desc') {
        listingQuery = listingQuery.order('area_m2', { ascending: false, nullsFirst: false })
      } else if (sortBy === 'area_asc') {
        listingQuery = listingQuery.order('area_m2', { ascending: true, nullsFirst: false })
      } else {
        listingQuery = listingQuery.order('created_at', { ascending: false })
      }

      listingQuery = listingQuery.range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

      try {
        const [
          { data: listingData, error: listingError },
          { data: profileData, error: profileError },
        ] = await Promise.all([
          listingQuery,
          rawSearch && pageNum === 0 && !filters.agentId
            ? (() => {
                const words = rawSearch.split(/\s+/).filter(Boolean)
                let profileQuery = supabase
                  .from('profiles_public')
                  .select('id,first_name,last_name,avatar_url,email_verified,created_at')

                if (words.length > 1) {
                  const [first, ...restWords] = words
                  const rest = restWords.join(' ')
                  profileQuery = profileQuery.or(
                    `first_name.ilike.%${rawSearch}%,last_name.ilike.%${rawSearch}%,and(first_name.ilike.%${first}%,last_name.ilike.%${rest}%),and(first_name.ilike.%${rest}%,last_name.ilike.%${first}%)`
                  )
                } else {
                  profileQuery = profileQuery.or(
                    `first_name.ilike.%${rawSearch}%,last_name.ilike.%${rawSearch}%`
                  )
                }
                return profileQuery.limit(8)
              })()
            : Promise.resolve({ data: [], error: null }),
        ])

        if (listingError) throw listingError

        const listingResults = (listingData || []) as unknown as Listing[]
        const agentResultsData = (profileData || []) as unknown as AgentResult[]

        if (profileError) {
          console.error('Agent search error:', profileError)
        }

        if (pageNum === 0) {
          setListings(listingResults)
          if (agentResultsData.length > 0) {
            setAgentMap(prev => {
              const next = { ...prev }
              agentResultsData.forEach(agent => {
                next[agent.id] = agent
              })
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

        setFetchState({
          loading: false,
          hasMore: listingResults.length === PAGE_SIZE,
        })
      } catch (err) {
        console.error('Fetch listings error:', err)
        setLoadError(true)
        setFetchState({ loading: false, hasMore: false })
      }
    },
    [filters, sortBy, supabase]
  )

  useEffect(() => {
    fetchListings(0)
    updateUrlParams(filters, sortBy)
  }, [fetchListings, filters, sortBy, updateUrlParams])

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

  const handleSearchChange = (val: string) => {
    setSearchInput(val)
    clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: val }))
    }, 350)
  }

  const clearSearch = () => {
    setSearchInput('')
    setFilters(prev => ({ ...prev, search: '' }))
  }

  const clearAllFilters = () => {
    setSearchInput('')
    setFilters({
      search: '',
      city: '',
      neighborhood: '',
      type: '',
      minPrice: '',
      maxPrice: '',
      rooms: '',
      minArea: '',
      maxArea: '',
      condition: '',
      apartment_type: '',
      floor: '',
      features: [],
      agentId: '',
    })
    setSortBy('newest')
  }

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.city) count++
    if (filters.neighborhood) count++
    if (filters.type) count++
    if (filters.minPrice || filters.maxPrice) count++
    if (filters.rooms) count++
    if (filters.minArea || filters.maxArea) count++
    if (filters.condition) count++
    if (filters.apartment_type) count++
    if (filters.floor) count++
    if (filters.features.length > 0) count += filters.features.length
    if (filters.agentId) count++
    return count
  }, [filters])

  const advancedFiltersCount = useMemo(() => {
    let count = 0
    if (filters.minArea || filters.maxArea) count++
    if (filters.condition) count++
    if (filters.apartment_type) count++
    if (filters.floor) count++
    if (filters.features.length > 0) count += filters.features.length
    return count
  }, [filters])

  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) return ALL_CITIES
    const q = citySearchQuery.toLowerCase()
    return ALL_CITIES.filter(c => c.toLowerCase().includes(q))
  }, [citySearchQuery])

  const availableNeighborhoods = useMemo(() => {
    if (!filters.city || !KOSOVO_LOCATIONS[filters.city]) return []
    const list = KOSOVO_LOCATIONS[filters.city]
    if (!neighborhoodSearchQuery.trim()) return list
    const q = neighborhoodSearchQuery.toLowerCase()
    return list.filter(n => n.toLowerCase().includes(q))
  }, [filters.city, neighborhoodSearchQuery])

  const selectedAgent = filters.agentId ? agentMap[filters.agentId] ?? null : null

  const openMoreFilters = () => {
    setTempModalFilters({
      minArea: filters.minArea,
      maxArea: filters.maxArea,
      condition: filters.condition,
      apartment_type: filters.apartment_type,
      floor: filters.floor,
      features: [...filters.features],
    })
    setMoreFiltersModalOpen(true)
  }

  const applyMoreFilters = () => {
    setFilters(prev => ({
      ...prev,
      ...tempModalFilters,
    }))
    setMoreFiltersModalOpen(false)
  }

  const resetMoreFilters = () => {
    setTempModalFilters({
      minArea: '',
      maxArea: '',
      condition: '',
      apartment_type: '',
      floor: '',
      features: [],
    })
  }

  return (
    <div className="min-h-screen bg-[#F2F7F7] pb-24">
      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-20 sm:pt-22">
        {/* Compact Header Row: Title + count badge on left, Segmented Type pills on right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#101828]">
              {filters.city ? `Prona në ${filters.city}` : 'Pronat në Kosovë'}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white border border-gray-200 text-gray-700 shadow-2xs">
              {listings.length} {listings.length === 1 ? 'pronë' : 'prona'}
            </span>
          </div>

          {/* Clean Segmented Intent Toggle */}
          <div className="inline-flex p-0.5 rounded-xl bg-white border border-gray-200/90 shadow-2xs self-start sm:self-auto">
            {[
              { key: '', label: 'Të gjitha' },
              { key: 'shitje', label: 'Shitje' },
              { key: 'qira', label: 'Me qira' },
            ].map(tab => {
              const isActive = filters.type === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, type: tab.key as FilterState['type'] }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#006459] text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Clean, Compact Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-2 sm:p-2.5 mb-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-center">
            {/* 1. Search Bar */}
            <div className="sm:col-span-2 lg:col-span-4 xl:col-span-5 relative flex items-center rounded-xl bg-gray-50 border border-gray-200 focus-within:border-[#006459] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#006459]/15 transition-all">
              <Search className="h-4 w-4 text-gray-400 ml-3 flex-shrink-0" />
              <input
                type="text"
                placeholder="Kërko me lagje, rrugë, qytet..."
                value={searchInput}
                onChange={e => handleSearchChange(e.target.value)}
                className="w-full h-9 pl-2.5 pr-8 text-xs sm:text-sm text-[#101828] placeholder:text-gray-400 bg-transparent outline-none font-medium"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Pastro kërkimin"
                  className="absolute right-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* 2. City Dropdown */}
            <div className="lg:col-span-2 relative" ref={cityRef}>
              <button
                type="button"
                onClick={() => {
                  setCityOpen(!cityOpen)
                  setNeighborhoodOpen(false)
                  setPriceOpen(false)
                }}
                className={`w-full h-9 px-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  filters.city
                    ? 'border-[#006459] bg-[#006459]/5 text-[#006459]'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                  <span className="truncate">{filters.city || 'Qyteti'}</span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${cityOpen ? 'rotate-180' : ''}`} />
              </button>

              {cityOpen && (
                <div className="absolute top-full left-0 right-0 sm:w-64 mt-1.5 bg-white rounded-2xl border border-gray-200 shadow-lg z-50 p-2 max-h-72 flex flex-col">
                  <div className="p-1 border-b border-gray-100 mb-1">
                    <input
                      type="text"
                      placeholder="Filtro qytetin..."
                      value={citySearchQuery}
                      onChange={e => setCitySearchQuery(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 outline-none text-[#101828]"
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters(p => ({ ...p, city: '', neighborhood: '' }))
                        setCityOpen(false)
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                        !filters.city ? 'bg-[#006459] text-white' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      Të gjitha qytetet
                    </button>
                    {filteredCities.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setFilters(p => ({ ...p, city: c, neighborhood: '' }))
                          setCityOpen(false)
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                          filters.city === c ? 'bg-[#006459] text-white' : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span>{c}</span>
                        {filters.city === c && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Neighborhood Dropdown */}
            <div className="lg:col-span-2 relative" ref={neighborhoodRef}>
              <button
                type="button"
                disabled={!filters.city}
                onClick={() => {
                  setNeighborhoodOpen(!neighborhoodOpen)
                  setCityOpen(false)
                  setPriceOpen(false)
                }}
                className={`w-full h-9 px-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  !filters.city
                    ? 'border-gray-200 bg-gray-100/50 text-gray-400 cursor-not-allowed'
                    : filters.neighborhood
                    ? 'border-[#006459] bg-[#006459]/5 text-[#006459]'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                  <span className="truncate">
                    {filters.neighborhood || (filters.city ? 'Lagjja' : 'Zgjidh qytet')}
                  </span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${neighborhoodOpen ? 'rotate-180' : ''}`} />
              </button>

              {neighborhoodOpen && filters.city && (
                <div className="absolute top-full left-0 right-0 sm:w-64 mt-1.5 bg-white rounded-2xl border border-gray-200 shadow-lg z-50 p-2 max-h-72 flex flex-col">
                  <div className="p-1 border-b border-gray-100 mb-1">
                    <input
                      type="text"
                      placeholder="Kërko lagjen..."
                      value={neighborhoodSearchQuery}
                      onChange={e => setNeighborhoodSearchQuery(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 outline-none text-[#101828]"
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters(p => ({ ...p, neighborhood: '' }))
                        setNeighborhoodOpen(false)
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                        !filters.neighborhood ? 'bg-[#006459] text-white' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      Të gjitha lagjet
                    </button>
                    {availableNeighborhoods.map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setFilters(p => ({ ...p, neighborhood: n }))
                          setNeighborhoodOpen(false)
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                          filters.neighborhood === n ? 'bg-[#006459] text-white' : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span>{n}</span>
                        {filters.neighborhood === n && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Price Popover */}
            <div className="lg:col-span-2 relative" ref={priceRef}>
              <button
                type="button"
                onClick={() => {
                  setPriceOpen(!priceOpen)
                  setCityOpen(false)
                  setNeighborhoodOpen(false)
                }}
                className={`w-full h-9 px-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  filters.minPrice || filters.maxPrice
                    ? 'border-[#006459] bg-[#006459]/5 text-[#006459]'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-gray-500 font-semibold">€</span>
                  <span className="truncate">
                    {filters.minPrice && filters.maxPrice
                      ? `${filters.minPrice} - ${filters.maxPrice} €`
                      : filters.minPrice
                      ? `Nga ${filters.minPrice} €`
                      : filters.maxPrice
                      ? `Deri ${filters.maxPrice} €`
                      : 'Çmimi'}
                  </span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${priceOpen ? 'rotate-180' : ''}`} />
              </button>

              {priceOpen && (
                <div className="absolute top-full right-0 sm:right-auto sm:left-0 w-80 mt-1.5 bg-white rounded-2xl border border-gray-200 shadow-lg z-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
                    Gama e Çmimit (€)
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 mb-3.5">
                    {(filters.type === 'qira' ? PRICE_PRESETS_RENT : PRICE_PRESETS_SALE).map(p => {
                      const isMatching = filters.minPrice === p.min && filters.maxPrice === p.max
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setFilters(prev => ({ ...prev, minPrice: p.min, maxPrice: p.max }))}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                            isMatching
                              ? 'bg-[#006459] text-white border-[#006459]'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 block mb-1">Min (€)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={filters.minPrice}
                        onChange={e => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                        className="w-full h-9 px-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-[#101828] outline-none focus:border-[#006459]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 block mb-1">Max (€)</label>
                      <input
                        type="number"
                        placeholder="200,000"
                        value={filters.maxPrice}
                        onChange={e => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                        className="w-full h-9 px-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-[#101828] outline-none focus:border-[#006459]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setFilters(prev => ({ ...prev, minPrice: '', maxPrice: '' }))}
                      className="text-xs text-gray-500 hover:text-red-600 font-semibold cursor-pointer"
                    >
                      Pastro
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriceOpen(false)}
                      className="px-3.5 py-1 rounded-lg bg-[#006459] text-white text-xs font-semibold hover:bg-[#005048] cursor-pointer"
                    >
                      Mbyll
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. More Filters Button */}
            <div className="lg:col-span-2 xl:col-span-1">
              <button
                type="button"
                onClick={openMoreFilters}
                className={`w-full h-9 px-2.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  advancedFiltersCount > 0
                    ? 'bg-[#006459] text-white border-[#006459]'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filtra</span>
                {advancedFiltersCount > 0 && (
                  <span className="h-4 min-w-[16px] px-1 rounded-full bg-[#C8B882] text-[#101828] text-[10px] font-bold flex items-center justify-center">
                    {advancedFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* City Pills Track + Sort */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide flex-1">
            <button
              type="button"
              onClick={() => setFilters(prev => ({ ...prev, city: '', neighborhood: '' }))}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                !filters.city
                  ? 'bg-[#006459] text-white border-[#006459]'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
              }`}
            >
              Të gjitha qytetet
            </button>

            {POPULAR_CITIES.map(city => {
              const isSelected = filters.city === city
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() =>
                    setFilters(prev => ({
                      ...prev,
                      city: isSelected ? '' : city,
                      neighborhood: '',
                    }))
                  }
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-[#006459] text-white border-[#006459]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {city}
                </button>
              )
            })}
          </div>

          {/* Sort Dropdown */}
          <div className="relative shrink-0" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              className="h-8 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ArrowUpDown className="h-3 w-3 text-gray-400" />
              <span className="hidden sm:inline">
                {sortBy === 'newest'
                  ? 'Më të rejat'
                  : sortBy === 'price_asc'
                  ? 'Çmimi më i ulët'
                  : sortBy === 'price_desc'
                  ? 'Çmimi më i lartë'
                  : sortBy === 'area_desc'
                  ? 'Sipërfaqja më e madhe'
                  : 'Sipërfaqja më e vogël'}
              </span>
              <span className="sm:hidden">Radhit</span>
              <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>

            {sortOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 p-1 min-w-[180px]">
                {[
                  { key: 'newest', label: 'Më të rejat' },
                  { key: 'price_asc', label: 'Çmimi: më i ulët' },
                  { key: 'price_desc', label: 'Çmimi: më i lartë' },
                  { key: 'area_desc', label: 'Sipërfaqja: më e madhe' },
                  { key: 'area_asc', label: 'Sipërfaqja: më e vogël' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setSortBy(opt.key as SortOption)
                      setSortOpen(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                      sortBy === opt.key ? 'bg-[#006459] text-white' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sortBy === opt.key && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className="text-xs font-semibold text-gray-500 mr-1">Filtrat:</span>

            {filters.search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700 font-medium">
                &ldquo;{filters.search}&rdquo;
                <button type="button" onClick={clearSearch} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {filters.city && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700 font-medium">
                {filters.city}
                <button type="button" onClick={() => setFilters(p => ({ ...p, city: '', neighborhood: '' }))} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {filters.neighborhood && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700 font-medium">
                {filters.neighborhood}
                <button type="button" onClick={() => setFilters(p => ({ ...p, neighborhood: '' }))} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {filters.type && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700 font-medium">
                {filters.type === 'shitje' ? 'Shitje' : 'Me qira'}
                <button type="button" onClick={() => setFilters(p => ({ ...p, type: '' }))} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {(filters.minPrice || filters.maxPrice) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700 font-medium">
                {filters.minPrice ? `nga ${filters.minPrice} €` : ''} {filters.maxPrice ? `deri ${filters.maxPrice} €` : ''}
                <button type="button" onClick={() => setFilters(p => ({ ...p, minPrice: '', maxPrice: '' }))} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {filters.rooms && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700 font-medium">
                {filters.rooms}+ dhoma
                <button type="button" onClick={() => setFilters(p => ({ ...p, rooms: '' }))} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {filters.apartment_type && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700 font-medium">
                {filters.apartment_type}
                <button type="button" onClick={() => setFilters(p => ({ ...p, apartment_type: '' }))} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {filters.condition && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700 font-medium">
                {CONDITIONS.find(c => c.value === filters.condition)?.label || filters.condition}
                <button type="button" onClick={() => setFilters(p => ({ ...p, condition: '' }))} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {(filters.minArea || filters.maxArea) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700 font-medium">
                {filters.minArea ? `${filters.minArea}` : '0'} - {filters.maxArea ? `${filters.maxArea}` : '∞'} m²
                <button type="button" onClick={() => setFilters(p => ({ ...p, minArea: '', maxArea: '' }))} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {filters.features.map(f => (
              <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700 font-medium">
                {f}
                <button
                  type="button"
                  onClick={() => setFilters(p => ({ ...p, features: p.features.filter(feat => feat !== f) }))}
                  className="text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-semibold text-[#006459] hover:underline cursor-pointer ml-1.5"
            >
              Pastro të gjitha
            </button>
          </div>
        )}

        {/* Selected Agent Banner */}
        {!fetchState.loading && filters.agentId && selectedAgent && (
          <div className="mb-3 bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center font-bold text-sm text-[#006459]">
                {selectedAgent.avatar_url ? (
                  <Image src={selectedAgent.avatar_url} alt="" width={40} height={40} className="w-full h-full object-cover" />
                ) : (
                  (selectedAgent.first_name?.[0] || '?').toUpperCase()
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#101828]">
                  Pronat nga {selectedAgent.first_name} {selectedAgent.last_name}
                </h3>
                {selectedAgent.email_verified && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5">
                    <CheckCircle2 className="h-3 w-3" /> E verifikuar
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFilters(p => ({ ...p, agentId: '' }))}
              className="text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
            >
              Hiq filtrin
            </button>
          </div>
        )}

        {/* =========================================================================
            LISTINGS GRID
            ========================================================================= */}
        {fetchState.loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {Array.from({ length: 8 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-base font-bold text-[#101828] mb-1">
              Shërbimi është përkohësisht i padisponueshëm
            </h3>
            <p className="text-gray-500 text-xs mb-4">
              Ndodhi një gabim gjatë ngarkimit të pronave. Ju lutemi provoni përsëri.
            </p>
            <button
              type="button"
              onClick={() => fetchListings(0)}
              className="px-4 py-2 rounded-xl bg-[#006459] text-white text-xs font-semibold hover:bg-[#005048] cursor-pointer"
            >
              Provo përsëri
            </button>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8 max-w-lg mx-auto">
            <h3 className="text-lg font-bold text-[#101828] mb-1">
              Nuk u gjet asnjë pronë
            </h3>
            <p className="text-gray-500 text-xs mb-5">
              Provoni të ndryshoni filtrat ose kërkoni në një qytet tjetër.
            </p>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-2 rounded-xl bg-[#006459] text-white text-xs font-semibold hover:bg-[#005048] cursor-pointer"
              >
                Pastro filtrat
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
              {listings.map((listing, index) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  priority={index < 4}
                  isFavorited={favoriteIds.includes(listing.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>

            {fetchState.hasMore && !fetchState.loading && listings.length > 0 && (
              <div className="text-center mt-10">
                <button
                  type="button"
                  onClick={() => {
                    const nextPage = page + 1
                    setPage(nextPage)
                    fetchListings(nextPage)
                  }}
                  className="px-6 py-2.5 rounded-full bg-white border border-gray-200 hover:border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Ngarko më shumë
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* =========================================================================
          MORE FILTERS MODAL (Clean & functional)
          ========================================================================= */}
      {moreFiltersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#101828]">Filtra të tjerë</h3>
              <button
                type="button"
                onClick={() => setMoreFiltersModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Tipologjia */}
              <div>
                <label className="font-semibold text-gray-700 block mb-2">Tipologjia</label>
                <div className="flex flex-wrap gap-1.5">
                  {APARTMENT_TYPES.map(type => {
                    const isSelected = tempModalFilters.apartment_type === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setTempModalFilters(p => ({
                            ...p,
                            apartment_type: isSelected ? '' : type,
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg border cursor-pointer font-medium ${
                          isSelected
                            ? 'bg-[#006459] text-white border-[#006459]'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {type}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Gjendja */}
              <div>
                <label className="font-semibold text-gray-700 block mb-2">Gjendja</label>
                <div className="flex flex-wrap gap-1.5">
                  {CONDITIONS.map(c => {
                    const isSelected = tempModalFilters.condition === c.value
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() =>
                          setTempModalFilters(p => ({
                            ...p,
                            condition: isSelected ? '' : c.value,
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg border cursor-pointer font-medium ${
                          isSelected
                            ? 'bg-[#006459] text-white border-[#006459]'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sipërfaqja */}
              <div>
                <label className="font-semibold text-gray-700 block mb-2">Sipërfaqja (m²)</label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {AREA_PRESETS.map(preset => {
                    const isMatch =
                      tempModalFilters.minArea === preset.min &&
                      tempModalFilters.maxArea === preset.max
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setTempModalFilters(p => ({
                            ...p,
                            minArea: preset.min,
                            maxArea: preset.max,
                          }))
                        }
                        className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                          isMatch
                            ? 'bg-[#006459] text-white border-[#006459]'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min m²"
                    value={tempModalFilters.minArea}
                    onChange={e => setTempModalFilters(p => ({ ...p, minArea: e.target.value }))}
                    className="w-full h-9 px-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#006459]"
                  />
                  <input
                    type="number"
                    placeholder="Max m²"
                    value={tempModalFilters.maxArea}
                    onChange={e => setTempModalFilters(p => ({ ...p, maxArea: e.target.value }))}
                    className="w-full h-9 px-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#006459]"
                  />
                </div>
              </div>

              {/* Kati */}
              <div>
                <label className="font-semibold text-gray-700 block mb-2">Kati</label>
                <div className="flex flex-wrap gap-1.5">
                  {FLOORS.map(fl => {
                    const isSelected = tempModalFilters.floor === fl
                    return (
                      <button
                        key={fl}
                        type="button"
                        onClick={() =>
                          setTempModalFilters(p => ({
                            ...p,
                            floor: isSelected ? '' : fl,
                          }))
                        }
                        className={`w-8 h-8 rounded-lg border cursor-pointer font-semibold flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#006459] text-white border-[#006459]'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {fl}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Karakteristikat */}
              <div>
                <label className="font-semibold text-gray-700 block mb-2">Karakteristikat</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {FEATURES_LIST.map(f => {
                    const isSelected = tempModalFilters.features.includes(f.id)
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() =>
                          setTempModalFilters(p => ({
                            ...p,
                            features: isSelected
                              ? p.features.filter(feat => feat !== f.id)
                              : [...p.features, f.id],
                          }))
                        }
                        className={`px-3 py-2 rounded-lg border text-left cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#006459]/5 border-[#006459] text-[#006459] font-semibold'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span>{f.label}</span>
                        {isSelected && <Check className="h-3 w-3 text-[#006459]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <button
                type="button"
                onClick={resetMoreFilters}
                className="text-xs text-gray-500 hover:text-red-600 font-semibold cursor-pointer"
              >
                Pastro
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMoreFiltersModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Anulo
                </button>
                <button
                  type="button"
                  onClick={applyMoreFilters}
                  className="px-4 py-1.5 rounded-lg bg-[#006459] text-white text-xs font-semibold hover:bg-[#005048] cursor-pointer"
                >
                  Zbato filtrat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ListingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F2F7F7] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#006459]" />
        </div>
      }
    >
      <ListingsContent />
    </Suspense>
  )
}
