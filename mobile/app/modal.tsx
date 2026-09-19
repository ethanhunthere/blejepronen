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

// ─── Official Apple vector mark (strictly adheres to Apple HIG) ───
function AppleLogo({ size = 18, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 170 170" fill="none">
      <Path
        fill={color}
        d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.85-12-14.44-6.3-9.67-11.29-20.91-14.96-33.72-3.67-12.81-5.51-24.89-5.51-36.24 0-14.54 3.7-26.68 11.09-36.42 7.39-9.74 16.64-14.77 27.75-15.08 4.79 0 10.15 1.25 16.08 3.75 5.93 2.5 9.77 3.75 11.52 3.75 1.52 0 5.46-1.31 11.83-3.92 6.37-2.61 11.75-3.77 16.14-3.48 12.19.65 22.09 5.37 29.7 14.16-10.67 6.53-15.89 15.46-15.66 26.8.23 8.71 3.59 16.11 10.08 22.21 6.5 6.09 14.16 9.69 22.99 10.78-2.61 7.84-5.87 15.74-9.77 23.71zM119.22 31.84c0-7.18 2.54-13.93 7.63-20.24 5.09-6.32 11.45-10.23 19.09-11.74.22 1.09.33 2.07.33 2.94 0 7.07-2.69 13.9-8.06 20.49-5.38 6.59-11.74 10.37-19.09 11.34-.22-.98-.33-1.89-.33-2.79z"
      />
    </Svg>
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

// ─── Official Instagram vector mark ───
function InstagramLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill="#E4405F"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
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
    if (params.reason === 'favorite') return 'Ruani pronat tuaja të preferuara'
    if (params.reason === 'chat') return 'Bisedoni me shitësin drejtpërdrejt'
    if (params.reason === 'post') return 'Publikoni pronën tuaj në treg'
    return activeTab === 'login' ? 'Mirësevini në Bleje Pronën' : 'Krijoni llogarinë tuaj falas'
  }, [params.title, params.reason, activeTab])

  const heroSubtitle = useMemo(() => {
    if (params.reason === 'favorite') {
      return 'Kyçuni për të ruajtur banesa, shtëpi dhe vila, dhe për t’i gjetur ato në çdo kohë nga të gjitha pajisjet tuaja.'
    }
    if (params.reason === 'chat') {
      return 'Dërgoni mesazhe të menjëhershme dhe merrni përgjigje të shpejta nga agjencitë dhe pronarët e verifikuar.'
    }
    if (params.reason === 'post') {
      return 'Arritni mijëra blerës dhe qiramarrës potencialë në Kosovë, Shqipëri dhe Diasporë brenda pak minutave.'
    }
    return activeTab === 'login'
      ? 'Hyni në llogarinë tuaj për të menaxhuar kërkimet, bisedat dhe ofertat e fundit.'
      : 'Bashkohuni me platformën më moderne të pasurive të patundshme në Kosovë dhe rajon.'
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

        if (!hasCompletedOnboarding) {
          router.replace('/completo-profilin' as never)
        } else {
          safeBack(router, '/(tabs)')
        }
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

  // ── Comprehensive Social & Native OAuth Suite (Google, Apple, Facebook, Instagram) ───
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

      if (!meta.onboarding_completed) {
        router.replace('/completo-profilin' as never)
      } else {
        safeBack(router, '/(tabs)')
      }
    },
    [router, showBanner]
  )

  const handleOAuth = async (provider: 'google' | 'apple' | 'facebook' | 'instagram') => {
    if (oauthLoading) return
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setErrorMessage(null)
    setOauthLoading(provider)
    oauthHandledRef.current = false

    const providerNames: Record<string, string> = {
      google: 'Google',
      apple: 'Apple',
      facebook: 'Facebook',
      instagram: 'Instagram',
    }
    const providerTitle = providerNames[provider] || provider

    // Safety net: on some iOS / Expo Go combinations the callback arrives as a
    // deep link (re-opening the app) instead of resolving the browser session.
    const linkSub = Linking.addEventListener('url', ({ url }) => {
      if (!url) return
      if (url.includes('access_token=') || url.includes('code=')) {
        finishOAuth(url, providerTitle).catch((err: unknown) => {
          console.warn(`${providerTitle} deep-link notice:`, err)
          const msg = err instanceof Error ? err.message : `Ndodhi një problem gjatë hyrjes me ${providerTitle}.`
          setErrorMessage(msg)
          setOauthLoading(null)
        })
      }
    })

    try {
      const redirectUrl = Linking.createURL('/auth/callback')
      const supabaseProvider = (provider === 'instagram' ? 'facebook' : provider) as
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
        setErrorMessage(
          error?.message || `Hyrja me ${providerTitle} nuk është e disponueshme aktualisht.`
        )
        setOauthLoading(null)
        return
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)

      if (result.type === 'success' && result.url) {
        await finishOAuth(result.url, providerTitle)
      } else if (!oauthHandledRef.current) {
        setOauthLoading(null)
      }
    } catch (err: unknown) {
      console.warn(`${providerTitle} auth notice:`, err)
      const msg = err instanceof Error ? err.message : `Ndodhi një problem gjatë hyrjes me ${providerTitle}. Provoni përsëri.`
      setErrorMessage(msg)
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
              <ArrowLeft size={16} color={brandHighlight} strokeWidth={2.4} />
              <Text style={[styles.backBtnText, { color: brandHighlight }]}>Kthehu mbrapa</Text>
            </Pressable>

            {/* Verification Header Icon */}
            <View
              style={[
                styles.verifyIconBadge,
                {
                  backgroundColor:
                    theme === 'green'
                      ? 'rgba(200, 184, 130, 0.20)'
                      : 'rgba(0, 100, 89, 0.12)',
                },
              ]}
            >
              <Mail size={32} color={brandHighlight} strokeWidth={2.2} />
            </View>

            <Text style={[styles.verifyTitle, { color: colors.textPrimary }]}>
              Verifiko Email-in
            </Text>
            <Text style={[styles.verifySubtitle, { color: colors.textMuted }]}>
              Kemi dërguar kodin 6-shifror të verifikimit në:{'\n'}
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

            {/* Verify Button - High-Affordance & Instant Responsive Tap Target */}
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
                  <CheckCircle2 size={19} color={primaryBtnText} strokeWidth={2.4} />
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
                      <RotateCcw size={15} color={brandHighlight} strokeWidth={2.2} />
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

            {/* Apple-Grade "Skip for now" Escape Hatch */}
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
                <FastForward size={16} color={colors.textSecondary} strokeWidth={2.2} />
                <View style={styles.skipBtnTextGroup}>
                  <Text style={[styles.skipBtnText, { color: colors.textPrimary }]}>
                    Kalo për tani
                  </Text>
                  <Text style={[styles.skipBtnSubtext, { color: colors.textMuted }]}>
                    Verifikoni më vonë, nga skedari «Profili»
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>
        ) : (
          /* ================= STEP 1: AUTH (LOGIN & REGISTER) ================= */
          <>
            {/* Centered Brand Emblem & Welcoming Editorial Context */}
            <View style={styles.brandHero}>
              <Logo size={42} />
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                {heroTitle}
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
                {heroSubtitle}
              </Text>
            </View>

            {/* Apple/Airbnb-Grade Segmented Tab Switcher (Kyçu / Regjistrohu) */}
            <View
              style={[
                styles.tabSwitcher,
                {
                  backgroundColor:
                    theme === 'white'
                      ? 'rgba(0, 0, 0, 0.05)'
                      : 'rgba(255, 255, 255, 0.07)',
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
                      shadowRadius: 5,
                      elevation: 2,
                    },
                  ],
                ]}
                onPress={() => handleTabChange('login')}
              >
                <LogIn
                  size={16}
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
                  adjustsFontSizeToFit
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
                      shadowRadius: 5,
                      elevation: 2,
                    },
                  ],
                ]}
                onPress={() => handleTabChange('register')}
              >
                <UserPlus
                  size={16}
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
                  adjustsFontSizeToFit
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

            {/* Dual-Track Persona Architecture Switcher (Individ vs Kompani / Biznes) on BOTH tabs */}
            <View style={styles.accountTypeWrapper}>
              <View
                style={[
                  styles.accountTypeSelector,
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
                    size={15}
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
                    adjustsFontSizeToFit
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
                    size={15}
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
                    adjustsFontSizeToFit
                  >
                    Kompani / Biznes
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* ─── Comprehensive Social & Native OAuth Suite ─── */}
            <View style={styles.oauthSection}>
              {/* Hero Google Button */}
              <Pressable
                style={[
                  styles.oauthHeroBtn,
                  { backgroundColor: colors.surface, borderColor: specularBorderColor },
                  (!!oauthLoading || loading) && styles.submitBtnDisabled,
                ]}
                onPress={() => handleOAuth('google')}
                disabled={!!oauthLoading || loading}
              >
                {oauthLoading === 'google' ? (
                  <ActivityIndicator size="small" color={brandHighlight} />
                ) : (
                  <>
                    <GoogleLogo size={19} />
                    <Text style={[styles.oauthHeroBtnText, { color: colors.textPrimary }]}>
                      Vazhdo me Google
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Instant Reassurance Copy */}
              <Text style={[styles.oauthReassuranceText, { color: colors.textMuted }]}>
                ⚡ Pa fjalëkalim dhe pa verifikim me email — hyrje e menjëhershme
              </Text>

              {/* Apple HIG Button */}
              <Pressable
                style={[
                  styles.appleBtn,
                  {
                    backgroundColor: appleBg,
                    borderColor: theme === 'green' ? 'rgba(200, 184, 130, 0.3)' : appleBg,
                  },
                  (!!oauthLoading || loading) && styles.submitBtnDisabled,
                ]}
                onPress={() => handleOAuth('apple')}
                disabled={!!oauthLoading || loading}
              >
                {oauthLoading === 'apple' ? (
                  <ActivityIndicator size="small" color={appleFg} />
                ) : (
                  <>
                    <AppleLogo size={18} color={appleFg} />
                    <Text style={[styles.appleBtnText, { color: appleFg }]}>
                      Vazhdo me Apple
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Meta Ecosystem (Facebook & Instagram) */}
              <View style={styles.metaRow}>
                <Pressable
                  style={[
                    styles.metaBtn,
                    { backgroundColor: colors.surface, borderColor: specularBorderColor },
                    (!!oauthLoading || loading) && styles.submitBtnDisabled,
                  ]}
                  onPress={() => handleOAuth('facebook')}
                  disabled={!!oauthLoading || loading}
                >
                  {oauthLoading === 'facebook' ? (
                    <ActivityIndicator size="small" color="#1877F2" />
                  ) : (
                    <>
                      <FacebookLogo size={18} />
                      <Text style={[styles.metaBtnText, { color: colors.textPrimary }]}>
                        Facebook
                      </Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={[
                    styles.metaBtn,
                    { backgroundColor: colors.surface, borderColor: specularBorderColor },
                    (!!oauthLoading || loading) && styles.submitBtnDisabled,
                  ]}
                  onPress={() => handleOAuth('instagram')}
                  disabled={!!oauthLoading || loading}
                >
                  {oauthLoading === 'instagram' ? (
                    <ActivityIndicator size="small" color="#E4405F" />
                  ) : (
                    <>
                      <InstagramLogo size={18} />
                      <Text style={[styles.metaBtnText, { color: colors.textPrimary }]}>
                        Instagram
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
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
                      size={18}
                      color={focusedField === 'companyName' ? brandHighlight : colors.textMuted}
                      strokeWidth={2}
                    />
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="psh. Prishtina Real Estate Sh.p.k."
                      placeholderTextColor={colors.textLight}
                      value={companyName}
                      onChangeText={setCompanyName}
                      onFocus={() => setFocusedField('companyName')}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {/* Email (dynamically scoped) */}
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
                    size={18}
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
                    placeholderTextColor={colors.textLight}
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
                    size={18}
                    color={focusedField === 'password' ? brandHighlight : colors.textMuted}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder={activeTab === 'register' ? 'Të paktën 6 karaktere' : 'Fjalëkalimi'}
                    placeholderTextColor={colors.textLight}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textMuted} />
                    ) : (
                      <Eye size={18} color={colors.textMuted} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Primary Action Button */}
              <Pressable
                style={[
                  styles.submitBtn,
                  { backgroundColor: brandHighlight },
                  loading && styles.submitBtnDisabled,
                ]}
                onPress={handleAuthSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={primaryBtnText} />
                ) : (
                  <View style={styles.submitBtnInner}>
                    <Text style={[styles.submitBtnText, { color: primaryBtnText }]}>
                      {activeTab === 'login'
                        ? accountType === 'company'
                          ? 'Kyçu si Kompani'
                          : 'Kyçu'
                        : accountType === 'company'
                        ? 'Regjistro Kompaninë'
                        : 'Regjistrohu'}
                    </Text>
                    <ArrowRight size={18} color={primaryBtnText} strokeWidth={2.4} />
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
                    {activeTab === 'login' ? 'Regjistrohu' : 'Kyçu'}
                  </Text>
                </Pressable>
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
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginHorizontal: 'auto',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  brandHero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 21,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.5,
    lineHeight: 27,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13.5,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 330,
    alignSelf: 'center',
    marginBottom: 16,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    gap: 6,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  tabBtnActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 14.5,
  },
  accountTypeWrapper: {
    marginBottom: 20,
    gap: 8,
  },
  accountTypeSelector: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 6,
  },
  accountTypePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  accountTypePillActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  accountTypePillText: {
    fontSize: 12.5,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    lineHeight: 18,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.1,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  submitBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15.5,
    fontFamily: Fonts.bold,
  },
  switchPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
  },
  switchPromptText: {
    fontSize: 13.5,
    fontFamily: Fonts.regular,
  },
  switchActionText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },

  // OTP Verification View Styles
  verifyStepWrapper: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  backBtnText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
  verifyIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  verifyTitle: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 8,
  },
  verifySubtitle: {
    fontSize: 13.5,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 300,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
  },
  otpBox: {
    flex: 1,
    maxWidth: 46,
    minWidth: 36,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxChar: {
    fontSize: 24,
    fontFamily: Fonts.bold,
  },
  otpInteractiveContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  clearOtpText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  verifySubmitBtn: {
    marginTop: 6,
  },
  resendSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  resendBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  countdownText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  skipSection: {
    marginTop: 18,
    alignItems: 'center',
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 12,
    marginBottom: 14,
  },
  orDividerLine: {
    flex: 1,
    height: 0.5,
  },
  orDividerText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    letterSpacing: 0.4,
  },
  skipBtn: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 0.5,
  },
  skipBtnTextGroup: {
    flex: 1,
    gap: 1,
  },
  skipBtnText: {
    fontSize: 14.5,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.2,
  },
  skipBtnSubtext: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  oauthSection: {
    gap: 8,
    marginBottom: 16,
  },
  oauthHeroBtn: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  oauthHeroBtnText: {
    fontSize: 14.5,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.2,
  },
  oauthReassuranceText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginTop: 1,
    marginBottom: 4,
  },
  appleBtn: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  appleBtnText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  metaBtnText: {
    fontSize: 13.5,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.2,
  },
})
