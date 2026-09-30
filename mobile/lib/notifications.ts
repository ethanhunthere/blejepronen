import { Platform } from 'react-native'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { router } from 'expo-router'
import { supabase } from './supabase'
import { subscribeAuthEvents } from './auth-cache'
import { uploadPushToken } from './push-token'

/**
 * Bleje Pronën — push notification rail (audit §4.6).
 * ─────────────────────────────────────────────────────────────────────
 * STATUS: `expo-notifications` is NOT in mobile/package.json, and this task is
 * not allowed to add dependencies. The whole rail therefore sits behind a
 * lazy `require('expo-notifications')` and degrades to an inert no-op when the
 * module is absent (Expo Go, web, or a build without the package).
 *
 * USER'S NEXT STEP to switch the rail on:
 *   1. cd mobile && npx expo install expo-notifications expo-device
 *   2. Configure push credentials — either
 *        eas credentials            (managed FCM/APNs keys), or
 *        eas build --profile preview (dev build with the native module)
 *      and set `expo.android.googleServicesFile` / `expo.ios.bundleIdentifier`
 *      in mobile/app.json.
 *   3. Call `initPushNotifications()` once from the root layout (snippet below).
 * Nothing else changes: `isPushSupported()` starts returning true, the token is
 * uploaded through /api/push-token, and deep links begin routing.
 *
 * WIRING — add these 3 lines to mobile/app/_layout.tsx (owned by another agent):
 *
 *   import { initPushNotifications } from '@/lib/notifications'
 *   // inside RootLayoutNav, next to the other top-level effects:
 *   useEffect(() => initPushNotifications(), [])
 *
 * Foreground presentation policy: a notification is SILENTLY dropped when its
 * target is already on screen — i.e. the conversation it belongs to is the open
 * chat (set by messages/[id].tsx via setOpenConversation), or it is an incoming
 * call while the in-app call UI is already ringing (set via setCallActive).
 * Everything else is shown as a banner.
 */

// ─── Lazy, crash-proof module loading ────────────────────────────────
/**
 * Shape of the subset of expo-notifications this rail uses. Kept structural so
 * the file compiles whether or not the package is installed.
 */
interface NotificationsModule {
  setNotificationHandler(handler: unknown): void
  getPermissionsAsync(): Promise<{ status: string; canAskAgain: boolean }>
  requestPermissionsAsync(permissions?: unknown): Promise<{ status: string }>
  getExpoPushTokenAsync(opts?: { projectId?: string }): Promise<{ data: string }>
  getDevicePushTokenAsync?(): Promise<{ data: unknown; type?: string }>
  setNotificationChannelAsync(id: string, config: unknown): Promise<unknown>
  addNotificationReceivedListener(cb: (n: any) => void): { remove(): void }
  addNotificationResponseReceivedListener(cb: (r: any) => void): { remove(): void }
  getLastNotificationResponseAsync(): Promise<any | null>
  AndroidImportance?: Record<string, number>
}

let notificationsModule: NotificationsModule | null = null
let loadAttempted = false

function loadNotifications(): NotificationsModule | null {
  if (loadAttempted) return notificationsModule
  loadAttempted = true
  if (Platform.OS === 'web') return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require('expo-notifications')
    notificationsModule = (m?.default ?? m) as NotificationsModule
    if (!notificationsModule?.setNotificationHandler) notificationsModule = null
  } catch {
    // Package not installed (Expo Go / web / pre-install build) — rail inert.
    notificationsModule = null
  }
  return notificationsModule
}

/** True when the native push module is present and usable on this runtime. */
export function isPushSupported(): boolean {
  if (Platform.OS === 'web') return false
  return loadNotifications() !== null
}

function getProjectId(): string | undefined {
  const c = Constants as any
  return (
    c?.easConfig?.projectId ??
    c?.expoConfig?.extra?.eas?.projectId ??
    c?.expoConfig?.slug ??
    undefined
  )
}

/**
 * Expo Go cannot mint a project push token without EAS credentials. Detected so
 * `ensurePushToken()` can skip the request instead of throwing on every launch.
 */
function isExpoGoClient(): boolean {
  try {
    return (
      (Constants as any).executionEnvironment === ExecutionEnvironment.StoreClient &&
      !!(Constants as any).expoGoConfig
    )
  } catch {
    return false
  }
}

// ─── Foreground suppression state ────────────────────────────────────
let openConversationId: string | null = null
let callUiActive = false

/**
 * Set by messages/[id].tsx while a conversation is on screen. Notifications
 * addressed to that conversation are suppressed in the foreground — the message
 * is already rendering live via realtime, so a banner would be noise.
 */
export function setOpenConversation(conversationId: string | null): void {
  openConversationId = conversationId || null
}

export function getOpenConversation(): string | null {
  return openConversationId
}

/** Set by CallScreen while the in-app call UI is mounted (ringing or active). */
export function setCallActive(active: boolean): void {
  callUiActive = !!active
}

interface PushData {
  conversationId?: string
  route?: string
  callId?: string
  callerId?: string
  type?: string
}

function readData(source: any): PushData {
  const data =
    source?.request?.content?.data ?? source?.notification?.request?.content?.data ?? null
  return (data && typeof data === 'object' ? data : {}) as PushData
}

/**
 * Foreground presentation decision. Runs inside expo-notifications' handler, so
 * it must be cheap and synchronous-safe.
 */
function shouldPresent(data: PushData): boolean {
  // Incoming-call push while our own call UI is already up → suppress.
  if ((data.type === 'call' || !!data.callId) && isCallActive()) return false
  // Message push for the conversation currently open → suppress.
  if (data.conversationId && data.conversationId === openConversationId) return false
  return true
}

// ─── Deep-link routing ───────────────────────────────────────────────
function routeFromData(data: PushData): string | null {
  if (data.conversationId) return `/messages/${data.conversationId}`
  if (data.route && data.route.startsWith('/')) return data.route
  return null
}

/**
 * Notification tap (warm or cold). A call notification needs no navigation —
 * the module-level call engine already rings and CallScreen overlays every
 * route — but we still surface the conversation it belongs to, if any.
 */
function handleResponse(response: any): void {
  if (!response) return
  const data = readData(response)

  // An accepted/missed call deep link lands in the thread it came from.
  const target = routeFromData(data)
  if (!target) return

  try {
    router.push(target as any)
  } catch (err) {
    console.warn('Push deep-link notice:', err)
    try {
      router.push('/(tabs)/messages' as any)
    } catch {
      // Navigation not ready yet — drop silently.
    }
  }
}

// ─── Token lifecycle ─────────────────────────────────────────────────
let cachedToken: string | null = null
let tokenPromise: Promise<string | null> | null = null

export function getPushToken(): string | null {
  return cachedToken
}

/**
 * Requests permission, mints the Expo push token and registers it with the
 * backend. Idempotent and safe to call repeatedly (app foreground, login,
 * retry after a network failure) — concurrent callers share one promise.
 */
export function ensurePushToken(): Promise<string | null> {
  if (tokenPromise) return tokenPromise
  tokenPromise = (async () => {
    try {
      const Notifications = loadNotifications()
      if (!Notifications) return null
      if (isExpoGoClient()) {
        // No EAS project id in Expo Go — asking would only throw.
        return null
      }

      const existing = await Notifications.getPermissionsAsync().catch(() => null)
      let granted = existing?.status === 'granted'

      if (!granted) {
        const req = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
        }).catch(() => null)
        granted = req?.status === 'granted'
      }
      if (!granted) return null

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      let token: string | null = null
      try {
        const projectId = getProjectId()
        const res = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        )
        token = typeof res?.data === 'string' ? res.data : null
      } catch {
        // Expo Go / missing credentials — fall through to the device token.
        token = null
      }

      let tokenType: 'expo' | 'device' = 'expo'
      if (!token && Notifications.getDevicePushTokenAsync) {
        try {
          const device = await Notifications.getDevicePushTokenAsync()
          const raw = device?.data
          if (typeof raw === 'string' && raw) token = raw
          else if (raw && typeof raw === 'object' && typeof (raw as any).token === 'string') {
            token = (raw as any).token as string
          }
          if (token) tokenType = 'device'
        } catch {
          token = null
        }
      }

      if (!token) return null
      cachedToken = token

      const ok = await uploadPushToken({
        token,
        type: tokenType,
        platform: Platform.OS,
      })
      return ok ? token : null
    } catch (err: any) {
      console.warn('Push token notice:', err?.message || err)
      return null
    } finally {
      // Allow a later retry (login, credential fix, network recovery).
      tokenPromise = null
    }
  })()
  return tokenPromise
}

// ─── Init ────────────────────────────────────────────────────────────
const ANDROID_CHANNEL_ID = 'bp-default'
let initialized = false
let teardown: (() => void) | null = null

/**
 * Boots the push rail. Call ONCE from the root layout.
 * Returns a teardown function (safe to pass straight to `useEffect`).
 * A complete no-op when expo-notifications is not installed.
 */
export function initPushNotifications(): () => void {
  if (initialized) return teardown ?? (() => {})
  initialized = true

  const Notifications = loadNotifications()
  if (!Notifications) {
    // Rail inert — re-check on the next init attempt (e.g. after a JS reload
    // following `npx expo install expo-notifications`).
    initialized = false
    return () => {}
  }

  const removals: Array<() => void> = []

  try {
    Notifications.setNotificationHandler({
      handleNotification: async (notification: any) => {
        const present = shouldPresent(readData(notification))
        return {
          // Both key spellings are returned so the handler works across
          // expo-notifications versions (shouldShowAlert was split into
          // shouldShowBanner/shouldShowAlert in SDK 51+).
          shouldPlaySound: present,
          shouldSetBadge: false,
          shouldShowBanner: present,
          shouldShowAlert: present,
        }
      },
    })
  } catch (err) {
    console.warn('Notification handler notice:', err)
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Mesazhe dhe thirrje',
      importance: Notifications.AndroidImportance?.MAX ?? 5,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C8A24A',
      lockscreenVisibility: 1, // VISIBILITY_PRIVATE
      bypassDnd: false,
    }).catch((err: unknown) => console.warn('Android channel notice:', err))
  }

  try {
    const received = Notifications.addNotificationReceivedListener((notification: any) => {
      const data = readData(notification)
      // A call push is a heads-up only — the module-level engine rings on its
      // own realtime channel, so never start a second call from here.
      if (data.type === 'call' || data.callId) return
      if (!shouldPresent(data)) return
      // In-app surfaces (list badges, open chat) refresh over realtime; the
      // banner is already handled by setNotificationHandler.
    })
    removals.push(() => received?.remove?.())
  } catch (err) {
    console.warn('Notification received notice:', err)
  }

  try {
    const responded = Notifications.addNotificationResponseReceivedListener((response: any) => {
      handleResponse(response)
    })
    removals.push(() => responded?.remove?.())
  } catch (err) {
    console.warn('Notification response notice:', err)
  }

  // Token registration now, on sign-in, and whenever the session refreshes.
  void ensurePushToken()
  try {
    // Single consolidated auth bus — never open a second raw onAuthStateChange.
    const unsubscribeAuth = subscribeAuthEvents((event) => {
      if (!event.session?.user) return
      if (
        event.event === 'SIGNED_IN' ||
        event.event === 'TOKEN_REFRESHED' ||
        event.event === 'USER_UPDATED'
      ) {
        void ensurePushToken()
      }
    })
    removals.push(() => unsubscribeAuth())
  } catch (err) {
    console.warn('Push auth listener notice:', err)
  }

  // Cold start: the tap that launched the app is not delivered to the listener.
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (response) handleResponse(response)
    })
    .catch(() => {})

  const dispose = () => {
    for (const remove of removals) {
      try {
        remove()
      } catch {
        // Best-effort teardown
      }
    }
    removals.length = 0
    initialized = false
    teardown = null
  }
  teardown = dispose
  return dispose
}

/**
 * Whether a call is currently in progress. `@/lib/calling` is resolved lazily
 * on purpose: the root layout defers that module (react-native-webrtc is
 * heavy), and a static import here would drag it into startup for every
 * session that never makes a call.
 */
export function isCallActive(): boolean {
  if (callUiActive) return true
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { callEngine } = require('./calling') as typeof import('./calling')
    const status = callEngine.getState().status
    return status !== 'idle' && status !== 'ended'
  } catch {
    return false
  }
}
