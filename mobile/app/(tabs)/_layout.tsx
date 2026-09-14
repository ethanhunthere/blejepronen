import React from 'react'
import { Tabs } from 'expo-router'
import { Platform, View, StyleSheet } from 'react-native'
import { Search, Building2, PlusCircle, MessageSquare, User } from 'lucide-react-native'
import { useTheme, Fonts } from '@/constants/theme'

export default function TabLayout() {
  const { colors, theme } = useTheme()

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
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: theme === 'black' ? 0.3 : 0.06,
          shadowRadius: 6,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: Fonts.semiBold,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Kërko',
          tabBarIcon: ({ color }) => <Search size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: 'Pronat',
          tabBarIcon: ({ color }) => <Building2 size={22} color={color} strokeWidth={2.2} />,
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
              <PlusCircle size={22} color={postIconColor} strokeWidth={2.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesazhe',
          tabBarIcon: ({ color }) => <MessageSquare size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profili',
          tabBarIcon: ({ color }) => <User size={22} color={color} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  postButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  postButtonActive: {
    transform: [{ scale: 1.06 }],
  },
})
