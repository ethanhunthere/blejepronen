import React from 'react'
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { MapPin, BedDouble, Maximize2, Layers, Heart } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { BrandColors } from '@/constants/Colors'
import { Listing } from '@/lib/supabase'

interface ListingCardProps {
  listing: Listing
  isFavorite?: boolean
  onToggleFavorite?: (id: string) => void
}

export function ListingCard({ listing, isFavorite = false, onToggleFavorite }: ListingCardProps) {
  const router = useRouter()

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

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/listings/${listing.id}` as any)}
    >
      {/* Image Container */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: mainImage }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />

        {/* Badge: Shitje / Qira */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
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
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>{formatPrice(listing.price)}</Text>
          {listing.type === 'qira' && <Text style={styles.periodText}>/muaj</Text>}
        </View>
      </View>

      {/* Details Container */}
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>

        {/* Location */}
        <View style={styles.locationRow}>
          <MapPin size={13} color={BrandColors.primary} strokeWidth={2.2} />
          <Text style={styles.locationText} numberOfLines={1}>
            {listing.neighborhood ? `${listing.neighborhood}, ${listing.city}` : listing.city}
          </Text>
        </View>

        {/* Specs Row */}
        <View style={styles.specsRow}>
          {listing.area_m2 > 0 && (
            <View style={styles.specItem}>
              <Maximize2 size={12} color={BrandColors.textMuted} strokeWidth={2} />
              <Text style={styles.specText}>{listing.area_m2} m²</Text>
            </View>
          )}

          {listing.rooms > 0 && (
            <View style={styles.specItem}>
              <BedDouble size={12} color={BrandColors.textMuted} strokeWidth={2} />
              <Text style={styles.specText}>{listing.rooms} dhomë</Text>
            </View>
          )}

          {listing.floor && (
            <View style={styles.specItem}>
              <Layers size={12} color={BrandColors.textMuted} strokeWidth={2} />
              <Text style={styles.specText}>Kati {listing.floor}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BrandColors.border,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  imageContainer: {
    width: '100%',
    height: 190,
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 100, 89, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(16, 24, 40, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  periodText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '500',
  },
  infoContainer: {
    padding: 14,
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locationText: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specText: {
    fontSize: 12,
    color: BrandColors.textMuted,
    fontWeight: '600',
  },
})
