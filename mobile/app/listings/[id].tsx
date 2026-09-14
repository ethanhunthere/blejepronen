import React, { useState, useEffect } from 'react'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Image } from 'expo-image'
import {
  ArrowLeft,
  Heart,
  MapPin,
  Maximize2,
  BedDouble,
  Layers,
  Phone,
  MessageCircle,
  ShieldCheck,
  Calculator,
  Check,
  Plus,
  Minus,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase, Listing } from '@/lib/supabase'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors, theme } = useTheme()

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeImageIdx, setActiveImageIdx] = useState(0)

  // Mortgage Calculator State
  const [downPaymentPercent, setDownPaymentPercent] = useState(20)
  const [interestRate, setInterestRate] = useState(4.5)
  const [loanYears, setLoanYears] = useState(20)

  useEffect(() => {
    async function fetchDetails() {
      if (!id) return
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('id', id)
          .single()

        if (error) {
          console.warn('Listing detail notice:', error.message)
        } else if (data) {
          setListing(data as Listing)
        }
      } catch (err: any) {
        console.warn('Listing catch:', err?.message || err)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [id])

  const handleFavoriteToggle = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setIsFavorite(!isFavorite)
  }

  const handleCall = () => {
    Linking.openURL('tel:+38349123456')
  }

  const handleWhatsApp = () => {
    Linking.openURL(
      'https://wa.me/38349123456?text=P%C3%ABrsh%C3%ABndetje%2C%20jam%20i%20interesuar%20p%C3%ABr%20pron%C3%ABn%20tuaj%20n%C3%AB%20Bleje%20Pron%C3%ABn'
    )
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
          <Pressable style={styles.navIconBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
          </Pressable>

          <View style={styles.navRight}>
            <Pressable style={styles.navIconBtn} onPress={handleFavoriteToggle}>
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
        <View style={styles.galleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
              setActiveImageIdx(slide)
            }}
            scrollEventThrottle={16}
          >
            {imagesList.map((img, i) => (
              <Image key={i} source={{ uri: img }} style={styles.galleryImage} contentFit="cover" />
            ))}
          </ScrollView>

          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {activeImageIdx + 1} / {imagesList.length}
            </Text>
          </View>

          <View style={[styles.heroTypeBadge, { backgroundColor: theme === 'green' ? colors.gold : '#006459' }]}>
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
                      onPress={() => setDownPaymentPercent((p) => Math.max(10, p - 5))}
                    >
                      <Minus size={12} color={colors.textPrimary} />
                    </Pressable>
                    <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{downPaymentPercent}%</Text>
                    <Pressable
                      style={[styles.stepBtn, { backgroundColor: colors.surfaceHighlight }]}
                      onPress={() => setDownPaymentPercent((p) => Math.min(50, p + 5))}
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
                      onPress={() => setLoanYears((y) => Math.max(5, y - 5))}
                    >
                      <Minus size={12} color={colors.textPrimary} />
                    </Pressable>
                    <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{loanYears} v</Text>
                    <Pressable
                      style={[styles.stepBtn, { backgroundColor: colors.surfaceHighlight }]}
                      onPress={() => setLoanYears((y) => Math.min(30, y + 5))}
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
              <ShieldCheck size={28} color={colors.primary} />
            </View>
            <View style={styles.sellerInfo}>
              <Text style={[styles.sellerName, { color: colors.textPrimary }]}>Pronari / Agjencia</Text>
              <Text style={[styles.sellerRole, { color: colors.textMuted }]}>
                Përdorues i verifikuar në Bleje Pronën
              </Text>
            </View>
          </View>

          <View style={{ height: 110 }} />
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <SafeAreaView
        style={[styles.bottomBarSafeArea, { backgroundColor: colors.surface, borderTopColor: colors.border }]}
        edges={['bottom']}
      >
        <View style={styles.bottomBar}>
          <Pressable style={styles.whatsAppBtn} onPress={handleWhatsApp}>
            <MessageCircle size={18} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.whatsAppBtnText}>WhatsApp</Text>
          </Pressable>

          <Pressable style={[styles.callBtn, { backgroundColor: colors.primary }]} onPress={handleCall}>
            <Phone size={18} color={theme === 'green' ? '#003E37' : '#FFFFFF'} strokeWidth={2.2} />
            <Text
              style={[
                styles.callBtnText,
                { color: theme === 'green' ? '#003E37' : '#FFFFFF' },
              ]}
            >
              Telefono
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
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
    width: SCREEN_WIDTH,
    height: 320,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: 320,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
  },
  sellerInfo: {
    flex: 1,
    gap: 2,
  },
  sellerName: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  sellerRole: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  bottomBarSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
  },
  whatsAppBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  whatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  callBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
})
