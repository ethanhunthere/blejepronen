import { CATEGORIES } from './categories'
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
import type { ListingsQueryParams, ListingsSort } from './listings-query'

/**
 * Filter/sort UI vocabulary for the mobile catalog.
 *
 * This module owns *presentation state* only. Every value it holds is converted
 * to the shared `ListingsQueryParams` shape by `toListingsQueryParams` and then
 * applied to the Supabase query by `applyListingsFilters`
 * (see `lib/listings-query.ts`, a mirror of the canonical web module). There is
 * deliberately no client-side filtering or sorting of listing results here —
 * mobile and web must not be able to drift.
 */

export const CATEGORY_ITEMS = [
  { id: 'all', label: 'Të gjitha', icon: LayoutGrid },
  { id: 'banese', label: 'Banesa', icon: Building2 },
  { id: 'shtepi', label: 'Shtëpi', icon: Home },
  { id: 'vile', label: 'Vila', icon: Home },
  { id: 'toke', label: 'Toka', icon: Trees },
  { id: 'lokal', label: 'Lokale', icon: Briefcase },
  { id: 'garazh', label: 'Garazha', icon: Warehouse },
]

/** Room chips are "N+" — the query applies `rooms >= N`, matching the web. */
export const ROOM_OPTIONS = [
  { id: 'all', label: 'Të gjitha' },
  { id: '1', label: '1+' },
  { id: '2', label: '2+' },
  { id: '3', label: '3+' },
  { id: '4', label: '4+' },
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

// Derived from the writer vocabulary (lib/categories.ts) so every chip can
// actually match a stored listing — hand-maintained lists had drifted.
const conditionUnion = (() => {
  const seen = new Map<string, string>()
  for (const cat of Object.values(CATEGORIES)) {
    for (const c of cat.conditions) {
      if (!seen.has(c.value)) seen.set(c.value, c.label)
    }
  }
  const list: { id: string; label: string }[] = [{ id: 'all', label: 'Të gjitha' }]
  for (const [id, label] of seen.entries()) list.push({ id, label })
  return list
})()

export const CONDITION_OPTIONS = conditionUnion

const featureUnion = (() => {
  const seen = new Set<string>()
  for (const cat of Object.values(CATEGORIES)) {
    for (const f of cat.features) seen.add(f)
  }
  return [...seen]
})()

export const FEATURES_LIST = featureUnion

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

/** Same union as the web `ListingsSort` — the sort sheet drives query params. */
export type SortType = ListingsSort

// Compile-time guard: the sheet may only offer sorts the server understands.
const _sortOptionIds: readonly SortType[] = SORT_OPTIONS.map((o) => o.id)
void _sortOptionIds

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

/**
 * Number of *modal* filters in play. Category chips and the search field are
 * intentionally excluded: the modal's reset keeps them, so counting them would
 * leave a badge that "Pastro" can never clear.
 */
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
  if (filters.searchQuery.trim()) count++
  return count
}

function optional(value: string): string | undefined {
  const trimmed = (value || '').trim()
  return trimmed ? trimmed : undefined
}

/**
 * Presentation state → the shared query param shape used by web and mobile.
 * `'all'` sentinels collapse to `undefined` so `applyListingsFilters` skips them,
 * and `'5+'` rooms collapse to `'5'` because the server filter is `rooms >= N`.
 */
export function toListingsQueryParams(filters: PropertyFilterState): ListingsQueryParams {
  const rooms = filters.rooms === 'all' ? undefined : filters.rooms.replace(/[^0-9]/g, '')

  return {
    search: optional(filters.searchQuery),
    city: optional(filters.city),
    neighborhood: optional(filters.neighborhood),
    type: filters.transactionType === 'all' ? '' : filters.transactionType,
    minPrice: optional(filters.minPrice),
    maxPrice: optional(filters.maxPrice),
    rooms: rooms || undefined,
    minArea: optional(filters.minArea),
    maxArea: optional(filters.maxArea),
    condition: filters.condition === 'all' ? undefined : optional(filters.condition),
    floor: filters.floor === 'all' ? undefined : optional(filters.floor),
    features: filters.features.length > 0 ? filters.features : undefined,
    category: filters.category === 'all' ? undefined : filters.category,
    sort: filters.sortBy,
  }
}
