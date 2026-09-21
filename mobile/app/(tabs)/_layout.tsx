import React, { useState, useEffect } from 'react'
import { Tabs } from 'expo-router'
import { Platform, View, Text, StyleSheet } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Compass, Search, Building2, Plus, MessageSquare, User } from 'lucide-react-native'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { createSafeChannel } from '@/lib/realtime'

import { isLogoutInProgress } from '@/lib/auth-cache'

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

export default function TabLayout() {
  const { colors, theme } = useTheme()
  const insets = useSafeAreaInsets()
  const [unreadCount, setUnreadCount] = useState<number>(0)

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

    // Realtime subscription for the unread badge. Guarded so a remount can never
    // crash the tab bar (see lib/realtime.ts for why the topic must be unique).
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

  // Dynamic safe bottom spacing tailored to device bezels / home indicators
  const bottomInset = insets.bottom > 0 ? insets.bottom : Platform.OS === 'ios' ? 20 : 10
  const tabHeight = 56 + bottomInset

  const renderTabBarBackground = React.useCallback(() => (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 88 : 100}
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
  ), [colors.blurTint, theme])

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        detachInactiveScreens={false}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          lazy: false,
          freezeOnBlur: false,
          animation: 'none',
          sceneStyle: { backgroundColor: colors.background },
          tabBarBackground: renderTabBarBackground,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'transparent',
            borderTopColor: colors.tabBarBorder,
            borderTopWidth: 0.5,
            height: tabHeight,
            paddingTop: 6,
            paddingBottom: bottomInset,
            elevation: 0,
            shadowColor: theme === 'green' ? '#071C18' : '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: theme === 'black' ? 0.35 : theme === 'green' ? 0.25 : 0.05,
            shadowRadius: 10,
          },
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
            lazy: false,
            title: 'Eksploro',
            tabBarIcon: ({ focused }) => (
              <TabBarItemContent icon={Compass} title="Eksploro" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="listings"
          options={{
            lazy: false,
            title: 'Pronat',
            tabBarIcon: ({ focused }) => (
              <TabBarItemContent icon={Building2} title="Pronat" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="post"
          options={{
            lazy: false,
            title: 'Posto',
            tabBarIcon: ({ focused }) => <PostTabBarItem focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            lazy: false,
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
            lazy: false,
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
})
