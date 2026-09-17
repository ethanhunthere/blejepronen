import { useRouter } from 'expo-router'
import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

export type Router = ReturnType<typeof useRouter>

/**
 * Robust, fault-tolerant back navigation.
 * Prevents app lockups, frozen screens, and unresponsive back taps when screens are
 * opened via cold deep-links, push notifications, or when the native navigation stack is empty.
 */
export function safeBack(router: Router, fallback: string = '/(tabs)'): void {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync().catch(() => {})
  }
  if (router.canGoBack()) {
    router.back()
  } else {
    router.replace(fallback as any)
  }
}
