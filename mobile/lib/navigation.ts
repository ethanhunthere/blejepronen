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
 * Only in-app absolute paths are legal post-auth targets.
 * Rejects absolute URLs (`https:`, `http:`, `javascript:`), protocol-relative
 * paths (`//evil.com`), and anything that does not start with `/`.
 */
export function isSafeInternalRedirect(target: string): boolean {
  if (!target) return false
  // Any scheme (http:, https:, javascript:, file:, etc.) — reject.
  if (/^[a-zA-Z][a-zA-Z0-9+.\-]*:/.test(target)) return false
  // Protocol-relative or absolute-URL-looking — reject.
  if (target.startsWith('//')) return false
  if (target.startsWith('\\')) return false
  // Must be an in-app absolute path.
  if (!target.startsWith('/')) return false
  return true
}

/**
 * Deterministically resolves post-authentication transitions.
 *
 * 1. An explicit internal path (including `/(tabs)/…`) is replaced onto the
 *    stack — tab targets are legal destinations, not an error.
 * 2. Unsafe targets (external URLs, schemes) are discarded; we fall through.
 * 3. If the user pushed the auth screen from an existing view, pop cleanly.
 * 4. Fallback: replace with the (already sanitized) target or root tabs.
 */
export function resolveAuthSuccess(router: Router, redirectTo?: string | null): void {
  const raw = redirectTo && redirectTo.trim().length > 0 ? redirectTo.trim() : null
  const target = raw && isSafeInternalRedirect(raw) ? raw : null

  if (raw && !target) {
    console.warn('Post-auth redirectTo rejected (unsafe):', raw)
  }

  // 1. Explicit internal destination — tabs and non-tabs alike.
  if (target) {
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
