import React, { useEffect, useState, useCallback } from 'react'
import { StyleSheet, View, Image } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated'

interface SplashHandoverProps {
  /**
   * Set to true once fonts, cache, and theme are loaded, and the first native frame has drawn.
   */
  isReady: boolean
  /**
   * Optional callback fired once the handover transition finishes and the overlay unmounts.
   */
  onComplete?: () => void
}

const SPLASH_BG = '#00675B'
const LOGO_SIZE = 180

export function SplashHandover({ isReady, onComplete }: SplashHandoverProps) {
  const [isFinished, setIsFinished] = useState(false)

  // GPU-accelerated driver values (transform & opacity only)
  const containerOpacity = useSharedValue(1)
  const logoScale = useSharedValue(1)
  const logoOpacity = useSharedValue(1)

  const handleFinish = useCallback(() => {
    setIsFinished(true)
    onComplete?.()
  }, [onComplete])

  useEffect(() => {
    let unmounted = false
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null

    if (isReady && !isFinished) {
      // 1. Subtle bloom and scale up of the brand logo
      logoScale.value = withTiming(1.14, {
        duration: 440,
        easing: Easing.bezier(0.16, 1, 0.3, 1), // Apple / Linear fluid curve
      })

      // 2. Soft fade of the logo
      logoOpacity.value = withTiming(0, {
        duration: 360,
        easing: Easing.bezier(0.33, 1, 0.68, 1),
      })

      // 3. Smooth dissolve of the emerald background revealing interactive interface
      containerOpacity.value = withTiming(
        0,
        {
          duration: 460,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        },
        (finished) => {
          'worklet'
          if (finished) {
            runOnJS(handleFinish)()
          }
        }
      )

      // Guaranteed garbage collection fail-safe: cleans up overlay unconditionally
      fallbackTimer = setTimeout(() => {
        if (!unmounted) {
          handleFinish()
        }
      }, 550)
    }

    return () => {
      unmounted = true
      if (fallbackTimer) {
        clearTimeout(fallbackTimer)
      }
    }
  }, [isReady, isFinished, logoScale, logoOpacity, containerOpacity, handleFinish])

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }))

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }))

  // Once completed, unmount completely from memory
  if (isFinished) {
    return null
  }

  return (
    <Animated.View
      style={[styles.container, animatedContainerStyle]}
      pointerEvents={isReady ? 'none' : 'auto'}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.logoWrapper, animatedLogoStyle]}>
        <Image
          source={require('@/assets/images/splash-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          fadeDuration={0}
        />
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
  },
  logoWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
})
