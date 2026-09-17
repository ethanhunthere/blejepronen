import React from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { CATEGORY_ITEMS } from '@/lib/property-filters'

interface PropertyFilterBarProps {
  transactionType: 'all' | 'shitje' | 'qira'
  onChangeTransactionType: (type: 'all' | 'shitje' | 'qira') => void
  selectedCategory: string
  onChangeCategory: (catId: string) => void
  categoryCounts?: Record<string, number>
}

export function PropertyFilterBar({
  transactionType,
  onChangeTransactionType,
  selectedCategory,
  onChangeCategory,
  categoryCounts,
}: PropertyFilterBarProps) {
  const { colors, theme } = useTheme()

  const handleTransactionPress = (type: 'all' | 'shitje' | 'qira') => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    onChangeTransactionType(type)
  }

  const handleCategoryPress = (catId: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    onChangeCategory(catId)
  }

  return (
    <View style={styles.container}>
      {/* 1. Apple UISegmentedControl Style Transaction Type Selector */}
      <View
        style={[
          styles.transactionTabs,
          {
            backgroundColor:
              theme === 'white'
                ? 'rgba(0, 0, 0, 0.05)'
                : 'rgba(255, 255, 255, 0.07)',
            borderWidth: 0.5,
            borderColor:
              theme === 'white'
                ? 'rgba(0, 0, 0, 0.04)'
                : 'rgba(255, 255, 255, 0.10)',
          },
        ]}
      >
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
                  borderWidth: 0.5,
                  borderColor:
                    theme === 'white'
                      ? 'rgba(0, 0, 0, 0.04)'
                      : 'rgba(255, 255, 255, 0.14)',
                  shadowColor: '#000',
                  shadowOpacity: theme === 'black' ? 0.35 : 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
              onPress={() => handleTransactionPress(type)}
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

      {/* 2. Unified Category Pills Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {CATEGORY_ITEMS.map((item) => {
          const Icon = item.icon
          const isSelected = selectedCategory === item.id
          const count = categoryCounts ? categoryCounts[item.id] : undefined

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

              {count !== undefined && count > 0 && (
                <View
                  style={[
                    styles.countPill,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(0,0,0,0.15)'
                        : colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countPillText,
                      { color: isSelected ? colors.chipTextActive : colors.textMuted },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 10,
  },
  transactionTabs: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    marginBottom: 12,
  },
  transactionTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  transactionTabText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    letterSpacing: -0.1,
  },
  categoriesScroll: {
    paddingRight: 16,
    gap: 8,
    paddingBottom: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 8.5,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  categoryPillText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    letterSpacing: -0.1,
  },
  countPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countPillText: {
    fontSize: 10.5,
    fontFamily: Fonts.bold,
  },
})
