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
} from 'react-native'
import { BlurView, type BlurTint } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Compass, Building2, Plus, MessageSquare, User } from 'lucide-react-native'
import { useTheme, Fonts, type ThemeMode } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { createSafeChannel } from '@/lib/realtime'

import { isLogoutInProgress } from '@/lib/auth-cache'

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
// iOS FLOATING TAB BAR — GLASS MATERIAL RECIPE
// "Polished crystal": maximum frost (intensity 100) + Apple UltraThin
// materials, a deliberately LOW base tint so underlying content shimmers
// through, a top-lit specular gradient and razor-thin edge sheen.
// ==========================================

interface GlassRecipe {
  tint: BlurTint
  intensity: number
  /** Base tint veil — kept low so the blur (not the tint) defines the glass */
  base: string
  /** Specular ring highlight around the capsule */
  edge: string
  /** Razor-thin top edge sheen (light catching the top curve) */
  sheen: string
  /** Vertical specular gradient: top-lit, fading to a faint bottom shade */
  gradient: readonly [string, string, string, string]
}

const TAB_BAR_GLASS: Record<ThemeMode, GlassRecipe> = {
  white: {
    tint: 'systemUltraThinMaterialLight',
    intensity: 100,
    base: 'rgba(255, 255, 255, 0.46)',
    edge: 'rgba(255, 255, 255, 0.75)',
    sheen: 'rgba(255, 255, 255, 0.60)',
    gradient: [
      'rgba(255, 255, 255, 0.30)',
      'rgba(255, 255, 255, 0.08)',
      'rgba(255, 255, 255, 0.00)',
      'rgba(15, 23, 42, 0.05)',
    ],
  },
  green: {
    tint: 'systemUltraThinMaterialDark',
    intensity: 100,
    base: 'rgba(7, 28, 24, 0.54)',
    edge: 'rgba(212, 175, 55, 0.34)',
    sheen: 'rgba(255, 255, 255, 0.22)',
    gradient: [
      'rgba(255, 255, 255, 0.16)',
      'rgba(255, 255, 255, 0.04)',
      'rgba(255, 255, 255, 0.00)',
      'rgba(0, 0, 0, 0.16)',
    ],
  },
  black: {
    tint: 'systemUltraThinMaterialDark',
    intensity: 100,
    base: 'rgba(16, 22, 21, 0.52)',
    edge: 'rgba(255, 255, 255, 0.20)',
    sheen: 'rgba(255, 255, 255, 0.20)',
    gradient: [
      'rgba(255, 255, 255, 0.14)',
      'rgba(255, 255, 255, 0.03)',
      'rgba(255, 255, 255, 0.00)',
      'rgba(0, 0, 0, 0.18)',
    ],
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
      toValue: 0.90,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start()
  }

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    onPress()
  }

  // Visual styling calculation based on active state and tab type
  let pillBg = 'transparent'
  let pillBorder = 'transparent'
  let iconColor = colors.tabBarInactive

  if (isPost) {
    if (isFocused) {
      pillBg = theme === 'green' ? colors.gold : colors.primary
      pillBorder = theme === 'green' ? colors.gold : colors.primary
      iconColor =
        theme === 'green' ? colors.chipTextActive : theme === 'black' ? '#000000' : '#FFFFFF'
    } else {
      pillBg =
        theme === 'white'
          ? 'rgba(0, 103, 91, 0.12)'
          : theme === 'green'
          ? 'rgba(212, 175, 55, 0.20)'
          : 'rgba(47, 191, 139, 0.18)'
      pillBorder =
        theme === 'white'
          ? 'rgba(0, 103, 91, 0.20)'
          : theme === 'green'
          ? 'rgba(212, 175, 55, 0.35)'
          : 'rgba(47, 191, 139, 0.30)'
      iconColor =
        theme === 'white' ? colors.primary : theme === 'green' ? colors.gold : colors.primary
    }
  } else if (isFocused) {
    pillBg =
      theme === 'white'
        ? 'rgba(0, 103, 91, 0.10)'
        : theme === 'green'
        ? 'rgba(212, 175, 55, 0.16)'
        : 'rgba(47, 191, 139, 0.16)'
    pillBorder =
      theme === 'white'
        ? 'rgba(0, 103, 91, 0.14)'
        : theme === 'green'
        ? 'rgba(212, 175, 55, 0.28)'
        : 'rgba(47, 191, 139, 0.24)'
    iconColor = colors.tabBarActive
  }

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
          styles.iosIndicatorPill,
          {
            backgroundColor: pillBg,
            borderColor: pillBorder,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Icon
          size={isPost ? 21 : 22}
          color={iconColor}
          strokeWidth={isFocused ? 2.5 : 2.0}
        />

        {badgeCount && badgeCount > 0 ? (
          <View
            style={[
              styles.iosUnreadBadge,
              {
                backgroundColor: theme === 'green' ? colors.gold : '#EF4444',
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
  const { theme } = useTheme()
  const glass = TAB_BAR_GLASS[theme]
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = useWindowDimensions()

  const isLargeScreen = screenWidth > 500
  const horizontalMargin = isLargeScreen ? Math.round((screenWidth - 420) / 2) : 20
  const bottomMargin = insets.bottom > 0 ? insets.bottom + 6 : 20
  const capsuleHeight = 60
  const capsuleRadius = 30

  return (
    <View
      style={[
        styles.iosCapsuleOuter,
        {
          left: horizontalMargin,
          right: horizontalMargin,
          bottom: bottomMargin,
          height: capsuleHeight,
          borderRadius: capsuleRadius,
          shadowColor: theme === 'black' ? '#000000' : theme === 'green' ? '#020C0A' : '#0F172A',
          shadowOpacity: theme === 'black' ? 0.38 : theme === 'green' ? 0.30 : 0.10,
        },
      ]}
    >
      {/* ── Polished-crystal glass stack (bottom → top) ──────────────
          1. Heavy frost — max blur with Apple UltraThin materials
          2. Low tint veil — just enough contrast so content shimmers
          3. Top-lit specular gradient — light falling from above
          4. Razor-thin edge sheen along the top curve
          5. Specular ring highlight around the capsule
         ─────────────────────────────────────────────────────────── */}
      <View style={[styles.iosGlassContainer, { borderRadius: capsuleRadius }]}>
        <BlurView intensity={glass.intensity} tint={glass.tint} style={StyleSheet.absoluteFill} />

        <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.base }]} />

        <LinearGradient
          colors={glass.gradient}
          locations={[0, 0.22, 0.55, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={[styles.iosTopSheen, { backgroundColor: glass.sheen }]} pointerEvents="none" />

        <View
          style={[
            StyleSheet.absoluteFill,
            styles.iosGlassBorder,
            { borderRadius: capsuleRadius, borderColor: glass.edge },
          ]}
          pointerEvents="none"
        />
      </View>

      {/* Strict Optically Centered Tabs Row */}
      <View style={styles.iosBarRow}>
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

    async function checkUnread() {
      if (isLogoutInProgress()) {
        if (isMounted) setUnreadCount(0)
        return
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user || isLogoutInProgress()) {
          if (isMounted) setUnreadCount(0)
          return
        }

        const { data: convos } = await supabase
          .from('conversations')
          .select('id')
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

        if (!isMounted || isLogoutInProgress()) return

        if (convos && convos.length > 0) {
          const cIds = convos.map((c) => c.id)
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .in('conversation_id', cIds)
            .eq('is_read', false)
            .neq('sender_id', user.id)

          if (isMounted && !isLogoutInProgress()) {
            setUnreadCount(count || 0)
          }
        } else {
          if (isMounted) setUnreadCount(0)
        }
      } catch {
        // Silent catch for network jitter
      }
    }

    checkUnread()

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkUnread()
    })

    let channel: ReturnType<typeof createSafeChannel> | null = null
    try {
      channel = createSafeChannel('tab_unread_messages')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          () => {
            checkUnread()
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'conversations' },
          () => {
            checkUnread()
          }
        )
        .subscribe()
    } catch (err) {
      console.warn('Unread badge realtime notice:', err)
    }

    return () => {
      isMounted = false
      authListener?.subscription?.unsubscribe()
      if (channel) supabase.removeChannel(channel)
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
      elevation: 0,
      shadowColor: theme === 'green' ? '#071C18' : '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: theme === 'black' ? 0.35 : theme === 'green' ? 0.25 : 0.05,
      shadowRadius: 10,
    }
  }, [androidTabHeight, bottomInset, colors.tabBarBorder, theme])

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        detachInactiveScreens={true}
        tabBar={isIOS ? (props) => <IOSTabBar {...props} unreadCount={unreadCount} /> : undefined}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          lazy: true,
          freezeOnBlur: true,
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
    lineHeight: 13,
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
    elevation: 0,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 26,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  iosGlassContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  iosGlassBorder: {
    borderWidth: 1,
  },
  iosTopSheen: {
    position: 'absolute',
    top: 1,
    left: 16,
    right: 16,
    height: 1,
    borderRadius: 1,
  },
  iosBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 8,
  },
  iosTabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosIndicatorPill: {
    width: 50,
    height: 40,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iosUnreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
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

