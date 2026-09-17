import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated } from 'react-native'
import { useTheme } from '@/constants/theme'

export function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width?: number | string
  height: number | string
  borderRadius?: number
  style?: any
}) {
  const { theme } = useTheme()
  const opacityAnim = useRef(new Animated.Value(0.35)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [opacityAnim])

  const baseBg =
    theme === 'white'
      ? '#E5E7EB'
      : theme === 'green'
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(255, 255, 255, 0.08)'

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: baseBg,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  )
}

export function ListingCardSkeleton() {
  const { colors, theme } = useTheme()

  const borderColor =
    theme === 'white'
      ? 'rgba(0, 0, 0, 0.06)'
      : theme === 'green'
      ? 'rgba(255, 255, 255, 0.10)'
      : 'rgba(255, 255, 255, 0.08)'

  return (
    <View
      style={[
        styles.cardSkeleton,
        {
          backgroundColor: colors.surface,
          borderColor,
          shadowColor: theme === 'black' ? '#000' : '#101828',
          shadowOpacity: theme === 'black' ? 0.35 : 0.06,
        },
      ]}
    >
      {/* Image Skeleton */}
      <SkeletonBox width="100%" height={215} borderRadius={0} style={styles.imageSkeleton} />

      {/* Content Skeleton */}
      <View style={styles.infoSkeleton}>
        {/* Price & Typology row */}
        <View style={styles.rowBetween}>
          <SkeletonBox width="42%" height={26} borderRadius={8} />
          <SkeletonBox width={72} height={22} borderRadius={10} />
        </View>

        {/* Title lines */}
        <SkeletonBox width="88%" height={16} borderRadius={6} style={{ marginTop: 2 }} />
        <SkeletonBox width="60%" height={16} borderRadius={6} />

        {/* Location line */}
        <SkeletonBox width="45%" height={14} borderRadius={6} style={{ marginTop: 2 }} />

        {/* Specs Module Row */}
        <View style={styles.specsRow}>
          <SkeletonBox width={74} height={28} borderRadius={10} />
          <SkeletonBox width={82} height={28} borderRadius={10} />
          <SkeletonBox width={68} height={28} borderRadius={10} />
        </View>
      </View>
    </View>
  )
}

export function ListingFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.feedContainer}>
      {Array.from({ length: count }).map((_, idx) => (
        <ListingCardSkeleton key={idx} />
      ))}
    </View>
  )
}

export function ListingDetailSkeleton() {
  const { colors, theme } = useTheme()

  const borderColor =
    theme === 'white'
      ? 'rgba(0, 0, 0, 0.06)'
      : theme === 'green'
      ? 'rgba(255, 255, 255, 0.10)'
      : 'rgba(255, 255, 255, 0.08)'

  return (
    <View style={[styles.detailRoot, { backgroundColor: colors.background }]}>
      {/* Hero Image Skeleton */}
      <SkeletonBox width="100%" height={340} borderRadius={0} />

      {/* Main Body */}
      <View style={styles.detailBody}>
        {/* Header Block */}
        <View
          style={[
            styles.detailHeaderBlock,
            { backgroundColor: colors.surface, borderColor },
          ]}
        >
          <View style={styles.rowBetween}>
            <SkeletonBox width="48%" height={32} borderRadius={8} />
            <SkeletonBox width={90} height={26} borderRadius={12} />
          </View>
          <SkeletonBox width="90%" height={22} borderRadius={6} style={{ marginTop: 8 }} />
          <SkeletonBox width="65%" height={16} borderRadius={6} style={{ marginTop: 4 }} />
        </View>

        {/* Specs Grid */}
        <View style={styles.detailSpecsGrid}>
          <View style={[styles.detailSpecBox, { backgroundColor: colors.surface, borderColor }]}>
            <SkeletonBox width={24} height={24} borderRadius={6} />
            <SkeletonBox width={50} height={18} borderRadius={4} style={{ marginTop: 6 }} />
            <SkeletonBox width={60} height={12} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
          <View style={[styles.detailSpecBox, { backgroundColor: colors.surface, borderColor }]}>
            <SkeletonBox width={24} height={24} borderRadius={6} />
            <SkeletonBox width={50} height={18} borderRadius={4} style={{ marginTop: 6 }} />
            <SkeletonBox width={60} height={12} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
          <View style={[styles.detailSpecBox, { backgroundColor: colors.surface, borderColor }]}>
            <SkeletonBox width={24} height={24} borderRadius={6} />
            <SkeletonBox width={50} height={18} borderRadius={4} style={{ marginTop: 6 }} />
            <SkeletonBox width={60} height={12} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        </View>

        {/* Description Section */}
        <View
          style={[
            styles.detailSectionBlock,
            { backgroundColor: colors.surface, borderColor },
          ]}
        >
          <SkeletonBox width={120} height={18} borderRadius={6} style={{ marginBottom: 12 }} />
          <SkeletonBox width="100%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
          <SkeletonBox width="96%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
          <SkeletonBox width="80%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
          <SkeletonBox width="50%" height={14} borderRadius={4} />
        </View>

        {/* Seller Profile Block */}
        <View
          style={[
            styles.detailSectionBlock,
            { backgroundColor: colors.surface, borderColor },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <SkeletonBox width={52} height={52} borderRadius={26} />
            <View style={{ gap: 6, flex: 1 }}>
              <SkeletonBox width="55%" height={18} borderRadius={4} />
              <SkeletonBox width="35%" height={14} borderRadius={4} />
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  feedContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cardSkeleton: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 0.5,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  imageSkeleton: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  infoSkeleton: {
    padding: 16,
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(128, 128, 128, 0.15)',
  },
  detailRoot: {
    flex: 1,
  },
  detailBody: {
    padding: 16,
    gap: 14,
  },
  detailHeaderBlock: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 0.5,
  },
  detailSpecsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  detailSpecBox: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  detailSectionBlock: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 0.5,
  },
})
