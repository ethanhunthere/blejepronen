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

export interface AuthNavigationOptions {
  redirectTo?: string
  reason?: 'favorite' | 'chat' | 'post' | string
  replace?: boolean
}

/**
 * Direct navigation to the official full-screen Login view.
 * Pushes onto the native navigation stack with back-stack persistence and tactile haptic response.
 */
export function openLoginScreen(router: Router, options?: AuthNavigationOptions): void {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync().catch(() => {})
  }
  const params: Record<string, string> = {}
  if (options?.redirectTo) params.redirectTo = options.redirectTo
  if (options?.reason) params.reason = options.reason

  if (options?.replace) {
    router.replace({ pathname: '/login' as any, params })
  } else {
    router.push({ pathname: '/login' as any, params })
  }
}

/**
 * Direct navigation to the official full-screen Registration / Signup view.
 * Pushes onto the native navigation stack with back-stack persistence and tactile haptic response.
 */
export function openRegisterScreen(router: Router, options?: AuthNavigationOptions): void {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync().catch(() => {})
  }
  const params: Record<string, string> = {}
  if (options?.redirectTo) params.redirectTo = options.redirectTo
  if (options?.reason) params.reason = options.reason

  if (options?.replace) {
    router.replace({ pathname: '/register' as any, params })
  } else {
    router.push({ pathname: '/register' as any, params })
  }
}

/**
 * Deterministically resolves post-authentication transitions.
 * Eliminates screen freezes and deadlocks across all authentication providers.
 * If user came from an existing screen on the stack and no divergent route was requested,
 * pops cleanly back to origin with native 60fps stack animation.
 * If an explicit target was requested (or if the stack cannot go back), atomically
 * replaces the auth screen with the destination.
 */
export function resolveAuthSuccess(router: Router, redirectTo?: string | null): void {
  const target = redirectTo && redirectTo.trim().length > 0 ? redirectTo.trim() : null

  // 1. If explicit non-tabs target specified, navigate directly to target
  if (target && !target.startsWith('/(tabs)')) {
    try {
      router.replace(target as any)
      return
    } catch (err) {
      console.warn('Post-auth router.replace to target failed:', err)
    }
  }

  // 2. If user pushed the auth screen from an existing view, pop cleanly to reveal origin
  if (router.canGoBack()) {
    try {
      router.back()
      return
    } catch (err) {
      console.warn('Post-auth router.back failed:', err)
    }
  }

  // 3. Fallback: atomically replace auth view with destination or root tabs
  try {
    router.replace((target || '/(tabs)') as any)
  } catch {
    try {
      router.push((target || '/(tabs)') as any)
    } catch {}
  }
}
