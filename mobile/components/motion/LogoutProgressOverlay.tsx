import React, { useEffect } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native'
import { Image } from 'expo-image'
import { StatusBar } from 'expo-status-bar'
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
import { Trash2 } from 'lucide-react-native'

import { useTheme, Fonts } from '@/constants/theme'
import {
  LOGO_TEAL_DATA_URI,
  LOGO_WHITE_DATA_URI,
} from '@/assets/brand/logo-data'

interface LogoutProgressOverlayProps {
  visible: boolean
  title?: string
  subtitle?: string
  isDelete?: boolean
}

/**
 * Minimalist, world-class exit transition overlay for account logout and deletion.
 *
 * Designed with absolute aesthetic restraint inspired by Apple & Linear:
 * - 100% seamless, flat canvas directly integrated into the background (zero panels or cards)
 * - Pure typographic hierarchy with effortless contrast ratios across light and dark themes
 * - Weightless, serene micro-interactions with zero clumsy circles or heavy geometry
 * - Deterministic pointer and touch locking to conceal background navigation teardown
 */
export function LogoutProgressOverlay({
  visible,
  title = 'Duke u çkyçur...',
  subtitle = 'Po mbyllim sesionin në mënyrë të sigurt',
  isDelete = false,
}: LogoutProgressOverlayProps) {
  const { colors, theme } = useTheme()

  const opacity = useSharedValue(0)
  const contentTranslateY = useSharedValue(8)
  const logoScale = useSharedValue(1)

  useEffect(() => {
    if (visible) {
      // Whisper-quiet Apple-smooth entrance
      opacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      })
      contentTranslateY.value = withSpring(0, {
        damping: 28,
        stiffness: 280,
        mass: 0.6,
      })

      // Silky, ethereal breathing cycle on the emblem
      logoScale.value = withRepeat(
        withSequence(
          withTiming(0.965, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    } else {
      cancelAnimation(logoScale)
      logoScale.value = 1

      // Soft dissolve outward
      opacity.value = withTiming(0, {
        duration: 180,
        easing: Easing.inOut(Easing.quad),
      })
      contentTranslateY.value = withTiming(-6, {
        duration: 180,
        easing: Easing.in(Easing.quad),
      })
    }
  }, [visible, opacity, contentTranslateY, logoScale])

  const rootAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: contentTranslateY.value },
    ],
  }))

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }))

  // Theme-adaptive flat canvas background (pure and seamless, no borders or platter cards)
  const canvasBg =
    theme === 'white'
      ? '#FFFFFF'
      : theme === 'green'
      ? '#071C18'
      : '#000000'

  // Contrast-dialed text colors across light and dark themes
  const titleColor =
    theme === 'white'
      ? '#0F172A'
      : '#FFFFFF'

  const subtitleColor =
    theme === 'white'
      ? '#64748B'
      : theme === 'green'
      ? 'rgba(255, 255, 255, 0.70)'
      : 'rgba(249, 250, 251, 0.65)'

  // Accent & micro-indicator colors
  const deleteAccent =
    theme === 'white'
      ? '#DC2626'
      : '#F87171'

  const indicatorColor = isDelete
    ? deleteAccent
    : theme === 'white'
    ? colors.primary
    : theme === 'green'
    ? colors.gold
    : colors.primary

  const logoDataUri = theme === 'white' ? LOGO_TEAL_DATA_URI : LOGO_WHITE_DATA_URI

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        styles.overlayRoot,
        rootAnimatedStyle,
        {
          backgroundColor: canvasBg,
          zIndex: visible ? 99999 : -1,
          display: visible ? 'flex' : 'none',
        },
      ]}
    >
      <StatusBar style={theme === 'white' ? 'dark' : 'light'} animated={false} />

      <Animated.View style={[styles.contentContainer, contentAnimatedStyle]}>
        {/* Minimalist Emblem or Delete Glyph with Ethereal Micro-motion */}
        <Animated.View style={[styles.emblemWrapper, logoAnimatedStyle]}>
          {isDelete ? (
            <Trash2 size={34} color={deleteAccent} strokeWidth={1.8} />
          ) : (
            <Image
              source={{ uri: logoDataUri }}
              style={styles.emblemImage}
              contentFit="contain"
              priority="high"
              cachePolicy="memory"
              transition={0}
            />
          )}
        </Animated.View>

        {/* Typographic Stack: High-contrast title and refined subcopy */}
        <View style={styles.textStack}>
          <Text
            style={[styles.title, { color: titleColor }]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {title}
          </Text>
          <Text
            style={[styles.subtitle, { color: subtitleColor }]}
            numberOfLines={3}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {subtitle}
          </Text>
        </View>

        {/* Whisper-quiet, weightless progress indicator */}
        <View style={styles.indicatorContainer}>
          <ActivityIndicator
            size="small"
            color={indicatorColor}
          />
        </View>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlayRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    elevation: Platform.OS === 'android' ? 999 : undefined,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 340,
  },
  emblemWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    height: 48,
  },
  emblemImage: {
    width: 44,
    height: 44,
  },
  textStack: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    letterSpacing: -0.15,
    textAlign: 'center',
    lineHeight: 20,
  },
  indicatorContainer: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
})
