import React, { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  LayoutChangeEvent,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { SlidersHorizontal } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import {
  BorderWidths,
  Fonts,
  FontSizes,
  Radii,
  Spacing,
  Tracking,
  useTheme,
} from '@/constants/theme'
import { useReducedMotionEnabled } from '@/components/motion/useReducedMotion'

export type SubFilter = 'all' | 'active' | 'sold' | 'inactive'

export interface SubFilterCounts {
  all: number
  active: number
  sold: number
  inactive: number
}

interface SubFilterNavigationBarProps {
  activeFilter: SubFilter
  onChangeFilter: (filter: SubFilter) => void
  counts: SubFilterCounts
  isCompact?: boolean
}

const SPRING_CONFIG = {
  damping: 30,
  stiffness: 340,
  mass: 0.85,
}

/** Opacity dip while a tab is held — no colour swap, so it works in all themes. */
const PRESSED_OPACITY = 0.75
/** Small glyphs need a heavier stroke to survive the downscale. */
const TAB_ICON_STROKE_WIDTH = 2.4
/** Extra room around each tab so the 26dp-tall row stays a 44dp target. */
const TAB_HIT_SLOP = { top: Spacing.s8, bottom: Spacing.s8, left: Spacing.s4, right: Spacing.s4 }

/**
 * Horizontally scrollable listing-status tab bar with a spring-driven pill.
 *
 * Two things to know before editing:
 *
 * - **Motion is optional.** Under a system "reduce motion" setting the pill
 *   snaps to the active tab and the ScrollView jumps without animation. The
 *   end state is identical either way; only the transition is dropped.
 * - **No blur, no translucent overlays.** The bar sits directly above a
 *   scrolling feed, so every fill is an opaque token from the semantic layer.
 *   A backdrop blur here would be re-rasterised on every scrolled frame.
 */
function SubFilterNavigationBarComponent({
  activeFilter,
  onChangeFilter,
  counts,
  isCompact = false,
}: SubFilterNavigationBarProps) {
  const { semantic, shadows } = useTheme()
  const reducedMotion = useReducedMotionEnabled()

  // Layout storage
  const tabLayoutsRef = useRef<Partial<Record<SubFilter, { x: number; width: number; height: number }>>>({})
  const [layoutsReady, setLayoutsReady] = useState(false)
  const containerWidthRef = useRef<number>(0)
  const contentWidthRef = useRef<number>(0)
  const scrollViewRef = useRef<ScrollView>(null)
  const activeTargetRef = useRef<SubFilter>(activeFilter)

  // Reanimated shared values for undistorted width and position
  const indicatorLeft = useSharedValue(0)
  const indicatorWidth = useSharedValue(0)
  const indicatorOpacity = useSharedValue(0)

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      left: indicatorLeft.value,
      width: indicatorWidth.value,
      opacity: indicatorOpacity.value,
    }
  })

  const animateToTab = useCallback(
    (filter: SubFilter, animated: boolean) => {
      const layout = tabLayoutsRef.current[filter]
      if (!layout) return

      if (!animated || reducedMotion) {
        indicatorLeft.value = layout.x
        indicatorWidth.value = layout.width
        indicatorOpacity.value = 1
        return
      }

      indicatorLeft.value = withSpring(layout.x, SPRING_CONFIG)
      indicatorWidth.value = withSpring(layout.width, SPRING_CONFIG)
      indicatorOpacity.value = withSpring(1)
    },
    [indicatorLeft, indicatorWidth, indicatorOpacity, reducedMotion]
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
        animated: animated && !reducedMotion,
      })
    },
    [reducedMotion]
  )

  useEffect(() => {
    if (!layoutsReady) return

    if (activeTargetRef.current !== activeFilter) {
      activeTargetRef.current = activeFilter
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

    if (!layoutsReady && allMeasured) {
      const layout = tabLayoutsRef.current[activeFilter]
      if (layout) {
        indicatorLeft.value = layout.x
        indicatorWidth.value = layout.width
        indicatorOpacity.value = 1
      }
      setLayoutsReady(true)
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

    activeTargetRef.current = filter
    animateToTab(filter, true)
    scrollToTab(filter, true)
    onChangeFilter(filter)
  }

  const TABS: Array<{
    id: SubFilter
    label: string
    count: number
    hasIcon?: boolean
  }> = useMemo(
    () => [
      { id: 'all', label: 'Të gjitha', count: counts.all, hasIcon: true },
      { id: 'active', label: 'Aktive', count: counts.active },
      { id: 'sold', label: 'Të shitura', count: counts.sold },
      { id: 'inactive', label: 'Jo aktive', count: counts.inactive },
    ],
    [counts.all, counts.active, counts.sold, counts.inactive]
  )

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
          isCompact && { paddingHorizontal: Spacing.s2 },
        ]}
      >
        <View
          accessibilityRole="tablist"
          style={[
            styles.track,
            isCompact && { padding: Spacing.s2_5, gap: Spacing.s3 },
            {
              backgroundColor: semantic.surface,
              borderColor: semantic.border,
            },
          ]}
        >
          {/* Gliding Active Indicator with Native Reanimated Spring Physics */}
          <Animated.View
            pointerEvents="none"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.glidingIndicator,
              isCompact && {
                top: Spacing.s2_5,
                bottom: Spacing.s2_5,
                borderRadius: Radii.r10,
              },
              {
                backgroundColor: semantic.selectedBg,
                borderColor: semantic.selectedBorder,
                // Brand-tinted lift rather than a neutral one, as before.
                ...shadows.xs,
                shadowColor: semantic.primary,
              },
              animatedIndicatorStyle,
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
                accessible
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${tab.label}, ${tab.count}`}
                style={({ pressed }) => [
                  styles.tabButton,
                  isCompact && {
                    paddingVertical: Spacing.s6,
                    paddingHorizontal: Spacing.s9,
                    gap: Spacing.s5,
                    borderRadius: Radii.r10,
                  },
                  !layoutsReady && isActive && {
                    backgroundColor: semantic.selectedBg,
                    borderColor: semantic.selectedBorder,
                  },
                  pressed && styles.tabButtonPressed,
                ]}
                hitSlop={TAB_HIT_SLOP}
              >
                {tab.hasIcon && (
                  <SlidersHorizontal
                    size={isCompact ? Spacing.s11 : Spacing.s12}
                    color={isActive ? semantic.selectedText : semantic.textSecondary}
                    strokeWidth={TAB_ICON_STROKE_WIDTH}
                  />
                )}

                <Text
                  style={[
                    styles.tabLabel,
                    isCompact && { fontSize: FontSizes.caption },
                    {
                      color: isActive ? semantic.selectedText : semantic.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>

                <View
                  style={[
                    styles.counterBadge,
                    isCompact && {
                      paddingHorizontal: Spacing.s4_5,
                      paddingVertical: Spacing.s1,
                      borderRadius: Radii.r6,
                    },
                    {
                      backgroundColor: isActive
                        ? semantic.selectedBadgeBg
                        : semantic.surfaceMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.counterBadgeText,
                      isCompact && { fontSize: FontSizes.micro },
                      {
                        color: isActive
                          ? semantic.selectedBadgeText
                          : semantic.textSecondary,
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
}

export const SubFilterNavigationBar = memo(
  SubFilterNavigationBarComponent,
  (prev, next) => {
    return (
      prev.activeFilter === next.activeFilter &&
      prev.isCompact === next.isCompact &&
      prev.onChangeFilter === next.onChangeFilter &&
      prev.counts.all === next.counts.all &&
      prev.counts.active === next.counts.active &&
      prev.counts.sold === next.counts.sold &&
      prev.counts.inactive === next.counts.inactive
    )
  }
)

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.s2,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.s3,
    borderRadius: Radii.r14,
    borderCurve: 'continuous',
    borderWidth: BorderWidths.thin,
    gap: Spacing.s4,
    position: 'relative',
  },
  glidingIndicator: {
    position: 'absolute',
    top: Spacing.s3,
    bottom: Spacing.s3,
    borderRadius: Radii.r11,
    borderCurve: 'continuous',
    borderWidth: BorderWidths.thin,
    zIndex: 1,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.s7,
    paddingHorizontal: Spacing.s12,
    borderRadius: Radii.r11,
    borderCurve: 'continuous',
    borderWidth: BorderWidths.thin,
    borderColor: 'transparent',
    gap: Spacing.s6,
    zIndex: 2,
  },
  tabButtonPressed: {
    opacity: PRESSED_OPACITY,
  },
  tabLabel: {
    fontSize: FontSizes.footnote,
    letterSpacing: Tracking.t1,
    fontFamily: Fonts.semiBold,
  },
  counterBadge: {
    paddingHorizontal: Spacing.s5_5,
    paddingVertical: Spacing.s1_5,
    borderRadius: Radii.r7,
    borderCurve: 'continuous',
  },
  counterBadgeText: {
    fontSize: FontSizes.microLg,
    fontFamily: Fonts.semiBold,
  },
})
