import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  BackHandler,
} from 'react-native'
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  ArrowLeft,
  Building2,
  User,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { useTheme, Fonts } from '@/constants/theme'
import { supabase, safeExchangeCodeForSession } from '@/lib/supabase'
import { Logo } from '@/components/Logo'

import { apiSignUp, apiVerifyOtp, apiResendCode } from '@/lib/api'
import { useBanner } from '@/context/BannerContext'
import { safeBack, openLoginScreen, resolveAuthSuccess } from '@/lib/navigation'
import { syncAuthSession } from '@/lib/auth-cache'
import { TactilePressable, SlidingTabSwitcher, AuthProgressOverlay } from '@/components/motion'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { GoogleLogo, AppleLogo, FacebookLogo } from '@/components/SocialLogos'

export default function RegisterScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ redirectTo?: string; reason?: string }>()
  const { colors, theme } = useTheme()
  const { showBanner } = useBanner()
  const navigation = useNavigation()

  // Persona State: 'individual' | 'company'
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual')

  // Step: 'form' | 'verify_otp'
  const [step, setStep] = useState<'form' | 'verify_otp'>('form')

  // Form Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<'email' | 'password' | 'companyName' | 'otp' | null>(null)

  // Verification Step State
  const [otpCode, setOtpCode] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [resending, setResending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const otpInputRef = useRef<TextInput | null>(null)

  // Feedback State
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [skipping, setSkipping] = useState(false)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    companyName?: string
    otp?: string
    general?: string
  }>({})

  // Input lock: active ONLY while an async request is actively pending AND not completed.
  const allowDismissRef = useRef(false)
  const locked = !done && (loading || verifying || skipping || Boolean(oauthLoading))

  useEffect(() => {
    if (!locked || allowDismissRef.current || done || Platform.OS === 'web') return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (allowDismissRef.current || done) return false
      if (step === 'verify_otp') {
        setStep('form')
        return true
      }
      return true
    })
    return () => sub.remove()
  }, [locked, done, step])

  // Android hardware/gesture back: ignored while a submit is in flight;
  // at the OTP step it returns to the form step instead of popping the whole screen.
  // Once authenticated or explicitly dismissed, allow immediate teardown without interception.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowDismissRef.current || done) return
      if (locked) {
        e.preventDefault()
        return
      }
      if (step === 'verify_otp') {
        e.preventDefault()
        setStep('form')
      }
    })
    return unsubscribe
  }, [navigation, step, locked, done])

  const progressLabel = oauthLoading
    ? `Duke krijuar llogarinë me ${
        oauthLoading === 'google' ? 'Google' : oauthLoading === 'apple' ? 'Apple' : 'Facebook'
      }…`
    : skipping
    ? 'Duke u kyçur…'
    : verifying
    ? 'Duke verifikuar kodin…'
    : 'Duke krijuar llogarinë…'

  const oauthHandledRef = useRef(false)
  const isDark = theme === 'black' || theme === 'green'
  const brandHighlight = theme === 'green' ? colors.gold : colors.primary
  const primaryBtnText =
    theme === 'green' ? '#071C18' : theme === 'black' ? '#071A14' : '#FFFFFF'

  // 60-second OTP countdown timer
  const startOtpCountdown = useCallback(() => {
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
  }, [])

  useEffect(() => {
    let focusTimer: ReturnType<typeof setTimeout> | null = null

    if (step === 'verify_otp') {
      startOtpCountdown()

      focusTimer = setTimeout(() => {
        otpInputRef.current?.focus()
      }, 300)
    }

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      if (focusTimer) clearTimeout(focusTimer)
    }
  }, [step, startOtpCountdown])

  // Helper to swallow user-cancelled OAuth actions
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

  // Finish OAuth
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

      if (!authCode && (accessToken || refreshToken)) {
        // Implicit-flow tokens in the redirect URL — refuse. PKCE is required.
        oauthHandledRef.current = false
        setOauthLoading(null)
        throw new Error(
          `${providerTitle} u kthye me tokenë të pasigurt në URL. Ju lutemi provoni përsëri.`
        )
      }

      if (!authCode) {
        oauthHandledRef.current = false
        throw new Error(
          oauthError ||
            `${providerTitle} nuk u kthye në aplikacion. Kontrolloni URL-në e ridrejtimit.`
        )
      }

      const { error: exchangeError } = await safeExchangeCodeForSession(authCode)
      if (exchangeError) {
        const {
          data: { user: existingUser },
        } = await supabase.auth.getUser()
        if (!existingUser) throw exchangeError
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        if (accountType === 'company') {
          try {
            // profiles has no account_type column and email_verified is
            // server-derived — only the persona metadata belongs here.
            await supabase.auth.updateUser({
              data: { account_type: 'company' },
            })
          } catch (e) {
            console.warn('Persist company persona notice:', e)
          }
        }

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

        const meta = user.user_metadata || {}
        const displayName =
          meta.full_name ||
          meta.first_name ||
          meta.company_name ||
          user.email?.split('@')[0] ||
          'Përdorues'

        showBanner({
          type: 'success',
          title: 'Mirësevini!',
          message: `Llogaria juaj u krijua me sukses si ${displayName}.`,
        })

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }
        allowDismissRef.current = true
        setLoading(false)
        setVerifying(false)
        setSkipping(false)
        setOauthLoading(null)
        setDone(true)
        resolveAuthSuccess(router, params.redirectTo)
      } else {
        oauthHandledRef.current = false
        setOauthLoading(null)
        setErrors({
          general: `${providerTitle} nuk u kthye me një sesion valid. Provoni përsëri.`,
        })
      }
    },
    [router, showBanner, accountType, params.redirectTo]
  )

  const handleOAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    if (oauthLoading) return
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setErrors({})
    setOauthLoading(provider)
    oauthHandledRef.current = false

    const providerNames: Record<string, string> = {
      google: 'Google',
      apple: 'Apple',
      facebook: 'Facebook',
    }
    const providerTitle = providerNames[provider] || provider

    try {
      // Native deep-link redirect from app.json scheme (blejepronen://):
      // normalized to eliminate double/triple slashes across platforms
      const redirectUrl =
        Platform.OS === 'web'
          ? Linking.createURL('/auth/callback')
          : 'blejepronen://auth/callback'

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
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
        if (msg.includes('provider is not enabled')) {
          showBanner({
            type: 'info',
            title: `${providerTitle} po përgatitet`,
            message: `Hyrja përmes ${providerTitle} po aktivizohet. Mund të regjistroheni menjëherë me Google ose email!`,
          })
        } else {
          setErrors({
            general:
              error?.message ||
              `Regjistrimi me ${providerTitle} nuk është i disponueshëm për momentin.`,
          })
        }
        setOauthLoading(null)
        return
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
      void WebBrowser.dismissBrowser().catch(() => {})

      if (result.type === 'success' && result.url) {
        await finishOAuth(result.url, providerTitle)
      } else {
        // Opportunistic fallback: verify if the native intent already authenticated the session
        const {
          data: { user: opportunisticUser },
        } = await supabase.auth.getUser()

        if (opportunisticUser) {
          if (accountType === 'company') {
            try {
              await supabase.auth.updateUser({
                data: { account_type: 'company' },
              })
            } catch (e) {
              console.warn('Persist company persona notice:', e)
            }
          }

          let freshProfile: any = null
          try {
            const { data: prof } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', opportunisticUser.id)
              .maybeSingle()
            freshProfile = prof
          } catch {}

          syncAuthSession(opportunisticUser, freshProfile)

          const meta = opportunisticUser.user_metadata || {}
          const displayName =
            meta.full_name ||
            meta.first_name ||
            meta.company_name ||
            opportunisticUser.email?.split('@')[0] ||
            'Përdorues'

          showBanner({
            type: 'success',
            title: 'Mirësevini!',
            message: `Llogaria juaj u krijua me sukses si ${displayName}.`,
          })

          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          }
          allowDismissRef.current = true
          setLoading(false)
          setVerifying(false)
          setSkipping(false)
          setOauthLoading(null)
          setDone(true)
          resolveAuthSuccess(router, params.redirectTo)
        } else {
          oauthHandledRef.current = false
          setOauthLoading(null)
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : `Ndodhi një problem gjatë regjistrimit me ${providerTitle}.`

      if (isOAuthCancellation(msg)) {
        oauthHandledRef.current = false
        setOauthLoading(null)
        return
      }
      setErrors({ general: msg })
      setOauthLoading(null)
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    }
  }

  // Handle Form Submit
  const handleRegisterSubmit = async () => {
    if (loading || oauthLoading) return
    Keyboard.dismiss()
    setErrors({})
    const trimmedEmail = email.trim().toLowerCase()
    const newErrors: { email?: string; password?: string; companyName?: string; general?: string } =
      {}

    if (!trimmedEmail) {
      newErrors.email = 'Ju lutemi shkruani adresën tuaj të email-it.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Ju lutemi shkruani një adresë email të vlefshme.'
    }

    if (!password) {
      newErrors.password = 'Ju lutemi shkruani fjalëkalimin tuaj.'
    } else if (password.length < 6) {
      newErrors.password = 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.'
    }

    if (accountType === 'company' && !companyName.trim()) {
      newErrors.companyName = 'Ju lutemi shkruani emrin e kompanisë ose agjencisë.'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
      return
    }

    setLoading(true)

    try {
      const res = await apiSignUp({
        email: trimmedEmail,
        password,
        accountType,
        companyName: accountType === 'company' ? companyName.trim() : undefined,
      })

      if (!res.success) {
        setErrors({ general: res.error || 'Gabim gjatë regjistrimit. Ju lutemi provoni përsëri.' })
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        }
        setLoading(false)
        return
      }

      // Optimistically log in user
      try {
        await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })
      } catch {}

      showBanner({
        type: 'info',
        title: 'Kodi u Dërgua!',
        message: `Kemi dërguar kodin 6-shifror të verifikimit në ${trimmedEmail}.`,
      })

      setStep('verify_otp')
      setLoading(false)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Ndodhi një gabim i papritur gjatë komunikimit.'
      setErrors({ general: msg })
      setLoading(false)
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    }
  }

  // Handle 6-Digit OTP Verification
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpCode).trim()
    if (code.length !== 6) {
      setErrors({ otp: 'Ju lutemi shkruani të 6 shifrat e kodit të verifikimit.' })
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
      otpInputRef.current?.focus()
      return
    }

    if (verifying) return
    Keyboard.dismiss()
    setErrors({})
    setVerifying(true)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }

    try {
      // Server treats password as optional; mobile completes the session via
      // signInWithPassword below. Do not send the password over OTP verify.
      const res = await apiVerifyOtp({
        email: email.trim().toLowerCase(),
        code,
      })

      if (!res.success) {
        setErrors({ otp: res.error || 'Kodi është i gabuar ose ka skaduar.' })
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        }
        setVerifying(false)
        return
      }

      // Session completion: surface failures instead of swallowing them.
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })
        if (signInError) {
          console.warn('Post-OTP signInWithPassword failed:', signInError.message)
          setErrors({
            otp: 'Email-i u konfirmua, por kyçja dështoi. Ju lutemi kyçuni manualisht.',
          })
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          }
          setVerifying(false)
          return
        }
      } catch (signInErr) {
        console.warn('Post-OTP signInWithPassword exception:', signInErr)
        setErrors({
          otp: 'Email-i u konfirmua, por kyçja dështoi. Ju lutemi kyçuni manualisht.',
        })
        setVerifying(false)
        return
      }

      showBanner({
        type: 'success',
        title: 'Llogaria u Aktivizua!',
        message: 'Email-i juaj u konfirmua me sukses. Ju lutem plotësoni profilin tuaj.',
      })

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      allowDismissRef.current = true
      setLoading(false)
      setVerifying(false)
      setSkipping(false)
      setOauthLoading(null)
      setDone(true)
      if (params.redirectTo) {
        resolveAuthSuccess(router, params.redirectTo)
      } else {
        router.replace({ pathname: '/completo-profilin', params: { from: 'signup' } } as any)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gabim gjatë verifikimit të kodit.'
      setErrors({ otp: msg })
      setVerifying(false)
    }
  }

  // Handle Skip Verification
  const handleSkipVerification = async () => {
    if (skipping) return
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setSkipping(true)
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

    allowDismissRef.current = true
    setLoading(false)
    setVerifying(false)
    setSkipping(false)
    setOauthLoading(null)
    setDone(true)
    if (params.redirectTo) {
      resolveAuthSuccess(router, params.redirectTo)
    } else {
      router.replace('/(tabs)/profile' as any)
    }
  }

  // Handle Resend OTP Code
  const handleResendOtp = async () => {
    if (!canResend || resending) return
    setErrors({})
    setResending(true)

    try {
      const res = await apiResendCode(email.trim().toLowerCase())
      if (!res.success) {
        setErrors({ otp: res.error || 'Dështoi ridërgimi i kodit. Provoni përsëri.' })
        setResending(false)
        return
      }

      showBanner({
        type: 'info',
        title: 'Kodi i Ri u Dërgua',
        message: `Një kod i ri verifikimi u dërgua në ${email.trim()}.`,
      })

      setOtpCode('')
      startOtpCountdown()
      setResending(false)
      otpInputRef.current?.focus()
    } catch {
      setErrors({ otp: 'Lidhja me serverin dështoi gjatë ridërgimit.' })
      setResending(false)
    }
  }

  const handleGoToLogin = () => {
    openLoginScreen(router, {
      redirectTo: params.redirectTo,
      reason: params.reason,
      replace: true,
    })
  }

  const handleBack = () => {
    if (locked && !allowDismissRef.current) return
    if (step === 'verify_otp') {
      setStep('form')
    } else {
      allowDismissRef.current = true
      safeBack(router, '/(tabs)')
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Full-bleed surface: notches/islands handled as internal padding only. */}
      <View style={[styles.navHeader, { paddingTop: Math.max(insets.top + 6, 16) }]}>
        <TactilePressable
          onPress={handleBack}
          style={[
            styles.backBtn,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              borderColor: colors.border,
            },
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Kthehu prapa"
        >
          <ArrowLeft size={19} color={colors.textPrimary} strokeWidth={2.4} />
        </TactilePressable>

        <View style={styles.navLogoContainer}>
          <Logo size={28} />
        </View>

        <View style={styles.navPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 28, 36) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          pointerEvents={locked && !done ? 'none' : 'auto'}
        >
          {step === 'verify_otp' ? (
            /* ================= STEP 2: 6-DIGIT EMAIL VERIFICATION ================= */
            <Animated.View
              key="verify"
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(150)}
              style={styles.verifyStepContainer}
            >
              <View style={styles.titleSection}>
                <View
                  style={[
                    styles.verifyIconBadge,
                    {
                      backgroundColor:
                        theme === 'green'
                          ? 'rgba(200, 184, 130, 0.16)'
                          : 'rgba(0, 103, 91, 0.10)',
                      borderColor: brandHighlight,
                    },
                  ]}
                >
                  <ShieldCheck size={28} color={brandHighlight} strokeWidth={2.2} />
                </View>
                <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>
                  Verifikoni Email-in
                </Text>
                <Text style={[styles.mainSubtitle, { color: colors.textMuted }]}>
                  Kemi dërguar kodin 6-shifror të sigurisë në{' '}
                  <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>
                    {email}
                  </Text>
                  .
                </Text>
              </View>

              {errors.otp && (
                <View
                  style={[
                    styles.errorCard,
                    {
                      backgroundColor: isDark
                        ? 'rgba(239, 68, 68, 0.14)'
                        : 'rgba(239, 68, 68, 0.08)',
                      borderColor: 'rgba(239, 68, 68, 0.28)',
                    },
                  ]}
                >
                  <AlertCircle size={16} color="#EF4444" strokeWidth={2.2} />
                  <Text style={styles.errorText}>{errors.otp}</Text>
                </View>
              )}

              {/* 6-Digit Code Input Box */}
              <View
                style={[
                  styles.otpInputBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      errors.otp
                        ? '#EF4444'
                        : focusedField === 'otp'
                        ? brandHighlight
                        : colors.border,
                  },
                ]}
              >
                <TextInput
                  ref={otpInputRef}
                  style={[styles.otpTextInput, { color: colors.textPrimary }]}
                  placeholder="000000"
                  placeholderTextColor={colors.textLight}
                  value={otpCode}
                  editable={!locked}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9]/g, '').slice(0, 6)
                    setOtpCode(clean)
                    if (errors.otp) setErrors((prev) => ({ ...prev, otp: undefined }))
                    if (clean.length === 6) {
                      handleVerifyOtp(clean)
                    }
                  }}
                  onFocus={() => setFocusedField('otp')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                />
              </View>

              {/* Verify Action Button */}
              <TactilePressable
                onPress={() => handleVerifyOtp()}
                disabled={verifying}
                style={[
                  styles.primarySubmitBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: verifying ? 0.8 : 1,
                  },
                ]}
                haptic="medium"
              >
                {verifying ? (
                  <ActivityIndicator size="small" color={primaryBtnText} />
                ) : (
                  <>
                    <CheckCircle2 size={18} color={primaryBtnText} strokeWidth={2.4} />
                    <Text style={[styles.primarySubmitText, { color: primaryBtnText }]}>
                      Verifiko Kodin
                    </Text>
                  </>
                )}
              </TactilePressable>

              {/* Resend Code Section */}
              <View style={styles.resendRow}>
                {canResend ? (
                  <TactilePressable
                    onPress={handleResendOtp}
                    disabled={resending}
                    style={styles.resendBtn}
                    haptic="selection"
                  >
                    {resending ? (
                      <ActivityIndicator size="small" color={brandHighlight} />
                    ) : (
                      <>
                        <RotateCcw size={14} color={brandHighlight} strokeWidth={2.2} />
                        <Text style={[styles.resendBtnText, { color: brandHighlight }]}>
                          Ridërgo kodin
                        </Text>
                      </>
                    )}
                  </TactilePressable>
                ) : (
                  <Text style={[styles.countdownText, { color: colors.textLight }]}>
                    Ridërgimi i mundshëm pas {countdown}s
                  </Text>
                )}
              </View>

              {/* Skip Option */}
              <View style={styles.skipSection}>
                <TactilePressable
                  onPress={handleSkipVerification}
                  style={[
                    styles.skipBtn,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                  haptic="light"
                >
                  <View style={styles.skipBtnTextGroup}>
                    <Text style={[styles.skipBtnText, { color: colors.textPrimary }]}>
                      Vazhdo pa verifikim
                    </Text>
                    <Text style={[styles.skipBtnSubtext, { color: colors.textMuted }]}>
                      Mund ta plotësoni verifikimin nga profili
                    </Text>
                  </View>
                  <ChevronRight size={17} color={colors.textLight} />
                </TactilePressable>
              </View>
            </Animated.View>
          ) : (
            /* ================= STEP 1: REGISTRATION FORM ================= */
            <Animated.View key="form" entering={FadeIn.duration(220)} exiting={FadeOut.duration(150)}>
              {/* Screen Title & Welcome */}
              <View style={styles.titleSection}>
                <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>
                  Krijoni Llogari të Re
                </Text>
                <Text style={[styles.mainSubtitle, { color: colors.textMuted }]}>
                  Zgjidhni llojin e profilit dhe regjistrohuni brenda pak sekondave.
                </Text>
              </View>

              {/* General Error Banner */}
              {errors.general && (
                <View
                  style={[
                    styles.errorCard,
                    {
                      backgroundColor: isDark
                        ? 'rgba(239, 68, 68, 0.14)'
                        : 'rgba(239, 68, 68, 0.08)',
                      borderColor: 'rgba(239, 68, 68, 0.28)',
                    },
                  ]}
                >
                  <AlertCircle size={16} color="#EF4444" strokeWidth={2.2} />
                  <Text style={styles.errorText}>{errors.general}</Text>
                </View>
              )}

              {/* Persona Selector (Individual vs Company) */}
              <View style={styles.personaContainer}>
                <SlidingTabSwitcher<'individual' | 'company'>
                  activeTab={accountType}
                  onChangeTab={(tab) => {
                    setAccountType(tab)
                    setErrors({})
                  }}
                  tabs={[
                    {
                      key: 'individual',
                      label: 'Përdorues Fizik',
                      icon: (col, sz) => <User size={sz} color={col} strokeWidth={2.2} />,
                    },
                    {
                      key: 'company',
                      label: 'Agjenci / Kompani',
                      icon: (col, sz) => <Building2 size={sz} color={col} strokeWidth={2.2} />,
                    },
                  ]}
                />
              </View>

              {/* ─── Form Inputs ─── */}
              <View style={styles.formContainer}>
                {/* If Company: Emri i Agjencisë */}
                {accountType === 'company' && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                      Emri i Kompanisë / Agjencisë
                    </Text>
                    <View
                      style={[
                        styles.inputBox,
                        {
                          backgroundColor: colors.surface,
                          borderColor:
                            errors.companyName
                              ? '#EF4444'
                              : focusedField === 'companyName'
                              ? brandHighlight
                              : colors.border,
                        },
                      ]}
                    >
                      <Building2
                        size={18}
                        color={focusedField === 'companyName' ? brandHighlight : colors.textLight}
                        strokeWidth={2}
                      />
                      <TextInput
                        style={[styles.textInput, { color: colors.textPrimary }]}
                        placeholder="psh. Prishtina Real Estate SH.P.K."
                        placeholderTextColor={colors.textLight}
                        value={companyName}
                        editable={!locked}
                        onChangeText={(val) => {
                          setCompanyName(val)
                          if (errors.companyName)
                            setErrors((prev) => ({ ...prev, companyName: undefined }))
                        }}
                        onFocus={() => setFocusedField('companyName')}
                        onBlur={() => setFocusedField(null)}
                        returnKeyType="next"
                      />
                    </View>
                    {errors.companyName && (
                      <Text style={styles.fieldErrorText}>{errors.companyName}</Text>
                    )}
                  </View>
                )}

                {/* Email Field */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Email</Text>
                  <View
                    style={[
                      styles.inputBox,
                      {
                        backgroundColor: colors.surface,
                        borderColor:
                          errors.email
                            ? '#EF4444'
                            : focusedField === 'email'
                            ? brandHighlight
                            : colors.border,
                      },
                    ]}
                  >
                    <Mail
                      size={18}
                      color={focusedField === 'email' ? brandHighlight : colors.textLight}
                      strokeWidth={2}
                    />
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="emri@shembull.com"
                      placeholderTextColor={colors.textLight}
                      value={email}
                      editable={!locked}
                      onChangeText={(val) => {
                        setEmail(val)
                        if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                      }}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                  </View>
                  {errors.email && <Text style={styles.fieldErrorText}>{errors.email}</Text>}
                </View>

                {/* Password Field */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    Fjalëkalimi
                  </Text>
                  <View
                    style={[
                      styles.inputBox,
                      {
                        backgroundColor: colors.surface,
                        borderColor:
                          errors.password
                            ? '#EF4444'
                            : focusedField === 'password'
                            ? brandHighlight
                            : colors.border,
                      },
                    ]}
                  >
                    <Lock
                      size={18}
                      color={focusedField === 'password' ? brandHighlight : colors.textLight}
                      strokeWidth={2}
                    />
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="Të paktën 6 karaktere"
                      placeholderTextColor={colors.textLight}
                      value={password}
                      editable={!locked}
                      onChangeText={(val) => {
                        setPassword(val)
                        if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                      }}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showPassword}
                      textContentType="newPassword"
                      autoCapitalize="none"
                      returnKeyType="go"
                      onSubmitEditing={handleRegisterSubmit}
                    />
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color={colors.textLight} strokeWidth={2} />
                      ) : (
                        <Eye size={18} color={colors.textLight} strokeWidth={2} />
                      )}
                    </Pressable>
                  </View>
                  {errors.password && <Text style={styles.fieldErrorText}>{errors.password}</Text>}
                </View>

                {/* Submit Button */}
                <TactilePressable
                  onPress={handleRegisterSubmit}
                  disabled={loading || Boolean(oauthLoading)}
                  style={[
                    styles.primarySubmitBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: loading ? 0.8 : 1,
                    },
                  ]}
                  haptic="medium"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={primaryBtnText} />
                  ) : (
                    <>
                      <UserPlus size={18} color={primaryBtnText} strokeWidth={2.4} />
                      <Text style={[styles.primarySubmitText, { color: primaryBtnText }]}>
                        Regjistrohu
                      </Text>
                    </>
                  )}
                </TactilePressable>
              </View>

              {/* ─── Modern Divider ─── */}
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textLight }]}>
                  ose vazhdoni me
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              {/* ─── Social Single-Tap OAuth Suite ─── */}
              <View style={styles.oauthContainer}>
                {/* Google OAuth */}
                <TactilePressable
                  onPress={() => handleOAuth('google')}
                  disabled={loading || Boolean(oauthLoading)}
                  style={[
                    styles.oauthBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  haptic="light"
                >
                  {oauthLoading === 'google' ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <GoogleLogo size={19} />
                      <Text style={[styles.oauthBtnText, { color: colors.textPrimary }]}>
                        Vazhdo me Google
                      </Text>
                    </>
                  )}
                </TactilePressable>

                {/* Apple OAuth */}
                {Platform.OS === 'ios' && (
                  <TactilePressable
                    onPress={() => handleOAuth('apple')}
                    disabled={loading || Boolean(oauthLoading)}
                    style={[
                      styles.oauthBtn,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                    haptic="light"
                  >
                    {oauthLoading === 'apple' ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <AppleLogo
                          size={18}
                          color={isDark ? '#FFFFFF' : '#000000'}
                        />
                        <Text style={[styles.oauthBtnText, { color: colors.textPrimary }]}>
                          Vazhdo me Apple
                        </Text>
                      </>
                    )}
                  </TactilePressable>
                )}

                {/* Facebook OAuth */}
                <TactilePressable
                  onPress={() => handleOAuth('facebook')}
                  disabled={loading || Boolean(oauthLoading)}
                  style={[
                    styles.oauthBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  haptic="light"
                >
                  {oauthLoading === 'facebook' ? (
                    <ActivityIndicator size="small" color="#1877F2" />
                  ) : (
                    <>
                      <FacebookLogo size={19} />
                      <Text style={[styles.oauthBtnText, { color: colors.textPrimary }]}>
                        Vazhdo me Facebook
                      </Text>
                    </>
                  )}
                </TactilePressable>
              </View>

              {/* ─── Switch to Login ─── */}
              <View style={styles.switchAuthRow}>
                <Text style={[styles.switchAuthPrompt, { color: colors.textMuted }]}>
                  Keni tashmë llogari?
                </Text>
                <TactilePressable onPress={handleGoToLogin} haptic="selection">
                  <Text style={[styles.switchAuthLink, { color: brandHighlight }]}>
                    Kyçuni këtu
                  </Text>
                </TactilePressable>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <AuthProgressOverlay visible={locked && !done} label={progressLabel} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  navLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  titleSection: {
    marginBottom: 20,
    gap: 6,
  },
  mainTitle: {
    fontSize: 27,
    fontFamily: Fonts.bold,
    letterSpacing: -0.6,
  },
  mainSubtitle: {
    fontSize: 14.5,
    fontFamily: Fonts.regular,
    lineHeight: 21,
  },
  personaContainer: {
    marginBottom: 20,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: '#EF4444',
    fontSize: 13,
    fontFamily: Fonts.medium,
    lineHeight: 18,
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    fontSize: 13.5,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.2,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  fieldErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 2,
    marginLeft: 2,
  },
  primarySubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 52,
    borderRadius: 15,
    marginTop: 6,
  },
  primarySubmitText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
  },
  dividerText: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    letterSpacing: -0.2,
  },
  oauthContainer: {
    gap: 10,
  },
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
  },
  oauthBtnText: {
    fontSize: 14.5,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.2,
  },
  switchAuthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 28,
  },
  switchAuthPrompt: {
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  switchAuthLink: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  /* OTP Step Styles */
  verifyStepContainer: {
    alignItems: 'center',
    width: '100%',
  },
  verifyIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 12,
    alignSelf: 'center',
  },
  otpInputBox: {
    width: '100%',
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  otpTextInput: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    letterSpacing: 8,
    textAlign: 'center',
    width: '100%',
  },
  resendRow: {
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendBtnText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  countdownText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  skipSection: {
    marginTop: 24,
    width: '100%',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  skipBtnTextGroup: {
    gap: 2,
  },
  skipBtnText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  skipBtnSubtext: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
})
