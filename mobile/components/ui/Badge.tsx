import React, { memo } from 'react'
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import {
  BorderWidths,
  FontSizes,
  Radii,
  Spacing,
  Tracking,
  Typography,
  useTheme,
  type SemanticColors,
} from '@/constants/theme'
import type { IconComponent } from './EmptyState'

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'gold'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  label: string
  variant?: BadgeVariant
  /** Leading glyph, tinted with the variant's icon colour. */
  icon?: IconComponent
  size?: BadgeSize
  /** Overrides the text handed to assistive tech (defaults to `label`). */
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

interface BadgeTone {
  background: string
  border: string
  text: string
  icon: string
}

/** Small glyphs need a heavier stroke to survive the downscale. */
const ICON_STROKE_WIDTH = 2.4

function resolveTone(variant: BadgeVariant, semantic: SemanticColors): BadgeTone {
  switch (variant) {
    case 'success':
      return {
        background: semantic.successMuted,
        border: semantic.successBorder,
        text: semantic.successText,
        icon: semantic.success,
      }
    case 'warning':
      return {
        background: semantic.warningMuted,
        border: semantic.warningBorder,
        text: semantic.warningText,
        icon: semantic.warning,
      }
    case 'danger':
      return {
        background: semantic.dangerMuted,
        border: semantic.dangerBorder,
        text: semantic.dangerText,
        icon: semantic.danger,
      }
    case 'gold':
      return {
        background: semantic.accentMuted,
        border: semantic.accentBorder,
        text: semantic.accentText,
        icon: semantic.accent,
      }
    case 'neutral':
    default:
      return {
        background: semantic.surfaceMuted,
        border: semantic.border,
        text: semantic.textMuted,
        icon: semantic.textSubtle,
      }
  }
}

const SIZES: Record<
  BadgeSize,
  {
    paddingH: number
    paddingV: number
    radius: number
    fontSize: number
    iconSize: number
    gap: number
  }
> = {
  sm: {
    paddingH: Spacing.s5_5,
    paddingV: Spacing.s1_5,
    radius: Radii.r6,
    fontSize: FontSizes.micro,
    iconSize: Spacing.s10,
    gap: Spacing.s3,
  },
  md: {
    paddingH: Spacing.s9,
    paddingV: Spacing.s3,
    radius: Radii.r7,
    fontSize: FontSizes.caption,
    iconSize: Spacing.s12,
    gap: Spacing.s4,
  },
}

/**
 * Small status pill. Purely presentational — it renders a `View`, never a
 * pressable, so a caller that needs a tappable chip wraps it in
 * `TactilePressable` and keeps ownership of the press semantics.
 *
 * Colour comes from the semantic layer's status quartet (fill / border /
 * text / icon), so every variant stays legible in all three themes without a
 * single hardcoded hex at the call site.
 */
function BadgeComponent({
  label,
  variant = 'neutral',
  icon: Icon,
  size = 'md',
  accessibilityLabel,
  style,
  testID,
}: BadgeProps) {
  const { semantic } = useTheme()
  const tone = resolveTone(variant, semantic)
  const metrics = SIZES[size]

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.badge,
        {
          paddingHorizontal: metrics.paddingH,
          paddingVertical: metrics.paddingV,
          borderRadius: metrics.radius,
          gap: metrics.gap,
          backgroundColor: tone.background,
          borderColor: tone.border,
        },
        style,
      ]}
    >
      {Icon ? (
        <View
          style={styles.iconWrap}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Icon size={metrics.iconSize} color={tone.icon} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
      ) : null}

      <Text
        numberOfLines={1}
        style={[
          styles.label,
          { fontSize: metrics.fontSize, color: tone.text },
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

export const Badge = memo(BadgeComponent)

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: BorderWidths.hair,
    borderCurve: 'continuous',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: Typography.caption.fontFamily,
    letterSpacing: Tracking.t1,
  },
})
