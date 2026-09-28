import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
  Share,
  Modal,
  Animated,
  useWindowDimensions,
  TextInput,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Image } from 'expo-image'
import {
  ArrowLeft,
  MapPin,
  Maximize2,
  BedDouble,
  Layers,
  Phone,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Share2,
  Compass,
  Sparkles,
  Building2,
  Flame,
  Wind,
  Car,
  Camera,
  Star,
  Calendar,
  X,
  Shield,
  Eye,
  UserCheck,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase, Listing } from '@/lib/supabase'
import { getAvatarSource } from '@/lib/avatars'
import { useFavorites } from '@/lib/favorites'
import { openLoginScreen } from '@/lib/navigation'
import { ListingDetailSkeleton } from '@/components/ListingSkeleton'
import { safeBack } from '@/lib/navigation'
import {
  getCachedListingById,
  getCachedListings,
  getCachedListingDetail,
  setCachedListingDetail,
} from '@/lib/listings-cache'
import { getSyncAuthUser, subscribeAuthCache } from '@/lib/auth-cache'
import { setCachedProfile } from '@/lib/profile-cache'
import { normalizePhoneNumber } from '@/lib/phone'
import { FavoriteButton } from '@/components/FavoriteButton'
import { TactilePressable } from '@/components/motion'
import { CallModal } from '@/components/CallModal'
import { MediaLightbox } from '@/components/MediaLightbox'

const FALLBACK_GALLERY_IMAGE = require('@/assets/images/logo-icon.png')

// Maps Albanian feature descriptions to intuitive iconography
function getFeatureIcon(feat: string, color: string) {
  const lower = feat.toLowerCase()
  if (lower.includes('nxemje') || lower.includes('ngrohje') || lower.includes('pelet')) {
    return <Flame size={15} color={color} strokeWidth={2.2} />
  }
  if (lower.includes('klim') || lower.includes('ajer') || lower.includes('ajr')) {
    return <Wind size={15} color={color} strokeWidth={2.2} />
  }
  if (lower.includes('garazh') || lower.includes('park') || lower.includes('parking')) {
    return <Car size={15} color={color} strokeWidth={2.2} />
  }
  if (lower.includes('ashensor') || lower.includes('lift')) {
    return <Building2 size={15} color={color} strokeWidth={2.2} />
  }
  if (lower.includes('ballkon') || lower.includes('teras') || lower.includes('oborr')) {
    return <Maximize2 size={15} color={color} strokeWidth={2.2} />
  }
  if (lower.includes('mobil') || lower.includes('mobiluar') || lower.includes('lux')) {
    return <Sparkles size={15} color={color} strokeWidth={2.2} />
  }
  if (lower.includes('sigur') || lower.includes('alarm') || lower.includes('kamera')) {
    return <ShieldCheck size={15} color={color} strokeWidth={2.2} />
  }
  return <CheckCircle2 size={15} color={color} strokeWidth={2.2} />
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors, theme } = useTheme()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  const cachedListing = id ? (getCachedListingDetail(id) || getCachedListingById(id)) : null
  const [currentUser, setCurrentUser] = useState<any>(() => getSyncAuthUser())

  // Reactive session observer
  useEffect(() => {
    return subscribeAuthCache((state) => {
      setCurrentUser(state.user || null)
    })
  }, [])

  const [listing, setListing] = useState<Listing | null>(() => cachedListing)
  const [loading, setLoading] = useState(() => !cachedListing)
  const { isFavorite: checkFavorite, toggleFavorite: toggleFav } = useFavorites()
  const isFavorite = id ? checkFavorite(id) : false

  // Gallery & View States
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [startingChat, setStartingChat] = useState(false)
  const startingChatRef = useRef(false)
  // Contact capability stays "pending" until the seller row (cache or network)
  // has resolved, so the action bar never flashes a false "Pa numër" state.
  // Feed caches embed the seller contact fragment, so warm entries resolve
  // synchronously on frame one — no gray-to-green mutation.
  const [contactResolved, setContactResolved] = useState(() =>
    Boolean((cachedListing as any)?.profiles)
  )
  const [contactModalVisible, setContactModalVisible] = useState(false)
  const [fullscreenVisible, setFullscreenVisible] = useState(false)
  const [fullscreenIdx, setFullscreenIdx] = useState(0)
  const [descExpanded, setDescExpanded] = useState(false)
  const [loanYears, setLoanYears] = useState<10 | 15 | 20 | 25>(20)
  const [loanDownPct, setLoanDownPct] = useState<10 | 15 | 20 | 30>(20)
  const [loanRate, setLoanRate] = useState<3.9 | 4.5 | 5.0 | 5.5>(4.5)
  const [loanMethod, setLoanMethod] = useState<'annuity' | 'linear'>('annuity')
  const [incomeStr, setIncomeStr] = useState('')
  const [loanExpanded, setLoanExpanded] = useState(false)
  const [similarListings, setSimilarListings] = useState<Listing[]>([])

  // Dynamic Scroll Tracking for Apple-grade sticky header crossfade
  const scrollY = useRef(new Animated.Value(0)).current

  const heroHeight = Math.min(420, Math.round(windowWidth * 0.94))

  // Header background interpolation
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [heroHeight - 140, heroHeight - 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  // Header title & compact price interpolation
  const headerContentOpacity = scrollY.interpolate({
    inputRange: [heroHeight - 90, heroHeight - 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const headerContentTranslateY = scrollY.interpolate({
    inputRange: [heroHeight - 90, heroHeight - 40],
    outputRange: [10, 0],
    extrapolate: 'clamp',
  })

  // Fetch listing details
  useEffect(() => {
    let isMounted = true

    async function fetchDetails() {
      if (!id) return
      try {
        if (!cachedListing) {
          setLoading(true)
        }

        const [authRes, listingRes] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from('listings')
            .select('*, profiles:user_id(*)')
            .eq('id', id)
            .single(),
        ])

        if (!isMounted) return

        setCurrentUser(authRes.data?.user || null)

        let loadedListing: any = listingRes.data

        if (!loadedListing && listingRes.error) {
          const { data: fallbackData } = await supabase
            .from('listings')
            .select('*')
            .eq('id', id)
            .single()
          if (fallbackData) {
            loadedListing = fallbackData
          }
        }

        // Resilient seller profile hydration: ensure phone and whatsapp are resolved
        if (
          loadedListing?.user_id &&
          (!loadedListing.profiles || !loadedListing.profiles.phone)
        ) {
          try {
            const { data: directProf } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', loadedListing.user_id)
              .maybeSingle()

            if (directProf && isMounted) {
              loadedListing.profiles = {
                ...(loadedListing.profiles || {}),
                ...directProf,
              }
            }
          } catch {}
        }

        if (!isMounted) return

        if (loadedListing) {
          setListing(loadedListing as Listing)
          setCachedListingDetail(loadedListing as Listing)
        }
      } catch (err: any) {
        console.warn('Listing fetch exception:', err?.message || err)
      } finally {
        if (isMounted) {
          setLoading(false)
          setContactResolved(true)
        }
      }
    }

    fetchDetails()

    return () => {
      isMounted = false
    }
  }, [id])

  // Fetch similar properties for discovery momentum
  useEffect(() => {
    if (!listing) return
    const currentId = listing.id
    const currentCity = listing.city
    const currentType = listing.type
    const cached = getCachedListings()
    const matches = cached
      .filter((l) => l.id !== currentId && (l.city === currentCity || l.type === currentType))
      .slice(0, 6)

    if (matches.length >= 3) {
      setSimilarListings(matches)
    } else {
      async function fetchSimilar() {
        try {
          const { data } = await supabase
            .from('listings')
            .select('*')
            .eq('city', currentCity)
            .neq('id', currentId)
            .limit(6)

          if (data && data.length > 0) {
            setSimilarListings(data as Listing[])
          } else if (matches.length > 0) {
            setSimilarListings(matches)
          }
        } catch {
          if (matches.length > 0) setSimilarListings(matches)
        }
      }
      void fetchSimilar()
    }
  }, [listing])

  // Immediate profile pre-hydration when mounted with cached listing
  useEffect(() => {
    const targetUserId = listing?.user_id || cachedListing?.user_id
    if (!targetUserId) return
    const hasContact = Boolean(listing?.profiles?.phone || (listing?.profiles as any)?.whatsapp)
    if (hasContact) {
      setContactResolved(true)
      return
    }

    let isMounted = true
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle()
      if (isMounted && data) {
        setListing((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            profiles: {
              ...(prev.profiles || {}),
              ...data,
            },
          } as Listing
        })
      }
    })()
      .catch(() => {})
      .finally(() => {
        if (isMounted) setContactResolved(true)
      })

    return () => {
      isMounted = false
    }
  }, [listing?.user_id, cachedListing?.user_id])

  const handleFavoriteToggle = async () => {
    if (!listing) return
    const user = getSyncAuthUser()
    if (!user) {
      openLoginScreen(router, { redirectTo: `/listings/${listing.id}`, reason: 'favorite' })
      return
    }

    const res = await toggleFav(listing.id)
    if (res.requiresAuth) {
      openLoginScreen(router, { redirectTo: `/listings/${listing.id}`, reason: 'favorite' })
    }
  }

  const seller = listing?.profiles as (any)
  const isCompany = seller?.account_type === 'company'
  const sellerName = seller
    ? (isCompany
        ? seller.company_name || `${seller.first_name || ''} ${seller.last_name || ''}`.trim() || 'Agjenci Imobiliare'
        : `${seller.first_name || ''} ${seller.last_name || ''}`.trim() || seller.company_name || 'Pronar Privat')
    : 'Pronari / Agjencia'

  // Unified communication resolution across profile and listing metadata
  const directWhatsApp = seller?.whatsapp || (listing as any)?.whatsapp || null
  const directPhone = seller?.phone || (listing as any)?.phone || (listing as any)?.contact_phone || null
  const effectiveWhatsAppNumber = directWhatsApp || directPhone || null
  const effectiveCallNumber = directPhone || directWhatsApp || null

  // Seed the storefront cache with the seller fragment we already hold, so a
  // host-card tap paints the identity on frame one (SWR revalidates behind).
  useEffect(() => {
    if (listing?.user_id && seller) {
      setCachedProfile(listing.user_id, seller)
    }
  }, [listing?.user_id, seller])

  const cleanWhatsAppDigits = effectiveWhatsAppNumber
    ? normalizePhoneNumber(effectiveWhatsAppNumber).replace(/[^0-9]/g, '')
    : ''
  const cleanCallDigits = effectiveCallNumber
    ? normalizePhoneNumber(effectiveCallNumber).replace(/[^0-9]/g, '')
    : ''

  const hasWhatsApp = Boolean(cleanWhatsAppDigits && cleanWhatsAppDigits.length >= 6)
  const hasPhone = Boolean(cleanCallDigits && cleanCallDigits.length >= 6)

  const handleCall = () => {
    if (!hasPhone) {
      Alert.alert(
        'Numri nuk është publik',
        'Publikuesi nuk ka listuar numër telefoni për thirrje direkte. Mund ta kontaktoni menjëherë përmes bisedës në aplikacion.'
      )
      return
    }
    setContactModalVisible(true)
  }

  const handleWhatsApp = (customText?: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }

    if (!hasWhatsApp) {
      Alert.alert(
        'WhatsApp i Padisponueshëm',
        'Publikuesi nuk ka konfiguruar numër për WhatsApp. Mund ta kontaktoni menjëherë përmes telefonit ose bisedës në aplikacion.'
      )
      return
    }

    const defaultText = `Përshëndetje! Po ju kontaktoj nga Bleje Pronën lidhur me pronën "${listing?.title || ''}" (${formatPrice(listing?.price)}).`
    const body = customText ? `${defaultText}\n\nPyetje: ${customText}` : defaultText
    const encoded = encodeURIComponent(body)
    Linking.openURL(`https://wa.me/${cleanWhatsAppDigits}?text=${encoded}`).catch(() => {
      Alert.alert('Gabim', 'Nuk mund të hapet aplikacioni WhatsApp.')
    })
  }

  const handleChat = async (initialQuery?: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (!currentUser) {
      openLoginScreen(router, { redirectTo: `/listings/${listing?.id || id}`, reason: 'chat' })
      return
    }

    if (currentUser.id === listing?.user_id) {
      Alert.alert('Prona Juaj', 'Kjo është prona juaj e publikuar në Bleje Pronën.')
      return
    }

    if (!listing?.id || !listing?.user_id) return

    if (startingChatRef.current) return
    startingChatRef.current = true
    try {
      setStartingChat(true)
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listing.id)
        .eq('buyer_id', currentUser.id)
        .maybeSingle()

      if (existing?.id) {
        router.push({
          pathname: `/messages/${existing.id}` as any,
          params: initialQuery ? { initialText: initialQuery } : {},
        })
        return
      }

      const { data: created, error: createErr } = await supabase
        .from('conversations')
        .insert({
          listing_id: listing.id,
          buyer_id: currentUser.id,
          seller_id: listing.user_id,
        })
        .select('id')
        .single()

      if (createErr) {
        Alert.alert('Vërejtje', 'Nuk mund të hapet biseda: ' + createErr.message)
      } else if (created?.id) {
        router.push({
          pathname: `/messages/${created.id}` as any,
          params: initialQuery ? { initialText: initialQuery } : {},
        })
      }
    } catch (err: any) {
      console.warn('Chat error:', err)
    } finally {
      startingChatRef.current = false
      setStartingChat(false)
    }
  }

  const handleShare = async () => {
    if (!listing) return
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    try {
      const shareUrl = `https://blejepronen.com/listings/${listing.id}`
      const m2Text = listing.area_m2 ? ` • ${listing.area_m2} m²` : ''
      const locText = [listing.neighborhood, listing.city].filter(Boolean).join(', ')
      const messageBody = `${listing.title}\n💰 ${formatPrice(listing.price)}${m2Text}\n📍 ${locText}`

      await Share.share(
        Platform.OS === 'ios'
          ? { title: listing.title, message: messageBody, url: shareUrl }
          : {
              title: listing.title,
              message: `${messageBody}\n\nShiko detajet në Bleje Pronën:\n${shareUrl}`,
            }
      )
    } catch (err) {
      console.warn('Share error:', err)
    }
  }

  const handleOpenMaps = () => {
    if (!listing) return
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync()
    }
    const hasCoords = Boolean((listing as any).latitude && (listing as any).longitude)
    const lat = (listing as any).latitude
    const lng = (listing as any).longitude

    const query = encodeURIComponent(
      [listing.address, listing.neighborhood, listing.city, 'Kosovo']
        .filter(Boolean)
        .join(', ')
    )
    const url = hasCoords
      ? Platform.select({
          ios: `maps://?ll=${lat},${lng}&q=${encodeURIComponent(listing.title || 'Prona')}`,
          android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(listing.title || 'Prona')})`,
          default: `https://maps.google.com/?q=${lat},${lng}`,
        })
      : Platform.select({
          ios: `maps://?q=${query}`,
          android: `geo:0,0?q=${query}`,
          default: `https://maps.google.com/?q=${query}`,
        })

    Linking.openURL(url!).catch(() => {
      const fallback = hasCoords
        ? `https://maps.google.com/?q=${lat},${lng}`
        : `https://maps.google.com/?q=${query}`
      Linking.openURL(fallback).catch(() => {})
    })
  }

  const formatPrice = (val?: number) => {
    if (!val || Number.isNaN(val) || val <= 0) return 'Me marrëveshje'
    return new Intl.NumberFormat('de-DE').format(val) + ' €'
  }

  const fmtInt = (val: number) => new Intl.NumberFormat('de-DE').format(val)

  // Mortgage affordability engine, calibrated to Kosovar retail market reality:
  // down payments 10–30%, residential spreads 3.8–5.5%, tenors 10–25 years,
  // both standard repayment schedules (annuity & declining/linear).
  const loanEstimate = useMemo(() => {
    if (!listing?.price || listing.price <= 0 || listing.type !== 'shitje') return null
    const downPaymentAmount = Math.round((listing.price * loanDownPct) / 100)
    const loanAmount = listing.price - downPaymentAmount
    if (loanAmount <= 0) return null
    const rm = loanRate / 100 / 12
    const n = loanYears * 12

    let monthlyPayment: number
    let firstPayment: number
    let lastPayment: number
    let totalInterest: number
    let balanceAfter5: number | null
    if (loanMethod === 'annuity') {
      monthlyPayment =
        (loanAmount * (rm * Math.pow(1 + rm, n))) / (Math.pow(1 + rm, n) - 1)
      firstPayment = monthlyPayment
      lastPayment = monthlyPayment
      totalInterest = monthlyPayment * n - loanAmount
      const k = Math.min(60, n)
      balanceAfter5 =
        k >= n ? 0 : (loanAmount * (Math.pow(1 + rm, n) - Math.pow(1 + rm, k))) / (Math.pow(1 + rm, n) - 1)
    } else {
      const principalPart = loanAmount / n
      firstPayment = principalPart + loanAmount * rm
      lastPayment = principalPart + principalPart * rm
      monthlyPayment = firstPayment
      totalInterest = (rm * loanAmount * (n + 1)) / 2
      const k = Math.min(60, n)
      balanceAfter5 = k >= n ? 0 : loanAmount * (1 - k / n)
    }

    // Annuity total interest for the declining-method savings comparison
    const annuityInterest =
      loanMethod === 'linear'
        ? ((loanAmount * (rm * Math.pow(1 + rm, n))) / (Math.pow(1 + rm, n) - 1)) * n - loanAmount
        : null

    const adminFee = Math.round(loanAmount * 0.005)
    const incomeNum = parseFloat(incomeStr.replace(/[^\d.]/g, '')) || 0
    const dti = incomeNum > 0 ? firstPayment / incomeNum : null

    return {
      monthlyPayment: Math.round(monthlyPayment),
      firstPayment: Math.round(firstPayment),
      lastPayment: Math.round(lastPayment),
      downPaymentAmount,
      loanAmount,
      totalInterest: Math.round(totalInterest),
      annuityInterest: annuityInterest != null ? Math.round(annuityInterest) : null,
      balanceAfter5: balanceAfter5 != null ? Math.round(balanceAfter5) : null,
      adminFee,
      totalCost: Math.round(loanAmount + totalInterest + adminFee),
      totalPayments: n,
      dti,
      incomeNum,
    }
  }, [listing?.price, listing?.type, loanYears, loanDownPct, loanRate, loanMethod, incomeStr])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <ListingDetailSkeleton />
      </View>
    )
  }

  if (!listing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.notFoundTitle, { color: colors.textPrimary }]}>Prona nuk u gjet</Text>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
          onPress={() => safeBack(router, '/(tabs)/listings')}
        >
          <Text style={[styles.backBtnText, { color: theme === 'green' ? '#071C18' : '#FFFFFF' }]}>
            Kthehu mbrapa
          </Text>
        </Pressable>
      </View>
    )
  }

  const imagesList: (string | number)[] =
    listing.images && listing.images.length > 0
      ? listing.images
      : [FALLBACK_GALLERY_IMAGE]

  const handleGalleryScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const slide = Math.min(
      imagesList.length - 1,
      Math.max(0, Math.round(e.nativeEvent.contentOffset.x / windowWidth))
    )
    if (slide !== activeImageIdx) setActiveImageIdx(slide)
  }

  const openFullscreen = (index: number = 0) => {
    setFullscreenIdx(index)
    setFullscreenVisible(true)
  }

  const isSale = listing.type === 'shitje'
  const brandHighlight = theme === 'green' ? colors.gold : colors.primary
  const specularBorder =
    theme === 'white'
      ? 'rgba(15, 23, 42, 0.08)'
      : theme === 'green'
      ? 'rgba(212, 175, 55, 0.24)'
      : 'rgba(255, 255, 255, 0.09)'

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. APPLE-TIER DYNAMIC TOP NAVIGATION BAR (CROSS-FADING)      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View style={[styles.floatingNavSafeArea, { paddingTop: insets.top }]} pointerEvents="box-none">
        {/* Solid / Frosted Background that fades in seamlessly on scroll */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: headerBgOpacity,
              backgroundColor: colors.background,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            },
          ]}
          pointerEvents="none"
        >
          <BlurView
            intensity={Platform.OS === 'ios' ? 95 : 100}
            tint={colors.blurTint}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={styles.floatingNavRow}>
          {/* Back Button */}
          <TactilePressable
            style={styles.navCircleBtn}
            onPress={() => safeBack(router, '/(tabs)/listings')}
            hitSlop={8}
            activeScale={0.92}
            haptic="light"
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 75 : 100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <ArrowLeft size={19} color="#FFFFFF" strokeWidth={2.4} />
          </TactilePressable>

          {/* Sticky Header Center Title & Price (Fades in when hero scrolls out) */}
          <Animated.View
            style={[
              styles.navCenterContent,
              {
                opacity: headerContentOpacity,
                transform: [{ translateY: headerContentTranslateY }],
              },
            ]}
            pointerEvents="none"
          >
            <Text style={[styles.navStickyTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {listing.title}
            </Text>
            <Text style={[styles.navStickyPrice, { color: brandHighlight }]}>
              {formatPrice(listing.price)}
              {listing.type === 'qira' && ' /muaj'}
            </Text>
          </Animated.View>

          {/* Right Action Icons: Share & Favorite */}
          <View style={styles.navRightGroup}>
            <TactilePressable
              style={styles.navCircleBtn}
              onPress={handleShare}
              hitSlop={8}
              activeScale={0.92}
              haptic="light"
            >
              <BlurView
                intensity={Platform.OS === 'ios' ? 75 : 100}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
              <Share2 size={17} color="#FFFFFF" strokeWidth={2.2} />
            </TactilePressable>

            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={handleFavoriteToggle}
              canToggle={() => !!getSyncAuthUser()}
              size={40}
              iconSize={19}
              variant="dark"
            />
          </View>
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. MAIN SCROLLABLE CONTENT BODY                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* ── CINEMATIC FULL-WIDTH HERO GALLERY ── */}
        <View style={[styles.heroGalleryWrapper, { width: windowWidth, height: heroHeight }]}>
          <FlatList
            data={imagesList}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews={Platform.OS !== 'web'}
            getItemLayout={(_, index) => ({
              length: windowWidth,
              offset: windowWidth * index,
              index,
            })}
            onMomentumScrollEnd={handleGalleryScrollEnd}
            onScrollEndDrag={handleGalleryScrollEnd}
            renderItem={({ item: img, index: i }) => (
              <Pressable
                onPress={() => openFullscreen(i)}
                style={{ width: windowWidth, height: heroHeight }}
              >
                <Image
                  source={typeof img === 'string' ? { uri: img } : (img as any)}
                  recyclingKey={`gallery-${i}`}
                  style={[styles.heroImage, { width: windowWidth, height: heroHeight, backgroundColor: colors.surfaceSubtle }]}
                  contentFit="cover"
                  priority={i === 0 ? 'high' : 'normal'}
                  cachePolicy="memory-disk"
                  transition={200}
                />
              </Pressable>
            )}
          />

          {/* Top Edge Vignette Gradient (for navigation contrast) */}
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.55)', 'rgba(0, 0, 0, 0)']}
            style={styles.topVignette}
            pointerEvents="none"
          />

          {/* Bottom Edge Vignette Gradient */}
          <LinearGradient
            colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.60)']}
            style={styles.bottomVignette}
            pointerEvents="none"
          />

          {/* Dynamic Pagination Pill Indicator */}
          {imagesList.length > 1 && (
            <View style={styles.paginationDotsRow} pointerEvents="none">
              {imagesList.map((_, i) => {
                const isActive = i === activeImageIdx
                return (
                  <View
                    key={i}
                    style={[
                      styles.paginationDot,
                      {
                        width: isActive ? 22 : 6,
                        backgroundColor: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)',
                      },
                    ]}
                  />
                )
              })}
            </View>
          )}

          {/* Bottom Left: Property Type Badge & Featured Star */}
          <View style={styles.heroLeftBadgesRow}>
            <View
              style={[
                styles.typeTagCapsule,
                { backgroundColor: isSale ? '#10B981' : '#3B82F6' },
              ]}
            >
              <Text style={styles.typeTagText}>
                {isSale ? 'NË SHITJE' : 'ME QIRA'}
              </Text>
            </View>

            {listing.is_featured && (
              <View style={[styles.featuredTagCapsule, { backgroundColor: colors.gold }]}>
                <Star size={11} color="#3E2A00" fill="#3E2A00" strokeWidth={2} />
                <Text style={styles.featuredTagText}>E VEÇUAR</Text>
              </View>
            )}
          </View>

          {/* Bottom Right: Fullscreen Photo Counter Badge */}
          <TactilePressable
            style={styles.photoCountBtn}
            onPress={() => openFullscreen(activeImageIdx)}
            activeScale={0.93}
            haptic="light"
            hitSlop={6}
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 70 : 100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <Camera size={13} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.photoCountText}>
              {activeImageIdx + 1}/{imagesList.length}
            </Text>
          </TactilePressable>
        </View>

        {/* ── EDITORIAL PROPERTY NARRATIVE ── */}
        <View style={styles.narrativeBody}>
          {/* Price Command & Valuation Badges */}
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <View style={styles.priceTextWrap}>
                <Text style={[styles.priceHeroNumber, { color: brandHighlight }]}>
                  {formatPrice(listing.price)}
                </Text>
                {listing.type === 'qira' && (
                  <Text style={[styles.periodLabel, { color: colors.textMuted }]}>
                    /muaj
                  </Text>
                )}
              </View>

              {/* Price per Square Meter Chip */}
              {isSale && listing.price && listing.area_m2 && listing.area_m2 > 0 ? (
                <View
                  style={[
                    styles.pricePerM2Pill,
                    {
                      backgroundColor:
                        theme === 'white'
                          ? 'rgba(0, 103, 91, 0.08)'
                          : theme === 'green'
                          ? 'rgba(212, 175, 55, 0.16)'
                          : 'rgba(52, 211, 153, 0.12)',
                      borderColor:
                        theme === 'white'
                          ? 'rgba(0, 103, 91, 0.18)'
                          : theme === 'green'
                          ? 'rgba(212, 175, 55, 0.32)'
                          : 'rgba(52, 211, 153, 0.25)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pricePerM2Label,
                      { color: theme === 'green' ? colors.gold : theme === 'black' ? '#34D399' : colors.primary },
                    ]}
                  >
                    ≈ {new Intl.NumberFormat('de-DE').format(Math.round(listing.price / listing.area_m2))} €/m²
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Confident Editorial Title */}
            <Text style={[styles.editorialTitle, { color: colors.textPrimary }]}>
              {listing.title}
            </Text>

            {/* Geographic Context & Neighborhood Link */}
            <View style={styles.locationBar}>
              <View style={styles.locationPinGroup}>
                <MapPin size={17} color={brandHighlight} strokeWidth={2.4} />
                <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>
                  {listing.neighborhood ? `${listing.neighborhood}, ` : ''}
                  <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{listing.city}</Text>
                  {listing.address ? ` • ${listing.address}` : ''}
                </Text>
              </View>

              <TactilePressable
                style={[
                  styles.mapChipBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                ]}
                onPress={handleOpenMaps}
                activeScale={0.94}
                haptic="selection"
                hitSlop={6}
              >
                <Compass size={14} color={brandHighlight} strokeWidth={2.2} />
                <Text style={[styles.mapChipText, { color: colors.textPrimary }]}>Harta</Text>
              </TactilePressable>
            </View>
          </View>

          {/* ── ARCHITECTURAL SPECS STRIP (editorial canvas, hairline-ruled) ── */}
          <View style={[styles.specStrip, { borderColor: colors.border }]}>
            {/* Area */}
            <View style={styles.architecturalSpecCell}>
              <Maximize2 size={18} color={colors.textMuted} strokeWidth={2.2} />
              <Text style={[styles.specValueText, { color: colors.textPrimary }]}>
                {listing.area_m2 ? `${listing.area_m2} m²` : '-'}
              </Text>
              <Text style={[styles.specLabelText, { color: colors.textMuted }]}>
                Sipërfaqe
              </Text>
            </View>

            <View style={[styles.specVerticalDivider, { backgroundColor: colors.border }]} />

            {/* Rooms */}
            <View style={styles.architecturalSpecCell}>
              <BedDouble size={18} color={colors.textMuted} strokeWidth={2.2} />
              <Text style={[styles.specValueText, { color: colors.textPrimary }]}>
                {listing.rooms ? `${listing.rooms} Dhoma` : '-'}
              </Text>
              <Text style={[styles.specLabelText, { color: colors.textMuted }]}>
                Struktura
              </Text>
            </View>

            <View style={[styles.specVerticalDivider, { backgroundColor: colors.border }]} />

            {/* Floor */}
            <View style={styles.architecturalSpecCell}>
              <Layers size={18} color={colors.textMuted} strokeWidth={2.2} />
              <Text style={[styles.specValueText, { color: colors.textPrimary }]}>
                {listing.floor != null && listing.floor !== '' ? `Kati ${listing.floor}` : '-'}
              </Text>
              <Text style={[styles.specLabelText, { color: colors.textMuted }]}>
                Niveli
              </Text>
            </View>

            <View style={[styles.specVerticalDivider, { backgroundColor: colors.border }]} />

            {/* Type / Condition */}
            <View style={styles.architecturalSpecCell}>
              <Building2 size={18} color={colors.textMuted} strokeWidth={2.2} />
              <Text style={[styles.specValueText, { color: colors.textPrimary }]} numberOfLines={1}>
                {listing.apartment_type || listing.condition || 'Banesë'}
              </Text>
              <Text style={[styles.specLabelText, { color: colors.textMuted }]}>
                Lloji
              </Text>
            </View>
          </View>

          {/* ── EXPANDABLE DESCRIPTION (editorial canvas section) ── */}
          {Boolean(listing.description) && (
            <View style={styles.canvasSection}>
              <Text style={[styles.sectionOverline, { color: colors.textMuted }]}>
                PËRSHKRIMI
              </Text>
              <Text
                style={[styles.editorialDescriptionText, { color: colors.textSecondary }]}
                numberOfLines={descExpanded ? undefined : 4}
              >
                {listing.description}
              </Text>

              {listing.description.length > 180 && (
                <TactilePressable
                  style={styles.expandDescBtn}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync()
                    setDescExpanded((p) => !p)
                  }}
                  activeScale={0.97}
                  haptic="light"
                  hitSlop={8}
                >
                  <Text style={[styles.expandDescBtnText, { color: brandHighlight }]}>
                    {descExpanded ? 'Trego më pak' : 'Lexo përshkrimin e plotë'}
                  </Text>
                  {descExpanded ? (
                    <ChevronUp size={16} color={brandHighlight} strokeWidth={2.4} />
                  ) : (
                    <ChevronDown size={16} color={brandHighlight} strokeWidth={2.4} />
                  )}
                </TactilePressable>
              )}
            </View>
          )}

          {/* ── CURATED AMENITIES (editorial canvas section) ── */}
          {listing.features && listing.features.length > 0 && (
            <View style={styles.canvasSection}>
              <View style={styles.cardHeaderWithCount}>
                <Text style={[styles.sectionOverline, { color: colors.textMuted }]}>
                  PAJISJET & KOMODITETET
                </Text>
                <Text style={[styles.countBadge, { color: colors.textMuted }]}>
                  {listing.features.length} veçori
                </Text>
              </View>

              <View style={styles.featuresTilesGrid}>
                {listing.features.map((feat, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.featureTile,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: specularBorder,
                      },
                    ]}
                  >
                    {getFeatureIcon(feat, brandHighlight)}
                    <Text style={[styles.featureTileText, { color: colors.textPrimary }]}>
                      {feat}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── INTERACTIVE MORTGAGE & AFFORDABILITY CALCULATOR (FOR SALES) ── */}
          {isSale && loanEstimate && (
            <View
              style={[
                styles.contentCard,
                { backgroundColor: colors.surface, borderColor: specularBorder },
              ]}
            >
              {/* Resting state: one confident metric + disclosure affordance */}
              <TactilePressable
                activeScale={0.985}
                haptic="selection"
                style={styles.loanHeadRow}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  setLoanExpanded((v) => !v)
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.loanOverline, { color: colors.textMuted }]}>
                    VLERËSIMI I KREDISË BANKARE
                  </Text>
                  <View style={styles.loanHeadlineRow}>
                    <Text style={[styles.loanBigValue, { color: colors.textPrimary }]}>
                      {fmtInt(loanEstimate.monthlyPayment)} €
                    </Text>
                    <Text style={[styles.loanPerMonth, { color: colors.textMuted }]}>/ muaj</Text>
                  </View>
                  <Text
                    style={[styles.loanHeadSub, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {loanDownPct}% pjesëmarrje • {loanYears} vjet •{' '}
                    {loanRate.toFixed(1).replace('.', ',')}% •{' '}
                    {loanMethod === 'annuity' ? 'anuitet' : 'këste zbritëse'}
                  </Text>
                </View>
                <ChevronDown
                  size={18}
                  color={colors.textMuted}
                  strokeWidth={2.2}
                  style={{ transform: [{ rotate: loanExpanded ? '180deg' : '0deg' }] }}
                />
              </TactilePressable>

              {loanExpanded && (
                <View style={styles.loanExpandedBody}>
                  {/* Repayment schedule method — the two standard bank models */}
                  <View
                    style={[
                      styles.loanSegmentRow,
                      { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                    ]}
                  >
                    {(['annuity', 'linear'] as const).map((m) => {
                      const selected = loanMethod === m
                      return (
                        <TactilePressable
                          key={m}
                          activeScale={0.97}
                          haptic="selection"
                          style={[
                            styles.loanSegmentBtn,
                            selected && { backgroundColor: colors.surface, borderColor: specularBorder },
                          ]}
                          onPress={() => {
                            if (Platform.OS !== 'web') Haptics.selectionAsync()
                            setLoanMethod(m)
                          }}
                        >
                          <Text
                            style={[
                              styles.loanSegmentBtnText,
                              {
                                color: selected ? colors.textPrimary : colors.textMuted,
                                fontFamily: selected ? Fonts.bold : Fonts.medium,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {m === 'annuity' ? 'Këste të barabarta' : 'Këste zbritëse'}
                          </Text>
                        </TactilePressable>
                      )
                    })}
                  </View>

                  <Text style={[styles.loanGroupLabel, { color: colors.textMuted }]}>
                    Pjesëmarrja fillestare
                  </Text>
                  <View style={styles.loanChipRow}>
                    {([10, 15, 20, 30] as const).map((pct) => {
                      const selected = loanDownPct === pct
                      return (
                        <TactilePressable
                          key={pct}
                          activeScale={0.94}
                          haptic="selection"
                          style={[
                            styles.loanChip,
                            {
                              backgroundColor: selected
                                ? theme === 'green'
                                  ? colors.gold
                                  : colors.primary
                                : colors.surfaceSubtle,
                              borderColor: selected ? 'transparent' : specularBorder,
                            },
                          ]}
                          onPress={() => {
                            if (Platform.OS !== 'web') Haptics.selectionAsync()
                            setLoanDownPct(pct)
                          }}
                        >
                          <Text
                            style={[
                              styles.loanChipText,
                              {
                                color: selected
                                  ? theme === 'green'
                                    ? '#071C18'
                                    : '#FFFFFF'
                                  : colors.textSecondary,
                                fontFamily: selected ? Fonts.bold : Fonts.medium,
                              },
                            ]}
                          >
                            {pct}%
                          </Text>
                        </TactilePressable>
                      )
                    })}
                  </View>

                  <Text style={[styles.loanGroupLabel, { color: colors.textMuted }]}>
                    Afati i kredisë
                  </Text>
                  <View style={styles.loanChipRow}>
                    {([10, 15, 20, 25] as const).map((yr) => {
                      const selected = loanYears === yr
                      return (
                        <TactilePressable
                          key={yr}
                          activeScale={0.94}
                          haptic="selection"
                          style={[
                            styles.loanChip,
                            {
                              backgroundColor: selected
                                ? theme === 'green'
                                  ? colors.gold
                                  : colors.primary
                                : colors.surfaceSubtle,
                              borderColor: selected ? 'transparent' : specularBorder,
                            },
                          ]}
                          onPress={() => {
                            if (Platform.OS !== 'web') Haptics.selectionAsync()
                            setLoanYears(yr)
                          }}
                        >
                          <Text
                            style={[
                              styles.loanChipText,
                              {
                                color: selected
                                  ? theme === 'green'
                                    ? '#071C18'
                                    : '#FFFFFF'
                                  : colors.textSecondary,
                                fontFamily: selected ? Fonts.bold : Fonts.medium,
                              },
                            ]}
                          >
                            {yr} vjet
                          </Text>
                        </TactilePressable>
                      )
                    })}
                  </View>

                  <Text style={[styles.loanGroupLabel, { color: colors.textMuted }]}>
                    Norma vjetore e interesit
                  </Text>
                  <View style={styles.loanChipRow}>
                    {([3.9, 4.5, 5.0, 5.5] as const).map((rt) => {
                      const selected = loanRate === rt
                      return (
                        <TactilePressable
                          key={rt}
                          activeScale={0.94}
                          haptic="selection"
                          style={[
                            styles.loanChip,
                            {
                              backgroundColor: selected
                                ? theme === 'green'
                                  ? colors.gold
                                  : colors.primary
                                : colors.surfaceSubtle,
                              borderColor: selected ? 'transparent' : specularBorder,
                            },
                          ]}
                          onPress={() => {
                            if (Platform.OS !== 'web') Haptics.selectionAsync()
                            setLoanRate(rt)
                          }}
                        >
                          <Text
                            style={[
                              styles.loanChipText,
                              {
                                color: selected
                                  ? theme === 'green'
                                    ? '#071C18'
                                    : '#FFFFFF'
                                  : colors.textSecondary,
                                fontFamily: selected ? Fonts.bold : Fonts.medium,
                              },
                            ]}
                          >
                            {rt.toFixed(1).replace('.', ',')}%
                          </Text>
                        </TactilePressable>
                      )
                    })}
                  </View>

                  {/* Amortization breakdown — hairline ledger, no nested cards */}
                  <View style={[styles.loanBreakBox, { borderColor: specularBorder }]}>
                    <View style={styles.loanBreakRow}>
                      <Text style={[styles.loanBreakLabel, { color: colors.textMuted }]}>
                        Pjesëmarrja fillestare
                      </Text>
                      <Text style={[styles.loanBreakValue, { color: colors.textPrimary }]}>
                        {fmtInt(loanEstimate.downPaymentAmount)} €
                      </Text>
                    </View>
                    <View style={styles.loanBreakRow}>
                      <Text style={[styles.loanBreakLabel, { color: colors.textMuted }]}>
                        Shuma e kredisë
                      </Text>
                      <Text style={[styles.loanBreakValue, { color: colors.textPrimary }]}>
                        {fmtInt(loanEstimate.loanAmount)} €
                      </Text>
                    </View>
                    <View style={styles.loanBreakRow}>
                      <Text style={[styles.loanBreakLabel, { color: colors.textMuted }]}>
                        Interesi total ({loanEstimate.totalPayments} këste)
                      </Text>
                      <Text style={[styles.loanBreakValue, { color: colors.textPrimary }]}>
                        {fmtInt(loanEstimate.totalInterest)} €
                      </Text>
                    </View>
                    {loanMethod === 'linear' && (
                      <View style={styles.loanBreakRow}>
                        <Text style={[styles.loanBreakLabel, { color: colors.textMuted }]}>
                          Kësti i fundit (i zbritur)
                        </Text>
                        <Text style={[styles.loanBreakValue, { color: colors.textPrimary }]}>
                          {fmtInt(loanEstimate.lastPayment)} €
                        </Text>
                      </View>
                    )}
                    {loanMethod === 'linear' && loanEstimate.annuityInterest != null && (
                      <View style={styles.loanBreakRow}>
                        <Text style={[styles.loanBreakLabel, { color: colors.textMuted }]}>
                          Kursim interesi vs anuitet
                        </Text>
                        <Text
                          style={[
                            styles.loanBreakValue,
                            { color: theme === 'green' ? colors.gold : colors.primary },
                          ]}
                        >
                          − {fmtInt(Math.max(0, loanEstimate.annuityInterest - loanEstimate.totalInterest))} €
                        </Text>
                      </View>
                    )}
                    {loanEstimate.balanceAfter5 != null && loanYears > 5 && (
                      <View style={styles.loanBreakRow}>
                        <Text style={[styles.loanBreakLabel, { color: colors.textMuted }]}>
                          Borxhi i mbetur pas 5 vjetëve
                        </Text>
                        <Text style={[styles.loanBreakValue, { color: colors.textPrimary }]}>
                          {fmtInt(loanEstimate.balanceAfter5)} €
                        </Text>
                      </View>
                    )}
                    <View style={styles.loanBreakRow}>
                      <Text style={[styles.loanBreakLabel, { color: colors.textMuted }]}>
                        Tarifa administrative (njëherësh)
                      </Text>
                      <Text style={[styles.loanBreakValue, { color: colors.textPrimary }]}>
                        {fmtInt(loanEstimate.adminFee)} €
                      </Text>
                    </View>
                    <View style={[styles.loanBreakRow, { paddingTop: 10 }]}>
                      <Text
                        style={[
                          styles.loanBreakLabel,
                          { color: colors.textPrimary, fontFamily: Fonts.bold },
                        ]}
                      >
                        Kostoja totale e kredisë
                      </Text>
                      <Text
                        style={[
                          styles.loanBreakValue,
                          { color: theme === 'green' ? colors.gold : colors.primary },
                        ]}
                      >
                        {fmtInt(loanEstimate.totalCost)} €
                      </Text>
                    </View>
                  </View>

                  {/* Cost structure: principal vs interest vs fees, to scale */}
                  <View style={styles.loanCostBar}>
                    <View
                      style={{
                        flex: loanEstimate.loanAmount,
                        backgroundColor: theme === 'green' ? colors.gold : colors.primary,
                      }}
                    />
                    <View style={{ flex: loanEstimate.totalInterest, backgroundColor: colors.textMuted }} />
                    <View style={{ flex: loanEstimate.adminFee, backgroundColor: colors.border }} />
                  </View>
                  <View style={styles.loanCostLegendRow}>
                    <View style={styles.loanLegendItem}>
                      <View
                        style={[
                          styles.loanLegendDot,
                          { backgroundColor: theme === 'green' ? colors.gold : colors.primary },
                        ]}
                      />
                      <Text style={[styles.loanLegendText, { color: colors.textMuted }]}>
                        Kredia {fmtInt(loanEstimate.loanAmount)} €
                      </Text>
                    </View>
                    <View style={styles.loanLegendItem}>
                      <View style={[styles.loanLegendDot, { backgroundColor: colors.textMuted }]} />
                      <Text style={[styles.loanLegendText, { color: colors.textMuted }]}>
                        Interesi {fmtInt(loanEstimate.totalInterest)} €
                      </Text>
                    </View>
                    <View style={styles.loanLegendItem}>
                      <View style={[styles.loanLegendDot, { backgroundColor: colors.border }]} />
                      <Text style={[styles.loanLegendText, { color: colors.textMuted }]}>
                        Tarifa {fmtInt(loanEstimate.adminFee)} €
                      </Text>
                    </View>
                  </View>

                  {/* Optional affordability check — DTI against prudent bank norm */}
                  <Text style={[styles.loanGroupLabel, { color: colors.textMuted }]}>
                    Përballueshmëria (opsionale)
                  </Text>
                  <View
                    style={[
                      styles.loanIncomeRow,
                      { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                    ]}
                  >
                    <Text style={[styles.loanIncomeLabel, { color: colors.textMuted }]}>
                      Të ardhurat neto mujore
                    </Text>
                    <TextInput
                      style={[styles.loanIncomeInput, { color: colors.textPrimary }]}
                      placeholder="psh. 800"
                      placeholderTextColor={colors.textLight}
                      value={incomeStr}
                      onChangeText={(v) => setIncomeStr(v.replace(/[^\d]/g, '').slice(0, 6))}
                      keyboardType="number-pad"
                      returnKeyType="done"
                    />
                    <Text style={[styles.loanIncomeSuffix, { color: colors.textMuted }]}>€</Text>
                  </View>
                  {loanEstimate.dti != null && (
                    <Text
                      style={[
                        styles.loanDtiText,
                        {
                          color:
                            loanEstimate.dti <= 0.4
                              ? colors.textSecondary
                              : theme === 'green'
                              ? colors.gold
                              : '#B45309',
                        },
                      ]}
                    >
                      Kësti i parë = {(loanEstimate.dti * 100).toFixed(0)}% e të ardhurave • kufiri
                      prudent i bankave ≈ 40%
                    </Text>
                  )}

                  <Text style={[styles.mortgageDisclaimer, { color: colors.textMuted }]}>
                    Vlerësim orientues i kushteve të tregut kosovar (norma 3,8–5,5%). Nuk është
                    ofertë e detyrueshme — kushtet finale i përcakton banka juaj.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── VERIFIED CREATOR & AGENCY SHOWCASE (AIRBNB SUPERHOST ARCHITECTURE) ── */}
          <TactilePressable
            style={[
              styles.hostProfileCard,
              {
                backgroundColor: colors.surface,
                borderColor: specularBorder,
              },
            ]}
            onPress={() => {
              if (listing?.user_id) {
                if (Platform.OS !== 'web') Haptics.selectionAsync()
                router.push({
                  pathname: '/profili/[id]',
                  params: { id: listing.user_id },
                })
              }
            }}
            activeScale={0.985}
            haptic="selection"
            hitSlop={6}
          >
            {/* Core Identity Row */}
            <View style={styles.hostIdentityMainRow}>
              <View style={[styles.hostAvatarPlain, { backgroundColor: colors.surfaceSubtle }]}>
                {seller?.avatar_url ? (
                  <Image
                    source={getAvatarSource(seller.avatar_url)}
                    style={styles.hostAvatarImg}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    priority="high"
                  />
                ) : (
                  <View style={[styles.hostAvatarFallback, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.hostAvatarInitials, { color: colors.primary }]}>
                      {(seller?.first_name?.[0] || seller?.company_name?.[0] || 'P').toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.hostNameRow}>
                  <Text
                    style={[styles.hostNameText, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {sellerName}
                  </Text>
                  {seller?.email_verified === true && (
                    <BadgeCheck size={15} color={brandHighlight} strokeWidth={2.2} />
                  )}
                </View>
                <Text
                  style={[styles.hostRoleLine, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {isCompany ? 'Agjenci imobiliare' : 'Pronar privat'}
                </Text>
              </View>

              <ChevronRight size={16} color={colors.textMuted} strokeWidth={2.2} />
            </View>
          </TactilePressable>

          {/* ── PRONA TË NGJASHME (CONTINUOUS DISCOVERY MOMENTUM) ── */}
          {similarListings.length > 0 && (
            <View style={styles.similarPropertiesSection}>
              <View style={styles.similarHeaderRow}>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  Prona të Ngjashme
                </Text>
                <Text style={[styles.similarCitySubtitle, { color: colors.textMuted }]}>
                  Në {listing.city}
                </Text>
              </View>

              <FlatList
                data={similarListings}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.similarListContent}
                renderItem={({ item }) => {
                  const cardImg = item.images && item.images.length > 0 ? { uri: item.images[0] } : FALLBACK_GALLERY_IMAGE
                  return (
                    <TactilePressable
                      style={[
                        styles.similarCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: specularBorder,
                        },
                      ]}
                      onPress={() => {
                        router.push(`/listings/${item.id}` as any)
                      }}
                      activeScale={0.96}
                      haptic="light"
                    >
                      <Image
                        source={cardImg}
                        style={[styles.similarCardImg, { backgroundColor: colors.surfaceSubtle }]}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={150}
                      />
                      <View style={styles.similarCardBody}>
                        <Text style={[styles.similarCardPrice, { color: brandHighlight }]}>
                          {formatPrice(item.price)}
                          {item.type === 'qira' && ' /muaj'}
                        </Text>
                        <Text style={[styles.similarCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={[styles.similarCardMeta, { color: colors.textMuted }]}>
                          {item.area_m2 ? `${item.area_m2} m²` : ''} {item.rooms ? `• ${item.rooms} Dhoma` : ''}
                        </Text>
                      </View>
                    </TactilePressable>
                  )
                }}
              />
            </View>
          )}

          {/* Bottom spacing so content never gets covered by floating action bar */}
          <View style={{ height: 130 }} />
        </View>
      </Animated.ScrollView>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. AIRBNB & APPLE FLOATING HIGH-CONVERSION BOTTOM ACTION BAR  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.bottomFloatingBarOuter,
          { borderTopColor: colors.tabBarBorder },
        ]}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 95 : 100}
          tint={colors.blurTint}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                theme === 'white'
                  ? 'rgba(255, 255, 255, 0.76)'
                  : theme === 'green'
                  ? 'rgba(7, 28, 24, 0.82)'
                  : 'rgba(12, 17, 16, 0.80)',
            },
          ]}
        />

        <View style={[styles.bottomBarContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {currentUser?.id === listing.user_id ? (
            <View style={styles.ownerBarContent}>
              <View style={styles.ownerBarLeft}>
                <ShieldCheck size={18} color={brandHighlight} strokeWidth={2.4} />
                <Text style={[styles.ownerBarTitle, { color: colors.textPrimary }]}>
                  Kjo është prona juaj
                </Text>
              </View>
              <TactilePressable
                style={[styles.ownerShareBtn, { backgroundColor: brandHighlight }]}
                onPress={handleShare}
                activeScale={0.94}
                haptic="selection"
              >
                <Share2 size={15} color={theme === 'green' ? '#071C18' : '#FFFFFF'} strokeWidth={2.4} />
                <Text style={[styles.ownerShareBtnText, { color: theme === 'green' ? '#071C18' : '#FFFFFF' }]}>
                  Shpërndaj
                </Text>
              </TactilePressable>
            </View>
          ) : (
            <View style={styles.buyerActionGrid}>
              {/* Left Column: Price Anchor with Subtitle */}
              <View style={styles.bottomPriceCol}>
                <Text style={[styles.bottomPriceValue, { color: brandHighlight }]}>
                  {formatPrice(listing.price)}
                </Text>
                <Text style={[styles.bottomPriceSub, { color: colors.textMuted }]}>
                  {listing.type === 'shitje' && listing.area_m2
                    ? `≈ ${new Intl.NumberFormat('de-DE').format(Math.round(listing.price / listing.area_m2))} €/m²`
                    : listing.type === 'qira'
                    ? 'Kësti mujor'
                    : 'Çmimi i plotë'}
                </Text>
              </View>

              {/* Right Column: High-Conversion Tactile Actions */}
              <View style={styles.bottomActionsCol}>
                {/* 1. Direct Cellular / Voice Call Button */}
                <TactilePressable
                  activeScale={0.92}
                  haptic="medium"
                  style={[
                    styles.roundCallIconBtn,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: specularBorder,
                    },
                  ]}
                  onPress={handleCall}
                  hitSlop={6}
                  accessibilityLabel="Telefono shitësin"
                >
                  <Phone size={18} color={colors.textPrimary} strokeWidth={2.2} />
                </TactilePressable>

                {/* 2. WhatsApp Direct Button — solid, stable, and synchronous brand green from frame 0 */}
                <TactilePressable
                  activeScale={0.94}
                  haptic="medium"
                  style={styles.whatsAppActionPill}
                  onPress={() => handleWhatsApp()}
                  hitSlop={6}
                  accessibilityLabel="Bisedo në WhatsApp"
                >
                  <MessageCircle
                    size={17}
                    color="#FFFFFF"
                    strokeWidth={2.4}
                  />
                  <Text style={styles.whatsAppActionPillText}>
                    WhatsApp
                  </Text>
                </TactilePressable>

                {/* 3. In-App Direct Chat Primary CTA */}
                <TactilePressable
                  activeScale={0.94}
                  haptic="medium"
                  style={[
                    styles.primaryChatCta,
                    { backgroundColor: brandHighlight },
                  ]}
                  onPress={() => handleChat()}
                  disabled={startingChat}
                  hitSlop={6}
                >
                  {startingChat ? (
                    <ActivityIndicator size="small" color={theme === 'green' ? '#071C18' : '#FFFFFF'} />
                  ) : (
                    <>
                      <MessageSquare
                        size={17}
                        color={theme === 'green' ? '#071C18' : '#FFFFFF'}
                        strokeWidth={2.4}
                      />
                      <Text
                        style={[
                          styles.primaryChatCtaText,
                          { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
                        ]}
                      >
                        Bisedo
                      </Text>
                    </>
                  )}
                </TactilePressable>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. IMMERSIVE FULLSCREEN PHOTO LIGHTBOX (DRAG-TO-DISMISS)      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <MediaLightbox
        images={imagesList}
        visible={fullscreenVisible}
        initialIndex={fullscreenIdx}
        title={listing?.title}
        onClose={() => setFullscreenVisible(false)}
        onIndexChange={setFullscreenIdx}
        onShare={handleShare}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. CONTACT OPTIONS SHEET                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <CallModal
        visible={contactModalVisible}
        onClose={() => setContactModalVisible(false)}
        counterpartName={sellerName}
        counterpartAvatar={seller?.avatar_url}
        counterpartPhone={effectiveCallNumber}
        listingTitle={listing?.title}
        counterpartUserId={listing?.user_id ?? null}
        isSignedIn={Boolean(currentUser)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  backBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 8,
  },
  backBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
  },

  // 1. Dynamic Floating & Sticky Top Navigation Bar
  floatingNavSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  floatingNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 52,
  },
  navCenterContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  navStickyTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  navStickyPrice: {
    fontSize: 12,
    fontFamily: Fonts.extraBold,
  },
  navCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(0, 0, 0, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // 2. Cinematic Hero Gallery
  scrollView: {
    flex: 1,
  },
  heroGalleryWrapper: {
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  heroImage: {
    width: '100%',
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
  },
  bottomVignette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  paginationDotsRow: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  paginationDot: {
    height: 5,
    borderRadius: 2.5,
  },
  heroLeftBadgesRow: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeTagCapsule: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  typeTagText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontFamily: Fonts.black,
    letterSpacing: 0.5,
  },
  featuredTagCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredTagText: {
    color: '#3E2A00',
    fontSize: 10.5,
    fontFamily: Fonts.black,
    letterSpacing: 0.4,
  },
  photoCountBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(0, 0, 0, 0.65)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontFamily: Fonts.bold,
  },

  // 3. Editorial Narrative Body
  narrativeBody: {
    paddingHorizontal: 18,
    paddingTop: 20,
    gap: 20,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  priceSection: {
    gap: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceTextWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceHeroNumber: {
    fontSize: 28,
    fontFamily: Fonts.black,
    letterSpacing: -0.6,
  },
  periodLabel: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
  },
  pricePerM2Pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pricePerM2Label: {
    fontSize: 12.5,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  editorialTitle: {
    fontSize: 21,
    fontFamily: Fonts.extraBold,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  locationPinGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  locationLabel: {
    fontSize: 13.5,
    fontFamily: Fonts.medium,
    lineHeight: 18,
    flex: 1,
  },
  mapChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mapChipText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },

  // 4. Architectural Specs Strip — hairline-ruled canvas band, no card chrome
  specStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  // Editorial canvas section: overline heading on the bare background
  canvasSection: {
    marginTop: 8,
    gap: 12,
  },
  sectionOverline: {
    fontSize: 10.5,
    letterSpacing: 1.1,
    fontFamily: Fonts.bold,
  },
  architecturalSpecCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  specValueText: {
    fontSize: 13.5,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  specLabelText: {
    fontSize: 10.5,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  specVerticalDivider: {
    width: StyleSheet.hairlineWidth,
    height: 38,
  },

  // 5. Section Typography
  sectionHeading: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },

  // 6. Generic Content Card
  contentCard: {
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  editorialDescriptionText: {
    fontSize: 14.5,
    fontFamily: Fonts.regular,
    lineHeight: 23,
    letterSpacing: -0.15,
  },
  expandDescBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
    alignSelf: 'flex-start',
  },
  expandDescBtnText: {
    fontSize: 13.5,
    fontFamily: Fonts.bold,
  },

  // 7. Amenities Tiles Grid
  cardHeaderWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countBadge: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  featuresTilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  featureTileText: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    letterSpacing: -0.1,
  },

  // 8. Mortgage & Affordability Engine
  loanHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loanOverline: {
    fontSize: 10.5,
    letterSpacing: 1.1,
    fontFamily: Fonts.bold,
    marginBottom: 6,
  },
  loanHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  loanBigValue: {
    fontSize: 30,
    fontFamily: Fonts.bold,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  loanPerMonth: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  loanHeadSub: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    marginTop: 4,
  },
  loanExpandedBody: {
    marginTop: 6,
  },
  loanGroupLabel: {
    fontSize: 11.5,
    letterSpacing: 0.2,
    fontFamily: Fonts.semiBold,
    marginTop: 16,
    marginBottom: 8,
  },
  loanChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  loanChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loanChipText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  loanBreakBox: {
    marginTop: 18,
  },
  loanBreakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 9,
    gap: 12,
  },
  loanBreakLabel: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    flexShrink: 1,
  },
  loanBreakValue: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
  },
  loanSegmentRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 3,
    marginTop: 16,
  },
  loanSegmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loanSegmentBtnText: {
    fontSize: 12.5,
    letterSpacing: -0.1,
  },
  loanCostBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 16,
    gap: 2,
  },
  loanCostLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  loanLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  loanLegendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  loanLegendText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    fontVariant: ['tabular-nums'],
  },
  loanIncomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  loanIncomeLabel: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: Fonts.medium,
  },
  loanIncomeInput: {
    width: 84,
    fontSize: 14,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    paddingVertical: 0,
  },
  loanIncomeSuffix: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  loanDtiText: {
    fontSize: 11.5,
    fontFamily: Fonts.medium,
    lineHeight: 16,
    marginTop: -4,
  },
  mortgageDisclaimer: {
    fontSize: 10.5,
    fontFamily: Fonts.regular,
    lineHeight: 14,
    marginTop: 12,
  },

  // 9. Host & Agency Identity Card
  hostProfileCard: {
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
    padding: 16,
  },
  hostIdentityMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  hostAvatarPlain: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  hostAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  hostAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarInitials: {
    fontSize: 20,
    fontFamily: Fonts.extraBold,
  },
  hostNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hostNameText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  hostRoleLine: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },

  // 10. Similar Properties Section
  similarPropertiesSection: {
    gap: 14,
    marginTop: 4,
  },
  similarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  similarCitySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  similarListContent: {
    paddingRight: 18,
    gap: 14,
  },
  similarCard: {
    width: 220,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  similarCardImg: {
    width: '100%',
    height: 130,
  },
  similarCardBody: {
    padding: 12,
    gap: 3,
  },
  similarCardPrice: {
    fontSize: 15,
    fontFamily: Fonts.black,
  },
  similarCardTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  similarCardMeta: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },

  // 12. Floating Luxury Bottom Action Bar
  bottomFloatingBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  bottomBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  buyerActionGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bottomPriceCol: {
    justifyContent: 'center',
    gap: 1,
    minWidth: 100,
  },
  bottomPriceValue: {
    fontSize: 19,
    fontFamily: Fonts.black,
    letterSpacing: -0.4,
  },
  bottomPriceSub: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  bottomActionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  roundCallIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsAppActionPill: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },
  whatsAppActionPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  primaryChatCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryChatCtaText: {
    fontSize: 13.5,
    fontFamily: Fonts.bold,
  },
  ownerBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  ownerBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerBarTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  ownerShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  ownerShareBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },

  // 13. Fullscreen Lightbox Modal
  fullscreenModalRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  lightboxHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  lightboxIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  lightboxCounterBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  lightboxCounterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  fullscreenSlide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxThumbnailStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingTop: 10,
  },
  lightboxThumbItem: {
    width: 60,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  lightboxThumbSelected: {
    borderColor: '#FFFFFF',
  },
})
