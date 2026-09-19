import React, { useRef, useState, useEffect, useCallback, memo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Platform,
  LayoutChangeEvent,
} from 'react-native'
import { SlidersHorizontal } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'

export type SubFilter = 'all' | 'active' | 'sold' | 'inactive'

interface SubFilterNavigationBarProps {
  activeFilter: SubFilter
  onChangeFilter: (filter: SubFilter) => void
  counts: {
    all: number
    active: number
    sold: number
    inactive: number
  }
  isCompact?: boolean
}

const BASE_INDICATOR_WIDTH = 100

export const SubFilterNavigationBar = memo(function SubFilterNavigationBar({
  activeFilter,
  onChangeFilter,
  counts,
  isCompact = false,
}: SubFilterNavigationBarProps) {
  const { colors, theme } = useTheme()
  const specularBorder = colors.border

  const isGreenTheme = theme === 'green'
  const isBlackTheme = theme === 'black'

  // Dynamic theme-derived palette
  const activeBg = isGreenTheme
    ? 'rgba(212, 168, 83, 0.18)'
    : isBlackTheme
    ? 'rgba(255, 255, 255, 0.14)'
    : 'rgba(0, 103, 91, 0.10)'

  const activeBorder = isGreenTheme
    ? colors.gold
    : isBlackTheme
    ? 'rgba(255, 255, 255, 0.28)'
    : colors.primary

  const activeTextColor = isGreenTheme
    ? colors.gold
    : isBlackTheme
    ? '#FFFFFF'
    : colors.primary

  const activeBadgeBg = isGreenTheme
    ? 'rgba(212, 168, 83, 0.25)'
    : isBlackTheme
    ? 'rgba(255, 255, 255, 0.22)'
    : 'rgba(0, 103, 91, 0.16)'

  const activeBadgeTextColor = isGreenTheme
    ? colors.gold
    : isBlackTheme
    ? '#FFFFFF'
    : colors.primary

  // Layout storage
  const tabLayoutsRef = useRef<Partial<Record<SubFilter, { x: number; width: number; height: number }>>>({})
  const [layoutsReady, setLayoutsReady] = useState(false)
  const containerWidthRef = useRef<number>(0)
  const contentWidthRef = useRef<number>(0)
  const scrollViewRef = useRef<ScrollView>(null)
  const isFirstRenderRef = useRef(true)

  // Strictly native driver Animated values (60/120 FPS locked)
  const indicatorTranslateX = useRef(new Animated.Value(0)).current
  const indicatorScaleX = useRef(new Animated.Value(1)).current
  const indicatorOpacity = useRef(new Animated.Value(0)).current

  // Spring animation targeting with Apple CASpringAnimation physics
  const animateToTab = useCallback(
    (filter: SubFilter, animated: boolean) => {
      const layout = tabLayoutsRef.current[filter]
      if (!layout) return

      const targetCenter = layout.x + layout.width / 2
      const targetTranslateX = targetCenter - BASE_INDICATOR_WIDTH / 2
      const targetScaleX = layout.width / BASE_INDICATOR_WIDTH

      if (!animated) {
        indicatorTranslateX.setValue(targetTranslateX)
        indicatorScaleX.setValue(targetScaleX)
        indicatorOpacity.setValue(1)
        return
      }

      Animated.parallel([
        Animated.spring(indicatorTranslateX, {
          toValue: targetTranslateX,
          stiffness: 300,
          damping: 26,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.spring(indicatorScaleX, {
          toValue: targetScaleX,
          stiffness: 300,
          damping: 26,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(indicatorOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start()
    },
    [indicatorTranslateX, indicatorScaleX, indicatorOpacity]
  )

  // Fluid auto-centering on ScrollView
  const scrollToTab = useCallback(
    (filter: SubFilter, animated: boolean) => {
      const layout = tabLayoutsRef.current[filter]
      const containerWidth = containerWidthRef.current
      const contentWidth = contentWidthRef.current

      if (!layout || !containerWidth || !scrollViewRef.current) return

      const tabCenter = layout.x + layout.width / 2
      const targetX = tabCenter - containerWidth / 2
      const maxScroll = Math.max(0, contentWidth - containerWidth)
      const clampedX = Math.max(0, Math.min(targetX, maxScroll))

      scrollViewRef.current.scrollTo({
        x: clampedX,
        animated,
      })
    },
    []
  )

  // Synchronize on activeFilter change or layout readiness
  useEffect(() => {
    if (!layoutsReady) return

    if (isFirstRenderRef.current) {
      animateToTab(activeFilter, false)
      scrollToTab(activeFilter, false)
      isFirstRenderRef.current = false
    } else {
      animateToTab(activeFilter, true)
      scrollToTab(activeFilter, true)
    }
  }, [activeFilter, layoutsReady, animateToTab, scrollToTab])

  const handleTabLayout = (filter: SubFilter, e: LayoutChangeEvent) => {
    const { x, width, height } = e.nativeEvent.layout
    tabLayoutsRef.current[filter] = { x, width, height }

    const allMeasured =
      !!tabLayoutsRef.current.all &&
      !!tabLayoutsRef.current.active &&
      !!tabLayoutsRef.current.sold &&
      !!tabLayoutsRef.current.inactive

    if (allMeasured && !layoutsReady) {
      setLayoutsReady(true)
    } else if (layoutsReady) {
      animateToTab(activeFilter, false)
    }
  }

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    containerWidthRef.current = e.nativeEvent.layout.width
    if (layoutsReady) {
      scrollToTab(activeFilter, false)
    }
  }

  const handleContentSizeChange = (w: number) => {
    contentWidthRef.current = w
    if (layoutsReady) {
      scrollToTab(activeFilter, false)
    }
  }

  const handleTabPress = (filter: SubFilter) => {
    if (activeFilter === filter) return

    if (Platform.OS !== 'web') {
      Haptics.selectionAsync()
    }

    // 0ms instant trigger for spring and auto-center
    animateToTab(filter, true)
    scrollToTab(filter, true)
    onChangeFilter(filter)
  }

  const TABS: Array<{
    id: SubFilter
    label: string
    count: number
    hasIcon?: boolean
  }> = [
    { id: 'all', label: 'Të gjitha', count: counts.all, hasIcon: true },
    { id: 'active', label: 'Aktive', count: counts.active },
    { id: 'sold', label: 'Të shitura', count: counts.sold },
    { id: 'inactive', label: 'Jo aktive', count: counts.inactive },
  ]

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={handleContainerLayout}
        onContentSizeChange={handleContentSizeChange}
        contentContainerStyle={[
          styles.scrollContent,
          isCompact && { paddingHorizontal: 2 },
        ]}
      >
        <View
          style={[
            styles.track,
            isCompact && { padding: 2.5, gap: 3 },
            {
              backgroundColor: colors.surface,
              borderColor: specularBorder,
            },
          ]}
        >
          {/* Gliding Active Indicator with Native Driver Spring Physics */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glidingIndicator,
              isCompact && { top: 2.5, bottom: 2.5, borderRadius: 10 },
              {
                backgroundColor: activeBg,
                borderColor: activeBorder,
                shadowColor: isGreenTheme ? colors.gold : colors.primary,
                opacity: indicatorOpacity,
                transform: [
                  { translateX: indicatorTranslateX },
                  { scaleX: indicatorScaleX },
                ],
              },
            ]}
          />

          {/* Tab Buttons */}
          {TABS.map((tab) => {
            const isActive = activeFilter === tab.id

            return (
              <Pressable
                key={tab.id}
                onLayout={(e) => handleTabLayout(tab.id, e)}
                onPress={() => handleTabPress(tab.id)}
                style={({ pressed }) => [
                  styles.tabButton,
                  isCompact && {
                    paddingVertical: 6,
                    paddingHorizontal: 9,
                    gap: 5,
                    borderRadius: 10,
                  },
                  pressed && styles.tabButtonPressed,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                {tab.hasIcon && (
                  <SlidersHorizontal
                    size={isCompact ? 11 : 12}
                    color={isActive ? activeTextColor : colors.textSecondary}
                    strokeWidth={2.4}
                  />
                )}

                <Text
                  style={[
                    styles.tabLabel,
                    isCompact && { fontSize: 11 },
                    {
                      color: isActive ? activeTextColor : colors.textPrimary,
                      fontFamily: isActive ? Fonts.bold : Fonts.semiBold,
                    },
                  ]}
                >
                  {tab.label}
                </Text>

                <View
                  style={[
                    styles.counterBadge,
                    isCompact && {
                      paddingHorizontal: 4.5,
                      paddingVertical: 1,
                      borderRadius: 6,
                    },
                    {
                      backgroundColor: isActive
                        ? activeBadgeBg
                        : colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.counterBadgeText,
                      isCompact && { fontSize: 10 },
                      {
                        color: isActive
                          ? activeBadgeTextColor
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
})

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    position: 'relative',
  },
  glidingIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 0,
    width: BASE_INDICATOR_WIDTH,
    borderRadius: 11,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 1,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 11,
    gap: 6,
    zIndex: 2,
  },
  tabButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  tabLabel: {
    fontSize: 12,
    letterSpacing: -0.1,
  },
  counterBadge: {
    paddingHorizontal: 5.5,
    paddingVertical: 1.5,
    borderRadius: 7,
  },
  counterBadgeText: {
    fontSize: 10.5,
    fontFamily: Fonts.bold,
  },
})
