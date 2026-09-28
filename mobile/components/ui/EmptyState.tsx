import React, { memo } from 'react'
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import {
  BorderWidths,
  Fonts,
  FontSizes,
  Radii,
  Spacing,
  Tracking,
  Typography,
  useTheme,
} from '@/constants/theme'

/**
 * Anything renderable as a single monochrome glyph that this primitive can
 * size and tint. Structurally compatible with `lucide-react-native` icons
 * (the app's icon set) and with any custom `(props) => ReactElement` SVG
 * wrapper, so callers are not locked to one icon library.
 */
export type IconComponent = React.ComponentType<{
  size?: number | string
  color?: string
  strokeWidth?: number | string
}>

export interface EmptyStateProps {
  title: string
  /** Optional supporting line under the title. */
  message?: string
  /** Leading glyph, rendered inside a tinted disc. Omit for a text-only state. */
  icon?: IconComponent
  /** Renders a primary action button. Ignored without `onAction`. */
  actionLabel?: string
  onAction?: () => void
  /** Tighter padding and a smaller disc for inline / in-list placement. */
  compact?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Pressed feedback is an opacity dip, not a colour swap — theme-independent. */
const PRESSED_OPACITY = 0.82
const MESSAGE_MAX_WIDTH = 320
const ICON_STROKE_WIDTH = 1.75

/**
 * Neutral "nothing here yet" placeholder.
 *
 * Deliberately stateless and free of motion, blur and imagery: it renders
 * inside scrolling feeds and empty tabs, where a heavy view is the last thing
 * you want. The title is exposed as a header so a screen-reader user can jump
 * straight to why the list is empty, and the icon disc is hidden from the
 * accessibility tree because it only restates the title.
 */
function EmptyStateComponent({
  title,
  message,
  icon: Icon,
  actionLabel,
  onAction,
  compact = false,
  style,
  testID,
}: EmptyStateProps) {
  const { semantic, shadows } = useTheme()

  const discSize = compact ? Spacing.s44 : Spacing.s60
  const iconSize = compact ? Spacing.s20 : Spacing.s26
  const showAction = Boolean(actionLabel && onAction)

  const handleActionPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync()
    }
    onAction?.()
  }

  return (
    <View
      testID={testID}
      style={[styles.container, compact && styles.containerCompact, style]}
    >
      {Icon ? (
        <View
          style={[
            styles.iconDisc,
            {
              width: discSize,
              height: discSize,
              borderRadius: discSize / 2,
              backgroundColor: semantic.surfaceMuted,
              borderColor: semantic.border,
              borderWidth: BorderWidths.thin,
            },
          ]}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Icon
            size={iconSize}
            color={semantic.textSubtle}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </View>
      ) : null}

      <Text
        accessibilityRole="header"
        style={[styles.title, compact && styles.titleCompact, { color: semantic.text }]}
        numberOfLines={2}
      >
        {title}
      </Text>

      {message ? (
        <Text
          style={[
            styles.message,
            compact && styles.messageCompact,
            { color: semantic.textMuted },
          ]}
        >
          {message}
        </Text>
      ) : null}

      {showAction ? (
        <Pressable
          onPress={handleActionPress}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityState={{ disabled: false }}
          hitSlop={Spacing.s8}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: semantic.primary,
              borderRadius: Radii.r12,
              ...shadows.sm,
            },
            pressed && styles.actionPressed,
          ]}
        >
          <Text style={[styles.actionLabel, { color: semantic.textInverse }]} numberOfLines={1}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export const EmptyState = memo(EmptyStateComponent)

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.s24,
    paddingVertical: Spacing.s48,
    gap: Spacing.s10,
  },
  containerCompact: {
    paddingHorizontal: Spacing.s16,
    paddingVertical: Spacing.s24,
    gap: Spacing.s6,
  },
  iconDisc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
    marginBottom: Spacing.s2,
  },
  title: {
    ...Typography.headlineLg,
    textAlign: 'center',
  },
  titleCompact: {
    ...Typography.callout,
  },
  message: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.subheadLg,
    letterSpacing: Tracking.t1_5,
    lineHeight: Math.round(FontSizes.subheadLg * 1.4),
    textAlign: 'center',
    maxWidth: MESSAGE_MAX_WIDTH,
  },
  messageCompact: {
    fontSize: FontSizes.subhead,
    lineHeight: Math.round(FontSizes.subhead * 1.35),
  },
  action: {
    marginTop: Spacing.s8,
    paddingHorizontal: Spacing.s18,
    paddingVertical: Spacing.s10,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  actionPressed: {
    opacity: PRESSED_OPACITY,
  },
  actionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.subhead,
    letterSpacing: Tracking.t2,
  },
})
