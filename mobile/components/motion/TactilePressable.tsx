import React, { useCallback, useEffect } from 'react'
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
  Platform,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export interface TactilePressableProps extends Omit<PressableProps, 'style'> {
  /**
   * Scale factor when pressed down. Default is 0.97 (subtle tactile feedback).
   */
  activeScale?: number
  /**
   * Haptic feedback style to trigger on press-in. Defaults to 'light'.
   */
  haptic?: 'light' | 'medium' | 'selection' | 'none'
  /**
   * Style object or functional style generator.
   */
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>)
}

const SPRING_CONFIG = {
  damping: 24,
  stiffness: 450,
  mass: 0.4,
}

export function TactilePressable({
  activeScale = 0.97,
  haptic = 'light',
  style,
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...props
}: TactilePressableProps) {
  const scale = useSharedValue(1)

  // Unconditional safety: if component is disabled while pressed, snap back to scale 1
  useEffect(() => {
    if (disabled) {
      scale.value = withSpring(1, SPRING_CONFIG)
    }
  }, [disabled, scale])

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      if (!disabled) {
        scale.value = withSpring(activeScale, SPRING_CONFIG)
        if (haptic !== 'none' && Platform.OS !== 'web') {
          if (haptic === 'selection') {
            Haptics.selectionAsync()
          } else if (haptic === 'medium') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }
        }
      }
      onPressIn?.(e)
    },
    [disabled, activeScale, haptic, onPressIn, scale]
  )

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      // Unconditionally restore scale to 1.0 even if disabled state toggled mid-press
      scale.value = withSpring(1, SPRING_CONFIG)
      onPressOut?.(e)
    },
    [onPressOut, scale]
  )

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        typeof style === 'function' ? (state: { pressed: boolean }) => style(state) : style,
        animatedStyle,
      ]}
    >
      {children}
    </AnimatedPressable>
  )
}
