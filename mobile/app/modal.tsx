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
  ShieldCheck,
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

export default function AuthModalScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ initialTab?: string }>()
  const { colors, theme } = useTheme()
  const { showBanner } = useBanner()

  // Navigation steps: 'auth' (Login / Register) or 'verify_otp' (6-digit code entry)
  const [step, setStep] = useState<'auth' | 'verify_otp'>('auth')
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    params.initialTab === 'register' ? 'register' : 'login'
  )

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
  const [googleLoading, setGoogleLoading] = useState(false)
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
          router.replace('/completo-profilin' as any)
        } else {
          router.back()
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
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ndodhi një gabim i papritur gjatë komunikimit.')
      setLoading(false)
    }
  }

  // ── Google OAuth: native browser session, Apple-grade flow ───
  const googleHandledRef = useRef(false)

  // Completes Google login from a callback URL (implicit tokens or PKCE code)
  const finishGoogleAuth = useCallback(
    async (urlStr: string) => {
      if (googleHandledRef.current) return
      googleHandledRef.current = true

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
        googleHandledRef.current = false
        throw new Error(
          oauthError ||
            'Google nuk u kthye në aplikacion. Kontrolloni URL-në e ridrejtimit te Supabase → Authentication → URL Configuration.'
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
        throw new Error('Nuk u gjetën kredencialet e verifikimit të Google.')
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
        message: `Jeni kyçur me sukses me Google si ${displayName}.`,
      })

      setGoogleLoading(false)

      if (!meta.onboarding_completed) {
        router.replace('/completo-profilin' as any)
      } else {
        router.back()
      }
    },
    [router, showBanner]
  )

  const handleGoogleAuth = async () => {
    if (googleLoading) return
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setErrorMessage(null)
    setGoogleLoading(true)
    googleHandledRef.current = false

    // Safety net: on some iOS / Expo Go combinations the callback arrives as a
    // deep link (re-opening the app) instead of resolving the browser session.
    const linkSub = Linking.addEventListener('url', ({ url }) => {
      if (!url) return
      if (url.includes('access_token=') || url.includes('code=')) {
        finishGoogleAuth(url).catch((err: any) => {
          console.warn('Google deep-link notice:', err)
          setErrorMessage(err?.message || 'Ndodhi një problem gjatë hyrjes me Google.')
          setGoogleLoading(false)
        })
      }
    })

    try {
      // Resolves to exp://<host>:8081/--/auth/callback inside Expo Go and to
      // blejepronen://auth/callback in the standalone iOS/Android build — so the
      // browser session always returns to THIS app, never to a website.
      const redirectUrl = Linking.createURL('/auth/callback')

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
          redirectTo: redirectUrl,
        },
      })

      if (error || !data?.url) {
        setErrorMessage(
          error?.message || 'Hyrja me Google nuk është e disponueshme aktualisht.'
        )
        setGoogleLoading(false)
        return
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)

      if (result.type === 'success' && result.url) {
        await finishGoogleAuth(result.url)
      } else if (!googleHandledRef.current) {
        // User dismissed the browser sheet — silent cancel
        setGoogleLoading(false)
      }
    } catch (err: any) {
      console.warn('Google auth notice:', err)
      setErrorMessage(
        err?.message || 'Ndodhi një problem gjatë hyrjes me Google. Provoni përsëri.'
      )
      setGoogleLoading(false)
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
    router.replace('/(tabs)/profile' as any)
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

      router.replace('/completo-profilin' as any)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gabim gjatë verifikimit të kodit.')
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
    } catch (err: any) {
      setErrorMessage('Lidhja me serverin dështoi gjatë ridërgimit.')
      setResending(false)
    }
  }

  // Theme-specific contrast button text and accent colors
  const primaryBtnText =
    theme === 'green' ? '#003E37' : theme === 'black' ? '#071A14' : '#FFFFFF'
  const brandHighlight = theme === 'green' ? colors.gold : colors.primary

  const specularBorderColor =
    theme === 'white'
      ? 'rgba(0, 0, 0, 0.08)'
      : theme === 'green'
      ? 'rgba(255, 255, 255, 0.14)'
      : 'rgba(255, 255, 255, 0.12)'

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
          onPress={() => router.back()}
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
            {/* Centered Brand Emblem */}
            <View style={styles.brandHero}>
              <Logo size={42} />
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

            {/* Register Mode: Company vs Individual Account Selector */}
            {activeTab === 'register' && (
              <View style={styles.accountTypeWrapper}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Lloji i llogarisë
                </Text>
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
                    >
                      Individual
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
                    >
                      Agjenci / Kompani
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Input Form Fields */}
            <View style={styles.form}>
              {/* If Company: Emri i Kompanisë */}
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

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {accountType === 'company' && activeTab === 'register'
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
                    placeholder="shembull@email.com"
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
                        ? 'Kyçu'
                        : accountType === 'company'
                        ? 'Regjistro Kompaninë'
                        : 'Regjistrohu'}
                    </Text>
                    <ArrowRight size={18} color={primaryBtnText} strokeWidth={2.4} />
                  </View>
                )}
              </Pressable>

              {/* ─── Divider + Google OAuth Row ─── */}
              <View style={styles.googleSection}>
                <View style={[styles.orDividerRow, { marginBottom: 0 }]}>
                  <View style={[styles.orDividerLine, { backgroundColor: specularBorderColor }]} />
                  <Text style={[styles.orDividerText, { color: colors.textMuted }]}>ose</Text>
                  <View style={[styles.orDividerLine, { backgroundColor: specularBorderColor }]} />
                </View>

                <Pressable
                  style={[
                    styles.googleBtn,
                    { backgroundColor: colors.surface, borderColor: specularBorderColor },
                    (googleLoading || loading) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleGoogleAuth}
                  disabled={googleLoading || loading}
                >
                  {googleLoading ? (
                    <ActivityIndicator size="small" color={brandHighlight} />
                  ) : (
                    <>
                      <GoogleLogo size={19} />
                      <Text style={[styles.googleBtnText, { color: colors.textPrimary }]}>
                        Vazhdo me Google
                      </Text>
                    </>
                  )}
                </Pressable>

                <Text style={[styles.googleHintText, { color: colors.textMuted }]}>
                  I shpejtë dhe i sigurt — pa fjalëkalim
                </Text>
              </View>

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
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  brandHero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 6,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    gap: 8,
  },
  tabBtnActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 14,
  },
  accountTypeWrapper: {
    marginBottom: 16,
    gap: 6,
  },
  accountTypeSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  accountTypePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    lineHeight: 17,
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: Fonts.medium,
  },
  submitBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
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
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  switchPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 4,
  },
  switchPromptText: {
    fontSize: 13,
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
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  otpBox: {
    width: 46,
    height: 54,
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
  googleSection: {
    marginTop: 18,
    alignItems: 'stretch',
    gap: 12,
  },
  googleBtn: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  googleBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.2,
  },
  googleHintText: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
})
