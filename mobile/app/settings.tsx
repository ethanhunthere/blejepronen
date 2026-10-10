import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
  Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Image as ExpoImage } from 'expo-image'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  getSyncAuthUser,
  getSyncProfile,
  setSyncAuthUser,
  setSyncProfile,
} from '@/lib/auth-cache'
import { playThemeSound, playTapSound, playSuccessSound } from '@/lib/sound'
import {
  ArrowLeft,
  Bell,
  Shield,
  Lock,
  CheckCircle2,
  Trash2,
  LogOut,
  Save,
  Eye,
  EyeOff,
  Check,
  Mail,
  Smartphone,
  Volume2,
  Vibrate,
  Palette,
  Sun,
  Leaf,
  Moon,
  RefreshCw,
  HardDrive,
  Info,
  ScanFace,
  Fingerprint,
  ShieldCheck,
  ExternalLink,
  VolumeX,
  AlertCircle,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts, ThemeMode } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useBanner } from '@/context/BannerContext'
import { useLogout } from '@/context/LogoutContext'
import {
  apiSaveProfileSettings,
  apiDeleteAccount,
  ProfileSettingsPayload,
} from '@/lib/api'
import { safeBack } from '@/lib/navigation'
import { subscribeAvatarChange } from '@/lib/avatars'
import { isAppSoundEnabled, setAppSoundEnabled } from '@/lib/sound'
import {
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  authenticateWithBiometrics,
  getDeviceBiometricCapability,
  setSessionUnlocked,
  BiometricCapability,
} from '@/lib/biometrics'

type SettingsTab = 'notifications' | 'security' | 'app'

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '#E5E7EB' }
  let score = 0
  if (pwd.length >= 6) score += 1
  if (pwd.length >= 9) score += 1
  if (/[0-9]/.test(pwd)) score += 1
  if (/[^A-Za-z0-9]/.test(pwd) || (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd))) score += 1

  switch (score) {
    case 1:
      return { score: 1, label: 'Shumë i dobët', color: '#EF4444' }
    case 2:
      return { score: 2, label: 'Mesatar', color: '#F59E0B' }
    case 3:
      return { score: 3, label: 'I sigurt', color: '#3B82F6' }
    case 4:
    default:
      return { score: 4, label: 'Shumë i fortë', color: '#10B981' }
  }
}

export default function SettingsScreen() {
  const router = useRouter()
  const { colors, theme, setTheme } = useTheme()
  const { showBanner } = useBanner()
  const { requestLogout, executeLogout } = useLogout()

  const insets = useSafeAreaInsets()
  const syncUser = getSyncAuthUser()
  const syncProfile = getSyncProfile()

  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications')
  const scrollRef = useRef<ScrollView>(null)

  // Ensure every screen/tab always opens cleanly at the very top (y: 0) on focus with zero visual jump
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false })
    }, [])
  )

  const handleTabChange = useCallback((newTab: SettingsTab) => {
    if (newTab === activeTab) {
      scrollRef.current?.scrollTo({ y: 0, animated: true })
      return
    }
    playTapSound()
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
    scrollRef.current?.scrollTo({ y: 0, animated: false })
    setActiveTab(newTab)
  }, [activeTab])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(syncUser?.id || null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState(syncUser?.email || '')
  const [isOAuthUser, setIsOAuthUser] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(
    Boolean(syncProfile?.email_verified || syncUser?.user_metadata?.email_verified)
  )

  // Account Type
  const [isCompany, setIsCompany] = useState(
    Boolean(syncProfile?.account_type === 'company' || syncUser?.user_metadata?.account_type === 'company')
  )

  // Individual Specific Fields (Preserved permanently)
  const [individualFirstName, setIndividualFirstName] = useState(
    syncProfile?.first_name || syncUser?.user_metadata?.first_name || ''
  )
  const [individualLastName, setIndividualLastName] = useState(
    syncProfile?.last_name || syncUser?.user_metadata?.last_name || ''
  )
  const [individualPhone, setIndividualPhone] = useState(
    syncProfile?.phone || syncUser?.user_metadata?.phone || ''
  )
  const [individualEmail, setIndividualEmail] = useState(syncUser?.email || '')
  const [individualBio, setIndividualBio] = useState(syncProfile?.bio || '')

  // Company Specific Fields (Preserved permanently)
  const [companyName, setCompanyName] = useState(
    syncProfile?.company_name || syncUser?.user_metadata?.company_name || ''
  )
  const [companyContactPerson, setCompanyContactPerson] = useState(
    syncProfile?.contact_person || ''
  )
  const [companyPhone, setCompanyPhone] = useState(
    syncProfile?.phone || syncUser?.user_metadata?.phone || ''
  )
  const [companyEmail, setCompanyEmail] = useState(syncUser?.email || '')
  const [companyDescription, setCompanyDescription] = useState(syncProfile?.bio || '')
  const [foundedYear, setFoundedYear] = useState('')
  const [nipt, setNipt] = useState('')
  const [officeAddress, setOfficeAddress] = useState('')
  const [website, setWebsite] = useState('')

  // Common Profile Fields
  const [avatarUrl, setAvatarUrl] = useState(
    syncProfile?.avatar_url || syncUser?.user_metadata?.avatar_url || '/avatars/avatar-1.png'
  )
  const [city, setCity] = useState(syncProfile?.city || 'Prishtinë')

  // Real-time synchronization for avatar changes across screens
  useEffect(() => {
    const unsubscribe = subscribeAvatarChange((newAvatarUrl) => {
      setAvatarUrl(newAvatarUrl)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  // Social Links
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [youtube, setYoutube] = useState('')
  const [twitter, setTwitter] = useState('')

  // Platform Notifications
  const [notifications, setNotifications] = useState({
    messages: true,
    inquiries: true,
    followers: true,
    weeklyReport: false,
    newsletter: true,
    // App-specific push notifications
    pushEnabled: true,
    pushSound: true,
    pushVibrate: true,
    priceDropAlerts: true,
    newMatchAlerts: true,
  })

  // Privacy Settings
  const [privacy, setPrivacy] = useState({
    showPhone: true,
    showSocials: true,
    showOnline: true,
    allowDirectMsgs: true,
    showListingsOnProfile: true,
  })

  // Native Biometric Security (Face ID / Touch ID / Android BiometricPrompt)
  const [biometricLock, setBiometricLock] = useState(false)
  const [biometricCapability, setBiometricCapability] = useState<BiometricCapability | null>(null)
  const [biometricLoading, setBiometricLoading] = useState(false)

  // General In-App Sound and Haptic System (Default: ON)
  const [appSound, setAppSound] = useState(true)

  const [clearingCache, setClearingCache] = useState(false)

  // Password Change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Focus state for inputs
  const [focusedField, setFocusedField] = useState<string | null>(null)

  // Load user data on mount
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    async function loadUserData() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const activeUser = session?.user || (await supabase.auth.getUser()).data.user
        if (!isMountedRef.current) return
        if (!activeUser) {
          router.replace('/(tabs)/profile')
          return
        }

        setCurrentUserId(activeUser.id)
        setAccessToken(session?.access_token || null)
        setUserEmail(activeUser.email || '')

        const { data: prof } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone, email_verified, avatar_url')
          .eq('id', activeUser.id)
          .single()

        if (!isMountedRef.current) return

        const meta = activeUser.user_metadata || {}
        const isComp =
          meta.account_type === 'company' ||
          meta.is_company === true ||
          Boolean(meta.company_name) ||
          prof?.last_name === 'Kompani'

        setIsCompany(isComp)

        const isOAuth =
          activeUser.app_metadata?.provider === 'google' ||
          activeUser.app_metadata?.provider === 'apple'
        setIsOAuthUser(Boolean(isOAuth))

        const isGoogle = activeUser.app_metadata?.provider === 'google'
        const verified =
          Boolean(prof?.email_verified) ||
          Boolean(activeUser.email_confirmed_at) ||
          Boolean(activeUser.confirmed_at) ||
          isGoogle
        setIsEmailVerified(verified)

        // Individual fields
        setIndividualFirstName(
          meta.individual_first_name ||
            (!isComp ? prof?.first_name : '') ||
            (!isComp && meta.first_name ? meta.first_name : '') ||
            ''
        )
        setIndividualLastName(
          meta.individual_last_name ||
            (!isComp && prof?.last_name !== 'Kompani' ? prof?.last_name : '') ||
            (!isComp && meta.last_name !== 'Kompani' ? meta.last_name : '') ||
            ''
        )
        setIndividualPhone(
          meta.individual_phone ||
            (!isComp ? prof?.phone : '') ||
            (!isComp && meta.phone ? meta.phone : '') ||
            ''
        )
        setIndividualEmail(meta.individual_email || activeUser.email || '')
        setIndividualBio(meta.individual_bio || (!isComp ? meta.bio : '') || '')

        // Company fields
        setCompanyName(
          meta.company_name ||
            (isComp ? prof?.first_name : '') ||
            (isComp && meta.first_name ? meta.first_name : '') ||
            ''
        )
        setCompanyContactPerson(
          meta.contact_person ||
            (isComp && prof?.last_name !== 'Kompani' ? prof?.last_name : '') ||
            (isComp && meta.last_name !== 'Kompani' ? meta.last_name : '') ||
            ''
        )
        setCompanyPhone(
          meta.company_phone ||
            (isComp ? prof?.phone : '') ||
            (isComp && meta.phone ? meta.phone : '') ||
            ''
        )
        setCompanyEmail(meta.company_email || '')
        setCompanyDescription(meta.company_description || (isComp ? meta.bio : '') || '')
        if (meta.founded_year) setFoundedYear(String(meta.founded_year))
        if (meta.nipt) setNipt(meta.nipt)
        if (meta.office_address) setOfficeAddress(meta.office_address)
        if (meta.website) setWebsite(meta.website)

        // Common
        if (meta.city) setCity(meta.city)
        if (prof?.avatar_url || meta.avatar_url) {
          setAvatarUrl(prof?.avatar_url || meta.avatar_url)
        }

        // Socials
        if (meta.instagram) setInstagram(meta.instagram)
        if (meta.facebook) setFacebook(meta.facebook)
        if (meta.whatsapp) setWhatsapp(meta.whatsapp)
        if (meta.tiktok) setTiktok(meta.tiktok)
        if (meta.linkedin) setLinkedin(meta.linkedin)
        if (meta.youtube) setYoutube(meta.youtube)
        if (meta.twitter) setTwitter(meta.twitter)

        // Notifications & Privacy
        if (meta.notifications) {
          setNotifications((prev) => ({ ...prev, ...meta.notifications }))
        }
        if (meta.privacy) {
          setPrivacy((prev) => ({ ...prev, ...meta.privacy }))
        }

        // Biometrics & Sound Preferences
        const [bioLock, bioCap] = await Promise.all([
          isBiometricLockEnabled(),
          getDeviceBiometricCapability(),
        ])
        if (isMountedRef.current) {
          setBiometricCapability(bioCap)
          setBiometricLock(
            bioLock ||
              meta.biometric_lock === true ||
              meta.app_preferences?.biometricLock === true
          )
        }

        const soundEnabled = isAppSoundEnabled()
        if (isMountedRef.current) {
          setAppSound(soundEnabled)
        }
      } catch (err) {
        console.warn('Load user settings error:', err)
        if (isMountedRef.current) {
          showBanner({
            type: 'error',
            title: 'Vërejtje',
            message: 'Cilësimet nuk u ngarkuan plotësisht. Kontrolloni lidhjen dhe provoni përsëri.',
          })
        }
      } finally {
        if (isMountedRef.current) setLoading(false)
      }
    }

    loadUserData()
  }, [])

  // Handle Save All Settings
  const handleSave = async (overrideNotifications?: typeof notifications, overridePrivacy?: typeof privacy) => {
    setSaving(true)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
    }

    const currentNotifications = overrideNotifications || notifications
    const currentPrivacy = overridePrivacy || privacy

    try {
      // 1. Fetch freshest user & session from Supabase client
      const {
        data: { session },
      } = await supabase.auth.getSession()

      let activeUser: any = session?.user
      if (!activeUser) {
        const userRes = await supabase.auth.getUser()
        activeUser = userRes.data.user
      }

      if (!activeUser) {
        showBanner({
          type: 'error',
          title: 'Sesioni ka Skaduar',
          message: 'Ju lutemi kyçuni përsëri për të ruajtur ndryshimet.',
        })
        router.replace('/login')
        return
      }

      const existingMeta = activeUser.user_metadata || {}

      // 2. Authoritative Supabase Auth Metadata Update - preserve existing user profile data
      const updatedMetadata = {
        ...existingMeta,
        notifications: currentNotifications,
        privacy: currentPrivacy,
        biometric_lock: biometricLock,
        app_preferences: {
          ...(existingMeta.app_preferences || {}),
          biometricLock: biometricLock,
          soundEnabled: appSound,
        },
      }

      const { data: authUpdateData, error: authUpdateError } = await supabase.auth.updateUser({
        data: updatedMetadata,
      })

      if (authUpdateError) {
        console.error('Supabase auth update error in settings:', authUpdateError)
        throw new Error(authUpdateError.message || 'Dështoi përditësimi i të dhënave në llogari.')
      }

      // 3. Instant Global Auth Cache Hydration for 0ms multi-screen sync
      const freshUser = authUpdateData?.user || {
        ...activeUser,
        user_metadata: updatedMetadata,
      }
      const freshProfile = {
        ...(syncProfile || {}),
        notifications: currentNotifications,
        privacy: currentPrivacy,
      }

      setSyncAuthUser(freshUser)
      setSyncProfile(freshProfile)

      // 4. Concurrently sync with Next.js web backend (non-blocking, safe)
      const token = session?.access_token || accessToken
      if (token) {
        const payload: ProfileSettingsPayload = {
          isCompany: Boolean(existingMeta.is_company || existingMeta.account_type === 'company'),
          accountType: existingMeta.account_type === 'company' ? 'company' : 'individual',
          firstName: existingMeta.first_name || syncProfile?.first_name,
          lastName: existingMeta.last_name || syncProfile?.last_name,
          phone: existingMeta.phone || syncProfile?.phone,
          bio: existingMeta.bio || syncProfile?.bio,
          city: existingMeta.city || syncProfile?.city,
          avatarUrl: existingMeta.avatar_url || syncProfile?.avatar_url || avatarUrl,
          emailVerified: isEmailVerified,
          notifications: currentNotifications,
          privacy: currentPrivacy,
          appPreferences: {
            biometricLock: biometricLock,
          },
        }

        apiSaveProfileSettings(payload, token).catch((e) => {
          console.warn('Background web sync notice (settings):', e)
        })
      }

      // 5. Tactile haptic & sound confirmation
      playSuccessSound()
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      }

      setHasUnsavedChanges(false)

      showBanner({
        type: 'success',
        title: 'Cilësimet u Ruajtën!',
        message: 'Ndryshimet u ruajtën me sukses në llogarinë tuaj.',
      })
    } catch (err: any) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
      }
      showBanner({
        type: 'error',
        title: 'Gabim gjatë ruajtjes',
        message: err?.message || 'Dështoi ruajtja e të dhënave.',
      })
    } finally {
      if (isMountedRef.current) setSaving(false)
    }
  }

  // Update Password
  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
      }
      showBanner({
        type: 'error',
        title: 'Fjalëkalim i Pavlefshëm',
        message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
      }
      showBanner({
        type: 'error',
        title: 'Fjalëkalimet nuk përputhen',
        message: 'Fjalëkalimet e vendosura nuk janë identike.',
      })
      return
    }

    setUpdatingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setNewPassword('')
      setConfirmPassword('')
      playSuccessSound()
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      }
      showBanner({
        type: 'success',
        title: 'Fjalëkalimi u Ndryshua!',
        message: 'Fjalëkalimi juaj i ri u ruajt me sukses.',
      })
    } catch (err: any) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
      }
      showBanner({
        type: 'error',
        title: 'Gabim',
        message: err?.message || 'Dështoi përditësimi i fjalëkalimit.',
      })
    } finally {
      if (isMountedRef.current) setUpdatingPassword(false)
    }
  }

  // Universal Native Biometric Security Toggle (iOS Face ID/Touch ID & Android BiometricPrompt)
  const handleToggleBiometric = async (nextVal: boolean) => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'E padisponueshme në Web',
        'Kyçja biometrike mbështetet vetëm në pajisjet mobile (iOS dhe Android).'
      )
      return
    }

    // Switch onValueChange can double-fire on some Android builds; a second
    // invocation while the native prompt is up would reject instantly.
    if (biometricLoading) return

    const biometryName = biometricCapability?.displayName || 'Biometria'

    if (biometricCapability && !biometricCapability.supported) {
      Alert.alert('E pambështetur', 'Kjo pajisje nuk mbështet sensorë biometrikë.')
      return
    }

    if (biometricCapability && !biometricCapability.enrolled) {
      Alert.alert(
        `${biometryName} nuk është konfiguruar`,
        biometricCapability.enrollmentGuide ||
          'Ju lutemi regjistroni biometrinë në Cilësimet e telefonit tuaj për ta përdorur.',
        [
          { text: 'Mbyll', style: 'cancel' },
          { text: 'Hap Cilësimet', onPress: () => Linking.openSettings() },
        ]
      )
      return
    }

    setBiometricLoading(true)

    if (nextVal) {
      // 1. Enabling: STRICT Native Biometric verification required (no passcode fallback)
      const promptMsg =
        Platform.OS === 'ios'
          ? `Skanoni ${biometryName} për ta aktivizuar mbrojtjen`
          : `Vendosni gishtin ose skanoni fytyrën për të aktivizuar ${biometryName}`

      const result = await authenticateWithBiometrics(promptMsg)

      setBiometricLoading(false)

      if (result.success) {
        setBiometricLock(true)
        await setBiometricLockEnabled(true, accessToken)
        setSessionUnlocked(true)
        setHasUnsavedChanges(true)
        playSuccessSound()
        showBanner({
          type: 'success',
          title: biometryName,
          message: `Kyçja me ${biometryName} u aktivizua me sukses në këtë pajisje.`,
        })
      } else {
        // Revert switch to OFF
        setBiometricLock(false)
        if (!result.cancelled && result.error) {
          Alert.alert(biometryName, result.error)
        }
      }
    } else {
      // 2. Removing: STRICT Native Biometric verification required (cannot remove without biometrics)
      const promptMsg =
        Platform.OS === 'ios'
          ? `Skanoni ${biometryName} për ta hequr këtë opsion`
          : `Verifikoni ${biometryName} për ta hequr mbrojtjen`

      const result = await authenticateWithBiometrics(promptMsg)

      setBiometricLoading(false)

      if (result.success) {
        setBiometricLock(false)
        await setBiometricLockEnabled(false)
        setSessionUnlocked(true)
        setHasUnsavedChanges(true)
        playTapSound()
        showBanner({
          type: 'info',
          title: biometryName,
          message: `Kyçja me ${biometryName} u çaktivizua.`,
        })
      } else {
        // Verification failed or cancelled: keep switch ON
        setBiometricLock(true)
        if (!result.cancelled && result.error) {
          Alert.alert(biometryName, result.error)
        }
      }
    }
  }

  // General App Sound & Haptics Toggle (Default: ON)
  const handleToggleSound = async (nextVal: boolean) => {
    setAppSound(nextVal)
    await setAppSoundEnabled(nextVal)
    if (nextVal) {
      playTapSound()
    }
    setHasUnsavedChanges(true)
  }

  // Clear Cache Action
  const handleClearCache = async () => {
    if (clearingCache) return
    setClearingCache(true)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {})
    }
    try {
      await Promise.all([
        ExpoImage.clearMemoryCache(),
        ExpoImage.clearDiskCache(),
        AsyncStorage.removeItem('@blejepronen_recent_searches').catch(() => {}),
      ])
      showBanner({
        type: 'info',
        title: 'Memorja u Pastrua',
        message: 'Kesh-i i përkohshëm i imazheve dhe kërkimeve u pastrua nga pajisja.',
      })
    } catch {
      showBanner({
        type: 'error',
        title: 'Vërejtje',
        message: 'Pastrimi i kesh-it dështoi. Provoni përsëri.',
      })
    } finally {
      if (isMountedRef.current) setClearingCache(false)
    }
  }

  // Apple App Store & GDPR Account Deletion
  const handleDeleteAccount = () => {
    if (deletingAccount) return
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
    }

    Alert.alert(
      'Fshirja e Llogarisë',
      'Ky veprim është i pakthyeshëm. Të gjitha shpalljet tuaja, mesazhet dhe të dhënat e profilit do të fshihen përfundimisht.',
      [
        { text: 'Anulo', style: 'cancel' },
        {
          text: 'Fshi Llogarinë',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true)
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession()

              await executeLogout({
                isDelete: true,
                title: 'Duke fshirë llogarinë...',
                subtitle: 'Po fshijmë të gjitha të dhënat dhe shpalljet tuaja',
                successTitle: 'Llogaria u Fshi',
                successMessage: 'Të gjitha të dhënat dhe shpalljet tuaja u fshinë përfundimisht.',
                onBeforeTeardown: async () => {
                  if (session?.access_token) {
                    const res = await apiDeleteAccount(session.access_token)
                    if (!res.success) {
                      throw new Error(
                        res.error || 'Dështoi fshirja e llogarisë. Ju lutemi provoni përsëri.'
                      )
                    }
                  }
                },
              })
            } catch (err: any) {
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
              }
              showBanner({
                type: 'error',
                title: 'Gabim gjatë fshirjes',
                message: err?.message || 'Ndodhi një problem gjatë fshirjes së llogarisë.',
              })
            } finally {
              if (isMountedRef.current) setDeletingAccount(false)
            }
          },
        },
      ]
    )
  }

  // Theme Selector
  const handleThemeSelect = useCallback((selectedTheme: ThemeMode) => {
    if (theme === selectedTheme) return
    playThemeSound()
    setTheme(selectedTheme)
  }, [theme, setTheme])

  // Apple-grade specular styling
  const specularBorder = colors.border

  const brandHighlight = theme === 'green' ? colors.gold : colors.primary
  const primaryBtnText =
    theme === 'green' ? '#071C18' : theme === 'black' ? '#071A14' : '#FFFFFF'

  const pwdStrength = getPasswordStrength(newPassword)

  if (loading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Duke ngarkuar cilësimet...
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Glassy Navigation Header */}
      <View style={[styles.headerBar, { borderBottomColor: specularBorder }]}>
        <Pressable
          style={[styles.headerIconButton, { backgroundColor: colors.surfaceSubtle }]}
          onPress={() => safeBack(router, '/(tabs)/profile')}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Cilësimet</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {isCompany ? '🏢 Llogari Kompanie' : '👤 Llogari Individuale'}
          </Text>
        </View>

        <Pressable
          style={[
            styles.saveButton,
            { backgroundColor: brandHighlight },
            saving && { opacity: 0.7 },
          ]}
          onPress={() => handleSave()}
          disabled={saving}
          hitSlop={8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={primaryBtnText} />
          ) : (
            <>
              <Save size={15} color={primaryBtnText} strokeWidth={2.4} />
              <Text style={[styles.saveButtonText, { color: primaryBtnText }]}>
                {hasUnsavedChanges ? 'Ruaj *' : 'Ruaj'}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Apple-grade Segmented Tab Bar */}
        <View
          style={[
            styles.tabsContainer,
            {
              backgroundColor:
                theme === 'white' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
              borderColor: specularBorder,
            },
          ]}
        >

          <Pressable
            style={[styles.tabButton, activeTab === 'notifications' && styles.tabButtonActive]}
            onPress={() => handleTabChange('notifications')}
          >
            <Bell
              size={15}
              color={activeTab === 'notifications' ? brandHighlight : colors.textMuted}
              strokeWidth={activeTab === 'notifications' ? 2.4 : 2}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: activeTab === 'notifications' ? colors.textPrimary : colors.textMuted,
                  fontFamily: activeTab === 'notifications' ? Fonts.bold : Fonts.medium,
                },
              ]}
            >
              Njoftimet
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'security' && styles.tabButtonActive]}
            onPress={() => handleTabChange('security')}
          >
            <Shield
              size={15}
              color={activeTab === 'security' ? brandHighlight : colors.textMuted}
              strokeWidth={activeTab === 'security' ? 2.4 : 2}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: activeTab === 'security' ? colors.textPrimary : colors.textMuted,
                  fontFamily: activeTab === 'security' ? Fonts.bold : Fonts.medium,
                },
              ]}
            >
              Siguria
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'app' && styles.tabButtonActive]}
            onPress={() => handleTabChange('app')}
          >
            <Smartphone
              size={15}
              color={activeTab === 'app' ? brandHighlight : colors.textMuted}
              strokeWidth={activeTab === 'app' ? 2.4 : 2}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: activeTab === 'app' ? colors.textPrimary : colors.textMuted,
                  fontFamily: activeTab === 'app' ? Fonts.bold : Fonts.medium,
                },
              ]}
            >
              Aplikacioni
            </Text>
          </Pressable>
        </View>

        <ScrollView
          key={activeTab}
          ref={scrollRef}
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >


          {/* ======================================================== */}
          {/* TAB 2: NJOFTIMET (PLATFORM + MOBILE EXCLUSIVE PUSH)       */}
          {/* ======================================================== */}
          {activeTab === 'notifications' && (
            <View style={styles.sectionGap}>
              {/* Mobile Push Notifications (App Exclusive) */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Smartphone size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Njoftimet Push në Telefon
                  </Text>
                </View>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                  Merrni sinjale në kohë reale direkt në Lock Screen dhe Dynamic Island:
                </Text>

                <View style={styles.switchGroup}>
                  {/* Push Enabled */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Aktivizo Njoftimet Push
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Njoftohu menjëherë për mesazhe dhe oferta të reja
                      </Text>
                    </View>
                    <Switch
                      value={notifications.pushEnabled}
                      onValueChange={(val) => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                        setNotifications((p) => ({ ...p, pushEnabled: val }))
                        setHasUnsavedChanges(true)
                      }}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  {/* Sound Alerts */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Volume2 size={16} color={brandHighlight} />
                        <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                          Tingulli i Njoftimeve
                        </Text>
                      </View>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Luaj tingull të pastër me çdo njoftim
                      </Text>
                    </View>
                    <Switch
                      value={notifications.pushSound}
                      onValueChange={(val) => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                        setNotifications((p) => ({ ...p, pushSound: val }))
                        setHasUnsavedChanges(true)
                      }}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  {/* Haptic Vibration */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Vibrate size={16} color={brandHighlight} />
                        <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                          Vibrimi Haptik Nativ
                        </Text>
                      </View>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Reagim fizik të lehtë të motorit haptik
                      </Text>
                    </View>
                    <Switch
                      value={notifications.pushVibrate}
                      onValueChange={(val) => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                        setNotifications((p) => ({ ...p, pushVibrate: val }))
                        setHasUnsavedChanges(true)
                      }}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  {/* Price Drop Alerts */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Alert për Zbritje Çmimi
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Kur një pronë e ruajtur ul çmimin e shitjes ose qirasë
                      </Text>
                    </View>
                    <Switch
                      value={notifications.priceDropAlerts}
                      onValueChange={(val) => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                        setNotifications((p) => ({ ...p, priceDropAlerts: val }))
                        setHasUnsavedChanges(true)
                      }}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  {/* New Matching Listings */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Prona të Reja të Ngjashme
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Prona të reja që përputhen me qytetin dhe kërkimet tuaja
                      </Text>
                    </View>
                    <Switch
                      value={notifications.newMatchAlerts}
                      onValueChange={(val) => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                        setNotifications((p) => ({ ...p, newMatchAlerts: val }))
                        setHasUnsavedChanges(true)
                      }}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>
                </View>
              </View>

              {/* Platform Activity Notifications */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Bell size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Njoftimet e Platformës
                  </Text>
                </View>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                  Aktivitetet e llogarisë dhe mesazhet:
                </Text>

                <View style={styles.switchGroup}>
                  {/* Messages */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Mesazhet Direkte
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Kur dikush ju dërgon mesazh për një pronë
                      </Text>
                    </View>
                    <Switch
                      value={notifications.messages}
                      onValueChange={(val) => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                        setNotifications((p) => ({ ...p, messages: val }))
                        setHasUnsavedChanges(true)
                      }}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  {/* Inquiries */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Kërkesat & Ofertat
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Kur një blerës shfaq interesim për shpalljen tënde
                      </Text>
                    </View>
                    <Switch
                      value={notifications.inquiries}
                      onValueChange={(val) => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                        setNotifications((p) => ({ ...p, inquiries: val }))
                        setHasUnsavedChanges(true)
                      }}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  {/* Followers */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Ndjekësit e Rinj
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Kur dikush fillon të ndjekë agjencinë ose profilin tuaj
                      </Text>
                    </View>
                    <Switch
                      value={notifications.followers}
                      onValueChange={(val) => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                        setNotifications((p) => ({ ...p, followers: val }))
                        setHasUnsavedChanges(true)
                      }}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  {/* Weekly Report */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Raporti Javor i Performancës
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Përmbledhje e klikimeve dhe shikimeve të shpalljeve
                      </Text>
                    </View>
                    <Switch
                      value={notifications.weeklyReport}
                      onValueChange={(val) => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                        setNotifications((p) => ({ ...p, weeklyReport: val }))
                        setHasUnsavedChanges(true)
                      }}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* TAB 3: SIGURIA DHE PRIVATËSIA                            */}
          {/* ======================================================== */}
          {activeTab === 'security' && (
            <View style={styles.sectionGap}>
              {/* Email Verification Status */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Mail size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Statusi i Email-it
                  </Text>
                </View>
                <View style={styles.verifiedRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.emailValue, { color: colors.textPrimary }]}>
                      {userEmail}
                    </Text>
                    <Text style={[styles.emailHelp, { color: colors.textMuted }]}>
                      {isEmailVerified
                        ? 'Email-i juaj është i verifikuar zyrtarisht në Bleje Pronën.'
                        : 'Ju lutemi verifikoni email-in për siguri maksimale.'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: isEmailVerified
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                      },
                    ]}
                  >
                    <CheckCircle2
                      size={13}
                      color={isEmailVerified ? '#10B981' : '#EF4444'}
                      strokeWidth={2.4}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: isEmailVerified ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {isEmailVerified ? 'Verifikuar' : 'Pa verifikuar'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Password Change */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Lock size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Ndrysho Fjalëkalimin
                  </Text>
                </View>

                {isOAuthUser ? (
                  <View style={{ paddingVertical: 4 }}>
                    <Text style={[styles.cardSubtitle, { color: colors.textMuted, marginBottom: 0 }]}>
                      Jeni kyçur përmes llogarisë Google / Apple. Fjalëkalimi menaxhohet drejtpërdrejt tek ofruesi i llogarisë tuaj.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.formGap}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                        Fjalëkalimi i Ri
                      </Text>
                      <View
                        style={[
                          styles.inputField,
                          {
                            backgroundColor: colors.surfaceSubtle,
                            borderColor:
                              focusedField === 'newPwd' ? brandHighlight : specularBorder,
                            borderWidth: focusedField === 'newPwd' ? 1.5 : 0.5,
                          },
                        ]}
                      >
                        <Lock size={17} color={colors.textMuted} />
                        <TextInput
                          style={[styles.textInput, { color: colors.textPrimary }]}
                          value={newPassword}
                          onChangeText={setNewPassword}
                          onFocus={() => setFocusedField('newPwd')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Të paktën 6 karaktere"
                          placeholderTextColor={colors.textLight}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          textContentType="newPassword"
                        />
                        <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                          {showPassword ? (
                            <EyeOff size={17} color={colors.textMuted} />
                          ) : (
                            <Eye size={17} color={colors.textMuted} />
                          )}
                        </Pressable>
                      </View>

                      {newPassword.length > 0 && (
                        <View style={styles.pwdStrengthRow}>
                          <View
                            style={[
                              styles.pwdStrengthBar,
                              { backgroundColor: pwdStrength.color, flex: pwdStrength.score / 4 },
                            ]}
                          />
                          <Text style={[styles.pwdStrengthLabel, { color: pwdStrength.color }]}>
                            {pwdStrength.label}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                        Konfirmo Fjalëkalimin e Ri
                      </Text>
                      <View
                        style={[
                          styles.inputField,
                          {
                            backgroundColor: colors.surfaceSubtle,
                            borderColor:
                              focusedField === 'confPwd' ? brandHighlight : specularBorder,
                            borderWidth: focusedField === 'confPwd' ? 1.5 : 0.5,
                          },
                        ]}
                      >
                        <Lock size={17} color={colors.textMuted} />
                        <TextInput
                          style={[styles.textInput, { color: colors.textPrimary }]}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          onFocus={() => setFocusedField('confPwd')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Përsërit fjalëkalimin"
                          placeholderTextColor={colors.textLight}
                          secureTextEntry={!showConfirmPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          textContentType="newPassword"
                        />
                        <Pressable
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          hitSlop={8}
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={17} color={colors.textMuted} />
                          ) : (
                            <Eye size={17} color={colors.textMuted} />
                          )}
                        </Pressable>
                      </View>
                    </View>

                    <Pressable
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor:
                            newPassword.length >= 6 ? brandHighlight : colors.surfaceSubtle,
                          borderColor: specularBorder,
                        },
                      ]}
                      onPress={handleUpdatePassword}
                      disabled={updatingPassword || newPassword.length < 6}
                      hitSlop={8}
                    >
                      {updatingPassword ? (
                        <ActivityIndicator size="small" color={primaryBtnText} />
                      ) : (
                        <Text
                          style={[
                            styles.actionButtonText,
                            {
                              color: newPassword.length >= 6 ? primaryBtnText : colors.textMuted,
                            },
                          ]}
                        >
                          Përditëso Fjalëkalimin
                        </Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Native Universal Biometric Security (Face ID / Touch ID / Android BiometricPrompt) */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  {biometricCapability?.iconName === 'face' ? (
                    <ScanFace size={18} color={brandHighlight} strokeWidth={2.2} />
                  ) : biometricCapability?.iconName === 'fingerprint' ? (
                    <Fingerprint size={18} color={brandHighlight} strokeWidth={2.2} />
                  ) : (
                    <ShieldCheck size={18} color={brandHighlight} strokeWidth={2.2} />
                  )}
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Kyçja me {biometricCapability?.displayName || 'Biometri'}
                  </Text>
                </View>

                {!biometricCapability?.supported ? (
                  <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                    Kjo pajisje nuk mbështet sensorë biometrikë (Face ID ose Gjurmë Gishti).
                  </Text>
                ) : !biometricCapability?.enrolled ? (
                  <View style={{ gap: 10, marginTop: 2 }}>
                    <View style={styles.verifiedRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.emailValue, { color: colors.textPrimary }]}>
                          {biometricCapability.displayName} e paregjistruar
                        </Text>
                        <Text style={[styles.emailHelp, { color: colors.textMuted }]}>
                          {biometricCapability.enrollmentGuide}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: 'rgba(234, 179, 8, 0.15)' },
                        ]}
                      >
                        <AlertCircle size={13} color="#EAB308" strokeWidth={2.4} />
                        <Text style={[styles.statusPillText, { color: '#EAB308' }]}>
                          E paregjistruar
                        </Text>
                      </View>
                    </View>

                    {Platform.OS !== 'web' && (
                      <Pressable
                        style={[
                          styles.openSettingsBtn,
                          { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                        ]}
                        onPress={() => Linking.openSettings()}
                        hitSlop={8}
                      >
                        <ExternalLink size={14} color={brandHighlight} />
                        <Text style={[styles.openSettingsBtnText, { color: brandHighlight }]}>
                          Hap Cilësimet e Telefonit
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <>
                    <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                      {biometricCapability.description}
                    </Text>

                    <View style={styles.switchGroup}>
                      <View style={styles.switchRow}>
                        <View style={styles.switchTextWrap}>
                          <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                            {biometricCapability.actionLabel}
                          </Text>
                          <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                            Kërkon verifikim sa herë që hapni aplikacionin ose riktheheni nga sfondi
                          </Text>
                        </View>
                        {biometricLoading ? (
                          <ActivityIndicator size="small" color={brandHighlight} />
                        ) : (
                          <Switch
                            value={biometricLock}
                            onValueChange={handleToggleBiometric}
                            disabled={biometricLoading}
                            trackColor={{ false: colors.border, true: brandHighlight }}
                            ios_backgroundColor={colors.border}
                          />
                        )}
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* Privacy Preferences */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Shield size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Privatësia & Dukshmëria
                  </Text>
                </View>

                <View style={styles.switchGroup}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Shfaq Numrin e Telefonit Publikisht
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Lejo blerësit t'ju telefonojnë drejtpërdrejt nga faqja e pronës
                      </Text>
                    </View>
                    <Switch
                      value={privacy.showPhone}
                      onValueChange={(val) => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                        setPrivacy((p) => ({ ...p, showPhone: val }))
                        setHasUnsavedChanges(true)
                      }}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Shfaq Statusin Online
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Tregon nëse jeni aktiv në aplikacion
                      </Text>
                    </View>
                    <Switch
                      value={privacy.showOnline}
                      onValueChange={(val) => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                        setPrivacy((p) => ({ ...p, showOnline: val }))
                        setHasUnsavedChanges(true)
                      }}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Lejo Mesazhe Direkte
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Prano mesazhe nga të gjithë përdoruesit e regjistruar
                      </Text>
                    </View>
                    <Switch
                      value={privacy.allowDirectMsgs}
                      onValueChange={(val) => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                        setPrivacy((p) => ({ ...p, allowDirectMsgs: val }))
                        setHasUnsavedChanges(true)
                      }}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Shfaq Shpalljet në Profilin Publik
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Shfaq listën e pronave kur dikush hap profilin tuaj
                      </Text>
                    </View>
                    <Switch
                      value={privacy.showListingsOnProfile}
                      onValueChange={(val) => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                        setPrivacy((p) => ({ ...p, showListingsOnProfile: val }))
                        setHasUnsavedChanges(true)
                      }}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>
                </View>
              </View>

              {/* Apple App Store & GDPR Account Deletion Card */}
              {Boolean(currentUserId) && (
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor:
                        theme === 'white'
                          ? '#FFF5F5'
                          : theme === 'green'
                          ? 'rgba(239, 68, 68, 0.08)'
                          : '#1A0E0E',
                      borderColor:
                        theme === 'white'
                          ? '#FECACA'
                          : 'rgba(239, 68, 68, 0.28)',
                    },
                  ]}
                >
                  <View style={styles.cardHeaderRow}>
                    <Trash2 size={18} color="#EF4444" strokeWidth={2.2} />
                    <Text style={[styles.cardTitle, { color: '#EF4444' }]}>
                      Fshirja e Llogarisë
                    </Text>
                  </View>
                  <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                    Fshin përfundimisht profilin, të gjitha shpalljet aktive, fotot, të preferuarat dhe historikun e bisedave. Ky veprim nuk mund të kthehet.
                  </Text>

                  <Pressable
                    style={[
                      styles.deleteAccountActionBtn,
                      {
                        backgroundColor:
                          theme === 'white'
                            ? '#FEE2E2'
                            : 'rgba(239, 68, 68, 0.18)',
                        borderColor: '#EF4444',
                      },
                      deletingAccount && { opacity: 0.6 },
                    ]}
                    onPress={handleDeleteAccount}
                    disabled={deletingAccount}
                    hitSlop={8}
                  >
                    {deletingAccount ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <>
                        <Trash2 size={15} color="#EF4444" strokeWidth={2.2} />
                        <Text style={[styles.deleteAccountActionBtnText, { color: '#EF4444' }]}>
                          Fshi Llogarinë Përfundimisht
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* ======================================================== */}
          {/* TAB 4: APLIKACIONI & CILËSIMET E SISTEMIT                  */}
          {/* ======================================================== */}
          {activeTab === 'app' && (
            <View style={styles.sectionGap}>
              {/* Theme Selector */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Palette size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Tema e Aplikacionit
                  </Text>
                </View>

                <View style={styles.themeGrid}>
                  {/* White Theme */}
                  <Pressable
                    style={[
                      styles.themeBox,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: theme === 'white' ? colors.primary : colors.border,
                      },
                      theme === 'white' && styles.themeBoxActive,
                    ]}
                    onPress={() => handleThemeSelect('white')}
                  >
                    <View
                      style={[
                        styles.themeIconCircle,
                        {
                          backgroundColor: '#FFFFFF',
                          borderWidth: 0.5,
                          borderColor: 'rgba(15, 23, 42, 0.08)',
                        },
                      ]}
                    >
                      <Sun size={18} color="#00675B" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.themeBoxTitle, { color: colors.textPrimary }]}>
                      E Bardhë
                    </Text>
                    <Text style={[styles.themeBoxDesc, { color: colors.textMuted }]}>Klasike</Text>
                    {theme === 'white' && (
                      <View style={[styles.themeCheck, { backgroundColor: colors.primary }]}>
                        <Check size={11} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>

                  {/* Green Theme */}
                  <Pressable
                    style={[
                      styles.themeBox,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: theme === 'green' ? colors.gold : colors.border,
                      },
                      theme === 'green' && styles.themeBoxActive,
                    ]}
                    onPress={() => handleThemeSelect('green')}
                  >
                    <View
                      style={[
                        styles.themeIconCircle,
                        {
                          backgroundColor: '#071C18',
                          borderWidth: 0.5,
                          borderColor: 'rgba(212, 175, 55, 0.30)',
                        },
                      ]}
                    >
                      <Leaf size={18} color="#D4AF37" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.themeBoxTitle, { color: colors.textPrimary }]}>
                      E Gjelbër
                    </Text>
                    <Text style={[styles.themeBoxDesc, { color: colors.textMuted }]}>Emerald</Text>
                    {theme === 'green' && (
                      <View style={[styles.themeCheck, { backgroundColor: colors.gold }]}>
                        <Check size={11} color="#071C18" strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>

                  {/* Black Theme */}
                  <Pressable
                    style={[
                      styles.themeBox,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: theme === 'black' ? '#34D399' : colors.border,
                      },
                      theme === 'black' && styles.themeBoxActive,
                    ]}
                    onPress={() => handleThemeSelect('black')}
                  >
                    <View style={[styles.themeIconCircle, { backgroundColor: '#0B0F0E' }]}>
                      <Moon size={18} color="#34D399" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.themeBoxTitle, { color: colors.textPrimary }]}>
                      E Zezë
                    </Text>
                    <Text style={[styles.themeBoxDesc, { color: colors.textMuted }]}>OLED</Text>
                    {theme === 'black' && (
                      <View style={[styles.themeCheck, { backgroundColor: '#34D399' }]}>
                        <Check size={11} color="#0B0F0E" strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* General In-App Sound and Haptic System */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  {appSound ? (
                    <Volume2 size={18} color={brandHighlight} strokeWidth={2.2} />
                  ) : (
                    <VolumeX size={18} color={colors.textMuted} strokeWidth={2.2} />
                  )}
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Tingujt & Reagimi Haptik
                  </Text>
                </View>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                  Kontrollon efektet zanore dhe vibrimin taktil të motorit haptik në aplikacion:
                </Text>

                <View style={styles.switchGroup}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Aktivizo Tingujt & Haptikën
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Tinguj të ndërfaqes, klikime taktile dhe dridhje konfirmuese
                      </Text>
                    </View>
                    <Switch
                      value={appSound}
                      onValueChange={handleToggleSound}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>
                </View>
              </View>

              {/* Cache and Storage Cleaning */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <HardDrive size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Memorja & Hapësira (Cache)
                  </Text>
                </View>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                  Liron kesh-in e imazheve të ruajtura në pajisje. Cilësimet dhe sesioni nuk preken.
                </Text>

                <View style={styles.cacheRow}>
                  <Pressable
                    style={[
                      styles.clearCacheBtn,
                      { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                      clearingCache && { opacity: 0.5 },
                    ]}
                    onPress={handleClearCache}
                    disabled={clearingCache}
                    hitSlop={8}
                  >
                    {clearingCache ? (
                      <ActivityIndicator size="small" color={brandHighlight} />
                    ) : (
                      <RefreshCw size={14} color={brandHighlight} />
                    )}
                    <Text style={[styles.clearCacheBtnText, { color: brandHighlight }]}>
                      {clearingCache ? 'Duke pastruar…' : 'Pastro Memorjen'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* App Info & Version */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Info size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Rreth Aplikacionit
                  </Text>
                </View>
                <View style={styles.appInfoRow}>
                  <Text style={[styles.appInfoLabel, { color: colors.textMuted }]}>Versioni:</Text>
                  <Text style={[styles.appInfoValue, { color: colors.textPrimary }]}>
                    v1.0.0 (Build 2026.09)
                  </Text>
                </View>
                <View style={styles.appInfoRow}>
                  <Text style={[styles.appInfoLabel, { color: colors.textMuted }]}>Platforma:</Text>
                  <Text style={[styles.appInfoValue, { color: colors.textPrimary }]}>
                    Bleje Pronën Mobile • Kosovë
                  </Text>
                </View>
                <View style={styles.appInfoRow}>
                  <Text style={[styles.appInfoLabel, { color: colors.textMuted }]}>Licenca:</Text>
                  <Text style={[styles.appInfoValue, { color: colors.textPrimary }]}>
                    Republika e Kosovës
                  </Text>
                </View>
              </View>

              {/* Çkyçu nga Llogaria */}
              {Boolean(currentUserId) && (
                <Pressable
                  style={[
                    styles.settingsLogoutBtn,
                    {
                      backgroundColor:
                        theme === 'white'
                          ? '#FEE2E2'
                          : theme === 'green'
                          ? 'rgba(239, 68, 68, 0.16)'
                          : '#241212',
                      borderColor:
                        theme === 'white'
                          ? '#FECACA'
                          : 'rgba(239, 68, 68, 0.35)',
                    },
                  ]}
                  onPress={() => requestLogout()}
                  hitSlop={8}
                >
                  <LogOut
                    size={17}
                    color={theme === 'green' ? '#FCA5A5' : '#EF4444'}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.settingsLogoutBtnText,
                      { color: theme === 'green' ? '#FCA5A5' : '#EF4444' },
                    ]}
                  >
                    Çkyçu nga llogaria
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    marginTop: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 14,
    padding: 3,
    borderWidth: 0.5,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  tabButtonText: {
    fontSize: 12,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  sectionGap: {
    gap: 16,
    paddingTop: 6,
  },
  card: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 0.5,
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  cardSubtitle: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    lineHeight: 18,
    marginBottom: 4,
  },
  formGap: {
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 14,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  deleteAccountActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
  },
  deleteAccountActionBtnText: {
    fontSize: 13.5,
    fontFamily: Fonts.bold,
  },
  switchGroup: {
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 12,
  },
  switchTextWrap: {
    flex: 1,
    gap: 2,
  },
  switchTitle: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  switchDesc: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },
  switchDivider: {
    height: 0.5,
    width: '100%',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  emailValue: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  emailHelp: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11.5,
    fontFamily: Fonts.bold,
  },
  pwdStrengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  pwdStrengthBar: {
    height: 4,
    borderRadius: 2,
  },
  pwdStrengthLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  actionButton: {
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    marginTop: 4,
  },
  actionButtonText: {
    fontSize: 13.5,
    fontFamily: Fonts.bold,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  themeBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
    position: 'relative',
  },
  themeBoxActive: {
    borderWidth: 2,
  },
  themeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  themeBoxTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  themeBoxDesc: {
    fontSize: 10.5,
    fontFamily: Fonts.regular,
  },
  themeCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cacheRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  clearCacheBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  clearCacheBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.bold,
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  appInfoLabel: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
  },
  appInfoValue: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
  },

  settingsLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  settingsLogoutBtnText: {
    fontSize: 13.5,
    fontFamily: Fonts.bold,
  },
  openSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  openSettingsBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.bold,
  },
})
