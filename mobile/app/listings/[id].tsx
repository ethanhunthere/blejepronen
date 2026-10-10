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
  Keyboard,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Image } from 'expo-image'
import {
  ArrowLeft,
  ChevronLeft,
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
  SlidersHorizontal,
  Calculator,
  Flag,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase, Listing } from '@/lib/supabase'
import { apiResolveContacts } from '@/lib/api'
import { useTrackListingView, trackListingFavorite, trackListingLead } from '@/lib/listing-analytics'
import { MarketDeltaCard } from '@/components/MarketDeltaCard'
import { ReportListingSheet } from '@/components/ReportListingSheet'
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
  useTrackListingView(listing?.id, { ownerId: listing?.user_id })
  const [loading, setLoading] = useState(() => !cachedListing)
  const [reportOpen, setReportOpen] = useState(false)
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
  const [loanYears, setLoanYears] = useState<number>(20)
  const [loanDownPct, setLoanDownPct] = useState<number>(20)
  const [loanRate, setLoanRate] = useState<number>(4.5)
  const [loanMethod, setLoanMethod] = useState<'annuity' | 'linear'>('annuity')
  const [customDownPctStr, setCustomDownPctStr] = useState('')
  const [customYearsStr, setCustomYearsStr] = useState('')
  const [customRateStr, setCustomRateStr] = useState('')
  const [incomeStr, setIncomeStr] = useState('')
  const [customDtiLimitStr, setCustomDtiLimitStr] = useState('40')
  const [customAdminFeePctStr, setCustomAdminFeePctStr] = useState('0.5')
  const [customExtraMonthlyStr, setCustomExtraMonthlyStr] = useState('')
  const [advancedLoanOpen, setAdvancedLoanOpen] = useState(false)
  const [similarListings, setSimilarListings] = useState<Listing[]>([])

  // Dynamic Scroll Tracking for Apple & Airbnb-grade sticky header crossfade
  const scrollY = useRef(new Animated.Value(0)).current
  const [isHeaderSticky, setIsHeaderSticky] = useState(false)

  const heroHeight = Math.min(420, Math.round(windowWidth * 0.94))

  // Track sticky state for high-end dynamic contrast shifts
  useEffect(() => {
    const threshold = heroHeight - 80
    const listenerId = scrollY.addListener(({ value }) => {
      const sticky = value >= threshold
      setIsHeaderSticky((prev) => (prev !== sticky ? sticky : prev))
    })
    return () => {
      scrollY.removeListener(listenerId)
    }
  }, [heroHeight, scrollY])

  // Crystalline header backdrop wash crossfade
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [heroHeight - 130, heroHeight - 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  // Button transitions: floating optical lens -> sticky sculptured disc
  const floatingBtnOpacity = scrollY.interpolate({
    inputRange: [heroHeight - 130, heroHeight - 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const stickyBtnOpacity = scrollY.interpolate({
    inputRange: [heroHeight - 130, heroHeight - 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  // Header editorial title & price crossfade and translation
  const headerContentOpacity = scrollY.interpolate({
    inputRange: [heroHeight - 95, heroHeight - 35],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const headerContentTranslateY = scrollY.interpolate({
    inputRange: [heroHeight - 95, heroHeight - 35],
    outputRange: [6, 0],
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
      .filter(
        (l) =>
          l.id !== currentId &&
          l.is_active !== false &&
          (l.city === currentCity || l.type === currentType)
      )
      .slice(0, 6)

    if (matches.length >= 3) {
      setSimilarListings(matches)
    } else {
      async function fetchSimilar() {
        try {
          const { data } = await supabase
            .from('listings')
            .select(
              'id,title,price,city,neighborhood,address,type,images,rooms,area_m2,floor,apartment_type,is_featured,is_active,created_at,user_id,condition,features'
            )
            .eq('city', currentCity)
            .eq('is_active', true)
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
      const [{ data }, session] = await Promise.all([
        supabase
          .from('profiles_public')
          .select('*')
          .eq('id', targetUserId)
          .maybeSingle(),
        supabase.auth.getSession(),
      ])
      // Phone resolves through the gated web route (profiles is owner-only).
      const contacts = await apiResolveContacts(
        session.data.session?.access_token ?? null,
        `listingId=${encodeURIComponent(listing?.id || cachedListing?.id || '')}`
      )
      if (isMounted && (data || contacts?.phone)) {
        setListing((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            profiles: {
              ...(prev.profiles || {}),
              ...(data || {}),
              phone: contacts?.phone ?? (prev.profiles as any)?.phone ?? null,
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
    } else if (res.success && res.isFavorite) {
      void trackListingFavorite(listing.id, { ownerId: listing.user_id })
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
    if (listing) void trackListingLead(listing.id, { ownerId: listing.user_id })
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
    if (listing) void trackListingLead(listing.id, { ownerId: listing.user_id })
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
    void trackListingLead(listing.id, { ownerId: listing.user_id })
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

  // Mortgage affordability engine, calibrated for standard Kosovar retail lending
  // and completely flexible for custom user inputs: tenors 1–40 years, down payments 0–95%,
  // custom rates 0.1–30%, and repayment schedules (annuity & linear).
  const loanEstimate = useMemo(() => {
    if (!listing?.price || listing.price <= 0 || listing.type !== 'shitje') return null

    const safeDownPct = Math.min(95, Math.max(0, Number(loanDownPct) || 0))
    const safeYears = Math.min(40, Math.max(1, Number(loanYears) || 1))
    const safeRate = Math.min(30, Math.max(0.1, Number(loanRate) || 0.1))

    const downPaymentAmount = Math.round((listing.price * safeDownPct) / 100)
    const loanAmount = Math.max(0, listing.price - downPaymentAmount)
    const n = Math.max(1, safeYears * 12)
    const rm = safeRate / 100 / 12

    const parsedAdminFeePct = Math.min(10, Math.max(0, parseFloat(customAdminFeePctStr.replace(',', '.')) || 0))
    const adminFee = Math.round((loanAmount * parsedAdminFeePct) / 100)

    const extraMonthly = Math.max(0, parseFloat(customExtraMonthlyStr.replace(/[^\d.]/g, '')) || 0)
    const parsedDtiLimit = Math.min(90, Math.max(10, parseFloat(customDtiLimitStr.replace(',', '.')) || 40))

    if (loanAmount <= 0) {
      return {
        monthlyPayment: 0,
        firstPayment: 0,
        lastPayment: 0,
        effectivePayment: 0,
        extraMonthly: 0,
        downPaymentAmount,
        loanAmount: 0,
        totalInterest: 0,
        annuityInterest: 0,
        balanceAfter5: 0,
        adminFee: 0,
        adminFeePct: parsedAdminFeePct,
        totalCost: downPaymentAmount,
        totalPayments: n,
        dti: null,
        dtiLimit: parsedDtiLimit,
        incomeNum: 0,
        maxAffordablePayment: null,
        disposableIncome: null,
      }
    }

    let monthlyPayment: number
    let firstPayment: number
    let lastPayment: number
    let totalInterest: number
    let balanceAfter5: number | null

    if (loanMethod === 'annuity') {
      const factor = Math.pow(1 + rm, n)
      monthlyPayment = factor === 1 ? loanAmount / n : (loanAmount * (rm * factor)) / (factor - 1)
      firstPayment = monthlyPayment
      lastPayment = monthlyPayment
      totalInterest = monthlyPayment * n - loanAmount
      const k = Math.min(60, n)
      const factorK = Math.pow(1 + rm, k)
      balanceAfter5 = k >= n ? 0 : (loanAmount * (factor - factorK)) / (factor - 1)
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
    const annuityFactor = Math.pow(1 + rm, n)
    const annuityInterest =
      loanMethod === 'linear'
        ? (annuityFactor === 1 ? 0 : ((loanAmount * (rm * annuityFactor)) / (annuityFactor - 1)) * n - loanAmount)
        : null

    const incomeNum = parseFloat(incomeStr.replace(/[^\d.]/g, '')) || 0
    const effectivePayment = Math.round(firstPayment + extraMonthly)
    const dti = incomeNum > 0 ? effectivePayment / incomeNum : null
    const maxAffordablePayment = incomeNum > 0 ? Math.round(incomeNum * (parsedDtiLimit / 100)) : null
    const disposableIncome = incomeNum > 0 ? Math.max(0, Math.round(incomeNum - effectivePayment)) : null

    return {
      monthlyPayment: Math.round(monthlyPayment),
      firstPayment: Math.round(firstPayment),
      lastPayment: Math.round(lastPayment),
      effectivePayment,
      extraMonthly: Math.round(extraMonthly),
      downPaymentAmount,
      loanAmount,
      totalInterest: Math.round(Math.max(0, totalInterest)),
      annuityInterest: annuityInterest != null ? Math.round(Math.max(0, annuityInterest)) : null,
      balanceAfter5: balanceAfter5 != null ? Math.round(Math.max(0, balanceAfter5)) : null,
      adminFee,
      adminFeePct: parsedAdminFeePct,
      totalCost: Math.round(loanAmount + Math.max(0, totalInterest) + adminFee),
      totalPayments: n,
      dti,
      dtiLimit: parsedDtiLimit,
      incomeNum,
      maxAffordablePayment,
      disposableIncome,
    }
  }, [
    listing?.price,
    listing?.type,
    loanYears,
    loanDownPct,
    loanRate,
    loanMethod,
    incomeStr,
    customDtiLimitStr,
    customAdminFeePctStr,
    customExtraMonthlyStr,
  ])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
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
      {/* 1. APPLE & AIRBNB DYNAMIC TOP NAVIGATION BAR (DUAL-LAYER LUXURY) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View style={[styles.floatingNavSafeArea, { paddingTop: insets.top }]} pointerEvents="box-none">
        {/* Solid / Frosted Crystalline Background that fades in seamlessly on scroll */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.floatingNavBackground,
            {
              opacity: headerBgOpacity,
              borderBottomColor: specularBorder,
            },
          ]}
          pointerEvents="none"
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
                    ? 'rgba(255, 255, 255, 0.82)'
                    : theme === 'green'
                    ? 'rgba(7, 28, 24, 0.88)'
                    : 'rgba(12, 17, 16, 0.84)',
              },
            ]}
          />
        </Animated.View>

        {/* Navigation Action Buttons & Truly Responsive Editorial Identity Row */}
        <View style={styles.floatingNavRow} pointerEvents="box-none">
          {/* Back Button with Dual-Layer Adaptive State */}
          <TactilePressable
            style={styles.navActionBtnWrap}
            onPress={() => safeBack(router, '/(tabs)/listings')}
            hitSlop={10}
            activeScale={0.92}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel="Kthehu mbrapa"
          >
            {/* Layer A: Floating Optical Glass Lens (Over photo) */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.navCircleFloatingLens,
                { opacity: floatingBtnOpacity },
              ]}
              pointerEvents="none"
            >
              <BlurView
                intensity={Platform.OS === 'ios' ? 75 : 100}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.navOpticalCenter}>
                <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.4} style={{ marginLeft: -1 }} />
              </View>
            </Animated.View>

            {/* Layer B: Sticky Refined Disc (Adapts to current color palette) */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.navCircleStickyDisc,
                {
                  opacity: stickyBtnOpacity,
                  backgroundColor:
                    theme === 'white'
                      ? 'rgba(255, 255, 255, 0.90)'
                      : colors.surfaceSubtle,
                  borderColor: specularBorder,
                },
              ]}
              pointerEvents="none"
            >
              <View style={styles.navOpticalCenter}>
                <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={2.4} style={{ marginLeft: -1 }} />
              </View>
            </Animated.View>
          </TactilePressable>

          {/* Truly Responsive Editorial Identity Block (Centered in available viewport space) */}
          <Animated.View
            style={[
              styles.navCenterFlex,
              {
                opacity: headerContentOpacity,
                transform: [{ translateY: headerContentTranslateY }],
              },
            ]}
            pointerEvents="none"
          >
            <Text
              style={[styles.navStickyTitle, { color: colors.textPrimary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {listing.title}
            </Text>
            <Text style={styles.navStickySubLine} numberOfLines={1} ellipsizeMode="tail">
              <Text style={[styles.navStickyPrice, { color: brandHighlight }]}>
                {formatPrice(listing.price)}{listing.type === 'qira' ? ' /muaj' : ''}
              </Text>
              {Boolean(listing.city || listing.neighborhood) && (
                <Text style={[styles.navStickyLocation, { color: colors.textMuted }]}>
                  {' • ' + (listing.city || listing.neighborhood)}
                </Text>
              )}
            </Text>
          </Animated.View>

          {/* Right Action Cluster: Share & Favorite */}
          <View style={styles.navRightGroup}>
            {/* Share Button with Dual-Layer Adaptive State */}
            <TactilePressable
              style={styles.navActionBtnWrap}
              onPress={handleShare}
              hitSlop={10}
              activeScale={0.92}
              haptic="light"
              accessibilityRole="button"
              accessibilityLabel="Shpërndaj pronën"
            >
              {/* Layer A: Floating Optical Glass Lens */}
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  styles.navCircleFloatingLens,
                  { opacity: floatingBtnOpacity },
                ]}
                pointerEvents="none"
              >
                <BlurView
                  intensity={Platform.OS === 'ios' ? 75 : 100}
                  tint="dark"
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.navOpticalCenter}>
                  <Share2 size={17} color="#FFFFFF" strokeWidth={2.2} />
                </View>
              </Animated.View>

              {/* Layer B: Sticky Refined Disc */}
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  styles.navCircleStickyDisc,
                  {
                    opacity: stickyBtnOpacity,
                    backgroundColor:
                      theme === 'white'
                        ? 'rgba(255, 255, 255, 0.90)'
                        : colors.surfaceSubtle,
                    borderColor: specularBorder,
                  },
                ]}
                pointerEvents="none"
              >
                <View style={styles.navOpticalCenter}>
                  <Share2 size={17} color={colors.textPrimary} strokeWidth={2.2} />
                </View>
              </Animated.View>
            </TactilePressable>

            {/* Favorite Button (Adapts variant to sticky state seamlessly) */}
            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={handleFavoriteToggle}
              canToggle={() => !!getSyncAuthUser()}
              size={42}
              iconSize={19}
              variant={!isHeaderSticky || theme !== 'white' ? 'dark' : 'light'}
            />

            {/* Report / flag — UGC moderation entry point */}
            <TactilePressable
              style={styles.navActionBtnWrap}
              onPress={() => setReportOpen(true)}
              hitSlop={10}
              activeScale={0.92}
              haptic="light"
              accessibilityRole="button"
              accessibilityLabel="Raporto këtë shpallje"
            >
              <View
                style={[
                  styles.navCircleStickyDisc,
                  { backgroundColor: 'rgba(17,24,39,0.55)' },
                ]}
              >
                <Flag size={16} color="#FFFFFF" strokeWidth={2.2} />
              </View>
            </TactilePressable>
          </View>
        </View>
      </View>

      <ReportListingSheet
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        listingId={listing?.id ?? null}
        listingTitle={listing?.title}
        listingCity={listing?.city}
        onRequireAuth={() => {
          setReportOpen(false)
          openLoginScreen(router, { redirectTo: `/listings/${id}`, reason: 'report' })
        }}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. MAIN SCROLLABLE CONTENT BODY                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Animated.ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
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

          {/* Film-grade Top Edge Vignette Gradient (for flawless icon & status bar contrast) */}
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.65)', 'rgba(0, 0, 0, 0.35)', 'rgba(0, 0, 0, 0.12)', 'rgba(0, 0, 0, 0)']}
            locations={[0, 0.35, 0.70, 1.0]}
            style={[styles.topVignette, { height: Math.max(130, insets.top + 72) }]}
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

            {listing.type === 'shitje' && listing.area_m2 > 0 && listing.price > 0 ? (
              <MarketDeltaCard
                city={listing.city}
                pricePerM2={Math.round(listing.price / listing.area_m2)}
              />
            ) : null}

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
              {/* 1. Header with Badge & Title */}
              <View style={styles.loanCardHeader}>
                <View
                  style={[
                    styles.loanCardIconBox,
                    { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                  ]}
                >
                  <Calculator size={18} color={brandHighlight} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.loanOverline, { color: colors.textMuted }]}>
                    VLERËSIMI I KREDISË BANKARE
                  </Text>
                  <Text style={[styles.loanHeaderSubTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    Financim bankar deri në 90% të vlerës
                  </Text>
                </View>
              </View>

              {/* 2. Hero Monthly Payment Presentation (Immediate, Confident, Zero Friction) */}
              <View
                style={[
                  styles.loanHeroBox,
                  { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                ]}
              >
                <Text style={[styles.loanHeroLabel, { color: colors.textMuted }]}>
                  Kësti mujor i parashikuar
                </Text>
                <View style={styles.loanHeadlineRow}>
                  <Text style={[styles.loanBigValue, { color: brandHighlight }]}>
                    {fmtInt(loanEstimate.monthlyPayment)} €
                  </Text>
                  <Text style={[styles.loanPerMonth, { color: colors.textMuted }]}>/ muaj</Text>
                </View>
                <Text style={[styles.loanHeadSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {loanDownPct}% pjesëmarrje • {loanYears} vjet • {loanRate.toFixed(1).replace('.', ',')}% interes
                </Text>
              </View>

              {/* 3. Core Frictionless Knobs: Down Payment (Pjesëmarrja) */}
              <View style={styles.loanSectionGroup}>
                <View style={styles.loanSectionTitleRow}>
                  <Text style={[styles.loanGroupLabel, { color: colors.textPrimary }]}>
                    Pjesëmarrja fillestare
                  </Text>
                  <Text style={[styles.loanGroupSubInfo, { color: colors.textMuted }]}>
                    {fmtInt(loanEstimate.downPaymentAmount)} € ({loanDownPct}%)
                  </Text>
                </View>

                {/* 4 Responsive Equal-Width Preset Chips */}
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
                          setCustomDownPctStr(String(pct))
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

                {/* Custom Down Payment Input Row */}
                <View
                  style={[
                    styles.loanCustomInputRow,
                    { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                  ]}
                >
                  <View style={styles.loanCustomInputLabelCol}>
                    <Text style={[styles.loanCustomInputLabel, { color: colors.textPrimary }]}>
                      Përqindje e personalizuar
                    </Text>
                    <Text style={[styles.loanCustomInputSub, { color: colors.textMuted }]}>
                      Shuma: {fmtInt(loanEstimate.downPaymentAmount)} €
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.loanMiniInputBox,
                      { backgroundColor: colors.surface, borderColor: specularBorder },
                    ]}
                  >
                    <TextInput
                      style={[styles.loanMiniInput, { color: colors.textPrimary }]}
                      placeholder="20"
                      placeholderTextColor={colors.textLight}
                      value={customDownPctStr || (loanDownPct ? String(loanDownPct) : '')}
                      onChangeText={(val) => {
                        const clean = val.replace(/[^\d]/g, '').slice(0, 2)
                        setCustomDownPctStr(clean)
                        const num = parseInt(clean, 10)
                        if (!isNaN(num)) {
                          setLoanDownPct(Math.min(95, Math.max(0, num)))
                        } else if (clean === '') {
                          setLoanDownPct(0)
                        }
                      }}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                    <Text style={[styles.loanInputUnit, { color: colors.textMuted }]}>%</Text>
                  </View>
                </View>
              </View>

              {/* Quick Metrics Bar: Loan vs Down Payment vs Tenure */}
              <View style={[styles.loanQuickStatsRow, { borderColor: specularBorder }]}>
                <View style={styles.loanQuickStatCol}>
                  <Text style={[styles.loanQuickStatLabel, { color: colors.textMuted }]}>Kredia</Text>
                  <Text style={[styles.loanQuickStatVal, { color: colors.textPrimary }]}>
                    {fmtInt(loanEstimate.loanAmount)} €
                  </Text>
                </View>
                <View style={[styles.loanQuickStatDivider, { backgroundColor: specularBorder }]} />
                <View style={styles.loanQuickStatCol}>
                  <Text style={[styles.loanQuickStatLabel, { color: colors.textMuted }]}>Pjesëmarrja</Text>
                  <Text style={[styles.loanQuickStatVal, { color: colors.textPrimary }]}>
                    {fmtInt(loanEstimate.downPaymentAmount)} €
                  </Text>
                </View>
                <View style={[styles.loanQuickStatDivider, { backgroundColor: specularBorder }]} />
                <View style={styles.loanQuickStatCol}>
                  <Text style={[styles.loanQuickStatLabel, { color: colors.textMuted }]}>Afati</Text>
                  <Text style={[styles.loanQuickStatVal, { color: colors.textPrimary }]}>
                    {loanYears} vjet
                  </Text>
                </View>
              </View>

              {/* 4. Progressive Disclosure Mechanism ("Opsione të avancuara" / "Llogaritje e detajuar") */}
              <TactilePressable
                activeScale={0.98}
                haptic="selection"
                style={[
                  styles.loanAdvancedToggle,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: specularBorder,
                  },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  setAdvancedLoanOpen((v) => !v)
                }}
                accessibilityRole="button"
                accessibilityLabel="Opsione të avancuara dhe llogaritje e detajuar e kredisë"
              >
                <View style={styles.loanAdvancedToggleLeft}>
                  <SlidersHorizontal size={15} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.loanAdvancedToggleText, { color: colors.textPrimary }]}>
                    {advancedLoanOpen ? 'Mbyll llogaritjen e detajuar' : 'Opsione të avancuara & llogaritje e detajuar'}
                  </Text>
                </View>
                <ChevronDown
                  size={16}
                  color={colors.textMuted}
                  strokeWidth={2.2}
                  style={{ transform: [{ rotate: advancedLoanOpen ? '180deg' : '0deg' }] }}
                />
              </TactilePressable>

              {/* 5. Expanded Deeper Financial Variables */}
              {advancedLoanOpen && (
                <View style={styles.loanExpandedBody}>
                  {/* Tenure Adjustments (Afati i kredisë) */}
                  <View style={styles.loanSectionGroup}>
                    <View style={styles.loanSectionTitleRow}>
                      <Text style={[styles.loanGroupLabel, { color: colors.textPrimary }]}>
                        Afati i kredisë
                      </Text>
                      <Text style={[styles.loanGroupSubInfo, { color: colors.textMuted }]}>
                        {loanYears} vjet ({loanEstimate.totalPayments} këste)
                      </Text>
                    </View>
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
                              setCustomYearsStr(String(yr))
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

                    {/* Custom Years Input Row */}
                    <View
                      style={[
                        styles.loanCustomInputRow,
                        { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                      ]}
                    >
                      <View style={styles.loanCustomInputLabelCol}>
                        <Text style={[styles.loanCustomInputLabel, { color: colors.textPrimary }]}>
                          Afat i personalizuar
                        </Text>
                        <Text style={[styles.loanCustomInputSub, { color: colors.textMuted }]}>
                          Zgjidhni nga 1 deri në 40 vite financimi
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.loanMiniInputBox,
                          { backgroundColor: colors.surface, borderColor: specularBorder },
                        ]}
                      >
                        <TextInput
                          style={[styles.loanMiniInput, { color: colors.textPrimary }]}
                          placeholder="20"
                          placeholderTextColor={colors.textLight}
                          value={customYearsStr || (loanYears ? String(loanYears) : '')}
                          onChangeText={(val) => {
                            const clean = val.replace(/[^\d]/g, '').slice(0, 2)
                            setCustomYearsStr(clean)
                            const num = parseInt(clean, 10)
                            if (!isNaN(num)) {
                              setLoanYears(Math.min(40, Math.max(1, num)))
                            } else if (clean === '') {
                              setLoanYears(1)
                            }
                          }}
                          keyboardType="number-pad"
                          returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                        />
                        <Text style={[styles.loanInputUnit, { color: colors.textMuted }]}>vjet</Text>
                      </View>
                    </View>
                  </View>

                  {/* Custom Interest Rates (Norma vjetore e interesit) */}
                  <View style={styles.loanSectionGroup}>
                    <View style={styles.loanSectionTitleRow}>
                      <Text style={[styles.loanGroupLabel, { color: colors.textPrimary }]}>
                        Norma vjetore e interesit
                      </Text>
                      <Text style={[styles.loanGroupSubInfo, { color: colors.textMuted }]}>
                        {loanRate.toFixed(1).replace('.', ',')}% vjetore
                      </Text>
                    </View>
                    <View style={styles.loanChipRow}>
                      {([3.9, 4.5, 5.0, 5.5] as const).map((rt) => {
                        const selected = Math.abs(loanRate - rt) < 0.05
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
                              setCustomRateStr(rt.toFixed(1))
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

                    {/* Custom Rate Input Row */}
                    <View
                      style={[
                        styles.loanCustomInputRow,
                        { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                      ]}
                    >
                      <View style={styles.loanCustomInputLabelCol}>
                        <Text style={[styles.loanCustomInputLabel, { color: colors.textPrimary }]}>
                          Normë e personalizuar
                        </Text>
                        <Text style={[styles.loanCustomInputSub, { color: colors.textMuted }]}>
                          Norma efektive e ofruar nga banka juaj
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.loanMiniInputBox,
                          { backgroundColor: colors.surface, borderColor: specularBorder },
                        ]}
                      >
                        <TextInput
                          style={[styles.loanMiniInput, { color: colors.textPrimary }]}
                          placeholder="4.5"
                          placeholderTextColor={colors.textLight}
                          value={customRateStr || (loanRate ? String(loanRate) : '')}
                          onChangeText={(val) => {
                            const clean = val.replace(',', '.').replace(/[^\d.]/g, '').slice(0, 4)
                            setCustomRateStr(clean)
                            const num = parseFloat(clean)
                            if (!isNaN(num) && num > 0) {
                              setLoanRate(Math.min(30, Math.max(0.1, num)))
                            }
                          }}
                          keyboardType="decimal-pad"
                          returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                        />
                        <Text style={[styles.loanInputUnit, { color: colors.textMuted }]}>%</Text>
                      </View>
                    </View>
                  </View>

                  {/* Repayment schedule method — Annuity vs Declining */}
                  <View style={styles.loanSectionGroup}>
                    <View style={styles.loanSectionTitleRow}>
                      <Text style={[styles.loanGroupLabel, { color: colors.textPrimary }]}>
                        Modeli i shlyerjes
                      </Text>
                      <Text style={[styles.loanGroupSubInfo, { color: colors.textMuted }]}>
                        {loanMethod === 'annuity' ? 'Këste konstante' : 'Këste progresive në rënie'}
                      </Text>
                    </View>
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
                              adjustsFontSizeToFit
                            >
                              {m === 'annuity' ? 'Këste fikse (Anuitet)' : 'Këste zbritëse (Lineare)'}
                            </Text>
                          </TactilePressable>
                        )
                      })}
                    </View>

                    {/* Model Explainer Insight Card */}
                    <View
                      style={[
                        styles.loanMethodExplainer,
                        { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                      ]}
                    >
                      {loanMethod === 'annuity' ? (
                        <Text style={[styles.loanMethodExplainerText, { color: colors.textSecondary }]}>
                          💡 <Text style={{ fontFamily: Fonts.semiBold, color: colors.textPrimary }}>Anuitet:</Text> Paguani të njëjtën shumë të barabartë prej <Text style={{ fontFamily: Fonts.bold, color: brandHighlight }}>{fmtInt(loanEstimate.monthlyPayment)} €</Text> çdo muaj. Ideale për planifikim fiks pa të papritura.
                        </Text>
                      ) : (
                        <Text style={[styles.loanMethodExplainerText, { color: colors.textSecondary }]}>
                          💡 <Text style={{ fontFamily: Fonts.semiBold, color: colors.textPrimary }}>Zbritëse:</Text> Kësti fillon me <Text style={{ fontFamily: Fonts.bold, color: brandHighlight }}>{fmtInt(loanEstimate.firstPayment)} €</Text> dhe ulet deri në <Text style={{ fontFamily: Fonts.bold, color: brandHighlight }}>{fmtInt(loanEstimate.lastPayment)} €</Text>. Kurseni <Text style={{ fontFamily: Fonts.bold, color: theme === 'green' ? colors.gold : colors.primary }}>{fmtInt(Math.max(0, (loanEstimate.annuityInterest || 0) - loanEstimate.totalInterest))} €</Text> në interes total!
                        </Text>
                      )}
                    </View>

                    {/* Custom Extra Principal Prepayment */}
                    <View
                      style={[
                        styles.loanCustomInputRow,
                        { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                      ]}
                    >
                      <View style={styles.loanCustomInputLabelCol}>
                        <Text style={[styles.loanCustomInputLabel, { color: colors.textPrimary }]}>
                          Pagesë shtesë mujore (opsionale)
                        </Text>
                        <Text style={[styles.loanCustomInputSub, { color: colors.textMuted }]}>
                          Përshpejton shlyerjen e kryegjëses
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.loanMiniInputBox,
                          { backgroundColor: colors.surface, borderColor: specularBorder },
                        ]}
                      >
                        <TextInput
                          style={[styles.loanMiniInput, { color: colors.textPrimary }]}
                          placeholder="0"
                          placeholderTextColor={colors.textLight}
                          value={customExtraMonthlyStr}
                          onChangeText={(val) => {
                            const clean = val.replace(/[^\d]/g, '').slice(0, 5)
                            setCustomExtraMonthlyStr(clean)
                          }}
                          keyboardType="number-pad"
                          returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                        />
                        <Text style={[styles.loanInputUnit, { color: colors.textMuted }]}>€</Text>
                      </View>
                    </View>
                  </View>

                  {/* Monthly Salary & Affordability Check (Të ardhurat mujore & Kufiri DTI) */}
                  <View style={styles.loanSectionGroup}>
                    <View style={styles.loanSectionTitleRow}>
                      <Text style={[styles.loanGroupLabel, { color: colors.textPrimary }]}>
                        Përballueshmëria & Kufiri Bankar
                      </Text>
                      <Text style={[styles.loanGroupSubInfo, { color: colors.textMuted }]}>
                        Kufiri standard ≈ 40%
                      </Text>
                    </View>

                    {/* Net Monthly Income Input */}
                    <View
                      style={[
                        styles.loanIncomeRow,
                        { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                      ]}
                    >
                      <View style={styles.loanCustomInputLabelCol}>
                        <Text style={[styles.loanIncomeLabel, { color: colors.textPrimary }]}>
                          Të ardhurat neto mujore
                        </Text>
                        <Text style={[styles.loanIncomeSub, { color: colors.textMuted }]}>
                          Paga mujore neto e familjes
                        </Text>
                      </View>
                      <View style={[styles.loanIncomeInputWrapper, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
                        <TextInput
                          style={[styles.loanIncomeInput, { color: colors.textPrimary }]}
                          placeholder="800"
                          placeholderTextColor={colors.textLight}
                          value={incomeStr}
                          onChangeText={(v) => setIncomeStr(v.replace(/[^\d]/g, '').slice(0, 6))}
                          keyboardType="number-pad"
                          returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                        />
                        <Text style={[styles.loanIncomeSuffix, { color: colors.textMuted }]}>€</Text>
                      </View>
                    </View>

                    {/* Custom Affordability DTI Limit Row */}
                    <View
                      style={[
                        styles.loanCustomInputRow,
                        { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                      ]}
                    >
                      <View style={styles.loanCustomInputLabelCol}>
                        <Text style={[styles.loanCustomInputLabel, { color: colors.textPrimary }]}>
                          Kufiri i përballueshmërisë (DTI)
                        </Text>
                        <Text style={[styles.loanCustomInputSub, { color: colors.textMuted }]}>
                          Përqindja maksimale e pagës për kredi
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.loanMiniInputBox,
                          { backgroundColor: colors.surface, borderColor: specularBorder },
                        ]}
                      >
                        <TextInput
                          style={[styles.loanMiniInput, { color: colors.textPrimary }]}
                          placeholder="40"
                          placeholderTextColor={colors.textLight}
                          value={customDtiLimitStr}
                          onChangeText={(v) => {
                            const clean = v.replace(/[^\d]/g, '').slice(0, 2)
                            setCustomDtiLimitStr(clean)
                          }}
                          keyboardType="number-pad"
                          returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                        />
                        <Text style={[styles.loanInputUnit, { color: colors.textMuted }]}>%</Text>
                      </View>
                    </View>

                    {/* Live DTI & Affordability Feedback */}
                    {loanEstimate.dti != null && (
                      <View style={{ marginTop: 8 }}>
                        <View
                          style={[
                            styles.loanDtiBadge,
                            {
                              backgroundColor:
                                loanEstimate.dti <= loanEstimate.dtiLimit / 100
                                  ? 'rgba(16, 185, 129, 0.1)'
                                  : 'rgba(245, 158, 11, 0.12)',
                              borderColor:
                                loanEstimate.dti <= loanEstimate.dtiLimit / 100
                                  ? 'rgba(16, 185, 129, 0.25)'
                                  : 'rgba(245, 158, 11, 0.3)',
                            },
                          ]}
                        >
                          {loanEstimate.dti <= loanEstimate.dtiLimit / 100 ? (
                            <CheckCircle2 size={16} color="#10B981" strokeWidth={2.2} />
                          ) : (
                            <Shield size={16} color="#F59E0B" strokeWidth={2.2} />
                          )}
                          <Text
                            style={[
                              styles.loanDtiText,
                              {
                                color:
                                  loanEstimate.dti <= loanEstimate.dtiLimit / 100
                                    ? theme === 'green'
                                      ? '#34D399'
                                      : '#059669'
                                    : '#D97706',
                              },
                            ]}
                          >
                            {loanEstimate.dti <= loanEstimate.dtiLimit / 100
                              ? `Kësti merr ${(loanEstimate.dti * 100).toFixed(0)}% të pagës • Brenda limitit të sigurt (${loanEstimate.dtiLimit}%)`
                              : `Kësti merr ${(loanEstimate.dti * 100).toFixed(0)}% të pagës • Tejkalon limitin prej ${loanEstimate.dtiLimit}%`}
                          </Text>
                        </View>

                        {/* Affordability Metrics Row */}
                        <View style={[styles.loanAffordMetricsRow, { borderColor: specularBorder }]}>
                          <View style={styles.loanAffordMetricCol}>
                            <Text style={[styles.loanAffordMetricLabel, { color: colors.textMuted }]}>
                              Kësti maks. i lejuar
                            </Text>
                            <Text style={[styles.loanAffordMetricVal, { color: colors.textPrimary }]}>
                              {fmtInt(loanEstimate.maxAffordablePayment || 0)} €
                            </Text>
                          </View>
                          <View style={[styles.loanAffordMetricDivider, { backgroundColor: specularBorder }]} />
                          <View style={styles.loanAffordMetricCol}>
                            <Text style={[styles.loanAffordMetricLabel, { color: colors.textMuted }]}>
                              Të mbetura pas këstit
                            </Text>
                            <Text style={[styles.loanAffordMetricVal, { color: brandHighlight }]}>
                              {fmtInt(loanEstimate.disposableIncome || 0)} €
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Amortization breakdown ledger & custom closing fees */}
                  <View style={[styles.loanBreakBox, { borderColor: specularBorder }]}>
                    <View style={styles.loanSectionTitleRow}>
                      <Text style={[styles.loanGroupLabel, { color: colors.textPrimary }]}>
                        Pasqyra e plotë financiare
                      </Text>
                      <Text style={[styles.loanGroupSubInfo, { color: colors.textMuted }]}>
                        Detajet e plota të kredisë
                      </Text>
                    </View>

                    {/* Custom Admin Fee Input Row */}
                    <View
                      style={[
                        styles.loanCustomInputRow,
                        { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder, marginBottom: 10 },
                      ]}
                    >
                      <View style={styles.loanCustomInputLabelCol}>
                        <Text style={[styles.loanCustomInputLabel, { color: colors.textPrimary }]}>
                          Tarifa administrative e bankës
                        </Text>
                        <Text style={[styles.loanCustomInputSub, { color: colors.textMuted }]}>
                          Shuma e tarifës: {fmtInt(loanEstimate.adminFee)} €
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.loanMiniInputBox,
                          { backgroundColor: colors.surface, borderColor: specularBorder },
                        ]}
                      >
                        <TextInput
                          style={[styles.loanMiniInput, { color: colors.textPrimary }]}
                          placeholder="0.5"
                          placeholderTextColor={colors.textLight}
                          value={customAdminFeePctStr}
                          onChangeText={(val) => {
                            const clean = val.replace(',', '.').replace(/[^\d.]/g, '').slice(0, 4)
                            setCustomAdminFeePctStr(clean)
                          }}
                          keyboardType="decimal-pad"
                          returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                        />
                        <Text style={[styles.loanInputUnit, { color: colors.textMuted }]}>%</Text>
                      </View>
                    </View>

                    {/* Ledger Rows */}
                    <View style={styles.loanBreakRow}>
                      <Text style={[styles.loanBreakLabel, { color: colors.textMuted }]}>
                        Vlera e plotë e pronës
                      </Text>
                      <Text style={[styles.loanBreakValue, { color: colors.textPrimary }]}>
                        {formatPrice(listing.price)}
                      </Text>
                    </View>
                    <View style={styles.loanBreakRow}>
                      <Text style={[styles.loanBreakLabel, { color: colors.textMuted }]}>
                        Pjesëmarrja fillestare ({loanDownPct}%)
                      </Text>
                      <Text style={[styles.loanBreakValue, { color: colors.textPrimary }]}>
                        {fmtInt(loanEstimate.downPaymentAmount)} €
                      </Text>
                    </View>
                    <View style={styles.loanBreakRow}>
                      <Text style={[styles.loanBreakLabel, { color: colors.textMuted }]}>
                        Shuma e kredisë (Kryegjëja)
                      </Text>
                      <Text style={[styles.loanBreakValue, { color: colors.textPrimary }]}>
                        {fmtInt(loanEstimate.loanAmount)} €
                      </Text>
                    </View>
                    <View style={styles.loanBreakRow}>
                      <Text style={[styles.loanBreakLabel, { color: colors.textMuted }]}>
                        Kohëzgjatja totale
                      </Text>
                      <Text style={[styles.loanBreakValue, { color: colors.textPrimary }]}>
                        {loanYears} vjet ({loanEstimate.totalPayments} këste)
                      </Text>
                    </View>
                    <View style={styles.loanBreakRow}>
                      <Text style={[styles.loanBreakLabel, { color: colors.textMuted }]}>
                        Norma vjetore e interesit
                      </Text>
                      <Text style={[styles.loanBreakValue, { color: colors.textPrimary }]}>
                        {loanRate.toFixed(1).replace('.', ',')}%
                      </Text>
                    </View>
                    <View style={styles.loanBreakRow}>
                      <Text style={[styles.loanBreakLabel, { color: colors.textMuted }]}>
                        Modeli i zgjedhur
                      </Text>
                      <Text style={[styles.loanBreakValue, { color: colors.textPrimary }]}>
                        {loanMethod === 'annuity' ? 'Këste fikse (Anuitet)' : 'Këste zbritëse'}
                      </Text>
                    </View>
                    {loanEstimate.extraMonthly > 0 && (
                      <View style={styles.loanBreakRow}>
                        <Text style={[styles.loanBreakLabel, { color: colors.textMuted }]}>
                          Pagesë e parakohshme mujore
                        </Text>
                        <Text style={[styles.loanBreakValue, { color: brandHighlight }]}>
                          + {fmtInt(loanEstimate.extraMonthly)} €/muaj
                        </Text>
                      </View>
                    )}
                    <View style={styles.loanBreakRow}>
                      <Text style={[styles.loanBreakLabel, { color: colors.textMuted }]}>
                        Interesi total gjatë afatit
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
                        Tarifa administrative ({loanEstimate.adminFeePct}%)
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
                        Kostoja totale e kthimit
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

                  {/* Cost structure bar: principal vs interest vs fees */}
                  <View style={styles.loanCostBar}>
                    <View
                      style={{
                        flex: Math.max(1, loanEstimate.loanAmount),
                        backgroundColor: theme === 'green' ? colors.gold : colors.primary,
                      }}
                    />
                    <View style={{ flex: Math.max(1, loanEstimate.totalInterest), backgroundColor: colors.textMuted }} />
                    <View style={{ flex: Math.max(1, loanEstimate.adminFee), backgroundColor: colors.border }} />
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

                  <Text style={[styles.mortgageDisclaimer, { color: colors.textMuted }]}>
                    Vlerësim orientues sipas praktikave të zakonshme të bankave në Kosovë (3,8–5,5%). Kushtet finale miratohen nga banka juaj.
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
              {/* 1. Direct Phone / Voice Call Action */}
              <TactilePressable
                activeScale={0.93}
                haptic="medium"
                style={[
                  styles.actionCallBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: specularBorder,
                  },
                ]}
                onPress={handleCall}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Telefono shitësin"
              >
                <Phone size={17} color={colors.textPrimary} strokeWidth={2.2} />
                <Text
                  style={[styles.actionCallBtnText, { color: colors.textPrimary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Telefono
                </Text>
              </TactilePressable>

              {/* 2. WhatsApp Direct Action */}
              <TactilePressable
                activeScale={0.93}
                haptic="medium"
                style={styles.actionWhatsAppBtn}
                onPress={() => handleWhatsApp()}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Bisedo në WhatsApp"
              >
                <MessageCircle
                  size={17}
                  color="#FFFFFF"
                  strokeWidth={2.4}
                />
                <Text
                  style={styles.actionWhatsAppBtnText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  WhatsApp
                </Text>
              </TactilePressable>

              {/* 3. In-App Direct Chat Primary Action ("Bisedo") */}
              <TactilePressable
                activeScale={0.93}
                haptic="medium"
                style={[
                  styles.actionChatBtn,
                  { backgroundColor: brandHighlight },
                ]}
                onPress={() => handleChat()}
                disabled={startingChat}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Bisedo në aplikacion"
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
                        styles.actionChatBtnText,
                        { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      Bisedo
                    </Text>
                  </>
                )}
              </TactilePressable>
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
        counterpartEmailVerified={
          typeof seller?.email_verified === 'boolean' ? seller.email_verified : undefined
        }
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

  // 1. Dynamic Floating & Sticky Top Navigation Bar (Apple & Airbnb-tier)
  floatingNavSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  floatingNavBackground: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  floatingNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 54,
  },
  navCenterFlex: {
    flex: 1,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  navStickyTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.bold,
    letterSpacing: -0.25,
    textAlign: 'center',
    maxWidth: '100%',
  },
  navStickySubLine: {
    fontSize: 11.5,
    textAlign: 'center',
    maxWidth: '100%',
    marginTop: 1.5,
  },
  navStickyPrice: {
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
  },
  navStickyLocation: {
    fontFamily: Fonts.medium,
  },
  navActionBtnWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderCurve: 'continuous',
    position: 'relative',
  },
  navCircleFloatingLens: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.26)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 5,
  },
  navCircleStickyDisc: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderCurve: 'continuous',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  navOpticalCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  loanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  loanCardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loanOverline: {
    fontSize: 11,
    letterSpacing: 0.8,
    fontFamily: Fonts.bold,
  },
  loanHeaderSubTitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  loanHeroBox: {
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  loanHeroLabel: {
    fontSize: 11.5,
    fontFamily: Fonts.medium,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  loanHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  loanBigValue: {
    fontSize: 32,
    fontFamily: Fonts.black,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  loanPerMonth: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  loanHeadSub: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 6,
  },
  loanSectionGroup: {
    marginTop: 14,
  },
  loanSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  loanGroupLabel: {
    fontSize: 12,
    letterSpacing: 0.2,
    fontFamily: Fonts.semiBold,
  },
  loanGroupSubInfo: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    fontVariant: ['tabular-nums'],
  },
  loanChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  loanChip: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 2,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loanChipText: {
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  loanCustomInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 8,
    gap: 8,
  },
  loanCustomInputLabelCol: {
    flex: 1,
    paddingRight: 6,
  },
  loanCustomInputLabel: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  loanCustomInputSub: {
    fontSize: 10.5,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
  loanMiniInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 3,
    minWidth: 64,
  },
  loanMiniInput: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    paddingVertical: 0,
    minWidth: 34,
  },
  loanInputUnit: {
    fontSize: 11.5,
    fontFamily: Fonts.medium,
  },
  loanQuickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 14,
  },
  loanQuickStatCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  loanQuickStatLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  loanQuickStatVal: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
  },
  loanQuickStatDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  loanAdvancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  loanAdvancedToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  loanAdvancedToggleText: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
  },
  loanExpandedBody: {
    marginTop: 8,
  },
  loanSegmentRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 3,
    marginTop: 6,
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
    fontSize: 12,
    letterSpacing: -0.1,
  },
  loanMethodExplainer: {
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 8,
  },
  loanMethodExplainerText: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },
  loanIncomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    gap: 8,
  },
  loanIncomeLabel: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
  },
  loanIncomeSub: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
  loanIncomeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    minWidth: 80,
  },
  loanIncomeInput: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    paddingVertical: 0,
    minWidth: 44,
  },
  loanIncomeSuffix: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  loanDtiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  loanDtiText: {
    fontSize: 11.5,
    fontFamily: Fonts.medium,
    lineHeight: 16,
    flex: 1,
  },
  loanAffordMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 10,
  },
  loanAffordMetricCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  loanAffordMetricLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  loanAffordMetricVal: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
  },
  loanAffordMetricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
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
  mortgageDisclaimer: {
    fontSize: 10.5,
    fontFamily: Fonts.regular,
    lineHeight: 14,
    marginTop: 14,
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
    paddingTop: 10,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  buyerActionGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
  },
  actionCallBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  actionCallBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  actionWhatsAppBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#25D366',
    borderRadius: 14,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },
  actionWhatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  actionChatBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  actionChatBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
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
