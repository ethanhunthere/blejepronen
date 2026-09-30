import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Tabs } from 'expo-router'
import {
  Platform,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  Animated,
  PixelRatio,
} from 'react-native'
import { BlurView, type BlurTint } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Compass, Building2, Plus, MessageSquare, User } from 'lucide-react-native'
import { useTheme, Fonts, type ThemeMode } from '@/constants/theme'
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated'
import { tabBarCollapse, expandTabBar } from '@/lib/tab-bar-scroll'

import { isLogoutInProgress, subscribeAuthEvents } from '@/lib/auth-cache'
import {
  getConversationsSnapshot,
  subscribeConversations,
} from '@/lib/conversations'
import { RouteErrorBoundary, RouteErrorGuard } from '@/components/RouteErrorBoundary'

export const unstable_settings = {
  initialRouteName: 'index',
}

// ==========================================
// ANDROID NAVIGATION COMPONENTS (PRESERVED)
// ==========================================

interface TabBarItemContentProps {
  icon: any
  title: string
  focused: boolean
  badgeCount?: number
}

const TabBarItemContent = React.memo(function TabBarItemContent({
  icon: Icon,
  title,
  focused,
  badgeCount,
}: TabBarItemContentProps) {
  const { colors, theme } = useTheme()

  const activeColor = colors.tabBarActive
  const inactiveColor = colors.tabBarInactive

  return (
    <View style={styles.tabItemContainer}>
      <View style={styles.iconWrapper}>
        <Icon
          size={22}
          color={focused ? activeColor : inactiveColor}
          strokeWidth={focused ? 2.4 : 1.75}
        />

        {badgeCount && badgeCount > 0 ? (
          <View
            style={[
              styles.unreadBadge,
              {
                backgroundColor: theme === 'green' ? colors.gold : '#EF4444',
              },
            ]}
          >
            <Text
              style={[
                styles.unreadBadgeText,
                { color: theme === 'green' ? colors.chipTextActive : '#FFFFFF' },
              ]}
            >
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        style={[
          styles.tabLabel,
          {
            color: focused ? activeColor : inactiveColor,
            fontFamily: focused ? Fonts.bold : Fonts.medium,
          },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  )
})

const PostTabBarItem = React.memo(function PostTabBarItem({ focused }: { focused: boolean }) {
  const { colors, theme } = useTheme()
  const activeColor = colors.tabBarActive
  const inactiveColor = colors.tabBarInactive

  const postBtnBg = theme === 'green' ? colors.gold : colors.primary
  const postIconColor = theme === 'green' ? colors.chipTextActive : '#FFFFFF'

  return (
    <View style={styles.tabItemContainer}>
      <View
        style={[
          styles.postButton,
          {
            backgroundColor: postBtnBg,
            shadowColor: '#000',
          },
          focused && styles.postButtonActive,
        ]}
      >
        <Plus size={18} color={postIconColor} strokeWidth={2.8} />
      </View>

      <Text
        style={[
          styles.tabLabel,
          {
            color: focused ? activeColor : inactiveColor,
            fontFamily: focused ? Fonts.bold : Fonts.medium,
          },
        ]}
        numberOfLines={1}
      >
        Posto
      </Text>
    </View>
  )
})

// ==========================================
// IOS FLOATING NAVIGATION BAR & MICRO-COMPONENTS
// ==========================================

const TAB_CONFIG: Record<string, { icon: any; label: string; isPost?: boolean }> = {
  index: { icon: Compass, label: 'Eksploro' },
  listings: { icon: Building2, label: 'Pronat' },
  post: { icon: Plus, label: 'Posto', isPost: true },
  messages: { icon: MessageSquare, label: 'Mesazhe' },
  profile: { icon: User, label: 'Profili' },
}

// ==========================================
// iOS FLOATING TAB BAR — LIQUID GLASS RECIPE
// Apple Liquid Glass emulation: maximum frost (intensity 100) on Apple
// UltraThin materials; near-clear tint veils so background content truly
// refracts through; a top-lit specular gradient with an inner bottom-edge
// light bounce; a 0.5pt specular hairline ring; an inner light-scatter
// rim; and an outer ambient halo wrapping the capsule on dark surfaces.
// ==========================================

interface GlassRecipe {
  tint: BlurTint
  intensity: number
  /** Calibrated translucent base wash */
  base: string
  /** 0.5pt specular hairline border */
  border: string
  /** Horizontal top specular highlight */
  sheen: string
  /** Bottom subtle light bounce */
  bottomBounce: string
  /** Far-field ambient ground shadow */
  ambientShadowColor: string
  ambientShadowOpacity: number
  ambientShadowRadius: number
  ambientShadowOffset: { width: number; height: number }
  /** Near-field direct contact shadow */
  directShadowColor: string
  directShadowOpacity: number
  directShadowRadius: number
  directShadowOffset: { width: number; height: number }
}

const TAB_BAR_GLASS: Record<ThemeMode, GlassRecipe> = {
  white: {
    tint: 'systemUltraThinMaterialLight',
    intensity: 90,
    base: 'rgba(255, 255, 255, 0.65)',
    border: 'rgba(15, 23, 42, 0.08)',
    sheen: 'rgba(255, 255, 255, 0.95)',
    bottomBounce: 'rgba(15, 23, 42, 0.04)',
    ambientShadowColor: '#0F172A',
    ambientShadowOpacity: 0.12,
    ambientShadowRadius: 30,
    ambientShadowOffset: { width: 0, height: 12 },
    directShadowColor: '#0F172A',
    directShadowOpacity: 0.08,
    directShadowRadius: 8,
    directShadowOffset: { width: 0, height: 3 },
  },
  green: {
    tint: 'systemUltraThinMaterialDark',
    intensity: 95,
    base: 'rgba(8, 30, 25, 0.65)',
    border: 'rgba(212, 175, 55, 0.32)',
    sheen: 'rgba(250, 226, 140, 0.50)',
    bottomBounce: 'rgba(212, 175, 55, 0.14)',
    ambientShadowColor: '#000000',
    ambientShadowOpacity: 0.65,
    ambientShadowRadius: 36,
    ambientShadowOffset: { width: 0, height: 16 },
    directShadowColor: '#000000',
    directShadowOpacity: 0.45,
    directShadowRadius: 10,
    directShadowOffset: { width: 0, height: 4 },
  },
  black: {
    tint: 'systemUltraThinMaterialDark',
    intensity: 95,
    base: 'rgba(20, 26, 24, 0.66)',
    border: 'rgba(255, 255, 255, 0.16)',
    sheen: 'rgba(255, 255, 255, 0.36)',
    bottomBounce: 'rgba(47, 191, 139, 0.10)',
    ambientShadowColor: '#000000',
    ambientShadowOpacity: 0.80,
    ambientShadowRadius: 40,
    ambientShadowOffset: { width: 0, height: 18 },
    directShadowColor: '#000000',
    directShadowOpacity: 0.55,
    directShadowRadius: 12,
    directShadowOffset: { width: 0, height: 5 },
  },
}

interface IOSTabButtonProps {
  icon: any
  isFocused: boolean
  isPost?: boolean
  badgeCount?: number
  label: string
  onPress: () => void
  onLongPress: () => void
}

const IOSTabButton = React.memo(function IOSTabButton({
  icon: Icon,
  isFocused,
  isPost,
  badgeCount,
  label,
  onPress,
  onLongPress,
}: IOSTabButtonProps) {
  const { colors, theme } = useTheme()
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      tension: 200,
      friction: 14,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start()
  }

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    onPress()
  }

  const pillBg = isPost
    ? (theme === 'green' ? colors.gold : colors.primary)
    : 'transparent'

  const iconColor = isPost
    ? (theme === 'green' ? colors.chipTextActive : theme === 'black' ? '#000000' : '#FFFFFF')
    : (isFocused ? colors.tabBarActive : colors.tabBarInactive)

  const badgeBorderColor =
    theme === 'white'
      ? 'rgba(255, 255, 255, 0.85)'
      : theme === 'green'
      ? '#071C18'
      : '#101614'

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress}
      style={styles.iosTabItem}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Animated.View
        style={[
          isPost ? styles.iosPostPill : styles.iosIndicatorPill,
          {
            backgroundColor: pillBg,
            transform: [{ scale: scaleAnim }],
            ...(isPost
              ? {
                  shadowColor: theme === 'green' ? '#071C18' : '#000000',
                  shadowOpacity: theme === 'white' ? 0.16 : 0.28,
                }
              : {}),
          },
        ]}
      >
        <Icon
          size={isPost ? 20 : 21}
          color={iconColor}
          strokeWidth={isPost ? 2.6 : isFocused ? 2.3 : 1.85}
        />

        {badgeCount && badgeCount > 0 ? (
          <View
            style={[
              styles.iosUnreadBadge,
              {
                backgroundColor: theme === 'green' ? colors.gold : '#FF3B30',
                borderColor: badgeBorderColor,
              },
            ]}
          >
            <Text
              style={[
                styles.iosUnreadBadgeText,
                { color: theme === 'green' ? colors.chipTextActive : '#FFFFFF' },
              ]}
            >
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  )
})

// Apple Human Interface kinetic motion parameters:
// Snappy leading edge: instant departure, lightning rise time, high stiffness
const SLIDE_LEAD_SPRING = {
  damping: 28,
  stiffness: 380,
  mass: 0.65,
}

// Critically damped trailing edge: organic stretch, zero vibration, zero bounce delay
const SLIDE_TRAIL_SPRING = {
  damping: 29,
  stiffness: 290,
  mass: 0.75,
}

interface IOSTabBarProps {
  state: any
  navigation: any
  unreadCount: number
}

const IOSTabBar = React.memo(function IOSTabBar({
  state,
  navigation,
  unreadCount,
}: IOSTabBarProps) {
  const { colors, theme } = useTheme()
  const glass = TAB_BAR_GLASS[theme]
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = useWindowDimensions()

  const isLargeScreen = screenWidth > 500
  const horizontalMargin = isLargeScreen ? Math.round((screenWidth - 420) / 2) : 20

  const collapsedExtra = isLargeScreen ? 26 : Math.min(38, Math.round(screenWidth * 0.095))

  const collapseStyle = useAnimatedStyle(() => {
    const extra = collapsedExtra * tabBarCollapse.value
    return { left: horizontalMargin + extra, right: horizontalMargin + extra }
  })

  useEffect(() => {
    expandTabBar()
  }, [state.index])

  const bottomMargin = insets.bottom > 0 ? insets.bottom + 6 : (Platform.OS === 'android' ? 12 : 20)
  const capsuleHeight = 60
  const capsuleRadius = 30

  // ----------------------------------------
  // FLUID SLIDING INDICATOR MOTION ARCHITECTURE
  // The pill's geometry is a pure function of UI-thread shared values (tab
  // position, collapse progress, slide stretch) and immutable layout constants,
  // recomputed every frame: container collapse can never displace it off-center,
  // and no onLayout/setState feedback loop exists to make it dance on scroll.
  // ----------------------------------------
  const numTabs = state.routes.length || 5
  const ROW_PAD = 8
  const PILL_WIDTH = 48

  const centerU = useSharedValue(state.index + 0.5)
  const stretchPx = useSharedValue(0)
  const indicatorOpacity = useSharedValue(state.index === 2 ? 0 : 1)

  useEffect(() => {
    const curIndex = state.index
    centerU.value = withSpring(curIndex + 0.5, SLIDE_LEAD_SPRING)
    // Tactile stretch pulse at departure, settling back with trailing spring
    stretchPx.value = withSequence(withTiming(12, { duration: 70 }), withSpring(0, SLIDE_TRAIL_SPRING))
    // Seamlessly merge with Post button when at index 2, full opacity elsewhere
    indicatorOpacity.value = withTiming(curIndex === 2 ? 0 : 1, { duration: 180 })
  }, [state.index, centerU, stretchPx, indicatorOpacity])

  // Collapse-immune slot mapping + volume-preserving squash & stretch,
  // evaluated strictly on the UI thread at frame rate.
  const indicatorStyle = useAnimatedStyle(() => {
    const extra = collapsedExtra * tabBarCollapse.value
    // Subtract the glass capsule's hairline border per side: the tabs row lives
    // inside it, so slot geometry must match the row's true inner width or the
    // pill accumulates a per-slot drift away from the icon centers.
    const containerW =
      screenWidth - 2 * (horizontalMargin + extra) - 2 * StyleSheet.hairlineWidth
    const slot = (containerW - ROW_PAD * 2) / numTabs
    const center = ROW_PAD + centerU.value * slot
    const width = PILL_WIDTH + stretchPx.value
    const left = center - width / 2

    // Aerodynamic volume preservation (Poisson's ratio): as the pill stretches
    // horizontally, its height subtly compresses to preserve physical density
    const compression = Math.min(3.5, Math.max(0, width - PILL_WIDTH) * 0.12)
    const height = 38 - compression
    const top = 11 + compression / 2

    return {
      left,
      width,
      height,
      top,
      opacity: indicatorOpacity.value,
    }
  })

  // Theme-tuned indicator wash and specular outline
  const indicatorBg = useMemo(() => {
    switch (theme) {
      case 'white':
        return 'rgba(0, 103, 91, 0.08)'
      case 'green':
        return 'rgba(212, 175, 55, 0.14)'
      case 'black':
      default:
        return 'rgba(47, 191, 139, 0.12)'
    }
  }, [theme])

  const indicatorBorder = useMemo(() => {
    switch (theme) {
      case 'white':
        return 'rgba(0, 103, 91, 0.12)'
      case 'green':
        return 'rgba(212, 175, 55, 0.22)'
      case 'black':
      default:
        return 'rgba(47, 191, 139, 0.18)'
    }
  }, [theme])

  return (
    <Reanimated.View
      style={[
        styles.iosCapsuleOuter,
        {
          bottom: bottomMargin,
          height: capsuleHeight,
          borderRadius: capsuleRadius,
          shadowColor: glass.ambientShadowColor,
          shadowOpacity: glass.ambientShadowOpacity,
          shadowRadius: glass.ambientShadowRadius,
          shadowOffset: glass.ambientShadowOffset,
        },
        collapseStyle,
      ]}
    >
      {/* Layer 2: Tight Direct Contact Occlusion Shadow */}
      <View
        style={[
          styles.iosDirectShadowLayer,
          {
            borderRadius: capsuleRadius,
            shadowColor: glass.directShadowColor,
            shadowOpacity: glass.directShadowOpacity,
            shadowRadius: glass.directShadowRadius,
            shadowOffset: glass.directShadowOffset,
          },
        ]}
      >
        {/* Layer 3: Glass Prism Capsule with Continuous Chamfered Rim */}
        <View
          style={[
            styles.iosGlassContainer,
            {
              borderRadius: capsuleRadius,
              borderColor: glass.border,
            },
          ]}
        >
          {/* Genuine Apple Optical Translucency */}
          <BlurView
            intensity={glass.intensity}
            tint={Platform.OS === 'ios' ? glass.tint : (theme === 'white' ? 'light' : 'dark')}
            style={StyleSheet.absoluteFill}
          />

          {/* Calibrated Translucent Surface Wash */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.base }]} />

          {/* Ambient Top Light Specular Highlight */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0)', glass.sheen, 'rgba(255, 255, 255, 0)']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.iosTopSheen}
            pointerEvents="none"
          />

          {/* Ambient Bottom Light Bounce Highlight */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0)', glass.bottomBounce, 'rgba(255, 255, 255, 0)']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.iosBottomBounce}
            pointerEvents="none"
          />

          {/* Optically Centered Tabs Row with Fluid Sliding Indicator */}
          <View style={styles.iosBarRow} testID="tab-bar-row">
            {/* Elastic Traveling Pill Indicator with Pure Apple Minimal Materiality */}
            <Reanimated.View
              testID="tab-indicator"
              style={[
                styles.iosSlidingIndicator,
                {
                  backgroundColor: indicatorBg,
                  borderColor: indicatorBorder,
                },
                indicatorStyle,
              ]}
              pointerEvents="none"
            />

          {state.routes.map((route: { key: string; name: string; params?: any }, index: number) => {
            const isFocused = state.index === index
            const config = TAB_CONFIG[route.name] || { icon: Compass, label: route.name }

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params)
              }
            }

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              })
            }

            return (
              <IOSTabButton
                key={route.key}
                icon={config.icon}
                isFocused={isFocused}
                isPost={config.isPost}
                badgeCount={route.name === 'messages' ? unreadCount : undefined}
                label={config.label}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            )
          })}
        </View>
      </View>
    </View>
  </Reanimated.View>
)
})

// ==========================================
// MAIN TAB NAVIGATION CONTAINER
// ==========================================

export default function TabLayout() {
  const { colors, theme } = useTheme()
  const insets = useSafeAreaInsets()
  const [unreadCount, setUnreadCount] = useState<number>(0)

  const isIOS = Platform.OS === 'ios'

  useEffect(() => {
    let isMounted = true

    // Unread badge comes from the conversations store — the single source of
    // truth for unread counts. The store owns the multiplexed realtime channel
    // and coalesces bursts; the tab bar just reads `totalUnread`.
    const storeUnsubscribe = subscribeConversations(() => {
      if (!isMounted) return
      const snapshot = getConversationsSnapshot()
      setUnreadCount(isLogoutInProgress() ? 0 : snapshot.totalUnread)
    })

    // Seed once on mount (handlers are not replayed on subscribe).
    const snapshot = getConversationsSnapshot()
    setUnreadCount(isLogoutInProgress() ? 0 : snapshot.totalUnread)

    const unsubscribeAuth = subscribeAuthEvents(() => {
      if (!isMounted) return
      const snap = getConversationsSnapshot()
      setUnreadCount(isLogoutInProgress() ? 0 : snap.totalUnread)
    })

    return () => {
      isMounted = false
      unsubscribeAuth()
      storeUnsubscribe()
    }
  }, [])

  // Android: dynamic safe bottom spacing tailored to device bezels / navigation bar
  const bottomInset = insets.bottom > 0 ? insets.bottom : 10
  const androidTabHeight = 56 + bottomInset

  // Android tab bar background
  const renderTabBarBackground = React.useCallback(() => {
    return (
      <View style={StyleSheet.absoluteFill}>
        <BlurView
          intensity={100}
          tint={colors.blurTint}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                theme === 'white'
                  ? 'rgba(255, 255, 255, 0.72)'
                  : theme === 'green'
                  ? 'rgba(7, 28, 24, 0.78)'
                  : 'rgba(12, 17, 16, 0.68)',
            },
          ]}
        />
      </View>
    )
  }, [colors.blurTint, theme])

  const androidTabBarStyle = useMemo(() => {
    return {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'transparent',
      borderTopColor: colors.tabBarBorder,
      borderTopWidth: 0.5,
      height: androidTabHeight,
      paddingTop: 6,
      paddingBottom: bottomInset,
      elevation: 8,
      shadowColor: theme === 'green' ? '#071C18' : '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: theme === 'black' ? 0.35 : theme === 'green' ? 0.25 : 0.05,
      shadowRadius: 10,
    }
  }, [androidTabHeight, bottomInset, colors.tabBarBorder, theme])

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <RouteErrorGuard label="tab-bar">
      <Tabs
        detachInactiveScreens={false}
        unstable_screenErrorBoundary={RouteErrorBoundary as any}
        tabBar={(props) => <IOSTabBar {...props} unreadCount={unreadCount} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          lazy: true,
          // freezeOnBlur stays OFF: freezing the active tab while a stack
          // screen covers it makes the unfreeze/re-attach land inside the pop
          // transition (blank/hitch frame under the sliding card). Lazy mount
          // + virtualized lists already bound the offscreen cost.
          freezeOnBlur: false,
          animation: 'none',
          sceneStyle: { backgroundColor: colors.background },
          tabBarBackground: renderTabBarBackground,
          tabBarStyle: androidTabBarStyle,
          tabBarItemStyle: {
            height: 52,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 0,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Eksploro',
            tabBarIcon: ({ focused }) => (
              <TabBarItemContent icon={Compass} title="Eksploro" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="listings"
          options={{
            title: 'Pronat',
            tabBarIcon: ({ focused }) => (
              <TabBarItemContent icon={Building2} title="Pronat" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="post"
          options={{
            title: 'Posto',
            tabBarIcon: ({ focused }) => <PostTabBarItem focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Mesazhe',
            tabBarIcon: ({ focused }) => (
              <TabBarItemContent
                icon={MessageSquare}
                title="Mesazhe"
                focused={focused}
                badgeCount={unreadCount}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profili',
            tabBarIcon: ({ focused }) => (
              <TabBarItemContent icon={User} title="Profili" focused={focused} />
            ),
          }}
        />
      </Tabs>
      </RouteErrorGuard>
    </View>
  )
}

const styles = StyleSheet.create({
  // Android Styles (preserved 100%)
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 48,
    gap: 4,
  },
  iconWrapper: {
    width: 28,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10.5,
    lineHeight: Math.round(13 * Math.max(1, PixelRatio.getFontScale())),
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    lineHeight: 11,
  },
  postButton: {
    width: 42,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 3,
  },
  postButtonActive: {
    shadowOpacity: 0.38,
    shadowRadius: 6,
    transform: [{ scale: 1.04 }],
  },

  // iOS Modern Floating Frosted Glass Styles
  iosCapsuleOuter: {
    position: 'absolute',
    elevation: Platform.OS === 'android' ? 12 : 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderCurve: 'continuous',
  },
  iosDirectShadowLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderCurve: 'continuous',
  },
  iosGlassContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  iosTopSheen: {
    position: 'absolute',
    top: 0.5,
    left: 24,
    right: 24,
    height: 1.2,
    borderRadius: 1,
  },
  iosBottomBounce: {
    position: 'absolute',
    bottom: 0.5,
    left: 28,
    right: 28,
    height: 1,
    borderRadius: 1,
  },
  iosBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 8,
    position: 'relative',
  },
  iosSlidingIndicator: {
    position: 'absolute',
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 0,
  },
  iosTabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iosIndicatorPill: {
    width: 48,
    height: 38,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  iosPostPill: {
    width: 44,
    height: 32,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  iosUnreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosUnreadBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    lineHeight: 11,
  },
})

