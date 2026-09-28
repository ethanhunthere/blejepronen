import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'

import { supabase } from '@/lib/supabase'
import { safeBack } from '@/lib/navigation'

/**
 * Native OAuth callback route (blejepronen://auth/callback).
 * The OS hands the provider redirect back into the app here — warm intents
 * and cold launches alike — so the session completes natively without any
 * browser detour. iOS auth-session results are handled by the auth screens
 * themselves; this route owns the deep-link path.
 */
export default function AuthCallbackRoute() {
  const router = useRouter()
  const params = useLocalSearchParams<{ code?: string; access_token?: string; refresh_token?: string; error?: string }>()
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
        } else if (params.access_token && params.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          })
          if (error) throw error
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
