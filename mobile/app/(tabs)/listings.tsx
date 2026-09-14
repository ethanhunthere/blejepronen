import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Platform,
  StatusBar,
} from 'react-native'
import {
  Search,
  SlidersHorizontal,
  X,
  Check,
  Building2,
  MapPin,
  ArrowUpDown,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { BrandColors } from '@/constants/Colors'
import { supabase, Listing } from '@/lib/supabase'
import { ListingCard } from '@/components/ListingCard'
import { KOSOVO_LOCATIONS } from '@/lib/kosovo-locations'

const CITIES = Object.keys(KOSOVO_LOCATIONS)

export default function ListingsScreen() {
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
        console.error('Error fetching listings:', error)
      } else if (data) {
        setListings(data as Listing[])
      }
    } catch (err) {
      console.error(err)
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

  // Local text search filter
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F7F7" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Eksploro Pronat</Text>
        <Text style={styles.headerSubtitle}>
          {displayedListings.length} prona të disponueshme
        </Text>
      </View>

      {/* Search and Filter Trigger */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Search size={18} color={BrandColors.textMuted} strokeWidth={2.2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Kërko me fjalë kyçe..."
            placeholderTextColor={BrandColors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={16} color={BrandColors.textLight} />
            </Pressable>
          )}
        </View>

        <Pressable
          style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <SlidersHorizontal
            size={18}
            color={activeFiltersCount > 0 ? '#FFFFFF' : BrandColors.primary}
            strokeWidth={2.2}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Quick Filter Tags Bar */}
      <View style={styles.quickTagsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickTagsScroll}>
          {/* Transaction Quick Toggle */}
          {(['all', 'shitje', 'qira'] as const).map((t) => {
            const isSelected = selectedType === t
            const label = t === 'all' ? 'Të gjitha' : t === 'shitje' ? 'Shitje' : 'Qira'
            return (
              <Pressable
                key={t}
                style={[styles.quickTag, isSelected && styles.quickTagSelected]}
                onPress={() => setSelectedType(t)}
              >
                <Text style={[styles.quickTagText, isSelected && styles.quickTagTextSelected]}>
                  {label}
                </Text>
              </Pressable>
            )
          })}

          {/* Active City Tag */}
          {selectedCity ? (
            <Pressable
              style={[styles.quickTag, styles.quickTagSelected]}
              onPress={() => setSelectedCity('')}
            >
              <Text style={styles.quickTagTextSelected}>{selectedCity}</Text>
              <X size={12} color="#FFFFFF" />
            </Pressable>
          ) : null}

          {/* Sort trigger */}
          <Pressable
            style={styles.quickTag}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              setSortBy((prev) =>
                prev === 'newest' ? 'price_asc' : prev === 'price_asc' ? 'price_desc' : 'newest'
              )
            }}
          >
            <ArrowUpDown size={12} color={BrandColors.textSecondary} />
            <Text style={styles.quickTagText}>
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
            <ActivityIndicator size="large" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Duke përditësuar listën...</Text>
          </View>
        ) : displayedListings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Building2 size={44} color={BrandColors.textLight} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Nuk u gjet asnjë pronë</Text>
            <Text style={styles.emptySubtitle}>
              Nuk ka prona që përputhen me kriteret tuaja aktuale.
            </Text>
            <Pressable style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Pastro filtrat</Text>
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
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtro Pronat</Text>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setShowFilterModal(false)}
            >
              <X size={20} color={BrandColors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
            {/* City Selection */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Qyteti në Kosovë</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                <Pressable
                  style={[styles.chip, selectedCity === '' && styles.chipActive]}
                  onPress={() => {
                    setSelectedCity('')
                    setSelectedNeighborhood('')
                  }}
                >
                  <Text style={[styles.chipText, selectedCity === '' && styles.chipTextActive]}>
                    Të gjitha
                  </Text>
                </Pressable>
                {CITIES.map((city) => {
                  const isCityActive = selectedCity === city
                  return (
                    <Pressable
                      key={city}
                      style={[styles.chip, isCityActive && styles.chipActive]}
                      onPress={() => {
                        setSelectedCity(city)
                        setSelectedNeighborhood('')
                      }}
                    >
                      <Text style={[styles.chipText, isCityActive && styles.chipTextActive]}>
                        {city}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </View>

            {/* Neighborhoods (if city selected) */}
            {selectedCity && KOSOVO_LOCATIONS[selectedCity]?.length > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  Lagjja në {selectedCity}
                </Text>
                <View style={styles.neighborhoodGrid}>
                  {KOSOVO_LOCATIONS[selectedCity].map((n) => {
                    const isSelected = selectedNeighborhood === n
                    return (
                      <Pressable
                        key={n}
                        style={[styles.neighborhoodChip, isSelected && styles.neighborhoodChipActive]}
                        onPress={() =>
                          setSelectedNeighborhood(isSelected ? '' : n)
                        }
                      >
                        <Text
                          style={[
                            styles.neighborhoodChipText,
                            isSelected && styles.neighborhoodChipTextActive,
                          ]}
                        >
                          {n}
                        </Text>
                        {isSelected && <Check size={12} color="#FFFFFF" />}
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Transaction Type */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Lloji i ofertës</Text>
              <View style={styles.buttonGroup}>
                {(['all', 'shitje', 'qira'] as const).map((t) => {
                  const isAct = selectedType === t
                  const label = t === 'all' ? 'Të gjitha' : t === 'shitje' ? 'Në Shitje' : 'Me Qira'
                  return (
                    <Pressable
                      key={t}
                      style={[styles.groupButton, isAct && styles.groupButtonActive]}
                      onPress={() => setSelectedType(t)}
                    >
                      <Text style={[styles.groupButtonText, isAct && styles.groupButtonTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <Pressable style={styles.modalResetButton} onPress={resetFilters}>
              <Text style={styles.modalResetButtonText}>Pastro gjithçka</Text>
            </Pressable>
            <Pressable
              style={styles.modalApplyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.modalApplyButtonText}>Zbato filtrat</Text>
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
    backgroundColor: '#F2F7F7',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: BrandColors.textMuted,
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
    width: 46,
    height: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BrandColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: BrandColors.gold,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#101828',
    fontSize: 10,
    fontWeight: '800',
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  quickTagSelected: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  quickTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  quickTagTextSelected: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: BrandColors.textMuted,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BrandColors.border,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: BrandColors.textMuted,
    textAlign: 'center',
  },
  resetButton: {
    marginTop: 8,
    backgroundColor: BrandColors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  resetButtonText: {
    color: BrandColors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.textPrimary,
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
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  chip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: BrandColors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  neighborhoodChipActive: {
    backgroundColor: BrandColors.primary,
  },
  neighborhoodChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: BrandColors.textSecondary,
  },
  neighborhoodChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonGroup: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: 14,
  },
  groupButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  groupButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  groupButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textMuted,
  },
  groupButtonTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  modalResetButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  modalResetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textMuted,
  },
  modalApplyButton: {
    flex: 1,
    backgroundColor: BrandColors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalApplyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
