import React from 'react'
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { MapPin, BedDouble, Maximize2, Layers, Heart } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { Listing } from '@/lib/supabase'

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
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onToggleFavorite?.(listing.id)
  }

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('de-DE').format(val) + ' €'
  }

  const mainImage =
    listing.images && listing.images.length > 0
      ? listing.images[0]
      : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'

  const typeBadgeBg = theme === 'green' ? colors.gold : '#006459'
  const typeBadgeTextColor = theme === 'green' ? '#003E37' : '#FFFFFF'

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowOpacity: theme === 'black' ? 0.3 : 0.06,
        },
        pressed && styles.cardPressed,
      ]}
      onPress={() => router.push(`/listings/${listing.id}` as any)}
    >
      {/* Image Container */}
      <View style={[styles.imageContainer, { backgroundColor: colors.surfaceSubtle }]}>
        <Image
          source={{ uri: mainImage }}
          style={styles.image}
          contentFit="cover"
        />

        {/* Badge: Shitje / Qira */}
        <View style={[styles.typeBadge, { backgroundColor: typeBadgeBg }]}>
          <Text style={[styles.typeBadgeText, { color: typeBadgeTextColor }]}>
            {listing.type === 'shitje' ? 'NË SHITJE' : 'ME QIRA'}
          </Text>
        </View>

        {/* Favorite Heart Toggle */}
        <Pressable
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          hitSlop={8}
        >
          <Heart
            size={18}
            color={isFavorite ? '#EF4444' : '#FFFFFF'}
            fill={isFavorite ? '#EF4444' : 'rgba(0,0,0,0.3)'}
          />
        </Pressable>

        {/* Price overlay on image */}
        <View style={[styles.priceContainer, { backgroundColor: 'rgba(11, 15, 14, 0.88)' }]}>
          <Text style={styles.priceText}>{formatPrice(listing.price)}</Text>
          {listing.type === 'qira' && <Text style={styles.periodText}>/muaj</Text>}
        </View>
      </View>

      {/* Details Container */}
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {listing.title}
        </Text>

        {/* Location */}
        <View style={styles.locationRow}>
          <MapPin size={13} color={colors.primary} strokeWidth={2.4} />
          <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
            {listing.neighborhood ? `${listing.neighborhood}, ${listing.city}` : listing.city}
          </Text>
        </View>

        {/* Specs Row */}
        <View style={[styles.specsRow, { borderTopColor: colors.borderSubtle }]}>
          {listing.area_m2 > 0 && (
            <View style={styles.specItem}>
              <Maximize2 size={12} color={colors.textMuted} strokeWidth={2} />
              <Text style={[styles.specText, { color: colors.textMuted }]}>{listing.area_m2} m²</Text>
            </View>
          )}

          {listing.rooms > 0 && (
            <View style={styles.specItem}>
              <BedDouble size={12} color={colors.textMuted} strokeWidth={2} />
              <Text style={[styles.specText, { color: colors.textMuted }]}>{listing.rooms} dhomë</Text>
            </View>
          )}

          {listing.floor && (
            <View style={styles.specItem}>
              <Layers size={12} color={colors.textMuted} strokeWidth={2} />
              <Text style={[styles.specText, { color: colors.textMuted }]}>Kati {listing.floor}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  imageContainer: {
    width: '100%',
    height: 195,
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.extraBold,
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.extraBold,
  },
  periodText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  infoContainer: {
    padding: 14,
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locationText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    flex: 1,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
})
