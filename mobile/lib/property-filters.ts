import {
  LayoutGrid,
  Building2,
  Home,
  Trees,
  Briefcase,
  Warehouse,
  Clock,
  TrendingUp,
  TrendingDown,
  Maximize2,
  Minimize2,
} from 'lucide-react-native'
import { Listing } from './supabase'
import { KOSOVO_LOCATIONS } from './kosovo-locations'

export const ALL_CITIES = Object.keys(KOSOVO_LOCATIONS)
export const POPULAR_CITIES = [
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

export const CATEGORY_ITEMS = [
  { id: 'all', label: 'Të gjitha', icon: LayoutGrid },
  { id: 'banese', label: 'Banesa', icon: Building2 },
  { id: 'shtepi', label: 'Shtëpi', icon: Home },
  { id: 'vile', label: 'Vila', icon: Home },
  { id: 'toke', label: 'Toka', icon: Trees },
  { id: 'lokal', label: 'Lokale', icon: Briefcase },
  { id: 'garazh', label: 'Garazha', icon: Warehouse },
]

export const ROOM_OPTIONS = [
  { id: 'all', label: 'Të gjitha' },
  { id: '1', label: '1' },
  { id: '2', label: '2' },
  { id: '3', label: '3' },
  { id: '4', label: '4' },
  { id: '5+', label: '5+' },
]

export const FLOOR_OPTIONS = [
  { id: 'all', label: 'Të gjitha' },
  { id: 'Bodrum', label: 'Bodrum' },
  { id: 'P/D', label: 'Përdhese' },
  { id: '1', label: 'Kati 1' },
  { id: '2', label: 'Kati 2' },
  { id: '3', label: 'Kati 3' },
  { id: '4', label: 'Kati 4' },
  { id: '5', label: 'Kati 5' },
  { id: '6', label: 'Kati 6' },
  { id: '7+', label: 'Kati 7+' },
]

export const CONDITION_OPTIONS = [
  { id: 'all', label: 'Të gjitha' },
  { id: 'e-re', label: 'E re' },
  { id: 'rinovuar', label: 'E rinovuar' },
  { id: 'e-vjeter', label: 'E vjetër' },
  { id: 'ka-nevojë-për-rinovim', label: 'Për rinovim' },
]

export const FEATURES_LIST = [
  'Parking',
  'Ashensor',
  'Ballkon',
  'Ngrohje qendrore',
  'Klimë',
  'Mobiluar',
  'Siguri 24h',
  'Pamje panoramike',
  'Kopësht',
  'Bodrum',
]

export const PRICE_PRESETS_SALE = [
  { label: '< 50k €', min: '', max: '50000' },
  { label: '50k – 100k €', min: '50000', max: '100000' },
  { label: '100k – 150k €', min: '100000', max: '150000' },
  { label: '150k – 250k €', min: '150000', max: '250000' },
  { label: '> 250k €', min: '250000', max: '' },
]

export const PRICE_PRESETS_RENT = [
  { label: '< 250 €', min: '', max: '250' },
  { label: '250 – 400 €', min: '250', max: '400' },
  { label: '400 – 600 €', min: '400', max: '600' },
  { label: '600 – 1,000 €', min: '600', max: '1000' },
  { label: '> 1,000 €', min: '1000', max: '' },
]

export const AREA_PRESETS = [
  { label: '< 50 m²', min: '', max: '50' },
  { label: '50 – 80 m²', min: '50', max: '80' },
  { label: '80 – 120 m²', min: '80', max: '120' },
  { label: '120 – 200 m²', min: '120', max: '200' },
  { label: '> 200 m²', min: '200', max: '' },
]

export const SORT_OPTIONS = [
  {
    id: 'newest',
    label: 'Më të rejat së pari',
    shortLabel: 'Më të rejat',
    description: 'Pronat më të fundit të sapo publikuara',
    icon: Clock,
  },
  {
    id: 'price_desc',
    label: 'Çmimi: Nga më i larti',
    shortLabel: 'Çmimi: Më i larti',
    description: 'Prona luksoze, vila dhe investime ekskluzive',
    icon: TrendingUp,
  },
  {
    id: 'price_asc',
    label: 'Çmimi: Nga më i ulëti',
    shortLabel: 'Çmimi: Më i ulëti',
    description: 'Mundësitë më ekonomike dhe ofertat më të mira',
    icon: TrendingDown,
  },
  {
    id: 'area_desc',
    label: 'Sipërfaqja: Nga më e madhja',
    shortLabel: 'Sipërfaqja: Më e madhja',
    description: 'Hapësirat më të bollshme dhe sipërfaqe të mëdha',
    icon: Maximize2,
  },
  {
    id: 'area_asc',
    label: 'Sipërfaqja: Nga më e vogla',
    shortLabel: 'Sipërfaqja: Më e vogla',
    description: 'Studio, garsoniere dhe ambiente kompakte',
    icon: Minimize2,
  },
] as const

export type SortType = (typeof SORT_OPTIONS)[number]['id']

export interface PropertyFilterState {
  transactionType: 'all' | 'shitje' | 'qira'
  category: string
  city: string
  neighborhood: string
  minPrice: string
  maxPrice: string
  minArea: string
  maxArea: string
  rooms: string
  floor: string
  condition: string
  features: string[]
  sortBy: SortType
  searchQuery: string
}

export const DEFAULT_FILTER_STATE: PropertyFilterState = {
  transactionType: 'all',
  category: 'all',
  city: '',
  neighborhood: '',
  minPrice: '',
  maxPrice: '',
  minArea: '',
  maxArea: '',
  rooms: 'all',
  floor: 'all',
  condition: 'all',
  features: [],
  sortBy: 'newest',
  searchQuery: '',
}

export function countActiveFilters(filters: PropertyFilterState): number {
  let count = 0
  if (filters.city) count++
  if (filters.neighborhood) count++
  if (filters.minPrice || filters.maxPrice) count++
  if (filters.minArea || filters.maxArea) count++
  if (filters.rooms !== 'all') count++
  if (filters.floor !== 'all') count++
  if (filters.condition !== 'all') count++
  if (filters.features.length > 0) count += filters.features.length
  if (filters.sortBy !== 'newest') count++
  return count
}

export function matchesCategory(item: Listing, catId: string): boolean {
  if (!catId || catId === 'all') return true
  const apt = (item.apartment_type || '').toLowerCase()
  const title = (item.title || '').toLowerCase()
  const desc = (item.description || '').toLowerCase()

  switch (catId) {
    case 'banese':
      return (
        apt.includes('banes') ||
        apt.includes('apart') ||
        apt.includes('1+1') ||
        apt.includes('2+1') ||
        apt.includes('3+1') ||
        apt.includes('4+1') ||
        apt.includes('garson') ||
        apt.includes('studio') ||
        apt.includes('duplex') ||
        apt.includes('penthouse') ||
        title.includes('banes') ||
        title.includes('apartament') ||
        title.includes('1+1') ||
        title.includes('2+1') ||
        title.includes('3+1') ||
        title.includes('4+1') ||
        title.includes('garson') ||
        title.includes('studio') ||
        title.includes('duplex') ||
        title.includes('penthouse') ||
        desc.includes('banes') ||
        desc.includes('apartament')
      )
    case 'shtepi':
      return (
        apt.includes('shtëpi') ||
        apt.includes('shtepi') ||
        title.includes('shtëpi') ||
        title.includes('shtepi') ||
        desc.includes('shtëpi') ||
        desc.includes('shtepi')
      )
    case 'vile':
      return apt.includes('vil') || title.includes('vil') || desc.includes('vil')
    case 'toke':
      return (
        apt.includes('tok') ||
        apt.includes('truall') ||
        title.includes('tok') ||
        title.includes('truall') ||
        desc.includes('tokë') ||
        desc.includes('toke') ||
        desc.includes('truall')
      )
    case 'lokal':
      return (
        apt.includes('lokal') ||
        apt.includes('zyr') ||
        apt.includes('biznes') ||
        apt.includes('depo') ||
        apt.includes('magazin') ||
        apt.includes('afarist') ||
        title.includes('lokal') ||
        title.includes('zyr') ||
        title.includes('biznes') ||
        title.includes('depo') ||
        title.includes('magazin') ||
        title.includes('afarist') ||
        desc.includes('lokal') ||
        desc.includes('zyr')
      )
    case 'garazh':
      return (
        apt.includes('garazh') ||
        apt.includes('park') ||
        title.includes('garazh') ||
        title.includes('park') ||
        desc.includes('garazh') ||
        desc.includes('parkim')
      )
    default:
      return true
  }
}

export function matchesListingFilters(item: Listing, filters: PropertyFilterState): boolean {
  // 1. Transaction Type
  if (filters.transactionType !== 'all' && item.type !== filters.transactionType) {
    return false
  }

  // 2. Category
  if (!matchesCategory(item, filters.category)) {
    return false
  }

  // 3. City
  if (filters.city && (item.city || '').toLowerCase() !== filters.city.toLowerCase()) {
    return false
  }

  // 4. Neighborhood
  if (
    filters.neighborhood &&
    !(item.neighborhood || '').toLowerCase().includes(filters.neighborhood.toLowerCase())
  ) {
    return false
  }

  // 5. Price range
  const price = Number(item.price) || 0
  if (filters.minPrice) {
    const min = parseFloat(filters.minPrice)
    if (!isNaN(min) && price < min) return false
  }
  if (filters.maxPrice) {
    const max = parseFloat(filters.maxPrice)
    if (!isNaN(max) && price > max) return false
  }

  // 6. Area range
  const area = Number(item.area_m2) || 0
  if (filters.minArea) {
    const minA = parseFloat(filters.minArea)
    if (!isNaN(minA) && area < minA) return false
  }
  if (filters.maxArea) {
    const maxA = parseFloat(filters.maxArea)
    if (!isNaN(maxA) && area > maxA) return false
  }

  // 7. Rooms
  if (filters.rooms !== 'all') {
    const itemRooms = (item.rooms || '').toString().trim()
    if (filters.rooms === '5+') {
      const numRooms = parseInt(itemRooms, 10)
      if (isNaN(numRooms) || numRooms < 5) return false
    } else {
      if (itemRooms !== filters.rooms) return false
    }
  }

  // 8. Floor
  if (filters.floor !== 'all') {
    const itemFloor = (item.floor || '').toString().toLowerCase()
    const targetFloor = filters.floor.toLowerCase()
    if (filters.floor === '7+') {
      const numFloor = parseInt(itemFloor, 10)
      if (isNaN(numFloor) || numFloor < 7) return false
    } else {
      if (!itemFloor.includes(targetFloor)) return false
    }
  }

  // 9. Condition
  if (filters.condition !== 'all') {
    const itemCondition = (item.condition || '').toLowerCase()
    if (!itemCondition.includes(filters.condition.toLowerCase())) return false
  }

  // 10. Features
  if (filters.features.length > 0) {
    const itemFeatures = Array.isArray(item.features)
      ? item.features.map((f: string) => f.toLowerCase())
      : []
    const allMatch = filters.features.every((f) =>
      itemFeatures.some((feat: string) => feat.includes(f.toLowerCase()))
    )
    if (!allMatch) return false
  }

  // 11. Search Query
  if (filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase()
    const titleMatch = (item.title || '').toLowerCase().includes(q)
    const cityMatch = (item.city || '').toLowerCase().includes(q)
    const hoodMatch = (item.neighborhood || '').toLowerCase().includes(q)
    const descMatch = (item.description || '').toLowerCase().includes(q)
    const addrMatch = (item.address || '').toLowerCase().includes(q)
    if (!titleMatch && !cityMatch && !hoodMatch && !descMatch && !addrMatch) {
      return false
    }
  }

  return true
}

export function sortListings(items: Listing[], sortBy: SortType): Listing[] {
  const cloned = [...items]
  switch (sortBy) {
    case 'price_desc':
      return cloned.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
    case 'price_asc':
      return cloned.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    case 'area_desc':
      return cloned.sort((a, b) => (Number(b.area_m2) || 0) - (Number(a.area_m2) || 0))
    case 'area_asc':
      return cloned.sort((a, b) => (Number(a.area_m2) || 0) - (Number(b.area_m2) || 0))
    case 'newest':
    default:
      return cloned.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
  }
}

export function filterAndSortListings(
  listings: Listing[],
  filters: PropertyFilterState
): Listing[] {
  const filtered = listings.filter((item) => matchesListingFilters(item, filters))
  return sortListings(filtered, filters.sortBy)
}
