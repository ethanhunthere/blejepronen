import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native'
import Animated from 'react-native-reanimated'
import { useTabBarCollapseOnScroll } from '@/lib/tab-bar-scroll'
import { BlurView } from 'expo-blur'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import {
  Search,
  X,
  SlidersHorizontal,
  Building2,
  ArrowDownUp,
  ChevronDown,
  RotateCcw,
  Bookmark,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import type { Listing } from '@/lib/supabase'
import { useFavorites, fetchFavoriteIds } from '@/lib/favorites'
import { ListingCard } from '@/components/ListingCard'
import { ListingFeedSkeleton } from '@/components/ListingSkeleton'
import { PropertyFilterBar } from '@/components/PropertyFilterBar'
import { PropertyFilterModal } from '@/components/PropertyFilterModal'
import { SortBottomSheet } from '@/components/SortBottomSheet'
import { SavedSearchesSheet, type SavedSearchSnapshot } from '@/components/SavedSearchesSheet'
import {
  PropertyFilterState,
  DEFAULT_FILTER_STATE,
  countActiveFilters,
  toListingsQueryParams,
  CATEGORY_ITEMS,
  SORT_OPTIONS,
} from '@/lib/property-filters'
import {
  fetchCategoryCounts,
  fetchListingsPage,
  isCanonicalFeedQuery,
  type ListingsQueryParams,
} from '@/lib/listings-query'
import {
  getCachedListings,
  hasCachedListings,
  setCachedListings,
  subscribeCachedListings,
  getCachedQueryListings,
  setCachedQueryListings,
  filterCachedListingsOptimistic,
} from '@/lib/listings-cache'
import { getSyncAuthUser } from '@/lib/auth-cache'
import { TactilePressable } from '@/components/motion'
import { openLoginScreen } from '@/lib/navigation'

// Range-based paging. The first page keeps the previous single-shot payload size
// so the shared cache seed stays identical; later pages come in smaller batches.
const FIRST_PAGE_SIZE = 100
const PAGE_SIZE = 40

export default function ListingsScreen() {
  const params = useLocalSearchParams<{
    category?: string
    type?: 'all' | 'shitje' | 'qira'
    search?: string
    city?: string
    neighborhood?: string
  }>()

  const { colors, theme } = useTheme()
  const tabBarScrollHandler = useTabBarCollapseOnScroll()
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [filters, setFilters] = useState<PropertyFilterState>(() => ({
    ...DEFAULT_FILTER_STATE,
    category: params.category || 'all',
    transactionType: params.type || 'all',
    searchQuery: params.search || '',
    city: params.city || '',
    neighborhood: params.neighborhood || '',
  }))
  const [showSavedSearches, setShowSavedSearches] = useState(false)

  const savedSearchSnapshot = useMemo<SavedSearchSnapshot>(
    () => ({
      label: [
        filters.city || 'Kosovë',
        filters.transactionType === 'shitje'
          ? 'për shitje'
          : filters.transactionType === 'qira'
            ? 'me qira'
            : null,
        filters.searchQuery ? `"${filters.searchQuery}"` : null,
      ]
        .filter(Boolean)
        .join(' • '),
      city: filters.city || undefined,
      type: filters.transactionType === 'all' ? undefined : filters.transactionType,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      rooms: filters.rooms && filters.rooms !== 'all' ? Number(filters.rooms) : undefined,
      minArea: filters.minArea ? Number(filters.minArea) : undefined,
      maxArea: filters.maxArea ? Number(filters.maxArea) : undefined,
      searchQuery: filters.searchQuery || undefined,
    }),
    [filters]
  )

  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showSortSheet, setShowSortSheet] = useState(false)
  // The offline cache only ever holds the canonical newest-first feed, but we can
  // seed from query cache or optimistic in-memory filter on frame zero.
  const [listings, setListings] = useState<Listing[]>(() => {
    const p = toListingsQueryParams({
      ...DEFAULT_FILTER_STATE,
      category: params.category || 'all',
      transactionType: params.type || 'all',
      searchQuery: params.search || '',
      city: params.city || '',
      neighborhood: params.neighborhood || '',
    })
    if (isCanonicalFeedQuery(p)) return getCachedListings()
    const cachedHit = getCachedQueryListings(JSON.stringify(p))
    if (cachedHit && cachedHit.rows.length > 0) return cachedHit.rows
    const all = getCachedListings()
    if (all.length > 0) return filterCachedListingsOptimistic(all, p)
    return []
  })
  const [loading, setLoading] = useState(() => {
    const p = toListingsQueryParams({
      ...DEFAULT_FILTER_STATE,
      category: params.category || 'all',
      transactionType: params.type || 'all',
      searchQuery: params.search || '',
      city: params.city || '',
      neighborhood: params.neighborhood || '',
    })
    if (isCanonicalFeedQuery(p) && hasCachedListings()) return false
    const cachedHit = getCachedQueryListings(JSON.stringify(p))
    if (cachedHit && cachedHit.rows.length > 0) return false
    const all = getCachedListings()
    return all.length === 0
  })
  // Honest server total for the active filter set — `null` until the first
  // counted response lands, so no counter ever renders a windowed guess.
  const [total, setTotal] = useState<number | null>(null)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const { favorites, toggleFavorite } = useFavorites()

  // Monotonic request id: only the newest response may touch state, so rapid
  // Shitje ↔ Qira toggles can never let a slower older payload win.
  const reqIdRef = useRef(0)
  const nextFromRef = useRef(0)
  const loadingMoreRef = useRef(false)

  // Filtering, sorting and paging all live in the Supabase query now: this param
  // object is the single source of truth for what the list shows.
  const queryParams = useMemo<ListingsQueryParams>(
    () => toListingsQueryParams(filters),
    [filters]
  )
  const queryKey = useMemo(() => JSON.stringify(queryParams), [queryParams])
  const paramsRef = useRef(queryParams)
  paramsRef.current = queryParams

  const currentSortOption = useMemo(
    () => SORT_OPTIONS.find((s) => s.id === filters.sortBy) || SORT_OPTIONS[0],
    [filters.sortBy]
  )
  const isCustomSort = filters.sortBy !== 'newest'

  // Update filters if search params change
  useEffect(() => {
    if (params.category || params.type || params.search || params.city || params.neighborhood) {
      setFilters((prev) => ({
        ...prev,
        category: params.category || prev.category,
        transactionType: (params.type as any) || prev.transactionType,
        searchQuery: params.search !== undefined ? params.search : prev.searchQuery,
        city: params.city !== undefined ? params.city : prev.city,
        neighborhood: params.neighborhood !== undefined ? params.neighborhood : prev.neighborhood,
      }))
    }
  }, [params.category, params.type, params.search, params.city, params.neighborhood])

  // Instant sync with shared cache updates
  useEffect(() => {
    const unsubscribe = subscribeCachedListings((fresh) => {
      // The shared cache mirrors the canonical newest-first feed only, so it may
      // never overwrite a filtered, searched or re-ordered result set.
      if (!isCanonicalFeedQuery(paramsRef.current)) return
      setListings((prev) => (prev.length === 0 ? fresh : prev))
      // Keep the paging cursor aligned with the externally seeded page.
      nextFromRef.current = fresh.length
      setHasMore(fresh.length > 0)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const fetchListings = useCallback(
    async (reset = true) => {
      if (!reset && (loadingMoreRef.current || !nextFromRef.current)) return

      const rid = ++reqIdRef.current
      const from = reset ? 0 : nextFromRef.current
      const size = reset ? FIRST_PAGE_SIZE : PAGE_SIZE
      const request = paramsRef.current
      const canonical = isCanonicalFeedQuery(request)

      if (reset) {
        const cachedHit = getCachedQueryListings(queryKey)
        if (cachedHit && cachedHit.rows.length > 0) {
          setListings(cachedHit.rows)
          setTotal(cachedHit.total)
          setLoading(false)
        } else if (!canonical) {
          const all = getCachedListings()
          if (all.length > 0) {
            const optimistic = filterCachedListingsOptimistic(all, request)
            if (optimistic.length > 0) {
              setListings(optimistic)
              setTotal(optimistic.length)
              setLoading(false)
            } else {
              setLoading(true)
            }
          } else {
            setLoading(true)
          }
        } else {
          setLoading(true)
        }
      } else {
        loadingMoreRef.current = true
        setLoadingMore(true)
      }

      try {
        // Server-side filtering, sorting and exact counting in one query —
        // card columns only, is_active enforced by the shared query layer.
        const { rows, total: serverTotal, error } = await fetchListingsPage({
          ...request,
          from,
          limit: size,
        })

        // A newer request already superseded this one — drop the stale payload.
        if (rid !== reqIdRef.current) return

        if (error) {
          console.warn('Listings tab query notice:', error)
        }

        if (reset) {
          setListings(rows)
          setCachedQueryListings(queryKey, { rows, total: serverTotal })
          // Only the canonical window may seed the shared offline cache.
          if (canonical) setCachedListings(rows)
        } else {
          setListings((prev) => {
            const seen = new Set(prev.map((l) => l.id))
            const merged = [...prev]
            for (const row of rows) {
              if (seen.has(row.id)) continue
              seen.add(row.id)
              merged.push(row)
            }
            return merged
          })
        }

        setTotal(serverTotal)
        nextFromRef.current = from + rows.length
        // Honest paging: measured against the server total, not the window size.
        setHasMore(from + rows.length < serverTotal)
      } catch (err: any) {
        if (rid === reqIdRef.current) {
          console.warn('Listings fetch catch:', err?.message || err)
        }
      } finally {
        if (rid === reqIdRef.current) {
          setLoading(false)
        }
        if (!reset) {
          loadingMoreRef.current = false
          setLoadingMore(false)
        }
      }
    },
    [queryKey]
  )

  // Every filter, category, search or sort change rewinds to page 0 and re-queries
  // the server — `fetchListings` is re-created whenever the query params change.
  useEffect(() => {
    fetchListings(true)
  }, [fetchListings])

  // Category chip badges are server counts for the same filter set, so they can
  // never disagree with the list they filter.
  useEffect(() => {
    let cancelled = false
    const base: ListingsQueryParams = { ...paramsRef.current, category: undefined }
    fetchCategoryCounts(base).then((counts) => {
      if (!cancelled) setCategoryCounts(counts)
    })
    return () => {
      cancelled = true
    }
  }, [queryKey])

  const handleEndReached = useCallback(() => {
    if (loading || refreshing || loadingMore || !hasMore) return
    fetchListings(false)
  }, [loading, refreshing, loadingMore, hasMore, fetchListings])

  const onRefresh = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    setRefreshing(true)
    const startTime = Date.now()

    await Promise.all([
      fetchListings(),
      fetchFavoriteIds().catch(() => ({})),
    ])

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
      const user = getSyncAuthUser()
      if (!user) {
        openLoginScreen(router, { redirectTo: '/(tabs)/listings', reason: 'favorite' })
        return
      }

      const res = await toggleFavorite(id)
      if (res.requiresAuth) {
        openLoginScreen(router, { redirectTo: '/(tabs)/listings', reason: 'favorite' })
      }
    },
    [router, toggleFavorite]
  )

  const renderItem = useCallback(
    ({ item }: { item: Listing }) => (
      <ListingCard
        listing={item}
        isFavorite={Boolean(favorites[item.id])}
        onToggleFavorite={handleToggleFavorite}
      />
    ),
    [favorites, handleToggleFavorite]
  )

  const activeFiltersCount = countActiveFilters(filters)

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Katalogu i Pronave</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          {total === null
            ? 'Duke ngarkuar pronat…'
            : `${total} ${total === 1 ? 'pronë e disponueshme' : 'prona të disponueshme'}`}
        </Text>
      </View>

      <Animated.FlatList
        onScroll={tabBarScrollHandler}
        scrollEventThrottle={16}
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        initialNumToRender={5}
        windowSize={5}
        maxToRenderPerBatch={5}
        removeClippedSubviews={Platform.OS !== 'web'}
        keyboardShouldPersistTaps="handled"
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary, colors.gold]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListHeaderComponent={<>
        {/* Search & Filter Row */}
        <View style={styles.searchRow}>
          <TactilePressable
            style={[
              styles.searchBar,
              {
                borderColor: colors.searchBorder,
              },
            ]}
            onPress={() => {
              router.push({
                pathname: '/search' as any,
                params: filters.searchQuery ? { initialQuery: filters.searchQuery } : {},
              })
            }}
            activeScale={0.98}
            haptic="light"
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
          </TactilePressable>

          {/* Unified Filter Trigger Button */}
          <TactilePressable
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
                    : colors.border,
                borderWidth: 0.5,
              },
            ]}
            onPress={() => {
              setShowFilterModal(true)
            }}
            activeScale={0.94}
            haptic="selection"
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
                    ? '#071C18'
                    : '#FFFFFF'
                  : colors.textPrimary
              }
              strokeWidth={2.2}
            />
            {activeFiltersCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.gold }]}>
                <Text
                  style={[
                    styles.filterBadgeText,
                    { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
                  ]}
                >
                  {activeFiltersCount}
                </Text>
              </View>
            )}
          </TactilePressable>

          {/* Saved searches */}
          <TactilePressable
            style={[
              styles.filterButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 0.5,
              },
            ]}
            onPress={() => setShowSavedSearches(true)}
            activeScale={0.94}
            haptic="selection"
          >
            <Bookmark size={18} color={colors.textPrimary} strokeWidth={2.2} />
          </TactilePressable>
        </View>

        <SavedSearchesSheet
          visible={showSavedSearches}
          onClose={() => setShowSavedSearches(false)}
          current={savedSearchSnapshot}
          router={router}
        />
        <PropertyFilterBar
          transactionType={filters.transactionType}
          onChangeTransactionType={(t) => {
            const nextFilters = { ...filters, transactionType: t }
            const nextParams = toListingsQueryParams(nextFilters)
            const nextKey = JSON.stringify(nextParams)
            const cachedHit = getCachedQueryListings(nextKey)
            if (cachedHit && cachedHit.rows.length > 0) {
              setListings(cachedHit.rows)
              setTotal(cachedHit.total)
            } else {
              const allCached = getCachedListings()
              if (allCached.length > 0) {
                const optimistic = filterCachedListingsOptimistic(allCached, nextParams)
                setListings(optimistic)
                setTotal(optimistic.length)
              }
            }
            setFilters(nextFilters)
          }}
          selectedCategory={filters.category}
          onChangeCategory={(c) => {
            const nextFilters = { ...filters, category: c }
            const nextParams = toListingsQueryParams(nextFilters)
            const nextKey = JSON.stringify(nextParams)
            const cachedHit = getCachedQueryListings(nextKey)
            if (cachedHit && cachedHit.rows.length > 0) {
              setListings(cachedHit.rows)
              setTotal(cachedHit.total)
            } else {
              const allCached = getCachedListings()
              if (allCached.length > 0) {
                const optimistic = filterCachedListingsOptimistic(allCached, nextParams)
                setListings(optimistic)
                setTotal(optimistic.length)
              }
            }
            setFilters(nextFilters)
          }}
          categoryCounts={categoryCounts}
        />

        {/* Section Header with Integrated Compact Expandable Sort Control */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {filters.category === 'all'
                ? 'Të gjitha pronat'
                : CATEGORY_ITEMS.find((c) => c.id === filters.category)?.label || 'Prona'}
            </Text>
            <View
              style={[
                styles.resultCountBadge,
                {
                  backgroundColor:
                    theme === 'green'
                      ? 'rgba(212, 175, 55, 0.16)'
                      : theme === 'white'
                      ? 'rgba(0, 103, 91, 0.08)'
                      : 'rgba(255, 255, 255, 0.10)',
                  borderColor:
                    theme === 'green'
                      ? 'rgba(212, 175, 55, 0.30)'
                      : theme === 'white'
                      ? 'rgba(0, 103, 91, 0.14)'
                      : 'rgba(255, 255, 255, 0.14)',
                },
              ]}
            >
              {/* Exact server total for the active filters — never the window size. */}
              <Text
                style={[
                  styles.resultCountText,
                  {
                    color: theme === 'green' ? colors.gold : colors.primary,
                  },
                ]}
              >
                {total ?? '…'}
              </Text>
            </View>
          </View>

          <View style={styles.sectionActionsRow}>
            {activeFiltersCount > 0 && (
              <TactilePressable
                onPress={() => {
                  setFilters({
                    ...DEFAULT_FILTER_STATE,
                    transactionType: filters.transactionType,
                    category: filters.category,
                  })
                }}
                hitSlop={8}
                activeScale={0.94}
                haptic="light"
                style={[
                  styles.resetPill,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
              >
                <RotateCcw size={11} color={colors.primary} strokeWidth={2.4} />
                <Text style={[styles.resetLink, { color: colors.primary }]}>Pastro</Text>
              </TactilePressable>
            )}

            {/* Apple/Linear-Grade Expandable Sort Trigger */}
            <TactilePressable
              style={[
                styles.sortSelectorPill,
                {
                  backgroundColor: isCustomSort
                    ? theme === 'green'
                      ? 'rgba(212, 175, 55, 0.16)'
                      : 'rgba(0, 103, 91, 0.10)'
                    : theme === 'white'
                    ? '#FFFFFF'
                    : colors.surface,
                  borderColor: isCustomSort
                    ? theme === 'green'
                      ? colors.gold
                      : colors.primary
                    : colors.border,
                },
              ]}
              onPress={() => setShowSortSheet(true)}
              activeScale={0.95}
              haptic="selection"
              hitSlop={6}
            >
              <ArrowDownUp
                size={13}
                color={
                  isCustomSort
                    ? theme === 'green'
                      ? colors.gold
                      : colors.primary
                    : colors.textSecondary
                }
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.sortSelectorText,
                  {
                    color: isCustomSort
                      ? theme === 'green'
                        ? colors.gold
                        : colors.primary
                      : colors.textPrimary,
                    fontFamily: isCustomSort ? Fonts.bold : Fonts.semiBold,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {currentSortOption.shortLabel}
              </Text>
              <ChevronDown
                size={12}
                color={
                  isCustomSort
                    ? theme === 'green'
                      ? colors.gold
                      : colors.primary
                    : colors.textMuted
                }
                strokeWidth={2.2}
              />
            </TactilePressable>
          </View>
        </View>

        {/* Listings Feed */}
        {loading && listings.length === 0 ? (
          <ListingFeedSkeleton count={4} />
        ) : listings.length === 0 ? (
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
              Provoni të ndryshoni filtrat ose pastroni kriteret e kërkimit.
            </Text>
            <TactilePressable
              style={[
                styles.resetButton,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              hitSlop={8}
              activeScale={0.95}
              haptic="light"
              onPress={() => {
                setFilters(DEFAULT_FILTER_STATE)
              }}
            >
              <Text style={[styles.resetButtonText, { color: colors.primary }]}>
                Pastro të gjitha filtrat
              </Text>
            </TactilePressable>
          </View>
        ) : null}
        </>}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadMoreFooter}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />


      {/* Comprehensive Property Filter Modal */}
      <PropertyFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApply={(updated) => setFilters(updated)}
      />

      {/* Native Expandable Sort Bottom Sheet */}
      <SortBottomSheet
        isOpen={showSortSheet}
        onClose={() => setShowSortSheet(false)}
        currentSort={filters.sortBy}
        onSelectSort={(newSort) => {
          setFilters((prev) => ({ ...prev, sortBy: newSort }))
        }}
      />
    </View>
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
    paddingTop: 4,
    paddingBottom: 115,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 8,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    marginTop: 2,
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
    color: '#071C18',
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.4,
  },
  resultCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultCountText: {
    fontSize: 11.5,
    fontFamily: Fonts.bold,
  },
  sectionActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  resetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  resetLink: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  sortSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6.5,
    borderRadius: 12,
    borderWidth: 0.5,
    flexShrink: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sortSelectorText: {
    fontSize: 12.5,
    letterSpacing: -0.2,
    flexShrink: 1,
    maxWidth: '60%',
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
  loadMoreFooter: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
