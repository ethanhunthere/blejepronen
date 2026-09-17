import { useEffect } from 'react'
import { Stack } from 'expo-router'
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
import { callEngine } from '@/lib/calling'
import { CallScreen } from '@/components/CallScreen'

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
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  useEffect(() => {
    if (fontError) throw fontError
  }, [fontError])

  if (!fontsLoaded) {
    return null
  }

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

  useEffect(() => {
    if (fontsLoaded && isThemeLoaded) {
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [fontsLoaded, isThemeLoaded])

  if (!isThemeLoaded) {
    return null
  }

  return (
    <>
      <StatusBar style={theme === 'white' ? 'dark' : 'light'} />
      <CallGate />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="listings/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="messages/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="settings" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="completo-profilin" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="shpalljet-e-mia" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
    </>
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
      callEngine.listenForIncoming(null)
    }
  }, [])

  return <CallScreen />
}
