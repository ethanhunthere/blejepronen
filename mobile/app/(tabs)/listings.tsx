import React, { useState, useEffect, useCallback } from 'react'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Search,
  SlidersHorizontal,
  X,
  Check,
  Building2,
  ArrowUpDown,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase, Listing } from '@/lib/supabase'
import { ListingCard } from '@/components/ListingCard'
import { KOSOVO_LOCATIONS } from '@/lib/kosovo-locations'

const CITIES = Object.keys(KOSOVO_LOCATIONS)

export default function ListingsScreen() {
  const { colors, theme } = useTheme()

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('')
  const [selectedType, setSelectedType] = useState<'all' | 'shitje' | 'qira'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase.from('listings').select('*')

      if (selectedType !== 'all') {
        query = query.eq('type', selectedType)
      }

      if (selectedCity) {
        query = query.eq('city', selectedCity)
      }

      if (selectedNeighborhood) {
        query = query.eq('neighborhood', selectedNeighborhood)
      }

      if (sortBy === 'price_asc') {
        query = query.order('price', { ascending: true })
      } else if (sortBy === 'price_desc') {
        query = query.order('price', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query

      if (error) {
        console.warn('Listings query notice:', error.message)
      } else if (data) {
        setListings(data as Listing[])
      }
    } catch (err: any) {
      console.warn('Listings catch notice:', err?.message || err)
    } finally {
      setLoading(false)
    }
  }, [selectedType, selectedCity, selectedNeighborhood, sortBy])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  const handleToggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const resetFilters = () => {
    setSelectedCity('')
    setSelectedNeighborhood('')
    setSelectedType('all')
    setSortBy('newest')
  }

  const activeFiltersCount =
    (selectedCity ? 1 : 0) +
    (selectedNeighborhood ? 1 : 0) +
    (selectedType !== 'all' ? 1 : 0)

  const displayedListings = listings.filter((item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      item.title?.toLowerCase().includes(q) ||
      item.city?.toLowerCase().includes(q) ||
      item.neighborhood?.toLowerCase().includes(q)
    )
  })

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Eksploro Pronat</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          {displayedListings.length} prona të disponueshme në Kosovë
        </Text>
      </View>

      {/* Search and Filter Trigger */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.searchBg, borderColor: colors.searchBorder },
          ]}
        >
          <Search size={18} color={colors.textMuted} strokeWidth={2.2} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Kërko me fjalë kyçe..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textLight} />
            </Pressable>
          )}
        </View>

        <Pressable
          style={[
            styles.filterButton,
            {
              backgroundColor: activeFiltersCount > 0 ? colors.primary : colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <SlidersHorizontal
            size={18}
            color={
              activeFiltersCount > 0
                ? theme === 'green'
                  ? '#003E37'
                  : '#FFFFFF'
                : colors.primary
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

      {/* Quick Filter Tags Bar */}
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
                onPress={() => setSelectedType(t)}
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
              <Text style={[styles.quickTagText, { color: colors.chipTextActive, fontFamily: Fonts.bold }]}>
                {selectedCity}
              </Text>
              <X size={12} color={colors.chipTextActive} />
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.quickTag, { backgroundColor: colors.chipBg, borderColor: colors.border }]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              setSortBy((prev) =>
                prev === 'newest' ? 'price_asc' : prev === 'price_asc' ? 'price_desc' : 'newest'
              )
            }}
          >
            <ArrowUpDown size={12} color={colors.textSecondary} />
            <Text style={[styles.quickTagText, { color: colors.textSecondary }]}>
              {sortBy === 'newest'
                ? 'Më të rejat'
                : sortBy === 'price_asc'
                ? 'Çmimi ↑'
                : 'Çmimi ↓'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Listings List */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Duke përditësuar listën...
            </Text>
          </View>
        ) : displayedListings.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Building2 size={44} color={colors.textLight} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Nuk u gjet asnjë pronë
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Nuk ka prona që përputhen me kriteret tuaja aktuale.
            </Text>
            <Pressable
              style={[styles.resetButton, { backgroundColor: colors.primaryLight }]}
              onPress={resetFilters}
            >
              <Text style={[styles.resetButtonText, { color: colors.primary }]}>Pastro filtrat</Text>
            </Pressable>
          </View>
        ) : (
          displayedListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorite={!!favorites[listing.id]}
              onToggleFavorite={handleToggleFavorite}
            />
          ))
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Filtro Pronat</Text>
            <Pressable style={styles.modalCloseButton} onPress={() => setShowFilterModal(false)}>
              <X size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
            {/* City Selection */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                Qyteti në Kosovë
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                <Pressable
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedCity === '' ? colors.chipActiveBg : colors.surfaceSubtle,
                    },
                  ]}
                  onPress={() => {
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
                    Të gjitha
                  </Text>
                </Pressable>
                {CITIES.map((city) => {
                  const isCityActive = selectedCity === city
                  return (
                    <Pressable
                      key={city}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isCityActive ? colors.chipActiveBg : colors.surfaceSubtle,
                        },
                      ]}
                      onPress={() => {
                        setSelectedCity(city)
                        setSelectedNeighborhood('')
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isCityActive ? colors.chipTextActive : colors.textSecondary },
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

            {/* Neighborhoods (Cascading from City) */}
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
                            backgroundColor: isSelected ? colors.chipActiveBg : colors.surfaceSubtle,
                          },
                        ]}
                        onPress={() => setSelectedNeighborhood(isSelected ? '' : n)}
                      >
                        <Text
                          style={[
                            styles.neighborhoodChipText,
                            { color: isSelected ? colors.chipTextActive : colors.textSecondary },
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

            {/* Transaction Type */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                Lloji i ofertës
              </Text>
              <View style={[styles.buttonGroup, { backgroundColor: colors.surfaceSubtle }]}>
                {(['all', 'shitje', 'qira'] as const).map((t) => {
                  const isAct = selectedType === t
                  const label = t === 'all' ? 'Të gjitha' : t === 'shitje' ? 'Në Shitje' : 'Me Qira'
                  return (
                    <Pressable
                      key={t}
                      style={[
                        styles.groupButton,
                        isAct && {
                          backgroundColor: colors.surface,
                          shadowColor: '#000',
                          shadowOpacity: 0.1,
                        },
                      ]}
                      onPress={() => setSelectedType(t)}
                    >
                      <Text
                        style={[
                          styles.groupButtonText,
                          { color: isAct ? colors.textPrimary : colors.textMuted },
                          isAct && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.borderSubtle }]}>
            <Pressable style={styles.modalResetButton} onPress={resetFilters}>
              <Text style={[styles.modalResetButtonText, { color: colors.textMuted }]}>
                Pastro gjithçka
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modalApplyButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowFilterModal(false)}
            >
              <Text
                style={[
                  styles.modalApplyButtonText,
                  { color: theme === 'green' ? '#003E37' : '#FFFFFF' },
                ]}
              >
                Zbato filtrat
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
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    height: 46,
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
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#101828',
    fontSize: 10,
    fontFamily: Fonts.black,
  },
  quickTagsBar: {
    paddingBottom: 8,
  },
  quickTagsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    padding: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 20,
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
  resetButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  resetButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
    gap: 24,
  },
  modalSection: {
    gap: 12,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
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
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  neighborhoodChipText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  buttonGroup: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
  },
  groupButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  groupButtonText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  modalResetButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  modalResetButtonText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  modalApplyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalApplyButtonText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
})
