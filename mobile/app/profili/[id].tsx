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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'
import {
  ArrowLeft,
  Phone,
  MessageCircle,
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

  // Fetch public profile and associated active listings concurrently
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

  // Favorite toggle handling
  const handleToggleFavorite = useCallback(async (listingId: string) => {
    const wasFav = Boolean(favorites[listingId])
    const newFav = !wasFav

    // Optimistic UI update
    setFavorites((prev) => ({ ...prev, [listingId]: newFav }))

    try {
      await persistFavoriteToggle(listingId, wasFav)
    } catch {
      // Rollback on network failure
      setFavorites((prev) => ({ ...prev, [listingId]: wasFav }))
    }
  }, [favorites])

  // Profile classification
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
    return isCompany ? 'Agjenci Imobiliare' : 'Pronar i Pronës / Përdorues'
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

  // Quick Action Handlers
  const handleCall = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    const rawPhone = profile?.phone
    if (!rawPhone) {
      Alert.alert('Nuk ka numër telefoni', 'Ky përdorues nuk ka vendosur një numër kontakti.')
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
      // Ignored
    }
  }, [displayName, profileId])

  // Filtered listings
  const filteredListings = useMemo(() => {
    if (activeFilter === 'all') return listings
    return listings.filter((l) => l.type === activeFilter)
  }, [listings, activeFilter])

  const countSales = useMemo(() => listings.filter((l) => l.type === 'shitje').length, [listings])
  const countRentals = useMemo(() => listings.filter((l) => l.type === 'qira').length, [listings])

  // Specular borders and background accents
  const specularBorder = colors.border
  const resolvedBottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 24 : 16)

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ─── 1. TOP HEADER NAVIGATION BAR ─── */}
      <View style={[styles.header, { borderBottomColor: specularBorder, backgroundColor: colors.surface }]}>
        <Pressable
          style={({ pressed }) => [
            styles.navBtn,
            { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
            pressed && styles.navBtnPressed,
          ]}
          onPress={() => safeBack(router, '/(tabs)')}
          hitSlop={10}
        >
          <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {loading ? 'Profili' : displayName}
          </Text>
          {!loading && isCompany && (
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
              Agjenci e Certifikuar
            </Text>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.navBtn,
            { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
            pressed && styles.navBtnPressed,
          ]}
          onPress={handleShare}
          hitSlop={10}
        >
          <Share2 size={18} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* ─── 2. MAIN SCROLLABLE CONTENT ─── */}
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
          /* ─── SKELETON LOADING STATE ─── */
          <View style={styles.skeletonWrapper}>
            <View
              style={[
                styles.profileHeroCard,
                { backgroundColor: colors.surface, borderColor: specularBorder },
              ]}
            >
              <View style={styles.heroTopRow}>
                <SkeletonBox width={84} height={84} borderRadius={24} />
                <View style={styles.skeletonTextCol}>
                  <SkeletonBox width="70%" height={22} borderRadius={6} />
                  <SkeletonBox width="50%" height={14} borderRadius={6} />
                  <SkeletonBox width="40%" height={12} borderRadius={6} />
                </View>
              </View>
              <View style={styles.actionRow}>
                <SkeletonBox width="48%" height={46} borderRadius={14} />
                <SkeletonBox width="48%" height={46} borderRadius={14} />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <SkeletonBox width={140} height={20} borderRadius={6} />
            </View>

            <View style={styles.skeletonCardsWrap}>
              <SkeletonBox width="100%" height={260} borderRadius={20} />
              <SkeletonBox width="100%" height={260} borderRadius={20} />
            </View>
          </View>
        ) : error || !profile ? (
          /* ─── NOT FOUND / ERROR STATE ─── */
          <View
            style={[
              styles.errorCard,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
          >
            <View style={[styles.errorIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <AlertCircle size={36} color="#EF4444" strokeWidth={2} />
            </View>
            <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
              Profili nuk u gjet
            </Text>
            <Text style={[styles.errorSubtitle, { color: colors.textMuted }]}>
              {error || 'Ky profil nuk ekziston ose mund të jetë çaktivizuar.'}
            </Text>
            <Pressable
              style={[styles.errorBtn, { backgroundColor: colors.primary }]}
              onPress={() => safeBack(router, '/(tabs)')}
            >
              <Text style={styles.errorBtnText}>Kthehu prapa</Text>
            </Pressable>
          </View>
        ) : (
          /* ─── FULL PUBLIC PROFILE CONTENT ─── */
          <>
            {/* ─── 3. HERO IDENTITY CARD ─── */}
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
              <View style={styles.heroTopRow}>
                {/* Avatar / Brand Logo */}
                <View
                  style={[
                    styles.avatarContainer,
                    {
                      borderColor: theme === 'green' ? 'rgba(200, 184, 130, 0.4)' : colors.border,
                      borderRadius: isCompany ? 20 : 42,
                    },
                  ]}
                >
                  <Image
                    source={getAvatarSource(profile.avatar_url)}
                    style={[styles.avatarImg, { borderRadius: isCompany ? 19 : 41 }]}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    priority="high"
                  />
                  {isVerified && (
                    <View
                      style={[
                        styles.avatarVerifiedBadge,
                        {
                          backgroundColor: theme === 'green' ? colors.gold : colors.primary,
                          borderColor: colors.surface,
                        },
                      ]}
                    >
                      <CheckCircle2 size={13} color="#FFFFFF" strokeWidth={2.8} />
                    </View>
                  )}
                </View>

                {/* Identity Text Block */}
                <View style={styles.identityDetails}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[styles.officialName, { color: colors.textPrimary }]}
                      numberOfLines={2}
                    >
                      {displayName}
                    </Text>
                  </View>

                  {/* Role & Verification Badge Row */}
                  <View style={styles.badgesRow}>
                    <View
                      style={[
                        styles.roleBadge,
                        {
                          backgroundColor:
                            theme === 'green'
                              ? 'rgba(200, 184, 130, 0.16)'
                              : colors.primaryLight,
                          borderColor:
                            theme === 'green'
                              ? 'rgba(200, 184, 130, 0.3)'
                              : colors.borderSubtle,
                        },
                      ]}
                    >
                      {isCompany ? (
                        <Building2
                          size={12}
                          color={theme === 'green' ? colors.gold : colors.primary}
                          strokeWidth={2.2}
                        />
                      ) : (
                        <User size={12} color={colors.primary} strokeWidth={2.2} />
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
                                ? 'rgba(200, 184, 130, 0.14)'
                                : 'rgba(16, 185, 129, 0.12)',
                            borderColor:
                              theme === 'green'
                                ? 'rgba(200, 184, 130, 0.28)'
                                : 'rgba(16, 185, 129, 0.24)',
                          },
                        ]}
                      >
                        <ShieldCheck
                          size={12}
                          color={theme === 'green' ? colors.gold : '#10B981'}
                          strokeWidth={2.4}
                        />
                        <Text
                          style={[
                            styles.verifiedBadgeText,
                            { color: theme === 'green' ? colors.gold : '#10B981' },
                          ]}
                        >
                          {isCompany ? 'Agjenci e Verifikuar' : 'I Verifikuar'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Metadata Row: Location & Join Date */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <MapPin size={12} color={colors.textMuted} strokeWidth={2} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        {profile.city || 'Kosovë'}
                      </Text>
                    </View>

                    <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>

                    <View style={styles.metaItem}>
                      <Calendar size={12} color={colors.textMuted} strokeWidth={2} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        Anëtar që nga {memberYear}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Bio / Description (if provided) */}
              {(profile.company_description || profile.bio) && (
                <View
                  style={[
                    styles.bioBox,
                    { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                  ]}
                >
                  <Text style={[styles.bioText, { color: colors.textSecondary }]}>
                    {profile.company_description || profile.bio}
                  </Text>
                </View>
              )}

              {/* ─── 4. QUICK ACTION BUTTONS (Phone & WhatsApp) ─── */}
              <View style={styles.actionRow}>
                {/* Call Phone Button */}
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
                    {profile.phone ? (
                      <Text style={styles.actionBtnSubtitle} numberOfLines={1}>
                        {formatPhoneDisplay(profile.phone)}
                      </Text>
                    ) : (
                      <Text style={styles.actionBtnSubtitle}>Nuk ka numër</Text>
                    )}
                  </View>
                </Pressable>

                {/* WhatsApp Chat Button */}
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
            </View>

            {/* ─── 5. ACTIVE LISTINGS SECTION ─── */}
            <View style={styles.listingsSection}>
              {/* Section Header with Pill Count */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWrap}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                    Pronat Aktive
                  </Text>
                  <View
                    style={[
                      styles.countPill,
                      {
                        backgroundColor:
                          theme === 'green'
                            ? 'rgba(200, 184, 130, 0.18)'
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

                {/* Filter Pills (Shitje / Qira) if user has multiple types */}
                {listings.length > 0 && countSales > 0 && countRentals > 0 && (
                  <View
                    style={[
                      styles.filterSegmentWrap,
                      { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                    ]}
                  >
                    <Pressable
                      style={[
                        styles.filterSegmentBtn,
                        activeFilter === 'all' && [
                          styles.filterSegmentActive,
                          { backgroundColor: colors.surface },
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

                    <Pressable
                      style={[
                        styles.filterSegmentBtn,
                        activeFilter === 'shitje' && [
                          styles.filterSegmentActive,
                          { backgroundColor: colors.surface },
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

                    <Pressable
                      style={[
                        styles.filterSegmentBtn,
                        activeFilter === 'qira' && [
                          styles.filterSegmentActive,
                          { backgroundColor: colors.surface },
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
                  </View>
                )}
              </View>

              {/* Listings List */}
              {filteredListings.length === 0 ? (
                /* Empty Listings State */
                <View
                  style={[
                    styles.emptyListingsCard,
                    { backgroundColor: colors.surface, borderColor: specularBorder },
                  ]}
                >
                  <View
                    style={[
                      styles.emptyIconCircle,
                      {
                        backgroundColor:
                          theme === 'green'
                            ? 'rgba(200, 184, 130, 0.14)'
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
                    Nuk ka shpallje aktive
                  </Text>
                  <Text style={[styles.emptyListingsSubtitle, { color: colors.textMuted }]}>
                    {listings.length === 0
                      ? 'Ky përdorues nuk ka asnjë pronë aktive në shitje apo me qira për momentin.'
                      : 'Nuk ka prona që përputhen me filtrin e zgjedhur.'}
                  </Text>
                </View>
              ) : (
                /* Listing Cards Grid */
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
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
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
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    marginTop: 1,
  },
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

  // ─── Hero Identity Card ───
  profileHeroCard: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    width: 84,
    height: 84,
    borderWidth: 1.5,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarVerifiedBadge: {
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  officialName: {
    fontSize: 21,
    fontFamily: Fonts.bold,
    letterSpacing: -0.4,
    lineHeight: 26,
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
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
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
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
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
    marginTop: 2,
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
  bioBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  bioText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 18,
  },

  // ─── Action Buttons ───
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
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
    fontSize: 13.5,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  actionBtnSubtitle: {
    fontSize: 10.5,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.82)',
    marginTop: 0.5,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.5,
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
    borderRadius: 12,
  },
  countPillText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  filterSegmentWrap: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 0.5,
    padding: 2,
  },
  filterSegmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  filterSegmentActive: {
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
    padding: 36,
    borderRadius: 20,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
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
    gap: 18,
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
    borderRadius: 24,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 32,
  },
  errorIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
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
