import React from 'react'
import { Tabs } from 'expo-router'
import { Platform, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Search, Building2, Plus, MessageSquare, User } from 'lucide-react-native'
import { useTheme, Fonts } from '@/constants/theme'

export default function TabLayout() {
  const { colors, theme } = useTheme()
  const insets = useSafeAreaInsets()

  // Dynamic safe bottom spacing tailored to device bezels / home indicators
  const bottomInset = insets.bottom > 0 ? insets.bottom : Platform.OS === 'ios' ? 20 : 10
  const tabHeight = 54 + bottomInset

  const postBtnBg = theme === 'green' ? colors.gold : colors.primary
  const postIconColor = theme === 'green' ? '#003E37' : '#FFFFFF'

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: tabHeight,
          paddingTop: 6,
          paddingBottom: bottomInset,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: theme === 'black' ? 0.4 : 0.07,
          shadowRadius: 8,
        },
        tabBarItemStyle: {
          height: 48,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: Fonts.semiBold,
          marginTop: 2,
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Kërko',
          tabBarIcon: ({ color, focused }) => (
            <Search size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: 'Pronat',
          tabBarIcon: ({ color, focused }) => (
            <Building2 size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Posto',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.postButton,
                { backgroundColor: postBtnBg, shadowColor: postBtnBg },
                focused && styles.postButtonActive,
              ]}
            >
              <Plus size={18} color={postIconColor} strokeWidth={3} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesazhe',
          tabBarIcon: ({ color, focused }) => (
            <MessageSquare size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profili',
          tabBarIcon: ({ color, focused }) => (
            <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  postButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 5,
  },
  postButtonActive: {
    transform: [{ scale: 1.08 }],
  },
})
