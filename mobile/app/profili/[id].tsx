import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  RefreshControl,
  Share,
  Linking,
  Alert,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  MessageSquare,
  Share2,
  Building2,
  User,
  ShieldCheck,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  Home,
  CheckCircle2,
  ChevronRight,
  Briefcase,
  Check,
} from 'lucide-react-native'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase, Listing, Profile } from '@/lib/supabase'
import { getAvatarSource } from '@/lib/avatars'
import { normalizePhoneNumber, formatPhoneDisplay } from '@/lib/phone'
import { safeBack } from '@/lib/navigation'
import { ListingCard } from '@/components/ListingCard'
import { SkeletonBox } from '@/components/ListingSkeleton'
import { fetchFavoriteIds, persistFavoriteToggle } from '@/lib/favorites'

export interface PublicProfile extends Profile {
  whatsapp?: string | null
  bio?: string | null
  company_description?: string | null
  city?: string | null
  created_at?: string | null
}

export default function PublicProfileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, theme } = useTheme()
  const params = useLocalSearchParams<{ id?: string }>()
  const profileId = params.id

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'shitje' | 'qira'>('all')
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Concurrently fetch profile, active listings, and user's favorites
  const loadData = useCallback(async (isRefresh = false) => {
    if (!profileId) {
      if (isMountedRef.current) {
        setError('ID e profilit mungon.')
        setLoading(false)
      }
      return
    }

    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [profileRes, listingsRes, favsMap] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .maybeSingle(),
        supabase
          .from('listings')
          .select('*')
          .eq('user_id', profileId)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        fetchFavoriteIds().catch(() => ({})),
      ])

      if (!isMountedRef.current) return

      if (profileRes.error) {
        throw new Error(profileRes.error.message)
      }

      if (!profileRes.data) {
        setError('Profili nuk u gjet ose është çaktivizuar.')
        setProfile(null)
        setListings([])
      } else {
        setProfile(profileRes.data as PublicProfile)
        setListings((listingsRes.data || []) as unknown as Listing[])
        setFavorites(favsMap || {})
      }
    } catch (err: any) {
      console.warn('Public profile load exception:', err)
      if (isMountedRef.current) {
        setError(err?.message || 'Ndodhi një problem gjatë ngarkimit të profilit.')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [profileId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Favorite toggle handling with optimistic rollback and stable reference
  const handleToggleFavorite = useCallback(async (listingId: string) => {
    let wasFav = false
    setFavorites((prev) => {
      wasFav = Boolean(prev[listingId])
      return { ...prev, [listingId]: !wasFav }
    })

    try {
      const ok = await persistFavoriteToggle(listingId, wasFav)
      if (!ok) {
        setFavorites((prev) => ({ ...prev, [listingId]: wasFav }))
      }
    } catch {
      setFavorites((prev) => ({ ...prev, [listingId]: wasFav }))
    }
  }, [])

  // Profile entity classification & display name
  const isCompany = useMemo(() => {
    if (!profile) return false
    return (
      profile.account_type === 'company' ||
      profile.last_name === 'Kompani' ||
      Boolean(profile.company_name)
    )
  }, [profile])

  const displayName = useMemo(() => {
    if (!profile) return ''
    if (isCompany) {
      return (profile.company_name || profile.first_name || 'Agjenci Imobiliare').trim()
    }
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    return fullName || 'Përdorues i Bleje Pronën'
  }, [profile, isCompany])

  const isVerified = useMemo(() => {
    if (!profile) return false
    return profile.email_verified === true || isCompany
  }, [profile, isCompany])

  const memberYear = useMemo(() => {
    if (!profile?.created_at) return '2026'
    try {
      return new Date(profile.created_at).getFullYear().toString()
    } catch {
      return '2026'
    }
  }, [profile?.created_at])

  // Communication Action Triggers
  const handleCall = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    const rawPhone = profile?.phone
    if (!rawPhone) {
      Alert.alert('Nuk ka numër', 'Ky profil nuk ka vendosur një numër kontakti publik.')
      return
    }
    const normalized = normalizePhoneNumber(rawPhone)
    Linking.openURL(`tel:${normalized}`).catch(() => {
      Alert.alert('Gabim', 'Nuk mund të iniciohet thirrja telefonike.')
    })
  }, [profile?.phone])

  const handleWhatsApp = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    const rawPhone = profile?.whatsapp || profile?.phone
    if (!rawPhone) {
      Alert.alert('Nuk ka WhatsApp', 'Ky profil nuk ka numër të konfiguruar për WhatsApp.')
      return
    }
    const cleanNumber = normalizePhoneNumber(rawPhone).replace(/[^0-9]/g, '')
    const greetingMsg = encodeURIComponent(
      isCompany
        ? `Përshëndetje ${displayName}! Po ju kontaktoj përmes platformës Bleje Pronën lidhur me pronat tuaja.`
        : `Përshëndetje! Po ju kontaktoj nga Bleje Pronën lidhur me shpalljen tuaj.`
    )
    Linking.openURL(`https://wa.me/${cleanNumber}?text=${greetingMsg}`).catch(() => {
      Alert.alert('Gabim', 'Nuk mund të hapet aplikacioni WhatsApp.')
    })
  }, [profile?.whatsapp, profile?.phone, displayName, isCompany])

  const handleSMS = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    const rawPhone = profile?.phone || profile?.whatsapp
    if (!rawPhone) {
      Alert.alert('Nuk ka numër', 'Nuk ka numër të disponueshëm për SMS.')
      return
    }
    const normalized = normalizePhoneNumber(rawPhone)
    const smsMsg = encodeURIComponent(
      `Përshëndetje, po ju kontaktoj nga Bleje Pronën lidhur me pronat tuaja.`
    )
    Linking.openURL(`sms:${normalized}?body=${smsMsg}`).catch(() => {
      Alert.alert('Gabim', 'Nuk mund të hapet aplikacioni i mesazheve.')
    })
  }, [profile?.phone, profile?.whatsapp])

  const handleShare = useCallback(async () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    try {
      const url = `https://blejepronen.com/profili/${profileId}`
      await Share.share({
        title: `${displayName} • Bleje Pronën`,
        message: `Shiko profilin dhe pronat e "${displayName}" në Bleje Pronën:\n${url}`,
        url,
      })
    } catch {
      // User cancelled share
    }
  }, [displayName, profileId])

  // Filter listings
  const filteredListings = useMemo(() => {
    if (activeFilter === 'all') return listings
    return listings.filter((l) => l.type === activeFilter)
  }, [listings, activeFilter])

  const countSales = useMemo(() => listings.filter((l) => l.type === 'shitje').length, [listings])
  const countRentals = useMemo(() => listings.filter((l) => l.type === 'qira').length, [listings])

  const resolvedBottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 24 : 16)
  const specularBorder = colors.border

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* ─── DYNAMIC STATUS BAR ─── */}
      <StatusBar style={theme === 'white' ? 'dark' : 'light'} />

      {/* ─── MINIMALIST MASTER TOP BAR ─── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            height: 56 + insets.top,
            backgroundColor: colors.surface,
            borderBottomColor: specularBorder,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.navBtn,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: specularBorder,
            },
            pressed && styles.navBtnPressed,
          ]}
          onPress={() => safeBack(router, '/(tabs)')}
          hitSlop={12}
        >
          <ArrowLeft size={19} color={colors.textPrimary} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.headerTitleCenter}>
          <Text style={[styles.headerTitleText, { color: colors.textPrimary }]} numberOfLines={1}>
            {loading ? 'Profili' : displayName}
          </Text>
          {!loading && (
            <Text style={[styles.headerSubtitleText, { color: colors.textMuted }]} numberOfLines={1}>
              {isCompany ? 'Agjenci Imobiliare' : 'Llogari Personale'}
            </Text>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.navBtn,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: specularBorder,
            },
            pressed && styles.navBtnPressed,
          ]}
          onPress={handleShare}
          hitSlop={12}
        >
          <Share2 size={18} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* ─── MAIN SCROLLABLE CONTENT ─── */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: 100 + resolvedBottomInset },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading ? (
          /* ─── CLEAN MINIMALIST SKELETON LOADER ─── */
          <View style={styles.skeletonWrapper}>
            <View
              style={[
                styles.profileSurfaceCard,
                { backgroundColor: colors.surface, borderColor: specularBorder },
              ]}
            >
              <View style={styles.heroHeaderRow}>
                <SkeletonBox width={80} height={80} borderRadius={isCompany ? 18 : 40} />
                <View style={styles.skeletonTextCol}>
                  <SkeletonBox width="85%" height={24} borderRadius={6} />
                  <SkeletonBox width="50%" height={16} borderRadius={6} />
                  <SkeletonBox width="40%" height={14} borderRadius={6} />
                </View>
              </View>

              <View style={styles.contactRow}>
                <SkeletonBox width="48%" height={50} borderRadius={14} />
                <SkeletonBox width="48%" height={50} borderRadius={14} />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <SkeletonBox width={160} height={22} borderRadius={6} />
            </View>

            <View style={styles.skeletonCardsWrap}>
              <SkeletonBox width="100%" height={260} borderRadius={18} />
              <SkeletonBox width="100%" height={260} borderRadius={18} />
            </View>
          </View>
        ) : error || !profile ? (
          /* ─── ERROR / 404 NOT FOUND RECOVERY ─── */
          <View
            style={[
              styles.errorCard,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
          >
            <View
              style={[
                styles.errorIconBox,
                {
                  backgroundColor:
                    theme === 'green' ? 'rgba(212, 175, 55, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                },
              ]}
            >
              <AlertCircle
                size={36}
                color={theme === 'green' ? colors.gold : '#EF4444'}
                strokeWidth={2}
              />
            </View>
            <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
              Profili nuk u gjet
            </Text>
            <Text style={[styles.errorSubtitle, { color: colors.textMuted }]}>
              {error || 'Ky profil nuk ekziston ose mund të jetë çaktivizuar.'}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.errorBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => safeBack(router, '/(tabs)')}
            >
              <Text style={styles.errorBtnText}>Kthehu te Ballina</Text>
            </Pressable>
          </View>
        ) : isCompany ? (
          /* ═══════════════════════════════════════════════════════════════
             1. COMPANY / REAL ESTATE AGENCY PROFILE (Corporate & Branded)
             ═══════════════════════════════════════════════════════════════ */
          <>
            {/* ─── Corporate Identity Card ─── */}
            <View
              style={[
                styles.profileSurfaceCard,
                styles.companyCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: specularBorder,
                  shadowColor: theme === 'black' ? '#000' : colors.primaryDark,
                },
              ]}
            >
              {/* Header: Company Logo Emblem + Official Title */}
              <View style={styles.heroHeaderRow}>
                <View
                  style={[
                    styles.companyLogoBox,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: theme === 'green' ? 'rgba(212, 175, 55, 0.35)' : specularBorder,
                    },
                  ]}
                >
                  <Image
                    source={getAvatarSource(profile.avatar_url)}
                    style={styles.companyLogoImg}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    priority="high"
                  />
                  {isVerified && (
                    <View
                      style={[
                        styles.companyVerifiedBadge,
                        {
                          backgroundColor: theme === 'green' ? colors.gold : '#10B981',
                          borderColor: colors.surface,
                        },
                      ]}
                    >
                      <CheckCircle2 size={12} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </View>

                <View style={styles.identityDetails}>
                  <Text
                    style={[styles.companyNameText, { color: colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {displayName}
                  </Text>

                  {/* Commercial Accreditation Tag */}
                  <View style={styles.commercialTagRow}>
                    <View
                      style={[
                        styles.corporatePill,
                        {
                          backgroundColor:
                            theme === 'green'
                              ? 'rgba(212, 175, 55, 0.14)'
                              : colors.primaryLight,
                          borderColor:
                            theme === 'green'
                              ? 'rgba(212, 175, 55, 0.28)'
                              : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Building2
                        size={12}
                        color={theme === 'green' ? colors.gold : colors.primary}
                        strokeWidth={2.4}
                      />
                      <Text
                        style={[
                          styles.corporatePillText,
                          { color: theme === 'green' ? colors.gold : colors.primary },
                        ]}
                      >
                        Agjenci Imobiliare
                      </Text>
                    </View>

                    {isVerified && (
                      <View
                        style={[
                          styles.corporatePill,
                          {
                            backgroundColor:
                              theme === 'green'
                                ? 'rgba(212, 175, 55, 0.12)'
                                : 'rgba(16, 185, 129, 0.12)',
                            borderColor:
                              theme === 'green'
                                ? 'rgba(212, 175, 55, 0.24)'
                                : 'rgba(16, 185, 129, 0.22)',
                          },
                        ]}
                      >
                        <ShieldCheck
                          size={12}
                          color={theme === 'green' ? colors.gold : '#10B981'}
                          strokeWidth={2.6}
                        />
                        <Text
                          style={[
                            styles.corporatePillText,
                            { color: theme === 'green' ? colors.gold : '#10B981' },
                          ]}
                        >
                          E Licencuar
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Operational Location & Active Portfolio Meta */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <MapPin size={12} color={colors.textMuted} strokeWidth={2.2} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        {profile.city || 'Kosovë'}
                      </Text>
                    </View>

                    <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>

                    <View style={styles.metaItem}>
                      <Layers size={12} color={colors.textMuted} strokeWidth={2.2} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        {listings.length} {listings.length === 1 ? 'pronë' : 'prona'} aktive
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ─── Corporate Summary / About Section ─── */}
              {(profile.company_description || profile.bio) && (
                <View
                  style={[
                    styles.corporateAboutBox,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: specularBorder,
                    },
                  ]}
                >
                  <Text style={[styles.corporateAboutTitle, { color: colors.textPrimary }]}>
                    Rreth Agjencisë
                  </Text>
                  <Text style={[styles.corporateAboutText, { color: colors.textSecondary }]}>
                    {profile.company_description || profile.bio}
                  </Text>
                </View>
              )}

              {/* ─── Corporate Contact Suite ─── */}
              <View style={styles.contactContainer}>
                <View style={styles.contactRow}>
                  {/* Primary: Call Agency */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.phoneBtn,
                      {
                        backgroundColor: colors.primary,
                        borderColor: colors.primaryDark,
                      },
                      pressed && styles.btnPressed,
                      !profile.phone && styles.btnDisabled,
                    ]}
                    onPress={handleCall}
                    disabled={!profile.phone}
                  >
                    <Phone size={18} color="#FFFFFF" strokeWidth={2.4} />
                    <View style={styles.actionBtnTextCol}>
                      <Text style={styles.actionBtnTitle}>Telefono Agjencinë</Text>
                      <Text style={styles.actionBtnSubtitle} numberOfLines={1}>
                        {profile.phone
                          ? formatPhoneDisplay(profile.phone)
                          : 'Numri mungon'}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Secondary: Official WhatsApp */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.whatsappBtn,
                      pressed && styles.btnPressed,
                      !(profile.whatsapp || profile.phone) && styles.btnDisabled,
                    ]}
                    onPress={handleWhatsApp}
                    disabled={!(profile.whatsapp || profile.phone)}
                  >
                    <MessageCircle size={19} color="#FFFFFF" strokeWidth={2.4} />
                    <View style={styles.actionBtnTextCol}>
                      <Text style={styles.actionBtnTitle}>WhatsApp Zyrtar</Text>
                      <Text style={styles.actionBtnSubtitle}>Bisedë e drejtpërdrejtë</Text>
                    </View>
                  </Pressable>
                </View>

                {/* Auxiliary Row */}
                {Boolean(profile.phone || profile.whatsapp) && (
                  <View style={styles.auxRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.auxBtn,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: specularBorder,
                        },
                        pressed && styles.btnPressed,
                      ]}
                      onPress={handleSMS}
                    >
                      <MessageSquare size={14} color={colors.textPrimary} strokeWidth={2} />
                      <Text style={[styles.auxBtnText, { color: colors.textPrimary }]}>
                        Dërgo SMS
                      </Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.auxBtn,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: specularBorder,
                        },
                        pressed && styles.btnPressed,
                      ]}
                      onPress={handleShare}
                    >
                      <Share2 size={14} color={colors.textPrimary} strokeWidth={2} />
                      <Text style={[styles.auxBtnText, { color: colors.textPrimary }]}>
                        Shpërndaj Profilin
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>

            {/* ─── Real Estate Portfolio Gallery ─── */}
            <View style={styles.listingsSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWrap}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                    Portofoli i Pronave
                  </Text>
                  <View
                    style={[
                      styles.countPill,
                      {
                        backgroundColor:
                          theme === 'green'
                            ? 'rgba(212, 175, 55, 0.18)'
                            : colors.primaryLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countPillText,
                        { color: theme === 'green' ? colors.gold : colors.primary },
                      ]}
                    >
                      {listings.length}
                    </Text>
                  </View>
                </View>

                {/* Transaction Filters */}
                {listings.length > 0 && (countSales > 0 || countRentals > 0) && (
                  <View
                    style={[
                      styles.filterSegmentWrap,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: specularBorder,
                      },
                    ]}
                  >
                    <Pressable
                      style={[
                        styles.filterSegmentBtn,
                        activeFilter === 'all' && [
                          styles.filterSegmentActive,
                          {
                            backgroundColor: colors.surface,
                            borderColor: specularBorder,
                          },
                        ],
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setActiveFilter('all')
                      }}
                    >
                      <Text
                        style={[
                          styles.filterSegmentText,
                          {
                            color:
                              activeFilter === 'all'
                                ? colors.textPrimary
                                : colors.textMuted,
                            fontFamily:
                              activeFilter === 'all' ? Fonts.bold : Fonts.medium,
                          },
                        ]}
                      >
                        Të gjitha ({listings.length})
                      </Text>
                    </Pressable>

                    {countSales > 0 && (
                      <Pressable
                        style={[
                          styles.filterSegmentBtn,
                          activeFilter === 'shitje' && [
                            styles.filterSegmentActive,
                            {
                              backgroundColor: colors.surface,
                              borderColor: specularBorder,
                            },
                          ],
                        ]}
                        onPress={() => {
                          if (Platform.OS !== 'web') Haptics.selectionAsync()
                          setActiveFilter('shitje')
                        }}
                      >
                        <Text
                          style={[
                            styles.filterSegmentText,
                            {
                              color:
                                activeFilter === 'shitje'
                                  ? colors.textPrimary
                                  : colors.textMuted,
                              fontFamily:
                                activeFilter === 'shitje' ? Fonts.bold : Fonts.medium,
                            },
                          ]}
                        >
                          Shitje ({countSales})
                        </Text>
                      </Pressable>
                    )}

                    {countRentals > 0 && (
                      <Pressable
                        style={[
                          styles.filterSegmentBtn,
                          activeFilter === 'qira' && [
                            styles.filterSegmentActive,
                            {
                              backgroundColor: colors.surface,
                              borderColor: specularBorder,
                            },
                          ],
                        ]}
                        onPress={() => {
                          if (Platform.OS !== 'web') Haptics.selectionAsync()
                          setActiveFilter('qira')
                        }}
                      >
                        <Text
                          style={[
                            styles.filterSegmentText,
                            {
                              color:
                                activeFilter === 'qira'
                                  ? colors.textPrimary
                                  : colors.textMuted,
                              fontFamily:
                                activeFilter === 'qira' ? Fonts.bold : Fonts.medium,
                            },
                          ]}
                        >
                          Qira ({countRentals})
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>

              {/* Listings Cards / Empty State */}
              {filteredListings.length === 0 ? (
                <View
                  style={[
                    styles.emptyListingsCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: specularBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.emptyIconCircle,
                      {
                        backgroundColor:
                          theme === 'green'
                            ? 'rgba(212, 175, 55, 0.12)'
                            : colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Home
                      size={28}
                      color={theme === 'green' ? colors.gold : colors.textMuted}
                      strokeWidth={1.8}
                    />
                  </View>
                  <Text style={[styles.emptyListingsTitle, { color: colors.textPrimary }]}>
                    Nuk ka shpallje në këtë kategori
                  </Text>
                  <Text style={[styles.emptyListingsSubtitle, { color: colors.textMuted }]}>
                    Kjo agjenci nuk ka prona aktive të listuara për filtrin e zgjedhur.
                  </Text>
                </View>
              ) : (
                <View style={styles.listingsGrid}>
                  {filteredListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      isFavorite={Boolean(favorites[listing.id])}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </View>
              )}
            </View>
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════════════
             2. INDIVIDUAL / PRIVATE SELLER PROFILE (Streamlined & Clean)
             ═══════════════════════════════════════════════════════════════ */
          <>
            {/* ─── Individual User Identity Card ─── */}
            <View
              style={[
                styles.profileSurfaceCard,
                styles.individualCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: specularBorder,
                  shadowColor: theme === 'black' ? '#000' : colors.primaryDark,
                },
              ]}
            >
              <View style={styles.individualHeaderRow}>
                {/* Personal Circular Avatar */}
                <View
                  style={[
                    styles.personalAvatarBox,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: specularBorder,
                    },
                  ]}
                >
                  <Image
                    source={getAvatarSource(profile.avatar_url)}
                    style={styles.personalAvatarImg}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    priority="high"
                  />
                  {isVerified && (
                    <View
                      style={[
                        styles.personalVerifiedBadge,
                        {
                          backgroundColor: '#10B981',
                          borderColor: colors.surface,
                        },
                      ]}
                    >
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </View>

                {/* Personal Identity Details */}
                <View style={styles.identityDetails}>
                  <Text
                    style={[styles.personalNameText, { color: colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {displayName}
                  </Text>

                  <View style={styles.personalRoleRow}>
                    <View
                      style={[
                        styles.personalRolePill,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: specularBorder,
                        },
                      ]}
                    >
                      <User size={11} color={colors.textSecondary} strokeWidth={2.2} />
                      <Text style={[styles.personalRoleText, { color: colors.textSecondary }]}>
                        Pronar Privat
                      </Text>
                    </View>

                    {isVerified && (
                      <View
                        style={[
                          styles.personalRolePill,
                          {
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderColor: 'rgba(16, 185, 129, 0.2)',
                          },
                        ]}
                      >
                        <ShieldCheck size={11} color="#10B981" strokeWidth={2.4} />
                        <Text style={[styles.personalRoleText, { color: '#10B981' }]}>
                          I Verifikuar
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <MapPin size={11} color={colors.textMuted} strokeWidth={2} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        {profile.city || 'Kosovë'}
                      </Text>
                    </View>

                    <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>

                    <View style={styles.metaItem}>
                      <Calendar size={11} color={colors.textMuted} strokeWidth={2} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        Anëtar që nga {memberYear}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ─── Personal Bio (if present) ─── */}
              {Boolean(profile.bio) && (
                <View
                  style={[
                    styles.personalBioBox,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: specularBorder,
                    },
                  ]}
                >
                  <Text style={[styles.personalBioText, { color: colors.textSecondary }]}>
                    {profile.bio}
                  </Text>
                </View>
              )}

              {/* ─── Streamlined Personal Actions ─── */}
              <View style={styles.personalActionsRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.personalActionBtn,
                    styles.personalPhoneBtn,
                    {
                      backgroundColor: colors.primary,
                    },
                    pressed && styles.btnPressed,
                    !profile.phone && styles.btnDisabled,
                  ]}
                  onPress={handleCall}
                  disabled={!profile.phone}
                >
                  <Phone size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.personalActionBtnText}>
                    {profile.phone ? formatPhoneDisplay(profile.phone) : 'Pa numër'}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.personalActionBtn,
                    styles.personalWhatsAppBtn,
                    pressed && styles.btnPressed,
                    !(profile.whatsapp || profile.phone) && styles.btnDisabled,
                  ]}
                  onPress={handleWhatsApp}
                  disabled={!(profile.whatsapp || profile.phone)}
                >
                  <MessageCircle size={17} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.personalActionBtnText}>WhatsApp</Text>
                </Pressable>
              </View>
            </View>

            {/* ─── Personal Listings ─── */}
            <View style={styles.listingsSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWrap}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                    Pronat e Shitësit
                  </Text>
                  <View
                    style={[
                      styles.countPill,
                      {
                        backgroundColor: colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Text style={[styles.countPillText, { color: colors.textPrimary }]}>
                      {listings.length}
                    </Text>
                  </View>
                </View>

                {listings.length > 0 && (countSales > 0 || countRentals > 0) && (
                  <View
                    style={[
                      styles.filterSegmentWrap,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: specularBorder,
                      },
                    ]}
                  >
                    <Pressable
                      style={[
                        styles.filterSegmentBtn,
                        activeFilter === 'all' && [
                          styles.filterSegmentActive,
                          {
                            backgroundColor: colors.surface,
                            borderColor: specularBorder,
                          },
                        ],
                      ]}
                      onPress={() => setActiveFilter('all')}
                    >
                      <Text
                        style={[
                          styles.filterSegmentText,
                          {
                            color: activeFilter === 'all' ? colors.textPrimary : colors.textMuted,
                            fontFamily: activeFilter === 'all' ? Fonts.bold : Fonts.medium,
                          },
                        ]}
                      >
                        Të gjitha
                      </Text>
                    </Pressable>

                    {countSales > 0 && (
                      <Pressable
                        style={[
                          styles.filterSegmentBtn,
                          activeFilter === 'shitje' && [
                            styles.filterSegmentActive,
                            {
                              backgroundColor: colors.surface,
                              borderColor: specularBorder,
                            },
                          ],
                        ]}
                        onPress={() => setActiveFilter('shitje')}
                      >
                        <Text
                          style={[
                            styles.filterSegmentText,
                            {
                              color: activeFilter === 'shitje' ? colors.textPrimary : colors.textMuted,
                              fontFamily: activeFilter === 'shitje' ? Fonts.bold : Fonts.medium,
                            },
                          ]}
                        >
                          Shitje ({countSales})
                        </Text>
                      </Pressable>
                    )}

                    {countRentals > 0 && (
                      <Pressable
                        style={[
                          styles.filterSegmentBtn,
                          activeFilter === 'qira' && [
                            styles.filterSegmentActive,
                            {
                              backgroundColor: colors.surface,
                              borderColor: specularBorder,
                            },
                          ],
                        ]}
                        onPress={() => setActiveFilter('qira')}
                      >
                        <Text
                          style={[
                            styles.filterSegmentText,
                            {
                              color: activeFilter === 'qira' ? colors.textPrimary : colors.textMuted,
                              fontFamily: activeFilter === 'qira' ? Fonts.bold : Fonts.medium,
                            },
                          ]}
                        >
                          Qira ({countRentals})
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>

              {filteredListings.length === 0 ? (
                <View
                  style={[
                    styles.emptyListingsCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: specularBorder,
                    },
                  ]}
                >
                  <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
                    <Home size={26} color={colors.textMuted} strokeWidth={1.8} />
                  </View>
                  <Text style={[styles.emptyListingsTitle, { color: colors.textPrimary }]}>
                    Nuk ka shpallje aktive
                  </Text>
                  <Text style={[styles.emptyListingsSubtitle, { color: colors.textMuted }]}>
                    Ky shitës nuk ka prona aktive për momentin.
                  </Text>
                </View>
              ) : (
                <View style={styles.listingsGrid}>
                  {filteredListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      isFavorite={Boolean(favorites[listing.id])}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  // ─── Header Navigation ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    zIndex: 10,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  navBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  headerTitleCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  headerTitleText: {
    fontSize: 15.5,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  headerSubtitleText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    marginTop: 0.5,
  },

  // ─── Container ───
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 18,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },

  // ─── Shared Profile Card ───
  profileSurfaceCard: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 16,
  },
  companyCard: {
    padding: 20,
    borderRadius: 24,
    gap: 18,
  },
  individualCard: {
    padding: 18,
    borderRadius: 20,
    gap: 16,
  },

  // ─── Company Header Layout ───
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 15,
  },
  companyLogoBox: {
    width: 82,
    height: 82,
    borderRadius: 20,
    borderWidth: 1,
    position: 'relative',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  companyLogoImg: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  companyVerifiedBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityDetails: {
    flex: 1,
    gap: 6,
  },
  companyNameText: {
    fontSize: 21,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  commercialTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  corporatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 0.5,
  },
  corporatePillText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: -0.1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  metaDot: {
    fontSize: 11,
  },

  // ─── Corporate About ───
  corporateAboutBox: {
    padding: 14,
    borderRadius: 15,
    borderWidth: 0.5,
    gap: 5,
  },
  corporateAboutTitle: {
    fontSize: 12.5,
    fontFamily: Fonts.bold,
    letterSpacing: -0.1,
  },
  corporateAboutText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 19,
  },

  // ─── Contact Suite ───
  contactContainer: {
    gap: 10,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  phoneBtn: {
    borderWidth: 0.5,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
    borderWidth: 0.5,
    borderColor: '#1EBE5D',
  },
  actionBtnTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  actionBtnTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  actionBtnSubtitle: {
    fontSize: 10.5,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 0.5,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.5,
  },
  auxRow: {
    flexDirection: 'row',
    gap: 10,
  },
  auxBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 0.5,
  },
  auxBtnText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },

  // ─── Individual Profile Styling ───
  individualHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  personalAvatarBox: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1.5,
    position: 'relative',
  },
  personalAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  personalVerifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalNameText: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    letterSpacing: -0.4,
    lineHeight: 25,
  },
  personalRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  personalRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  personalRoleText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },
  personalBioBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  personalBioText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 19,
  },
  personalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  personalActionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  personalPhoneBtn: {},
  personalWhatsAppBtn: {
    backgroundColor: '#25D366',
  },
  personalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.bold,
    letterSpacing: -0.1,
  },

  // ─── Listings Section ───
  listingsSection: {
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeading: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  filterSegmentWrap: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 0.5,
    padding: 2.5,
    gap: 2,
  },
  filterSegmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  filterSegmentActive: {
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  filterSegmentText: {
    fontSize: 11.5,
  },
  listingsGrid: {
    gap: 16,
  },
  emptyListingsCard: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyListingsTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  emptyListingsSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },

  // ─── Skeleton Loading ───
  skeletonWrapper: {
    gap: 16,
  },
  skeletonTextCol: {
    flex: 1,
    gap: 8,
  },
  skeletonCardsWrap: {
    gap: 16,
  },
  sectionHeader: {
    paddingHorizontal: 2,
  },

  // ─── Error State ───
  errorCard: {
    padding: 32,
    borderRadius: 22,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 32,
  },
  errorIconBox: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  errorSubtitle: {
    fontSize: 13.5,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  errorBtn: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  errorBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
})
