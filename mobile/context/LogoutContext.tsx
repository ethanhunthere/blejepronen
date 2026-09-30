import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'
import { Alert, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'

import { performAtomicLogout, setLoggingOutState } from '@/lib/auth-cache'
import { useBanner } from '@/context/BannerContext'
import { LogoutProgressOverlay } from '@/components/motion/LogoutProgressOverlay'

export interface LogoutOptions {
  title?: string
  subtitle?: string
  skipConfirm?: boolean
  isDelete?: boolean
  successTitle?: string
  successMessage?: string
  onBeforeTeardown?: () => Promise<void> | void
}

interface LogoutContextValue {
  isLoggingOut: boolean
  requestLogout: (options?: LogoutOptions) => void
  executeLogout: (options?: LogoutOptions) => Promise<void>
}

const LogoutContext = createContext<LogoutContextValue>({
  isLoggingOut: false,
  requestLogout: () => {},
  executeLogout: async () => {},
})

export const useLogout = () => useContext(LogoutContext)

export function LogoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { showBanner } = useBanner()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [overlayConfig, setOverlayConfig] = useState<{
    title: string
    subtitle: string
    isDelete: boolean
  }>({
    title: 'Duke u çkyçur...',
    subtitle: 'Po mbyllim sesionin në mënyrë të sigurt',
    isDelete: false,
  })

  const inFlightRef = useRef(false)

  const executeLogout = useCallback(
    async (options?: LogoutOptions) => {
      if (inFlightRef.current) return
      inFlightRef.current = true

      const isDelete = Boolean(options?.isDelete)
      let teardownFailure: string | null = null
      const overlayTitle =
        options?.title ||
        (isDelete ? 'Duke fshirë llogarinë...' : 'Duke u çkyçur...')
      const overlaySubtitle =
        options?.subtitle ||
        (isDelete
          ? 'Po fshijmë të gjitha të dhënat dhe shpalljet tuaja'
          : 'Po mbyllim sesionin në mënyrë të sigurt')

      setOverlayConfig({
        title: overlayTitle,
        subtitle: overlaySubtitle,
        isDelete,
      })

      // 1. Instantly display full-screen transition overlay and lock interaction
      setIsLoggingOut(true)
      setLoggingOutState(true)

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
      }

      try {
        // 2. Execute any pre-teardown operations (such as remote account deletion API call)
        if (options?.onBeforeTeardown) {
          try {
            await options.onBeforeTeardown()
          } catch (err) {
            // A failed pre-teardown (e.g. backend account deletion) must abort
            // the whole flow — never claim success over a half-done operation.
            teardownFailure =
              err instanceof Error ? err.message : 'Veprimi dështoi pa një mesazh specifik.'
          }
        }

        if (!teardownFailure) {
          // 3. Comprehensive atomic teardown:
          //    - Detaches WebRTC call listener
          //    - Terminates all active Supabase realtime channels
          //    - Clears favorites cache
          //    - Multi-removes persistent auth tokens and cached profile keys
          //    - Supabase signOut
          await performAtomicLogout()

          // 4. Deterministic Navigation Handoff:
          //    - Cleanly dismiss any open modals or stacked screens
          //    - Reset navigation stack directly to root Explore ("Kreu") tab
          try {
            if (router.canDismiss?.()) {
              router.dismissAll()
            }
          } catch {}

          try {
            router.replace('/(tabs)' as any)
          } catch (err) {
            console.warn('Navigation handoff to explore tab notice:', err)
          }

          // 5. Allow destination tab 360ms to mount and paint cleanly behind the curtain
          await new Promise((resolve) => setTimeout(resolve, 360))
        }
      } catch (err) {
        console.warn('Logout execution notice:', err)
        teardownFailure =
          err instanceof Error ? err.message : 'Veprimi dështoi pa një mesazh specifik.'
      } finally {
        // 6. Gracefully dissolve the transition overlay
        setIsLoggingOut(false)
        setLoggingOutState(false)
        inFlightRef.current = false

        if (teardownFailure) {
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
          }
          showBanner({
            type: 'error',
            title: isDelete ? 'Fshirja Dështoi' : 'Çkyçja Dështoi',
            message: teardownFailure,
          })
          return
        }

        // 7. Success haptic feedback & branded feedback banner
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
        }

        const bannerTitle =
          options?.successTitle ||
          (isDelete ? 'Llogaria u Fshi' : 'Mirupafshim!')
        const bannerMessage =
          options?.successMessage ||
          (isDelete
            ? 'Të gjitha të dhënat dhe shpalljet tuaja u fshinë përfundimisht.'
            : 'U çkyçët me sukses nga llogaria.')

        showBanner({
          type: isDelete ? 'delete' : 'logout',
          title: bannerTitle,
          message: bannerMessage,
        })
      }
    },
    [router, showBanner]
  )

  const requestLogout = useCallback(
    (options?: LogoutOptions) => {
      if (options?.skipConfirm) {
        void executeLogout(options)
        return
      }

      if (Platform.OS !== 'web') {
        Haptics.selectionAsync().catch(() => {})
      }

      Alert.alert(
        'Çkyçja nga llogaria',
        'A jeni të sigurt që dëshironi të çkyçeni nga llogaria juaj?',
        [
          { text: 'Anulo', style: 'cancel' },
          {
            text: 'Çkyçu',
            style: 'destructive',
            onPress: () => {
              void executeLogout(options)
            },
          },
        ]
      )
    },
    [executeLogout]
  )

  const contextValue = useMemo(
    () => ({ isLoggingOut, requestLogout, executeLogout }),
    [isLoggingOut, requestLogout, executeLogout]
  )

  return (
    <LogoutContext.Provider value={contextValue}>
      {children}
      <LogoutProgressOverlay
        visible={isLoggingOut}
        title={overlayConfig.title}
        subtitle={overlayConfig.subtitle}
        isDelete={overlayConfig.isDelete}
      />
    </LogoutContext.Provider>
  )
}
