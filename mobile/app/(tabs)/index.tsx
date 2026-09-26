import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import {
  Search,
  X,
  SlidersHorizontal,
  Building2,
  Sparkles,
  Star,
  MapPin,
  Maximize2,
  ChevronRight,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase, Listing } from '@/lib/supabase'
import { fetchFavoriteIds, persistFavoriteToggle } from '@/lib/favorites'
import { ListingCard } from '@/components/ListingCard'
import { ListingFeedSkeleton } from '@/components/ListingSkeleton'
import { Logo } from '@/components/Logo'
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
import {
  getCachedListings,
  hasCachedListings,
  setCachedListings,
  subscribeCachedListings,
} from '@/lib/listings-cache'
import { getSyncAuthUser } from '@/lib/auth-cache'
import { TactilePressable } from '@/components/motion'
import { FavoriteButton } from '@/components/FavoriteButton'

const KOSOVO_METROS = [
  { id: '', label: 'Të gjitha' },
  { id: 'Prishtinë', label: 'Prishtinë' },
  { id: 'Fushë Kosovë', label: 'Fushë Kosovë' },
  { id: 'Prizren', label: 'Prizren' },
  { id: 'Ferizaj', label: 'Ferizaj' },
  { id: 'Pejë', label: 'Pejë' },
  { id: 'Gjilan', label: 'Gjilan' },
  { id: 'Mitrovicë', label: 'Mitrovicë' },
  { id: 'Gjakovë', label: 'Gjakovë' },
]

const TopBarHeader = React.memo(function TopBarHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.headerBrandRow}>
        <Logo size={34} />
      </View>
    </View>
  )
})

const FeaturedPropertyCard = React.memo(function FeaturedPropertyCard({
  item,
  isFavorite,
  onToggleFavorite,
  onPress,
}: {
  item: Listing
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onPress: () => void
}) {
  const { colors, theme } = useTheme()
  const isSale = item.type === 'shitje'
  const mainImage =
    item.images?.[0] ||
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'

  const pricePerM2 =
    isSale && item.price && item.area_m2 && item.area_m2 > 0
      ? Math.round(item.price / item.area_m2)
      : null

  return (
    <TactilePressable
      style={[
        styles.featuredCard,
        {
          backgroundColor: colors.surface,
          borderColor: theme === 'green' ? 'rgba(212, 175, 55, 0.35)' : colors.border,
          shadowColor: theme === 'black' ? '#000' : theme === 'green' ? '#030D0B' : '#0F172A',
        },
      ]}
      onPress={onPress}
      activeScale={0.97}
      haptic="selection"
    >
      <View style={[styles.featuredImgWrapper, { backgroundColor: colors.surfaceSubtle }]}>
        <Image
          source={{ uri: mainImage }}
          style={styles.featuredImg}
          contentFit="cover"
          transition={150}
          priority="high"
          cachePolicy="memory-disk"
        />

        {/* Top Floating Badges */}
        <View style={styles.featuredTopBadges}>
          <View style={[styles.featuredGoldBadge, { backgroundColor: colors.gold }]}>
            <Star
              size={10}
              color={theme === 'green' ? '#071C18' : '#3E2A00'}
              fill={theme === 'green' ? '#071C18' : '#3E2A00'}
            />
            <Text
              style={[
                styles.featuredGoldBadgeText,
                { color: theme === 'green' ? '#071C18' : '#3E2A00' },
              ]}
            >
              E Veçuar
            </Text>
          </View>

          <View style={styles.featuredFavoriteWrap}>
            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={() => onToggleFavorite(item.id)}
              size={32}
              iconSize={15}
              variant="light"
            />
          </View>
        </View>

        {/* Bottom Price Tag */}
        <View style={styles.featuredPriceOverlay}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 70 : 100}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.featuredPriceText}>
            {new Intl.NumberFormat('de-DE').format(item.price)} €
            {item.type === 'qira' ? (
              <Text style={styles.featuredPricePeriod}>/muaj</Text>
            ) : null}
          </Text>
          {pricePerM2 ? (
            <Text style={styles.featuredM2Text}>
              ≈ {new Intl.NumberFormat('de-DE').format(pricePerM2)} €/m²
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.featuredBody}>
        <Text style={[styles.featuredTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.title}
        </Text>

        <View style={styles.featuredMetaRow}>
          <View style={styles.featuredLocRow}>
            <MapPin size={12} color={colors.primary} strokeWidth={2.4} />
            <Text
              style={[styles.featuredLocText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {item.neighborhood ? `${item.neighborhood}, ${item.city}` : item.city}
            </Text>
          </View>

          {item.area_m2 > 0 && (
            <View
              style={[styles.featuredAreaBadge, { backgroundColor: colors.surfaceSubtle }]}
            >
              <Maximize2 size={10} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.featuredAreaText, { color: colors.textPrimary }]}>
                {item.area_m2} m²
              </Text>
            </View>
          )}
        </View>
      </View>
    </TactilePressable>
  )
})

export default function HomeScreen() {
  const router = useRouter()
  const { colors, theme } = useTheme()
  const insets = useSafeAreaInsets()

  const [filters, setFilters] = useState<PropertyFilterState>(DEFAULT_FILTER_STATE)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [listings, setListings] = useState<Listing[]>(() => getCachedListings())
  const [loading, setLoading] = useState(() => !hasCachedListings())
  const [refreshing, setRefreshing] = useState(false)
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})

  // Instant sync with shared cache updates
  useEffect(() => {
    const cached = getCachedListings()
    if (cached.length > 0 && listings.length === 0) {
      setListings(cached)
      setLoading(false)
    }

    const unsubscribe = subscribeCachedListings((fresh) => {
      if (filters.transactionType === 'all') {
        setListings(fresh)
        setLoading(false)
      }
    })

    return unsubscribe
  }, [filters.transactionType])

  const fetchListings = useCallback(async () => {
    try {
      let query = supabase
        .from('listings')
        .select(
          'id,title,description,price,city,neighborhood,address,type,images,rooms,area_m2,floor,apartment_type,is_featured,is_active,created_at,user_id,condition,features'
        )
        .order('created_at', { ascending: false })
        .limit(80)

      if (filters.transactionType !== 'all') {
        query = query.eq('type', filters.transactionType)
      }

      const { data, error } = await query

      if (error) {
        console.warn('Listing fetch notice:', error.message)
      } else if (data) {
        setListings(data as unknown as Listing[])
        if (filters.transactionType === 'all') {
          setCachedListings(data as unknown as Listing[])
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
      const user = getSyncAuthUser()
      if (!user) {
        router.push({ pathname: '/modal', params: { initialTab: 'login', reason: 'favorite' } })
        return
      }

      let wasFavorite = false
      setFavorites((prev) => {
        wasFavorite = Boolean(prev[id])
        return { ...prev, [id]: !wasFavorite }
      })

      const ok = await persistFavoriteToggle(id, wasFavorite)
      if (!ok) {
        setFavorites((prev) => ({ ...prev, [id]: wasFavorite }))
      }
    },
    [router]
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

  // Filtered listings
  const filteredListings = useMemo(() => {
    return filterAndSortListings(listings, filters)
  }, [listings, filters])

  // Featured luxury listings
  const featuredListings = useMemo(() => {
    return listings.filter((l) => l.is_featured)
  }, [listings])

  const activeFiltersCount = countActiveFilters(filters)

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Bar Header with Official Logo */}
      <TopBarHeader />

      <FlatList
        data={filteredListings}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary, colors.gold]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListHeaderComponent={
          <>
            {/* 1. Global Search & Filter Bar Row */}
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

              {/* Filter Trigger Button */}
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
                      activeFiltersCount > 0 ? colors.primary : colors.border,
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
            </View>

            {/* 2. Kosovo Metros Quick Selection Strip */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.citiesScrollContent}
              style={styles.citiesScroll}
            >
              {KOSOVO_METROS.map((city) => {
                const isSelected = filters.city === city.id
                return (
                  <TactilePressable
                    key={city.id || 'all'}
                    style={[
                      styles.cityChip,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : theme === 'white'
                          ? '#FFFFFF'
                          : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setFilters((prev) => ({
                        ...prev,
                        city: prev.city === city.id ? '' : city.id,
                      }))
                    }}
                    activeScale={0.94}
                    haptic="selection"
                  >
                    <Text
                      style={[
                        styles.cityChipText,
                        {
                          color: isSelected
                            ? theme === 'green'
                              ? '#071C18'
                              : '#FFFFFF'
                            : colors.textSecondary,
                          fontFamily: isSelected ? Fonts.bold : Fonts.medium,
                        },
                      ]}
                    >
                      {city.label}
                    </Text>
                  </TactilePressable>
                )
              })}
            </ScrollView>

            {/* 3. Transaction Toggle & Category Selector */}
            <PropertyFilterBar
              transactionType={filters.transactionType}
              onChangeTransactionType={(t) =>
                setFilters((prev) => ({ ...prev, transactionType: t }))
              }
              selectedCategory={filters.category}
              onChangeCategory={(c) => setFilters((prev) => ({ ...prev, category: c }))}
              categoryCounts={categoryCounts}
            />

            {/* 4. Featured Properties Luxury Horizontal Showcase */}
            {featuredListings.length > 0 && filters.category === 'all' && !filters.city && (
              <View style={styles.featuredSection}>
                <View style={styles.featuredSectionHeader}>
                  <View style={styles.featuredTitleRow}>
                    <Sparkles
                      size={16}
                      color={theme === 'green' ? colors.gold : colors.primary}
                      strokeWidth={2.4}
                    />
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: colors.textPrimary, marginBottom: 0 },
                      ]}
                    >
                      Pronat e Veçuara
                    </Text>
                    <View
                      style={[
                        styles.featuredCounterBadge,
                        { backgroundColor: colors.surfaceSubtle },
                      ]}
                    >
                      <Text
                        style={[
                          styles.featuredCounterText,
                          { color: theme === 'green' ? colors.gold : colors.primary },
                        ]}
                      >
                        {featuredListings.length}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => {
                      router.push({
                        pathname: '/(tabs)/listings' as any,
                        params: { isFeatured: 'true' },
                      })
                    }}
                    hitSlop={8}
                  >
                    <Text style={[styles.sectionLink, { color: colors.primary }]}>
                      Shiko të gjitha
                    </Text>
                  </Pressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredScrollContent}
                  decelerationRate="fast"
                  snapToInterval={286}
                  snapToAlignment="start"
                >
                  {featuredListings.map((item) => (
                    <FeaturedPropertyCard
                      key={item.id}
                      item={item}
                      isFavorite={Boolean(favorites[item.id])}
                      onToggleFavorite={handleToggleFavorite}
                      onPress={() => {
                        router.push(`/listings/${item.id}` as any)
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 5. Section Header & Dynamic Results Count */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {filters.city
                    ? `Prona në ${filters.city}`
                    : filters.category === 'all'
                    ? 'Të rejat më të fundit'
                    : `Pronat: ${
                        CATEGORY_ITEMS.find((c) => c.id === filters.category)?.label || ''
                      }`}
                </Text>
                <View
                  style={[
                    styles.activeCategoryBadge,
                    { backgroundColor: colors.chipActiveBg },
                  ]}
                >
                  <Text
                    style={[
                      styles.activeCategoryBadgeText,
                      { color: colors.chipTextActive },
                    ]}
                  >
                    {filteredListings.length}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  router.push({
                    pathname: '/(tabs)/listings' as any,
                    params: {
                      category: filters.category,
                      type: filters.transactionType,
                      search: filters.searchQuery,
                      city: filters.city,
                    },
                  })
                }}
                hitSlop={10}
              >
                <Text style={[styles.sectionLink, { color: colors.primary }]}>
                  Katalogu i plotë
                </Text>
              </Pressable>
            </View>

            {/* Empty State */}
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
                  Provoni të pastroni filtrat ose të zgjidhni një qytet apo kategori tjetër.
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
                  activeScale={0.95}
                  haptic="light"
                  onPress={() => {
                    setFilters(DEFAULT_FILTER_STATE)
                  }}
                >
                  <Text style={[styles.resetButtonText, { color: colors.primary }]}>
                    Pastro të gjithë filtrat
                  </Text>
                </TactilePressable>
              </View>
            ) : null}
          </>
        }
      />

      {/* Comprehensive Property Filter Modal */}
      <PropertyFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApply={(updated) => setFilters(updated)}
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
    paddingTop: 6,
    paddingBottom: 115,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 8,
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    width: '100%',
  },
  searchBar: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 0.5,
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
    fontSize: 13.5,
    fontFamily: Fonts.medium,
  },
  searchClearBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButton: {
    width: 48,
    height: 48,
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
  citiesScroll: {
    marginBottom: 10,
    marginHorizontal: -16,
  },
  citiesScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  cityChipText: {
    fontSize: 12.5,
    letterSpacing: -0.2,
  },
  featuredSection: {
    marginTop: 14,
    marginBottom: 8,
  },
  featuredSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  featuredTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredCounterBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  featuredCounterText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  featuredScrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  featuredCard: {
    width: 274,
    borderRadius: 18,
    borderWidth: 0.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  featuredImgWrapper: {
    width: '100%',
    height: 155,
    position: 'relative',
  },
  featuredImg: {
    width: '100%',
    height: '100%',
  },
  featuredTopBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  featuredGoldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featuredGoldBadgeText: {
    fontSize: 10.5,
    fontFamily: Fonts.bold,
  },
  featuredFavoriteWrap: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  featuredPriceOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  featuredPriceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.black,
  },
  featuredPricePeriod: {
    fontSize: 10,
    fontFamily: Fonts.medium,
  },
  featuredM2Text: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
    fontFamily: Fonts.medium,
    marginTop: 1,
  },
  featuredBody: {
    padding: 12,
    gap: 6,
  },
  featuredTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  featuredMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  featuredLocText: {
    fontSize: 11.5,
    fontFamily: Fonts.medium,
    flex: 1,
  },
  featuredAreaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredAreaText: {
    fontSize: 10.5,
    fontFamily: Fonts.semiBold,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16.5,
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
    fontSize: 12.5,
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
