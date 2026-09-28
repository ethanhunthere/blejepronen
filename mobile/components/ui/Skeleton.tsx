import React, { memo, useEffect, useRef } from 'react'
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { FontSizes, Radii, Spacing, useTheme } from '@/constants/theme'
import { useReducedMotionEnabled } from '@/components/motion/useReducedMotion'

export type SkeletonShape = 'card' | 'row' | 'avatar' | 'text'

export interface SkeletonProps {
  /** Preset geometry. Explicit `width`/`height`/`radius` override it. */
  shape?: SkeletonShape
  width?: DimensionValue
  height?: DimensionValue
  radius?: number
  /**
   * Render N stacked blocks instead of one. Only meaningful for `text` and
   * `row`; the last block is shortened so a paragraph does not look sawn off.
   */
  lines?: number
  /** Gap between `lines` blocks. Defaults to the small spacing step. */
  lineGap?: number
  /** Set false for a static block (auto-disabled under reduced motion). */
  animate?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
  /**
   * When omitted the placeholder is hidden from the accessibility tree — the
   * surrounding screen owns the "loading" announcement. Supply a label to
   * expose this element itself as an indeterminate progressbar instead.
   */
  accessibilityLabel?: string
}

interface ShapePreset {
  width: DimensionValue
  height: DimensionValue
  radius: number
}

/** Media-placeholder height: stands in for a listing hero, not a spacing step. */
const CARD_PLACEHOLDER_HEIGHT = 180

const SHAPE_PRESETS: Record<SkeletonShape, ShapePreset> = {
  card: { width: '100%', height: CARD_PLACEHOLDER_HEIGHT, radius: Radii.r16 },
  row: { width: '100%', height: Spacing.s56, radius: Radii.r12 },
  avatar: { width: Spacing.s44, height: Spacing.s44, radius: Radii.circle },
  text: { width: '100%', height: FontSizes.footnote, radius: Radii.r4 },
}

const PULSE_DURATION = 800
const PULSE_MIN = 0.5
const PULSE_MAX = 1

/**
 * Token-driven loading placeholder.
 *
 * The pulse is an opacity loop on the native driver — no layout, no shadow
 * recomputation, and no backdrop blur, so a feed full of these stays cheap to
 * scroll. Under reduced motion (or `animate={false}`) it renders at full
 * opacity with no timer at all.
 */
function SkeletonComponent({
  shape = 'text',
  width,
  height,
  radius,
  lines = 1,
  lineGap = Spacing.s6,
  animate = true,
  style,
  testID,
  accessibilityLabel,
}: SkeletonProps) {
  const { semantic } = useTheme()
  const reducedMotion = useReducedMotionEnabled()
  const shouldAnimate = animate && !reducedMotion

  const opacity = useRef(new Animated.Value(shouldAnimate ? PULSE_MIN : PULSE_MAX)).current

  useEffect(() => {
    if (!shouldAnimate) {
      // Land on the resting value; also stops a loop started before the
      // accessibility setting changed underneath us.
      opacity.stopAnimation()
      opacity.setValue(PULSE_MAX)
      return
    }

    opacity.setValue(PULSE_MIN)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: PULSE_MAX,
          duration: PULSE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: PULSE_MIN,
          duration: PULSE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()

    return () => {
      loop.stop()
      opacity.stopAnimation()
    }
  }, [shouldAnimate, opacity])

  const preset = SHAPE_PRESETS[shape]
  const resolvedWidth = width ?? preset.width
  const resolvedHeight = height ?? preset.height
  const resolvedRadius = radius ?? preset.radius

  const blockStyle: StyleProp<ViewStyle> = [
    styles.block,
    {
      width: resolvedWidth,
      height: resolvedHeight,
      borderRadius: resolvedRadius,
      backgroundColor: semantic.skeleton,
    },
    style,
  ]

  // A labelled skeleton is a real progress indicator; an unlabelled one is
  // decoration that would only add noise to a screen-reader pass.
  const a11yProps = accessibilityLabel
    ? {
        accessible: true as const,
        accessibilityRole: 'progressbar' as const,
        accessibilityLabel,
        accessibilityState: { busy: true },
      }
    : {
        accessible: false as const,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants' as const,
      }

  if (lines <= 1) {
    return <Animated.View testID={testID} style={[blockStyle, { opacity }]} {...a11yProps} />
  }

  return (
    <View testID={testID} style={[styles.stack, { gap: lineGap }]} {...a11yProps}>
      {Array.from({ length: lines }).map((_, index) => (
        <Animated.View
          key={`skeleton-line-${index}`}
          style={[
            blockStyle,
            // Shorten the final line of a paragraph block.
            index === lines - 1 && lines > 2 && styles.lastLine,
            { opacity },
          ]}
        />
      ))}
    </View>
  )
}

export const Skeleton = memo(SkeletonComponent)

const styles = StyleSheet.create({
  block: {
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  stack: {
    width: '100%',
  },
  lastLine: {
    width: '62%',
  },
})
