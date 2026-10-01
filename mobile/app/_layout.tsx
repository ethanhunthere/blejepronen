import '@/lib/splash-guard'
import 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import 'react-native-reanimated'
import { Suspense, lazy, useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  Stack,
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  DefaultTheme,
} from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import {
  AlbertSans_400Regular,
  AlbertSans_500Medium,
  AlbertSans_600SemiBold,
  AlbertSans_700Bold,
  AlbertSans_800ExtraBold,
  AlbertSans_900Black,
} from '@expo-google-fonts/albert-sans'
import { ThemeProvider, useTheme } from '@/constants/theme'
import { BrandColors } from '@/constants/Colors'
import { StatusBar } from 'expo-status-bar'

import { BannerProvider } from '@/context/BannerContext'
import { LogoutProvider } from '@/context/LogoutContext'
import { supabase } from '@/lib/supabase'
// Deferred: react-native-webrtc + the call UI are heavy; evaluating them at
// module scope costs startup latency for a feature most sessions never use.
const CallScreen = lazy(() =>
  import('@/components/CallScreen').then((m) => ({ default: m.CallScreen }))
)
import { Platform, View } from 'react-native'
import * as SystemUI from 'expo-system-ui'
import { waitForListingsCacheHydration } from '@/lib/listings-cache'
import { waitForAuthCacheHydration } from '@/lib/auth-cache'
import { prewarmBrandAssets } from '@/assets/brand/logo-data'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { isLogoutInProgress, subscribeAuthEvents } from '@/lib/auth-cache'
import { SplashHandover } from '@/components/motion'
import { BiometricGate } from '@/components/BiometricGate'
import { initPushNotifications } from '@/lib/notifications'

export { ErrorBoundary } from '@/components/ErrorBoundary'

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

import { enableScreens, enableFreeze } from 'react-native-screens'

enableScreens(true)
enableFreeze(true)

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    AlbertSans_400Regular,
    AlbertSans_500Medium,
    AlbertSans_600SemiBold,
    AlbertSans_700Bold,
    AlbertSans_800ExtraBold,
    AlbertSans_900Black,
  })

  useEffect(() => {
    if (fontError) throw fontError
  }, [fontError])

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BannerProvider>
          <LogoutProvider>
            <RootLayoutNav fontsLoaded={fontsLoaded} />
          </LogoutProvider>
        </BannerProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { colors, theme, isThemeLoaded } = useTheme()
  const [isCacheHydrated, setIsCacheHydrated] = useState(false)
  const [hasLaidOut, setHasLaidOut] = useState(false)
  const [hasHiddenSplash, setHasHiddenSplash] = useState(false)
  const [splashAnimDone, setSplashAnimDone] = useState(false)
  const [statusBarSettled, setStatusBarSettled] = useState(false)
  const [gateResolved, setGateResolved] = useState(false)
  const hideStartedRef = useRef(false)

  const BRAND_HOLD_MS = 280
  const SPLASH_FAILSAFE_MS = 2000
  const LAUNCH_FAILSAFE_MS = 4000
  const launchSettled = splashAnimDone && gateResolved

  // Pin the Android window to emerald at boot so native splash → JS overlay
  // never exposes a theme-colored frame.
  useEffect(() => {
    if (Platform.OS === 'web') return
    SystemUI.setBackgroundColorAsync(BrandColors.primary).catch(() => {})
  }, [])

  // Hand window to theme while the JS veil is still fully opaque (at
  // native-splash hide), so no window-bg pop is ever observable. The dep on
  // colors.background keeps later theme switches following.
  useEffect(() => {
    if (!hasHiddenSplash || Platform.OS === 'web' || !colors?.background) return
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {})
  }, [hasHiddenSplash, colors?.background])

  // Concurrent Frame-0 Cache & Asset Pre-hydration
  useEffect(() => {
    Promise.all([
      waitForListingsCacheHydration(),
      waitForAuthCacheHydration(),
      prewarmBrandAssets(),
    ]).finally(() => {
      setIsCacheHydrated(true)
    })
  }, [])

  // Push rail starts only after launch settles — never competes with splash frames.
  useEffect(() => {
    if (!launchSettled) return
    initPushNotifications()
  }, [launchSettled])

  const isAppReady = fontsLoaded && isThemeLoaded && isCacheHydrated

  // Native→JS handoff: brand beat, drop native splash, then JS choreography.
  useEffect(() => {
    if (!isAppReady || !hasLaidOut || hideStartedRef.current) return
    hideStartedRef.current = true
    const timer = setTimeout(() => {
      SplashScreen.hideAsync()
        .catch(() => {})
        .finally(() => setHasHiddenSplash(true))
    }, BRAND_HOLD_MS)
    return () => clearTimeout(timer)
  }, [isAppReady, hasLaidOut])

  // Hard exit — brand canvas is always mounted, so hiding native splash is safe.
  // Failsafe F1: force the native hide only. Animation + gates still run their
  // own course under the opaque veil; never flip app-facing state mid-animation.
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {})
      setHasHiddenSplash(true)
    }, SPLASH_FAILSAFE_MS)
    return () => clearTimeout(timer)
  }, [])

  // Failsafe F3: ultimate force — assume choreography + gate dead, land the app.
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {})
      setHasHiddenSplash(true)
      setSplashAnimDone(true)
      setGateResolved(true)
    }, LAUNCH_FAILSAFE_MS)
    return () => clearTimeout(timer)
  }, [])

  const onLayoutRootView = useCallback(() => setHasLaidOut(true), [])
  const handleSplashComplete = useCallback(() => setSplashAnimDone(true), [])
  const handleSplashSettle = useCallback(() => setStatusBarSettled(true), [])

  const navTheme = useMemo(() => {
    const isDark = theme !== 'white'
    const baseTheme = isDark ? DarkTheme : DefaultTheme
    return {
      ...baseTheme,
      dark: isDark,
      colors: {
        ...baseTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
        notification: colors.gold,
      },
    }
  }, [theme, colors])

  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
        backgroundColor: isAppReady ? colors.background : BrandColors.primary,
      }}
      onLayout={onLayoutRootView}
    >
      {isAppReady ? (
        <NavigationThemeProvider value={navTheme}>
          <StatusBar
            hidden={false}
            style={
              statusBarSettled || splashAnimDone
                ? theme === 'white'
                  ? 'dark'
                  : 'light'
                : 'light'
            }
          />
          <BiometricGate
            active={splashAnimDone}
            onColdStartResolved={() => setGateResolved(true)}
          />
          {launchSettled ? <CallGate /> : null}
          <Stack
            unstable_screenErrorBoundary={RouteErrorBoundary as any}
            screenOptions={{
              contentStyle: { backgroundColor: colors.background },
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade', animationDuration: 320, contentStyle: { backgroundColor: colors.background } }} />
            <Stack.Screen name="search" options={{ headerShown: false, animation: 'fade', animationMatchesGesture: true, contentStyle: { backgroundColor: colors.background } }} />
            <Stack.Screen name="listings/[id]" options={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }} />
            <Stack.Screen name="messages/[id]" options={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }} />
            <Stack.Screen name="settings" options={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }} />
            <Stack.Screen name="profili/[id]" options={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }} />
            <Stack.Screen name="profile/[id]" options={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }} />
            <Stack.Screen name="completo-profilin" options={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true, contentStyle: { backgroundColor: colors.background } }} />
            <Stack.Screen name="shpalljet-e-mia" options={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }} />
            <Stack.Screen
              name="login"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="register"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen name="modal" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
            <Stack.Screen name="+not-found" options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
          </Stack>
        </NavigationThemeProvider>
      ) : (
        <View
          style={{ flex: 1, backgroundColor: BrandColors.primary }}
          pointerEvents="none"
        />
      )}
      {!splashAnimDone && (
        <SplashHandover
          isReady={hasHiddenSplash && isAppReady}
          onComplete={handleSplashComplete}
          onSettle={handleSplashSettle}
        />
      )}
    </GestureHandlerRootView>
  )
}

/**
 * Global in-app calling: listens for incoming calls for the signed-in user
 * and renders the full-screen call experience above every screen.
 * Requires a development build — react-native-webrtc cannot run in Expo Go.
 */
function CallGate() {
  useEffect(() => {
    let mounted = true
    async function wire() {
      if (isLogoutInProgress()) {
        try {
          const { callEngine } = await import('@/lib/calling')
          callEngine.listenForIncoming(null)
        } catch {}
        return
      }
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!mounted || isLogoutInProgress()) return
        const { callEngine } = await import('@/lib/calling')
        callEngine.listenForIncoming(user?.id ?? null)
      } catch {
        // offline — retry happens on the next auth event
      }
    }
    void wire()

    // Single consolidated auth bus — never open a second raw onAuthStateChange
    // subscription from a layout effect.
    const unsubscribeAuth = subscribeAuthEvents(() => void wire())
    return () => {
      mounted = false
      unsubscribeAuth()
      import('@/lib/calling')
        .then(({ callEngine }) => callEngine.listenForIncoming(null))
        .catch(() => {})
    }
  }, [])

  return (
    <Suspense fallback={null}>
      <CallScreen />
    </Suspense>
  )
}
