import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useTheme } from '@/constants/theme'
import { OmniSearchContent } from '@/components/OmniSearchModal'

export default function SearchScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const params = useLocalSearchParams<{ initialQuery?: string }>()

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <OmniSearchContent
        initialQuery={params.initialQuery || ''}
        isStackScreen={true}
        onClose={() => {
          if (router.canGoBack()) {
            router.back()
          } else {
            router.replace('/(tabs)' as any)
          }
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
})
