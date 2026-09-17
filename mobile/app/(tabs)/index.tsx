import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Search, X, SlidersHorizontal, Building2 } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase, Listing } from '@/lib/supabase'
import { fetchFavoriteIds, persistFavoriteToggle } from '@/lib/favorites'
import { ListingCard } from '@/components/ListingCard'
import { ListingFeedSkeleton } from '@/components/ListingSkeleton'
import { Logo } from '@/components/Logo'
import OmniSearchModal from '@/components/OmniSearchModal'
import { PropertyFilterBar } from '@/components/PropertyFilterBar'
import { PropertyFilterModal } from '@/components/PropertyFilterModal'
import {
  PropertyFilterState,
  DEFAULT_FILTER_STATE,
  countActiveFilters,
  filterAndSortListings,
  matchesCategory,
  CATEGORY_ITEMS,
} from '@/lib/property-filters'

const HOME_CACHE_KEY = '@blejepronen_home_listings_cache_v2'

export default function HomeScreen() {
  const router = useRouter()
  const { colors, theme } = useTheme()

  const [filters, setFilters] = useState<PropertyFilterState>(DEFAULT_FILTER_STATE)
  const [isOmniModalOpen, setIsOmniModalOpen] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})

  // 1. Instant local-first hydration: render in <5ms from disk cache on cold launch
  useEffect(() => {
    AsyncStorage.getItem(HOME_CACHE_KEY).then((cached) => {
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

  const fetchListings = useCallback(async () => {
    try {
      let query = supabase
        .from('listings')
        .select(
          'id,title,description,price,city,neighborhood,address,type,images,rooms,area_m2,floor,apartment_type,is_featured,is_active,created_at,user_id,condition,features'
        )
        .order('created_at', { ascending: false })
        .limit(60)

      if (filters.transactionType !== 'all') {
        query = query.eq('type', filters.transactionType)
      }

      const { data, error } = await query

      if (error) {
        console.warn('Listing fetch notice:', error.message)
      } else if (data) {
        setListings(data as unknown as Listing[])
        if (filters.transactionType === 'all') {
          AsyncStorage.setItem(HOME_CACHE_KEY, JSON.stringify(data)).catch(() => {})
        }
      }
    } catch (err: any) {
      console.warn('Listing catch notice:', err?.message || err)
    } finally {
      setLoading(false)
    }
  }, [filters.transactionType])

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

    await fetchListings()
    fetchFavoriteIds().then(setFavorites)

    const elapsed = Date.now() - startTime
    if (elapsed < 500) {
      await new Promise((resolve) => setTimeout(resolve, 500 - elapsed))
    }

    setRefreshing(false)
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  const handleToggleFavorite = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push({ pathname: '/modal', params: { initialTab: 'login', reason: 'favorite' } })
        return
      }

      const wasFavorite = !!favorites[id]
      setFavorites((prev) => ({ ...prev, [id]: !wasFavorite }))

      const ok = await persistFavoriteToggle(id, wasFavorite)
      if (!ok) {
        setFavorites((prev) => ({ ...prev, [id]: wasFavorite }))
      }
    },
    [favorites, router]
  )

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of listings) {
      if (filters.transactionType !== 'all' && item.type !== filters.transactionType) continue
      for (const cat of CATEGORY_ITEMS) {
        if (cat.id === 'all') {
          counts.all = (counts.all || 0) + 1
        } else if (matchesCategory(item, cat.id)) {
          counts[cat.id] = (counts[cat.id] || 0) + 1
        }
      }
    }
    return counts
  }, [listings, filters.transactionType])

  // Unified filtering and sorting
  const filteredListings = useMemo(() => {
    return filterAndSortListings(listings, filters)
  }, [listings, filters])

  const activeFiltersCount = countActiveFilters(filters)

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Bar Header with Official Logo */}
      <View style={styles.header}>
        <Logo size={34} />
      </View>

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
        {/* 
          Search & Filter Bar Row:
          Bounded flex constraints, fluid on any screen size with zero overflow
        */}
        <View style={styles.searchRow}>
          <Pressable
            style={styles.searchBar}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              setIsOmniModalOpen(true)
            }}
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 70 : 100}
              tint={colors.blurTint}
              style={StyleSheet.absoluteFill}
            />
            <Search size={18} color={colors.primary} strokeWidth={2.2} />
            <Text
              style={[
                styles.searchInputText,
                { color: filters.searchQuery ? colors.textPrimary : colors.textLight },
              ]}
              numberOfLines={1}
            >
              {filters.searchQuery || 'Qyteti, lagjja, agjencia ose prona...'}
            </Text>
            {filters.searchQuery.length > 0 && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation()
                  setFilters((prev) => ({ ...prev, searchQuery: '' }))
                }}
                hitSlop={8}
                style={styles.searchClearBtn}
              >
                <X size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </Pressable>

          {/* Unified Filter Trigger Button */}
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

        {/* 
          Shared Modular Filter Bar:
          Exact same transaction toggle & category pills as Pronat tab
        */}
        <PropertyFilterBar
          transactionType={filters.transactionType}
          onChangeTransactionType={(t) => setFilters((prev) => ({ ...prev, transactionType: t }))}
          selectedCategory={filters.category}
          onChangeCategory={(c) => setFilters((prev) => ({ ...prev, category: c }))}
          categoryCounts={categoryCounts}
        />

        {/* Section Title & Count */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {filters.category === 'all'
                ? 'Pronat e fundit'
                : `Pronat: ${CATEGORY_ITEMS.find((c) => c.id === filters.category)?.label || ''}`}
            </Text>
            {filters.category !== 'all' && (
              <View style={[styles.activeCategoryBadge, { backgroundColor: colors.chipActiveBg }]}>
                <Text style={[styles.activeCategoryBadgeText, { color: colors.chipTextActive }]}>
                  {filteredListings.length}
                </Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => {
              router.push({
                pathname: '/(tabs)/listings' as any,
                params: {
                  category: filters.category,
                  type: filters.transactionType,
                  search: filters.searchQuery,
                },
              })
            }}
            hitSlop={10}
          >
            <Text style={[styles.sectionLink, { color: colors.primary }]}>Shiko të gjitha</Text>
          </Pressable>
        </View>

        {/* Listings Feed */}
        {loading && listings.length === 0 ? (
          <ListingFeedSkeleton count={3} />
        ) : filteredListings.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Building2 size={40} color={colors.textLight} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Nuk u gjet asnjë pronë
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Provoni të pastroni filtrat ose të zgjidhni një kategori tjetër.
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
              hitSlop={8}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setFilters(DEFAULT_FILTER_STATE)
              }}
            >
              <Text style={[styles.resetButtonText, { color: colors.primary }]}>
                Pastro filtrat
              </Text>
            </Pressable>
          </View>
        ) : (
          filteredListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorite={!!favorites[listing.id]}
              onToggleFavorite={handleToggleFavorite}
            />
          ))
        )}
      </ScrollView>

      {/* Multi-Entity Omni-Search Modal */}
      <OmniSearchModal
        visible={isOmniModalOpen}
        onClose={() => setIsOmniModalOpen(false)}
        initialQuery={filters.searchQuery}
        onSelectCity={(city, neighborhood) => {
          setFilters((prev) => ({
            ...prev,
            city,
            neighborhood: neighborhood || '',
            searchQuery: neighborhood ? `${neighborhood}, ${city}` : city,
          }))
        }}
        onSelectQuery={(q) => {
          setFilters((prev) => ({ ...prev, searchQuery: q }))
        }}
      />

      {/* Comprehensive Property Filter Modal */}
      <PropertyFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApply={(updated) => setFilters(updated)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 115,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    width: '100%',
  },
  searchBar: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    height: 50,
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInputText: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  searchClearBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButton: {
    width: 48,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    flexShrink: 0,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  activeCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeCategoryBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  sectionLink: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  resetButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 6,
  },
  resetButtonText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
})
