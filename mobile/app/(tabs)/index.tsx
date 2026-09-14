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
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Search, SlidersHorizontal, Building2, Home, Trees, Briefcase, Warehouse, Sparkles } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { BrandColors } from '@/constants/Colors'
import { supabase, Listing } from '@/lib/supabase'
import { ListingCard } from '@/components/ListingCard'

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
        .limit(20)

      if (transactionType !== 'all') {
        query = query.eq('type', transactionType)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching listings:', error)
      } else if (data) {
        setListings(data as Listing[])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [transactionType])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  const onRefresh = () => {
    setRefreshing(true)
    fetchListings()
  }

  const handleCategoryPress = (catId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync()
    }
    setSelectedCategory(catId)
  }

  const handleTransactionChange = (type: 'all' | 'shitje' | 'qira') => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync()
    }
    setTransactionType(type)
  }

  const handleToggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Filter listings locally for search / category
  const filteredListings = listings.filter((item) => {
    if (selectedCategory !== 'all') {
      if (item.apartment_type && !item.apartment_type.toLowerCase().includes(selectedCategory)) {
        // match category loosely
      }
    }
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F7F7" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BrandColors.primary}
            colors={[BrandColors.primary]}
          />
        }
      >
        {/* Header Branding */}
        <View style={styles.header}>
          <View>
            <View style={styles.logoRow}>
              <Text style={styles.logoTextMain}>Bleje</Text>
              <Text style={styles.logoTextAccent}>Pronën</Text>
            </View>
            <Text style={styles.subtitle}>Gjej pronën tënde ideale në Kosovë</Text>
          </View>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>KOSOVË</Text>
          </View>
        </View>

        {/* Search & Filter Bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Search size={18} color={BrandColors.textMuted} strokeWidth={2.2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Qyteti, lagjja ose titulli..."
              placeholderTextColor={BrandColors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable
            style={styles.filterButton}
            onPress={() => router.push('/listings' as any)}
          >
            <SlidersHorizontal size={18} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* Transaction Type Selector (Shitje / Qira) */}
        <View style={styles.transactionTabs}>
          {(['all', 'shitje', 'qira'] as const).map((type) => {
            const isActive = transactionType === type
            const label = type === 'all' ? 'Të gjitha' : type === 'shitje' ? 'Në Shitje' : 'Me Qira'
            return (
              <Pressable
                key={type}
                style={[styles.transactionTab, isActive && styles.transactionTabActive]}
                onPress={() => handleTransactionChange(type)}
              >
                <Text style={[styles.transactionTabText, isActive && styles.transactionTabTextActive]}>
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
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => handleCategoryPress(item.id)}
              >
                <Icon
                  size={16}
                  color={isSelected ? '#FFFFFF' : BrandColors.primary}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
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
          <Text style={styles.sectionTitle}>Pronat e fundit</Text>
          <Pressable onPress={() => router.push('/listings' as any)}>
            <Text style={styles.sectionLink}>Shiko të gjitha</Text>
          </Pressable>
        </View>

        {/* Listings Feed */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={BrandColors.primary} />
            <Text style={styles.loaderText}>Duke ngarkuar pronat...</Text>
          </View>
        ) : filteredListings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Building2 size={40} color={BrandColors.textLight} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Nuk u gjet asnjë pronë</Text>
            <Text style={styles.emptySubtitle}>
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
    backgroundColor: '#F2F7F7',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  logoTextMain: {
    fontSize: 24,
    fontWeight: '900',
    color: BrandColors.primary,
    letterSpacing: -0.5,
  },
  logoTextAccent: {
    fontSize: 24,
    fontWeight: '900',
    color: BrandColors.gold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: BrandColors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  brandBadge: {
    backgroundColor: 'rgba(0, 100, 89, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 100, 89, 0.2)',
  },
  brandBadgeText: {
    color: BrandColors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: BrandColors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionTabs: {
    flexDirection: 'row',
    backgroundColor: '#E5EBEB',
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
  transactionTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.textMuted,
  },
  transactionTabTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  categoriesScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  categoryPillActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: BrandColors.textMuted,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BrandColors.border,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: BrandColors.textMuted,
    textAlign: 'center',
  },
})
