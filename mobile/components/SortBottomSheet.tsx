import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  ScrollView,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ArrowDownUp,
  Check,
  Clock,
  TrendingDown,
  TrendingUp,
  Maximize2,
  Minimize2,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { SORT_OPTIONS, SortType } from '@/lib/property-filters'
import { TactilePressable } from '@/components/motion'
import { useBottomSheetGesture } from '@/lib/bottom-sheet-gesture'

interface SortBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  currentSort: SortType
  onSelectSort: (sort: SortType) => void
}

export function SortBottomSheet({
  isOpen,
  onClose,
  currentSort,
  onSelectSort,
}: SortBottomSheetProps) {
  const { colors, theme } = useTheme()
  const insets = useSafeAreaInsets()

  const [visible, setVisible] = useState(isOpen)
  const isClosingRef = useRef(false)

  const isGreen = theme === 'green'
  const isBlack = theme === 'black'
  const isWhite = theme === 'white'

  const activeAccent = isGreen ? colors.gold : colors.primary
  const activeContrastText = isGreen ? '#071C18' : '#FFFFFF'

  const {
    dragY,
    backdropOpacity,
    handlePanHandlers,
    cardPanHandlers,
    animateDismiss,
    animateEntrance,
  } = useBottomSheetGesture({
    dismissDistance: 450,
    dismissThreshold: 55,
    velocityThreshold: 0.28,
    onDismiss: () => {
      setVisible(false)
      isClosingRef.current = false
      onClose()
    },
    enableHaptics: true,
  })

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return
    isClosingRef.current = true
    // onDismiss is the single exit path; a callback here would
    // double-fire onClose on every programmatic dismissal.
    animateDismiss()
  }, [animateDismiss, onClose])

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      isClosingRef.current = false
      animateEntrance()
    } else if (visible && !isClosingRef.current) {
      handleClose()
    }
  }, [isOpen])

  const handleSelect = (sortId: SortType) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync()
    }
    onSelectSort(sortId)
    handleClose()
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.modalRoot}>
        {/* Animated Dim Backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            {
              opacity: backdropOpacity,
              backgroundColor: isBlack
                ? 'rgba(0, 0, 0, 0.70)'
                : isGreen
                ? 'rgba(7, 28, 24, 0.65)'
                : 'rgba(15, 23, 42, 0.45)',
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
            {Platform.OS === 'ios' && (
              <BlurView
                intensity={isBlack ? 35 : 25}
                tint={colors.blurTint}
                style={StyleSheet.absoluteFill}
              />
            )}
          </Pressable>
        </Animated.View>

        {/* Sliding Bottom Sheet Container with Native Drag-to-Dismiss */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16) + 10,
              transform: [{ translateY: dragY }],
            },
          ]}
          {...cardPanHandlers}
        >
          {/* Grab Handle Zone (Claims immediately on touch down) */}
          <View style={styles.handleContainer} {...handlePanHandlers}>
            <View
              style={[
                styles.handle,
                {
                  backgroundColor: isGreen
                    ? 'rgba(212, 175, 55, 0.35)'
                    : colors.border,
                },
              ]}
            />
          </View>

          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <View
                style={[
                  styles.headerIconBox,
                  {
                    backgroundColor: isGreen
                      ? 'rgba(212, 175, 55, 0.16)'
                      : isWhite
                      ? 'rgba(0, 103, 91, 0.10)'
                      : 'rgba(255, 255, 255, 0.10)',
                  },
                ]}
              >
                <ArrowDownUp size={16} color={activeAccent} strokeWidth={2.4} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                  Renditja e pronave
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                  Zgjidhni mënyrën se si dëshironi të shfaqen listimet
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Chip Pill Row for Instant Tap Switching */}
          <View style={styles.quickChipsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickChipsContent}
            >
              {SORT_OPTIONS.map((opt) => {
                const isSelected = currentSort === opt.id
                return (
                  <TactilePressable
                    key={`quick-${opt.id}`}
                    style={[
                      styles.quickChip,
                      {
                        backgroundColor: isSelected
                          ? activeAccent
                          : colors.surfaceSubtle,
                        borderColor: isSelected ? activeAccent : colors.border,
                      },
                    ]}
                    onPress={() => handleSelect(opt.id)}
                    activeScale={0.94}
                    haptic="selection"
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        {
                          color: isSelected ? activeContrastText : colors.textSecondary,
                          fontFamily: isSelected ? Fonts.bold : Fonts.medium,
                        },
                      ]}
                    >
                      {opt.shortLabel}
                    </Text>
                  </TactilePressable>
                )
              })}
            </ScrollView>
          </View>

          {/* Detailed Sort Options List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.optionsList}
            style={{ flexShrink: 1 }}
          >
            {SORT_OPTIONS.map((opt) => {
              const isSelected = currentSort === opt.id
              const Icon = opt.icon

              return (
                <TactilePressable
                  key={opt.id}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: isSelected
                        ? isGreen
                          ? 'rgba(212, 175, 55, 0.12)'
                          : isWhite
                          ? 'rgba(0, 103, 91, 0.08)'
                          : 'rgba(255, 255, 255, 0.08)'
                        : colors.surfaceSubtle,
                      borderColor: isSelected ? activeAccent : colors.border,
                    },
                  ]}
                  onPress={() => handleSelect(opt.id)}
                  activeScale={0.98}
                  haptic="selection"
                >
                  {/* Left Icon Badge */}
                  <View
                    style={[
                      styles.optionIconBox,
                      {
                        backgroundColor: isSelected
                          ? activeAccent
                          : colors.surface,
                        borderColor: isSelected ? activeAccent : colors.border,
                      },
                    ]}
                  >
                    <Icon
                      size={18}
                      color={isSelected ? activeContrastText : colors.primary}
                      strokeWidth={2.2}
                    />
                  </View>

                  {/* Option Text Information */}
                  <View style={styles.optionTextContent}>
                    <Text
                      style={[
                        styles.optionTitle,
                        {
                          color: isSelected ? colors.textPrimary : colors.textPrimary,
                          fontFamily: isSelected ? Fonts.bold : Fonts.semiBold,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={[
                        styles.optionDescription,
                        { color: colors.textMuted },
                      ]}
                      numberOfLines={1}
                    >
                      {opt.description}
                    </Text>
                  </View>

                  {/* Right Radio/Check Indicator */}
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected
                        ? {
                            backgroundColor: activeAccent,
                            borderColor: activeAccent,
                          }
                        : {
                            backgroundColor: 'transparent',
                            borderColor: colors.border,
                          },
                    ]}
                  >
                    {isSelected && (
                      <Check size={12} color={activeContrastText} strokeWidth={2.8} />
                    )}
                  </View>
                </TactilePressable>
              )
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 20,
    maxWidth: 680,
    maxHeight: '85%',
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  handle: {
    width: 38,
    height: 4.5,
    borderRadius: 2.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
  quickChipsWrapper: {
    marginHorizontal: -20,
    marginBottom: 14,
  },
  quickChipsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  quickChipText: {
    fontSize: 12,
    letterSpacing: -0.2,
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  optionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  optionTextContent: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: 14.5,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 11.5,
    letterSpacing: -0.1,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
})
