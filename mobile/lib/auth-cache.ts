import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { unregisterPushToken } from './push-token'
import {
  cacheDelete,
  cacheGet,
  cacheInvalidateGroup,
  cacheSet,
} from './query-client'

const AUTH_CACHE_KEY = '@blejepronen_auth_cache_v2'

/**
 * Query-cache key for the authoritative session snapshot.
 *
 * `sticky: true` and no group: the snapshot is exempt from LRU eviction, from
 * TTL expiry and from every group sweep, so a cache purge or a
 * `cacheInvalidateGroup('profile')` can never make a signed-in user look signed
 * out. Only `cacheDelete(SESSION_KEY)` — i.e. an explicit logout — removes it.
 */
const SESSION_KEY = 'auth:session'
const SESSION_CACHE_OPTIONS = { sticky: true } as const

export interface CachedAuthState {
  user: any | null
  profile: any | null
}

interface SessionSnapshot extends CachedAuthState {
  /** Marker so the sticky query-cache entry reads as session state, not a
   *  generic `CachedAuthState` value, at every call site. */
  readonly __brand?: 'auth-session'
}

const EMPTY_SNAPSHOT: SessionSnapshot = Object.freeze({ user: null, profile: null })

function readSnapshot(): SessionSnapshot {
  return cacheGet<SessionSnapshot>(SESSION_KEY) ?? EMPTY_SNAPSHOT
}

function writeSnapshot(user: any | null, profile: any | null): void {
  cacheSet<SessionSnapshot>(SESSION_KEY, { user, profile }, SESSION_CACHE_OPTIONS)
}

function clearSnapshot(): void {
  cacheDelete(SESSION_KEY)
}

let isHydrated = false
let hydrationPromise: Promise<CachedAuthState | null> | null = null
const subscribers = new Set<(state: CachedAuthState) => void>()

function notifySubscribers() {
  const { user, profile } = readSnapshot()
  const current: CachedAuthState = { user, profile }
  subscribers.forEach((fn) => {
    try {
      fn(current)
    } catch (err) {
      console.warn('Auth cache subscriber notice:', err)
    }
  })
}

/** Persist the snapshot to the durable layer. Never throws, never awaited by
 *  a render path — a failed write only costs the next cold start its seed.
 *  PII-minimized: only the fields screens actually need are stored; the full
 *  `user` object (with access/refresh tokens inside `session`) is NOT written
 *  to AsyncStorage — tokens live exclusively in SecureStore via the supabase
 *  client's storage adapter. */
function persistSnapshot(): void {
  const { user, profile } = readSnapshot()
  const safeUser = user
    ? {
        id: user.id,
        email: user.email ?? null,
        user_metadata: user.user_metadata ?? null,
        aud: user.aud ?? null,
        created_at: user.created_at ?? null,
      }
    : null
  const safeProfile = profile
    ? {
        id: profile.id,
        first_name: profile.first_name ?? null,
        last_name: profile.last_name ?? null,
        email: profile.email ?? null,
        phone: profile.phone ?? null,
        email_verified: profile.email_verified ?? null,
        avatar_url: profile.avatar_url ?? null,
        account_type: profile.account_type ?? null,
        company_name: profile.company_name ?? null,
      }
    : null
  AsyncStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ user: safeUser, profile: safeProfile })).catch(
    () => {}
  )
}

/**
 * Pre-hydrates the in-memory user and profile from persistent storage & local Supabase session.
 * Bound by a fast 100ms timeout so cold start is never blocked, while ensuring frame-0
 * availability before the splash screen drops.
 */
export function waitForAuthCacheHydration(): Promise<CachedAuthState | null> {
  if (isHydrated) {
    const { user, profile } = readSnapshot()
    return Promise.resolve({ user, profile })
  }
  if (hydrationPromise) return hydrationPromise

  hydrationPromise = (async () => {
    let cachedUser: any | null = null
    let cachedProfile: any | null = null

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
            if (parsed.user) cachedUser = parsed.user
            if (parsed.profile) cachedProfile = parsed.profile
          }
        } catch {}
      }

      if (cachedUser || cachedProfile) writeSnapshot(cachedUser, cachedProfile)

      // 2. Concurrently verify with Supabase local session (reads token from SecureStore)
      const sessionPromise = supabase.auth.getSession().catch(() => ({ data: { session: null } }))
      const timeoutMarker = { data: { session: null } } as { data: { session: any } }
      let sessionResult = await Promise.race([
        sessionPromise,
        new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve(timeoutMarker), 100)
        ),
      ])
      // If the 100ms cap elapsed while a cached snapshot claims a signed-in user,
      // give the in-flight session read a bounded grace window before committing
      // guest state — prevents a guest→authed flash on slow boots.
      if (sessionResult === timeoutMarker && cachedUser) {
        sessionResult = await Promise.race([
          sessionPromise,
          new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => resolve(timeoutMarker), 300)
          ),
        ])
      }
      const resolved = sessionResult !== timeoutMarker
      const session = sessionResult.data.session

      if (session?.user) {
        // Read the *live* profile, not the one captured before the await:
        // another module may have written a fresher row while the session read
        // was in flight, and clobbering it here would regress the frame-1 seed.
        const live = readSnapshot()
        writeSnapshot(session.user, live.profile)
        // If profile wasn't in local storage, fetch in background without blocking
        if (!live.profile) {
          fetchFreshProfile(session.user.id).catch(() => {})
        }
      } else if (resolved && session === null) {
        clearSnapshot()
      }
    } catch {
      // Non-fatal, continue with whatever is in memory
    } finally {
      isHydrated = true
      notifySubscribers()
      const avatarUrl = readSnapshot().profile?.avatar_url
      if (avatarUrl) {
        import('@/lib/avatars')
          .then(({ warmAvatarCache }) => warmAvatarCache(avatarUrl))
          .catch(() => {})
      }
    }

    const { user, profile } = readSnapshot()
    return { user, profile }
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
      const { user } = readSnapshot()
      writeSnapshot(user, data)
      notifySubscribers()
      persistSnapshot()
    }
  } catch (err) {
    // Silent catch
  }
}

// Kick off hydration immediately upon bundle evaluation
waitForAuthCacheHydration().catch(() => {})

let isLoggingOut = false

export function isLogoutInProgress(): boolean {
  return isLoggingOut
}

// ==========================================================================
// SINGLE AUTH EVENT BUS
// ==========================================================================
//
// Supabase's `onAuthStateChange` is a native-backed subscription: every call
// adds a permanent listener to the client's callback list. This module used to
// be one of four places that each opened their own (root layout call gate, tab
// unread badge, profile, messages), which meant four native round-trips per
// token refresh and four independent copies of the `isLogoutInProgress`
// guard. There is now exactly ONE subscription, owned here, fanning out to a
// typed handler set.
//
// HMR: the registry and the subscription live on `globalThis`, and the
// subscription is keyed by the identity of the supabase client it was opened
// against. A hot reload that re-evaluates this module therefore reuses the
// live subscription instead of stacking a second one; a hot reload that also
// re-created the supabase client unsubscribes the stale one first. Either way
// the client ends up with a single listener.

/** Supabase's own union, re-exported so consumers never import gotrue directly. */
export type AuthEventName = AuthChangeEvent

export interface AuthEvent {
  /** Supabase event name (`INITIAL_SESSION`, `SIGNED_IN`, `TOKEN_REFRESHED`, …). */
  event: AuthEventName
  /** Session attached to the event, or `null` for a signed-out state. */
  session: Session | null
  /** Convenience accessor — `null` when the event carries no user. */
  userId: string | null
  /** `true` while an atomic logout owns the session lifecycle. Handlers that
   *  would resurrect UI state from a session must bail on this flag. */
  isLoggingOut: boolean
  /** Epoch ms the event was dispatched at. */
  at: number
}

/**
 * Auth event handler.
 *
 * MUST NOT `await` anything: Supabase invokes these callbacks while holding its
 * internal auth lock, so a handler that awaits network work deadlocks token
 * refresh. Kick off async work and return synchronously.
 *
 * Handlers are NOT replayed on subscribe. The global bus registers its single
 * Supabase listener at module-evaluation time, so `INITIAL_SESSION` has usually
 * already fired by the time a screen mounts — seed your own state on mount and
 * use this subscription for transitions only.
 */
export type AuthEventHandler = (event: AuthEvent) => void

const AUTH_BUS_KEY = '__blejepronen_auth_bus_v1__'

interface AuthBus {
  handlers: Set<AuthEventHandler>
  subscription: { unsubscribe: () => void } | null
  /** Identity of the supabase client the subscription was opened against. */
  client: unknown
}

function readBus(): AuthBus {
  const host = globalThis as unknown as Record<string, AuthBus | undefined>
  let bus = host[AUTH_BUS_KEY]
  if (!bus || !(bus.handlers instanceof Set)) {
    bus = { handlers: new Set(), subscription: null, client: null }
    host[AUTH_BUS_KEY] = bus
  }
  return bus
}

/** The one and only Supabase auth subscription, installed at most once per
 *  supabase client instance. */
function ensureAuthBus(): AuthBus {
  const bus = readBus()

  if (bus.client !== supabase) {
    try {
      bus.subscription?.unsubscribe()
    } catch (err) {
      console.warn('Stale auth listener teardown notice:', err)
    }
    bus.subscription = null
    bus.client = supabase
  }

  if (!bus.subscription) {
    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        dispatchAuthEvent(event, session)
      })
      bus.subscription = data?.subscription ?? null
    } catch (err) {
      console.warn('Auth listener install notice:', err)
    }
  }

  return bus
}

/** Own bookkeeping first, so handlers always observe a consistent snapshot.
 *  Synchronous by design — see the `AuthEventHandler` contract above. */
function applyAuthEventToCache(event: AuthEventName, session: Session | null): void {
  if (isLoggingOut) return
  if (session?.user) {
    const { profile } = readSnapshot()
    writeSnapshot(session.user, profile)
    notifySubscribers()
    // Never await network inside the auth-lock-held callback.
    void fetchFreshProfile(session.user.id)
  } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
    // INITIAL_SESSION with a null session means the session store is gone
    // (keystore wipe, backup restore, failed removeItem) while a cached
    // snapshot may still claim a signed-in user — clear instead of trusting it.
    clearSnapshot()
    notifySubscribers()
    AsyncStorage.removeItem(AUTH_CACHE_KEY).catch(() => {})
  }
}

function dispatchAuthEvent(event: AuthEventName, session: Session | null): void {
  applyAuthEventToCache(event, session)

  const bus = readBus()
  if (bus.handlers.size === 0) return

  const payload: AuthEvent = {
    event,
    session: session ?? null,
    userId: session?.user?.id ?? null,
    isLoggingOut,
    at: Date.now(),
  }

  // Snapshot the set: a handler may unsubscribe itself (or another handler)
  // while we iterate, which would otherwise skip entries.
  for (const handler of Array.from(bus.handlers)) {
    try {
      handler(payload)
    } catch (err) {
      console.warn('Auth event subscriber notice:', err)
    }
  }
}

/**
 * Subscribe to the single consolidated auth event stream.
 * Returns an idempotent unsubscribe — safe to return straight from a
 * `useEffect` cleanup, and safe to call twice.
 */
export function subscribeAuthEvents(handler: AuthEventHandler): () => void {
  const bus = ensureAuthBus()
  bus.handlers.add(handler)
  let disposed = false
  return () => {
    if (disposed) return
    disposed = true
    bus.handlers.delete(handler)
  }
}

/** Unsubscribe a handler registered via `subscribeAuthEvents`. */
export function unsubscribeAuthEvents(handler: AuthEventHandler): void {
  readBus().handlers.delete(handler)
}

/** Live handler count — used to assert there are no listener leaks. */
export function authEventSubscriberCount(): number {
  return readBus().handlers.size
}

// Install the single listener at module evaluation, matching the previous
// behaviour where the cache started observing immediately. Declared after
// `isLoggingOut` so the dispatch path can never hit a TDZ read.
ensureAuthBus()

export function isAuthCacheHydrated(): boolean {
  return isHydrated
}

export function getSyncAuthUser(): any | null {
  return readSnapshot().user
}

export function getSyncProfile(): any | null {
  return readSnapshot().profile
}

export function setSyncProfile(profile: any) {
  const { user } = readSnapshot()
  writeSnapshot(user, profile)
  notifySubscribers()
  if (user) {
    persistSnapshot()
  }
}

export function setSyncAuthUser(user: any) {
  const { profile } = readSnapshot()
  writeSnapshot(user, profile)
  notifySubscribers()
  persistSnapshot()
}

export function syncAuthSession(user: any, profile?: any) {
  const current = readSnapshot()
  writeSnapshot(user, profile !== undefined ? profile : current.profile)
  isHydrated = true
  notifySubscribers()
  if (user) {
    persistSnapshot()
    if (!profile) {
      fetchFreshProfile(user.id).catch(() => {})
    }
  } else {
    clearSnapshot()
    AsyncStorage.removeItem(AUTH_CACHE_KEY).catch(() => {})
  }
}

export function subscribeAuthCache(fn: (state: CachedAuthState) => void) {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}

export function setLoggingOutState(active: boolean) {
  isLoggingOut = active
}

/**
 * Performs a 100% atomic logout:
 * 1. Immediately locks auth re-evaluation (`isLoggingOut = true`)
 * 2. Synchronously nullifies in-memory cache and dispatches to all subscribers
 * 3. Immediately wipes persistent auth, notifications, & favorites storage
 * 4. Terminates all active Supabase realtime subscriptions
 * 5. Detaches WebRTC incoming call listener
 * 6. Awaits Supabase signOut while suppressing any spurious resurrecting events
 * 7. Guarantees single-frame clean transition to the guest/unauthenticated state
 */
let atomicLogoutInFlight = false

export async function performAtomicLogout(): Promise<void> {
  // Dedicated re-entrancy guard: `isLoggingOut` is the onAuthStateChange
  // suppression flag and is already true when LogoutContext calls us, so it
  // must never be used as the in-flight check (that made logout a no-op).
  if (atomicLogoutInFlight) return
  atomicLogoutInFlight = true
  isLoggingOut = true

  try {
    // 0. Best-effort push-token unregister so a signed-out device stops
    //    receiving this account's notifications.
    unregisterPushToken().catch(() => {})

    // 1. Synchronously nullify in-memory state
    clearSnapshot()
    isHydrated = true

    // 2. Synchronously notify all subscribers (Profile, Tabs, Messages, etc.) in a single frame
    notifySubscribers()

    // 3. Clear in-memory favorites cache
    try {
      const { clearFavoritesCache } = await import('./favorites')
      clearFavoritesCache()
    } catch {}

    // 3b. Drop every derived cache this user's browsing seeded (profile
    //     storefront identities and their listing feeds). The session snapshot
    //     is group-less and sticky, so this can never touch auth state.
    try {
      cacheInvalidateGroup('profile')
    } catch {}

    // 4. Detach WebRTC calling engine listener
    try {
      const { callEngine } = await import('./calling')
      callEngine.listenForIncoming(null)
    } catch {}

    // 5. Terminate all active Supabase real-time channels
    try {
      supabase.removeAllChannels()
    } catch (err) {
      console.warn('Realtime channel teardown notice:', err)
    }

    // 6. Purge storage caches immediately
    await AsyncStorage.multiRemove([
      AUTH_CACHE_KEY,
      '@blejepronen_favs_map_v2',
      '@blejepronen_recent_searches',
      '@blejepronen_notifications_unread',
    ]).catch(() => {})

    // 7. Perform Supabase signOut
    await supabase.auth.signOut().catch((err) => {
      console.warn('Atomic logout Supabase signOut notice:', err)
    })
  } finally {
    // 8. Ensure in-memory state remains clean and release lock
    clearSnapshot()
    isLoggingOut = false
    atomicLogoutInFlight = false
    notifySubscribers()
  }
}
