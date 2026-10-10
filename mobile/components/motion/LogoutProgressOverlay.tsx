import React, { useEffect } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated'
import { ShieldCheck, Trash2 } from 'lucide-react-native'

import { useTheme, Fonts } from '@/constants/theme'
import { Logo } from '@/components/Logo'

interface LogoutProgressOverlayProps {
  visible: boolean
  title?: string
  subtitle?: string
  isDelete?: boolean
}

/**
 * Apple & Linear-tier full-screen transition overlay for the account logout lifecycle.
 *
 * Physically separates and conceals underlying view mutations, cache purging,
 * and navigation hierarchy resets behind an intentional, branded transition platter.
 * Locks touch interaction atomically so user multi-taps or back gestures cannot cause
 * deadlocks or layout flashes during teardown.
 */
export function LogoutProgressOverlay({
  visible,
  title = 'Duke u çkyçur...',
  subtitle = 'Po mbyllim sesionin në mënyrë të sigurt',
  isDelete = false,
}: LogoutProgressOverlayProps) {
  const { colors, theme } = useTheme()
  const { width: screenWidth } = useWindowDimensions()

  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.95)
  const logoPulse = useSharedValue(1)
  const cardTranslateY = useSharedValue(12)

  useEffect(() => {
    if (visible) {
      // Snappy, organic Apple spring entrance
      opacity.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      })
      scale.value = withSpring(1, {
        damping: 24,
        stiffness: 300,
        mass: 0.7,
      })
      cardTranslateY.value = withSpring(0, {
        damping: 24,
        stiffness: 320,
        mass: 0.7,
      })

      // Gentle organic breathing pulse on the brand icon
      logoPulse.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.98, { duration: 800, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    } else {
      cancelAnimation(logoPulse)
      logoPulse.value = 1

      // Organic exit: dissolves outward with subtle expansion
      opacity.value = withTiming(0, {
        duration: 220,
        easing: Easing.inOut(Easing.quad),
      })
      scale.value = withTiming(1.025, {
        duration: 220,
        easing: Easing.out(Easing.quad),
      })
      cardTranslateY.value = withTiming(-8, {
        duration: 220,
        easing: Easing.in(Easing.quad),
      })
    }
  }, [visible, opacity, scale, logoPulse, cardTranslateY])

  const rootAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: cardTranslateY.value },
    ],
  }))

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoPulse.value }],
  }))

  // Theme-adaptive platter background and specular rim highlights
  const platterBg =
    theme === 'white'
      ? 'rgba(255, 255, 255, 0.94)'
      : theme === 'green'
      ? 'rgba(7, 28, 24, 0.92)'
      : 'rgba(16, 21, 20, 0.92)'

  const platterBorder =
    theme === 'white'
      ? 'rgba(0, 0, 0, 0.08)'
      : theme === 'green'
      ? 'rgba(212, 175, 55, 0.25)'
      : 'rgba(47, 191, 139, 0.22)'

  const brandAccent =
    isDelete
      ? '#EF4444'
      : theme === 'green'
      ? colors.gold
      : colors.primary

  const badgeBg =
    theme === 'white'
      ? 'rgba(0, 0, 0, 0.04)'
      : theme === 'green'
      ? 'rgba(212, 175, 55, 0.12)'
      : 'rgba(255, 255, 255, 0.06)'

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        styles.overlayRoot,
        rootAnimatedStyle,
        {
          backgroundColor: colors.background,
          zIndex: visible ? 99999 : -1,
          display: visible ? 'flex' : 'none',
        },
      ]}
    >
      {/* Ambient background soft glow centered behind the platter */}
      <View
        style={[
          styles.ambientGlow,
          {
            backgroundColor: brandAccent,
            opacity: theme === 'white' ? 0.05 : 0.12,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.platterCard,
          cardAnimatedStyle,
          {
            backgroundColor: platterBg,
            borderColor: platterBorder,
            maxWidth: Math.min(350, screenWidth - 48),
          },
        ]}
      >
        {/* Brand Icon or Delete Glyph with Organic Breathing Motion */}
        <Animated.View style={[styles.iconContainer, logoAnimatedStyle]}>
          {isDelete ? (
            <View style={[styles.deleteIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Trash2 size={28} color="#EF4444" strokeWidth={2.2} />
            </View>
          ) : (
            <Logo size={48} />
          )}
        </Animated.View>

        {/* Text Block: Title and Microcopy */}
        <View style={styles.textStack}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        </View>

        {/* Tactile Kinetic Progress Indicator */}
        <View style={styles.indicatorRow}>
          <ActivityIndicator
            size="small"
            color={brandAccent}
          />
        </View>

        {/* Security & Verification Pill */}
        <View style={[styles.securityBadge, { backgroundColor: badgeBg }]}>
          <ShieldCheck size={12} color={brandAccent} strokeWidth={2.4} />
          <Text style={[styles.securityBadgeText, { color: colors.textMuted }]}>
            Sesion i mbrojtur • Bleje Pronën
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlayRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: Platform.OS === 'android' ? 999 : undefined,
  },
  ambientGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    transform: [{ scale: 1.4 }],
  },
  platterCard: {
    width: '100%',
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 32,
    paddingHorizontal: 26,
    alignItems: 'center',
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.18,
        shadowRadius: 28,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  deleteIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textStack: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 17.5,
    fontFamily: Fonts.bold,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    letterSpacing: -0.15,
    textAlign: 'center',
    lineHeight: 18,
  },
  indicatorRow: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderCurve: 'continuous',
    marginTop: 2,
  },
  securityBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: -0.1,
  },
})
