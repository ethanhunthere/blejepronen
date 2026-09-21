import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { LinearGradient } from 'expo-linear-gradient'
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
  ExternalLink,
  ChevronRight,
  Info,
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

  // Concurrently fetch profile, active listings, and user's favorites
  const loadData = useCallback(async (isRefresh = false) => {
    if (!profileId) {
      setError('ID e profilit mungon.')
      setLoading(false)
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
      setError(err?.message || 'Ndodhi një problem gjatë ngarkimit të profilit.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [profileId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Favorite toggle handling with optimistic rollback
  const handleToggleFavorite = useCallback(async (listingId: string) => {
    const wasFav = Boolean(favorites[listingId])
    const newFav = !wasFav

    setFavorites((prev) => ({ ...prev, [listingId]: newFav }))

    try {
      await persistFavoriteToggle(listingId, wasFav)
    } catch {
      setFavorites((prev) => ({ ...prev, [listingId]: wasFav }))
    }
  }, [favorites])

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

  const roleLabel = useMemo(() => {
    return isCompany ? 'Agjenci Imobiliare' : 'Shitës Privat / Pronar'
  }, [isCompany])

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
      Alert.alert('Nuk ka numër telefoni', 'Ky përdorues nuk ka vendosur një numër kontakti publik.')
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
      Alert.alert('Nuk ka WhatsApp', 'Ky përdorues nuk ka konfiguruar numër për WhatsApp.')
      return
    }
    const cleanNumber = normalizePhoneNumber(rawPhone).replace(/[^0-9]/g, '')
    const greetingMsg = encodeURIComponent(
      `Përshëndetje ${displayName}! Po ju kontaktoj përmes platformës Bleje Pronën lidhur me pronat tuaja.`
    )
    Linking.openURL(`https://wa.me/${cleanNumber}?text=${greetingMsg}`).catch(() => {
      Alert.alert('Gabim', 'Nuk mund të hapet aplikacioni WhatsApp.')
    })
  }, [profile?.whatsapp, profile?.phone, displayName])

  const handleSMS = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    const rawPhone = profile?.phone || profile?.whatsapp
    if (!rawPhone) {
      Alert.alert('Nuk ka numër', 'Nuk ka numër telefoni të disponueshëm për SMS.')
      return
    }
    const normalized = normalizePhoneNumber(rawPhone)
    const smsMsg = encodeURIComponent(
      `Përshëndetje ${displayName}, po ju shkruaj nga Bleje Pronën lidhur me shpalljet tuaja.`
    )
    Linking.openURL(`sms:${normalized}?body=${smsMsg}`).catch(() => {
      Alert.alert('Gabim', 'Nuk mund të hapet aplikacioni i mesazheve.')
    })
  }, [profile?.phone, profile?.whatsapp, displayName])

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

  // Linear ambient banner gradient colors according to theme
  const ambientBannerColors = useMemo((): [string, string, ...string[]] => {
    if (theme === 'green') {
      return ['#144237', '#0E332A', '#071C18']
    }
    if (theme === 'black') {
      return ['#1A2421', '#101615', '#000000']
    }
    // white theme
    return ['#E6F4F1', '#EDF7F5', '#F5F7FA']
  }, [theme])

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* ─── 0. DYNAMIC HIGH-CONTRAST STATUS BAR ─── */}
      <StatusBar style={theme === 'white' ? 'dark' : 'light'} />

      {/* ─── 1. FROSTED MASTER NAVIGATION BAR ─── */}
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
            <View style={styles.headerSubtitleRow}>
              {isVerified && (
                <ShieldCheck
                  size={11}
                  color={theme === 'green' ? colors.gold : colors.primary}
                  strokeWidth={2.6}
                />
              )}
              <Text style={[styles.headerSubtitleText, { color: colors.textMuted }]} numberOfLines={1}>
                {isCompany ? 'Agjenci e Verifikuar' : 'Profil Zyrtar'}
              </Text>
            </View>
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

      {/* ─── 2. MAIN SCROLLABLE CONTENT CANVAS ─── */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: 110 + resolvedBottomInset },
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
          /* ─── SKELETON LOADING STATE (Matching Linear / Stripe metrics) ─── */
          <View style={styles.skeletonWrapper}>
            {/* Banner skeleton */}
            <View style={styles.skeletonBannerWrap}>
              <SkeletonBox width="100%" height={100} borderRadius={24} />
            </View>

            {/* Profile card skeleton */}
            <View
              style={[
                styles.profileHeroCard,
                { backgroundColor: colors.surface, borderColor: specularBorder },
              ]}
            >
              <View style={styles.heroTopRow}>
                <SkeletonBox width={92} height={92} borderRadius={24} />
                <View style={styles.skeletonTextCol}>
                  <SkeletonBox width="80%" height={24} borderRadius={6} />
                  <SkeletonBox width="55%" height={16} borderRadius={6} />
                  <SkeletonBox width="45%" height={14} borderRadius={6} />
                </View>
              </View>

              {/* Stats Skeleton */}
              <View style={styles.skeletonStatsRow}>
                <SkeletonBox width="30%" height={56} borderRadius={14} />
                <SkeletonBox width="30%" height={56} borderRadius={14} />
                <SkeletonBox width="30%" height={56} borderRadius={14} />
              </View>

              {/* Action Buttons Skeleton */}
              <View style={styles.actionRow}>
                <SkeletonBox width="48%" height={52} borderRadius={16} />
                <SkeletonBox width="48%" height={52} borderRadius={16} />
              </View>
            </View>

            {/* Listings Section Skeleton */}
            <View style={styles.sectionHeaderRow}>
              <SkeletonBox width={140} height={22} borderRadius={8} />
              <SkeletonBox width={160} height={34} borderRadius={12} />
            </View>

            <View style={styles.skeletonCardsWrap}>
              <SkeletonBox width="100%" height={280} borderRadius={20} />
              <SkeletonBox width="100%" height={280} borderRadius={20} />
            </View>
          </View>
        ) : error || !profile ? (
          /* ─── ERROR / 404 NOT FOUND RECOVERY STATE ─── */
          <View
            style={[
              styles.errorCard,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
          >
            <View
              style={[
                styles.errorIconCircle,
                {
                  backgroundColor:
                    theme === 'green' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                },
              ]}
            >
              <AlertCircle
                size={38}
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
        ) : (
          /* ─── MASTER PUBLIC PROFILE CONTENT ─── */
          <>
            {/* ─── 3. AMBIENT BRAND COVER BANNER ─── */}
            <View style={styles.bannerContainer}>
              <LinearGradient
                colors={ambientBannerColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.ambientBanner,
                  { borderColor: specularBorder },
                ]}
              >
                <View style={styles.bannerDecorRow}>
                  <View
                    style={[
                      styles.bannerCapsule,
                      {
                        backgroundColor:
                          theme === 'green'
                            ? 'rgba(212, 175, 55, 0.2)'
                            : theme === 'black'
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 103, 91, 0.1)',
                      },
                    ]}
                  >
                    <Sparkles
                      size={12}
                      color={theme === 'green' ? colors.gold : colors.primary}
                      strokeWidth={2.4}
                    />
                    <Text
                      style={[
                        styles.bannerCapsuleText,
                        { color: theme === 'green' ? colors.gold : colors.primary },
                      ]}
                    >
                      {isCompany ? 'Agjenci e Partnerizuar' : 'Profil Zyrtar'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* ─── 4. ELEVATED IDENTITY CARD ─── */}
            <View
              style={[
                styles.profileHeroCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: specularBorder,
                  shadowColor: theme === 'black' ? '#000' : colors.primaryDark,
                },
              ]}
            >
              {/* Top Row: Avatar & Identity details */}
              <View style={styles.heroTopRow}>
                {/* Avatar / Brand Logo with Verification Seal */}
                <View
                  style={[
                    styles.avatarWrapper,
                    {
                      borderColor: colors.surface,
                      borderRadius: isCompany ? 24 : 46,
                      backgroundColor: colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Image
                    source={getAvatarSource(profile.avatar_url)}
                    style={[
                      styles.avatarImg,
                      { borderRadius: isCompany ? 22 : 44 },
                    ]}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    priority="high"
                  />

                  {isVerified && (
                    <View
                      style={[
                        styles.verifiedAvatarBadge,
                        {
                          backgroundColor: theme === 'green' ? colors.gold : '#10B981',
                          borderColor: colors.surface,
                        },
                      ]}
                    >
                      <CheckCircle2 size={13} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </View>

                {/* Text Identity Block */}
                <View style={styles.identityDetails}>
                  <Text
                    style={[styles.officialName, { color: colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {displayName}
                  </Text>

                  {/* Badges Row */}
                  <View style={styles.badgesRow}>
                    <View
                      style={[
                        styles.roleBadge,
                        {
                          backgroundColor:
                            theme === 'green'
                              ? 'rgba(212, 175, 55, 0.16)'
                              : colors.primaryLight,
                          borderColor:
                            theme === 'green'
                              ? 'rgba(212, 175, 55, 0.32)'
                              : colors.borderSubtle,
                        },
                      ]}
                    >
                      {isCompany ? (
                        <Building2
                          size={12}
                          color={theme === 'green' ? colors.gold : colors.primary}
                          strokeWidth={2.4}
                        />
                      ) : (
                        <User size={12} color={colors.primary} strokeWidth={2.4} />
                      )}
                      <Text
                        style={[
                          styles.roleBadgeText,
                          { color: theme === 'green' ? colors.gold : colors.primary },
                        ]}
                      >
                        {roleLabel}
                      </Text>
                    </View>

                    {isVerified && (
                      <View
                        style={[
                          styles.verifiedBadge,
                          {
                            backgroundColor:
                              theme === 'green'
                                ? 'rgba(212, 175, 55, 0.14)'
                                : 'rgba(16, 185, 129, 0.12)',
                            borderColor:
                              theme === 'green'
                                ? 'rgba(212, 175, 55, 0.28)'
                                : 'rgba(16, 185, 129, 0.26)',
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
                            styles.verifiedBadgeText,
                            { color: theme === 'green' ? colors.gold : '#10B981' },
                          ]}
                        >
                          Verifikuar
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Micro Metadata Row */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <MapPin size={12} color={colors.textMuted} strokeWidth={2.2} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        {profile.city || 'Kosovë'}
                      </Text>
                    </View>

                    <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>

                    <View style={styles.metaItem}>
                      <Calendar size={12} color={colors.textMuted} strokeWidth={2.2} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        Anëtar {memberYear}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ─── 5. LINEAR-STYLE QUICK METRICS BAR ─── */}
              <View
                style={[
                  styles.metricsBar,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: specularBorder,
                  },
                ]}
              >
                <Pressable
                  style={styles.metricCol}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync()
                    setActiveFilter('all')
                  }}
                >
                  <Text style={[styles.metricVal, { color: colors.textPrimary }]}>
                    {listings.length}
                  </Text>
                  <Text style={[styles.metricLbl, { color: colors.textMuted }]}>
                    TË GJITHA
                  </Text>
                </Pressable>

                <View style={[styles.metricDivider, { backgroundColor: specularBorder }]} />

                <Pressable
                  style={styles.metricCol}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync()
                    setActiveFilter('shitje')
                  }}
                >
                  <Text
                    style={[
                      styles.metricVal,
                      { color: theme === 'green' ? colors.gold : colors.primary },
                    ]}
                  >
                    {countSales}
                  </Text>
                  <Text style={[styles.metricLbl, { color: colors.textMuted }]}>
                    NË SHITJE
                  </Text>
                </Pressable>

                <View style={[styles.metricDivider, { backgroundColor: specularBorder }]} />

                <Pressable
                  style={styles.metricCol}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync()
                    setActiveFilter('qira')
                  }}
                >
                  <Text style={[styles.metricVal, { color: colors.textPrimary }]}>
                    {countRentals}
                  </Text>
                  <Text style={[styles.metricLbl, { color: colors.textMuted }]}>
                    ME QIRA
                  </Text>
                </Pressable>
              </View>

              {/* ─── 6. ABOUT / BIO SECTION ─── */}
              {(profile.company_description || profile.bio) && (
                <View
                  style={[
                    styles.bioCard,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: specularBorder,
                    },
                  ]}
                >
                  <View style={styles.bioHeaderRow}>
                    <Info
                      size={13}
                      color={theme === 'green' ? colors.gold : colors.primary}
                      strokeWidth={2.4}
                    />
                    <Text
                      style={[
                        styles.bioHeaderTitle,
                        { color: theme === 'green' ? colors.gold : colors.primary },
                      ]}
                    >
                      {isCompany ? 'Rreth Agjencisë' : 'Rreth Përdoruesit'}
                    </Text>
                  </View>
                  <Text style={[styles.bioText, { color: colors.textSecondary }]}>
                    {profile.company_description || profile.bio}
                  </Text>
                </View>
              )}

              {/* ─── 7. HIGH-CONVERSION CONTACT BUTTONS ─── */}
              <View style={styles.contactActionsContainer}>
                <View style={styles.actionRow}>
                  {/* Phone Call Action Button */}
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
                      <Text style={styles.actionBtnTitle}>Telefono</Text>
                      <Text style={styles.actionBtnSubtitle} numberOfLines={1}>
                        {profile.phone
                          ? formatPhoneDisplay(profile.phone)
                          : 'Numri mungon'}
                      </Text>
                    </View>
                  </Pressable>

                  {/* WhatsApp Action Button */}
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
                      <Text style={styles.actionBtnTitle}>WhatsApp</Text>
                      <Text style={styles.actionBtnSubtitle}>Bisedo direkt</Text>
                    </View>
                  </Pressable>
                </View>

                {/* Auxiliary Row: SMS & Native Share */}
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
                      <MessageSquare size={15} color={colors.textPrimary} strokeWidth={2} />
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
                      <Share2 size={15} color={colors.textPrimary} strokeWidth={2} />
                      <Text style={[styles.auxBtnText, { color: colors.textPrimary }]}>
                        Shpërndaj
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>

            {/* ─── 8. ACTIVE LISTINGS GALLERY SECTION ─── */}
            <View style={styles.listingsSection}>
              {/* Section Header with Segmented Filter */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWrap}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                    Pronat e Publikuara
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

                {/* Filter Segments (All, Shitje, Qira) */}
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

              {/* Listings Cards or Empty State */}
              {filteredListings.length === 0 ? (
                /* Master Empty State Card */
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
                            ? 'rgba(212, 175, 55, 0.14)'
                            : colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Home
                      size={32}
                      color={theme === 'green' ? colors.gold : colors.textMuted}
                      strokeWidth={1.8}
                    />
                  </View>
                  <Text style={[styles.emptyListingsTitle, { color: colors.textPrimary }]}>
                    Nuk ka shpallje aktive
                  </Text>
                  <Text style={[styles.emptyListingsSubtitle, { color: colors.textMuted }]}>
                    {listings.length === 0
                      ? 'Ky përdorues nuk ka asnjë pronë aktive në shitje apo me qira për momentin.'
                      : 'Nuk ka prona që përputhen me filtrin e përzgjedhur.'}
                  </Text>

                  {listings.length > 0 ? (
                    <Pressable
                      style={[
                        styles.emptyActionBtn,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: specularBorder,
                        },
                      ]}
                      onPress={() => setActiveFilter('all')}
                    >
                      <Text style={[styles.emptyActionBtnText, { color: colors.textPrimary }]}>
                        Shfaq të gjitha ({listings.length})
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[
                        styles.emptyActionBtn,
                        {
                          backgroundColor: colors.primary,
                        },
                      ]}
                      onPress={() => router.push('/(tabs)/listings' as any)}
                    >
                      <Text style={[styles.emptyActionBtnText, { color: '#FFFFFF' }]}>
                        Eksploro të gjitha pronat
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                /* Listings Grid */
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

  // ─── Master Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    zIndex: 10,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  navBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  headerTitleCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  headerTitleText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  headerSubtitleText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: -0.1,
  },

  // ─── Scroll Container ───
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },

  // ─── Ambient Banner ───
  bannerContainer: {
    marginBottom: -42,
    zIndex: 1,
  },
  ambientBanner: {
    height: 110,
    borderRadius: 24,
    borderWidth: 0.5,
    padding: 14,
    justifyContent: 'flex-start',
  },
  bannerDecorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bannerCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  bannerCapsuleText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },

  // ─── Elevated Hero Identity Card ───
  profileHeroCard: {
    padding: 20,
    borderRadius: 26,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    gap: 18,
    zIndex: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatarWrapper: {
    width: 92,
    height: 92,
    borderWidth: 3,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  verifiedAvatarBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  identityDetails: {
    flex: 1,
    gap: 7,
  },
  officialName: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.5,
    lineHeight: 27,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
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

  // ─── Linear Metrics Bar ───
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 0.5,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricVal: {
    fontSize: 19,
    fontFamily: Fonts.bold,
    letterSpacing: -0.4,
  },
  metricLbl: {
    fontSize: 9.5,
    fontFamily: Fonts.bold,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  metricDivider: {
    width: 0.5,
    height: 28,
  },

  // ─── Bio Card ───
  bioCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 0.5,
    gap: 6,
  },
  bioHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bioHeaderTitle: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    letterSpacing: -0.1,
  },
  bioText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 20,
  },

  // ─── High-Conversion Contact Buttons ───
  contactActionsContainer: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
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
    fontSize: 13.5,
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
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 0.5,
  },
  auxBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.1,
  },

  // ─── Listings Showcase Section ───
  listingsSection: {
    gap: 14,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    flexWrap: 'wrap',
    gap: 10,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeading: {
    fontSize: 19,
    fontFamily: Fonts.bold,
    letterSpacing: -0.4,
  },
  countPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countPillText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  filterSegmentWrap: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 3,
    gap: 2,
  },
  filterSegmentBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
  },
  filterSegmentActive: {
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  filterSegmentText: {
    fontSize: 11.5,
  },
  listingsGrid: {
    gap: 16,
  },
  emptyListingsCard: {
    padding: 36,
    borderRadius: 22,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyListingsTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  emptyListingsSubtitle: {
    fontSize: 13.5,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 19,
  },
  emptyActionBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'transparent',
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },

  // ─── Skeleton Loading ───
  skeletonWrapper: {
    gap: 16,
  },
  skeletonBannerWrap: {
    marginBottom: -42,
  },
  skeletonTextCol: {
    flex: 1,
    gap: 8,
  },
  skeletonStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonCardsWrap: {
    gap: 16,
  },

  // ─── Error State ───
  errorCard: {
    padding: 36,
    borderRadius: 26,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 36,
  },
  errorIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 19,
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  errorSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
  errorBtn: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 16,
  },
  errorBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
})
