import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutChangeEvent,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Fonts } from '@/constants/theme'

export interface TabOption<T extends string> {
  key: T
  label: string
  icon?: (color: string, size: number) => React.ReactNode
}

export interface SlidingTabSwitcherProps<T extends string> {
  tabs: TabOption<T>[]
  activeTab: T
  onChangeTab: (tab: T) => void
  containerBg?: string
  indicatorBg?: string
  borderColor?: string
  activeTextColor?: string
  inactiveTextColor?: string
  activeIconColor?: string
  inactiveIconColor?: string
  style?: StyleProp<ViewStyle>
  height?: number
}

const SPRING_CONFIG = {
  damping: 28,
  stiffness: 380,
  mass: 0.7,
}

export function SlidingTabSwitcher<T extends string>({
  tabs,
  activeTab,
  onChangeTab,
  containerBg = 'rgba(255, 255, 255, 0.06)',
  indicatorBg = '#1E293B',
  borderColor = 'rgba(255, 255, 255, 0.1)',
  activeTextColor = '#FFFFFF',
  inactiveTextColor = '#94A3B8',
  activeIconColor,
  inactiveIconColor,
  style,
  height = 44,
}: SlidingTabSwitcherProps<T>) {
  const [containerWidth, setContainerWidth] = useState(0)

  const translateX = useSharedValue(0)
  const isInitialized = useSharedValue(false)

  const activeIndex = tabs.findIndex((t) => t.key === activeTab)
  const padding = 3
  const numTabs = tabs.length || 1
  const pillWidth = containerWidth > 0 ? (containerWidth - padding * 2) / numTabs : 0

  const updatePosition = useCallback(
    (index: number, animated = true) => {
      if (index < 0 || containerWidth <= 0) return
      const pillW = (containerWidth - padding * 2) / numTabs
      const targetX = padding + index * pillW

      if (!isInitialized.value || !animated) {
        translateX.value = targetX
        isInitialized.value = true
      } else {
        translateX.value = withSpring(targetX, SPRING_CONFIG)
      }
    },
    [containerWidth, numTabs, padding, translateX, isInitialized]
  )

  useEffect(() => {
    if (containerWidth > 0 && activeIndex >= 0) {
      updatePosition(activeIndex, isInitialized.value)
    }
  }, [activeIndex, containerWidth, updatePosition, isInitialized])

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width)
    }
  }

  // Pure GPU-bound transform (zero Yoga layout recalculations during motion)
  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: containerBg,
          borderColor,
          height,
          padding,
        },
        style,
      ]}
      onLayout={handleContainerLayout}
    >
      {/* Sliding Active Pill Indicator (GPU-accelerated transform only) */}
      {pillWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: indicatorBg,
              borderColor,
              width: pillWidth,
              top: padding,
              bottom: padding,
            },
            animatedIndicatorStyle,
          ]}
        />
      )}

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {tabs.map((tab, idx) => {
          const isActive = tab.key === activeTab
          const iconColor = isActive
            ? activeIconColor || activeTextColor
            : inactiveIconColor || inactiveTextColor

          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                if (tab.key !== activeTab) {
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  onChangeTab(tab.key)
                }
              }}
              style={styles.tabItem}
              hitSlop={4}
            >
              <View style={styles.tabContent}>
                {tab.icon && (
                  <View style={styles.iconBox}>
                    {tab.icon(iconColor, 14)}
                  </View>
                )}
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: isActive ? activeTextColor : inactiveTextColor,
                      fontFamily: isActive ? Fonts.bold : Fonts.medium,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 3,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 0,
    borderRadius: 11,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1.5 },
    elevation: 3,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 2,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 13,
    letterSpacing: -0.2,
  },
})
