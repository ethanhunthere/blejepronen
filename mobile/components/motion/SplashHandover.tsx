import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Image, Platform, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { BrandColors } from '@/constants/Colors'

interface SplashHandoverProps {
  isReady: boolean
  onComplete?: () => void
}

const EMERALD = BrandColors.primary
const LOGO_SIZE = 250
const TOTAL_MS = 700
const REDUCED_MS = 280
const FAILSAFE_MS = 2200

const clamp01 = (t: number): number => {
  'worklet'
  return t < 0 ? 0 : t > 1 ? 1 : t
}

const segment = (p: number, start: number, end: number): number => {
  'worklet'
  return clamp01((p - start) / (end - start))
}

const easeInQuart = (t: number): number => {
  'worklet'
  return t * t * t * t
}

const easeOutExpo = (t: number): number => {
  'worklet'
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

const easeOutCubic = (t: number): number => {
  'worklet'
  return 1 - Math.pow(1 - t, 3)
}

const WINDUP_START = 0.17
const WINDUP_END = 0.28
const RELEASE_START = 0.28
const RELEASE_END = 0.78
const LOGO_FADE_START = 0.34
const VEIL_START = 0.32
const WINDUP_SCALE = 0.028
const RELEASE_SCALE = 0.188

export function SplashHandover({ isReady, onComplete }: SplashHandoverProps) {
  const [isFinished, setIsFinished] = useState(false)
  const startedRef = useRef(false)
  const completedRef = useRef(false)

  const progress = useSharedValue(0)
  const reduceMotionSV = useSharedValue(0)

  const logoScaleSV = useDerivedValue(() => {
    const p = progress.value
    if (reduceMotionSV.value === 1) {
      return 1 - segment(p, 0.5, 1) * 0.03
    }
    if (p < WINDUP_END) {
      return 1 - easeInQuart(segment(p, WINDUP_START, WINDUP_END)) * WINDUP_SCALE
    }
    return (
      1 - WINDUP_SCALE + easeOutExpo(segment(p, RELEASE_START, RELEASE_END)) * RELEASE_SCALE
    )
  })

  const logoOpacitySV = useDerivedValue(() => {
    const p = progress.value
    if (reduceMotionSV.value === 1) {
      return 1 - segment(p, 0.45, 1)
    }
    return 1 - easeOutExpo(segment(p, LOGO_FADE_START, RELEASE_END))
  })

  const veilOpacitySV = useDerivedValue(() => {
    const p = progress.value
    return 1 - easeOutCubic(segment(p, VEIL_START, 1))
  })

  const veilScaleSV = useDerivedValue(() => {
    const p = progress.value
    return 1 + easeOutCubic(segment(p, VEIL_START, 1)) * 0.03
  })

  const handleFinish = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    setIsFinished(true)
    onComplete?.()
  }, [onComplete])

  useEffect(() => {
    let alive = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (alive && enabled) reduceMotionSV.value = 1
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [reduceMotionSV])

  useEffect(() => {
    if (!isReady || startedRef.current) return
    let cancelled = false
    let begun = false

    const begin = () => {
      if (cancelled || begun) return
      begun = true
      startedRef.current = true
      const duration = reduceMotionSV.value === 1 ? REDUCED_MS : TOTAL_MS
      progress.value = withTiming(
        1,
        { duration, easing: Easing.linear },
        (finished) => {
          'worklet'
          if (finished) runOnJS(handleFinish)()
        }
      )
    }

    const timeout = setTimeout(begin, 80)
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (cancelled) return
        if (enabled) reduceMotionSV.value = 1
        clearTimeout(timeout)
        begin()
      })
      .catch(() => {
        clearTimeout(timeout)
        begin()
      })

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [isReady, progress, reduceMotionSV, handleFinish])

  useEffect(() => {
    if (!isReady) return
    const failsafe = setTimeout(handleFinish, FAILSAFE_MS)
    return () => clearTimeout(failsafe)
  }, [isReady, handleFinish])

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacitySV.value,
    transform: [{ scale: logoScaleSV.value }],
  }))

  const veilStyle = useAnimatedStyle(() => ({
    opacity: veilOpacitySV.value,
    transform: [{ scale: veilScaleSV.value }],
  }))

  if (isFinished) return null

  return (
    <Animated.View
      pointerEvents={isReady ? 'none' : 'auto'}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.root, veilStyle]}
    >
      <View style={styles.stage} pointerEvents="none">
        <Animated.View style={[styles.logoBox, logoStyle]}>
          <Image
            source={require('@/assets/images/splash-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            fadeDuration={0}
            accessible={false}
          />
        </Animated.View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: EMERALD,
    zIndex: 999999,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { position: 'fixed' as const } : null),
  },
  stage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
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
