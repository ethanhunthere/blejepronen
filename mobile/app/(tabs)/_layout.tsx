import React from 'react'
import { Tabs } from 'expo-router'
import { Platform, View, StyleSheet } from 'react-native'
import { Search, Building2, PlusCircle, MessageSquare, User } from 'lucide-react-native'
import { BrandColors } from '@/constants/Colors'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: BrandColors.primary,
        tabBarInactiveTintColor: BrandColors.textLight,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: BrandColors.border,
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Kërko',
          tabBarIcon: ({ color, size }) => <Search size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: 'Pronat',
          tabBarIcon: ({ color, size }) => <Building2 size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Posto',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.postButton, focused && styles.postButtonActive]}>
              <PlusCircle size={22} color="#FFFFFF" strokeWidth={2.4} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesazhe',
          tabBarIcon: ({ color, size }) => <MessageSquare size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profili',
          tabBarIcon: ({ color, size }) => <User size={22} color={color} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  postButton: {
    backgroundColor: BrandColors.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  postButtonActive: {
    backgroundColor: BrandColors.primaryDark,
    transform: [{ scale: 1.05 }],
  },
})
