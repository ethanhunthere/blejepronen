import { useRef, useMemo, useCallback } from 'react'
import {
  Animated,
  PanResponder,
  Platform,
  Easing,
  PanResponderInstance,
  PanResponderGestureState,
} from 'react-native'
import * as Haptics from 'expo-haptics'

export interface BottomSheetGestureOptions {
  /**
   * Distance in points the sheet travels when dismissing downward off-screen.
   * Default: 520
   */
  dismissDistance?: number
  /**
   * Minimum downward distance (in points) to trigger dismiss on release.
   * Default: 60
   */
  dismissThreshold?: number
  /**
   * Minimum downward velocity to trigger dismiss on quick flick.
   * Default: 0.30
   */
  velocityThreshold?: number
  /**
   * Rubber band resistance factor when pulling upward beyond origin.
   * Default: 0.16
   */
  rubberBandFactor?: number
  /**
   * Callback fired when dismissal gesture commits.
   */
  onDismiss: () => void
  /**
   * Whether to trigger light haptic feedback on dismiss commit.
   * Default: true
   */
  enableHaptics?: boolean
}

export interface BottomSheetGestureReturn {
  /** The Animated.Value tracking the vertical translation offset */
  dragY: Animated.Value
  /** Interpolated backdrop opacity [1 at resting origin, 0 when fully dragged down] */
  backdropOpacity: Animated.AnimatedInterpolation<number>
  /** Dedicated PanHandlers for the Grabber / Handle zone (claims immediately on touch down) */
  handlePanHandlers: PanResponderInstance['panHandlers']
  /** Dedicated PanHandlers for the Card container (captures downward drag from child buttons) */
  cardPanHandlers: PanResponderInstance['panHandlers']
  /** Programmatically dismisses the sheet with the native spring/timing curve */
  animateDismiss: (callback?: () => void) => void
  /** Programmatically resets the sheet back to resting origin */
  resetPosition: () => void
  /** Animated entrance helper from off-screen to 0 */
  animateEntrance: (callback?: () => void) => void
}

/**
 * useBottomSheetGesture
 *
 * Elite Apple/Airbnb-grade bottom sheet gesture hook.
 *
 * Architecture Highlights:
 * 1. Dual-responder tree:
 *    - `handlePanHandlers`: Claims the gesture instantly on frame 0 with 0ms latency.
 *    - `cardPanHandlers`: Permits normal child taps (`Pressable`, `TouchableOpacity`),
 *      but seamlessly captures on natural downward thumb swipes (`dy > 4` and downward dominant).
 * 2. Tactile 60/120 FPS physics:
 *    - Direct 1:1 finger tracking downward.
 *    - Apple-grade non-linear rubber-banding when pulled upward (`dy * 0.16`).
 *    - High-velocity flick dismissal (`vy > 0.30`) or displacement dismissal (`dy > 60`).
 *    - Critically damped snap-back spring (`damping: 24, stiffness: 280, mass: 0.85`).
 * 3. Proportional backdrop interpolation:
 *    - Smoothly dims backdrop from 1 to 0 without black flashes or visual jumps.
 */
export function useBottomSheetGesture({
  dismissDistance = 520,
  dismissThreshold = 60,
  velocityThreshold = 0.30,
  rubberBandFactor = 0.16,
  onDismiss,
  enableHaptics = true,
}: BottomSheetGestureOptions): BottomSheetGestureReturn {
  const dragY = useRef(new Animated.Value(dismissDistance)).current
  const isDismissingRef = useRef(false)

  const triggerHaptic = useCallback(() => {
    if (!enableHaptics || Platform.OS === 'web') return
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    } catch {}
  }, [enableHaptics])

  const animateDismiss = useCallback(
    (callback?: () => void) => {
      if (isDismissingRef.current) return
      isDismissingRef.current = true

      Animated.timing(dragY, {
        toValue: dismissDistance,
        duration: 220,
        easing: Easing.bezier(0.33, 1, 0.68, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          isDismissingRef.current = false
          callback?.()
          onDismiss()
        }
      })
    },
    [dragY, dismissDistance, onDismiss]
  )

  const resetPosition = useCallback(() => {
    Animated.spring(dragY, {
      toValue: 0,
      damping: 24,
      mass: 0.85,
      stiffness: 280,
      useNativeDriver: true,
    }).start()
  }, [dragY])

  const animateEntrance = useCallback(
    (callback?: () => void) => {
      isDismissingRef.current = false
      dragY.setValue(dismissDistance)

      Animated.spring(dragY, {
        toValue: 0,
        damping: 24,
        mass: 0.85,
        stiffness: 260,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          callback?.()
        }
      })
    },
    [dragY, dismissDistance]
  )

  const handleRelease = useCallback(
    (gestureState: PanResponderGestureState) => {
      const isQuickFlick = gestureState.vy > velocityThreshold
      const isPastThreshold = gestureState.dy > dismissThreshold

      if (isQuickFlick || isPastThreshold) {
        triggerHaptic()
        animateDismiss()
      } else {
        resetPosition()
      }
    },
    [velocityThreshold, dismissThreshold, triggerHaptic, animateDismiss, resetPosition]
  )

  // 1. Handle PanResponder (claims immediately on start for zero dead-zone responsiveness)
  const handlePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          dragY.stopAnimation()
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            dragY.setValue(gestureState.dy)
          } else {
            dragY.setValue(gestureState.dy * rubberBandFactor)
          }
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, gestureState) => {
          handleRelease(gestureState)
        },
        onPanResponderTerminate: () => {
          resetPosition()
        },
      }),
    [dragY, rubberBandFactor, handleRelease, resetPosition]
  )

  // 2. Card PanResponder (allows child taps, captures on natural downward thumb swipe)
  const cardPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Natural downward thumb swipe: dy > 4 and dy dominates horizontal deviation
          return gestureState.dy > 4 && gestureState.dy > Math.abs(gestureState.dx) * 0.6
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          // Intercept from child buttons (Pressable/TouchableOpacity) so dragging anywhere dismisses
          return gestureState.dy > 4 && gestureState.dy > Math.abs(gestureState.dx) * 0.6
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragY.stopAnimation()
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            dragY.setValue(gestureState.dy)
          } else {
            dragY.setValue(gestureState.dy * rubberBandFactor)
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          handleRelease(gestureState)
        },
        onPanResponderTerminate: () => {
          resetPosition()
        },
      }),
    [dragY, rubberBandFactor, handleRelease, resetPosition]
  )

  const backdropOpacity = dragY.interpolate({
    inputRange: [0, Math.max(dismissThreshold * 2.8, 180)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  return {
    dragY,
    backdropOpacity,
    handlePanHandlers: handlePanResponder.panHandlers,
    cardPanHandlers: cardPanResponder.panHandlers,
    animateDismiss,
    resetPosition,
    animateEntrance,
  }
}
