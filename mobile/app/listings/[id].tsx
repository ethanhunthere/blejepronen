import React, { useState, useEffect, useRef } from 'react'
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
  Dimensions,
  Alert,
  Share,
  useWindowDimensions,
} from 'react-native'
import { BlurView } from 'expo-blur'
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
  Calculator,
  Check,
  Plus,
  Minus,
  ChevronRight,
  Share2,
  Compass,
  Send,
  Sparkles,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase, Listing } from '@/lib/supabase'
import { getAvatarSource, getAvatarUri } from '@/lib/avatars'
import { fetchFavoriteIds, persistFavoriteToggle } from '@/lib/favorites'
import { ListingDetailSkeleton } from '@/components/ListingSkeleton'
import { safeBack } from '@/lib/navigation'
import { getCachedListingById } from '@/lib/listings-cache'
import { getSyncAuthUser } from '@/lib/auth-cache'
import { FavoriteButton } from '@/components/FavoriteButton'
import { TactilePressable } from '@/components/motion'

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors, theme } = useTheme()
  const { width: windowWidth } = useWindowDimensions()

  const insets = useSafeAreaInsets()
  const cachedListing = id ? getCachedListingById(id) : null
  const [currentUser, setCurrentUser] = useState<any>(() => getSyncAuthUser())
  const [listing, setListing] = useState<Listing | null>(() => cachedListing)
  const [loading, setLoading] = useState(() => !cachedListing)
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [startingChat, setStartingChat] = useState(false)

  // Mortgage Calculator State
  const [downPaymentPercent, setDownPaymentPercent] = useState(20)
  const [interestRate, setInterestRate] = useState(4.5)
  const [loanYears, setLoanYears] = useState(20)

  useEffect(() => {
    let isMounted = true

    async function fetchDetails() {
      if (!id) return
      try {
        if (!cachedListing) {
          setLoading(true)
        }

        // Concurrently fetch auth user, listing details, and favorites in parallel (single network waterfall)
        const [authRes, listingRes, favs] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from('listings')
            .select('*, profiles:user_id(id, first_name, last_name, phone, avatar_url)')
            .eq('id', id)
            .single(),
          fetchFavoriteIds(),
        ])

        if (!isMounted) return

        setCurrentUser(authRes.data?.user || null)

        let loadedListing: any = listingRes.data

        // Resilient fallback: if the profiles join failed, load the listing row directly
        if (!loadedListing && listingRes.error) {
          console.warn('Listing profiles join notice, falling back to base listing:', listingRes.error.message)
          const { data: fallbackData } = await supabase
            .from('listings')
            .select('*')
            .eq('id', id)
            .single()
          if (fallbackData) {
            loadedListing = fallbackData
          }
        }

        if (!isMounted) return

        if (loadedListing) {
          setListing(loadedListing as Listing)
        }

        if (favs && id in favs) {
          setIsFavorite(true)
        }
      } catch (err: any) {
        console.warn('Listing catch:', err?.message || err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchDetails()

    return () => {
      isMounted = false
    }
  }, [id])

  const favPendingRef = useRef(false)

  const handleFavoriteToggle = async () => {
    if (!listing || favPendingRef.current) return

    if (!currentUser) {
      router.push({ pathname: '/modal', params: { initialTab: 'login', reason: 'favorite' } })
      return
    }

    favPendingRef.current = true
    const wasFavorite = isFavorite

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

  const handleWhatsApp = (customText?: string) => {
    const cleanPhone = sellerPhone.replace(/[^0-9]/g, '')
    const defaultText = `Përshëndetje, po ju kontaktoj nga Bleje Pronën lidhur me pronën "${listing?.title || ''}" (${formatPrice(listing?.price)}).`
    const body = customText ? `${defaultText}\n\nPyetje: ${customText}` : defaultText
    const encoded = encodeURIComponent(body)
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encoded}`)
  }

  const handleChat = async (initialQuery?: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (!currentUser) {
      router.push({ pathname: '/modal', params: { initialTab: 'login', reason: 'chat' } })
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
      console.warn('Chat err:', err)
    } finally {
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
      const message = `${listing.title}\n💰 ${formatPrice(listing.price)}${m2Text}\n📍 ${locText}\n\nShiko detajet në Bleje Pronën:\n${shareUrl}`

      await Share.share({
        title: listing.title,
        message,
        url: shareUrl,
      })
    } catch (err) {
      console.warn('Share error:', err)
    }
  }

  const handleOpenMaps = () => {
    if (!listing) return
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync()
    }
    const query = encodeURIComponent(
      [listing.address, listing.neighborhood, listing.city, 'Kosovo']
        .filter(Boolean)
        .join(', ')
    )
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://maps.google.com/?q=${query}`,
    })
    Linking.openURL(url!).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${query}`)
    })
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

  const imagesList =
    listing.images && listing.images.length > 0
      ? listing.images
      : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80']

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Floating Top Nav Bar */}
      <View style={[styles.floatingNavSafeArea, { paddingTop: insets.top }]}>
        <View style={styles.floatingNav}>
          <TactilePressable
            style={styles.navIconBtn}
            onPress={() => safeBack(router, '/(tabs)/listings')}
            hitSlop={8}
            activeScale={0.92}
            haptic="light"
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 70 : 100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
          </TactilePressable>

          <View style={styles.navRight}>
            <TactilePressable
              style={styles.navIconBtn}
              onPress={handleShare}
              hitSlop={8}
              activeScale={0.92}
              haptic="light"
            >
              <BlurView
                intensity={Platform.OS === 'ios' ? 70 : 100}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
              <Share2 size={18} color="#FFFFFF" strokeWidth={2.2} />
            </TactilePressable>

            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={handleFavoriteToggle}
              canToggle={() => !!currentUser}
              size={42}
              iconSize={20}
              variant="dark"
            />
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Fullwidth Image Slider */}
        <View style={[styles.galleryContainer, { width: windowWidth }]}>
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
            onMomentumScrollEnd={(e) => {
              const slide = Math.min(
                imagesList.length - 1,
                Math.max(0, Math.round(e.nativeEvent.contentOffset.x / windowWidth))
              )
              if (slide !== activeImageIdx) setActiveImageIdx(slide)
            }}
            renderItem={({ item: img, index: i }) => (
              <Image
                source={{ uri: img }}
                recyclingKey={`gallery-${i}`}
                style={[styles.galleryImage, { width: windowWidth, backgroundColor: colors.surfaceSubtle }]}
                contentFit="cover"
                priority={i === 0 ? 'high' : 'normal'}
                cachePolicy="memory-disk"
                transition={150}
              />
            )}
          />

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
                { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
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
              <View style={styles.priceWithPeriod}>
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

              {listing.type === 'shitje' && listing.price && listing.area_m2 && listing.area_m2 > 0 ? (
                <View
                  style={[
                    styles.pricePerM2Badge,
                    {
                      backgroundColor:
                        theme === 'white'
                          ? 'rgba(0, 103, 91, 0.08)'
                          : theme === 'green'
                          ? 'rgba(212, 175, 55, 0.16)'
                          : 'rgba(52, 211, 153, 0.12)',
                      borderColor:
                        theme === 'white'
                          ? 'rgba(0, 103, 91, 0.2)'
                          : theme === 'green'
                          ? 'rgba(212, 175, 55, 0.35)'
                          : 'rgba(52, 211, 153, 0.3)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pricePerM2Text,
                      {
                        color:
                          theme === 'green'
                            ? colors.gold
                            : theme === 'black'
                            ? '#34D399'
                            : colors.primary,
                      },
                    ]}
                  >
                    ≈ {new Intl.NumberFormat('de-DE').format(Math.round(listing.price / listing.area_m2))} €/m²
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.titleText, { color: colors.textPrimary }]}>{listing.title}</Text>

            <View style={styles.locationContainer}>
              <View style={styles.locationRow}>
                <MapPin size={16} color={colors.primary} strokeWidth={2.2} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                  {listing.neighborhood ? `${listing.neighborhood}, ` : ''}
                  {listing.city}
                  {listing.address ? ` • ${listing.address}` : ''}
                </Text>
              </View>
              <TactilePressable
                style={[
                  styles.openMapsBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleOpenMaps}
                activeScale={0.95}
                haptic="selection"
                hitSlop={6}
              >
                <Compass size={13} color={colors.primary} strokeWidth={2.2} />
                <Text style={[styles.openMapsBtnText, { color: colors.primary }]}>Harta</Text>
              </TactilePressable>
            </View>
          </View>

          {/* Quick 1-Tap Inquiry Row */}
          {currentUser?.id !== listing.user_id && (
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.quickInquiryHeader}>
                <Sparkles size={16} color={theme === 'green' ? colors.gold : colors.primary} strokeWidth={2.2} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                  Pyetje të shpejta për pronarin
                </Text>
              </View>
              <Text style={[styles.quickInquirySub, { color: colors.textMuted }]}>
                Zgjidhni një pyetje për të hapur bisedën me 1 prekje:
              </Text>
              <View style={styles.quickChipsWrap}>
                {[
                  'A është prona ende e lirë?',
                  'Dua të caktoj një vizitë',
                  'A ka fletë poseduese?',
                  'A ka fleksibilitet në çmim?',
                ].map((msg, i) => (
                  <TactilePressable
                    key={i}
                    style={[
                      styles.quickChip,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                    onPress={() => handleChat(msg)}
                    activeScale={0.96}
                    haptic="light"
                  >
                    <Text style={[styles.quickChipText, { color: colors.textPrimary }]}>
                      {msg}
                    </Text>
                    <Send size={11} color={colors.primary} strokeWidth={2} />
                  </TactilePressable>
                ))}
              </View>
            </View>
          )}

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

          {/* Seller / Agent Card with direct navigation to public profile */}
          <Pressable
            style={({ pressed }) => [
              styles.sellerCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
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
            hitSlop={6}
          >
            <View style={[styles.sellerAvatar, { backgroundColor: colors.primaryLight }]}>
              {seller?.avatar_url ? (
                <Image
                  source={getAvatarSource(seller.avatar_url)}
                  style={[styles.sellerAvatarImg, { backgroundColor: colors.surfaceSubtle }]}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  priority="high"
                  transition={0}
                />
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
                  Shiko profilin & të gjitha pronat
                </Text>
              </View>
              {seller?.phone && (
                <Text style={[styles.sellerPhoneText, { color: colors.textSecondary }]}>
                  {seller.phone}
                </Text>
              )}
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>

          <View style={{ height: 110 }} />
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar with Native iOS Frosted Glass */}
      <View
        style={[
          styles.bottomBarWrapper,
          {
            borderTopColor: colors.tabBarBorder,
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
                  ? 'rgba(255, 255, 255, 0.72)'
                  : theme === 'green'
                  ? 'rgba(7, 28, 24, 0.78)'
                  : 'rgba(12, 17, 16, 0.75)',
            },
          ]}
        />
        <View
          style={[styles.bottomBarSafeArea, { paddingBottom: Math.max(insets.bottom, 12) }]}
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
              <TactilePressable
                activeScale={0.97}
                haptic="medium"
                style={[
                  styles.chatActionBtn,
                  {
                    backgroundColor: theme === 'green' ? colors.gold : colors.primary,
                  },
                ]}
                onPress={() => handleChat()}
                disabled={startingChat}
                hitSlop={8}
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
                        styles.chatActionBtnText,
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

              {/* 2. WhatsApp Button */}
              <TactilePressable
                activeScale={0.97}
                haptic="medium"
                style={styles.whatsAppBtn}
                onPress={() => handleWhatsApp()}
                hitSlop={8}
              >
                <MessageCircle size={17} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.whatsAppBtnText} numberOfLines={1} adjustsFontSizeToFit>
                  WhatsApp
                </Text>
              </TactilePressable>

              {/* 3. Phone Call Button */}
              <TactilePressable
                activeScale={0.97}
                haptic="medium"
                style={[
                  styles.callBtn,
                  {
                    backgroundColor:
                      theme === 'white'
                        ? 'rgba(15, 23, 42, 0.04)'
                        : theme === 'green'
                        ? 'rgba(212, 175, 55, 0.12)'
                        : 'rgba(255, 255, 255, 0.08)',
                    borderColor:
                      theme === 'white'
                        ? 'rgba(15, 23, 42, 0.08)'
                        : theme === 'green'
                        ? 'rgba(212, 175, 55, 0.25)'
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
              </TactilePressable>
            </View>
          )}
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 18,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  headerBlock: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    gap: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  priceWithPeriod: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pricePerM2Badge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  pricePerM2Text: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
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
    fontSize: 19,
    fontFamily: Fonts.extraBold,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    flex: 1,
  },
  openMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  openMapsBtnText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  quickInquiryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  quickInquirySub: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: -4,
  },
  quickChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 0.5,
  },
  quickChipText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  specsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  specBox: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    gap: 5,
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
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16.5,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  descText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
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
    padding: 16,
    borderRadius: 16,
    gap: 6,
  },
  calcResultLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  calcResultValue: {
    fontSize: 24,
    fontFamily: Fonts.black,
    letterSpacing: -0.5,
  },
  calcResultNote: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  calcControlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
    marginTop: 2,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
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
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
  },
  sellerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sellerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  sellerAvatarInitials: {
    fontSize: 19,
    fontFamily: Fonts.extraBold,
  },
  sellerInfo: {
    flex: 1,
    gap: 3,
  },
  sellerName: {
    fontSize: 15.5,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  chatActionBtn: {
    flex: 1.1,
    paddingVertical: 14,
    borderRadius: 16,
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
    fontSize: 14.5,
    fontFamily: Fonts.bold,
  },
  whatsAppBtn: {
    flex: 1.1,
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 16,
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
    fontSize: 14.5,
    fontFamily: Fonts.bold,
  },
  callBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callBtnText: {
    fontSize: 14.5,
    fontFamily: Fonts.bold,
  },
})
