import React, { useState, useEffect } from 'react'
import { Tabs } from 'expo-router'
import { Platform, View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Search, Building2, Plus, MessageSquare, User } from 'lucide-react-native'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'

interface TabBarItemContentProps {
  icon: any
  title: string
  focused: boolean
  badgeCount?: number
}

function TabBarItemContent({ icon: Icon, title, focused, badgeCount }: TabBarItemContentProps) {
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
                { color: theme === 'green' ? '#003E37' : '#FFFFFF' },
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
}

function PostTabBarItem({ focused }: { focused: boolean }) {
  const { colors, theme } = useTheme()
  const activeColor = colors.tabBarActive
  const inactiveColor = colors.tabBarInactive

  const postBtnBg = theme === 'green' ? colors.gold : colors.primary
  const postIconColor = theme === 'green' ? '#003E37' : '#FFFFFF'

  return (
    <View style={styles.tabItemContainer}>
      <View
        style={[
          styles.postButton,
          {
            backgroundColor: postBtnBg,
            shadowColor: postBtnBg,
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
}

export default function TabLayout() {
  const { colors, theme } = useTheme()
  const insets = useSafeAreaInsets()
  const [unreadCount, setUnreadCount] = useState<number>(0)

  useEffect(() => {
    async function checkUnread() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setUnreadCount(0)
          return
        }

        const { data: convos } = await supabase
          .from('conversations')
          .select('id')
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

        if (convos && convos.length > 0) {
          const cIds = convos.map((c) => c.id)
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .in('conversation_id', cIds)
            .eq('is_read', false)
            .neq('sender_id', user.id)

          setUnreadCount(count || 0)
        } else {
          setUnreadCount(0)
        }
      } catch (err) {
        // Silent catch for network jitter
      }
    }

    checkUnread()

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkUnread()
    })

    const channel = supabase
      .channel('tab_unread_messages')
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

    return () => {
      authListener.subscription.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [])

  // Dynamic safe bottom spacing tailored to device bezels / home indicators
  const bottomInset = insets.bottom > 0 ? insets.bottom : Platform.OS === 'ios' ? 20 : 10
  const tabHeight = 56 + bottomInset

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: tabHeight,
          paddingTop: 6,
          paddingBottom: bottomInset,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: theme === 'black' ? 0.45 : 0.08,
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
          title: 'Kërko',
          tabBarIcon: ({ focused }) => (
            <TabBarItemContent icon={Search} title="Kërko" focused={focused} />
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
