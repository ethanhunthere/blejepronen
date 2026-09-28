import React, { useState, useEffect, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Animated,
  PanResponder,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  X,
  Check,
  RotateCcw,
  MapPin,
  Tag,
  Maximize2,
  Minimize2,
  Layers,
  ChevronDown,
  Search,
  ChevronRight,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import {
  KOSOVO_LOCATIONS,
  ALL_CITIES,
  POPULAR_CITIES,
  getNeighborhoods,
  normalizeCity,
} from '@/lib/kosovo-locations'
import {
  PropertyFilterState,
  DEFAULT_FILTER_STATE,
  ROOM_OPTIONS,
  FLOOR_OPTIONS,
  CONDITION_OPTIONS,
  FEATURES_LIST,
  PRICE_PRESETS_SALE,
  PRICE_PRESETS_RENT,
  AREA_PRESETS,
  SORT_OPTIONS,
  countActiveFilters,
  toListingsQueryParams,
  SortType,
} from '@/lib/property-filters'
import { countListings } from '@/lib/listings-query'
import { normalizeSearchString } from '@/lib/omni-search'

interface PropertyFilterModalProps {
  visible: boolean
  onClose: () => void
  filters: PropertyFilterState
  onApply: (updated: PropertyFilterState) => void
}

// Numeric draft cleanup on blur: a negative bound is dropped…
function clampNegative(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const n = parseFloat(trimmed)
  return !isNaN(n) && n < 0 ? '' : trimmed
}

// …and an inverted min/max pair is swapped back into a usable range.
function clampRange(min: string, max: string): [string, string] {
  const cleanMin = clampNegative(min)
  const cleanMax = clampNegative(max)
  const nMin = parseFloat(cleanMin)
  const nMax = parseFloat(cleanMax)
  if (!isNaN(nMin) && !isNaN(nMax) && nMin > nMax) return [cleanMax, cleanMin]
  return [cleanMin, cleanMax]
}

export function PropertyFilterModal({
  visible,
  onClose,
  filters,
  onApply,
}: PropertyFilterModalProps) {
  const { colors, theme } = useTheme()

  // Local copy of filter state for drafting before applying
  const [draft, setDraft] = useState<PropertyFilterState>(filters)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)
  const [allCitiesModalOpen, setAllCitiesModalOpen] = useState(false)
  const [citySearchQuery, setCitySearchQuery] = useState('')

  useEffect(() => {
    if (visible) {
      setDraft(filters)
    }
  }, [visible, filters])

  const pricePresets =
    draft.transactionType === 'qira' ? PRICE_PRESETS_RENT : PRICE_PRESETS_SALE

  const availableNeighborhoods = draft.city ? getNeighborhoods(draft.city) : []

  const filteredAllCities = ALL_CITIES.filter((c) => {
    if (!citySearchQuery.trim()) return true
    // Diacritic-folded match so "peje", "Gjakove" or "Mitrovica" still hit.
    return normalizeSearchString(c).includes(normalizeSearchString(citySearchQuery))
  })

  const activeCount = countActiveFilters(draft)

  // Live result preview for the apply button: an exact server count of the
  // drafted filters (same query builder as the catalog), so the number the user
  // commits to is never derived from a window of already-loaded rows.
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const previewReqRef = useRef(0)

  useEffect(() => {
    if (!visible) {
      setPreviewCount(null)
      return
    }

    const rid = ++previewReqRef.current
    setPreviewCount(null)

    const timer = setTimeout(async () => {
      const count = await countListings(toListingsQueryParams(draft))
      if (rid === previewReqRef.current) setPreviewCount(count)
    }, 350)

    return () => clearTimeout(timer)
  }, [visible, draft])

  const handleReset = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    }
    setDraft({
      ...DEFAULT_FILTER_STATE,
      transactionType: draft.transactionType,
      category: draft.category,
      searchQuery: draft.searchQuery,
    })
  }

  const handleApply = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
    onApply(draft)
    onClose()
  }

  // Blur cleanup for the numeric bounds: negatives clear, inverted pairs swap.
  const handlePriceBlur = () => {
    setFocusedInput(null)
    setDraft((prev) => {
      const [minPrice, maxPrice] = clampRange(prev.minPrice, prev.maxPrice)
      if (minPrice === prev.minPrice && maxPrice === prev.maxPrice) return prev
      return { ...prev, minPrice, maxPrice }
    })
  }

  const handleAreaBlur = () => {
    setFocusedInput(null)
    setDraft((prev) => {
      const [minArea, maxArea] = clampRange(prev.minArea, prev.maxArea)
      if (minArea === prev.minArea && maxArea === prev.maxArea) return prev
      return { ...prev, minArea, maxArea }
    })
  }

  const toggleFeature = (feature: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setDraft((prev) => {
      const exists = prev.features.includes(feature)
      return {
        ...prev,
        features: exists
          ? prev.features.filter((f) => f !== feature)
          : [...prev.features, feature],
      }
    })
  }

  // Apple/Airbnb-grade drag-to-dismiss for modal header
  const filterDragY = useRef(new Animated.Value(0)).current
  const allCitiesDragY = useRef(new Animated.Value(0)).current

  const filterHeaderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 6 && gs.dy > Math.abs(gs.dx) * 1.1,
      onMoveShouldSetPanResponderCapture: (_, gs) => gs.dy > 6 && gs.dy > Math.abs(gs.dx) * 1.1,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          filterDragY.setValue(gs.dy)
        } else {
          filterDragY.setValue(gs.dy * 0.16)
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 70 || gs.vy > 0.4) {
          onClose()
          filterDragY.setValue(0)
        } else {
          Animated.spring(filterDragY, {
            toValue: 0,
            tension: 80,
            friction: 9,
            useNativeDriver: true,
          }).start()
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(filterDragY, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }).start()
      },
    })
  ).current

  const allCitiesHeaderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 6 && gs.dy > Math.abs(gs.dx) * 1.1,
      onMoveShouldSetPanResponderCapture: (_, gs) => gs.dy > 6 && gs.dy > Math.abs(gs.dx) * 1.1,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          allCitiesDragY.setValue(gs.dy)
        } else {
          allCitiesDragY.setValue(gs.dy * 0.16)
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 70 || gs.vy > 0.4) {
          setAllCitiesModalOpen(false)
          allCitiesDragY.setValue(0)
        } else {
          Animated.spring(allCitiesDragY, {
            toValue: 0,
            tension: 80,
            friction: 9,
            useNativeDriver: true,
          }).start()
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(allCitiesDragY, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }).start()
      },
    })
  ).current

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <Animated.View style={[styles.flex1, { transform: [{ translateY: filterDragY }] }]}>
          {/* Tactile Grab Zone */}
          <View style={styles.sheetGrabZone} {...filterHeaderPanResponder.panHandlers}>
            <View style={[styles.sheetGrabPill, { backgroundColor: colors.border }]} />
          </View>

          {/* Modal Top Bar */}
          <View style={[styles.headerBar, { borderBottomColor: colors.border }]} {...filterHeaderPanResponder.panHandlers}>
            <Pressable onPress={handleReset} hitSlop={10} style={styles.headerActionBtn}>
              <RotateCcw size={15} color={colors.textMuted} />
              <Text style={[styles.headerActionText, { color: colors.textMuted }]}>Pastro</Text>
            </Pressable>

            <View style={styles.headerTitleWrap}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Filtrat</Text>
              {activeCount > 0 && (
                <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.activeBadgeText}>{activeCount}</Text>
                </View>
              )}
            </View>

            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={18} color={colors.textSecondary} strokeWidth={2.4} />
            </Pressable>
          </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Transaction Type */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                Lloji i Transaksionit
              </Text>
              <View style={styles.segmentedRow}>
                {(['all', 'shitje', 'qira'] as const).map((t) => {
                  const isSelected = draft.transactionType === t
                  const label =
                    t === 'all' ? 'Të gjitha' : t === 'shitje' ? 'Në Shitje' : 'Me Qira'
                  return (
                    <Pressable
                      key={t}
                      style={[
                        styles.segmentBtn,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setDraft((prev) => ({ ...prev, transactionType: t }))
                      }}
                    >
                      <Text
                        style={[
                          styles.segmentBtnText,
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
                        {label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* 2. City Selector */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Qyteti</Text>
                <Pressable
                  style={[
                    styles.allCitiesTrigger,
                    {
                      backgroundColor: theme === 'green' ? 'rgba(200, 184, 130, 0.12)' : 'rgba(0, 103, 91, 0.08)',
                      borderColor: theme === 'green' ? 'rgba(200, 184, 130, 0.25)' : 'rgba(0, 103, 91, 0.2)',
                    },
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setCitySearchQuery('')
                    setAllCitiesModalOpen(true)
                  }}
                  hitSlop={8}
                >
                  <Text style={[styles.allCitiesTriggerText, { color: theme === 'green' ? colors.gold : colors.primary }]}>
                    Të gjitha (38)
                  </Text>
                  <ChevronRight size={14} color={theme === 'green' ? colors.gold : colors.primary} />
                </Pressable>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                <Pressable
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: !draft.city ? colors.primary : colors.surfaceSubtle,
                      borderColor: !draft.city ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync()
                    setDraft((prev) => ({ ...prev, city: '', neighborhood: '' }))
                  }}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color: !draft.city
                          ? theme === 'green'
                            ? '#071C18'
                            : '#FFFFFF'
                          : colors.textSecondary,
                        fontFamily: !draft.city ? Fonts.bold : Fonts.medium,
                      },
                    ]}
                  >
                    Të gjitha qytetet
                  </Text>
                </Pressable>

                {/* If selected city is outside popular list, show active pill */}
                {Boolean(draft.city) &&
                  !POPULAR_CITIES.some(
                    (p) => p.toLowerCase() === normalizeCity(draft.city).toLowerCase()
                  ) && (
                    <Pressable
                      style={[
                        styles.filterPill,
                        {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setDraft((prev) => ({ ...prev, city: '', neighborhood: '' }))
                      }}
                    >
                      <MapPin
                        size={12}
                        color={theme === 'green' ? '#071C18' : '#FFFFFF'}
                      />
                      <Text
                        style={[
                          styles.filterPillText,
                          {
                            color: theme === 'green' ? '#071C18' : '#FFFFFF',
                            fontFamily: Fonts.bold,
                          },
                        ]}
                      >
                        {normalizeCity(draft.city)}
                      </Text>
                      <X
                        size={12}
                        color={theme === 'green' ? '#071C18' : '#FFFFFF'}
                      />
                    </Pressable>
                  )}

                {POPULAR_CITIES.map((c) => {
                  const isSelected =
                    normalizeCity(draft.city).toLowerCase() === c.toLowerCase()
                  return (
                    <Pressable
                      key={c}
                      style={[
                        styles.filterPill,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setDraft((prev) => ({
                          ...prev,
                          city: isSelected ? '' : c,
                          neighborhood: '',
                        }))
                      }}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
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
                        {c}
                      </Text>
                    </Pressable>
                  )
                })}

                <Pressable
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      borderStyle: 'dashed',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    },
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setCitySearchQuery('')
                    setAllCitiesModalOpen(true)
                  }}
                >
                  <MapPin size={12} color={colors.textSecondary} />
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color: colors.textSecondary,
                        fontFamily: Fonts.medium,
                      },
                    ]}
                  >
                    + 30 të tjera
                  </Text>
                </Pressable>
              </ScrollView>
            </View>

            {/* 3. Neighborhood Selector (if city selected) */}
            {availableNeighborhoods.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                  Lagjja në {draft.city}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                  <Pressable
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: !draft.neighborhood ? colors.primary : colors.surfaceSubtle,
                        borderColor: !draft.neighborhood ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync()
                      setDraft((prev) => ({ ...prev, neighborhood: '' }))
                    }}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        {
                          color: !draft.neighborhood
                            ? theme === 'green'
                              ? '#071C18'
                              : '#FFFFFF'
                            : colors.textSecondary,
                          fontFamily: !draft.neighborhood ? Fonts.bold : Fonts.medium,
                        },
                      ]}
                    >
                      Të gjitha lagjet
                    </Text>
                  </Pressable>

                  {availableNeighborhoods.map((n) => {
                    const isSelected = draft.neighborhood === n
                    return (
                      <Pressable
                        key={n}
                        style={[
                          styles.filterPill,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => {
                          if (Platform.OS !== 'web') Haptics.selectionAsync()
                          setDraft((prev) => ({
                            ...prev,
                            neighborhood: isSelected ? '' : n,
                          }))
                        }}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
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
                          {n}
                        </Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>
              </View>
            )}

            {/* 4. Price Filter */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                  Çmimi {draft.transactionType === 'qira' ? '(€ / muaj)' : '(€)'}
                </Text>
                {(draft.minPrice || draft.maxPrice) && (
                  <Pressable
                    onPress={() => setDraft((prev) => ({ ...prev, minPrice: '', maxPrice: '' }))}
                  >
                    <Text style={[styles.clearLink, { color: colors.primary }]}>Pastro</Text>
                  </Pressable>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                {pricePresets.map((preset, idx) => {
                  const isSelected =
                    draft.minPrice === preset.min && draft.maxPrice === preset.max
                  return (
                    <Pressable
                      key={idx}
                      style={[
                        styles.filterPill,
                        {
                          backgroundColor: isSelected ? colors.chipActiveBg : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.chipActiveBg : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setDraft((prev) => ({
                          ...prev,
                          minPrice: isSelected ? '' : preset.min,
                          maxPrice: isSelected ? '' : preset.max,
                        }))
                      }}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          {
                            color: isSelected ? colors.chipTextActive : colors.textSecondary,
                            fontFamily: isSelected ? Fonts.bold : Fonts.medium,
                          },
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              <View style={styles.inputsRow}>
                <View style={styles.inputCol}>
                  <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>Min</Text>
                  <TextInput
                    style={[
                      styles.numInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: focusedInput === 'minPrice' ? colors.primary : colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder="nga 0"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={draft.minPrice}
                    onChangeText={(v) => setDraft((p) => ({ ...p, minPrice: v }))}
                    onFocus={() => setFocusedInput('minPrice')}
                    onBlur={handlePriceBlur}
                  />
                </View>

                <Text style={[styles.dashText, { color: colors.textMuted }]}>–</Text>

                <View style={styles.inputCol}>
                  <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>Max</Text>
                  <TextInput
                    style={[
                      styles.numInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: focusedInput === 'maxPrice' ? colors.primary : colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder="pa limit"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={draft.maxPrice}
                    onChangeText={(v) => setDraft((p) => ({ ...p, maxPrice: v }))}
                    onFocus={() => setFocusedInput('maxPrice')}
                    onBlur={handlePriceBlur}
                  />
                </View>
              </View>
            </View>

            {/* 5. Area Filter */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                  Sipërfaqja (m²)
                </Text>
                {(draft.minArea || draft.maxArea) && (
                  <Pressable
                    onPress={() => setDraft((prev) => ({ ...prev, minArea: '', maxArea: '' }))}
                  >
                    <Text style={[styles.clearLink, { color: colors.primary }]}>Pastro</Text>
                  </Pressable>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                {AREA_PRESETS.map((preset, idx) => {
                  const isSelected =
                    draft.minArea === preset.min && draft.maxArea === preset.max
                  return (
                    <Pressable
                      key={idx}
                      style={[
                        styles.filterPill,
                        {
                          backgroundColor: isSelected ? colors.chipActiveBg : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.chipActiveBg : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setDraft((prev) => ({
                          ...prev,
                          minArea: isSelected ? '' : preset.min,
                          maxArea: isSelected ? '' : preset.max,
                        }))
                      }}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          {
                            color: isSelected ? colors.chipTextActive : colors.textSecondary,
                            fontFamily: isSelected ? Fonts.bold : Fonts.medium,
                          },
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              <View style={styles.inputsRow}>
                <View style={styles.inputCol}>
                  <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>Min</Text>
                  <TextInput
                    style={[
                      styles.numInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: focusedInput === 'minArea' ? colors.primary : colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder="nga 0"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={draft.minArea}
                    onChangeText={(v) => setDraft((p) => ({ ...p, minArea: v }))}
                    onFocus={() => setFocusedInput('minArea')}
                    onBlur={handleAreaBlur}
                  />
                </View>

                <Text style={[styles.dashText, { color: colors.textMuted }]}>–</Text>

                <View style={styles.inputCol}>
                  <Text style={[styles.inputSubLabel, { color: colors.textMuted }]}>Max</Text>
                  <TextInput
                    style={[
                      styles.numInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: focusedInput === 'maxArea' ? colors.primary : colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder="pa limit"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={draft.maxArea}
                    onChangeText={(v) => setDraft((p) => ({ ...p, maxArea: v }))}
                    onFocus={() => setFocusedInput('maxArea')}
                    onBlur={handleAreaBlur}
                  />
                </View>
              </View>
            </View>

            {/* 6. Rooms Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Numri i Dhomave</Text>
              <View style={styles.optionsWrap}>
                {ROOM_OPTIONS.map((opt) => {
                  const isSelected = draft.rooms === opt.id
                  return (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.chipBtn,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setDraft((p) => ({ ...p, rooms: opt.id }))
                      }}
                    >
                      <Text
                        style={[
                          styles.chipBtnText,
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
                        {opt.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* 7. Floor Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Kati</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                {FLOOR_OPTIONS.map((opt) => {
                  const isSelected = draft.floor === opt.id
                  return (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.filterPill,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setDraft((p) => ({ ...p, floor: opt.id }))
                      }}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
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
                        {opt.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </View>

            {/* 8. Condition */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Gjendja e Pronës</Text>
              <View style={styles.optionsWrap}>
                {CONDITION_OPTIONS.map((opt) => {
                  const isSelected = draft.condition === opt.id
                  return (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.chipBtn,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setDraft((p) => ({ ...p, condition: opt.id }))
                      }}
                    >
                      <Text
                        style={[
                          styles.chipBtnText,
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
                        {opt.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* 9. Features Checklist */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                Karakteristika të veçanta
              </Text>
              <View style={styles.featuresWrap}>
                {FEATURES_LIST.map((feat) => {
                  const isSelected = draft.features.includes(feat)
                  return (
                    <Pressable
                      key={feat}
                      style={[
                        styles.featureChip,
                        {
                          backgroundColor: isSelected ? colors.chipActiveBg : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.chipActiveBg : colors.border,
                        },
                      ]}
                      onPress={() => toggleFeature(feat)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                            borderColor: isSelected ? colors.primary : colors.textLight,
                          },
                        ]}
                      >
                        {isSelected && (
                          <Check
                            size={12}
                            color={theme === 'green' ? '#071C18' : '#FFFFFF'}
                            strokeWidth={3}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.featureChipText,
                          {
                            color: isSelected ? colors.chipTextActive : colors.textSecondary,
                            fontFamily: isSelected ? Fonts.bold : Fonts.medium,
                          },
                        ]}
                      >
                        {feat}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* 10. Sorting */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Renditja</Text>
              <View style={styles.sortList}>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = draft.sortBy === opt.id
                  const Icon = opt.icon
                  return (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.sortItem,
                        {
                          backgroundColor: isSelected ? colors.surfaceHighlight : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setDraft((p) => ({ ...p, sortBy: opt.id as SortType }))
                      }}
                    >
                      <View
                        style={[
                          styles.sortIconBox,
                          {
                            backgroundColor: isSelected
                              ? colors.primaryLight
                              : colors.surfaceSubtle,
                          },
                        ]}
                      >
                        <Icon size={18} color={isSelected ? colors.primary : colors.textMuted} />
                      </View>
                      <View style={styles.sortTextCol}>
                        <Text
                          style={[
                            styles.sortTitle,
                            {
                              color: isSelected ? colors.primary : colors.textPrimary,
                              fontFamily: isSelected ? Fonts.bold : Fonts.semiBold,
                            },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={[styles.sortDesc, { color: colors.textMuted }]}>
                          {opt.description}
                        </Text>
                      </View>
                      {isSelected && <Check size={18} color={colors.primary} strokeWidth={2.4} />}
                    </Pressable>
                  )
                })}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Sticky Action Bar */}
          <View
            style={[
              styles.footerBar,
              { backgroundColor: colors.surface, borderTopColor: colors.border },
            ]}
          >
            <Pressable
              style={[
                styles.applyBtn,
                { backgroundColor: theme === 'green' ? colors.gold : colors.primary },
              ]}
              onPress={handleApply}
            >
              <Text
                style={[
                  styles.applyBtnText,
                  { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
                ]}
              >
                {previewCount !== null
                  ? `Shiko ${previewCount} ${previewCount === 1 ? 'rezultat' : 'rezultate'}`
                  : activeCount > 0
                  ? `Shiko Rezultatet (${activeCount} filtra)`
                  : 'Shiko Rezultatet'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
        </Animated.View>

        {/* 38 Municipalities Selector Sub-Modal */}
        <Modal
          visible={allCitiesModalOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setAllCitiesModalOpen(false)}
        >
          <SafeAreaView style={[styles.allCitiesModalContainer, { backgroundColor: colors.background }]}>
            <Animated.View style={[styles.flex1, { transform: [{ translateY: allCitiesDragY }] }]}>
              {/* Tactile Grab Zone */}
              <View style={styles.sheetGrabZone} {...allCitiesHeaderPanResponder.panHandlers}>
                <View style={[styles.sheetGrabPill, { backgroundColor: colors.border }]} />
              </View>

              {/* Header */}
              <View
                style={[styles.allCitiesModalHeader, { borderBottomColor: colors.border }]}
                {...allCitiesHeaderPanResponder.panHandlers}
              >
                <View>
                  <Text style={[styles.allCitiesModalTitle, { color: colors.textPrimary }]}>
                    Komunat e Kosovës
                  </Text>
                  <Text style={[styles.allCitiesModalSubtitle, { color: colors.textMuted }]}>
                    Zgjidhni nga 38 komunat zyrtare
                  </Text>
                </View>
                <Pressable
                  onPress={() => setAllCitiesModalOpen(false)}
                  style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle, borderRadius: 10 }]}
                  hitSlop={10}
                >
                  <X size={18} color={colors.textPrimary} />
                </Pressable>
              </View>

            {/* Search Box */}
            <View style={[styles.allCitiesSearchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Search size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.allCitiesSearchInput, { color: colors.textPrimary }]}
                placeholder="Kërko komunën (psh. Prishtinë, Suharekë, Lipjan)..."
                placeholderTextColor={colors.textMuted}
                value={citySearchQuery}
                onChangeText={setCitySearchQuery}
                autoCapitalize="words"
                clearButtonMode="while-editing"
              />
              {citySearchQuery.length > 0 && (
                <Pressable onPress={() => setCitySearchQuery('')} hitSlop={8}>
                  <X size={16} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            {/* Quick Option: All Cities */}
            <Pressable
              style={[
                styles.allCitiesRow,
                { borderBottomColor: colors.border },
                !draft.city && {
                  backgroundColor:
                    theme === 'green' ? 'rgba(200, 184, 130, 0.12)' : 'rgba(0, 103, 91, 0.08)',
                },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync()
                setDraft((p) => ({ ...p, city: '', neighborhood: '' }))
                setAllCitiesModalOpen(false)
              }}
            >
              <View style={styles.allCitiesRowLeft}>
                <View style={[styles.allCitiesIconBox, { backgroundColor: colors.surfaceSubtle }]}>
                  <MapPin size={16} color={colors.textMuted} />
                </View>
                <View>
                  <Text
                    style={[
                      styles.allCitiesRowName,
                      { color: colors.textPrimary, fontFamily: !draft.city ? Fonts.bold : Fonts.medium },
                    ]}
                  >
                    Të gjitha qytetet
                  </Text>
                  <Text style={[styles.allCitiesRowSub, { color: colors.textMuted }]}>
                    Kërko në tërë territorin e Kosovës
                  </Text>
                </View>
              </View>
              {!draft.city && (
                <Check size={18} color={theme === 'green' ? colors.gold : colors.primary} />
              )}
            </Pressable>

            {/* City List */}
            <ScrollView
              style={styles.allCitiesList}
              contentContainerStyle={styles.allCitiesListContent}
              keyboardShouldPersistTaps="handled"
            >
              {filteredAllCities.map((cityName) => {
                const isSelected =
                  normalizeCity(draft.city).toLowerCase() === cityName.toLowerCase()
                const hoodCount = KOSOVO_LOCATIONS[cityName]?.length || 0
                return (
                  <Pressable
                    key={cityName}
                    style={[
                      styles.allCitiesRow,
                      { borderBottomColor: colors.border },
                      isSelected && {
                        backgroundColor:
                          theme === 'green' ? 'rgba(200, 184, 130, 0.12)' : 'rgba(0, 103, 91, 0.08)',
                      },
                    ]}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync()
                      setDraft((p) => ({ ...p, city: cityName, neighborhood: '' }))
                      setAllCitiesModalOpen(false)
                    }}
                  >
                    <View style={styles.allCitiesRowLeft}>
                      <View
                        style={[
                          styles.allCitiesIconBox,
                          {
                            backgroundColor: isSelected
                              ? theme === 'green'
                                ? colors.gold
                                : colors.primary
                              : colors.surfaceSubtle,
                          },
                        ]}
                      >
                        <MapPin
                          size={16}
                          color={isSelected ? (theme === 'green' ? '#071C18' : '#FFFFFF') : colors.textMuted}
                        />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.allCitiesRowName,
                            {
                              color: colors.textPrimary,
                              fontFamily: isSelected ? Fonts.bold : Fonts.medium,
                            },
                          ]}
                        >
                          {cityName}
                        </Text>
                        <Text style={[styles.allCitiesRowSub, { color: colors.textMuted }]}>
                          {hoodCount} lagje & fshatra
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Check size={18} color={theme === 'green' ? colors.gold : colors.primary} />
                    )}
                  </Pressable>
                )
              })}
            </ScrollView>
            </Animated.View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  sheetGrabZone: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  sheetGrabPill: {
    width: 36,
    height: 4.5,
    borderRadius: 2.5,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  activeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 6,
  },
  headerActionText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  closeBtn: {
    padding: 6,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 22,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  section: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  clearLink: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 0.5,
  },
  segmentBtnText: {
    fontSize: 13,
  },
  pillsRow: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 0.5,
    marginRight: 8,
  },
  filterPillText: {
    fontSize: 13,
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  inputCol: {
    flex: 1,
    gap: 4,
  },
  inputSubLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  numInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  dashText: {
    marginTop: 18,
    fontSize: 16,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  chipBtnText: {
    fontSize: 13,
  },
  featuresWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureChipText: {
    fontSize: 12.5,
  },
  sortList: {
    gap: 8,
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    gap: 12,
  },
  sortIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortTextCol: {
    flex: 1,
    gap: 2,
  },
  sortTitle: {
    fontSize: 14,
  },
  sortDesc: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
  },
  footerBar: {
    padding: 16,
    borderTopWidth: 0.5,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  applyBtn: {
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  applyBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  allCitiesTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  allCitiesTriggerText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  allCitiesModalContainer: {
    flex: 1,
  },
  allCitiesModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  allCitiesModalTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  allCitiesModalSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  allCitiesSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  allCitiesSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  allCitiesList: {
    flex: 1,
  },
  allCitiesListContent: {
    paddingBottom: 32,
  },
  allCitiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
  },
  allCitiesRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  allCitiesIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allCitiesRowName: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
  },
  allCitiesRowSub: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
})
