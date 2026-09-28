import 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import 'react-native-reanimated'
import { Suspense, lazy, useEffect, useState, useMemo, useCallback } from 'react'
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
import { isLogoutInProgress } from '@/lib/auth-cache'
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

SplashScreen.preventAutoHideAsync().catch(() => {})

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
  const [hasHiddenSplash, setHasHiddenSplash] = useState(false)

  // Synchronize native root window background color asynchronously without blocking UI paint
  useEffect(() => {
    if (colors?.background && Platform.OS !== 'web') {
      const raf = requestAnimationFrame(() => {
        SystemUI.setBackgroundColorAsync(colors.background).catch(() => {})
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [colors?.background])

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

  // Push Notifications Rail Initialization (retention, unread alerts, missed calls)
  useEffect(() => {
    initPushNotifications()
  }, [])

  const isAppReady = fontsLoaded && isThemeLoaded && isCacheHydrated

  // Fallback safety timeout: guarantee splash never hangs even under cold storage stalls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasHiddenSplash) {
        setHasHiddenSplash(true)
        SplashScreen.hideAsync().catch(() => {})
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [hasHiddenSplash])

  // Native Layout Gated Dismissal: Drops splash ONLY when root view has drawn its first frame
  const onLayoutRootView = useCallback(async () => {
    if (isAppReady && !hasHiddenSplash) {
      setHasHiddenSplash(true)
      try {
        await SplashScreen.hideAsync()
      } catch {
        // Non-fatal if already dismissed
      }
    }
  }, [isAppReady, hasHiddenSplash])

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

  if (!isAppReady) {
    return null
  }

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
      onLayout={onLayoutRootView}
    >
      <NavigationThemeProvider value={navTheme}>
        <StatusBar style={theme === 'white' ? 'dark' : 'light'} />
        <BiometricGate />
        <CallGate />
        <Stack
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
      <SplashHandover isReady={hasHiddenSplash} />
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

    const { data } = supabase.auth.onAuthStateChange(() => void wire())
    return () => {
      mounted = false
      data?.subscription?.unsubscribe()
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
