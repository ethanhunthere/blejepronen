import React from 'react'
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native'
import { BlurView } from 'expo-blur'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { MapPin, BedDouble, Maximize2, Layers, Heart, Star, Camera, Building2, ShieldCheck } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { Listing } from '@/lib/supabase'

import { playHeartSound, playUnlikeSound } from '@/lib/sound'

interface ListingCardProps {
  listing: Listing
  isFavorite?: boolean
  onToggleFavorite?: (id: string) => void
}

export function ListingCard({ listing, isFavorite = false, onToggleFavorite }: ListingCardProps) {
  const router = useRouter()
  const { colors, theme } = useTheme()

  const handleFavoritePress = (e: any) => {
    e.stopPropagation?.()
    if (isFavorite) {
      playUnlikeSound()
    } else {
      playHeartSound()
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    onToggleFavorite?.(listing.id)
  }

  const formatPrice = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val) || val <= 0) {
      return 'Me marrëveshje'
    }
    return new Intl.NumberFormat('de-DE').format(val) + ' €'
  }

  const mainImage =
    listing.images && listing.images.length > 0
      ? listing.images[0]
      : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'

  const isSale = listing.type === 'shitje'
  const isRent = listing.type === 'qira'
  const photosCount = listing.images ? listing.images.length : 0

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor:
            theme === 'white'
              ? 'rgba(0, 0, 0, 0.08)'
              : theme === 'green'
              ? 'rgba(255, 255, 255, 0.12)'
              : 'rgba(255, 255, 255, 0.10)',
          shadowColor: theme === 'black' ? '#000' : '#101828',
          shadowOpacity: theme === 'black' ? 0.35 : 0.07,
        },
        pressed && styles.cardPressed,
      ]}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.selectionAsync()
        router.push(`/listings/${listing.id}` as any)
      }}
    >
      {/* 1. Cinematic Hero Image Container */}
      <View style={[styles.imageContainer, { backgroundColor: colors.surfaceSubtle }]}>
        <Image
          source={{ uri: mainImage }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />

        {/* Top Floating Glass Badges */}
        <View style={styles.topOverlayRow}>
          {/* Status Badge: Genuine Frosted Glass Capsule */}
          <View style={styles.statusCapsule}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 70 : 100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.statusCapsuleText}>
              {isSale ? 'Në Shitje' : 'Me Qira'}
            </Text>
          </View>

          {/* Featured Gold Badge with authentic Star icon */}
          {listing.is_featured && (
            <View style={[styles.featuredCapsule, { backgroundColor: colors.gold }]}>
              <Star size={11} color="#003E37" fill="#003E37" strokeWidth={2} />
              <Text style={styles.featuredCapsuleText}>E Veçuar</Text>
            </View>
          )}

          <View style={{ flex: 1 }} />

          {/* Luxury Circular Frosted Glass Favorite Button */}
          <Pressable
            style={[
              styles.favoriteBtn,
              isFavorite && styles.favoriteBtnActive,
            ]}
            onPress={handleFavoritePress}
            hitSlop={10}
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? (isFavorite ? 85 : 70) : 100}
              tint={isFavorite ? 'light' : 'dark'}
              style={StyleSheet.absoluteFill}
            />
            <Heart
              size={18}
              color={isFavorite ? '#EF4444' : '#FFFFFF'}
              fill={isFavorite ? '#EF4444' : 'transparent'}
              strokeWidth={2.2}
            />
          </Pressable>
        </View>

        {/* Bottom Image Photo Counter Badge */}
        {photosCount > 1 && (
          <View style={styles.photoCountBadge}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 65 : 100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <Camera size={11} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.photoCountText}>{photosCount}</Text>
          </View>
        )}
      </View>

      {/* 2. Editorial Content Hierarchy */}
      <View style={styles.infoContainer}>
        {/* Row 1: Big Bold Price + Typology Capsule */}
        <View style={styles.priceRow}>
          <View style={styles.priceWrap}>
            <Text
              style={[
                styles.priceValue,
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
              {formatPrice(listing.price)}
            </Text>
            {isRent && (
              <Text style={[styles.pricePeriod, { color: colors.textMuted }]}>
                /muaj
              </Text>
            )}
          </View>

          {listing.apartment_type ? (
            <View
              style={[
                styles.typologyPill,
                {
                  backgroundColor:
                    theme === 'white'
                      ? 'rgba(0, 100, 89, 0.08)'
                      : theme === 'green'
                      ? 'rgba(200, 184, 130, 0.18)'
                      : 'rgba(52, 211, 153, 0.12)',
                  borderColor:
                    theme === 'white'
                      ? 'rgba(0, 100, 89, 0.22)'
                      : theme === 'green'
                      ? 'rgba(200, 184, 130, 0.40)'
                      : 'rgba(52, 211, 153, 0.3)',
                },
              ]}
            >
              <Text
                style={[
                  styles.typologyPillText,
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
                {listing.apartment_type}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Row 2: Listing Title */}
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {listing.title}
        </Text>

        {/* Row 3: Location & Verified Badge */}
        <View style={styles.locationAndPosterRow}>
          <View style={styles.locationRow}>
            <MapPin
              size={13}
              color={theme === 'green' ? colors.gold : colors.primary}
              strokeWidth={2.4}
            />
            <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
              {listing.neighborhood ? `${listing.neighborhood}, ${listing.city}` : listing.city}
            </Text>
          </View>

          {listing.profiles?.email_verified && (
            <View
              style={[
                styles.verifiedBadge,
                {
                  backgroundColor:
                    theme === 'green'
                      ? 'rgba(200, 184, 130, 0.15)'
                      : 'rgba(16, 185, 129, 0.12)',
                },
              ]}
            >
              <ShieldCheck
                size={11}
                color={theme === 'green' ? colors.gold : '#10B981'}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.verifiedBadgeText,
                  { color: theme === 'green' ? colors.gold : '#10B981' },
                ]}
              >
                {listing.profiles.account_type === 'company' ? 'Agjenci' : 'Verifikuar'}
              </Text>
            </View>
          )}
        </View>

        {/* Row 4: Organized Specs Modules (Area, Rooms, Floor) */}
        <View
          style={[
            styles.specsModuleRow,
            {
              borderTopColor:
                theme === 'white'
                  ? '#F3F4F6'
                  : 'rgba(255, 255, 255, 0.08)',
            },
          ]}
        >
          {listing.area_m2 > 0 && (
            <View
              style={[
                styles.specModule,
                {
                  backgroundColor:
                    theme === 'white'
                      ? '#F4F7F6'
                      : theme === 'green'
                      ? 'rgba(0, 48, 42, 0.85)'
                      : '#1B2422',
                  borderColor:
                    theme === 'white'
                      ? '#E5E7EB'
                      : theme === 'green'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : '#263330',
                },
              ]}
            >
              <Maximize2
                size={11}
                color={theme === 'green' ? colors.gold : colors.primary}
                strokeWidth={2.2}
              />
              <Text style={[styles.specModuleText, { color: colors.textPrimary }]}>
                {listing.area_m2} m²
              </Text>
            </View>
          )}

          {listing.rooms > 0 && (
            <View
              style={[
                styles.specModule,
                {
                  backgroundColor:
                    theme === 'white'
                      ? '#F4F7F6'
                      : theme === 'green'
                      ? 'rgba(0, 48, 42, 0.85)'
                      : '#1B2422',
                  borderColor:
                    theme === 'white'
                      ? '#E5E7EB'
                      : theme === 'green'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : '#263330',
                },
              ]}
            >
              <BedDouble
                size={12}
                color={theme === 'green' ? colors.gold : colors.primary}
                strokeWidth={2.2}
              />
              <Text style={[styles.specModuleText, { color: colors.textPrimary }]}>
                {listing.rooms} dhomë
              </Text>
            </View>
          )}

          {listing.floor ? (
            <View
              style={[
                styles.specModule,
                {
                  backgroundColor:
                    theme === 'white'
                      ? '#F4F7F6'
                      : theme === 'green'
                      ? 'rgba(0, 48, 42, 0.85)'
                      : '#1B2422',
                  borderColor:
                    theme === 'white'
                      ? '#E5E7EB'
                      : theme === 'green'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : '#263330',
                },
              ]}
            >
              <Layers
                size={11}
                color={theme === 'green' ? colors.gold : colors.primary}
                strokeWidth={2.2}
              />
              <Text style={[styles.specModuleText, { color: colors.textPrimary }]}>
                Kati {listing.floor}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 0.5,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  imageContainer: {
    width: '100%',
    height: 215,
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topOverlayRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusCapsule: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(15, 23, 42, 0.72)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statusCapsuleText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontFamily: Fonts.bold,
    letterSpacing: -0.1,
  },
  featuredCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5.5,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  featuredCapsuleText: {
    color: '#003E37',
    fontSize: 10.5,
    fontFamily: Fonts.bold,
  },
  favoriteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(15, 23, 42, 0.55)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteBtnActive: {
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.92)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(15, 23, 42, 0.68)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  infoContainer: {
    padding: 16,
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    flexShrink: 1,
  },
  priceValue: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.6,
  },
  pricePeriod: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
  },
  typologyPill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  typologyPillText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },
  title: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    lineHeight: 20,
  },
  locationAndPosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 10.5,
    fontFamily: Fonts.bold,
  },
  specsModuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
    paddingTop: 8,
    borderTopWidth: 0.5,
  },
  specModule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  specModuleText: {
    fontSize: 11.5,
    fontFamily: Fonts.semiBold,
  },
})
