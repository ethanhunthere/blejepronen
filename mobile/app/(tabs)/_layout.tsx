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

  const activeCapsuleBg =
    theme === 'green'
      ? 'rgba(200, 184, 130, 0.22)'
      : theme === 'black'
      ? 'rgba(52, 211, 153, 0.18)'
      : 'rgba(0, 100, 89, 0.10)'

  const activeCapsuleBorder =
    theme === 'green'
      ? 'rgba(200, 184, 130, 0.42)'
      : theme === 'black'
      ? 'rgba(52, 211, 153, 0.40)'
      : 'rgba(0, 100, 89, 0.20)'

  return (
    <View style={styles.tabItemContainer}>
      {/* Active Pill Capsule with Ambient Glow */}
      <View
        style={[
          styles.iconCapsule,
          focused && [
            styles.iconCapsuleActive,
            {
              backgroundColor: activeCapsuleBg,
              borderColor: activeCapsuleBorder,
              shadowColor: activeColor,
            },
          ],
        ]}
      >
        <Icon
          size={19}
          color={focused ? activeColor : inactiveColor}
          strokeWidth={focused ? 2.6 : 1.9}
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

      {/* Label with dynamic weight and color */}
      <Text
        style={[
          styles.tabLabel,
          {
            color: focused ? activeColor : inactiveColor,
            fontFamily: focused ? Fonts.extraBold : Fonts.medium,
          },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>

      {/* Luminous Active Micro-Jewel Accent Bar */}
      <View
        style={[
          styles.indicatorPill,
          {
            backgroundColor: focused ? activeColor : 'transparent',
          },
        ]}
      />
    </View>
  )
}

function PostTabBarItem({ focused }: { focused: boolean }) {
  const { colors, theme } = useTheme()
  const activeColor = colors.tabBarActive
  const inactiveColor = colors.tabBarInactive

  const postBtnBg = theme === 'green' ? colors.gold : colors.primary
  const postIconColor = theme === 'green' ? '#003E37' : '#FFFFFF'

  const auraBg =
    focused
      ? theme === 'green'
        ? 'rgba(200, 184, 130, 0.30)'
        : 'rgba(0, 100, 89, 0.22)'
      : theme === 'green'
      ? 'rgba(200, 184, 130, 0.14)'
      : 'rgba(0, 100, 89, 0.09)'

  const auraBorder =
    focused
      ? theme === 'green'
        ? colors.gold
        : colors.primary
      : 'transparent'

  return (
    <View style={styles.tabItemContainer}>
      {/* Concentric Halo Aura around the action button */}
      <View
        style={[
          styles.postAura,
          {
            backgroundColor: auraBg,
            borderColor: auraBorder,
          },
          focused && styles.postAuraActive,
        ]}
      >
        <View
          style={[
            styles.postInnerButton,
            {
              backgroundColor: postBtnBg,
              shadowColor: postBtnBg,
            },
          ]}
        >
          <Plus size={17} color={postIconColor} strokeWidth={3} />
        </View>
      </View>

      <Text
        style={[
          styles.tabLabel,
          {
            color: focused ? activeColor : inactiveColor,
            fontFamily: focused ? Fonts.extraBold : Fonts.medium,
          },
        ]}
        numberOfLines={1}
      >
        Posto
      </Text>

      <View
        style={[
          styles.indicatorPill,
          {
            backgroundColor: focused ? activeColor : 'transparent',
          },
        ]}
      />
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
    height: 50,
  },
  iconCapsule: {
    width: 48,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  iconCapsuleActive: {
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    lineHeight: 12,
    textAlign: 'center',
  },
  indicatorPill: {
    width: 14,
    height: 2.5,
    borderRadius: 1.25,
    marginTop: 2,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: 3,
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
  postAura: {
    width: 38,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  postAuraActive: {
    transform: [{ scale: 1.06 }],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  postInnerButton: {
    width: 28,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
})
