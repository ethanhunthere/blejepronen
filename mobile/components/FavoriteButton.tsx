import React, { useRef, useEffect, memo, useCallback } from 'react'
import {
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Platform,
  StyleProp,
  ViewStyle,
  View,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { Heart } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { playHeartSound, playUnlikeSound } from '@/lib/sound'

export interface FavoriteButtonProps {
  isFavorite: boolean
  onToggle: () => void
  canToggle?: () => boolean
  size?: number
  iconSize?: number
  variant?: 'light' | 'dark'
  style?: StyleProp<ViewStyle>
  hitSlop?: number
}

export const FavoriteButton = memo(function FavoriteButton({
  isFavorite,
  onToggle,
  canToggle,
  size = 36,
  iconSize = 18,
  variant = 'light',
  style,
  hitSlop = 10,
}: FavoriteButtonProps) {
  // Kinetic drivers
  const buttonScale = useRef(new Animated.Value(1)).current
  const activeProgress = useRef(new Animated.Value(isFavorite ? 1 : 0)).current
  const heartScale = useRef(new Animated.Value(1)).current

  // Interaction tracking refs
  const lastPressRef = useRef<number>(0)
  const isUserInteracting = useRef<boolean>(false)
  const prevFavoriteRef = useRef<boolean>(isFavorite)
  const isFirstRender = useRef<boolean>(true)

  // 1. Instantaneous Touch Anticipation (Press-In Compression)
  const handlePressIn = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 0.90,
      tension: 400,
      friction: 20,
      useNativeDriver: true,
    }).start()

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  }, [buttonScale])

  // 2. Elastic Return (Press-Out Release)
  const handlePressOut = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 1.0,
      tension: 300,
      friction: 14,
      useNativeDriver: true,
    }).start()
  }, [buttonScale])

  // 3. User-Initiated Toggle Micro-Interaction
  const handlePress = useCallback(
    (e: any) => {
      e?.stopPropagation?.()

      const now = Date.now()
      if (now - lastPressRef.current < 260) return
      lastPressRef.current = now

      // Guard: Auth or permission check
      if (canToggle && !canToggle()) {
        onToggle()
        return
      }

      const willBeFavorite = !isFavorite
      isUserInteracting.current = true
      prevFavoriteRef.current = willBeFavorite

      if (willBeFavorite) {
        // --- FAVORITE / LIKE CHOREOGRAPHY ---
        playHeartSound(false)

        // Reset heart scale to start elastic bloom from within
        heartScale.setValue(0.3)

        // Simultaneous crossfade & spring pop
        Animated.parallel([
          Animated.timing(activeProgress, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(heartScale, {
            toValue: 1.0,
            tension: 340,
            friction: 6.8,
            useNativeDriver: true,
          }),
        ]).start()

        // Apex-synchronized mechanical detent click (Apple/Instagram standard)
        if (Platform.OS !== 'web') {
          setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          }, 45)
        }
      } else {
        // --- UN-FAVORITE / UNLIKE CHOREOGRAPHY ---
        playUnlikeSound(false)

        // Soft elastic dip and fade-out
        Animated.parallel([
          Animated.timing(activeProgress, {
            toValue: 0,
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(heartScale, {
              toValue: 0.82,
              duration: 50,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.spring(heartScale, {
              toValue: 1.0,
              tension: 260,
              friction: 12,
              useNativeDriver: true,
            }),
          ]),
        ]).start()

        // Delicate tactile release
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }
      }

      onToggle()
    },
    [isFavorite, onToggle, canToggle, activeProgress, heartScale]
  )

  // 4. Graceful External Prop Synchronization (Cache hydration, external un-saves)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (prevFavoriteRef.current === isFavorite) return
    prevFavoriteRef.current = isFavorite

    if (isUserInteracting.current) {
      // Local tap already initiated the animation sequence
      isUserInteracting.current = false
      return
    }

    // External state change: smoothly animate to match prop without sound or haptic side effects
    Animated.timing(activeProgress, {
      toValue: isFavorite ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }, [isFavorite, activeProgress])

  // Design tokens & Theme specs
  const isDark = variant === 'dark'

  const inactiveIconColor = isDark ? '#FFFFFF' : '#0F172A'
  const activeIconColor = '#EF4444'

  const inactiveBg = isDark
    ? Platform.OS === 'ios'
      ? 'rgba(0, 0, 0, 0.35)'
      : 'rgba(15, 23, 42, 0.75)'
    : Platform.OS === 'ios'
    ? 'rgba(255, 255, 255, 0.40)'
    : 'rgba(255, 255, 255, 0.94)'

  const inactiveBorderColor = isDark
    ? 'rgba(255, 255, 255, 0.22)'
    : Platform.OS === 'ios'
    ? 'rgba(255, 255, 255, 0.60)'
    : 'rgba(15, 23, 42, 0.12)'

  const activeWashBg = isDark
    ? Platform.OS === 'ios'
      ? 'rgba(239, 68, 68, 0.22)'
      : 'rgba(239, 68, 68, 0.28)'
    : Platform.OS === 'ios'
    ? 'rgba(254, 242, 242, 0.92)'
    : 'rgba(254, 242, 242, 0.98)'

  const activeBorderColor = isDark
    ? 'rgba(239, 68, 68, 0.50)'
    : 'rgba(239, 68, 68, 0.35)'

  // Interpolations for layered, zero-glitch transition
  // A. Inactive Outline Heart: contracts slightly and dissolves
  const outlineOpacity = activeProgress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [1, 0, 0],
  })

  const outlineScale = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.82],
  })

  // B. Active Filled Heart: blossoms outward from within
  const fillOpacity = activeProgress.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 1, 1],
  })

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={hitSlop}
      style={({ pressed }) => [styles.touchTarget, style]}
    >
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: buttonScale }],
            borderColor: inactiveBorderColor,
            backgroundColor: inactiveBg,
          },
        ]}
      >
        {/* 1. Frosted Glass Material (iOS) - Invariant Tint to eradicate white flashes */}
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={isDark ? 65 : 75}
            tint={isDark ? 'dark' : 'light'}
            style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: 'hidden' }]}
          />
        )}

        {/* 2. Active State Glass Wash Overlay (Native-driver opacity crossfade) */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.activeWash,
            {
              borderRadius: size / 2,
              backgroundColor: activeWashBg,
              borderColor: activeBorderColor,
              opacity: activeProgress,
            },
          ]}
        />

        {/* 3. Dual-Layer Optical Heart (Outline + Filled in exact geometric alignment) */}
        <View style={[styles.iconContainer, { width: iconSize, height: iconSize }]}>
          {/* Layer A: Outline Heart (Inactive) */}
          <Animated.View
            style={[
              styles.iconLayer,
              {
                opacity: outlineOpacity,
                transform: [{ scale: outlineScale }],
              },
            ]}
          >
            <Heart
              size={iconSize}
              color={inactiveIconColor}
              fill="transparent"
              strokeWidth={2.2}
            />
          </Animated.View>

          {/* Layer B: Filled Heart (Active) */}
          <Animated.View
            style={[
              styles.iconLayer,
              {
                opacity: fillOpacity,
                transform: [{ scale: heartScale }],
              },
            ]}
          >
            <Heart
              size={iconSize}
              color={activeIconColor}
              fill={activeIconColor}
              strokeWidth={1.5}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  touchTarget: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  activeWash: {
    borderWidth: 0.5,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
