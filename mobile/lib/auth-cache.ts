import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

const AUTH_CACHE_KEY = '@blejepronen_auth_cache_v2'

export interface CachedAuthState {
  user: any | null
  profile: any | null
}

let inMemoryUser: any | null = null
let inMemoryProfile: any | null = null
let isHydrated = false
let hydrationPromise: Promise<CachedAuthState | null> | null = null
const subscribers = new Set<(state: CachedAuthState) => void>()

function notifySubscribers() {
  const current: CachedAuthState = { user: inMemoryUser, profile: inMemoryProfile }
  subscribers.forEach((fn) => {
    try {
      fn(current)
    } catch (err) {
      console.warn('Auth cache subscriber notice:', err)
    }
  })
}

/**
 * Pre-hydrates the in-memory user and profile from persistent storage & local Supabase session.
 * Bound by a fast 100ms timeout so cold start is never blocked, while ensuring frame-0
 * availability before the splash screen drops.
 */
export function waitForAuthCacheHydration(): Promise<CachedAuthState | null> {
  if (isHydrated) {
    return Promise.resolve({ user: inMemoryUser, profile: inMemoryProfile })
  }
  if (hydrationPromise) return hydrationPromise

  hydrationPromise = (async () => {
    try {
      // 1. First, quickly read cached snapshot from AsyncStorage (almost instant)
      const stored = await Promise.race([
        AsyncStorage.getItem(AUTH_CACHE_KEY),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 80)),
      ])

      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (parsed && typeof parsed === 'object') {
            if (parsed.user) inMemoryUser = parsed.user
            if (parsed.profile) inMemoryProfile = parsed.profile
          }
        } catch {}
      }

      // 2. Concurrently verify with Supabase local session (reads token from SecureStore)
      const sessionPromise = supabase.auth.getSession().catch(() => ({ data: { session: null } }))
      const {
        data: { session },
      } = await Promise.race([
        sessionPromise,
        new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 100)
        ),
      ])

      if (session?.user) {
        inMemoryUser = session.user
        // If profile wasn't in local storage, fetch in background without blocking
        if (!inMemoryProfile) {
          fetchFreshProfile(session.user.id).catch(() => {})
        }
      } else if (session === null && !stored) {
        inMemoryUser = null
        inMemoryProfile = null
      }
    } catch {
      // Non-fatal, continue with whatever is in memory
    } finally {
      isHydrated = true
      notifySubscribers()
      if (inMemoryProfile?.avatar_url) {
        import('@/lib/avatars')
          .then(({ warmAvatarCache }) => warmAvatarCache(inMemoryProfile?.avatar_url))
          .catch(() => {})
      }
    }

    return { user: inMemoryUser, profile: inMemoryProfile }
  })()

  return hydrationPromise
}

// Background profile refresh that doesn't block initial frame
async function fetchFreshProfile(userId: string) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (data) {
      inMemoryProfile = data
      notifySubscribers()
      AsyncStorage.setItem(
        AUTH_CACHE_KEY,
        JSON.stringify({ user: inMemoryUser, profile: data })
      ).catch(() => {})
    }
  } catch (err) {
    // Silent catch
  }
}

// Kick off hydration immediately upon bundle evaluation
waitForAuthCacheHydration().catch(() => {})

// Listen to Supabase auth state changes globally
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    inMemoryUser = session.user
    notifySubscribers()
    await fetchFreshProfile(session.user.id)
    AsyncStorage.setItem(
      AUTH_CACHE_KEY,
      JSON.stringify({ user: session.user, profile: inMemoryProfile })
    ).catch(() => {})
  } else if (event === 'SIGNED_OUT') {
    inMemoryUser = null
    inMemoryProfile = null
    notifySubscribers()
    AsyncStorage.removeItem(AUTH_CACHE_KEY).catch(() => {})
  }
})

export function isAuthCacheHydrated(): boolean {
  return isHydrated
}

export function getSyncAuthUser(): any | null {
  return inMemoryUser
}

export function getSyncProfile(): any | null {
  return inMemoryProfile
}

export function setSyncProfile(profile: any) {
  inMemoryProfile = profile
  notifySubscribers()
  if (inMemoryUser) {
    AsyncStorage.setItem(
      AUTH_CACHE_KEY,
      JSON.stringify({ user: inMemoryUser, profile })
    ).catch(() => {})
  }
}

export function setSyncAuthUser(user: any) {
  inMemoryUser = user
  notifySubscribers()
  AsyncStorage.setItem(
    AUTH_CACHE_KEY,
    JSON.stringify({ user, profile: inMemoryProfile })
  ).catch(() => {})
}

export function syncAuthSession(user: any, profile?: any) {
  inMemoryUser = user
  if (profile !== undefined) {
    inMemoryProfile = profile
  }
  isHydrated = true
  notifySubscribers()
  if (user) {
    AsyncStorage.setItem(
      AUTH_CACHE_KEY,
      JSON.stringify({ user, profile: inMemoryProfile })
    ).catch(() => {})
    if (!profile) {
      fetchFreshProfile(user.id).catch(() => {})
    }
  } else {
    inMemoryProfile = null
    AsyncStorage.removeItem(AUTH_CACHE_KEY).catch(() => {})
  }
}

export function subscribeAuthCache(fn: (state: CachedAuthState) => void) {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}

