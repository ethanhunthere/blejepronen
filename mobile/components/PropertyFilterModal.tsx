import React, { useState, useEffect } from 'react'
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
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { KOSOVO_LOCATIONS } from '@/lib/kosovo-locations'
import {
  PropertyFilterState,
  DEFAULT_FILTER_STATE,
  POPULAR_CITIES,
  ALL_CITIES,
  ROOM_OPTIONS,
  FLOOR_OPTIONS,
  CONDITION_OPTIONS,
  FEATURES_LIST,
  PRICE_PRESETS_SALE,
  PRICE_PRESETS_RENT,
  AREA_PRESETS,
  SORT_OPTIONS,
  countActiveFilters,
  SortType,
} from '@/lib/property-filters'

interface PropertyFilterModalProps {
  visible: boolean
  onClose: () => void
  filters: PropertyFilterState
  onApply: (updated: PropertyFilterState) => void
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

  useEffect(() => {
    if (visible) {
      setDraft(filters)
    }
  }, [visible, filters])

  const pricePresets =
    draft.transactionType === 'qira' ? PRICE_PRESETS_RENT : PRICE_PRESETS_SALE

  const availableNeighborhoods = draft.city
    ? KOSOVO_LOCATIONS[draft.city as keyof typeof KOSOVO_LOCATIONS] || []
    : []

  const activeCount = countActiveFilters(draft)

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
        {/* Modal Top Bar */}
        <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
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
                                ? '#003E37'
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
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Qyteti</Text>
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
                            ? '#003E37'
                            : '#FFFFFF'
                          : colors.textSecondary,
                        fontFamily: !draft.city ? Fonts.bold : Fonts.medium,
                      },
                    ]}
                  >
                    Të gjitha qytetet
                  </Text>
                </Pressable>

                {POPULAR_CITIES.map((c) => {
                  const isSelected = draft.city.toLowerCase() === c.toLowerCase()
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
                                ? '#003E37'
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
                              ? '#003E37'
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
                                ? '#003E37'
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
                    onBlur={() => setFocusedInput(null)}
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
                    onBlur={() => setFocusedInput(null)}
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
                    onBlur={() => setFocusedInput(null)}
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
                    onBlur={() => setFocusedInput(null)}
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
                                ? '#003E37'
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
                                ? '#003E37'
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
                                ? '#003E37'
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
                        {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
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
                  { color: theme === 'green' ? '#003E37' : '#FFFFFF' },
                ]}
              >
                Shiko Rezultatet {activeCount > 0 ? `(${activeCount} filtra)` : ''}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
})
