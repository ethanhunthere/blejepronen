import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
  Linking,
  KeyboardAvoidingView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
  UserCheck,
  UserCog,
  Edit3,
  X,
  ArrowRight,
  CheckCircle2,
  Mail,
  Phone,
  Plus,
  Sparkles,
  MessageSquare,
  Shield,
  PhoneCall,
  Layers,
  Camera,
  Image as ImageIcon,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts, ThemeMode } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useBanner } from '@/context/BannerContext'
import { apiDeleteAccount, apiVerifyOtp, apiResendCode } from '@/lib/api'
import {
  BLEJE_AVATARS,
  DEFAULT_AVATAR,
  getAvatarUri,
  getAvatarSource,
  persistUserAvatar,
  pickAvatarFromGallery,
  takeAvatarWithCamera,
  uploadCustomAvatar,
  subscribeAvatarChange,
} from '@/lib/avatars'
import { playThemeSound, playSuccessSound, playTapSound } from '@/lib/sound'
import { requestShpalljetFilter } from '@/lib/nav-intent'
import { fetchFavoriteIds, clearFavoritesCache } from '@/lib/favorites'
import {
  getSyncAuthUser,
  getSyncProfile,
  isAuthCacheHydrated,
  subscribeAuthCache,
  setSyncProfile,
  syncAuthSession,
  isLogoutInProgress,
  performAtomicLogout,
} from '@/lib/auth-cache'
import { createSafeChannel } from '@/lib/realtime'

export default function ProfileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, theme, setTheme } = useTheme()
  const { showBanner } = useBanner()

  const syncUser = getSyncAuthUser()
  const syncProfile = getSyncProfile()
  const [authState, setAuthState] = useState<{ user: any; profile: any } | null>(() => {
    if (syncUser) {
      return { user: syncUser, profile: syncProfile }
    }
    return null
  })
  const [loading, setLoading] = useState(() => !isAuthCacheHydrated())
  const [deleting, setDeleting] = useState(false)

  // Imperative ScrollView reference and reset coordination
  const mainScrollViewRef = useRef<ScrollView>(null)
  const shouldResetScrollRef = useRef(false)

  /**
   * Deterministic multi-pass viewport reset to absolute top (y: 0).
   * Ensures instant deceleration halt, handles React layout reconciliation,
   * and prevents iOS/Android from clamping scroll offset to the bottom when
   * authenticated view transitions to guest view.
   */
  const resetViewportToTop = useCallback((animated: boolean = false) => {
    shouldResetScrollRef.current = true

    // Pass 1: Immediate synchronous scroll dispatch (halts any momentum deceleration)
    mainScrollViewRef.current?.scrollTo({ x: 0, y: 0, animated })

    // Pass 2: Next animation frame during React commit phase
    requestAnimationFrame(() => {
      mainScrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false })
    })

    // Pass 3: Post-reconciliation microtask after native layout measurement
    setTimeout(() => {
      mainScrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false })
    }, 50)

    // Pass 4: Defensive delay to guarantee top position under heavy UI transitions
    setTimeout(() => {
      mainScrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false })
    }, 150)
  }, [])

  // Synchronize with global auth cache updates
  useEffect(() => {
    const unsubscribeAuth = subscribeAuthCache((state) => {
      if (state.user) {
        setAuthState({ user: state.user, profile: state.profile })
      } else {
        setAuthState((prev) => {
          if (prev?.user) {
            resetViewportToTop(false)
          }
          return null
        })
      }
      setLoading(false)
    })
    return unsubscribeAuth
  }, [resetViewportToTop])

  // Live account metrics (active listings, saved favorites, open conversations)
  const [stats, setStats] = useState({
    listingsCount: 0,
    savedCount: 0,
    messagesCount: 0,
  })

  // Last known user ref to keep session checks stable
  const prevUserRef = useRef<any>(null)

  // Derived accessors
  const currentUser = authState?.user || null
  const dbProfile = authState?.profile || null
  const authResolved = !loading

  // Track previous authenticated user state for scroll reset on auth lifecycle transitions
  const hasMountedRef = useRef(false)
  const prevAuthUserRef = useRef<any>(currentUser)

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      prevAuthUserRef.current = currentUser
      return
    }

    // When auth state toggles between authenticated and unauthenticated
    if (Boolean(prevAuthUserRef.current) !== Boolean(currentUser)) {
      resetViewportToTop(false)
    }
    prevAuthUserRef.current = currentUser
  }, [currentUser, resetViewportToTop])

  // Avatar Quick Picker Modal
  const [avatarModalVisible, setAvatarModalVisible] = useState(false)
  const [updatingAvatar, setUpdatingAvatar] = useState(false)
  const [avatarCacheBuster, setAvatarCacheBuster] = useState<number | undefined>(undefined)

  const rawAvatar =
    dbProfile?.avatar_url ||
    currentUser?.user_metadata?.avatar_url ||
    currentUser?.user_metadata?.avatarUrl ||
    null
  const avatarSource = useMemo(
    () => getAvatarSource(rawAvatar, avatarCacheBuster),
    [rawAvatar, avatarCacheBuster]
  )
  const avatarUri = useMemo(
    () => getAvatarUri(rawAvatar, avatarCacheBuster),
    [rawAvatar, avatarCacheBuster]
  )

  // Real-time synchronization for avatar changes across screens
  useEffect(() => {
    const unsubscribe = subscribeAvatarChange((newAvatarUrl) => {
      setAvatarCacheBuster(Date.now())
      setAuthState((prev) => {
        if (!prev) return prev
        return {
          user: {
            ...prev.user,
            user_metadata: { ...prev.user?.user_metadata, avatar_url: newAvatarUrl, avatarUrl: newAvatarUrl },
          },
          profile: prev.profile ? { ...prev.profile, avatar_url: newAvatarUrl } : prev.profile,
        }
      })
    })
    return () => {
      unsubscribe()
    }
  }, [])

  // Account Verification Modal & OTP
  const [verifyModalVisible, setVerifyModalVisible] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [resendingCode, setResendingCode] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const resendTimerRef = useRef<any>(null)

  // Fetch the DB profile row for the given user
  const fetchProfile = async (user: any): Promise<any> => {
    if (!user) return null
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      return data || null
    } catch (e) {
      console.warn('Fetch user profile record notice:', e)
      return null
    }
  }

  // Set BOTH user and profile in a single atomic state update
  const setAuthAndProfile = useCallback((user: any, profile: any) => {
    prevUserRef.current = user || null
    setAuthState(user ? { user, profile } : null)
  }, [])

  // Fetch live stats in background
  const fetchUserStats = useCallback(async (userId: string) => {
    try {
      const [listingsRes, favsMap, convosRes] = await Promise.all([
        supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        fetchFavoriteIds().catch(() => ({})),
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),
      ])

      const listingsCount = listingsRes.count || 0
      const favs = (favsMap || {}) as Record<string, boolean>
      const savedCount = Object.keys(favs).filter((k) => favs[k]).length
      const messagesCount = convosRes.count || 0

      setStats({ listingsCount, savedCount, messagesCount })
    } catch (err) {
      console.warn('Fetch user stats notice:', err)
    }
  }, [])

  const checkSession = useCallback(async () => {
    if (isLogoutInProgress()) {
      setAuthState(null)
      setLoading(false)
      return
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (isLogoutInProgress()) {
        setAuthState(null)
        return
      }

      const user = session?.user || null

      if (user) {
        const profile = await fetchProfile(user)
        if (isLogoutInProgress()) return
        setAuthAndProfile(user, profile)
        fetchUserStats(user.id)
      } else if (!user) {
        setAuthState((prev) => {
          if (prev?.user) {
            resetViewportToTop(false)
          }
          return null
        })
      }
    } catch (err) {
      console.warn('Session check notice:', err)
    } finally {
      setLoading(false)
    }
  }, [setAuthAndProfile, fetchUserStats, resetViewportToTop])

  // Auto-refresh profile and stats when screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (isLogoutInProgress()) return
      checkSession()
      const syncU = getSyncAuthUser()
      if (syncU?.id) {
        fetchUserStats(syncU.id)
      }
    }, [checkSession, fetchUserStats])
  )

  useEffect(() => {
    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isLogoutInProgress()) {
        setAuthState(null)
        return
      }
      const u = session?.user || null
      if (u) {
        const profile = await fetchProfile(u)
        if (isLogoutInProgress()) return
        setAuthAndProfile(u, profile)
        fetchUserStats(u.id)
      } else {
        setAuthState((prev) => {
          if (prev?.user) {
            resetViewportToTop(false)
          }
          return null
        })
      }
    })

    return () => {
      authListener?.subscription?.unsubscribe()
      if (resendTimerRef.current) clearInterval(resendTimerRef.current)
    }
  }, [checkSession, fetchUserStats, resetViewportToTop])

  // Real-time synchronization for profile database changes
  useEffect(() => {
    if (!currentUser?.id) return

    let channel: any = null
    try {
      channel = createSafeChannel(`profile_realtime_${currentUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${currentUser.id}`,
          },
          (payload) => {
            if (payload.new && typeof payload.new === 'object') {
              const updatedProfile = payload.new as any
              setSyncProfile(updatedProfile)
              setAuthState((prev) => {
                if (!prev) return prev
                return {
                  ...prev,
                  profile: { ...prev.profile, ...updatedProfile },
                }
              })
            }
          }
        )
        .subscribe()
    } catch (e) {
      console.warn('Profile realtime notice:', e)
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [currentUser?.id])

  // Instant 1-tap preset avatar selector
  const handleSelectAvatarPreset = async (newAvatarUrl: string) => {
    if (!currentUser) return
    if (updatingAvatar) return

    setAvatarModalVisible(false)

    playSuccessSound()
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
    setUpdatingAvatar(true)

    const previousAvatar = rawAvatar
    const newBuster = Date.now()
    setAvatarCacheBuster(newBuster)

    // Immediate optimistic UI update
    setAuthState((prev) => {
      if (!prev) return prev
      return {
        user: {
          ...prev.user,
          user_metadata: { ...prev.user?.user_metadata, avatar_url: newAvatarUrl, avatarUrl: newAvatarUrl },
        },
        profile: prev.profile ? { ...prev.profile, avatar_url: newAvatarUrl } : prev.profile,
      }
    })

    try {
      await persistUserAvatar({
        userId: currentUser.id,
        avatarUrl: newAvatarUrl,
        userMetadata: currentUser.user_metadata,
        existingProfile: dbProfile,
      })

      showBanner({
        type: 'success',
        title: 'Avatari u Përditësua!',
        message: 'Avatari juaj i ri është aktiv menjëherë në të gjithë platformën.',
      })
    } catch (err: any) {
      console.error('Preset avatar update error:', err)
      // Rollback optimistic update
      setAuthState((prev) => {
        if (!prev) return prev
        return {
          user: {
            ...prev.user,
            user_metadata: { ...prev.user?.user_metadata, avatar_url: previousAvatar, avatarUrl: previousAvatar },
          },
          profile: prev.profile ? { ...prev.profile, avatar_url: previousAvatar } : prev.profile,
        }
      })
      showBanner({
        type: 'error',
        title: 'Dështoi Përditësimi',
        message: err?.message || 'Ndodhi një gabim gjatë ruajtjes së avatarit. Ju lutemi provoni përsëri.',
      })
    } finally {
      setUpdatingAvatar(false)
    }
  }

  // Alias for backward compatibility
  const handleSelectAvatarQuick = handleSelectAvatarPreset

  // Pick Custom Avatar from Gallery (Native 1:1 Aspect Ratio Cropping & Hardware Acceleration)
  const handlePickCustomAvatar = async () => {
    if (!currentUser) return
    if (updatingAvatar) return

    const previousAvatar = rawAvatar

    if (Platform.OS !== 'web') {
      Haptics.selectionAsync()
    }

    // 1. Immediately dismiss modal so iOS/Android view controllers can transition cleanly
    setAvatarModalVisible(false)

    // Give native UIViewController 120ms to complete dismissal animation
    await new Promise((resolve) => setTimeout(resolve, 120))

    try {
      const asset = await pickAvatarFromGallery()
      if (!asset) return

      setUpdatingAvatar(true)

      // 2. Hardware-accelerated native downsampling in ~15ms
      const { optimizeAvatarImage } = await import('@/lib/avatars')
      let localOptimizedUri = asset.uri
      try {
        const opt = await optimizeAvatarImage(asset.uri, asset.width, asset.height)
        localOptimizedUri = opt.uri
      } catch (optErr) {
        console.warn('Native optimize fallback:', optErr)
      }

      const newBuster = Date.now()
      setAvatarCacheBuster(newBuster)

      // 3. Immediate Frame 0 optimistic preview with optimized local file (<50ms!)
      setAuthState((prev) => {
        if (!prev) return prev
        return {
          user: {
            ...prev.user,
            user_metadata: { ...prev.user?.user_metadata, avatar_url: localOptimizedUri, avatarUrl: localOptimizedUri },
          },
          profile: prev.profile ? { ...prev.profile, avatar_url: localOptimizedUri } : prev.profile,
        }
      })

      // Sync in-memory auth-cache immediately for global instant reflection
      try {
        const { getSyncProfile, setSyncProfile } = await import('@/lib/auth-cache')
        const current = getSyncProfile()
        if (current) {
          setSyncProfile({ ...current, avatar_url: localOptimizedUri })
        }
      } catch {}

      // 4. Background upload of the ~35KB optimized image
      const uploadRes = await uploadCustomAvatar({
        userId: currentUser.id,
        asset: { ...asset, uri: localOptimizedUri },
        userMetadata: currentUser.user_metadata,
        existingProfile: dbProfile,
      })

      playSuccessSound()
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }

      // 5. Seamlessly sync state with permanent remote URL
      setAuthState((prev) => {
        if (!prev) return prev
        return {
          user: {
            ...prev.user,
            user_metadata: { ...prev.user?.user_metadata, avatar_url: uploadRes.avatarUrl, avatarUrl: uploadRes.avatarUrl },
          },
          profile: prev.profile ? { ...prev.profile, avatar_url: uploadRes.avatarUrl } : prev.profile,
        }
      })

      showBanner({
        type: 'success',
        title: 'Fotoja u Ngarkua!',
        message: 'Fotoja juaj e re e profilit u ruajt me sukses.',
      })
    } catch (err: any) {
      console.error('Pick custom avatar error:', err)
      // Rollback optimistic state
      setAuthState((prev) => {
        if (!prev) return prev
        return {
          user: {
            ...prev.user,
            user_metadata: { ...prev.user?.user_metadata, avatar_url: previousAvatar, avatarUrl: previousAvatar },
          },
          profile: prev.profile ? { ...prev.profile, avatar_url: previousAvatar } : prev.profile,
        }
      })
      showBanner({
        type: 'error',
        title: 'Dështoi Ngarkimi',
        message: err?.message || 'Ndodhi një gabim gjatë ngarkimit të fotos. Ju lutemi provoni përsëri.',
      })
    } finally {
      setUpdatingAvatar(false)
    }
  }

  // Take Custom Avatar with Camera (Native 1:1 Aspect Ratio Cropping & Hardware Acceleration)
  const handleTakeCustomAvatar = async () => {
    if (!currentUser) return
    if (updatingAvatar) return

    const previousAvatar = rawAvatar

    if (Platform.OS !== 'web') {
      Haptics.selectionAsync()
    }

    // 1. Immediately dismiss modal so camera intent/view controller can launch smoothly
    setAvatarModalVisible(false)

    // Give native window 120ms to complete dismissal
    await new Promise((resolve) => setTimeout(resolve, 120))

    try {
      const asset = await takeAvatarWithCamera()
      if (!asset) return

      setUpdatingAvatar(true)

      // 2. Hardware-accelerated native downsampling in ~15ms
      const { optimizeAvatarImage } = await import('@/lib/avatars')
      let localOptimizedUri = asset.uri
      try {
        const opt = await optimizeAvatarImage(asset.uri, asset.width, asset.height)
        localOptimizedUri = opt.uri
      } catch (optErr) {
        console.warn('Native optimize fallback:', optErr)
      }

      const newBuster = Date.now()
      setAvatarCacheBuster(newBuster)

      // 3. Immediate Frame 0 optimistic preview with captured image (<50ms!)
      setAuthState((prev) => {
        if (!prev) return prev
        return {
          user: {
            ...prev.user,
            user_metadata: { ...prev.user?.user_metadata, avatar_url: localOptimizedUri, avatarUrl: localOptimizedUri },
          },
          profile: prev.profile ? { ...prev.profile, avatar_url: localOptimizedUri } : prev.profile,
        }
      })

      // Sync in-memory auth-cache immediately for global instant reflection
      try {
        const { getSyncProfile, setSyncProfile } = await import('@/lib/auth-cache')
        const current = getSyncProfile()
        if (current) {
          setSyncProfile({ ...current, avatar_url: localOptimizedUri })
        }
      } catch {}

      // 4. Background upload of the ~35KB optimized image
      const uploadRes = await uploadCustomAvatar({
        userId: currentUser.id,
        asset: { ...asset, uri: localOptimizedUri },
        userMetadata: currentUser.user_metadata,
        existingProfile: dbProfile,
      })

      playSuccessSound()
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }

      // 5. Permanent remote URL sync
      setAuthState((prev) => {
        if (!prev) return prev
        return {
          user: {
            ...prev.user,
            user_metadata: { ...prev.user?.user_metadata, avatar_url: uploadRes.avatarUrl, avatarUrl: uploadRes.avatarUrl },
          },
          profile: prev.profile ? { ...prev.profile, avatar_url: uploadRes.avatarUrl } : prev.profile,
        }
      })

      showBanner({
        type: 'success',
        title: 'Fotoja u Ngarkua!',
        message: 'Fotoja juaj e re e profilit u ruajt me sukses.',
      })
    } catch (err: any) {
      console.error('Take custom avatar error:', err)
      // Rollback optimistic state
      setAuthState((prev) => {
        if (!prev) return prev
        return {
          user: {
            ...prev.user,
            user_metadata: { ...prev.user?.user_metadata, avatar_url: previousAvatar, avatarUrl: previousAvatar },
          },
          profile: prev.profile ? { ...prev.profile, avatar_url: previousAvatar } : prev.profile,
        }
      })
      showBanner({
        type: 'error',
        title: 'Dështoi Fotoja',
        message: err?.message || 'Ndodhi një gabim gjatë realizimit të fotos. Ju lutemi provoni përsëri.',
      })
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

      await supabase.from('profiles').update({ email_verified: true }).eq('id', currentUser.id)
      await supabase.auth.updateUser({ data: { email_verified: true } })

      setAuthState((prev) => {
        if (!prev) return prev
        const updatedProfile = { ...prev.profile, email_verified: true }
        const updatedUser = {
          ...prev.user,
          user_metadata: { ...prev.user?.user_metadata, email_verified: true },
        }
        return { user: updatedUser, profile: updatedProfile }
      })

      playSuccessSound()
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      setVerifyModalVisible(false)
      setOtpCode('')

      showBanner({
        type: 'success',
        title: 'Llogaria u Verifikua!',
        message: 'Llogaria juaj mori statusin zyrtar të verifikuar me sukses.',
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
          // 1. Immediately reset viewport to top (y: 0) to prevent anchoring at the bottom
          resetViewportToTop(false)
          // 2. Synchronously nullify local state, stats, and query caches
          prevUserRef.current = null
          setStats({ listingsCount: 0, savedCount: 0, messagesCount: 0 })
          setAuthState(null)
          clearFavoritesCache()
          // 3. Run atomic logout (locks auth listeners, purges caches, and signs out in a single pass)
          await performAtomicLogout()
          // 4. Final verification pass
          resetViewportToTop(false)
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

              // 1. Immediately reset viewport to top (y: 0) to prevent anchoring at the bottom
              resetViewportToTop(false)
              prevUserRef.current = null
              setStats({ listingsCount: 0, savedCount: 0, messagesCount: 0 })
              setAuthState(null)
              clearFavoritesCache()
              await performAtomicLogout()
              resetViewportToTop(false)
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

  const handleContactSupport = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    Alert.alert(
      'Mbështetja Teknike Bleje Pronën',
      'Zgjidhni mënyrën si dëshironi të kontaktoni ekipin tonë në Prishtinë:',
      [
        {
          text: 'WhatsApp (+383 49 100 200)',
          onPress: () => {
            Linking.openURL(
              'https://wa.me/38349100200?text=P%C3%ABrsh%C3%ABndetje%20Bleje%20Pron%C3%ABn%2C%20kam%20nj%C3%AB%20pyetje%20p%C3%ABr%20llogarin%C3%AB.'
            ).catch(() => {})
          },
        },
        {
          text: 'Email (support@blejepronen.com)',
          onPress: () => {
            Linking.openURL(
              'mailto:support@blejepronen.com?subject=Ndihm%C3%AB%20nga%20Aplikacioni%20Bleje%20Pron%C3%ABn'
            ).catch(() => {})
          },
        },
        { text: 'Mbyll', style: 'cancel' },
      ]
    )
  }

  const handleOpenLegal = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    Alert.alert(
      'Kushtet e Përdorimit & Privatësia',
      'Bleje Pronën është platforma imobiliare e certifikuar në Republikën e Kosovës.\n\n• Mbrojtje e rreptë e të dhënave personale (GDPR-compliant).\n• Verifikim i rreptë i NIPT / NUI për agjencitë.\n• Moderim i rregullt i pronave për të parandaluar mashtrimet.\n\n© 2026 Bleje Pronën SH.P.K. Të gjitha të drejtat të rezervuara.',
      [{ text: 'E kuptova', style: 'default' }]
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

  // Account categorization
  const isCompany =
    dbProfile?.account_type === 'company' ||
    currentUser?.user_metadata?.account_type === 'company' ||
    currentUser?.user_metadata?.is_company === true ||
    !!currentUser?.user_metadata?.company_name

  const companyName =
    dbProfile?.company_name ||
    currentUser?.user_metadata?.company_name ||
    ''

  const emailConfirmed = Boolean(
    dbProfile?.email_verified === true ||
      currentUser?.email_confirmed_at ||
      currentUser?.confirmed_at ||
      currentUser?.user_metadata?.email_verified === true
  )

  const isProfileComplete = Boolean(
    dbProfile?.first_name &&
      dbProfile?.last_name &&
      dbProfile?.phone &&
      (isCompany ? dbProfile?.company_name : true)
  )

  const isVerified = emailConfirmed && isProfileComplete

  const primaryBtnText =
    theme === 'green' ? '#071C18' : theme === 'black' ? '#071A14' : '#FFFFFF'

  const specularBorder = colors.border

  // ─── Verification Center Rows ─────────────────────────────────────────
  const vcMeta = (currentUser?.user_metadata || {}) as Record<string, any>
  const vcEmailDone = emailConfirmed
  const vcIdentityDone = isCompany
    ? Boolean(
        (vcMeta.contact_person ||
          (dbProfile?.last_name && dbProfile.last_name !== 'Kompani')) &&
          (vcMeta.nipt || dbProfile?.nipt)
      )
    : Boolean(
        (dbProfile?.first_name && dbProfile?.last_name) ||
          (vcMeta.first_name && vcMeta.last_name)
      )
  const vcPhoneDone = Boolean(
    dbProfile?.phone || vcMeta.phone || vcMeta.company_phone || vcMeta.individual_phone
  )

  const vcRows = [
    {
      key: 'email',
      icon: Mail,
      title: 'Adresa Email',
      desc: isCompany
        ? 'Verifikoni email-in zyrtar të biznesit me kod 6-shifror'
        : 'Konfirmoni që email-i juaj është aktiv dhe i mbrojtur',
      done: vcEmailDone,
      cta: 'Verifiko',
      action: () => setVerifyModalVisible(true),
    },
    {
      key: 'identity',
      icon: isCompany ? Building2 : UserCheck,
      title: isCompany ? 'Të Dhënat e Biznesit & NIPT' : 'Emri & Mbiemri Zyrtar',
      desc: isCompany
        ? 'Personi kontaktues dhe numri unik i biznesit (NIPT / NUI)'
        : 'Identiteti zyrtar para blerësve dhe pronarëve',
      done: vcIdentityDone,
      cta: 'Plotëso',
      action: () => router.push('/completo-profilin' as any),
    },
    {
      key: 'phone',
      icon: Phone,
      title: isCompany ? 'Telefoni i Agjencisë' : 'Numri i Telefonit & WhatsApp',
      desc: 'Mundëson kontakt të shpejtë me thirrje direkte dhe WhatsApp',
      done: vcPhoneDone,
      cta: 'Plotëso',
      action: () => router.push('/completo-profilin' as any),
    },
  ]

  const vcDoneCount = vcRows.filter((row) => row.done).length
  const vcAllDone = vcDoneCount === vcRows.length
  const vcProgress = Math.round((vcDoneCount / vcRows.length) * 100)

  const displayName = isCompany
    ? (companyName || currentUser?.user_metadata?.first_name || 'Agjenci Imobiliare')
    : (dbProfile?.first_name
        ? `${dbProfile.first_name} ${dbProfile.last_name || ''}`.trim()
        : currentUser?.user_metadata?.first_name
        ? `${currentUser.user_metadata.first_name} ${currentUser.user_metadata.last_name || ''}`.trim()
        : 'Përdorues i regjistruar')

  const hour = new Date().getHours()
  const greetingText =
    hour >= 5 && hour < 12
      ? 'Mirëmëngjes'
      : hour >= 12 && hour < 18
      ? 'Mirëdita'
      : 'Mirëmbrëma'

  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 24 : 16)

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ─── 1. TOP HEADER BAR ─── */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerGreeting, { color: colors.textMuted }]}>
            {!authResolved
              ? ' '
              : currentUser
              ? `${greetingText}`
              : 'Mirësevini në Bleje Pronën'}
          </Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {!authResolved
              ? 'Profili'
              : currentUser
              ? (isCompany
                  ? companyName || 'Agjenci Imobiliare'
                  : dbProfile?.first_name || currentUser?.user_metadata?.first_name || 'Profili Im')
              : 'Llogaria Juaj'}
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
            hitSlop={10}
          >
            <Settings size={19} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={mainScrollViewRef}
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: 110 + bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onContentSizeChange={(_w, _h) => {
          if (shouldResetScrollRef.current) {
            mainScrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false })
            shouldResetScrollRef.current = false
          }
        }}
      >
        {/* ─── 2. IDENTITY HERO CARD ─── */}
        {!authResolved ? (
          <View
            style={[
              styles.profileHeroCard,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
          >
            <View style={[styles.skeletonAvatar, { backgroundColor: colors.surfaceSubtle }]} />
            <View style={styles.skeletonTextWrap}>
              <View style={[styles.skeletonLine, { width: '60%', backgroundColor: colors.surfaceSubtle }]} />
              <View style={[styles.skeletonLine, { width: '40%', height: 10, backgroundColor: colors.surfaceSubtle }]} />
              <View style={[styles.skeletonLine, { width: '75%', height: 10, backgroundColor: colors.surfaceSubtle }]} />
            </View>
          </View>
        ) : currentUser ? (
          <View
            style={[
              styles.profileHeroCard,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
          >
            <View style={styles.heroMainRow}>
              {/* Luxury Avatar with Camera/Edit Glyphs */}
              <Pressable
                style={[
                  styles.heroAvatarWrap,
                  {
                    borderColor: isCompany
                      ? theme === 'green' ? colors.gold : colors.primary
                      : isVerified
                      ? '#10B981'
                      : '#D97706',
                    backgroundColor: colors.surfaceSubtle,
                  },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  setAvatarModalVisible(true)
                }}
              >
                <Image
                  source={avatarSource}
                  style={styles.heroAvatarImg}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  priority="high"
                  transition={0}
                />
                {updatingAvatar && (
                  <View style={styles.heroAvatarLoadingOverlay}>
                    <ActivityIndicator
                      size="small"
                      color={theme === 'green' ? colors.gold : colors.primary}
                    />
                  </View>
                )}
                <View
                  style={[
                    styles.avatarEditBadge,
                    {
                      backgroundColor: theme === 'green' ? colors.gold : colors.primary,
                      borderColor: colors.surface,
                    },
                  ]}
                >
                  <Camera
                    size={11}
                    color={theme === 'green' ? '#071C18' : '#FFFFFF'}
                    strokeWidth={2.4}
                  />
                </View>
              </Pressable>

              {/* Identity Details */}
              <View style={styles.heroInfoCol}>
                <View style={styles.heroNameRow}>
                  <Text style={[styles.heroUserName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                </View>

                {/* Account Category & Official Verification Badge */}
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.heroStatusBadge,
                      isVerified
                        ? isCompany
                          ? {
                              backgroundColor:
                                theme === 'white' ? '#FEF3C7' : 'rgba(200, 184, 130, 0.18)',
                              borderColor:
                                theme === 'white' ? '#FDE68A' : 'rgba(200, 184, 130, 0.35)',
                            }
                          : {
                              backgroundColor:
                                theme === 'white' ? '#DCFCE7' : 'rgba(16, 185, 129, 0.16)',
                              borderColor:
                                theme === 'white' ? '#BBF7D0' : 'rgba(16, 185, 129, 0.35)',
                            }
                        : {
                            backgroundColor:
                              theme === 'white' ? '#FEF3C7' : 'rgba(245, 158, 11, 0.16)',
                            borderColor:
                              theme === 'white' ? '#FDE68A' : 'rgba(245, 158, 11, 0.35)',
                          },
                    ]}
                  >
                    {isCompany ? (
                      isVerified ? (
                        <>
                          <Building2
                            size={12}
                            color={theme === 'white' ? '#B45309' : '#FBBF24'}
                            strokeWidth={2.4}
                          />
                          <Text
                            style={[
                              styles.heroStatusBadgeText,
                              { color: theme === 'white' ? '#B45309' : '#FBBF24' },
                            ]}
                          >
                            Agjenci e Verifikuar
                          </Text>
                        </>
                      ) : (
                        <>
                          <Building2 size={12} color="#F59E0B" strokeWidth={2.4} />
                          <Text
                            style={[
                              styles.heroStatusBadgeText,
                              { color: theme === 'white' ? '#B45309' : '#F59E0B' },
                            ]}
                          >
                            Agjenci Imobiliare
                          </Text>
                        </>
                      )
                    ) : isVerified ? (
                      <>
                        <ShieldCheck size={12} color="#10B981" strokeWidth={2.4} />
                        <Text
                          style={[
                            styles.heroStatusBadgeText,
                            { color: theme === 'white' ? '#047857' : '#10B981' },
                          ]}
                        >
                          Profil i Verifikuar
                        </Text>
                      </>
                    ) : (
                      <>
                        <User size={12} color="#F59E0B" strokeWidth={2.4} />
                        <Text
                          style={[
                            styles.heroStatusBadgeText,
                            { color: theme === 'white' ? '#B45309' : '#F59E0B' },
                          ]}
                        >
                          Llogari Personale
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Subtitle / Company Representative */}
                {isCompany && (dbProfile?.last_name || currentUser?.user_metadata?.first_name) ? (
                  <Text style={[styles.heroSubText, { color: colors.textSecondary }]} numberOfLines={1}>
                    Përfaqësuesi: {currentUser?.user_metadata?.first_name || dbProfile?.last_name}
                  </Text>
                ) : null}

                {/* Email / Contact tag */}
                <Text style={[styles.heroEmailText, { color: colors.textMuted }]} numberOfLines={1}>
                  {currentUser.email}
                </Text>
              </View>
            </View>

            {/* Quick Action Button: Ndrysho Profilin */}
            <View style={styles.heroActionsRow}>
              <Pressable
                style={[
                  styles.heroEditBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: specularBorder,
                  },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  router.push('/completo-profilin' as any)
                }}
              >
                <View style={styles.heroEditBtnLeft}>
                  <UserCog
                    size={15}
                    color={theme === 'green' ? colors.gold : colors.primary}
                    strokeWidth={2.2}
                  />
                  <Text style={[styles.heroEditBtnText, { color: colors.textPrimary }]}>
                    Ndrysho Profilin & të Dhënat
                  </Text>
                </View>
                <ChevronRight size={15} color={colors.textMuted} />
              </Pressable>

              <Pressable
                style={[
                  styles.heroAvatarQuickBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: specularBorder,
                  },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  setAvatarModalVisible(true)
                }}
                hitSlop={8}
              >
                <Sparkles
                  size={15}
                  color={theme === 'green' ? colors.gold : colors.primary}
                  strokeWidth={2.2}
                />
              </Pressable>
            </View>
          </View>
        ) : (
          /* ─── GUEST INVITATION CARD ─── */
          <View
            style={[
              styles.guestHeroCard,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
          >
            <View
              style={[
                styles.guestIconBox,
                {
                  backgroundColor:
                    theme === 'green' ? 'rgba(200, 184, 130, 0.18)' : colors.primaryLight,
                },
              ]}
            >
              <Building2
                size={32}
                color={theme === 'green' ? colors.gold : colors.primary}
                strokeWidth={2.2}
              />
            </View>

            <Text style={[styles.guestTitle, { color: colors.textPrimary }]}>
              Mirësevini në Bleje Pronën
            </Text>
            <Text style={[styles.guestSubtitle, { color: colors.textMuted }]}>
              Platforma më prestigjioze e patundshmërive në Kosovë & rajon. Kyçuni për të menaxhuar shpalljet dhe ruajtur pronat e preferuara.
            </Text>

            <View style={styles.guestButtonsRow}>
              <Pressable
                style={[styles.guestPrimaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => openAuthModal('login')}
              >
                <LogIn size={16} color={primaryBtnText} strokeWidth={2.4} />
                <Text style={[styles.guestPrimaryBtnText, { color: primaryBtnText }]}>
                  Kyçu
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.guestSecondaryBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => openAuthModal('register')}
              >
                <UserPlus size={16} color={colors.textPrimary} strokeWidth={2.2} />
                <Text style={[styles.guestSecondaryBtnText, { color: colors.textPrimary }]}>
                  Regjistrohu
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ─── 3. 3-COLUMN METRICS COMMAND BAR (Instagram / Compass Standard) ─── */}
        {currentUser && (
          <View style={styles.metricsGrid}>
            {/* Metric 1: Shpalljet e Mia */}
            <Pressable
              style={[
                styles.metricCard,
                { backgroundColor: colors.surface, borderColor: specularBorder },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync()
                requestShpalljetFilter('all')
                router.push('/shpalljet-e-mia' as any)
              }}
            >
              <View style={[styles.metricIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Building2 size={17} color={colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                {stats.listingsCount}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Shpalljet e Mia
              </Text>
              <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                Menaxho
              </Text>
            </Pressable>

            {/* Metric 2: Pronat e Ruajtura */}
            <Pressable
              style={[
                styles.metricCard,
                { backgroundColor: colors.surface, borderColor: specularBorder },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync()
                requestShpalljetFilter('saved')
                router.push({ pathname: '/shpalljet-e-mia', query: { filter: 'saved' } } as any)
              }}
            >
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <Heart size={17} color="#EF4444" strokeWidth={2.2} />
              </View>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                {stats.savedCount}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Të Ruajturat
              </Text>
              <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                Favoritet
              </Text>
            </Pressable>

            {/* Metric 3: Bisedat Aktive */}
            <Pressable
              style={[
                styles.metricCard,
                { backgroundColor: colors.surface, borderColor: specularBorder },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync()
                router.push('/(tabs)/messages' as any)
              }}
            >
              <View
                style={[
                  styles.metricIconWrap,
                  {
                    backgroundColor:
                      theme === 'green' ? 'rgba(200, 184, 130, 0.2)' : 'rgba(59, 130, 246, 0.12)',
                  },
                ]}
              >
                <MessageSquare
                  size={17}
                  color={theme === 'green' ? colors.gold : '#3B82F6'}
                  strokeWidth={2.2}
                />
              </View>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                {stats.messagesCount}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Mesazhet
              </Text>
              <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                Bisedat
              </Text>
            </Pressable>
          </View>
        )}

        {/* ─── 4. TRUST & VERIFICATION CENTER (Apple Settings Grade) ─── */}
        {currentUser && !vcAllDone && (
          <View
            style={[
              styles.vcCard,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
          >
            {/* Card Header */}
            <View style={styles.vcHeader}>
              <View
                style={[
                  styles.vcHeaderIcon,
                  {
                    backgroundColor:
                      theme === 'green' ? 'rgba(200, 184, 130, 0.18)' : colors.primaryLight,
                  },
                ]}
              >
                <ShieldCheck
                  size={18}
                  color={theme === 'green' ? colors.gold : colors.primary}
                  strokeWidth={2.4}
                />
              </View>

              <View style={styles.vcHeaderText}>
                <Text style={[styles.vcTitle, { color: colors.textPrimary }]}>
                  Qendra e Verifikimit
                </Text>
                <Text style={[styles.vcSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                  {isCompany
                    ? 'Plotësoni hapat për statusin «Agjenci e Verifikuar»'
                    : 'Plotësoni hapat për statusin «Profil i Verifikuar»'}
                </Text>
              </View>

              <View
                style={[
                  styles.vcCountPill,
                  {
                    backgroundColor:
                      theme === 'white'
                        ? 'rgba(0, 103, 91, 0.08)'
                        : 'rgba(255, 255, 255, 0.08)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.vcCountText,
                    { color: theme === 'green' ? colors.gold : colors.primary },
                  ]}
                >
                  {vcDoneCount}/{vcRows.length}
                </Text>
              </View>
            </View>

            {/* Micro Progress Track */}
            <View
              style={[
                styles.vcProgressTrack,
                {
                  backgroundColor:
                    theme === 'white' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
                },
              ]}
            >
              <View
                style={[
                  styles.vcProgressFill,
                  {
                    width: `${vcProgress}%`,
                    backgroundColor: theme === 'green' ? colors.gold : colors.primary,
                  },
                ]}
              />
            </View>

            {/* Step Rows */}
            {vcRows.map((row, idx) => (
              <React.Fragment key={row.key}>
                {idx > 0 && (
                  <View style={[styles.vcDivider, { backgroundColor: colors.borderSubtle }]} />
                )}
                <Pressable
                  style={styles.vcRow}
                  onPress={() => {
                    if (row.done) return
                    if (Platform.OS !== 'web') Haptics.selectionAsync()
                    row.action()
                  }}
                  disabled={row.done}
                >
                  <View
                    style={[
                      styles.vcRowIcon,
                      {
                        backgroundColor: row.done
                          ? theme === 'white'
                            ? '#DCFCE7'
                            : 'rgba(16, 185, 129, 0.16)'
                          : theme === 'white'
                          ? '#FEF3C7'
                          : 'rgba(245, 158, 11, 0.14)',
                      },
                    ]}
                  >
                    {row.done ? (
                      <CheckCircle2 size={16} color="#10B981" strokeWidth={2.4} />
                    ) : (
                      <row.icon size={16} color="#F59E0B" strokeWidth={2.4} />
                    )}
                  </View>

                  <View style={styles.vcRowText}>
                    <Text style={[styles.vcRowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {row.title}
                    </Text>
                    <Text style={[styles.vcRowDesc, { color: colors.textMuted }]} numberOfLines={1}>
                      {row.desc}
                    </Text>
                  </View>

                  {row.done ? (
                    <View
                      style={[
                        styles.vcDonePill,
                        {
                          backgroundColor:
                            theme === 'white' ? '#DCFCE7' : 'rgba(16, 185, 129, 0.16)',
                        },
                      ]}
                    >
                      <Text style={[styles.vcDonePillText, { color: '#10B981' }]}>
                        E kryer
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.vcTodoPill,
                        {
                          backgroundColor: theme === 'green' ? colors.gold : colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.vcTodoPillText,
                          { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
                        ]}
                      >
                        {row.cta}
                      </Text>
                      <ChevronRight
                        size={12}
                        color={theme === 'green' ? '#071C18' : '#FFFFFF'}
                        strokeWidth={2.8}
                      />
                    </View>
                  )}
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Verified VIP Trust Seal Card */}
        {currentUser && vcAllDone && (
          <View
            style={[
              styles.verifiedSealCard,
              {
                backgroundColor:
                  theme === 'white'
                    ? '#F0FDF4'
                    : theme === 'green'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(16, 185, 129, 0.08)',
                borderColor:
                  theme === 'white' ? '#BBF7D0' : 'rgba(16, 185, 129, 0.28)',
              },
            ]}
          >
            <View
              style={[
                styles.verifiedSealIconBox,
                {
                  backgroundColor:
                    theme === 'white' ? '#DCFCE7' : 'rgba(16, 185, 129, 0.22)',
                },
              ]}
            >
              <ShieldCheck size={20} color="#10B981" strokeWidth={2.4} />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.verifiedSealTitle, { color: colors.textPrimary }]}>
                  Llogari e Verifikuar Zyrtarisht
                </Text>
                <CheckCircle2 size={14} color="#10B981" strokeWidth={2.5} />
              </View>
              <Text style={[styles.verifiedSealSubtitle, { color: colors.textSecondary }]}>
                Gëzoni distinktivin zyrtar, besueshmëri të lartë te blerësit dhe prioritet në listime.
              </Text>
            </View>
          </View>
        )}

        {/* ─── 5. PRIMARY THUMB ZONE: MENAXHIMI I PRONAVE (Operations Hub) ─── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeading, { color: colors.textLight }]}>
            MENAXHIMI I PRONAVE
          </Text>

          <View
            style={[
              styles.menuCard,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
          >
            {/* Shpalljet e Mia */}
            <Pressable
              style={styles.menuRow}
              onPress={() => {
                if (!currentUser) {
                  openAuthModal('login')
                } else {
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  requestShpalljetFilter('all')
                  router.push('/shpalljet-e-mia' as any)
                }
              }}
            >
              <View style={[styles.menuRowIcon, { backgroundColor: colors.primaryLight }]}>
                <Building2 size={18} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View style={styles.menuRowContent}>
                <Text style={[styles.menuRowTitle, { color: colors.textPrimary }]}>
                  Shpalljet e Mia
                </Text>
                <Text style={[styles.menuRowSubtitle, { color: colors.textMuted }]}>
                  {currentUser ? 'Shiko, modifiko apo fshi pronat e tua' : 'Kyçu për të parë shpalljet e tua'}
                </Text>
              </View>
              {currentUser && stats.listingsCount > 0 && (
                <View
                  style={[
                    styles.menuCounterBadge,
                    {
                      backgroundColor:
                        theme === 'white' ? '#E6F2F1' : 'rgba(255, 255, 255, 0.12)',
                    },
                  ]}
                >
                  <Text style={[styles.menuCounterBadgeText, { color: colors.primary }]}>
                    {stats.listingsCount}
                  </Text>
                </View>
              )}
              <ChevronRight size={17} color={colors.textLight} />
            </Pressable>

            <View style={[styles.rowDivider, { backgroundColor: colors.borderSubtle }]} />

            {/* Posto Pronë të Re */}
            <Pressable
              style={styles.menuRow}
              onPress={() => {
                if (!currentUser) {
                  openAuthModal('login')
                } else {
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  router.push('/(tabs)/post' as any)
                }
              }}
            >
              <View
                style={[
                  styles.menuRowIcon,
                  {
                    backgroundColor:
                      theme === 'green' ? 'rgba(200, 184, 130, 0.2)' : colors.primaryLight,
                  },
                ]}
              >
                <Plus
                  size={18}
                  color={theme === 'green' ? colors.gold : colors.primary}
                  strokeWidth={2.4}
                />
              </View>
              <View style={styles.menuRowContent}>
                <Text style={[styles.menuRowTitle, { color: colors.textPrimary }]}>
                  Posto Pronë të Re
                </Text>
                <Text style={[styles.menuRowSubtitle, { color: colors.textMuted }]}>
                  Publiko banesë, shtëpi, truall apo lokal në treg
                </Text>
              </View>
              <View
                style={[
                  styles.menuTagPill,
                  {
                    backgroundColor:
                      theme === 'green' ? 'rgba(200, 184, 130, 0.25)' : 'rgba(16, 185, 129, 0.15)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.menuTagPillText,
                    { color: theme === 'green' ? colors.gold : '#10B981' },
                  ]}
                >
                  Falas
                </Text>
              </View>
              <ChevronRight size={17} color={colors.textLight} />
            </Pressable>

            <View style={[styles.rowDivider, { backgroundColor: colors.borderSubtle }]} />

            {/* Pronat e Ruajtura */}
            <Pressable
              style={styles.menuRow}
              onPress={() => {
                if (!currentUser) {
                  openAuthModal('login')
                } else {
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  requestShpalljetFilter('saved')
                  router.push({ pathname: '/shpalljet-e-mia', query: { filter: 'saved' } } as any)
                }
              }}
            >
              <View style={[styles.menuRowIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <Heart size={18} color="#EF4444" strokeWidth={2.2} />
              </View>
              <View style={styles.menuRowContent}>
                <Text style={[styles.menuRowTitle, { color: colors.textPrimary }]}>
                  Pronat e Ruajtura
                </Text>
                <Text style={[styles.menuRowSubtitle, { color: colors.textMuted }]}>
                  Lista e pronave të shënuara si të preferuara
                </Text>
              </View>
              {currentUser && stats.savedCount > 0 && (
                <View
                  style={[
                    styles.menuCounterBadge,
                    { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
                  ]}
                >
                  <Text style={[styles.menuCounterBadgeText, { color: '#EF4444' }]}>
                    {stats.savedCount}
                  </Text>
                </View>
              )}
              <ChevronRight size={17} color={colors.textLight} />
            </Pressable>
          </View>
        </View>

        {/* ─── 6. LLOGARIA & IDENTITETI (Strict Personal Identity) ─── */}
        {currentUser && (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: colors.textLight }]}>
              IDENTITETI & PROFILI
            </Text>

            <View
              style={[
                styles.menuCard,
                { backgroundColor: colors.surface, borderColor: specularBorder },
              ]}
            >
              {/* Ndrysho të Dhënat */}
              <Pressable
                style={styles.menuRow}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  router.push('/completo-profilin' as any)
                }}
              >
                <View
                  style={[
                    styles.menuRowIcon,
                    {
                      backgroundColor:
                        theme === 'green' ? 'rgba(200, 184, 130, 0.2)' : colors.primaryLight,
                    },
                  ]}
                >
                  {isCompany ? (
                    <Building2
                      size={18}
                      color={theme === 'green' ? colors.gold : colors.primary}
                      strokeWidth={2.2}
                    />
                  ) : (
                    <UserCheck
                      size={18}
                      color={theme === 'green' ? colors.gold : colors.primary}
                      strokeWidth={2.2}
                    />
                  )}
                </View>
                <View style={styles.menuRowContent}>
                  <Text style={[styles.menuRowTitle, { color: colors.textPrimary }]}>
                    {isCompany ? 'Të Dhënat e Agjencisë' : 'Ndrysho të Dhënat'}
                  </Text>
                  <Text style={[styles.menuRowSubtitle, { color: colors.textMuted }]}>
                    {isCompany
                      ? 'Emri i agjencisë, NIPT, personi kontaktues dhe zyra'
                      : 'Emri, mbiemri, numri i telefonit dhe biografia'}
                  </Text>
                </View>
                <ChevronRight size={17} color={colors.textLight} />
              </Pressable>

              <View style={[styles.rowDivider, { backgroundColor: colors.borderSubtle }]} />

              {/* Koleksioni i Avatarëve */}
              <Pressable
                style={styles.menuRow}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  setAvatarModalVisible(true)
                }}
              >
                <View
                  style={[
                    styles.menuRowIcon,
                    { backgroundColor: colors.surfaceSubtle },
                  ]}
                >
                  <Sparkles
                    size={18}
                    color={theme === 'green' ? colors.gold : colors.primary}
                    strokeWidth={2.2}
                  />
                </View>
                <View style={styles.menuRowContent}>
                  <Text style={[styles.menuRowTitle, { color: colors.textPrimary }]}>
                    Koleksioni i Avatarëve
                  </Text>
                  <Text style={[styles.menuRowSubtitle, { color: colors.textMuted }]}>
                    Zgjidh nga 20 avatarë zyrtarë me 1 prekje
                  </Text>
                </View>
                <ChevronRight size={17} color={colors.textLight} />
              </Pressable>
            </View>
          </View>
        )}

        {/* ─── 7. PREFERENCAT E SISTEMIT (System Settings & Theme) ─── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeading, { color: colors.textLight }]}>
            PREFERENCAT E SISTEMIT
          </Text>

          <View
            style={[
              styles.menuCard,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
          >
            {/* Cilësimet e Aplikacionit */}
            <Pressable
              style={styles.menuRow}
              onPress={() => {
                if (!currentUser) {
                  openAuthModal('login')
                } else {
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  router.push('/settings' as any)
                }
              }}
            >
              <View style={[styles.menuRowIcon, { backgroundColor: colors.primaryLight }]}>
                <Settings size={18} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View style={styles.menuRowContent}>
                <Text style={[styles.menuRowTitle, { color: colors.textPrimary }]}>
                  Cilësimet e Aplikacionit
                </Text>
                <Text style={[styles.menuRowSubtitle, { color: colors.textMuted }]}>
                  Njoftimet push, siguria me fjalëkalim & llogaria
                </Text>
              </View>
              <ChevronRight size={17} color={colors.textLight} />
            </Pressable>
          </View>

          {/* Tema e Ndërfaqes Card */}
          <View
            style={[
              styles.themeSelectorCard,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
          >
            <View style={styles.themeHeaderRow}>
              <View style={styles.themeHeaderLeft}>
                <Palette size={17} color={colors.primary} strokeWidth={2.2} />
                <Text style={[styles.themeHeaderTitle, { color: colors.textPrimary }]}>
                  Tema e Ndërfaqes
                </Text>
              </View>
              <Text style={[styles.themeCurrentBadge, { color: colors.primary }]}>
                {theme === 'green' ? 'Smerald' : theme === 'black' ? 'E Zezë' : 'E Bardhë'}
              </Text>
            </View>

            <View style={styles.themeCardsRow}>
              {/* White Theme */}
              <Pressable
                style={[
                  styles.themeOptionCard,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: theme === 'white' ? colors.primary : colors.border,
                  },
                  theme === 'white' && styles.themeOptionCardActive,
                ]}
                onPress={() => handleThemeSelect('white')}
              >
                <View style={styles.themeOptionTop}>
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
                    <Sun size={17} color="#00675B" strokeWidth={2.2} />
                  </View>
                  {theme === 'white' && (
                    <View style={[styles.themeRadioCheck, { backgroundColor: colors.primary }]}>
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text style={[styles.themeOptionName, { color: colors.textPrimary }]}>
                  E Bardhë
                </Text>
                <Text style={[styles.themeOptionSub, { color: colors.textMuted }]}>
                  Klasike
                </Text>
              </Pressable>

              {/* Green Theme (Emerald Gold) */}
              <Pressable
                style={[
                  styles.themeOptionCard,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: theme === 'green' ? colors.gold : colors.border,
                  },
                  theme === 'green' && styles.themeOptionCardActive,
                ]}
                onPress={() => handleThemeSelect('green')}
              >
                <View style={styles.themeOptionTop}>
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
                    <Leaf size={17} color="#D4AF37" strokeWidth={2.2} />
                  </View>
                  {theme === 'green' && (
                    <View style={[styles.themeRadioCheck, { backgroundColor: colors.gold }]}>
                      <Check size={10} color="#071C18" strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text style={[styles.themeOptionName, { color: colors.textPrimary }]}>
                  Smerald
                </Text>
                <Text style={[styles.themeOptionSub, { color: colors.textMuted }]}>
                  Zyrtare
                </Text>
              </Pressable>

              {/* Black Theme (OLED True Black) */}
              <Pressable
                style={[
                  styles.themeOptionCard,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: theme === 'black' ? '#34D399' : colors.border,
                  },
                  theme === 'black' && styles.themeOptionCardActive,
                ]}
                onPress={() => handleThemeSelect('black')}
              >
                <View style={styles.themeOptionTop}>
                  <View style={[styles.themeIconCircle, { backgroundColor: '#0B0F0E' }]}>
                    <Moon size={17} color="#34D399" strokeWidth={2.2} />
                  </View>
                  {theme === 'black' && (
                    <View style={[styles.themeRadioCheck, { backgroundColor: '#34D399' }]}>
                      <Check size={10} color="#0B0F0E" strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text style={[styles.themeOptionName, { color: colors.textPrimary }]}>
                  E Zezë
                </Text>
                <Text style={[styles.themeOptionSub, { color: colors.textMuted }]}>
                  OLED Dark
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ─── 8. NDIHMË & LIGJORE ─── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeading, { color: colors.textLight }]}>
            NDIHMË & LIGJORE
          </Text>

          <View
            style={[
              styles.menuCard,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
          >
            {/* Mbështetja Teknike & WhatsApp */}
            <Pressable style={styles.menuRow} onPress={handleContactSupport}>
              <View style={[styles.menuRowIcon, { backgroundColor: colors.surfaceSubtle }]}>
                <HelpCircle size={18} color={colors.textSecondary} strokeWidth={2.2} />
              </View>
              <View style={styles.menuRowContent}>
                <Text style={[styles.menuRowTitle, { color: colors.textPrimary }]}>
                  Ndihmë & Mbështetje
                </Text>
                <Text style={[styles.menuRowSubtitle, { color: colors.textMuted }]}>
                  Kontaktoni ekipin në WhatsApp ose email
                </Text>
              </View>
              <ChevronRight size={17} color={colors.textLight} />
            </Pressable>

            <View style={[styles.rowDivider, { backgroundColor: colors.borderSubtle }]} />

            {/* Kushtet & Privatësia */}
            <Pressable style={styles.menuRow} onPress={handleOpenLegal}>
              <View style={[styles.menuRowIcon, { backgroundColor: colors.surfaceSubtle }]}>
                <Shield size={18} color={colors.textSecondary} strokeWidth={2.2} />
              </View>
              <View style={styles.menuRowContent}>
                <Text style={[styles.menuRowTitle, { color: colors.textPrimary }]}>
                  Kushtet & Privatësia
                </Text>
                <Text style={[styles.menuRowSubtitle, { color: colors.textMuted }]}>
                  Rregullat dhe politikat zyrtare të sigurisë
                </Text>
              </View>
              <ChevronRight size={17} color={colors.textLight} />
            </Pressable>
          </View>
        </View>

        {/* ─── 9. ACCOUNT ACTIONS & DANGER ZONE (Apple App Store Compliant) ─── */}
        {currentUser && (
          <View style={styles.dangerZoneGroup}>
            {/* Çkyçu nga Llogaria */}
            <Pressable
              style={[
                styles.logoutBtn,
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
              onPress={handleLogout}
              hitSlop={8}
            >
              <LogOut
                size={17}
                color={theme === 'green' ? '#FCA5A5' : '#EF4444'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.logoutBtnText,
                  { color: theme === 'green' ? '#FCA5A5' : '#EF4444' },
                ]}
              >
                Çkyçu nga llogaria
              </Text>
            </Pressable>

            {/* Fshi Llogarinë Përfundimisht */}
            <Pressable
              style={[
                styles.deleteAccountBtn,
                {
                  borderColor:
                    theme === 'white'
                      ? 'rgba(239, 68, 68, 0.25)'
                      : 'rgba(239, 68, 68, 0.20)',
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
                  <Trash2 size={15} color="#EF4444" strokeWidth={2} />
                  <Text style={styles.deleteAccountBtnText}>
                    Fshi llogarinë përfundimisht
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* ─── 10. REGULATORY FOOTER ─── */}
        <View style={styles.footerWrap}>
          <Text style={[styles.footerText, { color: colors.textLight }]}>
            Bleje Pronën Mobile v1.0.0 • Prishtinë, Kosovë
          </Text>
        </View>
      </ScrollView>

      {/* ─── QUICK AVATAR SELECTOR MODAL SHEET ─── */}
      <Modal
        visible={avatarModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!updatingAvatar) setAvatarModalVisible(false)
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => {
              if (!updatingAvatar) setAvatarModalVisible(false)
            }}
          />
          <View
            style={[
              styles.avatarSheet,
              {
                backgroundColor: colors.surface,
                borderColor: specularBorder,
                paddingBottom: 20 + bottomInset,
              },
            ]}
          >
            <View style={[styles.sheetGrip, { backgroundColor: colors.border }]} />

            <View style={styles.sheetHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                  Fotoja e Profilit
                </Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
                  Zgjidhni foto nga galeria, bëni foto, ose zgjidhni avatar zyrtar
                </Text>
              </View>
              <Pressable
                style={[
                  styles.sheetCloseBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                ]}
                onPress={() => {
                  if (!updatingAvatar) setAvatarModalVisible(false)
                }}
                hitSlop={8}
                disabled={updatingAvatar}
              >
                <X size={17} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.avatarSheetScrollContent}
            >
              {/* Active Avatar Spotlight Card */}
              <View
                style={[
                  styles.avatarSpotlightCard,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: specularBorder,
                  },
                ]}
              >
                <View style={styles.avatarSpotlightLeft}>
                  <View
                    style={[
                      styles.avatarSpotlightRing,
                      {
                        borderColor: theme === 'green' ? colors.gold : colors.primary,
                      },
                    ]}
                  >
                    <Image
                      source={avatarSource}
                      style={styles.avatarSpotlightImg}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      priority="high"
                      transition={0}
                    />
                    {updatingAvatar && (
                      <View style={styles.avatarSpotlightLoadingOverlay}>
                        <ActivityIndicator
                          size="small"
                          color={theme === 'green' ? colors.gold : colors.primary}
                        />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text
                      style={[styles.avatarSpotlightName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {displayName}
                    </Text>
                    <Text
                      style={[
                        styles.avatarSpotlightStatus,
                        {
                          color: updatingAvatar
                            ? theme === 'green'
                              ? colors.gold
                              : colors.primary
                            : colors.textMuted,
                        },
                      ]}
                    >
                      {updatingAvatar ? 'Duke përditësuar foton...' : 'Fotoja juaj aktive e profilit'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Native Actions: Gallery & Camera */}
              <View style={styles.avatarActionsRow}>
                <Pressable
                  style={[
                    styles.avatarActionCard,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: specularBorder,
                    },
                    updatingAvatar && { opacity: 0.6 },
                  ]}
                  onPress={handlePickCustomAvatar}
                  disabled={updatingAvatar}
                >
                  <View
                    style={[
                      styles.avatarActionIconWrap,
                      {
                        backgroundColor:
                          theme === 'green'
                            ? 'rgba(212, 175, 55, 0.15)'
                            : 'rgba(16, 185, 129, 0.12)',
                      },
                    ]}
                  >
                    <ImageIcon
                      size={20}
                      color={theme === 'green' ? colors.gold : colors.primary}
                      strokeWidth={2.2}
                    />
                  </View>
                  <Text style={[styles.avatarActionTitle, { color: colors.textPrimary }]}>
                    Zgjidh nga Galeria
                  </Text>
                  <Text style={[styles.avatarActionDesc, { color: colors.textMuted }]}>
                    Pritje 1:1 katrore
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.avatarActionCard,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: specularBorder,
                    },
                    updatingAvatar && { opacity: 0.6 },
                  ]}
                  onPress={handleTakeCustomAvatar}
                  disabled={updatingAvatar}
                >
                  <View
                    style={[
                      styles.avatarActionIconWrap,
                      {
                        backgroundColor:
                          theme === 'green'
                            ? 'rgba(212, 175, 55, 0.15)'
                            : 'rgba(59, 130, 246, 0.12)',
                      },
                    ]}
                  >
                    <Camera
                      size={20}
                      color={theme === 'green' ? colors.gold : '#3B82F6'}
                      strokeWidth={2.2}
                    />
                  </View>
                  <Text style={[styles.avatarActionTitle, { color: colors.textPrimary }]}>
                    Bëj një Foto
                  </Text>
                  <Text style={[styles.avatarActionDesc, { color: colors.textMuted }]}>
                    Kamera e telefonit
                  </Text>
                </Pressable>
              </View>

              {/* Section Divider */}
              <View style={styles.avatarSectionDividerRow}>
                <View style={[styles.avatarDividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.avatarDividerText, { color: colors.textMuted }]}>
                  OSE ZGJIDH AVATAR ZYRTAR (20)
                </Text>
                <View style={[styles.avatarDividerLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Preset Avatars Grid */}
              <View style={styles.avatarGridWrap}>
                {BLEJE_AVATARS.map((av) => {
                  const isSelected =
                    rawAvatar === av.url ||
                    (typeof rawAvatar === 'string' && rawAvatar.includes(`avatar-${av.id}.png`))
                  return (
                    <Pressable
                      key={av.id}
                      style={[
                        styles.avatarGridItem,
                        isSelected && [
                          styles.avatarGridItemSelected,
                          {
                            borderColor: theme === 'green' ? colors.gold : colors.primary,
                          },
                        ],
                        updatingAvatar && { opacity: 0.7 },
                      ]}
                      onPress={() => handleSelectAvatarPreset(av.url)}
                      disabled={updatingAvatar}
                    >
                      <Image
                        source={av.source}
                        style={styles.avatarGridImg}
                        contentFit="cover"
                        priority="high"
                        cachePolicy="memory-disk"
                        transition={0}
                      />
                      {isSelected && (
                        <View
                          style={[
                            styles.avatarGridCheck,
                            {
                              backgroundColor: theme === 'green' ? colors.gold : colors.primary,
                            },
                          ]}
                        >
                          <Check
                            size={11}
                            color={theme === 'green' ? '#071C18' : '#FFFFFF'}
                            strokeWidth={3}
                          />
                        </View>
                      )}
                    </Pressable>
                  )
                })}
              </View>
            </ScrollView>

            <View style={styles.sheetFooterWrap}>
              <Pressable
                style={[
                  styles.sheetFullProfileBtn,
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
                <UserCheck
                  size={16}
                  color={theme === 'green' ? colors.gold : colors.primary}
                  strokeWidth={2.2}
                />
                <Text style={[styles.sheetFullProfileBtnText, { color: colors.textPrimary }]}>
                  Plotëso të Gjithë Profilin (Të Dhënat & Qytetin)
                </Text>
                <ChevronRight size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── VERIFICATION OTP MODAL SHEET ─── */}
      <Modal
        visible={verifyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVerifyModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => setVerifyModalVisible(false)}
          />
          <View
            style={[
              styles.verifySheet,
              {
                backgroundColor: colors.surface,
                borderColor: specularBorder,
                paddingBottom: 20 + bottomInset,
              },
            ]}
          >
            <View style={[styles.sheetGrip, { backgroundColor: colors.border }]} />

            <View style={styles.sheetHeaderRow}>
              <View
                style={[
                  styles.verifyIconBox,
                  { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
                ]}
              >
                <ShieldAlert size={20} color="#F59E0B" strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                  Verifikimi i Llogarisë
                </Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                  {currentUser?.email}
                </Text>
              </View>
              <Pressable
                style={[
                  styles.sheetCloseBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                ]}
                onPress={() => setVerifyModalVisible(false)}
                hitSlop={8}
              >
                <X size={17} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.verifyBodyScroll}
            >
              <View
                style={[
                  styles.verifyCardBlock,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: specularBorder,
                  },
                ]}
              >
                <Text style={[styles.verifyBlockTitle, { color: colors.textPrimary }]}>
                  Kodi i Verifikimit (6-Shifror)
                </Text>
                <Text style={[styles.verifyBlockDesc, { color: colors.textMuted }]}>
                  Shkruani kodin e dërguar në email-in tuaj për të vërtetuar identitetin:
                </Text>

                <TextInput
                  value={otpCode}
                  onChangeText={(val) => setOtpCode(val.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor={colors.textLight}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[
                    styles.otpInputField,
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
                    styles.confirmOtpActionBtn,
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
                      <Text style={[styles.confirmOtpActionBtnText, { color: primaryBtnText }]}>
                        Konfirmo Kodin
                      </Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={styles.resendCodeWrap}
                  onPress={handleResendOtp}
                  disabled={resendingCode || resendCooldown > 0}
                >
                  {resendingCode ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text
                      style={[
                        styles.resendCodeText,
                        {
                          color: resendCooldown > 0 ? colors.textLight : colors.primary,
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

              <View
                style={[
                  styles.verifyCardBlock,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: specularBorder,
                  },
                ]}
              >
                <Text style={[styles.verifyBlockTitle, { color: colors.textPrimary }]}>
                  Plotësoni Profilin e Plotë
                </Text>
                <Text style={[styles.verifyBlockDesc, { color: colors.textMuted }]}>
                  Përfundoni numrin e telefonit, qytetin dhe biznesin për verifikim të plotë të llogarisë.
                </Text>

                <Pressable
                  style={[
                    styles.completeProfileDirectBtn,
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
                  <UserCheck
                    size={16}
                    color={theme === 'green' ? colors.gold : colors.primary}
                    strokeWidth={2.4}
                  />
                  <Text style={[styles.completeProfileDirectBtnText, { color: colors.textPrimary }]}>
                    Hap Formularin e Profilit
                  </Text>
                  <ArrowRight size={15} color={colors.textMuted} />
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerGreeting: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  headerSettingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 16,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },

  // ─── Identity Hero Card ───
  profileHeroCard: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 0.5,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  heroMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  heroAvatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  heroAvatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  heroAvatarImg: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  heroInfoCol: {
    flex: 1,
    gap: 4,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroUserName: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  heroStatusBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: -0.1,
  },
  heroSubText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  heroEmailText: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    paddingTop: 2,
  },
  heroEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  heroEditBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroEditBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    letterSpacing: -0.1,
  },
  heroAvatarQuickBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Skeleton
  skeletonAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    opacity: 0.6,
  },
  skeletonTextWrap: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    opacity: 0.6,
  },

  // ─── Guest Hero Card ───
  guestHeroCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    borderWidth: 0.5,
    gap: 12,
  },
  guestIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  guestTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  guestButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  guestPrimaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  guestPrimaryBtnText: {
    fontSize: 14.5,
    fontFamily: Fonts.bold,
  },
  guestSecondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  guestSecondaryBtnText: {
    fontSize: 14.5,
    fontFamily: Fonts.bold,
  },

  // ─── Metrics Grid (3-Column) ───
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  metricCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 20,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 11.5,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  metricSub: {
    fontSize: 10,
    fontFamily: Fonts.regular,
  },

  // ─── Verification Center ───
  vcCard: {
    borderRadius: 22,
    borderWidth: 0.5,
    padding: 16,
    gap: 13,
  },
  vcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vcHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vcHeaderText: {
    flex: 1,
    gap: 1,
  },
  vcTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  vcSubtitle: {
    fontSize: 11.5,
    fontFamily: Fonts.medium,
  },
  vcCountPill: {
    minWidth: 40,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vcCountText: {
    fontSize: 12,
    fontFamily: Fonts.extraBold,
  },
  vcProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  vcProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  vcDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  vcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vcRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vcRowText: {
    flex: 1,
    gap: 1,
  },
  vcRowTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.1,
  },
  vcRowDesc: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  vcDonePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  vcDonePillText: {
    fontSize: 10.5,
    fontFamily: Fonts.bold,
  },
  vcTodoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  vcTodoPillText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },

  // Verified VIP Seal Card
  verifiedSealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  verifiedSealIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedSealTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  verifiedSealSubtitle: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },

  // ─── Section Blocks & Menu Rows ───
  sectionBlock: {
    gap: 8,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  menuCard: {
    borderRadius: 20,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  menuRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowContent: {
    flex: 1,
    gap: 2,
  },
  menuRowTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    letterSpacing: -0.1,
  },
  menuRowSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },
  menuCounterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  menuCounterBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  menuTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  menuTagPillText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },

  // ─── Theme Selector ───
  themeSelectorCard: {
    borderRadius: 20,
    borderWidth: 0.5,
    padding: 16,
    gap: 12,
    marginTop: 4,
  },
  themeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeHeaderTitle: {
    fontSize: 14.5,
    fontFamily: Fonts.bold,
  },
  themeCurrentBadge: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  themeCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOptionCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 4,
  },
  themeOptionCardActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  themeOptionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  themeIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeRadioCheck: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionName: {
    fontSize: 12.5,
    fontFamily: Fonts.bold,
  },
  themeOptionSub: {
    fontSize: 10,
    fontFamily: Fonts.regular,
  },

  // ─── Danger Zone ───
  dangerZoneGroup: {
    gap: 10,
    marginTop: 6,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  logoutBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  deleteAccountBtnText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#EF4444',
  },
  footerWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerText: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
  },

  // ─── Modal Sheets (iOS 18 Sheet Standards) ───
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  sheetGrip: {
    width: 36,
    height: 4.5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
    opacity: 0.5,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
    gap: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  sheetSubtitle: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },

  // Avatar Sheet
  avatarSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    paddingTop: 12,
    maxHeight: '86%',
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  avatarSheetScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  avatarSpotlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatarSpotlightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarSpotlightRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  avatarSpotlightImg: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  avatarSpotlightLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSpotlightName: {
    fontSize: 15.5,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  avatarSpotlightStatus: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  avatarActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  avatarActionCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarActionTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  avatarActionDesc: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 2,
    textAlign: 'center',
  },
  avatarSectionDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  avatarDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  avatarDividerText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.8,
  },
  avatarGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
    paddingBottom: 8,
  },
  avatarGridItem: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarGridItemSelected: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarGridImg: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  avatarGridCheck: {
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
  sheetFooterWrap: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  sheetFullProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  sheetFullProfileBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
    flex: 1,
    marginHorizontal: 8,
  },

  // Verification Sheet
  verifySheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    paddingTop: 12,
    maxHeight: '85%',
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  verifyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBodyScroll: {
    padding: 20,
    gap: 14,
  },
  verifyCardBlock: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 0.5,
    gap: 10,
  },
  verifyBlockTitle: {
    fontSize: 14.5,
    fontFamily: Fonts.bold,
  },
  verifyBlockDesc: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },
  otpInputField: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    fontSize: 22,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    letterSpacing: 10,
    marginVertical: 4,
  },
  confirmOtpActionBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmOtpActionBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  resendCodeWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  resendCodeText: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
  },
  completeProfileDirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  completeProfileDirectBtnText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    flex: 1,
    marginHorizontal: 8,
  },
})
