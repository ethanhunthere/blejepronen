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
import 'react-native-reanimated'
import { ThemeProvider, useTheme } from '@/constants/theme'
import { StatusBar } from 'expo-status-bar'

import { BannerProvider } from '@/context/BannerContext'
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

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

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
    <ThemeProvider>
      <BannerProvider>
        <RootLayoutNav fontsLoaded={fontsLoaded} />
      </BannerProvider>
    </ThemeProvider>
  )
}

function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { colors, theme, isThemeLoaded } = useTheme()
  const [isCacheHydrated, setIsCacheHydrated] = useState(false)
  const [hasHiddenSplash, setHasHiddenSplash] = useState(false)

  // Synchronize native root window background color immediately
  useEffect(() => {
    if (colors?.background && Platform.OS !== 'web') {
      SystemUI.setBackgroundColorAsync(colors.background).catch(() => {})
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
    <View
      style={{ flex: 1, backgroundColor: colors.background }}
      onLayout={onLayoutRootView}
    >
      <NavigationThemeProvider value={navTheme}>
        <StatusBar style={theme === 'white' ? 'dark' : 'light'} />
        <CallGate />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.background },
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen name="listings/[id]" options={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen name="messages/[id]" options={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen name="settings" options={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen name="completo-profilin" options={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen name="shpalljet-e-mia" options={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen name="+not-found" options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
        </Stack>
      </NavigationThemeProvider>
    </View>
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
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!mounted) return
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
      data.subscription.unsubscribe()
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
