import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Image,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Building2,
  RotateCcw,
  CheckCircle2,
  FastForward,
  ChevronRight,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import Svg, { Path } from 'react-native-svg'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { apiSignUp, apiVerifyOtp, apiResendCode } from '@/lib/api'
import { useBanner } from '@/context/BannerContext'
import { safeBack } from '@/lib/navigation'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { syncAuthSession } from '@/lib/auth-cache'

// ─── Official multi-color Google "G" emblem (vector, crisp at any size) ───
function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <Path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.97 11.97 0 0 0 0 10.76l3.98-3.09z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </Svg>
  )
}

// ─── Official Apple logo mark (official Apple PNG asset, strictly adheres to Apple HIG) ───
function AppleLogo({ size = 15, color = '#FFFFFF' }: { size?: number; color?: string }) {
  const isDarkColor = color === '#000000' || color === '#071A14' || color === '#071C18'
  const source = isDarkColor
    ? require('@/assets/images/apple-logo-black.png')
    : require('@/assets/images/apple-logo-white.png')

  return (
    <Image
      source={source}
      style={{ width: size, height: size, tintColor: color }}
      resizeMode="contain"
    />
  )
}

// ─── Official Facebook vector mark ───
function FacebookLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill="#1877F2"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </Svg>
  )
}

export default function AuthModalScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ initialTab?: string; reason?: string; title?: string }>()
  const { colors, theme } = useTheme()
  const { showBanner } = useBanner()

  // Navigation steps: 'auth' (Login / Register) or 'verify_otp' (6-digit code entry)
  const [step, setStep] = useState<'auth' | 'verify_otp'>('auth')
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    params.initialTab === 'register' ? 'register' : 'login'
  )

  const heroTitle = useMemo(() => {
    if (params.title) return params.title
    if (params.reason === 'favorite') return 'Ruani të preferuarat'
    if (params.reason === 'chat') return 'Bisedoni me shitësin'
    if (params.reason === 'post') return 'Publikoni pronë'
    return activeTab === 'login' ? 'Mirësevini në Bleje Pronën' : 'Krijoni llogarinë tuaj'
  }, [params.title, params.reason, activeTab])

  const heroSubtitle = useMemo(() => {
    if (params.reason === 'favorite') {
      return 'Ruani dhe sinkronizoni pronat në çdo pajisje.'
    }
    if (params.reason === 'chat') {
      return 'Bisedoni direkt me pronarët dhe agjencitë.'
    }
    if (params.reason === 'post') {
      return 'Arritni mijëra blerës potencialë shpejt.'
    }
    return activeTab === 'login'
      ? 'Hyni për të menaxhuar kërkimet dhe njoftimet.'
      : 'Regjistrohuni falas brenda pak sekondave.'
  }, [params.reason, activeTab])

  // Account Type: 'individual' | 'company'
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual')

  // Form Fields — streamlined signup: email + password only
  // (individuals), company name + email + password (companies).
  // Name, surname, phone & business details are verified later
  // from the Profili tab → Verification Center.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  // Verification Step Fields
  const [otpCode, setOtpCode] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [resending, setResending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const otpInputRef = useRef<TextInput | null>(null)

  // State
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 60-second OTP Countdown timer
  useEffect(() => {
    if (step === 'verify_otp') {
      setCountdown(60)
      setCanResend(false)

      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      setTimeout(() => {
        otpInputRef.current?.focus()
      }, 300)
    }

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }
  }, [step])

  const handleTabChange = (tab: 'login' | 'register') => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setActiveTab(tab)
    setErrorMessage(null)
  }

  const handleAccountTypeChange = (type: 'individual' | 'company') => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setAccountType(type)
    setErrorMessage(null)
  }

  const handleAuthSubmit = async () => {
    setErrorMessage(null)
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Ju lutemi shkruani një adresë email të vlefshme.')
      return
    }

    if (!password || password.length < 6) {
      setErrorMessage('Fjalëkalimi duhet të ketë të paktën 6 karaktere.')
      return
    }

    if (activeTab === 'register') {
      if (accountType === 'company') {
        if (!companyName.trim()) {
          setErrorMessage('Emri i kompanisë është i detyrueshëm.')
          return
        }
      }
    }

    setLoading(true)

    try {
      if (activeTab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })

        if (error) {
          const msg = error.message?.toLowerCase() || ''
          if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
            setErrorMessage(
              'Email-i nuk është verifikuar ende. Po dërgojmë kodin e verifikimit...'
            )
            // Auto resend code and transition to verify_otp
            await apiResendCode(trimmedEmail)
            showBanner({
              type: 'info',
              title: 'Verifiko Email-in',
              message: `Një kod i ri verifikimi u dërgua në ${trimmedEmail}.`,
            })
            setStep('verify_otp')
            setLoading(false)
            return
          }

          if (msg.includes('invalid login credentials')) {
            setErrorMessage('Email-i ose fjalëkalimi nuk është i saktë.')
          } else {
            setErrorMessage(error.message)
          }

          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          }
          setLoading(false)
          return
        }

        // Fetch fresh profile and hydrate in-memory auth-cache immediately
        let freshProfile: any = null
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle()
          freshProfile = prof
        } catch {}
        syncAuthSession(data.user, freshProfile)

        const meta = data.user?.user_metadata || {}
        const hasCompletedOnboarding = Boolean(meta.onboarding_completed)

        const displayName =
          meta.first_name ||
          meta.company_name ||
          data.user?.email?.split('@')[0] ||
          'Përdorues'

        showBanner({
          type: 'success',
          title: 'Mirësevini përsëri!',
          message: `Jeni kyçur me sukses si ${displayName}.`,
        })

        // Route successful logins directly into the app
        safeBack(router, '/(tabs)')
      } else {
        // Register flow: only email, password for individuals; companyName, email, password for companies
        const res = await apiSignUp({
          email: trimmedEmail,
          password,
          accountType,
          companyName: accountType === 'company' ? companyName.trim() : undefined,
        })

        if (!res.success) {
          setErrorMessage(res.error || 'Gabim gjatë regjistrimit. Ju lutemi provoni përsëri.')
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          }
          setLoading(false)
          return
        }

        // Optimistically sign in user so if they choose to skip OTP they have an active session
        try {
          await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          })
        } catch (signInErr) {
          console.warn('Pre-sign-in on register notice:', signInErr)
        }

        showBanner({
          type: 'info',
          title: 'Kodi u Dërgua!',
          message: `Kemi dërguar kodin 6-shifror të verifikimit në ${trimmedEmail}.`,
        })

        setStep('verify_otp')
        setLoading(false)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ndodhi një gabim i papritur gjatë komunikimit.'
      setErrorMessage(msg)
      setLoading(false)
    }
  }

  // Helper to silently swallow user-cancelled OAuth actions
  const isOAuthCancellation = (errorText?: string | null) => {
    if (!errorText) return false
    const lower = errorText.toLowerCase()
    return (
      lower.includes('cancel') ||
      lower.includes('dismiss') ||
      lower.includes('access_denied') ||
      lower.includes('user denied') ||
      lower.includes('popup_closed') ||
      lower.includes('closed by user') ||
      lower.includes('operation couldn’t be completed') ||
      lower.includes('operation couldn\'t be completed') ||
      lower.includes('user cancelled') ||
      lower.includes('user canceled')
    )
  }

  // ── Comprehensive Social & Native OAuth Suite (Apple, Google, Facebook) ───
  const oauthHandledRef = useRef(false)

  const finishOAuth = useCallback(
    async (urlStr: string, providerTitle: string) => {
      if (oauthHandledRef.current) return
      oauthHandledRef.current = true

      const hashPart = urlStr.split('#')[1] || ''
      const queryPart = urlStr.split('?')[1] || ''
      const hashParams = new URLSearchParams(hashPart)
      const queryParams = new URLSearchParams(queryPart)

      const oauthError =
        hashParams.get('error_description') ||
        queryParams.get('error_description') ||
        hashParams.get('error') ||
        queryParams.get('error')

      if (isOAuthCancellation(oauthError)) {
        oauthHandledRef.current = false
        setOauthLoading(null)
        return
      }

      const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')
      const authCode = queryParams.get('code') || hashParams.get('code')

      if (!accessToken && !authCode) {
        oauthHandledRef.current = false
        throw new Error(
          oauthError ||
            `${providerTitle} nuk u kthye në aplikacion. Kontrolloni URL-në e ridrejtimit te Supabase.`
        )
      }

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (sessionError) throw sessionError
      } else if (authCode) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode)
        if (exchangeError) throw exchangeError
      } else {
        throw new Error(`Nuk u gjetën kredencialet e verifikimit të ${providerTitle}.`)
      }

      // Fetch the fresh user and mirror the email-login success behavior
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Read saved pending persona
        let targetAccountType: string | null = null
        try {
          targetAccountType = await AsyncStorage.getItem('@blejepronen_pending_persona')
          await AsyncStorage.removeItem('@blejepronen_pending_persona')
        } catch {}

        if (targetAccountType === 'company') {
          try {
            await supabase
              .from('profiles')
              .update({ account_type: 'company', email_verified: true })
              .eq('id', user.id)

            await supabase.auth.updateUser({
              data: { account_type: 'company' },
            })
          } catch (e) {
            console.warn('Persist company persona notice:', e)
          }
        } else {
          try {
            await supabase
              .from('profiles')
              .update({ email_verified: true })
              .eq('id', user.id)
          } catch {}
        }

        // Fetch fresh profile and hydrate in-memory cache immediately
        let freshProfile: any = null
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()
          freshProfile = prof
        } catch {}

        syncAuthSession(user, freshProfile)
      }

      const meta = user?.user_metadata || {}
      const displayName =
        meta.full_name ||
        meta.first_name ||
        meta.company_name ||
        user?.email?.split('@')[0] ||
        'Përdorues'

      showBanner({
        type: 'success',
        title: 'Mirësevini!',
        message: `Jeni kyçur me sukses me ${providerTitle} si ${displayName}.`,
      })

      setOauthLoading(null)

      // Route directly into the app
      safeBack(router, '/(tabs)')
    },
    [router, showBanner]
  )

  const handleOAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    if (oauthLoading) return
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setErrorMessage(null)
    setOauthLoading(provider)
    oauthHandledRef.current = false

    const providerNames: Record<string, string> = {
      google: 'Google',
      apple: 'Apple',
      facebook: 'Facebook',
    }
    const providerTitle = providerNames[provider] || provider

    // Persist persona before starting OAuth
    try {
      await AsyncStorage.setItem('@blejepronen_pending_persona', accountType)
    } catch {}

    // Safety net: deep-link listener
    const linkSub = Linking.addEventListener('url', ({ url }) => {
      if (!url) return
      if (url.includes('access_token=') || url.includes('code=')) {
        finishOAuth(url, providerTitle).catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : `Ndodhi një problem gjatë hyrjes me ${providerTitle}.`
          if (isOAuthCancellation(msg)) {
            oauthHandledRef.current = false
            setOauthLoading(null)
            return
          }
          console.warn(`${providerTitle} deep-link notice:`, err)
          setErrorMessage(msg)
          setOauthLoading(null)
        })
      }
    })

    try {
      const redirectUrl = Linking.createURL('/auth/callback')
      const supabaseProvider = provider as
        | 'google'
        | 'apple'
        | 'facebook'

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: supabaseProvider,
        options: {
          skipBrowserRedirect: true,
          redirectTo: redirectUrl,
          queryParams: {
            account_type: accountType,
          },
        },
      })

      if (error || !data?.url) {
        const msg = error?.message?.toLowerCase() || ''
        if (
          msg.includes('provider is not enabled') ||
          (error as any)?.code === 400 ||
          (error as any)?.status === 400
        ) {
          showBanner({
            type: 'info',
            title: `${providerTitle} po përgatitet`,
            message: `Hyrja përmes ${providerTitle} po aktivizohet në sistem. Mund të kyçeni menjëherë me Google ose me email pa asnjë vonesë!`,
          })
        } else {
          setErrorMessage(
            error?.message || `Hyrja me ${providerTitle} nuk është e disponueshme aktualisht.`
          )
        }
        setOauthLoading(null)
        return
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)

      if (result.type === 'success' && result.url) {
        await finishOAuth(result.url, providerTitle)
      } else {
        // User cancelled, closed or dismissed the sheet
        oauthHandledRef.current = false
        setOauthLoading(null)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Ndodhi një problem gjatë hyrjes me ${providerTitle}.`
      if (isOAuthCancellation(msg)) {
        oauthHandledRef.current = false
        setOauthLoading(null)
        return
      }
      console.warn(`${providerTitle} auth notice:`, err)
      if (msg.toLowerCase().includes('provider is not enabled')) {
        showBanner({
          type: 'info',
          title: `${providerTitle} po përgatitet`,
          message: `Hyrja përmes ${providerTitle} po aktivizohet në sistem. Mund të kyçeni menjëherë me Google ose me email pa asnjë vonesë!`,
        })
      } else {
        setErrorMessage(msg)
      }
      setOauthLoading(null)
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    } finally {
      linkSub.remove()
    }
  }

  // Handle Skip Verification
  const handleSkipVerification = async () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    try {
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
    } catch {}
    showBanner({
      type: 'info',
      title: 'Verifikoni më vonë',
      message: 'Mund ta verifikoni email-in dhe identitetin tuaj në çdo kohë nga rubrika "Profili".',
    })
    router.replace('/(tabs)/profile' as never)
  }

  // Handle 6-Digit OTP Verification
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpCode).trim()
    if (code.length !== 6) {
      setErrorMessage('Ju lutemi shkruani të 6 shifrat e kodit të verifikimit.')
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
      otpInputRef.current?.focus()
      return
    }

    if (verifying) return

    Keyboard.dismiss()
    setErrorMessage(null)
    setVerifying(true)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }

    try {
      const res = await apiVerifyOtp({
        email: email.trim().toLowerCase(),
        code,
        password,
      })

      if (!res.success) {
        setErrorMessage(res.error || 'Kodi është i gabuar ose ka skaduar.')
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        }
        setVerifying(false)
        return
      }

      // Automatically sign in the user
      try {
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })
      } catch (signInErr) {
        console.warn('Post-verify auto sign-in notice:', signInErr)
      }

      showBanner({
        type: 'success',
        title: 'Llogaria u Aktivizua!',
        message: 'Email-i juaj u konfirmua me sukses. Ju lutem plotësoni profilin tuaj.',
      })

      router.replace('/completo-profilin' as never)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gabim gjatë verifikimit të kodit.'
      setErrorMessage(msg)
      setVerifying(false)
    }
  }

  // Handle Resending 6-digit Code
  const handleResendOtp = async () => {
    if (!canResend || resending) return

    setErrorMessage(null)
    setResending(true)

    try {
      const res = await apiResendCode(email.trim().toLowerCase())

      if (!res.success) {
        setErrorMessage(res.error || 'Dështoi ridërgimi i kodit. Provoni përsëri.')
        setResending(false)
        return
      }

      showBanner({
        type: 'info',
        title: 'Kodi i Ri u Dërgua',
        message: `Një kod i ri verifikimi u dërgua në ${email.trim()}.`,
      })

      setOtpCode('')
      setCountdown(60)
      setCanResend(false)
      setResending(false)
      otpInputRef.current?.focus()
    } catch {
      setErrorMessage('Lidhja me serverin dështoi gjatë ridërgimit.')
      setResending(false)
    }
  }

  // Theme-specific contrast button text and accent colors
  const primaryBtnText =
    theme === 'green' ? '#071C18' : theme === 'black' ? '#071A14' : '#FFFFFF'
  const brandHighlight = theme === 'green' ? colors.gold : colors.primary
  const appleBg = theme === 'white' ? '#000000' : '#FFFFFF'
  const appleFg = theme === 'white' ? '#FFFFFF' : '#000000'

  const specularBorderColor = colors.border

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Top Drag Handle & Close Button */}
      <View style={styles.topBar}>
        <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
        <Pressable
          style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
          onPress={() => safeBack(router, '/(tabs)')}
          hitSlop={10}
        >
          <X size={18} color={colors.textSecondary} strokeWidth={2.4} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ================= STEP 2: VERIFY EMAIL CODE (OTP) ================= */}
        {step === 'verify_otp' ? (
          <View
            style={[
              styles.authCard,
              {
                backgroundColor: theme === 'white' ? '#FFFFFF' : colors.surface,
                borderColor: specularBorderColor,
              },
            ]}
          >
            <View style={styles.verifyStepWrapper}>
              {/* Back Button */}
              <Pressable
                style={styles.backBtn}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  setStep('auth')
                }}
                hitSlop={8}
              >
                <ArrowLeft size={14} color={brandHighlight} strokeWidth={2.4} />
                <Text style={[styles.backBtnText, { color: brandHighlight }]}>Kthehu mbrapa</Text>
              </Pressable>

              {/* Verification Header Icon */}
              <View
                style={[
                  styles.verifyIconBadge,
                  {
                    backgroundColor:
                      theme === 'green'
                        ? 'rgba(200, 184, 130, 0.18)'
                        : 'rgba(0, 100, 89, 0.10)',
                  },
                ]}
              >
                <Mail size={24} color={brandHighlight} strokeWidth={2.2} />
              </View>

              <Text style={[styles.verifyTitle, { color: colors.textPrimary }]}>
                Verifiko Email-in
              </Text>
              <Text style={[styles.verifySubtitle, { color: colors.textMuted }]}>
                Shkruani kodin 6-shifror të dërguar në{' '}
                <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>
                  {email.trim()}
                </Text>
              </Text>

              {/* Error Message */}
              {errorMessage && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* 6-Digit OTP Interactive Panel */}
              <View style={styles.otpInteractiveContainer}>
                <View style={styles.otpBoxesRow} pointerEvents="none">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const char = otpCode[idx] || ''
                    const isCurrent = otpCode.length === idx
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.otpBox,
                          {
                            backgroundColor:
                              theme === 'white'
                                ? '#FFFFFF'
                                : theme === 'green'
                                ? 'rgba(0, 77, 69, 0.45)'
                                : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isCurrent
                              ? brandHighlight
                              : char
                              ? colors.primary
                              : specularBorderColor,
                            borderWidth: isCurrent ? 2 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.otpBoxChar,
                            {
                              color: char
                                ? colors.textPrimary
                                : isCurrent
                                ? brandHighlight
                                : colors.textLight,
                            },
                          ]}
                        >
                          {char || (isCurrent ? '•' : '–')}
                        </Text>
                      </View>
                    )
                  })}
                </View>

                {/* Stretched direct input over entire box row for 100% reliable tap detection */}
                <TextInput
                  ref={otpInputRef}
                  style={styles.otpDirectInput}
                  value={otpCode}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 6)
                    setOtpCode(cleaned)
                    setErrorMessage(null)
                    if (cleaned.length === 6) {
                      handleVerifyOtp(cleaned)
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  textContentType="oneTimeCode"
                  autoFocus
                  caretHidden={true}
                />
              </View>

              {/* Clear OTP quick action */}
              {otpCode.length > 0 && (
                <Pressable
                  style={styles.clearOtpBtn}
                  onPress={() => {
                    setOtpCode('')
                    otpInputRef.current?.focus()
                    if (Platform.OS !== 'web') Haptics.selectionAsync()
                  }}
                  hitSlop={10}
                >
                  <Text style={[styles.clearOtpText, { color: colors.textMuted }]}>
                    Pastro kodin ({otpCode.length}/6)
                  </Text>
                </Pressable>
              )}

              {/* Verify Button */}
              <Pressable
                style={[
                  styles.submitBtn,
                  styles.verifySubmitBtn,
                  {
                    backgroundColor: brandHighlight,
                    opacity: verifying ? 0.75 : 1,
                  },
                ]}
                onPress={() => handleVerifyOtp()}
                disabled={verifying}
                hitSlop={8}
              >
                {verifying ? (
                  <View style={styles.submitBtnInner}>
                    <ActivityIndicator color={primaryBtnText} size="small" />
                    <Text style={[styles.submitBtnText, { color: primaryBtnText }]}>
                      Duke verifikuar...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.submitBtnInner}>
                    <CheckCircle2 size={16} color={primaryBtnText} strokeWidth={2.4} />
                    <Text style={[styles.submitBtnText, { color: primaryBtnText }]}>
                      Konfirmo Kodin
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* Resend Section */}
              <View style={styles.resendSection}>
                {canResend ? (
                  <Pressable
                    style={[
                      styles.resendBtn,
                      { backgroundColor: colors.surfaceSubtle, borderColor: specularBorderColor },
                    ]}
                    onPress={handleResendOtp}
                    disabled={resending}
                  >
                    {resending ? (
                      <ActivityIndicator size="small" color={brandHighlight} />
                    ) : (
                      <>
                        <RotateCcw size={13} color={brandHighlight} strokeWidth={2.2} />
                        <Text style={[styles.resendBtnText, { color: brandHighlight }]}>
                          Ridërgo kodin me email
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : (
                  <Text style={[styles.countdownText, { color: colors.textMuted }]}>
                    Mund të kërkoni një kod të ri pas{' '}
                    <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>
                      {countdown}s
                    </Text>
                  </Text>
                )}
              </View>

              {/* Skip for now Escape Hatch */}
              <View style={styles.skipSection}>
                <View style={styles.orDividerRow}>
                  <View style={[styles.orDividerLine, { backgroundColor: specularBorderColor }]} />
                  <Text style={[styles.orDividerText, { color: colors.textMuted }]}>ose</Text>
                  <View style={[styles.orDividerLine, { backgroundColor: specularBorderColor }]} />
                </View>

                <Pressable
                  style={[
                    styles.skipBtn,
                    { borderColor: specularBorderColor, backgroundColor: colors.surfaceSubtle },
                  ]}
                  onPress={handleSkipVerification}
                  hitSlop={6}
                >
                  <FastForward size={14} color={colors.textSecondary} strokeWidth={2.2} />
                  <View style={styles.skipBtnTextGroup}>
                    <Text style={[styles.skipBtnText, { color: colors.textPrimary }]}>
                      Kalo për tani
                    </Text>
                    <Text style={[styles.skipBtnSubtext, { color: colors.textMuted }]}>
                      Verifikoni më vonë nga rubrika «Profili»
                    </Text>
                  </View>
                  <ChevronRight size={14} color={colors.textMuted} strokeWidth={2.2} />
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          /* ================= STEP 1: AUTH (LOGIN & REGISTER) ================= */
          <>
            {/* Centered Brand Emblem & Header with crisp typography */}
            <View style={styles.brandHero}>
              <Logo size={30} />
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                {heroTitle}
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
                {heroSubtitle}
              </Text>
            </View>

            {/* Modern Polished Card Container */}
            <View
              style={[
                styles.authCard,
                {
                  backgroundColor: theme === 'white' ? '#FFFFFF' : colors.surface,
                  borderColor: specularBorderColor,
                },
              ]}
            >
              {/* Segmented Tab Switcher (Kyçu / Regjistrohu) */}
              <View
                style={[
                  styles.tabSwitcher,
                  {
                    backgroundColor:
                      theme === 'white'
                        ? 'rgba(0, 0, 0, 0.04)'
                        : 'rgba(255, 255, 255, 0.06)',
                    borderColor: specularBorderColor,
                    borderWidth: 0.5,
                  },
                ]}
              >
                <Pressable
                  style={[
                    styles.tabBtn,
                    activeTab === 'login' && [
                      styles.tabBtnActive,
                      {
                        backgroundColor: colors.surface,
                        borderWidth: 0.5,
                        borderColor: specularBorderColor,
                        shadowColor: '#000',
                        shadowOpacity: theme === 'black' ? 0.35 : 0.08,
                        shadowRadius: 3,
                        elevation: 2,
                      },
                    ],
                  ]}
                  onPress={() => handleTabChange('login')}
                >
                  <LogIn
                    size={14}
                    color={activeTab === 'login' ? brandHighlight : colors.textMuted}
                    strokeWidth={activeTab === 'login' ? 2.5 : 2}
                  />
                  <Text
                    style={[
                      styles.tabBtnText,
                      {
                        color: activeTab === 'login' ? colors.textPrimary : colors.textMuted,
                        fontFamily: activeTab === 'login' ? Fonts.bold : Fonts.medium,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    Kyçu
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.tabBtn,
                    activeTab === 'register' && [
                      styles.tabBtnActive,
                      {
                        backgroundColor: colors.surface,
                        borderWidth: 0.5,
                        borderColor: specularBorderColor,
                        shadowColor: '#000',
                        shadowOpacity: theme === 'black' ? 0.35 : 0.08,
                        shadowRadius: 3,
                        elevation: 2,
                      },
                    ],
                  ]}
                  onPress={() => handleTabChange('register')}
                >
                  <UserPlus
                    size={14}
                    color={activeTab === 'register' ? brandHighlight : colors.textMuted}
                    strokeWidth={activeTab === 'register' ? 2.5 : 2}
                  />
                  <Text
                    style={[
                      styles.tabBtnText,
                      {
                        color: activeTab === 'register' ? colors.textPrimary : colors.textMuted,
                        fontFamily: activeTab === 'register' ? Fonts.bold : Fonts.medium,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    Regjistrohu
                  </Text>
                </Pressable>
              </View>

              {/* Error Alert */}
              {errorMessage && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Dual-Track Persona Switcher (Individ vs Kompani / Biznes) */}
              <View style={styles.accountTypeWrapper}>
                <View
                  style={[
                    styles.accountTypeSelector,
                    {
                      backgroundColor:
                        theme === 'white'
                          ? 'rgba(0, 0, 0, 0.035)'
                          : 'rgba(255, 255, 255, 0.05)',
                      borderColor: specularBorderColor,
                      borderWidth: 0.5,
                    },
                  ]}
                >
                  <Pressable
                    style={[
                      styles.accountTypePill,
                      accountType === 'individual' && [
                        styles.accountTypePillActive,
                        {
                          backgroundColor: colors.surface,
                          borderColor: specularBorderColor,
                          borderWidth: 0.5,
                        },
                      ],
                    ]}
                    onPress={() => handleAccountTypeChange('individual')}
                  >
                    <User
                      size={13}
                      color={accountType === 'individual' ? brandHighlight : colors.textMuted}
                      strokeWidth={2.2}
                    />
                    <Text
                      style={[
                        styles.accountTypePillText,
                        {
                          color:
                            accountType === 'individual'
                              ? colors.textPrimary
                              : colors.textMuted,
                          fontFamily:
                            accountType === 'individual' ? Fonts.bold : Fonts.medium,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      Individ
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.accountTypePill,
                      accountType === 'company' && [
                        styles.accountTypePillActive,
                        {
                          backgroundColor: colors.surface,
                          borderColor: specularBorderColor,
                          borderWidth: 0.5,
                        },
                      ],
                    ]}
                    onPress={() => handleAccountTypeChange('company')}
                  >
                    <Building2
                      size={13}
                      color={accountType === 'company' ? brandHighlight : colors.textMuted}
                      strokeWidth={2.2}
                    />
                    <Text
                      style={[
                        styles.accountTypePillText,
                        {
                          color:
                            accountType === 'company'
                              ? colors.textPrimary
                              : colors.textMuted,
                          fontFamily: accountType === 'company' ? Fonts.bold : Fonts.medium,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      Kompani / Biznes
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* ─── Branded, Evenly Spaced 3-Button Social Auth Row (Apple, Google, Facebook) ─── */}
              <View style={styles.socialAuthRow}>
                {/* Apple */}
                <Pressable
                  style={[
                    styles.socialAuthBtn,
                    {
                      backgroundColor: appleBg,
                      borderColor: theme === 'green' ? 'rgba(200, 184, 130, 0.35)' : appleBg,
                    },
                    (!!oauthLoading || loading) && styles.submitBtnDisabled,
                  ]}
                  onPress={() => handleOAuth('apple')}
                  disabled={!!oauthLoading || loading}
                  hitSlop={4}
                >
                  {oauthLoading === 'apple' ? (
                    <ActivityIndicator size="small" color={appleFg} />
                  ) : (
                    <View style={styles.socialBtnInner}>
                      <AppleLogo size={15} color={appleFg} />
                      <Text style={[styles.socialAuthBtnText, { color: appleFg }]}>
                        Apple
                      </Text>
                    </View>
                  )}
                </Pressable>

                {/* Google */}
                <Pressable
                  style={[
                    styles.socialAuthBtn,
                    {
                      backgroundColor: theme === 'white' ? '#FFFFFF' : colors.surfaceSubtle,
                      borderColor: specularBorderColor,
                    },
                    (!!oauthLoading || loading) && styles.submitBtnDisabled,
                  ]}
                  onPress={() => handleOAuth('google')}
                  disabled={!!oauthLoading || loading}
                  hitSlop={4}
                >
                  {oauthLoading === 'google' ? (
                    <ActivityIndicator size="small" color={brandHighlight} />
                  ) : (
                    <View style={styles.socialBtnInner}>
                      <GoogleLogo size={15} />
                      <Text style={[styles.socialAuthBtnText, { color: colors.textPrimary }]}>
                        Google
                      </Text>
                    </View>
                  )}
                </Pressable>

                {/* Facebook */}
                <Pressable
                  style={[
                    styles.socialAuthBtn,
                    {
                      backgroundColor: theme === 'white' ? '#FFFFFF' : colors.surfaceSubtle,
                      borderColor: theme === 'white' ? 'rgba(24, 119, 242, 0.25)' : specularBorderColor,
                    },
                    (!!oauthLoading || loading) && styles.submitBtnDisabled,
                  ]}
                  onPress={() => handleOAuth('facebook')}
                  disabled={!!oauthLoading || loading}
                  hitSlop={4}
                >
                  {oauthLoading === 'facebook' ? (
                    <ActivityIndicator size="small" color="#1877F2" />
                  ) : (
                    <View style={styles.socialBtnInner}>
                      <FacebookLogo size={15} />
                      <Text style={[styles.socialAuthBtnText, { color: '#1877F2' }]}>
                        Facebook
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Divider */}
              <View style={styles.orDividerRow}>
                <View style={[styles.orDividerLine, { backgroundColor: specularBorderColor }]} />
                <Text style={[styles.orDividerText, { color: colors.textMuted }]}>
                  ose me email
                </Text>
                <View style={[styles.orDividerLine, { backgroundColor: specularBorderColor }]} />
              </View>

              {/* Input Form Fields */}
              <View style={styles.form}>
                {/* If Company & Register: Emri i Kompanisë */}
                {activeTab === 'register' && accountType === 'company' && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                      Emri i Kompanisë ose Agjencisë *
                    </Text>
                    <View
                      style={[
                        styles.inputField,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor:
                            focusedField === 'companyName' ? brandHighlight : specularBorderColor,
                          borderWidth: focusedField === 'companyName' ? 1.5 : 0.5,
                        },
                      ]}
                    >
                      <Building2
                        size={16}
                        color={focusedField === 'companyName' ? brandHighlight : colors.textMuted}
                        strokeWidth={2}
                      />
                      <TextInput
                        style={[styles.textInput, { color: colors.textPrimary }]}
                        placeholder="psh. Prishtina Real Estate Sh.p.k."
                        placeholderTextColor={colors.placeholder}
                        value={companyName}
                        onChangeText={setCompanyName}
                        onFocus={() => setFocusedField('companyName')}
                        onBlur={() => setFocusedField(null)}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                )}

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    {accountType === 'company'
                      ? 'Email Zyrtar i Kompanisë *'
                      : 'Email *'}
                  </Text>
                  <View
                    style={[
                      styles.inputField,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor:
                          focusedField === 'email' ? brandHighlight : specularBorderColor,
                        borderWidth: focusedField === 'email' ? 1.5 : 0.5,
                      },
                    ]}
                  >
                    <Mail
                      size={16}
                      color={focusedField === 'email' ? brandHighlight : colors.textMuted}
                      strokeWidth={2}
                    />
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder={
                        accountType === 'company'
                          ? 'kompania@biznes.com'
                          : 'shembull@email.com'
                      }
                      placeholderTextColor={colors.placeholder}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Fjalëkalimi *</Text>
                  <View
                    style={[
                      styles.inputField,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor:
                          focusedField === 'password' ? brandHighlight : specularBorderColor,
                        borderWidth: focusedField === 'password' ? 1.5 : 0.5,
                      },
                    ]}
                  >
                    <Lock
                      size={16}
                      color={focusedField === 'password' ? brandHighlight : colors.textMuted}
                      strokeWidth={2}
                    />
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder={activeTab === 'register' ? 'Të paktën 6 karaktere' : 'Fjalëkalimi'}
                      placeholderTextColor={colors.placeholder}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showPassword}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                      {showPassword ? (
                        <EyeOff size={16} color={colors.textMuted} />
                      ) : (
                        <Eye size={16} color={colors.textMuted} />
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* Primary Action Button with Loading Spinner */}
                <Pressable
                  style={[
                    styles.submitBtn,
                    { backgroundColor: brandHighlight },
                    (loading || !!oauthLoading) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleAuthSubmit}
                  disabled={loading || !!oauthLoading}
                >
                  {loading ? (
                    <View style={styles.submitBtnInner}>
                      <ActivityIndicator color={primaryBtnText} size="small" />
                      <Text style={[styles.submitBtnText, { color: primaryBtnText }]}>
                        {activeTab === 'login' ? 'Duke u kyçur...' : 'Duke u regjistruar...'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.submitBtnInner}>
                      <Text style={[styles.submitBtnText, { color: primaryBtnText }]}>
                        {activeTab === 'login'
                          ? accountType === 'company'
                            ? 'Kyçu si Kompani'
                            : 'Kyçu në Llogari'
                          : accountType === 'company'
                          ? 'Regjistro Kompaninë'
                          : 'Krijo Llogari'}
                      </Text>
                      <ArrowRight size={16} color={primaryBtnText} strokeWidth={2.4} />
                    </View>
                  )}
                </Pressable>

                {/* 1-Line Switcher Prompt */}
                <View style={styles.switchPromptRow}>
                  <Text style={[styles.switchPromptText, { color: colors.textMuted }]}>
                    {activeTab === 'login' ? 'Nuk keni llogari?' : 'Keni tashmë llogari?'}
                  </Text>
                  <Pressable
                    onPress={() => handleTabChange(activeTab === 'login' ? 'register' : 'login')}
                    hitSlop={8}
                  >
                    <Text style={[styles.switchActionText, { color: brandHighlight }]}>
                      {activeTab === 'login' ? 'Regjistrohu falas' : 'Kyçu këtu'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginHorizontal: 'auto',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 24,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  brandHero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.4,
    lineHeight: 25,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 3,
  },
  heroSubtitle: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 310,
    alignSelf: 'center',
    marginBottom: 2,
  },
  authCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    width: '100%',
    marginBottom: 16,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 4,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    gap: 6,
  },
  tabBtnActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
  },
  accountTypeWrapper: {
    marginBottom: 10,
  },
  accountTypeSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  accountTypePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  accountTypePillActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  accountTypePillText: {
    fontSize: 11.5,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    lineHeight: 16,
  },
  socialAuthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  socialAuthBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  socialBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  socialAuthBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.1,
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 10,
    marginVertical: 10,
  },
  orDividerLine: {
    flex: 1,
    height: 0.5,
  },
  orDividerText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 0.2,
  },
  form: {
    gap: 9,
  },
  inputGroup: {
    gap: 3.5,
  },
  inputLabel: {
    fontSize: 11.5,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.1,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: Fonts.medium,
  },
  submitBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 2,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  switchPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
    paddingVertical: 3,
  },
  switchPromptText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  switchActionText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },

  // OTP Verification View Styles
  verifyStepWrapper: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  backBtnText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  verifyIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  verifyTitle: {
    fontSize: 18,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 4,
  },
  verifySubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
    maxWidth: 290,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 12,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  otpBox: {
    flex: 1,
    maxWidth: 42,
    minWidth: 32,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxChar: {
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  otpInteractiveContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  otpDirectInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.01,
  },
  clearOtpBtn: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  clearOtpText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  verifySubmitBtn: {
    marginTop: 4,
  },
  resendSection: {
    marginTop: 12,
    alignItems: 'center',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  resendBtnText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  countdownText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  skipSection: {
    marginTop: 10,
    alignItems: 'center',
    width: '100%',
  },
  skipBtn: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  skipBtnTextGroup: {
    flex: 1,
    gap: 1,
  },
  skipBtnText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.2,
  },
  skipBtnSubtext: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
})
