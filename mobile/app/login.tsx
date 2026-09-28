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
  Alert,
} from 'react-native'
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  Heart,
  MessageSquare,
  PlusCircle,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { useBanner } from '@/context/BannerContext'
import { safeBack, openRegisterScreen, resolveAuthSuccess } from '@/lib/navigation'
import { syncAuthSession } from '@/lib/auth-cache'
import { TactilePressable, AuthProgressOverlay } from '@/components/motion'
import { GoogleLogo, AppleLogo, FacebookLogo } from '@/components/SocialLogos'

export default function LoginScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ redirectTo?: string; reason?: string; email?: string }>()
  const { colors, theme } = useTheme()
  const { showBanner } = useBanner()
  const navigation = useNavigation()

  // Form State
  const [email, setEmail] = useState(params.email || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null)

  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const allowDismissRef = useRef(false)

  // Input lock: active ONLY while an async request is actively pending AND not completed.
  const locked = !done && (loading || Boolean(oauthLoading))

  useEffect(() => {
    if (!locked || allowDismissRef.current || done || Platform.OS === 'web') return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (allowDismissRef.current || done) return false
      return true
    })
    return () => sub.remove()
  }, [locked, done])

  // A drag-to-dismiss or hardware back mid-submit must not tear the sheet
  // down while the session request is in flight. Once authenticated, allow dismissal immediately.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowDismissRef.current || done) return
      if (locked) e.preventDefault()
    })
    return unsubscribe
  }, [navigation, locked, done])

  const progressLabel = oauthLoading
    ? `Duke u kyçur me ${oauthLoading === 'google' ? 'Google' : oauthLoading === 'apple' ? 'Apple' : 'Facebook'}…`
    : 'Duke u kyçur…'

  const oauthHandledRef = useRef(false)
  const isDark = theme === 'black' || theme === 'green'
  const brandHighlight = theme === 'green' ? colors.gold : colors.primary
  const primaryBtnText =
    theme === 'green' ? '#071C18' : theme === 'black' ? '#071A14' : '#FFFFFF'

  // Subtle contextual banner info if triggered from a specific action
  const reasonBadge = React.useMemo(() => {
    switch (params.reason) {
      case 'favorite':
        return {
          icon: <Heart size={14} color="#EF4444" fill="#EF4444" strokeWidth={2} />,
          title: 'Ruani Pronat e Preferuara',
          subtitle: 'Kyçuni për të ruajtur dhe sinkronizuar pronat tuaja në çdo pajisje.',
        }
      case 'chat':
        return {
          icon: <MessageSquare size={14} color={brandHighlight} strokeWidth={2.4} />,
          title: 'Komunikoni me Shitësin',
          subtitle: 'Kyçuni për të biseduar drejtpërdrejt me pronarët dhe agjencitë.',
        }
      case 'post':
        return {
          icon: <PlusCircle size={14} color={brandHighlight} strokeWidth={2.4} />,
          title: 'Publikoni Pronën Tuaj',
          subtitle: 'Kyçuni për të listuar patundshmërinë tuaj para mijëra blerësve.',
        }
      default:
        return null
    }
  }, [params.reason, brandHighlight])

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

  // Finalize OAuth session
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
            `${providerTitle} nuk u kthye në aplikacion. Kontrolloni URL-në e ridrejtimit.`
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
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
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
          message: `Jeni kyçur me sukses si ${displayName}.`,
        })

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }
        allowDismissRef.current = true
        setLoading(false)
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
    [router, showBanner, params.redirectTo]
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
      // the provider returns straight into the app; the /auth/callback
      // route (warm intents + cold launches) and the auth-session result
      // below both complete the session natively.
      const redirectUrl = Linking.createURL('/auth/callback')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          skipBrowserRedirect: true,
          redirectTo: redirectUrl,
        },
      })

      if (error || !data?.url) {
        const msg = error?.message?.toLowerCase() || ''
        if (msg.includes('provider is not enabled')) {
          showBanner({
            type: 'info',
            title: `${providerTitle} po përgatitet`,
            message: `Hyrja përmes ${providerTitle} po aktivizohet. Mund të kyçeni menjëherë me Google ose me email!`,
          })
        } else {
          setErrors({
            general:
              error?.message ||
              `Hyrja me ${providerTitle} nuk është e disponueshme për momentin.`,
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
        oauthHandledRef.current = false
        setOauthLoading(null)
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : `Ndodhi një problem gjatë hyrjes me ${providerTitle}.`
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

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert(
        'Email i nevojshëm',
        'Ju lutemi shkruani adresën tuaj të email-it në fushën e llogarisë, pastaj klikoni përsëri "Harruat fjalëkalimin?".'
      )
      return
    }

    Alert.alert(
      'Rivendos fjalëkalimin',
      `A dëshironi të dërgoni linkun e rivendosjes së fjalëkalimit në adresën:\n${trimmedEmail}?`,
      [
        { text: 'Anulo', style: 'cancel' },
        {
          text: 'Dërgo Linkun',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
                redirectTo: 'https://blejepronen.com/auth/callback?next=/reset-password',
              })
              if (error) throw error
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
              }
              Alert.alert(
                'Email-i u dërgua me sukses',
                'Kemi dërguar linkun për rivendosjen e fjalëkalimit. Kontrolloni kutinë tuaj të postës elektronike.'
              )
            } catch (err: any) {
              Alert.alert('Gabim', err?.message || 'Dështoi dërgimi i email-it të rivendosjes.')
            }
          },
        },
      ]
    )
  }

  const handleLoginSubmit = async () => {
    if (loading || oauthLoading) return
    Keyboard.dismiss()
    setErrors({})
    const trimmedEmail = email.trim().toLowerCase()
    const newErrors: { email?: string; password?: string; general?: string } = {}

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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (error) {
        const msg = error.message?.toLowerCase() || ''
        if (msg.includes('invalid login credentials')) {
          setErrors({ general: 'Email-i ose fjalëkalimi nuk është i saktë.' })
        } else {
          setErrors({ general: error.message })
        }

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        }
        setLoading(false)
        return
      }

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

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      allowDismissRef.current = true
      setLoading(false)
      setOauthLoading(null)
      setDone(true)
      resolveAuthSuccess(router, params.redirectTo)
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

  const handleGoToRegister = () => {
    openRegisterScreen(router, {
      redirectTo: params.redirectTo,
      reason: params.reason,
      replace: true,
    })
  }

  const handleBack = () => {
    if (locked && !allowDismissRef.current) return
    allowDismissRef.current = true
    safeBack(router, '/(tabs)')
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          {/* Contextual Badge (if arrived via a guarded action) */}
          {reasonBadge && (
            <View
              style={[
                styles.reasonCard,
                {
                  backgroundColor:
                    theme === 'green'
                      ? 'rgba(200, 184, 130, 0.12)'
                      : theme === 'black'
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(0, 103, 91, 0.06)',
                  borderColor:
                    theme === 'green'
                      ? 'rgba(200, 184, 130, 0.25)'
                      : theme === 'black'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(0, 103, 91, 0.18)',
                },
              ]}
            >
              <View style={styles.reasonHeader}>
                {reasonBadge.icon}
                <Text style={[styles.reasonTitle, { color: colors.textPrimary }]}>
                  {reasonBadge.title}
                </Text>
              </View>
              <Text style={[styles.reasonSubtitle, { color: colors.textMuted }]}>
                {reasonBadge.subtitle}
              </Text>
            </View>
          )}

          {/* Screen Title & Welcome */}
          <View style={styles.titleSection}>
            <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>
              Mirësevini përsëri
            </Text>
            <Text style={[styles.mainSubtitle, { color: colors.textMuted }]}>
              Kyçuni në llogarinë tuaj për të menaxhuar pronat dhe komunikimet.
            </Text>
          </View>

          {/* General Error Banner */}
          {errors.general && (
            <View
              style={[
                styles.errorCard,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : 'rgba(239, 68, 68, 0.08)',
                  borderColor: 'rgba(239, 68, 68, 0.28)',
                },
              ]}
            >
              <AlertCircle size={16} color="#EF4444" strokeWidth={2.2} />
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}

          {/* ─── Credentials Form ─── */}
          <View style={styles.formContainer}>
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
              <View style={styles.passwordLabelRow}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Fjalëkalimi</Text>
                <Pressable
                  onPress={handleForgotPassword}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  disabled={loading}
                >
                  <Text style={[styles.forgotPasswordText, { color: brandHighlight }]}>
                    Harruat fjalëkalimin?
                  </Text>
                </Pressable>
              </View>
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
                  placeholder="Fjalëkalimi juaj"
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
                  textContentType="password"
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={handleLoginSubmit}
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
              onPress={handleLoginSubmit}
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
                  <LogIn size={18} color={primaryBtnText} strokeWidth={2.4} />
                  <Text style={[styles.primarySubmitText, { color: primaryBtnText }]}>Kyçu</Text>
                </>
              )}
            </TactilePressable>
          </View>

          {/* ─── Modern Divider ─── */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textLight }]}>ose vazhdoni me</Text>
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

          {/* ─── Switch to Register ─── */}
          <View style={styles.switchAuthRow}>
            <Text style={[styles.switchAuthPrompt, { color: colors.textMuted }]}>
              Nuk keni llogari?
            </Text>
            <TactilePressable onPress={handleGoToRegister} haptic="selection">
              <Text style={[styles.switchAuthLink, { color: brandHighlight }]}>
                Regjistrohuni falas
              </Text>
            </TactilePressable>
          </View>
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
  reasonCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 4,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reasonTitle: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.2,
  },
  reasonSubtitle: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    lineHeight: 17,
  },
  titleSection: {
    marginBottom: 24,
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
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
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
})
