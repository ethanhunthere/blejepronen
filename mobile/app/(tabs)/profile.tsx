import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Image } from 'expo-image'
import {
  User,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Heart,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Palette,
  LogIn,
  UserPlus,
  Check,
  Sun,
  Leaf,
  Moon,
  Trash2,
  Sparkles,
  PlusCircle,
  MessageSquare,
  Bookmark,
  Edit3,
  X,
  RotateCcw,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts, ThemeMode } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useBanner } from '@/context/BannerContext'
import { apiDeleteAccount, apiVerifyOtp, apiResendCode } from '@/lib/api'
import { BLEJE_AVATARS, DEFAULT_AVATAR, getAvatarUri } from '@/lib/avatars'
import { playThemeSound, playSuccessSound, playTapSound } from '@/lib/sound'

export default function ProfileScreen() {
  const router = useRouter()
  const { colors, theme, setTheme } = useTheme()
  const { showBanner } = useBanner()

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [dbProfile, setDbProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  // Avatar Quick Picker Modal
  const [avatarModalVisible, setAvatarModalVisible] = useState(false)
  const [updatingAvatar, setUpdatingAvatar] = useState(false)

  // Account Verification Modal & OTP
  const [verifyModalVisible, setVerifyModalVisible] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [resendingCode, setResendingCode] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const resendTimerRef = useRef<any>(null)

  const fetchUserProfile = async (user: any) => {
    if (!user) {
      setDbProfile(null)
      return
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      if (data) {
        setDbProfile(data)
      }
    } catch (e) {
      console.warn('Fetch user profile record notice:', e)
    }
  }

  const checkSession = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user || null)
      if (user) {
        await fetchUserProfile(user)
      } else {
        setDbProfile(null)
      }
    } catch (err) {
      console.warn('Session check notice:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh profile and avatar every time screen gains focus
  useFocusEffect(
    useCallback(() => {
      checkSession()
    }, [checkSession])
  )

  useEffect(() => {
    checkSession()

    // Real-time auth listener for instant synchronization
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user || null
      setCurrentUser(u)
      if (u) {
        await fetchUserProfile(u)
      } else {
        setDbProfile(null)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
      if (resendTimerRef.current) clearInterval(resendTimerRef.current)
    }
  }, [checkSession])

  // Instant 1-tap quick avatar changer
  const handleSelectAvatarQuick = async (newAvatarUrl: string) => {
    if (!currentUser) return
    playSuccessSound()
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
    setUpdatingAvatar(true)

    // Immediate optimistic UI update
    setDbProfile((prev: any) => ({ ...prev, avatar_url: newAvatarUrl }))
    setCurrentUser((prev: any) => ({
      ...prev,
      user_metadata: { ...prev?.user_metadata, avatar_url: newAvatarUrl },
    }))
    setAvatarModalVisible(false)

    try {
      await Promise.all([
        supabase.auth.updateUser({
          data: { avatar_url: newAvatarUrl },
        }),
        supabase.from('profiles').upsert({
          id: currentUser.id,
          avatar_url: newAvatarUrl,
        }),
      ])

      showBanner({
        type: 'success',
        title: 'Avatari u Përditësua!',
        message: 'Avatari juaj i ri është aktiv menjëherë në të gjithë aplikacionin.',
      })
    } catch (err) {
      console.warn('Quick avatar update notice:', err)
    } finally {
      setUpdatingAvatar(false)
    }
  }

  // Handle OTP Verification inside modal
  const handleConfirmOtp = async () => {
    const code = otpCode.trim()
    if (code.length !== 6) {
      Alert.alert('Kujdes', 'Ju lutemi shkruani të 6 shifrat e kodit të verifikimit.')
      return
    }
    setVerifyingOtp(true)
    if (Platform.OS !== 'web') Haptics.selectionAsync()

    try {
      const email = currentUser?.email || ''
      const res = await apiVerifyOtp({ email, code })
      if (!res.success) {
        Alert.alert(
          'Kodi nuk është i saktë',
          res.error || 'Ju lutemi kontrolloni kodin e dërguar në email dhe provoni përsëri.'
        )
        setVerifyingOtp(false)
        return
      }

      // Mark verified in DB and local state
      await supabase.from('profiles').update({ email_verified: true }).eq('id', currentUser.id)
      await supabase.auth.updateUser({ data: { email_verified: true } })

      setDbProfile((prev: any) => ({ ...prev, email_verified: true }))
      setCurrentUser((prev: any) => ({
        ...prev,
        user_metadata: { ...prev?.user_metadata, email_verified: true },
      }))

      playSuccessSound()
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      setVerifyModalVisible(false)
      setOtpCode('')

      showBanner({
        type: 'success',
        title: 'Llogaria u Verifikua!',
        message: 'Llogaria juaj mori statusin "E Verifikuar" me të gjitha privilegjet zyrtare.',
      })
    } catch (err: any) {
      Alert.alert('Gabim', err?.message || 'Ndodhi një gabim gjatë verifikimit.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  // Handle OTP Code Resend
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resendingCode) return
    setResendingCode(true)
    if (Platform.OS !== 'web') Haptics.selectionAsync()

    try {
      const email = currentUser?.email || ''
      const res = await apiResendCode(email)
      if (!res.success) {
        Alert.alert('Gabim', res.error || 'Dështoi ridërgimi i kodit.')
        setResendingCode(false)
        return
      }

      setResendCooldown(60)
      if (resendTimerRef.current) clearInterval(resendTimerRef.current)
      resendTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (resendTimerRef.current) clearInterval(resendTimerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      showBanner({
        type: 'info',
        title: 'Kodi u Dërgua!',
        message: `Kodi i ri 6-shifror u dërgua në adresën ${email}.`,
      })
    } catch (err: any) {
      Alert.alert('Gabim', err?.message || 'Ndodhi një gabim gjatë dërgimit.')
    } finally {
      setResendingCode(false)
    }
  }

  const handleLogout = async () => {
    Alert.alert('Çkyçja nga llogaria', 'A jeni të sigurt që dëshironi të çkyçeni?', [
      { text: 'Anulo', style: 'cancel' },
      {
        text: 'Çkyçu',
        style: 'destructive',
        onPress: async () => {
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          }
          await supabase.auth.signOut()
          setCurrentUser(null)
          setDbProfile(null)
          showBanner({
            type: 'logout',
            title: 'Mirupafshim!',
            message: 'U çkyçët me sukses nga llogaria.',
          })
        },
      },
    ])
  }

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Fshi Llogarinë Përfundimisht',
      'Kujdes: Ky veprim është i përhershëm dhe i pakthyeshëm. Të gjitha shpalljet, mesazhet dhe të dhënat tuaja do të fshihen plotësisht nga Bleje Pronën.\n\nA dëshironi të vazhdoni?',
      [
        { text: 'Anulo', style: 'cancel' },
        {
          text: 'Fshi Përfundimisht',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            }
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession()

              if (session?.access_token) {
                const res = await apiDeleteAccount(session.access_token)
                if (!res.success) {
                  Alert.alert(
                    'Gabim',
                    res.error || 'Dështoi fshirja e llogarisë. Ju lutemi provoni përsëri.'
                  )
                  setDeleting(false)
                  return
                }
              }

              await supabase.auth.signOut()
              setCurrentUser(null)
              setDbProfile(null)
              showBanner({
                type: 'delete',
                title: 'Llogaria u Fshi',
                message: 'Të gjitha të dhënat dhe shpalljet tuaja u fshinë përfundimisht.',
              })
            } catch (err: any) {
              Alert.alert('Gabim', err?.message || 'Ndodhi një problem gjatë fshirjes së llogarisë.')
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  const openAuthModal = (initialTab: 'login' | 'register') => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    router.push({ pathname: '/modal', params: { initialTab } })
  }

  const handleThemeSelect = (selectedTheme: ThemeMode) => {
    if (theme === selectedTheme) return
    playThemeSound()
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setTheme(selectedTheme)
  }

  const isCompany =
    currentUser?.user_metadata?.account_type === 'company' ||
    currentUser?.user_metadata?.is_company === true ||
    Boolean(currentUser?.user_metadata?.company_name)

  const companyName =
    currentUser?.user_metadata?.company_name ||
    (isCompany ? dbProfile?.first_name : '')

  const isGoogle = currentUser?.app_metadata?.provider === 'google'
  const isVerified = Boolean(
    dbProfile?.email_verified === true ||
    currentUser?.email_confirmed_at ||
    currentUser?.confirmed_at ||
    currentUser?.user_metadata?.email_verified === true ||
    isGoogle
  )

  const primaryBtnText =
    theme === 'green' ? '#003E37' : theme === 'black' ? '#071A14' : '#FFFFFF'

  const specularBorder =
    theme === 'white'
      ? 'rgba(0, 0, 0, 0.08)'
      : theme === 'green'
      ? 'rgba(255, 255, 255, 0.14)'
      : 'rgba(255, 255, 255, 0.10)'

  // Determine avatar URI accurately
  const rawAvatar =
    dbProfile?.avatar_url ||
    currentUser?.user_metadata?.avatar_url ||
    currentUser?.user_metadata?.avatarUrl ||
    null
  const avatarUri = getAvatarUri(rawAvatar)

  // Has completed onboarding check
  const isOnboardingDone =
    currentUser?.user_metadata?.onboarding_completed === true ||
    (dbProfile?.first_name && dbProfile?.email_verified)

  const displayName = isCompany
    ? (companyName || currentUser?.user_metadata?.first_name || 'Agjenci Imobiliare')
    : (dbProfile?.first_name
        ? `${dbProfile.first_name} ${dbProfile.last_name || ''}`.trim()
        : currentUser?.user_metadata?.first_name
        ? `${currentUser.user_metadata.first_name} ${currentUser.user_metadata.last_name || ''}`.trim()
        : 'Përdorues i regjistruar')

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {currentUser ? 'Profili Im' : 'Llogaria & Cilësimet'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {currentUser
              ? isCompany
                ? 'Agjenci / Kompani Imobiliare'
                : 'Përdorues i regjistruar'
              : 'Mirësevini në Bleje Pronën'}
          </Text>
        </View>

        {currentUser && (
          <Pressable
            style={[
              styles.headerSettingsBtn,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              router.push('/settings' as any)
            }}
            hitSlop={8}
          >
            <Settings size={19} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Profile Card: Logged In vs Guest */}
        {currentUser ? (
          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
            {/* Real Avatar Image with Instant 1-Tap Quick Picker */}
            <Pressable
              style={[
                styles.avatarWrap,
                {
                  borderColor: isCompany
                    ? theme === 'green' ? colors.gold : colors.primary
                    : isVerified
                    ? '#10B981'
                    : '#F59E0B',
                  backgroundColor: colors.surfaceSubtle,
                },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync()
                setAvatarModalVisible(true)
              }}
            >
              <Image
                key={`avatar-${avatarUri}-${rawAvatar || ''}`}
                source={{ uri: avatarUri }}
                style={styles.avatarImg}
                contentFit="cover"
                transition={150}
              />
              <View
                style={[
                  styles.avatarEditPill,
                  {
                    backgroundColor:
                      theme === 'green' ? colors.gold : colors.primary,
                  },
                ]}
              >
                <Edit3
                  size={10}
                  color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                  strokeWidth={2.6}
                />
              </View>
            </Pressable>

            {/* Profile Meta Information */}
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {displayName}
                </Text>

                {/* Professional Status Badges: Verified vs Unverified */}
                <View
                  style={[
                    styles.verifiedBadge,
                    isVerified
                      ? isCompany
                        ? {
                            backgroundColor:
                              theme === 'white'
                                ? '#FEF3C7'
                                : 'rgba(245, 158, 11, 0.20)',
                            borderColor:
                              theme === 'white' ? '#FDE68A' : 'rgba(245, 158, 11, 0.35)',
                          }
                        : {
                            backgroundColor:
                              theme === 'white' ? '#DCFCE7' : 'rgba(16, 185, 129, 0.18)',
                            borderColor:
                              theme === 'white' ? '#BBF7D0' : 'rgba(16, 185, 129, 0.35)',
                          }
                      : {
                          backgroundColor:
                            theme === 'white' ? '#FEF3C7' : 'rgba(245, 158, 11, 0.18)',
                          borderColor:
                            theme === 'white' ? '#FDE68A' : 'rgba(245, 158, 11, 0.35)',
                        },
                  ]}
                >
                  {isCompany ? (
                    isVerified ? (
                      <>
                        <Building2
                          size={11}
                          color={theme === 'white' ? '#B45309' : '#FBBF24'}
                          strokeWidth={2.4}
                        />
                        <Text
                          style={[
                            styles.verifiedBadgeText,
                            { color: theme === 'white' ? '#B45309' : '#FBBF24' },
                          ]}
                        >
                          Agjenci e Verifikuar
                        </Text>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={11} color="#F59E0B" strokeWidth={2.4} />
                        <Text
                          style={[
                            styles.verifiedBadgeText,
                            { color: theme === 'white' ? '#B45309' : '#F59E0B' },
                          ]}
                        >
                          Agjenci e Paverifikuar
                        </Text>
                      </>
                    )
                  ) : isVerified ? (
                    <>
                      <ShieldCheck size={11} color="#10B981" strokeWidth={2.4} />
                      <Text
                        style={[
                          styles.verifiedBadgeText,
                          { color: theme === 'white' ? '#047857' : '#10B981' },
                        ]}
                      >
                        Profil i Verifikuar
                      </Text>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={11} color="#F59E0B" strokeWidth={2.4} />
                      <Text
                        style={[
                          styles.verifiedBadgeText,
                          { color: theme === 'white' ? '#B45309' : '#F59E0B' },
                        ]}
                      >
                        E Paverifikuar
                      </Text>
                    </>
                  )}
                </View>
              </View>

              {isCompany && currentUser.user_metadata?.first_name ? (
                <Text style={[styles.contactPersonText, { color: colors.textSecondary }]}>
                  Përfaqësuesi: {currentUser.user_metadata.first_name} {currentUser.user_metadata.last_name || ''}
                </Text>
              ) : null}

              <Text style={[styles.userEmail, { color: colors.textMuted }]}>{currentUser.email}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.guestCard, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
            <View style={[styles.guestIconWrap, { backgroundColor: colors.primaryLight }]}>
              <User size={32} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={[styles.guestTitle, { color: colors.textPrimary }]}>
              Llogaria Juaj
            </Text>
            <Text style={[styles.guestSubtitle, { color: colors.textMuted }]}>
              Kyçuni për të menaxhuar shpalljet, mesazhet dhe preferencat tuaja.
            </Text>

            <View style={styles.authButtonsRow}>
              <Pressable
                style={[styles.loginBtn, { backgroundColor: colors.primary }]}
                onPress={() => openAuthModal('login')}
              >
                <LogIn size={16} color={primaryBtnText} strokeWidth={2.2} />
                <Text style={[styles.loginBtnText, { color: primaryBtnText }]}>Kyçu</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.registerBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => openAuthModal('register')}
              >
                <UserPlus size={16} color={colors.textPrimary} strokeWidth={2.2} />
                <Text style={[styles.registerBtnText, { color: colors.textPrimary }]}>
                  Regjistrohu
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Unverified Account Apple Live Activity Frosted Glass Banner */}
        {currentUser && !isVerified && (
          <View
            style={[
              styles.unverifiedCard,
              {
                backgroundColor:
                  theme === 'white'
                    ? '#FFFBEB'
                    : theme === 'green'
                    ? 'rgba(245, 158, 11, 0.10)'
                    : 'rgba(245, 158, 11, 0.08)',
                borderColor:
                  theme === 'white'
                    ? '#FDE68A'
                    : 'rgba(245, 158, 11, 0.32)',
              },
            ]}
          >
            <View style={styles.unverifiedCardTop}>
              <View
                style={[
                  styles.unverifiedMiniPill,
                  {
                    backgroundColor:
                      theme === 'white' ? '#FEF3C7' : 'rgba(245, 158, 11, 0.18)',
                  },
                ]}
              >
                <View style={styles.amberPulsingDot} />
                <ShieldAlert size={12} color="#F59E0B" strokeWidth={2.5} />
                <Text style={styles.unverifiedMiniPillText}>Llogari e Paverifikuar</Text>
              </View>

              <View style={styles.actionRequiredPill}>
                <Text style={styles.actionRequiredPillText}>Veprim i Kërkuar</Text>
              </View>
            </View>

            <Text style={[styles.unverifiedHeadline, { color: colors.textPrimary }]}>
              Verifikoni Llogarinë Tuaj
            </Text>
            <Text style={[styles.unverifiedSub, { color: colors.textSecondary }]}>
              Përfitoni distinktivin zyrtar të besueshmërisë, prioritet në kërkime dhe deri në 3x më shumë interesim nga blerësit seriozë.
            </Text>

            <View style={styles.chipsRow}>
              <View
                style={[
                  styles.valueChip,
                  {
                    backgroundColor:
                      theme === 'white' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                    borderColor:
                      theme === 'white' ? '#FEEBC8' : 'rgba(245, 158, 11, 0.20)',
                  },
                ]}
              >
                <ShieldCheck size={13} color="#10B981" strokeWidth={2.4} />
                <Text style={[styles.valueChipText, { color: colors.textPrimary }]}>
                  Distinktiv Zyrtar
                </Text>
              </View>

              <View
                style={[
                  styles.valueChip,
                  {
                    backgroundColor:
                      theme === 'white' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                    borderColor:
                      theme === 'white' ? '#FEEBC8' : 'rgba(245, 158, 11, 0.20)',
                  },
                ]}
              >
                <Sparkles size={13} color="#F59E0B" strokeWidth={2.4} />
                <Text style={[styles.valueChipText, { color: colors.textPrimary }]}>
                  Prioritet në Kërkim
                </Text>
              </View>

              <View
                style={[
                  styles.valueChip,
                  {
                    backgroundColor:
                      theme === 'white' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                    borderColor:
                      theme === 'white' ? '#FEEBC8' : 'rgba(245, 158, 11, 0.20)',
                  },
                ]}
              >
                <CheckCircle2 size={13} color="#3B82F6" strokeWidth={2.4} />
                <Text style={[styles.valueChipText, { color: colors.textPrimary }]}>
                  Besueshmëri 3x
                </Text>
              </View>
            </View>

            <Pressable
              style={[
                styles.unverifiedCtaBtn,
                {
                  backgroundColor:
                    theme === 'green' ? colors.gold : colors.primary,
                },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync()
                setVerifyModalVisible(true)
              }}
            >
              <ShieldCheck
                size={16}
                color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.unverifiedCtaBtnText,
                  { color: theme === 'green' ? '#003E37' : '#FFFFFF' },
                ]}
              >
                Verifiko Llogarinë Tani
              </Text>
              <ArrowRight
                size={15}
                color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                strokeWidth={2.4}
              />
            </Pressable>
          </View>
        )}

        {/* Verified Account VIP Trust Card */}
        {currentUser && isVerified && (
          <View
            style={[
              styles.verifiedCard,
              {
                backgroundColor:
                  theme === 'white'
                    ? '#F0FDF4'
                    : theme === 'green'
                    ? 'rgba(16, 185, 129, 0.10)'
                    : 'rgba(16, 185, 129, 0.07)',
                borderColor:
                  theme === 'white'
                    ? '#BBF7D0'
                    : 'rgba(16, 185, 129, 0.28)',
              },
            ]}
          >
            <View
              style={[
                styles.verifiedIconWrap,
                {
                  backgroundColor:
                    theme === 'white' ? '#DCFCE7' : 'rgba(16, 185, 129, 0.20)',
                },
              ]}
            >
              <ShieldCheck size={20} color="#10B981" strokeWidth={2.4} />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.verifiedCardTitle, { color: colors.textPrimary }]}>
                  Llogari e Verifikuar Zyrtarisht
                </Text>
                <CheckCircle2 size={14} color="#10B981" strokeWidth={2.5} />
              </View>
              <Text style={[styles.verifiedCardSubtitle, { color: colors.textSecondary }]}>
                Gëzoni distinktivin zyrtar, mbrojtje kundër llogarive false dhe prioritet në shpallje.
              </Text>
            </View>
          </View>
        )}

        {/* Incomplete Profile Callout Banner (if verified but missing details) */}
        {currentUser && isVerified && !isOnboardingDone && (
          <Pressable
            style={[
              styles.onboardingBanner,
              {
                backgroundColor: colors.surface,
                borderColor: theme === 'green' ? colors.gold : colors.primary,
              },
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              router.push('/completo-profilin' as any)
            }}
          >
            <View
              style={[
                styles.onboardingIconBox,
                {
                  backgroundColor:
                    theme === 'green' ? 'rgba(200, 184, 130, 0.2)' : colors.primaryLight,
                },
              ]}
            >
              <Sparkles
                size={20}
                color={theme === 'green' ? colors.gold : colors.primary}
                strokeWidth={2.4}
              />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.onboardingTitle, { color: colors.textPrimary }]}>
                  Plotësoni Profilin Tuaj
                </Text>
                <View style={[styles.urgentDot, { backgroundColor: '#EF4444' }]} />
              </View>
              <Text style={[styles.onboardingSubtitle, { color: colors.textMuted }]}>
                Zgjidhni telefonin, qytetin dhe biografinë tuaj për profil të plotë.
              </Text>
            </View>

            <View
              style={[
                styles.onboardingActionPill,
                { backgroundColor: theme === 'green' ? colors.gold : colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.onboardingActionPillText,
                  { color: theme === 'green' ? '#003E37' : '#FFFFFF' },
                ]}
              >
                Plotëso
              </Text>
              <ChevronRight
                size={14}
                color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                strokeWidth={2.6}
              />
            </View>
          </Pressable>
        )}

        {/* Quick Shortcut Tiles */}
        <View style={styles.quickTilesGrid}>
          <Pressable
            style={[
              styles.quickTile,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              router.push('/post' as any)
            }}
          >
            <View style={[styles.quickTileIcon, { backgroundColor: colors.primaryLight }]}>
              <PlusCircle size={20} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={[styles.quickTileLabel, { color: colors.textPrimary }]}>
              Posto Pronë
            </Text>
            <Text style={[styles.quickTileSub, { color: colors.textMuted }]}>Falas</Text>
          </Pressable>

          <Pressable
            style={[
              styles.quickTile,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              if (!currentUser) openAuthModal('login')
              else router.push('/shpalljet-e-mia' as any)
            }}
          >
            <View style={[styles.quickTileIcon, { backgroundColor: colors.surfaceSubtle }]}>
              <Building2 size={20} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={[styles.quickTileLabel, { color: colors.textPrimary }]}>
              Shpalljet e Mia
            </Text>
            <Text style={[styles.quickTileSub, { color: colors.textMuted }]}>Menaxho</Text>
          </Pressable>

          <Pressable
            style={[
              styles.quickTile,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              if (!currentUser) openAuthModal('login')
              else router.push('/messages' as any)
            }}
          >
            <View style={[styles.quickTileIcon, { backgroundColor: colors.surfaceSubtle }]}>
              <MessageSquare size={20} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={[styles.quickTileLabel, { color: colors.textPrimary }]}>
              Mesazhet
            </Text>
            <Text style={[styles.quickTileSub, { color: colors.textMuted }]}>Bisedat</Text>
          </Pressable>

          <Pressable
            style={[
              styles.quickTile,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              router.push('/listings' as any)
            }}
          >
            <View style={[styles.quickTileIcon, { backgroundColor: colors.surfaceSubtle }]}>
              <Heart size={20} color="#EF4444" strokeWidth={2.2} />
            </View>
            <Text style={[styles.quickTileLabel, { color: colors.textPrimary }]}>
              Të Ruajturat
            </Text>
            <Text style={[styles.quickTileSub, { color: colors.textMuted }]}>Favoritet</Text>
          </Pressable>
        </View>

        {/* Section 1: Llogaria & Cilësimet (Settings Group) */}
        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
          <Text style={[styles.subGroupHeading, { color: colors.textLight }]}>
            Llogaria & Preferencat
          </Text>

          {/* Cilësimet e Llogarisë */}
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              if (!currentUser) {
                openAuthModal('login')
              } else {
                if (Platform.OS !== 'web') Haptics.selectionAsync()
                router.push('/settings' as any)
              }
            }}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.primaryLight }]}>
              <Settings size={18} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  Cilësimet e Llogarisë
                </Text>
                {isCompany && (
                  <View
                    style={[
                      styles.miniCompanyBadge,
                      {
                        backgroundColor:
                          theme === 'white' ? '#FEF3C7' : 'rgba(245, 158, 11, 0.2)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.miniCompanyBadgeText,
                        { color: theme === 'white' ? '#B45309' : '#FBBF24' },
                      ]}
                    >
                      Agjenci
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                Njoftimet push, privatësia, siguria biometrike & kalimi në kompani
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textLight} />
          </Pressable>

          {/* Plotëso / Ndrysho Profilin */}
          {currentUser && (
            <Pressable
              style={[styles.menuItem, styles.menuItemBorderTop, { borderTopColor: specularBorder }]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync()
                router.push('/completo-profilin' as any)
              }}
            >
              <View
                style={[
                  styles.menuIconContainer,
                  {
                    backgroundColor:
                      theme === 'green' ? 'rgba(200, 184, 130, 0.2)' : colors.primaryLight,
                  },
                ]}
              >
                <Sparkles
                  size={18}
                  color={theme === 'green' ? colors.gold : colors.primary}
                  strokeWidth={2.2}
                />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  Plotëso & Ndrysho Profilin
                </Text>
                <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                  Zgjidh avataron, të dhënat e kontaktit dhe informacionin e biznesit
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textLight} />
            </Pressable>
          )}
        </View>

        {/* Section 2: Aktiviteti Imobiliar */}
        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
          <Text style={[styles.subGroupHeading, { color: colors.textLight }]}>Aktiviteti</Text>

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              if (!currentUser) {
                openAuthModal('login')
              } else {
                if (Platform.OS !== 'web') Haptics.selectionAsync()
                router.push('/shpalljet-e-mia' as any)
              }
            }}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.surfaceSubtle }]}>
              <Building2 size={18} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Shpalljet e mia</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                {currentUser ? 'Shiko dhe menaxho pronat që ke postuar' : 'Kyçu për të parë shpalljet e tua'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textLight} />
          </Pressable>

          <Pressable
            style={[styles.menuItem, styles.menuItemBorderTop, { borderTopColor: specularBorder }]}
            onPress={() => router.push('/listings' as any)}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.surfaceSubtle }]}>
              <Heart size={18} color="#EF4444" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Pronat e ruajtura</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                Pronat që keni shënuar si të preferuara
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textLight} />
          </Pressable>
        </View>

        {/* Section 3: Ndihmë & Ligjore */}
        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
          <Text style={[styles.subGroupHeading, { color: colors.textLight }]}>Ndihmë & Ligjore</Text>

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              Alert.alert(
                'Mbështetja Teknike',
                'Për çdo pyetje apo ndihmë kontaktoni ekipin: support@blejepronen.com ose në WhatsApp.'
              )
            }}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.surfaceSubtle }]}>
              <HelpCircle size={18} color={colors.textSecondary} strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Ndihmë & Mbështetje</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                Pyetje të shpeshta dhe kontakt me ekipin
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textLight} />
          </Pressable>

          <Pressable
            style={[styles.menuItem, styles.menuItemBorderTop, { borderTopColor: specularBorder }]}
            onPress={() => {
              Alert.alert(
                'Kushtet e Përdorimit',
                'Bleje Pronën është platformë imobiliare e licencuar në Republikën e Kosovës. Të gjitha të drejtat të rezervuara.'
              )
            }}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.surfaceSubtle }]}>
              <ShieldCheck size={18} color={colors.textSecondary} strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Kushtet & Privatësia</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                Rregullat dhe politikat e sigurisë
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textLight} />
          </Pressable>
        </View>

        {/* Section 4: Tema e Aplikacionit (PLACED DOWN HERE AS REQUESTED BY USER) */}
        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
          <View style={styles.groupHeaderRow}>
            <View style={styles.groupHeaderLeft}>
              <Palette size={18} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.groupHeading, { color: colors.textPrimary }]}>
                Tema e Aplikacionit
              </Text>
            </View>
            <Text style={[styles.currentThemeLabel, { color: colors.primary }]}>
              {theme === 'green' ? 'E Gjelbër' : theme === 'black' ? 'E Zezë' : 'E Bardhë'}
            </Text>
          </View>

          <View style={styles.themeCardsGrid}>
            {/* White Theme */}
            <Pressable
              style={[
                styles.themeCard,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: theme === 'white' ? colors.primary : colors.border,
                },
                theme === 'white' && styles.themeCardActive,
              ]}
              onPress={() => handleThemeSelect('white')}
            >
              <View style={styles.themeCardTop}>
                <View style={[styles.themeIconCircle, { backgroundColor: '#FFFFFF' }]}>
                  <Sun size={18} color="#006459" strokeWidth={2.2} />
                </View>
                {theme === 'white' && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </View>
              <Text style={[styles.themeCardName, { color: colors.textPrimary }]}>E Bardhë</Text>
              <Text style={[styles.themeCardDesc, { color: colors.textMuted }]}>
                Klasike & e pastër
              </Text>
            </Pressable>

            {/* Green Theme (Brand Emerald) */}
            <Pressable
              style={[
                styles.themeCard,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: theme === 'green' ? colors.gold : colors.border,
                },
                theme === 'green' && styles.themeCardActive,
              ]}
              onPress={() => handleThemeSelect('green')}
            >
              <View style={styles.themeCardTop}>
                <View style={[styles.themeIconCircle, { backgroundColor: '#006459' }]}>
                  <Leaf size={18} color="#C8B882" strokeWidth={2.2} />
                </View>
                {theme === 'green' && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.gold }]}>
                    <Check size={11} color="#003E37" strokeWidth={3} />
                  </View>
                )}
              </View>
              <Text style={[styles.themeCardName, { color: colors.textPrimary }]}>E Gjelbër</Text>
              <Text style={[styles.themeCardDesc, { color: colors.textMuted }]}>
                Ngjyra zyrtare
              </Text>
            </Pressable>

            {/* Black Theme (OLED Dark) */}
            <Pressable
              style={[
                styles.themeCard,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: theme === 'black' ? '#34D399' : colors.border,
                },
                theme === 'black' && styles.themeCardActive,
              ]}
              onPress={() => handleThemeSelect('black')}
            >
              <View style={styles.themeCardTop}>
                <View style={[styles.themeIconCircle, { backgroundColor: '#0B0F0E' }]}>
                  <Moon size={18} color="#34D399" strokeWidth={2.2} />
                </View>
                {theme === 'black' && (
                  <View style={[styles.checkCircle, { backgroundColor: '#34D399' }]}>
                    <Check size={11} color="#0B0F0E" strokeWidth={3} />
                  </View>
                )}
              </View>
              <Text style={[styles.themeCardName, { color: colors.textPrimary }]}>E Zezë</Text>
              <Text style={[styles.themeCardDesc, { color: colors.textMuted }]}>
                OLED Dark Mode
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Section 5: Logout & Delete Account (Apple App Store Guideline Compliant) */}
        {currentUser && (
          <View style={styles.accountActionButtons}>
            <Pressable
              style={[
                styles.logoutButton,
                {
                  backgroundColor:
                    theme === 'white'
                      ? '#FEE2E2'
                      : theme === 'green'
                      ? 'rgba(239, 68, 68, 0.16)'
                      : '#2A1414',
                  borderColor:
                    theme === 'white'
                      ? '#FECACA'
                      : 'rgba(239, 68, 68, 0.35)',
                  borderWidth: 1,
                },
              ]}
              onPress={handleLogout}
              hitSlop={8}
            >
              <LogOut
                size={18}
                color={theme === 'green' ? '#FCA5A5' : '#EF4444'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.logoutButtonText,
                  { color: theme === 'green' ? '#FCA5A5' : '#EF4444' },
                ]}
              >
                Çkyçu nga llogaria
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.deleteAccountButton,
                {
                  borderColor:
                    theme === 'white'
                      ? 'rgba(239, 68, 68, 0.28)'
                      : 'rgba(239, 68, 68, 0.22)',
                },
              ]}
              onPress={handleDeleteAccount}
              disabled={deleting}
              hitSlop={8}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Trash2 size={16} color="#EF4444" strokeWidth={2} />
                  <Text style={styles.deleteAccountButtonText}>
                    Fshi llogarinë përfundimisht
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Section 6: App Version Footer */}
        <Text style={[styles.appVersion, { color: colors.textLight }]}>
          Bleje Pronën Mobile v1.0.0 • Kosovë
        </Text>
      </ScrollView>

      {/* Quick Avatar Selector Sheet (Apple iOS 18 Design) */}
      <Modal
        visible={avatarModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => setAvatarModalVisible(false)}
          />
          <View
            style={[
              styles.avatarSheetContent,
              {
                backgroundColor: colors.surface,
                borderColor: specularBorder,
              },
            ]}
          >
            {/* Sheet Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={styles.avatarSheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.avatarSheetTitle, { color: colors.textPrimary }]}>
                  Zgjidh Avataron
                </Text>
                <Text style={[styles.avatarSheetSubtitle, { color: colors.textMuted }]}>
                  20 avatarë me cilësi të lartë të Bleje Pronën
                </Text>
              </View>
              <Pressable
                style={[
                  styles.modalCloseBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                ]}
                onPress={() => setAvatarModalVisible(false)}
                hitSlop={8}
              >
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Avatars Grid */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.avatarSheetGrid}
            >
              {BLEJE_AVATARS.map((av) => {
                const isSelected =
                  rawAvatar === av.url ||
                  avatarUri.endsWith(av.url) ||
                  (rawAvatar && rawAvatar.includes(`avatar-${av.id}.png`))
                return (
                  <Pressable
                    key={av.id}
                    style={[
                      styles.avatarSheetItem,
                      isSelected && [
                        styles.avatarSheetItemSelected,
                        {
                          borderColor:
                            theme === 'green' ? colors.gold : colors.primary,
                        },
                      ],
                    ]}
                    onPress={() => handleSelectAvatarQuick(av.url)}
                  >
                    <Image
                      source={{ uri: `https://blejepronen.com${av.url}` }}
                      style={styles.avatarSheetImg}
                      contentFit="cover"
                      transition={150}
                    />
                    {isSelected && (
                      <View
                        style={[
                          styles.avatarSheetCheck,
                          {
                            backgroundColor:
                              theme === 'green' ? colors.gold : colors.primary,
                          },
                        ]}
                      >
                        <Check
                          size={11}
                          color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                          strokeWidth={3}
                        />
                      </View>
                    )}
                  </Pressable>
                )
              })}
            </ScrollView>

            {/* More Profile Options Button */}
            <View style={styles.avatarSheetFooter}>
              <Pressable
                style={[
                  styles.avatarSheetFullProfileBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: specularBorder,
                  },
                ]}
                onPress={() => {
                  setAvatarModalVisible(false)
                  router.push('/completo-profilin' as any)
                }}
              >
                <Sparkles
                  size={16}
                  color={theme === 'green' ? colors.gold : colors.primary}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.avatarSheetFullProfileBtnText,
                    { color: colors.textPrimary },
                  ]}
                >
                  Plotëso të Gjithë Profilin (Të Dhënat & Qytetin)
                </Text>
                <ChevronRight size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Verification Modal (Apple iOS 18 Sheet) */}
      <Modal
        visible={verifyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVerifyModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => setVerifyModalVisible(false)}
          />
          <View
            style={[
              styles.verifySheetContent,
              {
                backgroundColor: colors.surface,
                borderColor: specularBorder,
              },
            ]}
          >
            {/* Sheet Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={styles.verifySheetHeader}>
              <View
                style={[
                  styles.verifyHeaderIcon,
                  { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
                ]}
              >
                <ShieldAlert size={22} color="#F59E0B" strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.verifySheetTitle, { color: colors.textPrimary }]}>
                  Verifikimi i Llogarisë
                </Text>
                <Text
                  style={[styles.verifySheetSubtitle, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {currentUser?.email}
                </Text>
              </View>
              <Pressable
                style={[
                  styles.modalCloseBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                ]}
                onPress={() => setVerifyModalVisible(false)}
                hitSlop={8}
              >
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.verifySheetBody}
            >
              {/* Option 1: 6-digit OTP Code */}
              <View
                style={[
                  styles.verifyOptionBox,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: specularBorder,
                  },
                ]}
              >
                <Text style={[styles.verifyOptionTitle, { color: colors.textPrimary }]}>
                  1. Verifiko me Kod 6-Shifror
                </Text>
                <Text style={[styles.verifyOptionDesc, { color: colors.textMuted }]}>
                  Shkruani kodin e verifikimit të dërguar në email-in tuaj:
                </Text>

                <TextInput
                  value={otpCode}
                  onChangeText={(val) => setOtpCode(val.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor={colors.textLight}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[
                    styles.otpInput,
                    {
                      color: colors.textPrimary,
                      borderColor:
                        otpCode.length === 6
                          ? theme === 'green'
                            ? colors.gold
                            : colors.primary
                          : colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                />

                <Pressable
                  style={[
                    styles.confirmOtpBtn,
                    {
                      backgroundColor:
                        otpCode.length === 6
                          ? theme === 'green'
                            ? colors.gold
                            : colors.primary
                          : colors.border,
                    },
                  ]}
                  onPress={handleConfirmOtp}
                  disabled={verifyingOtp || otpCode.length !== 6}
                >
                  {verifyingOtp ? (
                    <ActivityIndicator size="small" color={primaryBtnText} />
                  ) : (
                    <>
                      <CheckCircle2 size={16} color={primaryBtnText} strokeWidth={2.4} />
                      <Text style={[styles.confirmOtpBtnText, { color: primaryBtnText }]}>
                        Konfirmo Kodin
                      </Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={styles.resendBtn}
                  onPress={handleResendOtp}
                  disabled={resendingCode || resendCooldown > 0}
                >
                  {resendingCode ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text
                      style={[
                        styles.resendBtnText,
                        {
                          color:
                            resendCooldown > 0 ? colors.textLight : colors.primary,
                        },
                      ]}
                    >
                      {resendCooldown > 0
                        ? `Dërgo kodin përsëri (${resendCooldown}s)`
                        : 'Dërgo një kod të ri në email'}
                    </Text>
                  )}
                </Pressable>
              </View>

              {/* Option 2: Complete Profile */}
              <View
                style={[
                  styles.verifyOptionBox,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: specularBorder,
                  },
                ]}
              >
                <Text style={[styles.verifyOptionTitle, { color: colors.textPrimary }]}>
                  2. Plotësoni Profilin e Plotë
                </Text>
                <Text style={[styles.verifyOptionDesc, { color: colors.textMuted }]}>
                  Përfundoni të dhënat e telefonit, qytetit dhe biznesit për verifikim të plotë të llogarisë.
                </Text>

                <Pressable
                  style={[
                    styles.completeProfileBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: specularBorder,
                    },
                  ]}
                  onPress={() => {
                    setVerifyModalVisible(false)
                    router.push('/completo-profilin' as any)
                  }}
                >
                  <Sparkles
                    size={16}
                    color={theme === 'green' ? colors.gold : colors.primary}
                    strokeWidth={2.4}
                  />
                  <Text style={[styles.completeProfileBtnText, { color: colors.textPrimary }]}>
                    Hap Formularin e Profilit
                  </Text>
                  <ArrowRight size={15} color={colors.textMuted} />
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 10,
  },
  headerSettingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  miniCompanyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  miniCompanyBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    borderWidth: 0.5,
    gap: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarEditPill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  contactPersonText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  guestCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 22,
    borderWidth: 0.5,
    gap: 10,
  },
  guestIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  guestTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  guestSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  authButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  loginBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  registerBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  registerBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  onboardingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  onboardingIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  onboardingTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  onboardingSubtitle: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    lineHeight: 15,
  },
  onboardingActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  onboardingActionPillText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  quickTilesGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickTile: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: 'center',
    gap: 4,
  },
  quickTileIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  quickTileLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  quickTileSub: {
    fontSize: 10,
    fontFamily: Fonts.regular,
  },
  menuGroup: {
    borderRadius: 20,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  subGroupHeading: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  menuItemBorderTop: {
    borderTopWidth: 0.5,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextContainer: {
    flex: 1,
    gap: 2,
  },
  menuTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  menuSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupHeading: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  currentThemeLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  themeCardsGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  themeCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  themeCardActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  themeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCardName: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    marginTop: 2,
  },
  themeCardDesc: {
    fontSize: 10.5,
    fontFamily: Fonts.regular,
  },
  accountActionButtons: {
    gap: 10,
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  logoutButtonText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  deleteAccountButtonText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#EF4444',
  },
  appVersion: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    paddingVertical: 12,
  },

  // Badges
  companyVerifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  individualVerifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  unverifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },

  // Unverified Card
  unverifiedCard: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.2,
    gap: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  unverifiedCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unverifiedMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  amberPulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  unverifiedMiniPillText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#D97706',
    letterSpacing: 0.2,
  },
  actionRequiredPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  actionRequiredPillText: {
    fontSize: 10.5,
    fontFamily: Fonts.bold,
    color: '#EF4444',
  },
  unverifiedHeadline: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  unverifiedSub: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  valueChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  valueChipText: {
    fontSize: 10.5,
    fontFamily: Fonts.semiBold,
  },
  unverifiedCtaBtn: {
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  unverifiedCtaBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },

  // Verified VIP Trust Card
  verifiedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  verifiedIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCardTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  verifiedCardSubtitle: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },

  // Modal Sheets (Apple iOS 18 Design)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
    opacity: 0.6,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },

  // Avatar Sheet
  avatarSheetContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: Dimensions.get('window').height * 0.78,
  },
  avatarSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  avatarSheetTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  avatarSheetSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  avatarSheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  avatarSheetItem: {
    width: (Dimensions.get('window').width - 40 - 36) / 4,
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarSheetItemSelected: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  avatarSheetImg: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  avatarSheetCheck: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarSheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  avatarSheetFullProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  avatarSheetFullProfileBtnText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    flex: 1,
    marginHorizontal: 8,
  },

  // Verification Sheet
  verifySheetContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: Dimensions.get('window').height * 0.85,
  },
  verifySheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  verifyHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifySheetTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  verifySheetSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  verifySheetBody: {
    padding: 20,
    gap: 16,
  },
  verifyOptionBox: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 0.5,
    gap: 10,
  },
  verifyOptionTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  verifyOptionDesc: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    lineHeight: 17,
  },
  otpInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    fontSize: 22,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    letterSpacing: 10,
    marginVertical: 4,
  },
  confirmOtpBtn: {
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmOtpBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  resendBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
  },
  completeProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  completeProfileBtnText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    flex: 1,
    marginHorizontal: 8,
  },
})
