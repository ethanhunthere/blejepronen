import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'

import { supabase } from '@/lib/supabase'
import { safeBack } from '@/lib/navigation'

/**
 * Native OAuth callback route (blejepronen://auth/callback).
 *
 * PKCE only: the provider redirect must carry a `code`. Tokens in the URL
 * (`access_token` / `refresh_token`) are REJECTED — accepting them would
 * re-open the implicit-flow hole this route exists to close.
 */
export default function AuthCallbackRoute() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    code?: string
    access_token?: string
    refresh_token?: string
    error?: string
  }>()
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true

    // Android Custom Tabs can linger above the app after the intent handoff
    void WebBrowser.dismissBrowser().catch(() => {})

    ;(async () => {
      try {
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code)
          if (error) throw error
        } else if (params.access_token || params.refresh_token) {
          // Implicit-flow tokens in the deep-link URL — refuse. PKCE is required.
          console.warn('AuthCallback: rejected URL-borne tokens (PKCE required)')
          throw new Error('pkce_required')
        } else {
          throw new Error(params.error || 'missing_credentials')
        }
        router.replace('/(tabs)')
      } catch {
        safeBack(router, '/(tabs)')
      }
    })()
  }, [params.code, params.access_token, params.refresh_token, params.error, router])

  return <View />
}
