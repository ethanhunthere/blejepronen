import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Linking,
  Dimensions,
  Alert,
  useWindowDimensions,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { playHeartSound, playUnlikeSound } from '@/lib/sound'
import {
  ArrowLeft,
  Heart,
  MapPin,
  Maximize2,
  BedDouble,
  Layers,
  Phone,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
  Calculator,
  Check,
  Plus,
  Minus,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase, Listing } from '@/lib/supabase'
import { getAvatarUri } from '@/lib/avatars'
import { fetchFavoriteIds, persistFavoriteToggle } from '@/lib/favorites'

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors, theme } = useTheme()
  const { width: windowWidth } = useWindowDimensions()

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [startingChat, setStartingChat] = useState(false)

  // Mortgage Calculator State
  const [downPaymentPercent, setDownPaymentPercent] = useState(20)
  const [interestRate, setInterestRate] = useState(4.5)
  const [loanYears, setLoanYears] = useState(20)

  useEffect(() => {
    async function fetchDetails() {
      if (!id) return
      try {
        setLoading(true)

        const {
          data: { user },
        } = await supabase.auth.getUser()
        setCurrentUser(user || null)

        const { data, error } = await supabase
          .from('listings')
          .select('*, profiles:user_id(id, first_name, last_name, phone, avatar_url)')
          .eq('id', id)
          .single()

        if (error) {
          console.warn('Listing detail notice:', error.message)
        } else if (data) {
          setListing(data as Listing)
        }

        // Sync the heart with the user's persisted favorites
        const favs = await fetchFavoriteIds()
        if (id in favs) setIsFavorite(true)
      } catch (err: any) {
        console.warn('Listing catch:', err?.message || err)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [id])

  const favPendingRef = useRef(false)

  const handleFavoriteToggle = async () => {
    if (!listing || favPendingRef.current) return
    favPendingRef.current = true
    const wasFavorite = isFavorite
    if (wasFavorite) {
      playUnlikeSound()
    } else {
      playHeartSound()
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Optimistic update, revert if the DB write fails (offline/guest)
    setIsFavorite(!wasFavorite)
    const ok = await persistFavoriteToggle(listing.id, wasFavorite)
    if (!ok) setIsFavorite(wasFavorite)
    favPendingRef.current = false
  }

  const seller = listing?.profiles
  const sellerName = seller
    ? `${seller.first_name || ''} ${seller.last_name || ''}`.trim() || 'Pronari'
    : 'Pronari / Agjencia'
  const sellerPhone = seller?.phone || '+38349123456'

  const handleCall = () => {
    Linking.openURL(`tel:${sellerPhone}`)
  }

  const handleWhatsApp = () => {
    const cleanPhone = sellerPhone.replace(/[^0-9]/g, '')
    const text = encodeURIComponent(
      `Përshëndetje, po ju kontaktoj nga Bleje Pronën lidhur me pronën "${listing?.title || ''}" (${formatPrice(listing?.price)}).`
    )
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${text}`)
  }

  const handleChat = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (!currentUser) {
      router.push({ pathname: '/modal', params: { initialTab: 'login' } })
      return
    }

    if (currentUser.id === listing?.user_id) {
      Alert.alert('Prona Juaj', 'Kjo është prona juaj e publikuar në Bleje Pronën.')
      return
    }

    if (!listing?.id || !listing?.user_id) return

    try {
      setStartingChat(true)
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listing.id)
        .eq('buyer_id', currentUser.id)
        .maybeSingle()

      if (existing?.id) {
        router.push(`/messages/${existing.id}` as any)
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
        router.push(`/messages/${created.id}` as any)
      }
    } catch (err: any) {
      console.warn('Chat err:', err)
    } finally {
      setStartingChat(false)
    }
  }

  const formatPrice = (val?: number) => {
    if (!val) return '0 €'
    return new Intl.NumberFormat('de-DE').format(val) + ' €'
  }

  const calculateMortgage = () => {
    if (!listing?.price) return 0
    const principal = listing.price * (1 - downPaymentPercent / 100)
    const monthlyRate = interestRate / 100 / 12
    const totalMonths = loanYears * 12
    if (monthlyRate === 0) return Math.round(principal / totalMonths)
    const payment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths))) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1)
    return Math.round(payment)
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Duke ngarkuar detajet e pronës...
        </Text>
      </SafeAreaView>
    )
  }

  if (!listing) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundTitle, { color: colors.textPrimary }]}>Prona nuk u gjet</Text>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backBtnText, { color: theme === 'green' ? '#003E37' : '#FFFFFF' }]}>
            Kthehu mbrapa
          </Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const imagesList =
    listing.images && listing.images.length > 0
      ? listing.images
      : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80']

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Floating Top Nav Bar */}
      <SafeAreaView style={styles.floatingNavSafeArea} edges={['top']}>
        <View style={styles.floatingNav}>
          <Pressable style={styles.navIconBtn} onPress={() => router.back()} hitSlop={8}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 70 : 100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
          </Pressable>

          <View style={styles.navRight}>
            <Pressable style={styles.navIconBtn} onPress={handleFavoriteToggle} hitSlop={8}>
              <BlurView
                intensity={Platform.OS === 'ios' ? (isFavorite ? 85 : 70) : 100}
                tint={isFavorite ? 'light' : 'dark'}
                style={StyleSheet.absoluteFill}
              />
              <Heart
                size={20}
                color={isFavorite ? '#EF4444' : '#FFFFFF'}
                fill={isFavorite ? '#EF4444' : 'transparent'}
                strokeWidth={2.2}
              />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Fullwidth Image Slider */}
        <View style={[styles.galleryContainer, { width: windowWidth }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.min(
                imagesList.length - 1,
                Math.max(0, Math.round(e.nativeEvent.contentOffset.x / windowWidth))
              )
              if (slide !== activeImageIdx) setActiveImageIdx(slide)
            }}
            scrollEventThrottle={32}
          >
            {imagesList.map((img, i) => (
              <Image
                key={i}
                source={{ uri: img }}
                style={[styles.galleryImage, { width: windowWidth }]}
                contentFit="cover"
              />
            ))}
          </ScrollView>

          <View style={styles.imageCounter}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 65 : 100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.imageCounterText}>
              {activeImageIdx + 1} / {imagesList.length}
            </Text>
          </View>

          <View style={[styles.heroTypeBadge, { backgroundColor: theme === 'green' ? colors.gold : colors.primary }]}>
            <Text
              style={[
                styles.heroTypeBadgeText,
                { color: theme === 'green' ? '#003E37' : '#FFFFFF' },
              ]}
            >
              {listing.type === 'shitje' ? 'NË SHITJE' : 'ME QIRA'}
            </Text>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.body}>
          {/* Price & Location Header */}
          <View style={[styles.headerBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.priceRow}>
              <Text
                style={[
                  styles.priceText,
                  { color: theme === 'green' ? colors.gold : colors.primary },
                ]}
              >
                {formatPrice(listing.price)}
              </Text>
              {listing.type === 'qira' && (
                <Text style={[styles.periodText, { color: colors.textMuted }]}>/muaj</Text>
              )}
            </View>

            <Text style={[styles.titleText, { color: colors.textPrimary }]}>{listing.title}</Text>

            <View style={styles.locationRow}>
              <MapPin size={16} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                {listing.neighborhood ? `${listing.neighborhood}, ` : ''}
                {listing.city}
                {listing.address ? ` • ${listing.address}` : ''}
              </Text>
            </View>
          </View>

          {/* Key Specs Grid */}
          <View style={styles.specsGrid}>
            <View style={[styles.specBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Maximize2 size={20} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.specValue, { color: colors.textPrimary }]}>{listing.area_m2} m²</Text>
              <Text style={[styles.specLabel, { color: colors.textMuted }]}>Sipërfaqja</Text>
            </View>

            <View style={[styles.specBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <BedDouble size={20} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.specValue, { color: colors.textPrimary }]}>{listing.rooms || '-'}</Text>
              <Text style={[styles.specLabel, { color: colors.textMuted }]}>Dhomat</Text>
            </View>

            <View style={[styles.specBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Layers size={20} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.specValue, { color: colors.textPrimary }]}>
                {listing.floor ? `Kati ${listing.floor}` : '-'}
              </Text>
              <Text style={[styles.specLabel, { color: colors.textMuted }]}>Kati</Text>
            </View>
          </View>

          {/* Description Section */}
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Përshkrimi i pronës</Text>
            <Text style={[styles.descText, { color: colors.textSecondary }]}>{listing.description}</Text>
          </View>

          {/* Amenities & Features */}
          {listing.features && listing.features.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pajisjet dhe Veçoritë</Text>
              <View style={styles.featuresGrid}>
                {listing.features.map((feat, idx) => (
                  <View
                    key={idx}
                    style={[styles.featureItem, { backgroundColor: colors.surfaceSubtle }]}
                  >
                    <Check size={14} color={colors.primary} strokeWidth={2.6} />
                    <Text style={[styles.featureItemText, { color: colors.textSecondary }]}>{feat}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Interactive Mortgage Calculator */}
          {listing.type === 'shitje' && (
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.calculatorHeader}>
                <Calculator size={18} color={colors.primary} strokeWidth={2.2} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Kalkulatori i Kredisë
                </Text>
              </View>

              <View style={[styles.calcResultBox, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={[styles.calcResultLabel, { color: colors.textSecondary }]}>
                  Pagesa mujore e llogaritur:
                </Text>
                <Text style={[styles.calcResultValue, { color: colors.primary }]}>
                  {calculateMortgage()} € / muaj
                </Text>
                <Text style={[styles.calcResultNote, { color: colors.textMuted }]}>
                  Pjesëmarrja {downPaymentPercent}%, Interesi {interestRate}%, Kohëzgjatja {loanYears} vite.
                </Text>
              </View>

              {/* Controls */}
              <View style={styles.calcControlsRow}>
                <View style={styles.calcControl}>
                  <Text style={[styles.calcControlLabel, { color: colors.textMuted }]}>Pjesëmarrja</Text>
                  <View style={styles.stepperWrap}>
                    <Pressable
                      style={[styles.stepBtn, { backgroundColor: colors.surfaceHighlight }]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setDownPaymentPercent((p) => Math.max(10, p - 5))
                      }}
                      hitSlop={8}
                    >
                      <Minus size={12} color={colors.textPrimary} />
                    </Pressable>
                    <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{downPaymentPercent}%</Text>
                    <Pressable
                      style={[styles.stepBtn, { backgroundColor: colors.surfaceHighlight }]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setDownPaymentPercent((p) => Math.min(50, p + 5))
                      }}
                      hitSlop={8}
                    >
                      <Plus size={12} color={colors.textPrimary} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.calcControl}>
                  <Text style={[styles.calcControlLabel, { color: colors.textMuted }]}>Kohëzgjatja</Text>
                  <View style={styles.stepperWrap}>
                    <Pressable
                      style={[styles.stepBtn, { backgroundColor: colors.surfaceHighlight }]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setLoanYears((y) => Math.max(5, y - 5))
                      }}
                      hitSlop={8}
                    >
                      <Minus size={12} color={colors.textPrimary} />
                    </Pressable>
                    <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{loanYears} v</Text>
                    <Pressable
                      style={[styles.stepBtn, { backgroundColor: colors.surfaceHighlight }]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setLoanYears((y) => Math.min(30, y + 5))
                      }}
                      hitSlop={8}
                    >
                      <Plus size={12} color={colors.textPrimary} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Seller / Agent Card */}
          <View style={[styles.sellerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.sellerAvatar, { backgroundColor: colors.primaryLight }]}>
              {seller?.avatar_url ? (
                <Image source={{ uri: getAvatarUri(seller.avatar_url) }} style={styles.sellerAvatarImg} contentFit="cover" />
              ) : (
                <Text style={[styles.sellerAvatarInitials, { color: colors.primary }]}>
                  {(seller?.first_name?.[0] || 'P').toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.sellerInfo}>
              <Text style={[styles.sellerName, { color: colors.textPrimary }]}>{sellerName}</Text>
              <View style={styles.sellerVerifiedRow}>
                <ShieldCheck size={13} color={colors.primary} strokeWidth={2.4} />
                <Text style={[styles.sellerRole, { color: colors.textMuted }]}>
                  Përdorues i verifikuar në Bleje Pronën
                </Text>
              </View>
              {seller?.phone && (
                <Text style={[styles.sellerPhoneText, { color: colors.textSecondary }]}>
                  {seller.phone}
                </Text>
              )}
            </View>
          </View>

          <View style={{ height: 110 }} />
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar with Native iOS Frosted Glass */}
      <View
        style={[
          styles.bottomBarWrapper,
          {
            borderTopColor:
              theme === 'white'
                ? 'rgba(0, 0, 0, 0.08)'
                : 'rgba(255, 255, 255, 0.12)',
          },
        ]}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 88 : 100}
          tint={colors.blurTint}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                theme === 'white'
                  ? 'rgba(255, 255, 255, 0.65)'
                  : theme === 'green'
                  ? 'rgba(0, 60, 54, 0.70)'
                  : 'rgba(12, 17, 16, 0.75)',
            },
          ]}
        />
        <SafeAreaView
          style={styles.bottomBarSafeArea}
          edges={['bottom']}
        >
          {currentUser?.id === listing.user_id ? (
            <View style={styles.ownerNoticeBar}>
              <ShieldCheck size={18} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.ownerNoticeText, { color: colors.textPrimary }]}>
                Kjo është prona juaj e publikuar në Bleje Pronën
              </Text>
            </View>
          ) : (
            <View style={styles.bottomBar}>
              {/* 1. In-App Direct Chat */}
              <Pressable
                style={[
                  styles.chatActionBtn,
                  {
                    backgroundColor: theme === 'green' ? colors.gold : colors.primary,
                  },
                ]}
                onPress={handleChat}
                disabled={startingChat}
                hitSlop={8}
              >
                {startingChat ? (
                  <ActivityIndicator size="small" color={theme === 'green' ? '#003E37' : '#FFFFFF'} />
                ) : (
                  <>
                    <MessageSquare
                      size={17}
                      color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                      strokeWidth={2.4}
                    />
                    <Text
                      style={[
                        styles.chatActionBtnText,
                        { color: theme === 'green' ? '#003E37' : '#FFFFFF' },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      Bisedo
                    </Text>
                  </>
                )}
              </Pressable>

              {/* 2. WhatsApp Button */}
              <Pressable style={styles.whatsAppBtn} onPress={handleWhatsApp} hitSlop={8}>
                <MessageCircle size={17} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.whatsAppBtnText} numberOfLines={1} adjustsFontSizeToFit>
                  WhatsApp
                </Text>
              </Pressable>

              {/* 3. Phone Call Button */}
              <Pressable
                style={[
                  styles.callBtn,
                  {
                    backgroundColor:
                      theme === 'white'
                        ? 'rgba(0, 0, 0, 0.04)'
                        : 'rgba(255, 255, 255, 0.08)',
                    borderColor:
                      theme === 'white'
                        ? 'rgba(0, 0, 0, 0.08)'
                        : 'rgba(255, 255, 255, 0.12)',
                  },
                ]}
                onPress={handleCall}
                hitSlop={8}
              >
                <Phone size={17} color={colors.textPrimary} strokeWidth={2.2} />
                <Text
                  style={[styles.callBtnText, { color: colors.textPrimary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Telefono
                </Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </View>
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
  loadingText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  notFoundTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  backBtnText: {
    fontFamily: Fonts.bold,
  },
  floatingNavSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  floatingNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  navIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(0, 0, 0, 0.48)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRight: {
    flexDirection: 'row',
    gap: 10,
  },
  scrollView: {
    flex: 1,
  },
  galleryContainer: {
    width: '100%',
    height: 320,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  galleryImage: {
    height: 320,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(0,0,0,0.65)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  heroTypeBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  heroTypeBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.black,
  },
  body: {
    padding: 16,
    gap: 16,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  headerBlock: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceText: {
    fontSize: 26,
    fontFamily: Fonts.black,
  },
  periodText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  titleText: {
    fontSize: 18,
    fontFamily: Fonts.extraBold,
    lineHeight: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    flex: 1,
  },
  specsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  specBox: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    gap: 4,
  },
  specValue: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  specLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  descText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 22,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  featureItemText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  calculatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calcResultBox: {
    padding: 14,
    borderRadius: 14,
    gap: 4,
  },
  calcResultLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  calcResultValue: {
    fontSize: 22,
    fontFamily: Fonts.black,
  },
  calcResultNote: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  calcControlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  calcControl: {
    flex: 1,
    gap: 4,
  },
  calcControlLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    minWidth: 42,
    textAlign: 'center',
  },
  sellerCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sellerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  sellerAvatarInitials: {
    fontSize: 18,
    fontFamily: Fonts.extraBold,
  },
  sellerInfo: {
    flex: 1,
    gap: 2,
  },
  sellerName: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  sellerVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sellerRole: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  sellerPhoneText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    marginTop: 2,
  },
  bottomBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  bottomBarSafeArea: {
    backgroundColor: 'transparent',
  },
  ownerNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  ownerNoticeText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  chatActionBtn: {
    flex: 1.1,
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  chatActionBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  whatsAppBtn: {
    flex: 1.1,
    backgroundColor: '#25D366',
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  callBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
})
