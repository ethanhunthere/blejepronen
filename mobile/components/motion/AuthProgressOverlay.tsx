import React, { useEffect } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { useTheme, Fonts } from '@/constants/theme'
import { Logo } from '@/components/Logo'

interface AuthProgressOverlayProps {
  visible: boolean
  label: string
}

/**
 * Full-canvas wait state for auth submission. Covers the form with the solid
 * theme canvas the instant input locks, so no field, caret, or intermediate
 * view can flicker while the session resolves; the brand mark plus a slim
 * indicator keep the wait deliberate. Fades in/out on the UI thread and rides
 * inside the auth root, so the post-success handoff dissolves it atomically.
 */
export function AuthProgressOverlay({ visible, label }: AuthProgressOverlayProps) {
  const { colors } = useTheme()
  const opacity = useSharedValue(0)

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 140 : 160,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
    })
  }, [visible, opacity])

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        fadeStyle,
        { backgroundColor: colors.background, zIndex: visible ? 50 : -1 },
      ]}
    >
      <View style={styles.center}>
        <Logo size={40} />
        <View style={styles.progressRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 13.5,
    fontFamily: Fonts.medium,
    letterSpacing: -0.1,
  },
})
