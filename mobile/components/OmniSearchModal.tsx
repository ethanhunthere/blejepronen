import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Linking,
  ActivityIndicator,
  StatusBar as RNStatusBar,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar as ExpoStatusBar } from 'expo-status-bar'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import {
  Search,
  X,
  MapPin,
  Building2,
  User,
  Home,
  Clock,
  TrendingUp,
  Phone,
  ChevronRight,
  ShieldCheck,
  Check,
} from 'lucide-react-native'
import { useTheme, Fonts } from '@/constants/theme'
import {
  OmniResultItem,
  OmniSearchResponse,
  OmniEntityType,
  TRENDING_SEARCHES,
  executeMobileOmniSearch,
  searchLocations,
} from '@/lib/omni-search'
import { getAvatarUri, getAvatarSource } from '@/lib/avatars'

const ASYNC_RECENT_KEY = '@blejepronen_recent_searches'
const MAX_RECENT = 6

interface OmniSearchModalProps {
  visible: boolean
  onClose: () => void
  initialQuery?: string
  onSelectCity?: (city: string, neighborhood?: string) => void
  onSelectQuery?: (query: string) => void
}

export default function OmniSearchModal({
  visible,
  onClose,
  initialQuery = '',
  onSelectCity,
  onSelectQuery,
}: OmniSearchModalProps) {
  const router = useRouter()
  const { colors, theme } = useTheme()
  const insets = useSafeAreaInsets()

  // Hardware cutout & status bar protection (Dynamic Island, notch, punch-hole)
  const resolvedTopInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? (RNStatusBar.currentHeight || 28)
      : Platform.OS === 'ios'
      ? 48
      : 0

  // Intentional breathing room below status bar & Dynamic Island according to Apple HIG
  const headerPaddingTop = resolvedTopInset + (Platform.OS === 'ios' ? 8 : 10)
  const resolvedBottomInset = insets.bottom > 0 ? insets.bottom : Platform.OS === 'ios' ? 20 : 12

  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState<'all' | OmniEntityType>('all')
  const [results, setResults] = useState<OmniSearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const inputRef = useRef<TextInput>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load recent searches from AsyncStorage
  useEffect(() => {
    async function loadRecent() {
      try {
        const stored = await AsyncStorage.getItem(ASYNC_RECENT_KEY)
        if (stored) {
          setRecentSearches(JSON.parse(stored))
        }
      } catch {}
    }
    loadRecent()
  }, [])

  // Auto-focus when modal appears
  useEffect(() => {
    if (visible) {
      setQuery(initialQuery)
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [visible, initialQuery])

  // Save to recent searches
  const saveRecent = useCallback(async (searchTerm: string) => {
    const clean = searchTerm.trim()
    if (!clean || clean.length < 2) return
    try {
      setRecentSearches((prev) => {
        const next = [
          clean,
          ...prev.filter((i) => i.toLowerCase() !== clean.toLowerCase()),
        ].slice(0, MAX_RECENT)
        AsyncStorage.setItem(ASYNC_RECENT_KEY, JSON.stringify(next))
        return next
      })
    } catch {}
  }, [])

  const removeRecent = useCallback(async (searchTerm: string) => {
    try {
      setRecentSearches((prev) => {
        const next = prev.filter((i) => i !== searchTerm)
        AsyncStorage.setItem(ASYNC_RECENT_KEY, JSON.stringify(next))
        return next
      })
    } catch {}
  }, [])

  const clearAllRecent = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ASYNC_RECENT_KEY)
      setRecentSearches([])
    } catch {}
  }, [])

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text)
    const clean = text.trim()
    if (!clean) {
      setResults(null)
      setLoading(false)
      return
    }

    // Instant 0ms local location preview for instant visual responsiveness
    const instantLocs = searchLocations(clean, 6)
    if (instantLocs.length > 0) {
      setResults((prev) => {
        if (!prev || prev.query !== text) {
          return {
            query: text,
            total: instantLocs.length,
            counts: { listings: 0, agencies: 0, agents: 0, locations: instantLocs.length },
            results: { listings: [], agencies: [], agents: [], locations: instantLocs },
            flat: instantLocs,
            trending: TRENDING_SEARCHES,
          }
        }
        return prev
      })
    }
  }, [])

  // Blazing fast debounced multi-entity search (90ms)
  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      setLoading(false)
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setLoading(true)

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await executeMobileOmniSearch(query)
        setResults(res)
      } catch (err) {
        console.warn('Mobile omni search error:', err)
      } finally {
        setLoading(false)
      }
    }, 90)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [query])

  // Filter visible items based on activeTab
  const visibleItems = React.useMemo(() => {
    if (!results) return []
    if (activeTab === 'all') return results.flat
    if (activeTab === 'listing') return results.results.listings
    if (activeTab === 'agency') return results.results.agencies
    if (activeTab === 'agent') return results.results.agents
    if (activeTab === 'location') return results.results.locations
    return results.flat
  }, [results, activeTab])

  // Handle entity press
  const handleItemPress = useCallback(
    (item: OmniResultItem) => {
      if (Platform.OS !== 'web') Haptics.selectionAsync()
      saveRecent(query || item.title)
      onClose()

      if (item.entityType === 'listing') {
        router.push({
          pathname: '/listings/[id]',
          params: { id: item.id },
        })
      } else if (item.entityType === 'location') {
        if (onSelectCity && item.payload?.city) {
          onSelectCity(item.payload.city, item.payload.neighborhood)
        } else if (onSelectQuery) {
          onSelectQuery(item.payload?.neighborhood ? `${item.payload.neighborhood}, ${item.payload.city}` : item.payload?.city || item.title)
        } else {
          router.push({
            pathname: '/(tabs)/listings' as any,
            params: { city: item.payload?.city, neighborhood: item.payload?.neighborhood },
          })
        }
      } else if (
        item.entityType === 'agency' ||
        item.entityType === 'agent' ||
        (item as any).entityType === 'user' ||
        (item as any).entityType === 'company' ||
        item.targetUrl?.startsWith('/profili/') ||
        item.targetUrl?.startsWith('/profile/')
      ) {
        let targetId = item.id
        if (item.targetUrl?.includes('/profili/') || item.targetUrl?.includes('/profile/')) {
          const parts = item.targetUrl.split('/')
          const candidate = parts[parts.length - 1]?.split('?')[0]
          if (candidate) targetId = candidate
        }

        router.push({
          pathname: '/profili/[id]',
          params: { id: targetId },
        })
      }
    },
    [query, saveRecent, onClose, router, onSelectCity, onSelectQuery]
  )

  const formatPrice = (price?: number | null) => {
    if (!price || price <= 0) return 'Me marrëveshje'
    return new Intl.NumberFormat('de-DE').format(price) + ' €'
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <ExpoStatusBar style={theme === 'white' ? 'dark' : 'light'} />
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        {/* 
          ROCK-SOLID TOP HEADER BAR
          Pinned securely OUTSIDE KeyboardAvoidingView so it NEVER overflows or pushes off-screen.
          Dynamic safe-area paddingTop ensures full clearance from Dynamic Island, notches, and status bars.
        */}
        <View
          style={[
            styles.headerContainer,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
              paddingTop: headerPaddingTop,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Search size={18} color={colors.primary} strokeWidth={2.2} />
              <TextInput
                ref={inputRef}
                style={[
                  styles.textInput,
                  {
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Kërko prona, agjenci, llogari, qytet..."
                placeholderTextColor={colors.textLight}
                value={query}
                onChangeText={handleQueryChange}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="never"
              />
              {loading && <ActivityIndicator size="small" color={colors.primary} />}
              {query.length > 0 && !loading && (
                <Pressable
                  onPress={() => setQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.clearBtn}
                >
                  <X size={15} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
              style={styles.cancelBtn}
            >
              <Text style={[styles.cancelText, { color: colors.primary }]}>Anulo</Text>
            </Pressable>
          </View>
        </View>

        {/* 
          Category Selector Tabs:
          Properties, Company/Agency accounts, Personal accounts, Cities/Locations
        */}
        {results && results.total > 0 && (
          <View style={[styles.tabsRow, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
              data={[
                { key: 'all', label: `Të gjitha (${results.total})` },
                ...(results.counts.listings > 0
                  ? [{ key: 'listing', label: `Prona (${results.counts.listings})` }]
                  : []),
                ...(results.counts.agencies > 0
                  ? [{ key: 'agency', label: `Agjenci & Kompani (${results.counts.agencies})` }]
                  : []),
                ...(results.counts.agents > 0
                  ? [{ key: 'agent', label: `Llogari Personale (${results.counts.agents})` }]
                  : []),
                ...(results.counts.locations > 0
                  ? [{ key: 'location', label: `Qytete & Zona (${results.counts.locations})` }]
                  : []),
              ]}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => {
                const isActive = activeTab === item.key
                return (
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync()
                      setActiveTab(item.key as any)
                    }}
                    style={[
                      styles.tabPill,
                      {
                        backgroundColor: isActive ? colors.chipActiveBg : colors.surfaceSubtle,
                        borderColor: isActive ? colors.chipActiveBg : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabPillText,
                        {
                          color: isActive ? colors.chipTextActive : colors.textSecondary,
                          fontFamily: isActive ? Fonts.bold : Fonts.medium,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                )
              }}
            />
          </View>
        )}

        {/* 
          Results Area with keyboard avoidance ONLY below the fixed header
        */}
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Empty Query Default State: Recent & Trending */}
          {!query.trim() && (
            <FlatList
              data={[]}
              renderItem={() => null}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingBottom: 32 + resolvedBottomInset }}
              ListHeaderComponent={
                <View style={styles.defaultStateWrap}>
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <View style={styles.sectionBlock}>
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                          <Clock size={14} color={colors.textMuted} />
                          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                            KËRKIMET E FUNDIT
                          </Text>
                        </View>
                        <Pressable onPress={clearAllRecent} hitSlop={8}>
                          <Text style={[styles.clearAllText, { color: colors.primary }]}>
                            Pastro
                          </Text>
                        </Pressable>
                      </View>

                      <View style={styles.recentChipsWrap}>
                        {recentSearches.map((term) => (
                          <View
                            key={term}
                            style={[
                              styles.recentChip,
                              {
                                backgroundColor: colors.surfaceSubtle,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <Pressable
                              onPress={() => {
                                setQuery(term)
                                saveRecent(term)
                              }}
                              style={styles.recentChipTextWrap}
                            >
                              <Text
                                style={[styles.recentChipText, { color: colors.textPrimary }]}
                              >
                                {term}
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => removeRecent(term)}
                              hitSlop={8}
                              style={styles.recentChipRemove}
                            >
                              <X size={12} color={colors.textMuted} />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Trending Real Estate Searches */}
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionTitleRow}>
                      <TrendingUp size={14} color={colors.primary} />
                      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                        MË TË KËRKUARAT
                      </Text>
                    </View>

                    <View style={styles.trendingGrid}>
                      {TRENDING_SEARCHES.map((item) => (
                        <Pressable
                          key={item}
                          onPress={() => setQuery(item)}
                          style={[
                            styles.trendingCard,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[styles.trendingText, { color: colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {item}
                          </Text>
                          <ChevronRight size={14} color={colors.textMuted} />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              }
            />
          )}

          {/* Active Search Results List */}
          {query.trim() && (
            <FlatList
              data={visibleItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[
                styles.resultsListContent,
                { paddingBottom: 32 + resolvedBottomInset },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              removeClippedSubviews={Platform.OS !== 'web'}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={40}
              initialNumToRender={8}
              windowSize={5}
              renderItem={({ item }) => {
                const isAgency = item.entityType === 'agency'
                const isAgent = item.entityType === 'agent'
                const isLocation = item.entityType === 'location'
                const isListing = item.entityType === 'listing'

                return (
                  <Pressable
                    onPress={() => handleItemPress(item)}
                    style={({ pressed }) => [
                      styles.resultCard,
                      {
                        backgroundColor: pressed
                          ? colors.surfaceHighlight
                          : colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {/* Entity Icon / Thumbnail */}
                    <View
                      style={[
                        styles.itemThumbBox,
                        isAgency && styles.itemThumbBoxAgency,
                        isAgent && styles.itemThumbBoxAgent,
                        {
                          backgroundColor: isAgency
                            ? (theme === 'green' ? 'rgba(212, 175, 55, 0.12)' : colors.primaryLight)
                            : colors.surfaceSubtle,
                          borderColor: isAgency
                            ? (theme === 'green' ? 'rgba(212, 175, 55, 0.3)' : colors.border)
                            : colors.border,
                        },
                      ]}
                    >
                      {item.imageUrl ? (
                        <Image
                          source={getAvatarSource(item.imageUrl)}
                          style={[
                            styles.itemThumbImg,
                            isAgency && { borderRadius: 10 },
                            isAgent && { borderRadius: 20 },
                          ]}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          priority="high"
                          transition={0}
                        />
                      ) : isLocation ? (
                        <MapPin size={22} color={colors.primary} />
                      ) : isAgency ? (
                        <Building2 size={22} color={theme === 'green' ? colors.gold : colors.primary} />
                      ) : isAgent ? (
                        <User size={22} color={colors.textMuted} />
                      ) : (
                        <Home size={22} color={colors.primary} />
                      )}
                    </View>

                    {/* Details Column */}
                    <View style={styles.itemInfo}>
                      <View style={styles.itemTitleRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
                          <Text
                            style={[styles.itemTitle, { color: colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          {isAgency && (
                            <ShieldCheck
                              size={13}
                              color={theme === 'green' ? colors.gold : colors.primary}
                              strokeWidth={2.4}
                            />
                          )}
                        </View>
                        {item.badge && (
                          <View
                            style={[
                              styles.badgePill,
                              {
                                backgroundColor:
                                  isAgency
                                    ? colors.badgeBg
                                    : isAgent
                                    ? 'rgba(59, 130, 246, 0.12)'
                                    : item.badge === 'Në shitje'
                                    ? theme === 'green' ? colors.primaryLight : 'rgba(16, 185, 129, 0.14)'
                                    : colors.goldLight,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgePillText,
                                {
                                  color:
                                    isAgency
                                      ? colors.primary
                                      : isAgent
                                      ? '#3B82F6'
                                      : item.badge === 'Në shitje'
                                      ? theme === 'green' ? colors.gold : '#10B981'
                                      : colors.gold,
                                },
                              ]}
                            >
                              {item.badge}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text
                        style={[styles.itemSubtitle, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {item.subtitle}
                      </Text>
                    </View>

                    {/* Price or Action Column */}
                    <View style={styles.itemActionCol}>
                      {isListing && item.price !== null && item.price !== undefined ? (
                        <Text style={[styles.itemPrice, { color: colors.primary }]}>
                          {formatPrice(item.price)}
                        </Text>
                      ) : isAgency || isAgent ? (
                        <View style={styles.agencyActionCol}>
                          {item.payload?.phone ? (
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation()
                                if (item.payload?.phone) {
                                  Linking.openURL(`tel:${item.payload.phone}`)
                                }
                              }}
                              hitSlop={8}
                              style={[
                                styles.phoneActionBtn,
                                { backgroundColor: colors.primaryLight },
                              ]}
                            >
                              <Phone size={14} color={colors.primary} />
                            </Pressable>
                          ) : null}
                          <ChevronRight size={17} color={colors.textMuted} />
                        </View>
                      ) : (
                        <ChevronRight size={18} color={colors.textMuted} />
                      )}
                    </View>
                  </Pressable>
                )
              }}
              ListEmptyComponent={
                !loading ? (
                  <View style={styles.zeroResultsWrap}>
                    <View
                      style={[
                        styles.zeroIconWrap,
                        { backgroundColor: colors.surfaceSubtle },
                      ]}
                    >
                      <Search size={28} color={colors.textMuted} />
                    </View>
                    <Text style={[styles.zeroTitle, { color: colors.textPrimary }]}>
                      Nuk u gjet asnjë rezultat për &ldquo;{query}&rdquo;
                    </Text>
                    <Text style={[styles.zeroSub, { color: colors.textMuted }]}>
                      Kërkoni me emër prone, lagje, qytet (psh. Prishtinë), ose emër agjencie / pronari.
                    </Text>
                  </View>
                ) : null
              }
            />
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  headerContainer: {
    width: '100%',
    borderBottomWidth: 0.5,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  inputWrapper: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    height: '100%',
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  clearBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    flexShrink: 0,
    height: 46,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
  },
  tabsRow: {
    borderBottomWidth: 0.5,
    paddingVertical: 8,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  tabPillText: {
    fontSize: 12.5,
    letterSpacing: -0.1,
  },
  keyboardContainer: {
    flex: 1,
  },
  defaultStateWrap: {
    padding: 16,
    gap: 24,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  clearAllText: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
  },
  recentChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 0.5,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
  },
  recentChipTextWrap: {
    paddingRight: 4,
  },
  recentChipText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  recentChipRemove: {
    padding: 4,
  },
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    width: '48%',
    gap: 6,
  },
  trendingText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    flex: 1,
  },
  resultsListContent: {
    padding: 16,
    gap: 10,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 0.5,
    gap: 12,
  },
  itemThumbBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemThumbBoxAgency: {
    borderRadius: 12,
  },
  itemThumbBoxAgent: {
    borderRadius: 24,
  },
  itemThumbImg: {
    width: '100%',
    height: '100%',
  },
  itemInfo: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    fontSize: 14.5,
    fontFamily: Fonts.bold,
    flexShrink: 1,
  },
  itemSubtitle: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  itemActionCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  agencyActionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zeroResultsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
    paddingHorizontal: 20,
  },
  zeroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  zeroTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  zeroSub: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
})
