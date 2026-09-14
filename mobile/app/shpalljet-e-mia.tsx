import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  Modal,
  TextInput,
  Share,
  KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
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
  Sparkles,
  LogIn,
  SlidersHorizontal,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase, Listing } from '@/lib/supabase'
import { useBanner } from '@/context/BannerContext'
import {
  playSuccessSound,
  playDeleteSound,
  playTapSound,
  playThemeSound,
} from '@/lib/sound'

type FilterStatus = 'all' | 'active' | 'inactive'

export default function ShpalljetEMiaScreen() {
  const router = useRouter()
  const { colors, theme } = useTheme()
  const { showBanner } = useBanner()

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  // Price Edit Modal
  const [editPriceListing, setEditPriceListing] = useState<Listing | null>(null)
  const [newPrice, setNewPrice] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)

  // Action busy state per listing
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)

  const fetchUserListings = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Fetch user listings error:', error)
      } else {
        setListings((data || []) as unknown as Listing[])
      }
    } catch (e) {
      console.warn('Listings fetch exception:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    async function init() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        setCurrentUser(user || null)
        if (user) {
          await fetchUserListings(user.id)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.warn('Auth check in shpalljet-e-mia notice:', err)
        setLoading(false)
      }
    }

    init()
  }, [fetchUserListings])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    if (currentUser) {
      fetchUserListings(currentUser.id)
    } else {
      setRefreshing(false)
    }
  }, [currentUser, fetchUserListings])

  const handleFilterChange = (status: FilterStatus) => {
    if (filterStatus === status) return
    playTapSound()
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setFilterStatus(status)
  }

  // Toggle Active/Inactive Status
  const handleToggleStatus = async (item: Listing) => {
    const nextStatus = !item.is_active
    setActionBusyId(item.id)

    try {
      const { error } = await supabase
        .from('listings')
        .update({ is_active: nextStatus })
        .eq('id', item.id)

      if (error) {
        Alert.alert('Gabim', 'Dështoi përditësimi i statusit: ' + error.message)
        return
      }

      setListings((prev) =>
        prev.map((l) => (l.id === item.id ? { ...l, is_active: nextStatus } : l))
      )

      playSuccessSound()
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }

      showBanner({
        type: 'success',
        title: nextStatus ? 'Shpallja u Aktivizua' : 'Shpallja u Çaktivizua',
        message: nextStatus
          ? `Prona "${item.title}" tani është aktive dhe shfaqet për blerësit.`
          : `Prona "${item.title}" u shënua si e shitur / joaktive.`,
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

  // Filtered Listings
  const filteredListings = listings.filter((l) => {
    if (filterStatus === 'active') return Boolean(l.is_active)
    if (filterStatus === 'inactive') return !Boolean(l.is_active)
    return true
  })

  const activeCount = listings.filter((l) => Boolean(l.is_active)).length
  const inactiveCount = listings.filter((l) => !Boolean(l.is_active)).length

  const specularBorder =
    theme === 'white'
      ? 'rgba(0, 0, 0, 0.08)'
      : theme === 'green'
      ? 'rgba(255, 255, 255, 0.14)'
      : 'rgba(255, 255, 255, 0.10)'

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Navigation Header */}
      <View style={[styles.navHeader, { borderBottomColor: specularBorder }]}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: specularBorder }]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.navTitleWrap}>
          <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Shpalljet e Mia</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            {listings.length} {listings.length === 1 ? 'pronë e postuar' : 'prona të postuara'}
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
          <Plus size={18} color={theme === 'green' ? '#003E37' : '#FFFFFF'} strokeWidth={2.6} />
        </Pressable>
      </View>

      {/* Guest Mode Protection */}
      {!currentUser && !loading ? (
        <View style={styles.guestContainer}>
          <View style={[styles.guestCard, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
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
          {/* Apple Segmented Filter Bar */}
          <View style={[styles.filterBar, { borderBottomColor: specularBorder }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsContainer}
            >
              {/* All */}
              <Pressable
                style={[
                  styles.filterPill,
                  {
                    backgroundColor:
                      filterStatus === 'all'
                        ? theme === 'green' ? colors.gold : colors.primary
                        : colors.surface,
                    borderColor:
                      filterStatus === 'all'
                        ? theme === 'green' ? colors.gold : colors.primary
                        : specularBorder,
                  },
                ]}
                onPress={() => handleFilterChange('all')}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color:
                        filterStatus === 'all'
                          ? theme === 'green' ? '#003E37' : '#FFFFFF'
                          : colors.textPrimary,
                    },
                  ]}
                >
                  Të Gjitha
                </Text>
                <View
                  style={[
                    styles.counterBadge,
                    {
                      backgroundColor:
                        filterStatus === 'all'
                          ? theme === 'green' ? 'rgba(0,62,55,0.25)' : 'rgba(255,255,255,0.25)'
                          : colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.counterBadgeText,
                      {
                        color:
                          filterStatus === 'all'
                            ? theme === 'green' ? '#003E37' : '#FFFFFF'
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {listings.length}
                  </Text>
                </View>
              </Pressable>

              {/* Active */}
              <Pressable
                style={[
                  styles.filterPill,
                  {
                    backgroundColor:
                      filterStatus === 'active'
                        ? theme === 'green' ? colors.gold : colors.primary
                        : colors.surface,
                    borderColor:
                      filterStatus === 'active'
                        ? theme === 'green' ? colors.gold : colors.primary
                        : specularBorder,
                  },
                ]}
                onPress={() => handleFilterChange('active')}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        filterStatus === 'active'
                          ? theme === 'green' ? '#003E37' : '#FFFFFF'
                          : '#10B981',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color:
                        filterStatus === 'active'
                          ? theme === 'green' ? '#003E37' : '#FFFFFF'
                          : colors.textPrimary,
                    },
                  ]}
                >
                  Aktive
                </Text>
                <View
                  style={[
                    styles.counterBadge,
                    {
                      backgroundColor:
                        filterStatus === 'active'
                          ? theme === 'green' ? 'rgba(0,62,55,0.25)' : 'rgba(255,255,255,0.25)'
                          : colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.counterBadgeText,
                      {
                        color:
                          filterStatus === 'active'
                            ? theme === 'green' ? '#003E37' : '#FFFFFF'
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {activeCount}
                  </Text>
                </View>
              </Pressable>

              {/* Inactive */}
              <Pressable
                style={[
                  styles.filterPill,
                  {
                    backgroundColor:
                      filterStatus === 'inactive'
                        ? theme === 'green' ? colors.gold : colors.primary
                        : colors.surface,
                    borderColor:
                      filterStatus === 'inactive'
                        ? theme === 'green' ? colors.gold : colors.primary
                        : specularBorder,
                  },
                ]}
                onPress={() => handleFilterChange('inactive')}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        filterStatus === 'inactive'
                          ? theme === 'green' ? '#003E37' : '#FFFFFF'
                          : colors.textMuted,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color:
                        filterStatus === 'inactive'
                          ? theme === 'green' ? '#003E37' : '#FFFFFF'
                          : colors.textPrimary,
                    },
                  ]}
                >
                  Shitur / Joaktive
                </Text>
                <View
                  style={[
                    styles.counterBadge,
                    {
                      backgroundColor:
                        filterStatus === 'inactive'
                          ? theme === 'green' ? 'rgba(0,62,55,0.25)' : 'rgba(255,255,255,0.25)'
                          : colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.counterBadgeText,
                      {
                        color:
                          filterStatus === 'inactive'
                            ? theme === 'green' ? '#003E37' : '#FFFFFF'
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {inactiveCount}
                  </Text>
                </View>
              </Pressable>
            </ScrollView>
          </View>

          {/* Listings List */}
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Po ngarkojmë shpalljet tuaja...
                </Text>
              </View>
            ) : filteredListings.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Building2 size={38} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {filterStatus === 'all'
                    ? 'Nuk keni asnjë shpallje ende'
                    : filterStatus === 'active'
                    ? 'Nuk keni shpallje aktive për momentin'
                    : 'Nuk keni shpallje të mbyllura apo të shitura'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Postoni pronën tuaj falas brenda pak minutave dhe gjeni blerës të verifikuar në treg.
                </Text>
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
                    color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                    strokeWidth={2.6}
                  />
                  <Text
                    style={[
                      styles.emptyPostBtnText,
                      { color: theme === 'green' ? '#003E37' : '#FFFFFF' },
                    ]}
                  >
                    Posto Pronë të Re
                  </Text>
                </Pressable>
              </View>
            ) : (
              filteredListings.map((item) => {
                const isBusy = actionBusyId === item.id
                const mainImage =
                  item.images && item.images.length > 0
                    ? item.images[0]
                    : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.listingCard,
                      { backgroundColor: colors.surface, borderColor: specularBorder },
                    ]}
                  >
                    {/* Top Media & Preview Banner */}
                    <Pressable
                      style={styles.cardCover}
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
                                  ? 'rgba(0, 100, 89, 0.88)'
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
                              backgroundColor: item.is_active
                                ? 'rgba(16, 185, 129, 0.92)'
                                : 'rgba(107, 114, 128, 0.90)',
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.statusPillDot,
                              { backgroundColor: item.is_active ? '#FFFFFF' : '#D1D5DB' },
                            ]}
                          />
                          <Text style={styles.statusPillText}>
                            {item.is_active ? 'Aktiv' : 'E Shitur / Joaktive'}
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
                        <Text style={styles.coverPriceText}>{formatPrice(item.price)}</Text>
                        <Pressable
                          style={styles.coverEditPriceBtn}
                          onPress={(e) => {
                            e.stopPropagation()
                            openPriceModal(item)
                          }}
                          hitSlop={6}
                        >
                          <Tag size={13} color="#FFFFFF" strokeWidth={2.4} />
                          <Text style={styles.coverEditPriceBtnText}>Ndrysho Çmimin</Text>
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

                      <View style={styles.cardFeaturesRow}>
                        {item.rooms ? (
                          <View style={[styles.featureItem, { backgroundColor: colors.surfaceSubtle }]}>
                            <BedDouble size={14} color={colors.textMuted} strokeWidth={2.2} />
                            <Text style={[styles.featureItemText, { color: colors.textSecondary }]}>
                              {item.rooms} dhoma
                            </Text>
                          </View>
                        ) : null}

                        {item.area_m2 ? (
                          <View style={[styles.featureItem, { backgroundColor: colors.surfaceSubtle }]}>
                            <Maximize2 size={13} color={colors.textMuted} strokeWidth={2.2} />
                            <Text style={[styles.featureItemText, { color: colors.textSecondary }]}>
                              {item.area_m2} m²
                            </Text>
                          </View>
                        ) : null}

                        {item.floor !== undefined && item.floor !== null ? (
                          <View style={[styles.featureItem, { backgroundColor: colors.surfaceSubtle }]}>
                            <Building2 size={13} color={colors.textMuted} strokeWidth={2.2} />
                            <Text style={[styles.featureItemText, { color: colors.textSecondary }]}>
                              Kati {item.floor}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Bottom Action Controls (Apple Glass Grid) */}
                    <View style={[styles.cardActionGrid, { borderTopColor: specularBorder }]}>
                      {/* 1. Toggle Active / Inactive */}
                      <Pressable
                        style={[
                          styles.actionBtn,
                          {
                            backgroundColor: item.is_active
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
                        ) : item.is_active ? (
                          <>
                            <XCircle size={15} color="#EF4444" strokeWidth={2.2} />
                            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>
                              Shëno si të Shitur
                            </Text>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={15} color="#10B981" strokeWidth={2.2} />
                            <Text style={[styles.actionBtnText, { color: '#10B981' }]}>
                              Rikthe Aktiv
                            </Text>
                          </>
                        )}
                      </Pressable>

                      {/* 2. Share */}
                      <Pressable
                        style={[styles.actionSquareBtn, { backgroundColor: colors.surfaceSubtle }]}
                        onPress={() => handleShare(item)}
                        hitSlop={6}
                      >
                        <Share2 size={16} color={colors.textPrimary} strokeWidth={2.2} />
                      </Pressable>

                      {/* 3. View Details */}
                      <Pressable
                        style={[styles.actionSquareBtn, { backgroundColor: colors.surfaceSubtle }]}
                        onPress={() => router.push(`/listings/${item.id}` as any)}
                        hitSlop={6}
                      >
                        <Eye size={16} color={colors.textPrimary} strokeWidth={2.2} />
                      </Pressable>

                      {/* 4. Delete */}
                      <Pressable
                        style={[
                          styles.actionSquareBtn,
                          {
                            backgroundColor:
                              theme === 'white' ? '#FEE2E2' : 'rgba(239, 68, 68, 0.18)',
                          },
                        ]}
                        onPress={() => handleDeleteListing(item)}
                        disabled={isBusy}
                        hitSlop={6}
                      >
                        <Trash2 size={16} color="#EF4444" strokeWidth={2.2} />
                      </Pressable>
                    </View>
                  </View>
                )
              })
            )}
          </ScrollView>
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
                    color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                  />
                ) : (
                  <>
                    <Check
                      size={17}
                      color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                      strokeWidth={2.6}
                    />
                    <Text
                      style={[
                        styles.modalSaveBtnText,
                        { color: theme === 'green' ? '#003E37' : '#FFFFFF' },
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
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
  filterBar: {
    borderBottomWidth: 0.5,
    paddingVertical: 10,
  },
  filterPillsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterPillText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  counterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  counterBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
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
    padding: 30,
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
    maxWidth: 280,
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
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
