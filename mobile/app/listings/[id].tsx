import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  StatusBar,
  Linking,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Image } from 'expo-image'
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Maximize2,
  BedDouble,
  Layers,
  Phone,
  MessageCircle,
  ShieldCheck,
  Calculator,
  Check,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { BrandColors } from '@/constants/Colors'
import { supabase, Listing } from '@/lib/supabase'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

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
          console.error('Error fetching listing:', error)
        } else if (data) {
          setListing(data as Listing)
        }
      } catch (err) {
        console.error(err)
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
    Linking.openURL('https://wa.me/38349123456?text=P%C3%ABrsh%C3%ABndetje%2C%20jam%20i%20interesuar%20p%C3%ABr%20pron%C3%ABn%20tuaj%20n%C3%AB%20Bleje%20Pron%C3%ABn')
  }

  const formatPrice = (val?: number) => {
    if (!val) return '0 €'
    return new Intl.NumberFormat('de-DE').format(val) + ' €'
  }

  // Calculate monthly mortgage payment
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
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Duke ngarkuar detajet e pronës...</Text>
      </SafeAreaView>
    )
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.notFoundTitle}>Prona nuk u gjet</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Kthehu mbrapa</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const imagesList =
    listing.images && listing.images.length > 0
      ? listing.images
      : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80']

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent />

      {/* Floating Top Navigation Bar */}
      <SafeAreaView style={styles.floatingNavSafeArea}>
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
              <Image
                key={i}
                source={{ uri: img }}
                style={styles.galleryImage}
                contentFit="cover"
              />
            ))}
          </ScrollView>

          {/* Image index indicator */}
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {activeImageIdx + 1} / {imagesList.length}
            </Text>
          </View>

          {/* Type Badge */}
          <View style={styles.heroTypeBadge}>
            <Text style={styles.heroTypeBadgeText}>
              {listing.type === 'shitje' ? 'NË SHITJE' : 'ME QIRA'}
            </Text>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.body}>
          {/* Price & Location Header */}
          <View style={styles.headerBlock}>
            <View style={styles.priceRow}>
              <Text style={styles.priceText}>{formatPrice(listing.price)}</Text>
              {listing.type === 'qira' && <Text style={styles.periodText}>/muaj</Text>}
            </View>

            <Text style={styles.titleText}>{listing.title}</Text>

            <View style={styles.locationRow}>
              <MapPin size={16} color={BrandColors.primary} strokeWidth={2.2} />
              <Text style={styles.locationText}>
                {listing.neighborhood ? `${listing.neighborhood}, ` : ''}
                {listing.city}
                {listing.address ? ` • ${listing.address}` : ''}
              </Text>
            </View>
          </View>

          {/* Key Specs Grid */}
          <View style={styles.specsGrid}>
            <View style={styles.specBox}>
              <Maximize2 size={20} color={BrandColors.primary} strokeWidth={2.2} />
              <Text style={styles.specValue}>{listing.area_m2} m²</Text>
              <Text style={styles.specLabel}>Sipërfaqja</Text>
            </View>

            <View style={styles.specBox}>
              <BedDouble size={20} color={BrandColors.primary} strokeWidth={2.2} />
              <Text style={styles.specValue}>{listing.rooms || '-'}</Text>
              <Text style={styles.specLabel}>Dhomat</Text>
            </View>

            <View style={styles.specBox}>
              <Layers size={20} color={BrandColors.primary} strokeWidth={2.2} />
              <Text style={styles.specValue}>{listing.floor ? `Kati ${listing.floor}` : '-'}</Text>
              <Text style={styles.specLabel}>Kati</Text>
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Përshkrimi i pronës</Text>
            <Text style={styles.descText}>{listing.description}</Text>
          </View>

          {/* Amenities & Features */}
          {listing.features && listing.features.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Pajisjet dhe Veçoritë</Text>
              <View style={styles.featuresGrid}>
                {listing.features.map((feat, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Check size={14} color={BrandColors.primary} strokeWidth={2.6} />
                    <Text style={styles.featureItemText}>{feat}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Interactive Mortgage Calculator */}
          {listing.type === 'shitje' && (
            <View style={styles.sectionCard}>
              <View style={styles.calculatorHeader}>
                <Calculator size={18} color={BrandColors.primary} strokeWidth={2.2} />
                <Text style={styles.sectionTitle}>Kalkulatori i Kredisë</Text>
              </View>

              <View style={styles.calcResultBox}>
                <Text style={styles.calcResultLabel}>Pagesa mujore e përafërt:</Text>
                <Text style={styles.calcResultValue}>{calculateMortgage()} € / muaj</Text>
                <Text style={styles.calcResultNote}>
                  Bazuar në {downPaymentPercent}% pjesëmarrje dhe {interestRate}% normë interesi ({loanYears} vite).
                </Text>
              </View>
            </View>
          )}

          {/* Seller / Agent Card */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              <ShieldCheck size={28} color={BrandColors.primary} />
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>Pronari / Agjencia</Text>
              <Text style={styles.sellerRole}>Përdorues i verifikuar në Bleje Pronën</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <SafeAreaView style={styles.bottomBarSafeArea}>
        <View style={styles.bottomBar}>
          <Pressable style={styles.whatsAppBtn} onPress={handleWhatsApp}>
            <MessageCircle size={18} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.whatsAppBtnText}>WhatsApp</Text>
          </Pressable>

          <Pressable style={styles.callBtn} onPress={handleCall}>
            <Phone size={18} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.callBtnText}>Telefono</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F7F7',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F2F7F7',
  },
  loadingText: {
    fontSize: 13,
    color: BrandColors.textMuted,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  backBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    paddingTop: Platform.OS === 'android' ? 36 : 10,
  },
  navIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
    backgroundColor: '#1E293B',
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
    fontWeight: '700',
  },
  heroTypeBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  heroTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  body: {
    padding: 16,
    gap: 16,
  },
  headerBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BrandColors.border,
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceText: {
    fontSize: 26,
    fontWeight: '900',
    color: BrandColors.primary,
  },
  periodText: {
    fontSize: 14,
    color: BrandColors.textMuted,
    fontWeight: '600',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.textPrimary,
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
    color: BrandColors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  specsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  specBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BrandColors.border,
    gap: 4,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  specLabel: {
    fontSize: 11,
    color: BrandColors.textMuted,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BrandColors.border,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  descText: {
    fontSize: 14,
    color: BrandColors.textSecondary,
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
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  featureItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  calculatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calcResultBox: {
    backgroundColor: BrandColors.primaryLight,
    padding: 14,
    borderRadius: 14,
    gap: 4,
  },
  calcResultLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  calcResultValue: {
    fontSize: 20,
    fontWeight: '900',
    color: BrandColors.primary,
  },
  calcResultNote: {
    fontSize: 11,
    color: BrandColors.textSecondary,
  },
  sellerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BrandColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInfo: {
    flex: 1,
    gap: 2,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  sellerRole: {
    fontSize: 11,
    color: BrandColors.textMuted,
  },
  bottomBarSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: BrandColors.border,
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
    fontWeight: '800',
  },
  callBtn: {
    flex: 1,
    backgroundColor: BrandColors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
})
