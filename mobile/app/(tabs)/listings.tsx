import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  Search,
  SlidersHorizontal,
  X,
  Check,
  Building2,
  ArrowUpDown,
  RotateCcw,
  MapPin,
  Home,
  Tag,
  Maximize2,
  Minimize2,
  Layers,
  ShieldCheck,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Clock,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase, Listing } from '@/lib/supabase'
import { fetchFavoriteIds, persistFavoriteToggle } from '@/lib/favorites'
import { ListingCard } from '@/components/ListingCard'
import { ListingFeedSkeleton } from '@/components/ListingSkeleton'
import { KOSOVO_LOCATIONS } from '@/lib/kosovo-locations'

const EXPLORE_CACHE_KEY = '@blejepronen_explore_cache_v2'
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

const PROPERTY_TYPES = [
  { id: 'all', label: 'Të gjitha' },
  { id: 'Banesë', label: 'Banesë' },
  { id: 'Shtëpi', label: 'Shtëpi' },
  { id: 'Vilë', label: 'Vilë' },
  { id: 'Tokë', label: 'Tokë / Truall' },
  { id: 'Lokal', label: 'Lokal / Zyrë' },
  { id: 'Garazhë', label: 'Garazhë' },
  { id: 'Studio', label: 'Studio' },
  { id: '1+1', label: '1+1' },
  { id: '2+1', label: '2+1' },
  { id: '3+1', label: '3+1' },
  { id: '4+1', label: '4+1' },
  { id: 'Duplex', label: 'Duplex' },
  { id: 'Penthouse', label: 'Penthouse' },
]

const ROOM_OPTIONS = [
  { id: 'all', label: 'Të gjitha' },
  { id: '1', label: '1' },
  { id: '2', label: '2' },
  { id: '3', label: '3' },
  { id: '4', label: '4' },
  { id: '5+', label: '5+' },
]

const FLOOR_OPTIONS = [
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

const CONDITION_OPTIONS = [
  { id: 'all', label: 'Të gjitha' },
  { id: 'e-re', label: 'E re' },
  { id: 'rinovuar', label: 'E rinovuar' },
  { id: 'e-vjeter', label: 'E vjetër' },
  { id: 'ka-nevojë-për-rinovim', label: 'Për rinovim' },
]

const FEATURES_LIST = [
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

const PRICE_PRESETS_SALE = [
  { label: '< 50k €', min: '', max: '50000' },
  { label: '50k – 100k €', min: '50000', max: '100000' },
  { label: '100k – 150k €', min: '100000', max: '150000' },
  { label: '150k – 250k €', min: '150000', max: '250000' },
  { label: '> 250k €', min: '250000', max: '' },
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

const SORT_OPTIONS = [
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

type SortType = (typeof SORT_OPTIONS)[number]['id']

export default function ListingsScreen() {
  const router = useRouter()
  const { colors, theme } = useTheme()

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Detailed Filter States
  const [selectedType, setSelectedType] = useState<'all' | 'shitje' | 'qira'>('all')
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('')
  const [selectedApartmentType, setSelectedApartmentType] = useState<string>('all')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')
  const [minArea, setMinArea] = useState<string>('')
  const [maxArea, setMaxArea] = useState<string>('')
  const [selectedRooms, setSelectedRooms] = useState<string>('all')
  const [selectedFloor, setSelectedFloor] = useState<string>('all')
  const [selectedCondition, setSelectedCondition] = useState<string>('all')
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortType>('newest')

  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showSortModal, setShowSortModal] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [focusedFilterInput, setFocusedFilterInput] = useState<
    'minPrice' | 'maxPrice' | 'minArea' | 'maxArea' | null
  >(null)
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})

  // Active filters count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (selectedType !== 'all') count++
    if (selectedCity) count++
    if (selectedNeighborhood) count++
    if (selectedApartmentType !== 'all') count++
    if (minPrice || maxPrice) count++
    if (minArea || maxArea) count++
    if (selectedRooms !== 'all') count++
    if (selectedFloor !== 'all') count++
    if (selectedCondition !== 'all') count++
    if (selectedFeatures.length > 0) count += selectedFeatures.length
    if (sortBy !== 'newest') count++
    return count
  }, [
    selectedType,
    selectedCity,
    selectedNeighborhood,
    selectedApartmentType,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    selectedRooms,
    selectedFloor,
    selectedCondition,
    selectedFeatures,
    sortBy,
  ])

  // 1. Instant local-first hydration: render in <5ms from disk cache on cold launch
  useEffect(() => {
    AsyncStorage.getItem(EXPLORE_CACHE_KEY).then((cached) => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setListings(parsed)
            setLoading(false)
          }
        } catch {}
      }
    })
  }, [])

  const fetchListings = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh && listings.length === 0) {
          setLoading(true)
        }
        let query = supabase.from('listings').select('id,title,description,price,city,neighborhood,address,type,images,rooms,area_m2,floor,apartment_type,is_featured,is_active,created_at,user_id,condition,features')

        if (selectedType !== 'all') {
          query = query.eq('type', selectedType)
        }

        if (selectedCity) {
          query = query.eq('city', selectedCity)
        }

        if (selectedNeighborhood) {
          query = query.eq('neighborhood', selectedNeighborhood)
        }

        if (selectedApartmentType && selectedApartmentType !== 'all') {
          if (selectedApartmentType === 'Banesë') {
            query = query.or(
              'apartment_type.ilike.%banes%,apartment_type.ilike.%apart%,apartment_type.ilike.%1+1%,apartment_type.ilike.%2+1%,apartment_type.ilike.%3+1%,apartment_type.ilike.%4+1%,apartment_type.ilike.%duplex%,apartment_type.ilike.%penthouse%,title.ilike.%banes%,title.ilike.%apart%'
            )
          } else if (selectedApartmentType === 'Shtëpi') {
            query = query.or(
              'apartment_type.ilike.%shtëp%,apartment_type.ilike.%shtep%,title.ilike.%shtëp%,title.ilike.%shtep%'
            )
          } else if (selectedApartmentType === 'Vilë') {
            query = query.or(
              'apartment_type.ilike.%vil%,title.ilike.%vil%'
            )
          } else if (selectedApartmentType === 'Tokë') {
            query = query.or(
              'apartment_type.ilike.%tok%,apartment_type.ilike.%truall%,title.ilike.%tok%,title.ilike.%truall%'
            )
          } else if (selectedApartmentType === 'Lokal') {
            query = query.or(
              'apartment_type.ilike.%lokal%,apartment_type.ilike.%zyr%,title.ilike.%lokal%,title.ilike.%zyr%'
            )
          } else if (selectedApartmentType === 'Garazhë') {
            query = query.or(
              'apartment_type.ilike.%garazh%,title.ilike.%garazh%,title.ilike.%park%'
            )
          } else {
            query = query.or(
              `apartment_type.ilike.%${selectedApartmentType}%,title.ilike.%${selectedApartmentType}%`
            )
          }
        }

        if (minPrice && !isNaN(Number(minPrice))) {
          query = query.gte('price', Number(minPrice))
        }

        if (maxPrice && !isNaN(Number(maxPrice))) {
          query = query.lte('price', Number(maxPrice))
        }

        if (minArea && !isNaN(Number(minArea))) {
          query = query.gte('area_m2', Number(minArea))
        }

        if (maxArea && !isNaN(Number(maxArea))) {
          query = query.lte('area_m2', Number(maxArea))
        }

        if (selectedRooms && selectedRooms !== 'all') {
          if (selectedRooms === '5+') {
            query = query.gte('rooms', 5)
          } else {
            query = query.eq('rooms', Number(selectedRooms))
          }
        }

        if (selectedFloor && selectedFloor !== 'all') {
          query = query.eq('floor', selectedFloor)
        }

        if (selectedCondition && selectedCondition !== 'all') {
          query = query.eq('condition', selectedCondition)
        }

        if (selectedFeatures.length > 0) {
          query = query.contains('features', selectedFeatures)
        }

        // Sorting
        if (sortBy === 'price_asc') {
          query = query.order('price', { ascending: true })
        } else if (sortBy === 'price_desc') {
          query = query.order('price', { ascending: false })
        } else if (sortBy === 'area_desc') {
          query = query.order('area_m2', { ascending: false })
        } else if (sortBy === 'area_asc') {
          query = query.order('area_m2', { ascending: true })
        } else {
          query = query.order('created_at', { ascending: false })
        }

        const { data, error } = await query

        if (error) {
          console.warn('Listings query notice:', error.message)
        } else if (data) {
          setListings(data as unknown as Listing[])
          if (selectedType === 'all' && !selectedCity && !selectedNeighborhood && selectedApartmentType === 'all') {
            AsyncStorage.setItem(EXPLORE_CACHE_KEY, JSON.stringify(data)).catch(() => {})
          }
        }
      } catch (err: any) {
        console.warn('Listings catch notice:', err?.message || err)
      } finally {
        setLoading(false)
      }
    },
    [
      selectedType,
      selectedCity,
      selectedNeighborhood,
      selectedApartmentType,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      selectedRooms,
      selectedFloor,
      selectedCondition,
      selectedFeatures,
      sortBy,
      listings.length,
    ]
  )

  useEffect(() => {
    fetchListings()
    fetchFavoriteIds().then(setFavorites)
  }, [fetchListings])

  const onRefresh = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    setRefreshing(true)
    const startTime = Date.now()

    await fetchListings(true)
    fetchFavoriteIds().then(setFavorites)

    // Snappy UX duration: 500ms for responsive, crisp refresh
    const elapsed = Date.now() - startTime
    if (elapsed < 500) {
      await new Promise((resolve) => setTimeout(resolve, 500 - elapsed))
    }

    setRefreshing(false)
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  const handleToggleFavorite = useCallback(async (id: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push({ pathname: '/modal', params: { initialTab: 'login', reason: 'favorite' } })
      return
    }

    const wasFavorite = !!favorites[id]
    // Optimistic UI update first — instant heart feedback
    setFavorites((prev) => ({ ...prev, [id]: !wasFavorite }))

    const ok = await persistFavoriteToggle(id, wasFavorite)
    if (!ok) {
      // Revert on failure (offline, etc.)
      setFavorites((prev) => ({ ...prev, [id]: wasFavorite }))
    }
  }, [favorites, router])

  const resetFilters = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedCity('')
    setSelectedNeighborhood('')
    setSelectedType('all')
    setSelectedApartmentType('all')
    setMinPrice('')
    setMaxPrice('')
    setMinArea('')
    setMaxArea('')
    setSelectedRooms('all')
    setSelectedFloor('all')
    setSelectedCondition('all')
    setSelectedFeatures([])
    setSortBy('newest')
  }

  const toggleFeature = (feat: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    )
  }

  const displayedListings = useMemo(() => {
    return listings.filter((item) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        item.title?.toLowerCase().includes(q) ||
        item.city?.toLowerCase().includes(q) ||
        item.neighborhood?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      )
    })
  }, [listings, searchQuery])

  const pricePresets = selectedType === 'qira' ? PRICE_PRESETS_RENT : PRICE_PRESETS_SALE

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Eksploro Pronat</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          {displayedListings.length} prona të disponueshme në Kosovë
        </Text>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor:
                Platform.OS === 'ios'
                  ? theme === 'white'
                    ? 'rgba(255, 255, 255, 0.88)'
                    : theme === 'green'
                    ? 'rgba(0, 75, 68, 0.75)'
                    : 'rgba(20, 26, 25, 0.82)'
                  : colors.searchBg,
              borderColor: isSearchFocused
                ? theme === 'green'
                  ? colors.gold
                  : colors.primary
                : theme === 'white'
                ? 'rgba(0, 0, 0, 0.08)'
                : 'rgba(255, 255, 255, 0.12)',
              borderWidth: isSearchFocused ? 1.5 : 0.5,
            },
          ]}
        >
          <BlurView
            intensity={Platform.OS === 'ios' ? 70 : 100}
            tint={colors.blurTint}
            style={StyleSheet.absoluteFill}
          />
          <Search
            size={18}
            color={
              isSearchFocused
                ? theme === 'green'
                  ? colors.gold
                  : colors.primary
                : colors.textMuted
            }
            strokeWidth={2.2}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Qyteti, lagjja ose fjalë kyçe..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Filter Trigger Button with Dynamic Counter Badge */}
        <Pressable
          style={[
            styles.filterButton,
            {
              backgroundColor:
                activeFiltersCount > 0
                  ? colors.primary
                  : Platform.OS === 'ios'
                  ? 'transparent'
                  : colors.surface,
              borderColor:
                activeFiltersCount > 0
                  ? colors.primary
                  : theme === 'white'
                  ? 'rgba(0, 0, 0, 0.08)'
                  : 'rgba(255, 255, 255, 0.12)',
              borderWidth: 0.5,
            },
          ]}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.selectionAsync()
            setShowFilterModal(true)
          }}
        >
          {Platform.OS === 'ios' && activeFiltersCount === 0 && (
            <View style={[StyleSheet.absoluteFill, { borderRadius: 16, overflow: 'hidden' }]}>
              <BlurView
                intensity={70}
                tint={colors.blurTint}
                style={StyleSheet.absoluteFill}
              />
            </View>
          )}
          <SlidersHorizontal
            size={18}
            color={
              activeFiltersCount > 0
                ? theme === 'green'
                  ? '#003E37'
                  : '#FFFFFF'
                : colors.textPrimary
            }
            strokeWidth={2.2}
          />
          {activeFiltersCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.gold }]}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Quick Active Filter Tags Bar */}
      <View style={styles.quickTagsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickTagsScroll}
        >
          {(['all', 'shitje', 'qira'] as const).map((t) => {
            const isSelected = selectedType === t
            const label = t === 'all' ? 'Të gjitha' : t === 'shitje' ? 'Shitje' : 'Qira'
            return (
              <Pressable
                key={t}
                style={[
                  styles.quickTag,
                  {
                    backgroundColor: isSelected ? colors.chipActiveBg : colors.chipBg,
                    borderColor: isSelected ? colors.chipActiveBg : colors.border,
                  },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  setSelectedType(t)
                }}
              >
                <Text
                  style={[
                    styles.quickTagText,
                    { color: isSelected ? colors.chipTextActive : colors.textSecondary },
                    isSelected && { fontFamily: Fonts.bold },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            )
          })}

          {selectedCity ? (
            <Pressable
              style={[
                styles.quickTag,
                { backgroundColor: colors.chipActiveBg, borderColor: colors.chipActiveBg },
              ]}
              onPress={() => setSelectedCity('')}
            >
              <Text
                style={[
                  styles.quickTagText,
                  { color: colors.chipTextActive, fontFamily: Fonts.bold },
                ]}
              >
                {selectedCity}
              </Text>
              <X size={12} color={colors.chipTextActive} />
            </Pressable>
          ) : null}

          {selectedApartmentType !== 'all' ? (
            <Pressable
              style={[
                styles.quickTag,
                { backgroundColor: colors.chipActiveBg, borderColor: colors.chipActiveBg },
              ]}
              onPress={() => setSelectedApartmentType('all')}
            >
              <Text
                style={[
                  styles.quickTagText,
                  { color: colors.chipTextActive, fontFamily: Fonts.bold },
                ]}
              >
                {selectedApartmentType}
              </Text>
              <X size={12} color={colors.chipTextActive} />
            </Pressable>
          ) : null}

          {/* Quick Sort Menu Trigger */}
          <Pressable
            style={[
              styles.quickTag,
              sortBy !== 'newest'
                ? {
                    backgroundColor: colors.chipActiveBg,
                    borderColor: colors.primary,
                  }
                : {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }
              setShowSortModal(true)
            }}
          >
            <ArrowUpDown
              size={12}
              color={sortBy !== 'newest' ? colors.chipTextActive : colors.primary}
            />
            <Text
              style={[
                styles.quickTagText,
                {
                  color: sortBy !== 'newest' ? colors.chipTextActive : colors.textPrimary,
                  fontFamily: sortBy !== 'newest' ? Fonts.bold : Fonts.medium,
                },
              ]}
            >
              {SORT_OPTIONS.find((s) => s.id === sortBy)?.shortLabel || 'Renditja'}
            </Text>
            <ChevronDown
              size={12}
              color={sortBy !== 'newest' ? colors.chipTextActive : colors.textMuted}
              style={{ marginLeft: 2 }}
            />
          </Pressable>
        </ScrollView>
      </View>

      {/* Listings List with zero black-flash */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary, colors.gold]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {loading && listings.length === 0 ? (
          <ListingFeedSkeleton count={4} />
        ) : displayedListings.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Building2 size={44} color={colors.textLight} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Nuk gjetëm prona me këto kritere
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Provoni të zgjeroni gamën e çmimit, të hiqni disa nga karakteristikat e zgjedhura ose të kërkoni në një qytet tjetër.
            </Text>
            <Pressable
              style={[
                styles.resetButton,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              hitSlop={10}
              onPress={resetFilters}
            >
              <Text style={[styles.resetButtonText, { color: colors.primary }]}>Pastro të gjithë filtrat</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Results count & Quick Sort Header Row */}
            <View style={styles.resultsBar}>
              <Text style={[styles.resultsCountText, { color: colors.textSecondary }]}>
                {displayedListings.length}{' '}
                {displayedListings.length === 1 ? 'pronë e gjetur' : 'prona të gjetura'}
                {selectedCity ? ` në ${selectedCity}` : ''}
              </Text>
              <Pressable
                style={[
                  styles.sortInlineBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: sortBy !== 'newest' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  }
                  setShowSortModal(true)
                }}
              >
                <ArrowUpDown
                  size={11}
                  color={sortBy !== 'newest' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.sortInlineBtnText,
                    {
                      color: sortBy !== 'newest' ? colors.primary : colors.textPrimary,
                      fontFamily: sortBy !== 'newest' ? Fonts.bold : Fonts.medium,
                    },
                  ]}
                >
                  {SORT_OPTIONS.find((s) => s.id === sortBy)?.shortLabel || 'Renditja'}
                </Text>
                <ChevronDown size={11} color={colors.textMuted} />
              </Pressable>
            </View>

            {displayedListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isFavorite={!!favorites[listing.id]}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* =================================================================== */}
      {/* ULTRA-LUXURY SORTING MENU BOTTOM SHEET (Apple HIG & Airbnb Grade)   */}
      {/* =================================================================== */}
      <Modal
        visible={showSortModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.sortModalOverlay}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 45 : 100}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowSortModal(false)}
          />

          <View
            style={[
              styles.sortModalSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Sheet Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={styles.sortModalHeader}>
              <View style={styles.sortModalHeaderLeft}>
                <View
                  style={[
                    styles.sortModalIconWrap,
                    { backgroundColor: colors.surfaceSubtle },
                  ]}
                >
                  <ArrowUpDown size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.sortModalTitle, { color: colors.textPrimary }]}>
                    Renditja e pronave
                  </Text>
                  <Text style={[styles.sortModalSubtitle, { color: colors.textMuted }]}>
                    Zgjidhni mënyrën e renditjes së rezultateve
                  </Text>
                </View>
              </View>
              <Pressable
                style={[
                  styles.sortModalCloseBtn,
                  { backgroundColor: colors.surfaceSubtle },
                ]}
                onPress={() => setShowSortModal(false)}
                hitSlop={10}
              >
                <X size={16} color={colors.textPrimary} />
              </Pressable>
            </View>

            {/* Options List */}
            <View style={styles.sortModalList}>
              {SORT_OPTIONS.map((opt) => {
                const isSelected = sortBy === opt.id
                const IconComponent = opt.icon
                return (
                  <Pressable
                    key={opt.id}
                    style={({ pressed }) => [
                      styles.sortModalOption,
                      {
                        backgroundColor: isSelected
                          ? colors.surfaceSubtle
                          : pressed
                          ? colors.surfaceSubtle
                          : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.selectionAsync()
                      }
                      setSortBy(opt.id)
                      setTimeout(() => {
                        setShowSortModal(false)
                      }, 180)
                    }}
                  >
                    <View
                      style={[
                        styles.sortOptionIconBox,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : colors.surfaceSubtle,
                        },
                      ]}
                    >
                      <IconComponent
                        size={18}
                        color={
                          isSelected
                            ? theme === 'green'
                              ? '#003E37'
                              : '#FFFFFF'
                            : colors.textSecondary
                        }
                      />
                    </View>

                    <View style={styles.sortOptionTextWrap}>
                      <Text
                        style={[
                          styles.sortOptionLabel,
                          {
                            color: isSelected ? colors.primary : colors.textPrimary,
                            fontFamily: isSelected ? Fonts.bold : Fonts.semiBold,
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={[styles.sortOptionDesc, { color: colors.textMuted }]}>
                        {opt.description}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.sortRadioCircle,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && (
                        <Check
                          size={13}
                          color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                          strokeWidth={3}
                        />
                      )}
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* ULTRA-DETAILED LUXURY FILTER MODAL (Website & Beyond)               */}
      {/* =================================================================== */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: colors.surface }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
            <Pressable
              style={styles.modalResetHeaderBtn}
              onPress={resetFilters}
              hitSlop={10}
            >
              <RotateCcw size={15} color={colors.textMuted} />
              <Text style={[styles.modalResetHeaderText, { color: colors.textMuted }]}>Pastro</Text>
            </Pressable>

            <View style={styles.modalHeaderCenter}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Filtro Pronat</Text>
              {activeFiltersCount > 0 && (
                <View style={[styles.modalCountBadge, { backgroundColor: colors.badgeBg }]}>
                  <Text style={[styles.modalCountBadgeText, { color: colors.badgeText }]}>
                    {activeFiltersCount} aktivë
                  </Text>
                </View>
              )}
            </View>

            <Pressable
              style={[styles.modalCloseButton, { backgroundColor: colors.surfaceSubtle }]}
              onPress={() => setShowFilterModal(false)}
              hitSlop={10}
            >
              <X size={18} color={colors.textPrimary} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Lloji i Kontratës */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                1. Lloji i Ofertës
              </Text>
              <View style={[styles.segmentContainer, { backgroundColor: colors.surfaceSubtle }]}>
                {(['all', 'shitje', 'qira'] as const).map((t) => {
                  const isAct = selectedType === t
                  const label =
                    t === 'all' ? 'Të gjitha' : t === 'shitje' ? 'Në Shitje' : 'Me Qira'
                  return (
                    <Pressable
                      key={t}
                      style={[
                        styles.segmentBtn,
                        isAct && [
                          styles.segmentBtnActive,
                          {
                            backgroundColor: colors.surface,
                            shadowColor: '#000',
                            shadowOpacity: theme === 'black' ? 0.3 : 0.08,
                          },
                        ],
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setSelectedType(t)
                      }}
                    >
                      <Text
                        style={[
                          styles.segmentBtnText,
                          { color: isAct ? colors.textPrimary : colors.textMuted },
                          isAct && { fontFamily: Fonts.bold },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* 2. Qyteti në Kosovë */}
            <View style={styles.modalSection}>
              <View style={styles.sectionTitleRow}>
                <MapPin size={16} color={colors.primary} />
                <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                  2. Qyteti
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                <Pressable
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        selectedCity === '' ? colors.chipActiveBg : colors.surfaceSubtle,
                      borderColor: selectedCity === '' ? colors.chipActiveBg : colors.border,
                    },
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync()
                    setSelectedCity('')
                    setSelectedNeighborhood('')
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectedCity === '' ? colors.chipTextActive : colors.textSecondary },
                      selectedCity === '' && { fontFamily: Fonts.bold },
                    ]}
                  >
                    Të gjitha qytetet
                  </Text>
                </Pressable>

                {POPULAR_CITIES.map((city) => {
                  const isCityActive = selectedCity === city
                  return (
                    <Pressable
                      key={city}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isCityActive
                            ? colors.chipActiveBg
                            : colors.surfaceSubtle,
                          borderColor: isCityActive ? colors.chipActiveBg : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setSelectedCity(city)
                        setSelectedNeighborhood('')
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isCityActive
                              ? colors.chipTextActive
                              : colors.textSecondary,
                          },
                          isCityActive && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {city}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </View>

            {/* 3. Lagjja (Cascading kur zgjidhet qyteti) */}
            {selectedCity && KOSOVO_LOCATIONS[selectedCity]?.length > 0 && (
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                  Lagjja në {selectedCity}
                </Text>
                <View style={styles.neighborhoodGrid}>
                  {KOSOVO_LOCATIONS[selectedCity].map((n) => {
                    const isSelected = selectedNeighborhood === n
                    return (
                      <Pressable
                        key={n}
                        style={[
                          styles.neighborhoodChip,
                          {
                            backgroundColor: isSelected
                              ? colors.chipActiveBg
                              : colors.surfaceSubtle,
                            borderColor: isSelected ? colors.chipActiveBg : colors.border,
                          },
                        ]}
                        onPress={() => {
                          if (Platform.OS !== 'web') Haptics.selectionAsync()
                          setSelectedNeighborhood(isSelected ? '' : n)
                        }}
                      >
                        <Text
                          style={[
                            styles.neighborhoodChipText,
                            {
                              color: isSelected ? colors.chipTextActive : colors.textSecondary,
                            },
                            isSelected && { fontFamily: Fonts.bold },
                          ]}
                        >
                          {n}
                        </Text>
                        {isSelected && <Check size={12} color={colors.chipTextActive} />}
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            )}

            {/* 4. Lloji i Pronës (Tipologjia) */}
            <View style={styles.modalSection}>
              <View style={styles.sectionTitleRow}>
                <Home size={16} color={colors.primary} />
                <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                  3. Lloji i Pronës
                </Text>
              </View>
              <View style={styles.wrapGrid}>
                {PROPERTY_TYPES.map((pt) => {
                  const isAct = selectedApartmentType === pt.id
                  return (
                    <Pressable
                      key={pt.id}
                      style={[
                        styles.wrapChip,
                        {
                          backgroundColor: isAct ? colors.chipActiveBg : colors.surfaceSubtle,
                          borderColor: isAct ? colors.chipActiveBg : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setSelectedApartmentType(pt.id)
                      }}
                    >
                      <Text
                        style={[
                          styles.wrapChipText,
                          { color: isAct ? colors.chipTextActive : colors.textSecondary },
                          isAct && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {pt.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* 5. Gama e Çmimit (€) */}
            <View style={styles.modalSection}>
              <View style={styles.sectionTitleRow}>
                <Tag size={16} color={colors.primary} />
                <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                  4. Çmimi (€)
                </Text>
              </View>

              <View style={styles.minMaxRow}>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor:
                        focusedFilterInput === 'minPrice'
                          ? theme === 'green'
                            ? colors.gold
                            : colors.primary
                          : colors.border,
                      borderWidth: focusedFilterInput === 'minPrice' ? 1.5 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.inputPrefix,
                      {
                        color:
                          focusedFilterInput === 'minPrice'
                            ? colors.primary
                            : colors.textMuted,
                      },
                    ]}
                  >
                    Nga
                  </Text>
                  <TextInput
                    style={[styles.numericInput, { color: colors.textPrimary }]}
                    placeholder="0"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={minPrice}
                    onChangeText={setMinPrice}
                    onFocus={() => setFocusedFilterInput('minPrice')}
                    onBlur={() => setFocusedFilterInput(null)}
                  />
                  <Text style={[styles.inputSuffix, { color: colors.primary }]}>€</Text>
                </View>

                <Text style={[styles.dashSeparator, { color: colors.textMuted }]}>—</Text>

                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor:
                        focusedFilterInput === 'maxPrice'
                          ? theme === 'green'
                            ? colors.gold
                            : colors.primary
                          : colors.border,
                      borderWidth: focusedFilterInput === 'maxPrice' ? 1.5 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.inputPrefix,
                      {
                        color:
                          focusedFilterInput === 'maxPrice'
                            ? colors.primary
                            : colors.textMuted,
                      },
                    ]}
                  >
                    Deri
                  </Text>
                  <TextInput
                    style={[styles.numericInput, { color: colors.textPrimary }]}
                    placeholder="Maks"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                    onFocus={() => setFocusedFilterInput('maxPrice')}
                    onBlur={() => setFocusedFilterInput(null)}
                  />
                  <Text style={[styles.inputSuffix, { color: colors.primary }]}>€</Text>
                </View>
              </View>

              {/* Quick price presets */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
                {pricePresets.map((p, idx) => {
                  const isPresetActive = minPrice === p.min && maxPrice === p.max
                  return (
                    <Pressable
                      key={idx}
                      style={[
                        styles.presetPill,
                        {
                          backgroundColor: isPresetActive
                            ? colors.badgeBg
                            : colors.surfaceSubtle,
                          borderColor: isPresetActive ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        if (isPresetActive) {
                          setMinPrice('')
                          setMaxPrice('')
                        } else {
                          setMinPrice(p.min)
                          setMaxPrice(p.max)
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.presetPillText,
                          { color: isPresetActive ? colors.primary : colors.textMuted },
                          isPresetActive && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </View>

            {/* 6. Sipërfaqja (m²) */}
            <View style={styles.modalSection}>
              <View style={styles.sectionTitleRow}>
                <Maximize2 size={16} color={colors.primary} />
                <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                  5. Sipërfaqja (m²)
                </Text>
              </View>

              <View style={styles.minMaxRow}>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor:
                        focusedFilterInput === 'minArea'
                          ? theme === 'green'
                            ? colors.gold
                            : colors.primary
                          : colors.border,
                      borderWidth: focusedFilterInput === 'minArea' ? 1.5 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.inputPrefix,
                      {
                        color:
                          focusedFilterInput === 'minArea'
                            ? colors.primary
                            : colors.textMuted,
                      },
                    ]}
                  >
                    Min
                  </Text>
                  <TextInput
                    style={[styles.numericInput, { color: colors.textPrimary }]}
                    placeholder="0"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={minArea}
                    onChangeText={setMinArea}
                    onFocus={() => setFocusedFilterInput('minArea')}
                    onBlur={() => setFocusedFilterInput(null)}
                  />
                  <Text style={[styles.inputSuffix, { color: colors.primary }]}>m²</Text>
                </View>

                <Text style={[styles.dashSeparator, { color: colors.textMuted }]}>—</Text>

                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor:
                        focusedFilterInput === 'maxArea'
                          ? theme === 'green'
                            ? colors.gold
                            : colors.primary
                          : colors.border,
                      borderWidth: focusedFilterInput === 'maxArea' ? 1.5 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.inputPrefix,
                      {
                        color:
                          focusedFilterInput === 'maxArea'
                            ? colors.primary
                            : colors.textMuted,
                      },
                    ]}
                  >
                    Maks
                  </Text>
                  <TextInput
                    style={[styles.numericInput, { color: colors.textPrimary }]}
                    placeholder="Maks"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={maxArea}
                    onChangeText={setMaxArea}
                    onFocus={() => setFocusedFilterInput('maxArea')}
                    onBlur={() => setFocusedFilterInput(null)}
                  />
                  <Text style={[styles.inputSuffix, { color: colors.primary }]}>m²</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
                {AREA_PRESETS.map((p, idx) => {
                  const isPresetActive = minArea === p.min && maxArea === p.max
                  return (
                    <Pressable
                      key={idx}
                      style={[
                        styles.presetPill,
                        {
                          backgroundColor: isPresetActive
                            ? colors.badgeBg
                            : colors.surfaceSubtle,
                          borderColor: isPresetActive ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        if (isPresetActive) {
                          setMinArea('')
                          setMaxArea('')
                        } else {
                          setMinArea(p.min)
                          setMaxArea(p.max)
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.presetPillText,
                          { color: isPresetActive ? colors.primary : colors.textMuted },
                          isPresetActive && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </View>

            {/* 7. Numri i Dhomave */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                6. Numri i Dhomave
              </Text>
              <View style={styles.rowSelector}>
                {ROOM_OPTIONS.map((r) => {
                  const isAct = selectedRooms === r.id
                  return (
                    <Pressable
                      key={r.id}
                      style={[
                        styles.rowSelectorBtn,
                        {
                          backgroundColor: isAct ? colors.chipActiveBg : colors.surfaceSubtle,
                          borderColor: isAct ? colors.chipActiveBg : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setSelectedRooms(r.id)
                      }}
                    >
                      <Text
                        style={[
                          styles.rowSelectorBtnText,
                          { color: isAct ? colors.chipTextActive : colors.textSecondary },
                          isAct && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {r.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* 8. Kati */}
            <View style={styles.modalSection}>
              <View style={styles.sectionTitleRow}>
                <Layers size={16} color={colors.primary} />
                <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                  7. Kati
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {FLOOR_OPTIONS.map((f) => {
                  const isAct = selectedFloor === f.id
                  return (
                    <Pressable
                      key={f.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isAct ? colors.chipActiveBg : colors.surfaceSubtle,
                          borderColor: isAct ? colors.chipActiveBg : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setSelectedFloor(f.id)
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isAct ? colors.chipTextActive : colors.textSecondary },
                          isAct && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </View>

            {/* 9. Gjendja e Pronës */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                8. Gjendja e Pronës
              </Text>
              <View style={styles.wrapGrid}>
                {CONDITION_OPTIONS.map((c) => {
                  const isAct = selectedCondition === c.id
                  return (
                    <Pressable
                      key={c.id}
                      style={[
                        styles.wrapChip,
                        {
                          backgroundColor: isAct ? colors.chipActiveBg : colors.surfaceSubtle,
                          borderColor: isAct ? colors.chipActiveBg : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setSelectedCondition(c.id)
                      }}
                    >
                      <Text
                        style={[
                          styles.wrapChipText,
                          { color: isAct ? colors.chipTextActive : colors.textSecondary },
                          isAct && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {c.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* 10. Veçoritë & Karakteristikat (Multi-select) */}
            <View style={styles.modalSection}>
              <View style={styles.sectionTitleRow}>
                <ShieldCheck size={16} color={colors.primary} />
                <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                  9. Karakteristikat & Pajisjet
                </Text>
              </View>
              <View style={styles.featuresGrid}>
                {FEATURES_LIST.map((feat) => {
                  const isSelected = selectedFeatures.includes(feat)
                  return (
                    <Pressable
                      key={feat}
                      style={[
                        styles.featureChip,
                        {
                          backgroundColor: isSelected
                            ? colors.badgeBg
                            : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => toggleFeature(feat)}
                    >
                      <View
                        style={[
                          styles.featureCheckbox,
                          {
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        {isSelected && (
                          <Check
                            size={11}
                            color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                            strokeWidth={3}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.featureText,
                          { color: isSelected ? colors.textPrimary : colors.textSecondary },
                          isSelected && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {feat}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* 11. Renditja e Rezultateve */}
            <View style={styles.modalSection}>
              <View style={styles.sectionTitleRow}>
                <ArrowUpDown size={16} color={colors.primary} />
                <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                  10. Renditja
                </Text>
              </View>
              <View style={styles.sortList}>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortBy === opt.id
                  const IconComponent = opt.icon
                  return (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.sortRow,
                        {
                          backgroundColor: isSelected
                            ? colors.surfaceSubtle
                            : 'transparent',
                          borderColor: isSelected ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setSortBy(opt.id)
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <IconComponent
                            size={16}
                            color={
                              isSelected
                                ? theme === 'green'
                                  ? '#003E37'
                                  : '#FFFFFF'
                                : colors.textSecondary
                            }
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.sortRowText,
                              { color: isSelected ? colors.textPrimary : colors.textSecondary },
                              isSelected && { fontFamily: Fonts.bold },
                            ]}
                          >
                            {opt.label}
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              color: colors.textMuted,
                              fontFamily: Fonts.regular,
                            }}
                          >
                            {opt.description}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.radioCircle,
                          {
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && (
                          <Check
                            size={11}
                            color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                            strokeWidth={3}
                          />
                        )}
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          </ScrollView>

          {/* Modal Sticky Footer Bar */}
          <View
            style={[
              styles.modalFooter,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.borderSubtle,
              },
            ]}
          >
            <Pressable
              style={[styles.modalFooterReset, { borderColor: colors.border }]}
              onPress={resetFilters}
              hitSlop={10}
            >
              <RotateCcw size={16} color={colors.textSecondary} />
              <Text style={[styles.modalFooterResetText, { color: colors.textSecondary }]}>
                Pastro
              </Text>
            </Pressable>

            <Pressable
              style={[styles.modalApplyButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                }
                setShowFilterModal(false)
              }}
            >
              <Text
                style={[
                  styles.modalApplyButtonText,
                  { color: theme === 'green' ? '#003E37' : '#FFFFFF' },
                ]}
              >
                {activeFiltersCount > 0
                  ? `Zbato Filtrat (${activeFiltersCount})`
                  : 'Shfaq Të Gjitha Pronat'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 10,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  searchBar: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#003E37',
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  quickTagsBar: {
    marginBottom: 8,
  },
  quickTagsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  quickTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickTagText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 115,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  centerContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  resetButton: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  resetButtonText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },

  // MODAL STYLES
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  modalResetHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modalResetHeaderText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  modalHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  modalCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modalCountBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
    gap: 22,
    paddingBottom: 30,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  modalSection: {
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentBtnActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  chipsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  neighborhoodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  neighborhoodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  neighborhoodChipText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  wrapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wrapChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  wrapChipText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  minMaxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    gap: 6,
  },
  inputPrefix: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  numericInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    height: '100%',
  },
  inputSuffix: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  dashSeparator: {
    fontSize: 16,
  },
  presetsScroll: {
    marginTop: 4,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  presetPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  presetPillText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  rowSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  rowSelectorBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowSelectorBtnText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  featureCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  sortList: {
    gap: 6,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sortRowText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  modalFooterReset: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalFooterResetText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
  modalApplyButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  modalApplyButtonText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },

  /* Results Bar */
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  resultsCountText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  sortInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  sortInlineBtnText: {
    fontSize: 12,
  },

  /* Ultra-Luxury Sort Bottom Sheet */
  sortModalOverlay: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sortModalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sortModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    marginBottom: 12,
  },
  sortModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sortModalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModalTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  sortModalSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  sortModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModalList: {
    gap: 8,
  },
  sortModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  sortOptionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sortOptionTextWrap: {
    flex: 1,
  },
  sortOptionLabel: {
    fontSize: 15,
    marginBottom: 2,
  },
  sortOptionDesc: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  sortRadioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
})
