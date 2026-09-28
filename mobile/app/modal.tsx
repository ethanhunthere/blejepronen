import React, { useEffect } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { openLoginScreen, openRegisterScreen } from '@/lib/navigation'

/**
 * Legacy modal route handler.
 * Seamlessly and deterministically delegates to the official, full-fledged
 * Login or Register screen on the native navigation stack with zero modal flashes,
 * preserving route parameters and back-stack integrity.
 */
export default function AuthModalScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    initialTab?: string
    reason?: string
    title?: string
    redirectTo?: string
  }>()

  useEffect(() => {
    if (params.initialTab === 'register') {
      openRegisterScreen(router, {
        redirectTo: params.redirectTo,
        reason: params.reason,
        replace: true,
      })
    } else {
      openLoginScreen(router, {
        redirectTo: params.redirectTo,
        reason: params.reason,
        replace: true,
      })
    }
  }, [router, params.initialTab, params.redirectTo, params.reason])

  return null
}
