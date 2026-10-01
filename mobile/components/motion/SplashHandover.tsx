import React, { useCallback, useEffect, useRef } from 'react'
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
  onSettle?: () => void
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
const WINDUP_SCALE = 0.034
const RELEASE_SCALE = 0.188

export function SplashHandover({ isReady, onComplete, onSettle }: SplashHandoverProps) {
  const startedRef = useRef(false)
  const completedRef = useRef(false)
  const settledRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const onSettleRef = useRef(onSettle)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    onCompleteRef.current = onComplete
    onSettleRef.current = onSettle
  })

  const progress = useSharedValue(0)
  const motionProfileSV = useSharedValue(0)

  const logoScaleSV = useDerivedValue(() => {
    const p = progress.value
    if (motionProfileSV.value === 1) {
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
    if (motionProfileSV.value === 1) {
      return 1 - segment(p, 0.45, 1)
    }
    return 1 - easeOutExpo(segment(p, LOGO_FADE_START, RELEASE_END))
  })

  const veilOpacitySV = useDerivedValue(() => {
    return 1 - easeOutCubic(segment(progress.value, VEIL_START, 1))
  })

  const veilScaleSV = useDerivedValue(() => {
    return 1 + easeOutCubic(segment(progress.value, VEIL_START, 1)) * 0.03
  })

  const handleSettle = useCallback(() => {
    if (settledRef.current) return
    settledRef.current = true
    onSettleRef.current?.()
  }, [])

  const handleFinish = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current)
      settleTimerRef.current = null
    }
    handleSettle()
    if (completedRef.current) return
    completedRef.current = true
    onCompleteRef.current?.()
  }, [handleSettle])

  useEffect(() => {
    if (!isReady || startedRef.current) return
    let cancelled = false
    let begun = false

    const begin = (reduced: boolean) => {
      if (cancelled || begun) return
      begun = true
      startedRef.current = true
      const duration = reduced ? REDUCED_MS : TOTAL_MS
      settleTimerRef.current = setTimeout(
        () => {
          settleTimerRef.current = null
          if (!cancelled) runOnJS(handleSettle)()
        },
        Math.round(duration * 0.55),
      )
      motionProfileSV.value = reduced ? 1 : 0
      progress.value = withTiming(
        1,
        { duration, easing: Easing.linear },
        (finished) => {
          'worklet'
          if (finished) runOnJS(handleFinish)()
        }
      )
    }

    const timeout = setTimeout(() => begin(false), 90)
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (cancelled) return
        clearTimeout(timeout)
        begin(!!enabled)
      })
      .catch(() => {
        clearTimeout(timeout)
        begin(false)
      })

    return () => {
      cancelled = true
      clearTimeout(timeout)
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current)
        settleTimerRef.current = null
      }
    }
  }, [isReady, progress, motionProfileSV, handleFinish, handleSettle])

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

  return (
    <Animated.View
      pointerEvents="auto"
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
