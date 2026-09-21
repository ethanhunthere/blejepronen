import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  Modal,
  TextInput,
  Share,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { getSyncAuthUser, isAuthCacheHydrated, isLogoutInProgress } from '@/lib/auth-cache'
import { getCachedListings } from '@/lib/listings-cache'
import { Image } from 'expo-image'
import { BlurView } from 'expo-blur'
import {
  ArrowLeft,
  Plus,
  Building2,
  Trash2,
  Eye,
  Share2,
  Tag,
  CheckCircle2,
  XCircle,
  MapPin,
  BedDouble,
  Maximize2,
  LogIn,
  SlidersHorizontal,
  Search,
  X,
  Check,
  AlertTriangle,
  Bookmark,
  HeartOff,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase, Listing } from '@/lib/supabase'
import { fetchFavoriteListings, persistFavoriteToggle } from '@/lib/favorites'
import { consumeShpalljetFilter, type ShpalljetFilterIntent } from '@/lib/nav-intent'
import { useBanner } from '@/context/BannerContext'
import {
  playSuccessSound,
  playDeleteSound,
  playTapSound,
  playThemeSound,
  playUnlikeSound,
} from '@/lib/sound'
import { safeBack } from '@/lib/navigation'
import { SubFilterNavigationBar, type SubFilterCounts } from '@/components/SubFilterNavigationBar'

type MainTab = 'all' | 'saved'
type SubFilter = 'all' | 'active' | 'sold' | 'inactive'

export default function ShpalljetEMiaScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { colors, theme } = useTheme()
  const { showBanner } = useBanner()

  // Responsive spatial metrics benchmarking Apple / Linear / Stripe
  const isCompact = width < 375
  const isTablet = width >= 768
  const maxContentWidth = isTablet ? 720 : 680
  const responsivePadding = isCompact ? 12 : isTablet ? 24 : 16
  const bottomInset = Math.max(insets.bottom + 28, 48)

  // Fluid 16:9 cover image with responsive min/max clamps
  const cardWidth = Math.min(width, maxContentWidth) - responsivePadding * 2
  const coverHeight = Math.round(Math.min(Math.max(cardWidth * 0.54, 180), 280))

  // Deep-link support: /shpalljet-e-mia?filter=saved
  const searchParams = useLocalSearchParams<{ filter?: string }>()
  const initialMainTab: MainTab = searchParams.filter === 'saved' ? 'saved' : 'all'
  const initialSubFilter: SubFilter =
    searchParams.filter === 'active'
      ? 'active'
      : searchParams.filter === 'sold' || searchParams.filter === 'shitur'
      ? 'sold'
      : searchParams.filter === 'inactive'
      ? 'inactive'
      : 'all'

  const syncUser = getSyncAuthUser()
  const initialUserListings = syncUser
    ? getCachedListings().filter((l) => l.user_id === syncUser.id)
    : []

  const [currentUser, setCurrentUser] = useState<any>(syncUser)
  const [loading, setLoading] = useState(!syncUser ? false : initialUserListings.length === 0)
  const [refreshing, setRefreshing] = useState(false)
  const [listings, setListings] = useState<Listing[]>(initialUserListings)
  const [mainTab, setMainTab] = useState<MainTab>(initialMainTab)
  const [subFilter, setSubFilter] = useState<SubFilter>(initialSubFilter)
  const [searchQuery, setSearchQuery] = useState('')

  // Robust status classification helpers (handles true, false, and legacy null/undefined in DB)
  const isListingSold = useCallback((l: Listing) => {
    return l.condition === 'shitur' || (l as any).status === 'shitur'
  }, [])

  const isListingActive = useCallback((l: Listing) => {
    return l.is_active !== false && l.condition !== 'shitur' && (l as any).status !== 'shitur'
  }, [])

  const isListingInactive = useCallback((l: Listing) => {
    return l.is_active === false && l.condition !== 'shitur' && (l as any).status !== 'shitur'
  }, [])

  // Të Ruajturat (Saved listings) — DB-backed via Supabase `favorites`
  const [savedListings, setSavedListings] = useState<Listing[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)

  // Price Edit Modal
  const [editPriceListing, setEditPriceListing] = useState<Listing | null>(null)
  const [newPrice, setNewPrice] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)

  // Action busy state per listing
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchUserListings = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Fetch user listings error:', error)
      } else if (isMountedRef.current && !isLogoutInProgress()) {
        setListings((data || []) as unknown as Listing[])
      }
    } catch (e) {
      console.warn('Listings fetch exception:', e)
    } finally {
      if (isMountedRef.current && !isLogoutInProgress()) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  // ─── Të Ruajturat: fetch saved listings (favorites join) ───
  const fetchSavedListings = useCallback(async () => {
    setLoadingSaved(true)
    try {
      const rows = await fetchFavoriteListings()
      if (isMountedRef.current && !isLogoutInProgress()) {
        setSavedListings(rows as unknown as Listing[])
      }
    } finally {
      if (isMountedRef.current && !isLogoutInProgress()) {
        setLoadingSaved(false)
      }
    }
  }, [])

  useEffect(() => {
    async function init() {
      try {
        if (isLogoutInProgress()) {
          if (isMountedRef.current) setLoading(false)
          return
        }
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!isMountedRef.current || isLogoutInProgress()) return

        setCurrentUser(user || null)
        if (user) {
          await fetchUserListings(user.id)
          if (isMountedRef.current && !isLogoutInProgress()) {
            fetchSavedListings()
          }
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.warn('Auth check in shpalljet-e-mia notice:', err)
        if (isMountedRef.current) setLoading(false)
      }
    }

    init()
  }, [fetchUserListings, fetchSavedListings])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    if (currentUser) {
      fetchUserListings(currentUser.id)
      fetchSavedListings()
    } else {
      setRefreshing(false)
    }
  }, [currentUser, fetchUserListings, fetchSavedListings])

  const handleMainTabChange = useCallback((tab: MainTab) => {
    playTapSound()
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setMainTab((prev) => {
      if (prev === tab) {
        if (tab === 'all') setSubFilter('all')
        return prev
      }
      if (tab === 'saved') fetchSavedListings()
      return tab
    })
  }, [fetchSavedListings])

  const handleSubFilterChange = useCallback((status: SubFilter) => {
    playTapSound()
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setSubFilter(status)
  }, [])

  /**
   * Apply an explicit navigation intent / deep link whenever this screen gains
   * focus. This is what makes Profili → "Të Ruajturat" land EXACTLY on the
   * Të Ruajturat tab, even when this screen instance was already mounted
   * (React Navigation reuses instances, so mount-time state alone isn't enough).
   */
  useFocusEffect(
    useCallback(() => {
      const intent = consumeShpalljetFilter()
      const fromParam: ShpalljetFilterIntent | null =
        searchParams.filter === 'saved'
          ? 'saved'
          : searchParams.filter === 'active'
          ? 'active'
          : searchParams.filter === 'sold' || searchParams.filter === 'shitur'
          ? 'sold'
          : searchParams.filter === 'inactive'
          ? 'inactive'
          : searchParams.filter === 'all'
          ? 'all'
          : null
      const target = intent ?? fromParam

      if (target === 'saved') {
        setMainTab('saved')
        fetchSavedListings()
      } else if (target) {
        setMainTab('all')
        if (target === 'active' || target === 'sold' || target === 'inactive') {
          setSubFilter(target)
        } else {
          setSubFilter('all')
        }
      }

      // Re-sync user's listings and saved items when screen gains focus
      const user = getSyncAuthUser()
      if (user) {
        fetchUserListings(user.id)
        fetchSavedListings()
      }
    }, [searchParams.filter, fetchUserListings, fetchSavedListings])
  )

  // ─── Remove a listing from Të Ruajturat (heart off) ───
  const handleUnsave = async (item: Listing) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Optimistic removal
    setSavedListings((prev) => prev.filter((l) => l.id !== item.id))

    const ok = await persistFavoriteToggle(item.id, true)
    if (ok) {
      playUnlikeSound()
      showBanner({
        type: 'info',
        title: 'U hoq nga të ruajturat',
        message: `«${item.title}» nuk është më në listën tuaj të ruajtur.`,
      })
    } else {
      // Revert on failure
      setSavedListings((prev) => [item, ...prev])
      showBanner({
        type: 'error',
        title: 'Gabim',
        message: 'S’u hoq dot nga të ruajturat. Ju lutemi provoni përsëri.',
      })
    }
  }

  // Toggle Active/Sold Status
  const handleToggleStatus = async (item: Listing) => {
    const active = isListingActive(item)
    const nextActive = !active
    const nextCondition = nextActive ? 'e-re' : 'shitur'
    setActionBusyId(item.id)

    try {
      const { error } = await supabase
        .from('listings')
        .update({ is_active: nextActive, condition: nextCondition })
        .eq('id', item.id)

      if (error) {
        Alert.alert('Gabim', 'Dështoi përditësimi i statusit: ' + error.message)
        return
      }

      setListings((prev) =>
        prev.map((l) =>
          l.id === item.id ? { ...l, is_active: nextActive, condition: nextCondition } : l
        )
      )

      playSuccessSound()
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }

      showBanner({
        type: 'success',
        title: nextActive ? 'Shpallja u Aktivizua' : 'Shpallja u Shënua si e Shitur',
        message: nextActive
          ? `Prona "${item.title}" tani është aktive dhe shfaqet për blerësit.`
          : `Prona "${item.title}" u shënua me sukses si e shitur.`,
      })
    } catch (err: any) {
      Alert.alert('Gabim', err?.message || 'Ndodhi një problem gjatë përditësimit.')
    } finally {
      setActionBusyId(null)
    }
  }

  // Quick Price Edit Modal
  const openPriceModal = (item: Listing) => {
    playTapSound()
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setEditPriceListing(item)
    setNewPrice(item.price ? String(item.price) : '')
  }

  const handleSavePrice = async () => {
    if (!editPriceListing) return
    const numericPrice = parseFloat(newPrice.trim().replace(/[^0-9.]/g, ''))

    if (isNaN(numericPrice) || numericPrice <= 0) {
      Alert.alert('Vërejtje', 'Ju lutemi vendosni një çmim të vlefshëm numerik.')
      return
    }

    setSavingPrice(true)
    try {
      const { error } = await supabase
        .from('listings')
        .update({ price: numericPrice })
        .eq('id', editPriceListing.id)

      if (error) {
        Alert.alert('Gabim', 'Dështoi ndryshimi i çmimit: ' + error.message)
        setSavingPrice(false)
        return
      }

      setListings((prev) =>
        prev.map((l) =>
          l.id === editPriceListing.id ? { ...l, price: numericPrice } : l
        )
      )

      playSuccessSound()
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }

      showBanner({
        type: 'success',
        title: 'Çmimi u Përditësua',
        message: `Çmimi i ri për "${editPriceListing.title}" është ${formatPrice(numericPrice)}.`,
      })

      setEditPriceListing(null)
    } catch (err: any) {
      Alert.alert('Gabim', err?.message || 'Ndodhi një gabim gjatë ruajtjes.')
    } finally {
      setSavingPrice(false)
    }
  }

  // Delete Listing Confirmation
  const handleDeleteListing = (item: Listing) => {
    Alert.alert(
      'Fshi këtë Shpallje?',
      `A jeni të sigurt që dëshironi ta fshini përfundimisht pronën:\n\n"${item.title}"?\n\nKy veprim nuk mund të kthehet.`,
      [
        { text: 'Anulo', style: 'cancel' },
        {
          text: 'Fshi Shpalljen',
          style: 'destructive',
          onPress: async () => {
            setActionBusyId(item.id)
            try {
              const { error } = await supabase
                .from('listings')
                .delete()
                .eq('id', item.id)

              if (error) {
                Alert.alert('Gabim', 'Dështoi fshirja: ' + error.message)
                return
              }

              setListings((prev) => prev.filter((l) => l.id !== item.id))
              playDeleteSound()

              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
              }

              showBanner({
                type: 'delete',
                title: 'Shpallja u Fshi',
                message: `Prona "${item.title}" u fshi me sukses nga llogaria juaj.`,
              })
            } catch (err: any) {
              Alert.alert('Gabim', err?.message || 'Ndodhi një gabim gjatë fshirjes.')
            } finally {
              setActionBusyId(null)
            }
          },
        },
      ]
    )
  }

  // Share Property Link
  const handleShare = async (item: Listing) => {
    playTapSound()
    try {
      await Share.share({
        title: item.title,
        message: `Shiko pronën "${item.title}" (${formatPrice(item.price)}) në Bleje Pronën: https://blejepronen.com/listings/${item.id}`,
        url: `https://blejepronen.com/listings/${item.id}`,
      })
    } catch (err) {
      console.warn('Share notice:', err)
    }
  }

  const formatPrice = (val?: number) => {
    if (!val) return '0 €'
    return new Intl.NumberFormat('de-DE').format(val) + ' €'
  }

  // Filtered Listings with reactive memoization
  const filteredListings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    if (mainTab === 'saved') {
      if (!q) return savedListings
      return savedListings.filter(
        (l) =>
          l.title?.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q) ||
          (l.neighborhood && l.neighborhood.toLowerCase().includes(q)) ||
          l.type?.toLowerCase().includes(q)
      )
    }

    return listings.filter((l) => {
      // 1. Status Filter
      if (subFilter === 'active' && !isListingActive(l)) return false
      if (subFilter === 'sold' && !isListingSold(l)) return false
      if (subFilter === 'inactive' && !isListingInactive(l)) return false

      // 2. Keyword Search Query
      if (q) {
        const matches =
          l.title?.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q) ||
          (l.neighborhood && l.neighborhood.toLowerCase().includes(q)) ||
          l.type?.toLowerCase().includes(q)
        if (!matches) return false
      }

      return true
    })
  }, [mainTab, savedListings, listings, subFilter, searchQuery, isListingActive, isListingSold, isListingInactive])

  const allCount = listings.length
  const activeCount = useMemo(() => listings.filter(isListingActive).length, [listings, isListingActive])
  const soldCount = useMemo(() => listings.filter(isListingSold).length, [listings, isListingSold])
  const inactiveCount = useMemo(() => listings.filter(isListingInactive).length, [listings, isListingInactive])
  const savedCount = savedListings.length

  const subFilterCounts = useMemo<SubFilterCounts>(() => ({
    all: allCount,
    active: activeCount,
    sold: soldCount,
    inactive: inactiveCount,
  }), [allCount, activeCount, soldCount, inactiveCount])

  const specularBorder = colors.border

  const renderEmptyComponent = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Po ngarkojmë shpalljet tuaja...
          </Text>
        </View>
      )
    }

    if (mainTab === 'saved' && loadingSaved) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Po ngarkojmë pronat e ruajtura...
          </Text>
        </View>
      )
    }

    if (mainTab === 'saved') {
      return (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Bookmark size={38} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {searchQuery.trim().length > 0
              ? 'Nuk u gjet asnjë pronë'
              : 'Nuk keni prona të ruajtura'}
          </Text>
          <Text
            style={[
              styles.emptySubtitle,
              { maxWidth: Math.min(width - 64, 440) },
              { color: colors.textMuted },
            ]}
          >
            {searchQuery.trim().length > 0
              ? `Nuk u gjet asnjë pronë e ruajtur me kërkimin "${searchQuery}". Provoni me fjalë të tjera ose pastroni kërkimin.`
              : 'Shtypni zemrën në çdo pronë për ta ruajtur këtu dhe për ta gjetur shpejt më vonë.'}
          </Text>
          {searchQuery.trim().length > 0 ? (
            <Pressable
              style={[
                styles.emptyPostBtn,
                { backgroundColor: theme === 'green' ? colors.gold : colors.primary },
              ]}
              onPress={() => {
                playTapSound()
                if (Platform.OS !== 'web') Haptics.selectionAsync()
                setSearchQuery('')
              }}
            >
              <X
                size={17}
                color={theme === 'green' ? '#071C18' : '#FFFFFF'}
                strokeWidth={2.6}
              />
              <Text
                style={[
                  styles.emptyPostBtnText,
                  { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
                ]}
              >
                Pastro Kërkimin
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.emptyPostBtn,
                { backgroundColor: theme === 'green' ? colors.gold : colors.primary },
              ]}
              onPress={() => {
                playTapSound()
                if (Platform.OS !== 'web') Haptics.selectionAsync()
                router.push('/(tabs)/listings' as any)
              }}
            >
              <Building2
                size={17}
                color={theme === 'green' ? '#071C18' : '#FFFFFF'}
                strokeWidth={2.6}
              />
              <Text
                style={[
                  styles.emptyPostBtnText,
                  { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
                ]}
              >
                Eksploro Pronat
              </Text>
            </Pressable>
          )}
        </View>
      )
    }

    return (
      <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
          <Building2 size={38} color={colors.primary} strokeWidth={2.2} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          {searchQuery.trim().length > 0
            ? 'Nuk u gjet asnjë shpallje'
            : subFilter === 'all'
            ? 'Nuk keni asnjë shpallje ende'
            : subFilter === 'active'
            ? 'Nuk keni shpallje aktive për momentin'
            : subFilter === 'sold'
            ? 'Nuk keni shpallje të shënuara si të shitura'
            : 'Nuk keni shpallje jo aktive'}
        </Text>
        <Text
          style={[
            styles.emptySubtitle,
            { maxWidth: Math.min(width - 64, 440) },
            { color: colors.textMuted },
          ]}
        >
          {searchQuery.trim().length > 0
            ? `Nuk u gjet asnjë shpallje me termin "${searchQuery}". Provoni me fjalë të tjera ose pastroni kërkimin.`
            : subFilter === 'all'
            ? 'Postoni pronën tuaj falas brenda pak minutave dhe gjeni blerës të verifikuar në treg.'
            : subFilter === 'active'
            ? 'Të gjitha shpalljet tuaja janë shënuar si të shitura ose jo aktive.'
            : subFilter === 'sold'
            ? 'Asnjë shpallje nuk është shënuar si e shitur ende.'
            : 'Aktualisht nuk keni asnjë shpallje jo aktive në llogarinë tuaj.'}
        </Text>
        {searchQuery.trim().length > 0 ? (
          <Pressable
            style={[
              styles.emptyPostBtn,
              { backgroundColor: theme === 'green' ? colors.gold : colors.primary },
            ]}
            onPress={() => {
              playTapSound()
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              setSearchQuery('')
            }}
          >
            <X
              size={17}
              color={theme === 'green' ? '#071C18' : '#FFFFFF'}
              strokeWidth={2.6}
            />
            <Text
              style={[
                styles.emptyPostBtnText,
                { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
              ]}
            >
              Pastro Kërkimin
            </Text>
          </Pressable>
        ) : subFilter !== 'all' ? (
          <Pressable
            style={[
              styles.emptyPostBtn,
              { backgroundColor: theme === 'green' ? colors.gold : colors.primary },
            ]}
            onPress={() => {
              playTapSound()
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              handleSubFilterChange('all')
            }}
          >
            <SlidersHorizontal
              size={17}
              color={theme === 'green' ? '#071C18' : '#FFFFFF'}
              strokeWidth={2.6}
            />
            <Text
              style={[
                styles.emptyPostBtnText,
                { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
              ]}
            >
              Shfaq të Gjitha ({listings.length})
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.emptyPostBtn,
              { backgroundColor: theme === 'green' ? colors.gold : colors.primary },
            ]}
            onPress={() => {
              playTapSound()
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              router.push('/post' as any)
            }}
          >
            <Plus
              size={18}
              color={theme === 'green' ? '#071C18' : '#FFFFFF'}
              strokeWidth={2.6}
            />
            <Text
              style={[
                styles.emptyPostBtnText,
                { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
              ]}
            >
              Posto Pronë të Re
            </Text>
          </Pressable>
        )}
      </View>
    )
  }, [
    loading,
    mainTab,
    loadingSaved,
    colors,
    specularBorder,
    searchQuery,
    width,
    theme,
    router,
    subFilter,
    handleSubFilterChange,
    listings.length,
  ])

  const renderListingItem = useCallback(
    ({ item }: { item: Listing }) => {
      const mainImage =
        item.images && item.images.length > 0
          ? item.images[0]
          : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'

      if (mainTab === 'saved') {
        return (
          <View
            style={[
              styles.listingCard,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
          >
            {/* Cover */}
            <Pressable
              style={[styles.cardCover, { height: coverHeight }]}
              onPress={() => router.push(`/listings/${item.id}` as any)}
            >
              <Image
                source={{ uri: mainImage }}
                style={styles.coverImage}
                contentFit="cover"
                transition={200}
              />

              <View style={styles.coverBadgesRow}>
                <View
                  style={[
                    styles.typePill,
                    {
                      backgroundColor:
                        item.type === 'shitje'
                          ? 'rgba(0, 103, 91, 0.88)'
                          : 'rgba(217, 119, 6, 0.88)',
                    },
                  ]}
                >
                  <Text style={styles.typePillText}>
                    {item.type === 'shitje' ? 'Shitje' : 'Me Qira'}
                  </Text>
                </View>
              </View>

              {/* Price Strip Bottom Glass */}
              <View style={styles.coverPriceGlass}>
                <BlurView
                  intensity={Platform.OS === 'ios' ? 85 : 100}
                  tint="dark"
                  style={StyleSheet.absoluteFill}
                />
                <Text style={[styles.coverPriceText, isCompact && { fontSize: 17 }]}>{formatPrice(item.price)}</Text>
              </View>
            </Pressable>

            {/* Info */}
            <View style={styles.cardBody}>
              <Pressable onPress={() => router.push(`/listings/${item.id}` as any)}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {item.title}
                </Text>
              </Pressable>

              <View style={styles.cardLocationRow}>
                <MapPin size={14} color={colors.primary} strokeWidth={2.2} />
                <Text style={[styles.cardLocationText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.city} {item.neighborhood ? `• ${item.neighborhood}` : ''}
                </Text>
              </View>

              <View style={[styles.cardFeaturesRow, isCompact && { gap: 6 }]}>
                {item.rooms ? (
                  <View style={[styles.featureItem, isCompact && { paddingHorizontal: 7, paddingVertical: 3 }, { backgroundColor: colors.surfaceSubtle }]}>
                    <BedDouble size={isCompact ? 13 : 14} color={colors.textMuted} strokeWidth={2.2} />
                    <Text style={[styles.featureItemText, isCompact && { fontSize: 11.5 }, { color: colors.textSecondary }]}>
                      {item.rooms} dhoma
                    </Text>
                  </View>
                ) : null}

                {item.area_m2 ? (
                  <View style={[styles.featureItem, isCompact && { paddingHorizontal: 7, paddingVertical: 3 }, { backgroundColor: colors.surfaceSubtle }]}>
                    <Maximize2 size={isCompact ? 12 : 13} color={colors.textMuted} strokeWidth={2.2} />
                    <Text style={[styles.featureItemText, isCompact && { fontSize: 11.5 }, { color: colors.textSecondary }]}>
                      {item.area_m2} m²
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Actions: Unsave + View */}
            <View
              style={[
                styles.cardActionGrid,
                isCompact && { paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
                { borderTopColor: specularBorder },
              ]}
            >
              <Pressable
                style={[
                  styles.actionBtn,
                  isCompact && { height: 36, paddingHorizontal: 6 },
                  {
                    backgroundColor:
                      theme === 'white' ? '#FEF2F2' : 'rgba(239, 68, 68, 0.12)',
                  },
                ]}
                onPress={() => handleUnsave(item)}
              >
                <HeartOff size={isCompact ? 14 : 15} color="#EF4444" strokeWidth={2.2} />
                <Text
                  style={[styles.actionBtnText, isCompact && { fontSize: 11.5 }, { color: '#EF4444' }]}
                  numberOfLines={1}
                >
                  {isCompact ? 'Hiq Ruajtjen' : 'Hiq nga Të Ruajturat'}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.actionSquareBtn,
                  isCompact && { width: 36, height: 36 },
                  { backgroundColor: colors.surfaceSubtle },
                ]}
                onPress={() => router.push(`/listings/${item.id}` as any)}
                hitSlop={6}
              >
                <Eye size={isCompact ? 15 : 16} color={colors.textPrimary} strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>
        )
      }

      const isBusy = actionBusyId === item.id
      const active = isListingActive(item)
      const isSold = isListingSold(item)

      return (
        <View
          style={[
            styles.listingCard,
            { backgroundColor: colors.surface, borderColor: specularBorder },
          ]}
        >
          {/* Top Media & Preview Banner */}
          <Pressable
            style={[styles.cardCover, { height: coverHeight }]}
            onPress={() => router.push(`/listings/${item.id}` as any)}
          >
            <Image
              source={{ uri: mainImage }}
              style={styles.coverImage}
              contentFit="cover"
              transition={200}
            />

            {/* Top Badges Overlay */}
            <View style={styles.coverBadgesRow}>
              <View
                style={[
                  styles.typePill,
                  {
                    backgroundColor:
                      item.type === 'shitje'
                        ? 'rgba(0, 103, 91, 0.88)'
                        : 'rgba(217, 119, 6, 0.88)',
                  },
                ]}
              >
                <Text style={styles.typePillText}>
                  {item.type === 'shitje' ? 'Shitje' : 'Me Qira'}
                </Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: isSold
                      ? 'rgba(15, 23, 42, 0.88)'
                      : active
                      ? 'rgba(16, 185, 129, 0.92)'
                      : 'rgba(107, 114, 128, 0.90)',
                  },
                ]}
              >
                <Text style={styles.statusPillText}>
                  {isSold ? 'E Shitur' : active ? 'Aktive' : 'Jo aktive'}
                </Text>
              </View>
            </View>

            {/* Price Strip Bottom Glass */}
            <View style={styles.coverPriceGlass}>
              <BlurView
                intensity={Platform.OS === 'ios' ? 85 : 100}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
              <Text style={[styles.coverPriceText, isCompact && { fontSize: 17 }]}>{formatPrice(item.price)}</Text>
              <Pressable
                style={[styles.coverEditPriceBtn, isCompact && { paddingHorizontal: 7, paddingVertical: 3.5 }]}
                onPress={(e) => {
                  e.stopPropagation()
                  openPriceModal(item)
                }}
                hitSlop={6}
              >
                <Tag size={isCompact ? 12 : 13} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={[styles.coverEditPriceBtnText, isCompact && { fontSize: 10.5 }]}>
                  {isCompact ? 'Ndrysho' : 'Ndrysho Çmimin'}
                </Text>
              </Pressable>
            </View>
          </Pressable>

          {/* Middle Info Block */}
          <View style={styles.cardBody}>
            <Pressable onPress={() => router.push(`/listings/${item.id}` as any)}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {item.title}
              </Text>
            </Pressable>

            <View style={styles.cardLocationRow}>
              <MapPin size={14} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.cardLocationText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.city} {item.neighborhood ? `• ${item.neighborhood}` : ''}
              </Text>
            </View>

            <View style={[styles.cardFeaturesRow, isCompact && { gap: 6 }]}>
              {item.rooms ? (
                <View style={[styles.featureItem, isCompact && { paddingHorizontal: 7, paddingVertical: 3 }, { backgroundColor: colors.surfaceSubtle }]}>
                  <BedDouble size={isCompact ? 13 : 14} color={colors.textMuted} strokeWidth={2.2} />
                  <Text style={[styles.featureItemText, isCompact && { fontSize: 11.5 }, { color: colors.textSecondary }]}>
                    {item.rooms} dhoma
                  </Text>
                </View>
              ) : null}

              {item.area_m2 ? (
                <View style={[styles.featureItem, isCompact && { paddingHorizontal: 7, paddingVertical: 3 }, { backgroundColor: colors.surfaceSubtle }]}>
                  <Maximize2 size={isCompact ? 12 : 13} color={colors.textMuted} strokeWidth={2.2} />
                  <Text style={[styles.featureItemText, isCompact && { fontSize: 11.5 }, { color: colors.textSecondary }]}>
                    {item.area_m2} m²
                  </Text>
                </View>
              ) : null}

              {item.floor !== undefined && item.floor !== null ? (
                <View style={[styles.featureItem, isCompact && { paddingHorizontal: 7, paddingVertical: 3 }, { backgroundColor: colors.surfaceSubtle }]}>
                  <Building2 size={isCompact ? 12 : 13} color={colors.textMuted} strokeWidth={2.2} />
                  <Text style={[styles.featureItemText, isCompact && { fontSize: 11.5 }, { color: colors.textSecondary }]}>
                    Kati {item.floor}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Bottom Action Controls (Apple Glass Grid) */}
          <View
            style={[
              styles.cardActionGrid,
              isCompact && { paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
              { borderTopColor: specularBorder },
            ]}
          >
            {/* 1. Toggle Active / Inactive */}
            <Pressable
              style={[
                styles.actionBtn,
                isCompact && { height: 36, paddingHorizontal: 6 },
                {
                  backgroundColor: active
                    ? theme === 'white'
                      ? '#FEF2F2'
                      : 'rgba(239, 68, 68, 0.12)'
                    : theme === 'white'
                    ? '#ECFDF5'
                    : 'rgba(16, 185, 129, 0.12)',
                },
              ]}
              onPress={() => handleToggleStatus(item)}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : active ? (
                <>
                  <XCircle size={isCompact ? 14 : 15} color="#EF4444" strokeWidth={2.2} />
                  <Text
                    style={[
                      styles.actionBtnText,
                      isCompact && { fontSize: 11.5 },
                      { color: '#EF4444' },
                    ]}
                    numberOfLines={1}
                  >
                    {isCompact ? 'Shëno Shitur' : 'Shëno si të Shitur'}
                  </Text>
                </>
              ) : (
                <>
                  <CheckCircle2 size={isCompact ? 14 : 15} color="#10B981" strokeWidth={2.2} />
                  <Text
                    style={[
                      styles.actionBtnText,
                      isCompact && { fontSize: 11.5 },
                      { color: '#10B981' },
                    ]}
                    numberOfLines={1}
                  >
                    Rikthe Aktiv
                  </Text>
                </>
              )}
            </Pressable>

            {/* 2. Share */}
            <Pressable
              style={[
                styles.actionSquareBtn,
                isCompact && { width: 36, height: 36 },
                { backgroundColor: colors.surfaceSubtle },
              ]}
              onPress={() => handleShare(item)}
              hitSlop={6}
            >
              <Share2 size={isCompact ? 15 : 16} color={colors.textPrimary} strokeWidth={2.2} />
            </Pressable>

            {/* 3. View Details */}
            <Pressable
              style={[
                styles.actionSquareBtn,
                isCompact && { width: 36, height: 36 },
                { backgroundColor: colors.surfaceSubtle },
              ]}
              onPress={() => router.push(`/listings/${item.id}` as any)}
              hitSlop={6}
            >
              <Eye size={isCompact ? 15 : 16} color={colors.textPrimary} strokeWidth={2.2} />
            </Pressable>

            {/* 4. Delete */}
            <Pressable
              style={[
                styles.actionSquareBtn,
                isCompact && { width: 36, height: 36 },
                {
                  backgroundColor:
                    theme === 'white' ? '#FEE2E2' : 'rgba(239, 68, 68, 0.18)',
                },
              ]}
              onPress={() => handleDeleteListing(item)}
              disabled={isBusy}
              hitSlop={6}
            >
              <Trash2 size={isCompact ? 15 : 16} color="#EF4444" strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>
      )
    },
    [
      mainTab,
      colors,
      theme,
      specularBorder,
      coverHeight,
      isCompact,
      actionBusyId,
      isListingActive,
      isListingSold,
      router,
    ]
  )

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Navigation Header */}
      <View style={[styles.navHeaderOuter, { borderBottomColor: specularBorder, backgroundColor: colors.background }]}>
        <View style={[styles.navHeaderInner, { maxWidth: maxContentWidth, paddingHorizontal: responsivePadding }]}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: specularBorder }]}
            onPress={() => safeBack(router, '/(tabs)/profile')}
            hitSlop={8}
          >
            <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.navTitleWrap}>
            <Text style={[styles.navTitle, isCompact && { fontSize: 16 }, { color: colors.textPrimary }]}>
              Shpalljet e Mia
            </Text>
            <Text style={[styles.navSubtitle, isCompact && { fontSize: 11 }, { color: colors.textMuted }]}>
              {mainTab === 'saved'
                ? `${savedCount} ${savedCount === 1 ? 'pronë e ruajtur' : 'prona të ruajtura'}`
                : `${activeCount} aktive • ${soldCount} të shitura • ${inactiveCount} jo aktive`}
            </Text>
          </View>

          <Pressable
            style={[
              styles.addPostBtn,
              { backgroundColor: theme === 'green' ? colors.gold : colors.primary },
            ]}
            onPress={() => {
              playTapSound()
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              router.push('/post' as any)
            }}
            hitSlop={8}
          >
            <Plus size={18} color={theme === 'green' ? '#071C18' : '#FFFFFF'} strokeWidth={2.6} />
          </Pressable>
        </View>
      </View>

      {/* Guest Mode Protection */}
      {!currentUser && !loading ? (
        <View style={styles.guestContainer}>
          <View
            style={[
              styles.guestCard,
              {
                maxWidth: Math.min(width - 32, 440),
                backgroundColor: colors.surface,
                borderColor: specularBorder,
              },
            ]}
          >
            <View style={[styles.guestIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Building2 size={36} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={[styles.guestHeading, { color: colors.textPrimary }]}>
              Identifikohuni për Shpalljet Tuaja
            </Text>
            <Text style={[styles.guestText, { color: colors.textMuted }]}>
              Për të parë, modifikuar, çaktivizuar ose fshirë shpalljet tuaja, ju lutemi kyçuni në llogarinë tuaj.
            </Text>
            <Pressable
              style={[styles.guestLoginBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push({ pathname: '/modal', params: { initialTab: 'login' } })}
            >
              <LogIn size={18} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.guestLoginBtnText}>Kyçu në Llogari</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {/* Apple-grade Hierarchical Filter Section */}
          <View style={[styles.filterBarOuter, { borderBottomColor: specularBorder, backgroundColor: colors.background }]}>
            <View style={[styles.filterBarInner, { maxWidth: maxContentWidth, paddingHorizontal: responsivePadding }]}>
              {/* Top Level Segments: Left = "Të Gjitha", Right = "Të Ruajturat" */}
              <View
                style={[
                  styles.topSegmentTrack,
                  isCompact && { padding: 3, gap: 4 },
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                {/* Left: Të Gjitha */}
                <Pressable
                  style={[
                    styles.topSegmentTab,
                    isCompact && { paddingVertical: 8, paddingHorizontal: 6, gap: 5 },
                    mainTab === 'all' && [
                      styles.topSegmentTabActive,
                      {
                        backgroundColor:
                          theme === 'green' ? colors.gold : colors.primary,
                      },
                    ],
                  ]}
                  onPress={() => handleMainTabChange('all')}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Building2
                    size={isCompact ? 14 : 15}
                    color={
                      mainTab === 'all'
                        ? theme === 'green'
                          ? '#071C18'
                          : '#FFFFFF'
                        : colors.textSecondary
                    }
                    strokeWidth={2.4}
                  />
                  <Text
                    style={[
                      styles.topSegmentTabText,
                      isCompact && { fontSize: 12.5 },
                      {
                        color:
                          mainTab === 'all'
                            ? theme === 'green'
                              ? '#071C18'
                              : '#FFFFFF'
                            : colors.textPrimary,
                      },
                    ]}
                  >
                    Të Gjitha
                  </Text>
                  <View
                    style={[
                      styles.segmentCounterBadge,
                      isCompact && { paddingHorizontal: 5, paddingVertical: 1 },
                      {
                        backgroundColor:
                          mainTab === 'all'
                            ? theme === 'green'
                              ? 'rgba(7,28,24,0.25)'
                              : 'rgba(255,255,255,0.25)'
                            : colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentCounterBadgeText,
                        isCompact && { fontSize: 11 },
                        {
                          color:
                            mainTab === 'all'
                              ? theme === 'green'
                                ? '#071C18'
                                : '#FFFFFF'
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {listings.length}
                    </Text>
                  </View>
                </Pressable>

                {/* Right: Të Ruajturat */}
                <Pressable
                  style={[
                    styles.topSegmentTab,
                    isCompact && { paddingVertical: 8, paddingHorizontal: 6, gap: 5 },
                    mainTab === 'saved' && [
                      styles.topSegmentTabActive,
                      {
                        backgroundColor:
                          theme === 'green' ? colors.gold : colors.primary,
                      },
                    ],
                  ]}
                  onPress={() => handleMainTabChange('saved')}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Bookmark
                    size={isCompact ? 14 : 15}
                    color={
                      mainTab === 'saved'
                        ? theme === 'green'
                          ? '#071C18'
                          : '#FFFFFF'
                        : colors.textSecondary
                    }
                    fill={
                      mainTab === 'saved'
                        ? theme === 'green'
                          ? '#071C18'
                          : '#FFFFFF'
                        : 'none'
                    }
                    strokeWidth={2.4}
                  />
                  <Text
                    style={[
                      styles.topSegmentTabText,
                      isCompact && { fontSize: 12.5 },
                      {
                        color:
                          mainTab === 'saved'
                            ? theme === 'green'
                              ? '#071C18'
                              : '#FFFFFF'
                            : colors.textPrimary,
                      },
                    ]}
                  >
                    Të Ruajturat
                  </Text>
                  <View
                    style={[
                      styles.segmentCounterBadge,
                      isCompact && { paddingHorizontal: 5, paddingVertical: 1 },
                      {
                        backgroundColor:
                          mainTab === 'saved'
                            ? theme === 'green'
                              ? 'rgba(7,28,24,0.25)'
                              : 'rgba(255,255,255,0.25)'
                            : colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentCounterBadgeText,
                        isCompact && { fontSize: 11 },
                        {
                          color:
                            mainTab === 'saved'
                              ? theme === 'green'
                                ? '#071C18'
                                : '#FFFFFF'
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {savedCount}
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* Child Sub-Filters Section: Below "Të Gjitha" */}
              <View
                style={[
                  styles.childFiltersSection,
                  mainTab !== 'all' && styles.hiddenTabContent,
                ]}
                pointerEvents={mainTab === 'all' ? 'auto' : 'none'}
              >
                <SubFilterNavigationBar
                  activeFilter={subFilter}
                  onChangeFilter={handleSubFilterChange}
                  counts={subFilterCounts}
                  isCompact={isCompact}
                />

                {/* Instant In-Screen Search Bar */}
                {listings.length > 0 && (
                  <View
                    style={[
                      styles.searchBarContainer,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: specularBorder,
                      },
                    ]}
                  >
                    <Search size={15} color={colors.textMuted} strokeWidth={2.2} />
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Kërko me titull, qytet ose lagje..."
                      placeholderTextColor={colors.textMuted}
                      style={[styles.searchInput, { color: colors.textPrimary }]}
                      returnKeyType="search"
                      clearButtonMode="never"
                      autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                      <Pressable
                        onPress={() => {
                          playTapSound()
                          if (Platform.OS !== 'web') Haptics.selectionAsync()
                          setSearchQuery('')
                        }}
                        style={styles.searchClearBtn}
                        hitSlop={8}
                      >
                        <X size={13} color={colors.textMuted} strokeWidth={2.4} />
                      </Pressable>
                    )}
                  </View>
                )}
              </View>

              {/* Child Sub-Filters Section: Below "Të Ruajturat" */}
              <View
                style={[
                  styles.childFiltersSection,
                  mainTab !== 'saved' && styles.hiddenTabContent,
                ]}
                pointerEvents={mainTab === 'saved' ? 'auto' : 'none'}
              >
                <View
                  style={[
                    styles.savedNoticeBadge,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: specularBorder,
                    },
                  ]}
                >
                  <Bookmark
                    size={12}
                    color={theme === 'green' ? colors.gold : colors.primary}
                    fill={theme === 'green' ? colors.gold : colors.primary}
                  />
                  <Text style={[styles.savedNoticeText, { color: colors.textSecondary }]}>
                    {savedCount === 1
                      ? '1 pronë e ruajtur në llogari'
                      : `${savedCount} prona të ruajtura në llogari`}
                  </Text>
                </View>

                {/* Instant In-Screen Search Bar for Saved */}
                {savedListings.length > 0 && (
                  <View
                    style={[
                      styles.searchBarContainer,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: specularBorder,
                        marginTop: 4,
                      },
                    ]}
                  >
                    <Search size={15} color={colors.textMuted} strokeWidth={2.2} />
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Kërko në pronat e ruajtura..."
                      placeholderTextColor={colors.textMuted}
                      style={[styles.searchInput, { color: colors.textPrimary }]}
                      returnKeyType="search"
                      clearButtonMode="never"
                      autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                      <Pressable
                        onPress={() => {
                          playTapSound()
                          if (Platform.OS !== 'web') Haptics.selectionAsync()
                          setSearchQuery('')
                        }}
                        style={styles.searchClearBtn}
                        hitSlop={8}
                      >
                        <X size={13} color={colors.textMuted} strokeWidth={2.4} />
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Virtualized Listings List */}
          <FlatList
            data={loading || (mainTab === 'saved' && loadingSaved) ? [] : filteredListings}
            keyExtractor={(item) => item.id}
            renderItem={renderListingItem}
            style={styles.container}
            contentContainerStyle={[
              styles.contentContainer,
              {
                maxWidth: maxContentWidth,
                paddingHorizontal: responsivePadding,
                paddingBottom: bottomInset,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            removeClippedSubviews={Platform.OS !== 'web'}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={5}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={renderEmptyComponent}
          />
        </>
      )}

      {/* Quick Price Edit Modal */}
      <Modal
        visible={Boolean(editPriceListing)}
        transparent
        animationType="fade"
        onRequestClose={() => setEditPriceListing(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditPriceListing(null)}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 40 : 80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          </Pressable>

          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBox, { backgroundColor: colors.primaryLight }]}>
                <Tag size={20} color={colors.primary} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Ndrysho Çmimin
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                  {editPriceListing?.title}
                </Text>
              </View>
              <Pressable onPress={() => setEditPriceListing(null)} hitSlop={8}>
                <X size={20} color={colors.textMuted} strokeWidth={2.2} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>
                Çmimi i Ri (€)
              </Text>
              <TextInput
                style={[
                  styles.modalTextInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: specularBorder,
                    color: colors.textPrimary,
                  },
                ]}
                value={newPrice}
                onChangeText={setNewPrice}
                keyboardType="numeric"
                placeholder="p.sh. 95000"
                placeholderTextColor={colors.textLight}
                autoFocus
              />
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalCancelBtn, { borderColor: specularBorder }]}
                onPress={() => setEditPriceListing(null)}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>
                  Anulo
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalSaveBtn,
                  { backgroundColor: theme === 'green' ? colors.gold : colors.primary },
                ]}
                onPress={handleSavePrice}
                disabled={savingPrice}
              >
                {savingPrice ? (
                  <ActivityIndicator
                    size="small"
                    color={theme === 'green' ? '#071C18' : '#FFFFFF'}
                  />
                ) : (
                  <>
                    <Check
                      size={17}
                      color={theme === 'green' ? '#071C18' : '#FFFFFF'}
                      strokeWidth={2.6}
                    />
                    <Text
                      style={[
                        styles.modalSaveBtnText,
                        { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
                      ]}
                    >
                      Ruaj Çmimin
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
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
  navHeaderOuter: {
    width: '100%',
    borderBottomWidth: 0.5,
  },
  navHeaderInner: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  navTitleWrap: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  navSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 1,
  },
  addPostBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  guestCard: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    borderWidth: 0.5,
    alignItems: 'center',
    gap: 12,
  },
  guestIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  guestHeading: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  guestText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  guestLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 48,
    borderRadius: 14,
    marginTop: 6,
  },
  guestLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  filterBarOuter: {
    width: '100%',
    borderBottomWidth: 0.5,
  },
  filterBarInner: {
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 12,
  },
  topSegmentTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 15,
    borderWidth: 1,
    gap: 6,
  },
  topSegmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 11,
    gap: 7,
  },
  topSegmentTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  topSegmentTabText: {
    fontSize: 13.5,
    fontFamily: Fonts.bold,
  },
  segmentCounterBadge: {
    paddingHorizontal: 6.5,
    paddingVertical: 1.5,
    borderRadius: 9,
  },
  segmentCounterBadgeText: {
    fontSize: 11.5,
    fontFamily: Fonts.bold,
  },
  childFiltersSection: {
    marginTop: 10,
    gap: 8,
  },
  hiddenTabContent: {
    display: 'none',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    borderWidth: 0.5,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    fontFamily: Fonts.medium,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
    borderRadius: 10,
  },
  savedNoticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 0.5,
    gap: 6,
    alignSelf: 'flex-start',
  },
  savedNoticeText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: 14,
    gap: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 26,
    borderRadius: 24,
    borderWidth: 0.5,
    gap: 12,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 6,
  },
  emptyPostBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  listingCard: {
    borderRadius: 22,
    borderWidth: 0.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardCover: {
    width: '100%',
    height: 190,
    position: 'relative',
    backgroundColor: '#000',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverBadgesRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9.5,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  coverPriceGlass: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  coverPriceText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontFamily: Fonts.extraBold,
  },
  coverEditPriceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  coverEditPriceBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  cardBody: {
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    lineHeight: 21,
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLocationText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  cardFeaturesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featureItemText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  cardActionGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  actionBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.bold,
  },
  actionSquareBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 0.5,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
  modalBody: {
    gap: 6,
  },
  modalInputLabel: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  modalTextInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  modalSaveBtn: {
    flex: 1.4,
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
})
