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

interface SplashHandoverProps {
  isReady: boolean
  onComplete?: () => void
}

const EMERALD = '#00675B'
const LOGO_SIZE = 250
const TOTAL_MS = 1100
const REDUCED_MS = 360
const FAILSAFE_MS = 2600

const clamp01 = (t: number): number => {
  'worklet'
  return t < 0 ? 0 : t > 1 ? 1 : t
}

const segment = (p: number, start: number, end: number): number => {
  'worklet'
  return clamp01((p - start) / (end - start))
}

const easeOutExpo = (t: number): number => {
  'worklet'
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

const easeInOutCubic = (t: number): number => {
  'worklet'
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

const breathPulse = (t: number): number => {
  'worklet'
  return Math.sin(t * Math.PI)
}

export function SplashHandover({ isReady, onComplete }: SplashHandoverProps) {
  const [isFinished, setIsFinished] = useState(false)
  const startedRef = useRef(false)
  const completedRef = useRef(false)

  const progress = useSharedValue(0)
  const reduceMotionSV = useSharedValue(0)

  const logoScaleSV = useDerivedValue(() => {
    if (reduceMotionSV.value === 1) {
      return 1 + easeOutExpo(segment(progress.value, 0.45, 1)) * 0.04
    }
    const breath = breathPulse(segment(progress.value, 0.07, 0.38)) * 0.048
    const ignite = easeOutExpo(segment(progress.value, 0.38, 0.72)) * 0.32
    return 1 + breath + ignite
  })

  const logoOpacitySV = useDerivedValue(() => {
    if (reduceMotionSV.value === 1) {
      return 1 - segment(progress.value, 0.45, 1)
    }
    return 1 - easeOutExpo(segment(progress.value, 0.43, 0.72))
  })

  const bloomScaleSV = useDerivedValue(() => {
    if (reduceMotionSV.value === 1) {
      return 1 + easeOutExpo(segment(progress.value, 0.2, 1)) * 0.6
    }
    const breath = breathPulse(segment(progress.value, 0.07, 0.38)) * 0.14
    const ignite = easeOutExpo(segment(progress.value, 0.38, 0.88)) * 2.85
    return 1 + breath + ignite
  })

  const bloomOpacitySV = useDerivedValue(() => {
    if (reduceMotionSV.value === 1) {
      return (1 - segment(progress.value, 0.35, 0.9)) * 0.35
    }
    const enter = easeOutExpo(segment(progress.value, 0.07, 0.32))
    const exit = 1 - easeOutExpo(segment(progress.value, 0.48, 0.9))
    return Math.min(enter, exit)
  })

  const veilOpacitySV = useDerivedValue(() => {
    return 1 - easeInOutCubic(segment(progress.value, 0.65, 1))
  })

  const veilScaleSV = useDerivedValue(() => {
    return 1 + easeOutExpo(segment(progress.value, 0.65, 1)) * 0.045
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

    const timeout = setTimeout(begin, 90)
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

  const bloomStyle = useAnimatedStyle(() => ({
    opacity: bloomOpacitySV.value,
    transform: [{ scale: bloomScaleSV.value }],
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
        <Animated.View style={[styles.bloom, bloomStyle]}>
          <View style={[styles.bloomLayer, styles.bloomOuter]} />
          <View style={[styles.bloomLayer, styles.bloomMid]} />
          <View style={[styles.bloomLayer, styles.bloomCore]} />
        </Animated.View>
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
  bloom: {
    position: 'absolute',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloomLayer: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
  },
  bloomCore: {
    width: LOGO_SIZE * 1.05,
    height: LOGO_SIZE * 1.05,
    opacity: 0.14,
  },
  bloomMid: {
    width: LOGO_SIZE * 1.7,
    height: LOGO_SIZE * 1.7,
    opacity: 0.07,
  },
  bloomOuter: {
    width: LOGO_SIZE * 2.5,
    height: LOGO_SIZE * 2.5,
    opacity: 0.035,
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
