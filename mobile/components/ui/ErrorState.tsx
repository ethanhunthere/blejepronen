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
import { TriangleAlert } from 'lucide-react-native'
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
import type { IconComponent } from './EmptyState'

export interface ErrorStateProps {
  /** What failed, in user language. Never render a raw exception string here. */
  message: string
  /** Defaults to the app's standard alert heading. */
  title?: string
  icon?: IconComponent
  /** Omit to render a read-only error with no recovery affordance. */
  onRetry?: () => void
  retryLabel?: string
  compact?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

const PRESSED_OPACITY = 0.7
const MESSAGE_MAX_WIDTH = 320
const ICON_STROKE_WIDTH = 1.9

/**
 * Failure placeholder with a retry affordance.
 *
 * The root carries `accessibilityRole="alert"` and is grouped into a single
 * accessible element, so assistive tech announces "Gabim. <message>" the
 * moment the failure paints instead of leaving the user facing a blank list.
 * The retry control is a real `button` role with its own label.
 *
 * Like `EmptyState` this is motion-free and blur-free — an error surface is
 * usually painted over a half-loaded feed, which is exactly when the frame
 * budget is tightest.
 */
function ErrorStateComponent({
  message,
  title = 'Gabim',
  icon: Icon = TriangleAlert,
  onRetry,
  retryLabel = 'Provo përsëri',
  compact = false,
  style,
  testID,
}: ErrorStateProps) {
  const { semantic, shadows } = useTheme()

  const discSize = compact ? Spacing.s40 : Spacing.s52
  const iconSize = compact ? Spacing.s18 : Spacing.s24

  const handleRetry = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onRetry?.()
  }

  return (
    <View
      testID={testID}
      style={[styles.container, compact && styles.containerCompact, style]}
    >
      {/*
        The alert copy is grouped into ONE accessible element so it is
        announced as a single urgent message. The retry control is deliberately
        kept *outside* that group: `accessible` on an ancestor hides its
        descendants from VoiceOver/TalkBack, which would have made the only
        recovery affordance unreachable.
      */}
      <View
        style={styles.alertGroup}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={`${title}. ${message}`}
      >
        {Icon ? (
          <View
            style={[
              styles.iconDisc,
              {
                width: discSize,
                height: discSize,
                borderRadius: discSize / 2,
                backgroundColor: semantic.dangerMuted,
                borderColor: semantic.dangerBorder,
                borderWidth: BorderWidths.thin,
              },
            ]}
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Icon
              size={iconSize}
              color={semantic.dangerText}
              strokeWidth={ICON_STROKE_WIDTH}
            />
          </View>
        ) : null}

        <Text
          style={[styles.title, compact && styles.titleCompact, { color: semantic.text }]}
          numberOfLines={2}
        >
          {title}
        </Text>

        <Text
          style={[styles.message, compact && styles.messageCompact, { color: semantic.textMuted }]}
        >
          {message}
        </Text>
      </View>

      {onRetry ? (
        <Pressable
          onPress={handleRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          accessibilityState={{ disabled: false }}
          hitSlop={Spacing.s8}
          style={({ pressed }) => [
            styles.retry,
            {
              backgroundColor: semantic.surface,
              borderColor: semantic.borderStrong,
              borderRadius: Radii.r12,
              ...shadows.xs,
            },
            pressed && styles.retryPressed,
          ]}
        >
          <Text style={[styles.retryLabel, { color: semantic.text }]} numberOfLines={1}>
            {retryLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export const ErrorState = memo(ErrorStateComponent)

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.s24,
    paddingVertical: Spacing.s40,
    gap: Spacing.s10,
  },
  containerCompact: {
    paddingHorizontal: Spacing.s16,
    paddingVertical: Spacing.s24,
    gap: Spacing.s8,
  },
  alertGroup: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s8,
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
  retry: {
    paddingHorizontal: Spacing.s18,
    paddingVertical: Spacing.s10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BorderWidths.thin,
    borderCurve: 'continuous',
  },
  retryPressed: {
    opacity: PRESSED_OPACITY,
  },
  retryLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.subhead,
    letterSpacing: Tracking.t2,
  },
})
