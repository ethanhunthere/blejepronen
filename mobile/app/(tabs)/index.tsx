import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Search, SlidersHorizontal, Building2, Home, Trees, Briefcase, Warehouse, Sparkles } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase, Listing } from '@/lib/supabase'
import { ListingCard } from '@/components/ListingCard'
import { Logo } from '@/components/Logo'

const CATEGORY_ITEMS = [
  { id: 'all', label: 'Të gjitha', icon: Sparkles },
  { id: 'banese', label: 'Banesa', icon: Building2 },
  { id: 'shtepi', label: 'Shtëpi', icon: Home },
  { id: 'vile', label: 'Vila', icon: Home },
  { id: 'toke', label: 'Toka', icon: Trees },
  { id: 'lokal', label: 'Lokale', icon: Briefcase },
  { id: 'garazh', label: 'Garazha', icon: Warehouse },
]

export default function HomeScreen() {
  const router = useRouter()
  const { colors, theme } = useTheme()

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [transactionType, setTransactionType] = useState<'all' | 'shitje' | 'qira'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})

  const fetchListings = useCallback(async () => {
    try {
      let query = supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25)

      if (transactionType !== 'all') {
        query = query.eq('type', transactionType)
      }

      const { data, error } = await query

      if (error) {
        console.warn('Listing fetch notice:', error.message)
      } else if (data) {
        setListings(data as Listing[])
      }
    } catch (err: any) {
      console.warn('Listing catch notice:', err?.message || err)
    } finally {
      setLoading(false)
    }
  }, [transactionType])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  const onRefresh = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    setRefreshing(true)
    const startTime = Date.now()

    await fetchListings()

    // Optimized snappy UX duration: 650ms for responsive, crisp refresh
    const elapsed = Date.now() - startTime
    if (elapsed < 650) {
      await new Promise((resolve) => setTimeout(resolve, 650 - elapsed))
    }

    setRefreshing(false)
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  const handleCategoryPress = (catId: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setSelectedCategory(catId)
  }

  const handleTransactionChange = (type: 'all' | 'shitje' | 'qira') => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setTransactionType(type)
  }

  const handleToggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const filteredListings = listings.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const titleMatch = item.title?.toLowerCase().includes(q)
      const cityMatch = item.city?.toLowerCase().includes(q)
      const neighborhoodMatch = item.neighborhood?.toLowerCase().includes(q)
      return titleMatch || cityMatch || neighborhoodMatch
    }
    return true
  })

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Bar Header with Official Logo - Identical padding across all tabs */}
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
        {/* Search & Filter Bar */}
        <View style={styles.searchBarContainer}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.searchBg, borderColor: colors.searchBorder },
            ]}
          >
            <Search size={18} color={colors.textMuted} strokeWidth={2.2} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Qyteti, lagjja ose titulli..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable
            style={[styles.filterButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/listings' as any)}
          >
            <SlidersHorizontal
              size={18}
              color={theme === 'green' ? '#003E37' : '#FFFFFF'}
              strokeWidth={2.2}
            />
          </Pressable>
        </View>

        {/* Transaction Type Selector (Shitje / Qira) */}
        <View style={[styles.transactionTabs, { backgroundColor: colors.surfaceSubtle }]}>
          {(['all', 'shitje', 'qira'] as const).map((type) => {
            const isActive = transactionType === type
            const label = type === 'all' ? 'Të gjitha' : type === 'shitje' ? 'Në Shitje' : 'Me Qira'
            return (
              <Pressable
                key={type}
                style={[
                  styles.transactionTab,
                  isActive && {
                    backgroundColor: colors.surface,
                    shadowColor: '#000',
                    shadowOpacity: theme === 'black' ? 0.3 : 0.08,
                  },
                ]}
                onPress={() => handleTransactionChange(type)}
              >
                <Text
                  style={[
                    styles.transactionTabText,
                    { color: isActive ? colors.textPrimary : colors.textMuted },
                    isActive && { fontFamily: Fonts.bold },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Categories Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORY_ITEMS.map((item) => {
            const Icon = item.icon
            const isSelected = selectedCategory === item.id
            return (
              <Pressable
                key={item.id}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected ? colors.chipActiveBg : colors.chipBg,
                    borderColor: isSelected ? colors.chipActiveBg : colors.border,
                  },
                ]}
                onPress={() => handleCategoryPress(item.id)}
              >
                <Icon
                  size={16}
                  color={isSelected ? colors.chipTextActive : colors.primary}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: isSelected ? colors.chipTextActive : colors.textSecondary },
                    isSelected && { fontFamily: Fonts.bold },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pronat e fundit</Text>
          <Pressable onPress={() => router.push('/listings' as any)}>
            <Text style={[styles.sectionLink, { color: colors.primary }]}>Shiko të gjitha</Text>
          </Pressable>
        </View>

        {/* Listings Feed */}
        {loading && listings.length === 0 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loaderText, { color: colors.textMuted }]}>
              Duke ngarkuar pronat...
            </Text>
          </View>
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
              Provoni të ndryshoni filtrat ose kërkoni një qytet tjetër.
            </Text>
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
    paddingBottom: 36,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  searchBar: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionTabs: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    marginBottom: 14,
  },
  transactionTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  transactionTabText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  categoriesScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.extraBold,
  },
  sectionLink: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
})
