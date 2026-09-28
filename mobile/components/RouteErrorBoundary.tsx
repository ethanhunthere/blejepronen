import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { Fonts, useTheme } from '@/constants/theme'

/**
 * Route-level error isolation.
 *
 * Two exports, one visual language:
 *
 *  • `RouteErrorBoundary` — the *catch UI* handed to expo-router's
 *    `unstable_screenErrorBoundary` on the root `Stack` and the tab `Tabs`.
 *    The router wraps every leaf route in its own `Try`, so a screen that
 *    throws during render is replaced by this component **alone**: the
 *    navigation stack, the tab bar, the gesture handlers and every sibling
 *    screen stay mounted and keep animating. That is the whole point — the
 *    app-level `components/ErrorBoundary` can only offer "restart or go home",
 *    whereas this offers "retry just this screen" without losing the stack.
 *
 *  • `RouteErrorGuard` — a class boundary for sub-trees that are *not* routes
 *    and therefore not covered by the router's per-screen `Try`: the floating
 *    tab bar and the lazily-imported WebRTC call overlay. Both are rendered
 *    above every screen, so an unguarded throw in either takes the whole app
 *    down to the root boundary.
 *
 * Both render the same token-styled `ErrorState`, driven entirely by
 * `constants/theme` so it tracks the active white/green/black palette instead
 * of hard-coding the dark card the legacy boundary does.
 */

/** Props expo-router passes to a screen error boundary. */
export interface RouteErrorBoundaryProps {
  /** The error thrown while rendering the route. */
  error: Error
  /** Clears the router's error state and re-renders the route component. */
  retry: () => void | Promise<void>
  /** Optional label used in logs and the accessibility announcement. */
  routeLabel?: string
}

interface ErrorStateProps {
  error: Error
  /** Retry copy + handler. Omit to render a single "go home" action. */
  onRetry?: () => void
  retryLabel?: string
  /** Reset copy + handler. Defaults to replacing the stack with the home tabs. */
  onReset?: () => void
  resetLabel?: string
  /** Compact variant for chrome (tab bar) rather than a full-screen route. */
  compact?: boolean
  /** Rendered under the actions — used by `RouteErrorGuard` for a fallback. */
  children?: ReactNode
}

function fireErrorHaptic() {
  if (Platform.OS === 'web') return
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
}

function resetToHome() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  }
  try {
    router.replace('/(tabs)' as any)
  } catch {
    // The navigator may itself be gone; nothing left to do but stay put.
  }
}

/**
 * Token-styled error surface shared by both boundaries.
 * Matches the `+not-found` card grammar so a broken route reads as part of the
 * product rather than as a crash dialog.
 */
export function ErrorState({
  error,
  onRetry,
  retryLabel = 'Provo përsëri',
  onReset,
  resetLabel = 'Kthehu te Ballina',
  compact = false,
  children,
}: ErrorStateProps) {
  const { colors, theme } = useTheme()
  const insets = useSafeAreaInsets()
  const [showDetails, setShowDetails] = React.useState(false)

  const accent = theme === 'green' ? colors.gold : colors.primary
  const onAccent = theme === 'green' ? '#071C18' : theme === 'black' ? '#071A14' : '#FFFFFF'
  const message = error?.message || 'Ndodhi një problem i papritur në këtë faqe.'

  const handleReset = () => {
    if (onReset) {
      onReset()
      return
    }
    resetToHome()
  }

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background },
        compact ? styles.rootCompact : { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      accessibilityRole="alert"
      accessibilityLabel="Kjo faqe nuk mund të shfaqet"
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          compact && styles.cardCompact,
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor:
                theme === 'green' ? 'rgba(200, 184, 130, 0.16)' : colors.primaryLight,
            },
          ]}
        >
          <AlertTriangle size={compact ? 24 : 34} color={accent} strokeWidth={2.2} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: Fonts.extraBold }]}>
          {compact ? 'Pamja nuk u shfaq' : 'Ndodhi një gabim'}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: Fonts.regular }]}>
          {compact
            ? 'Kjo pjesë e ekranit hasi një problem. Të dhënat tuaja janë të sigurta.'
            : 'Kjo faqe hasi një problem gjatë shfaqjes. Pjesa tjetër e aplikacionit funksionon normalisht dhe të dhënat tuaja janë të sigurta.'}
        </Text>

        {!compact && (
          <View
            style={[
              styles.messageBox,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
            ]}
          >
            <Text style={[styles.messageText, { color: colors.textMuted }]} numberOfLines={3}>
              {message}
            </Text>
          </View>
        )}

        <View style={styles.actionColumn}>
          {onRetry ? (
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: accent, opacity: pressed ? 0.88 : 1 },
              ]}
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel={retryLabel}
            >
              <RefreshCw size={16} color={onAccent} strokeWidth={2.4} />
              <Text style={[styles.primaryBtnText, { color: onAccent, fontFamily: Fonts.bold }]}>
                {retryLabel}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleReset}
            accessibilityRole="button"
            accessibilityLabel={resetLabel}
          >
            <Home size={16} color={colors.textSecondary} strokeWidth={2.2} />
            <Text
              style={[styles.secondaryBtnText, { color: colors.textSecondary, fontFamily: Fonts.semiBold }]}
            >
              {resetLabel}
            </Text>
          </Pressable>
        </View>

        {children}

        {!compact && __DEV__ ? (
          <>
            <Pressable
              style={styles.detailsToggle}
              onPress={() => setShowDetails((prev) => !prev)}
              hitSlop={8}
            >
              <Text style={[styles.detailsToggleText, { color: accent, fontFamily: Fonts.semiBold }]}>
                {showDetails ? 'Fshih detajet teknike' : 'Shiko detajet teknike'}
              </Text>
            </Pressable>

            {showDetails ? (
              <ScrollView
                style={[styles.detailsScroll, { backgroundColor: colors.surfaceSubtle }]}
                nestedScrollEnabled
              >
                <Text style={[styles.detailsText, { color: colors.textMuted }]}>
                  {error?.stack || String(error)}
                </Text>
              </ScrollView>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  )
}

/**
 * Per-route catch UI for `unstable_screenErrorBoundary`.
 *
 * `retry` re-renders only the failed route; `reset` leaves it entirely and
 * replaces the stack with the home tabs. Both are always offered, because a
 * route that throws on mount will usually throw again on retry and the user
 * needs a way out that does not involve killing the app.
 */
export function RouteErrorBoundary({ error, retry, routeLabel }: RouteErrorBoundaryProps) {
  React.useEffect(() => {
    fireErrorHaptic()
    console.error(
      `[RouteErrorBoundary] Route render failed${routeLabel ? ` (${routeLabel})` : ''}:`,
      error
    )
  }, [error, routeLabel])

  const handleRetry = React.useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
    }
    // expo-router's `retry` returns a promise that resolves after the error
    // state is cleared and the route has re-rendered.
    void Promise.resolve(retry()).catch(() => {})
  }, [retry])

  return <ErrorState error={error} onRetry={handleRetry} />
}

interface RouteErrorGuardProps {
  children: ReactNode
  /** Optional custom fallback. Receives the error and a reset function. */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** Label used in the caught-error log. */
  label?: string
}

interface RouteErrorGuardState {
  error: Error | null
}

/**
 * Class boundary for non-route chrome (tab bar, call overlay, portals).
 * Render errors in those sub-trees are otherwise fatal because they sit above
 * every screen in the tree.
 */
export class RouteErrorGuard extends Component<RouteErrorGuardProps, RouteErrorGuardState> {
  public state: RouteErrorGuardState = { error: null }

  public static getDerivedStateFromError(error: Error): RouteErrorGuardState {
    return { error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[RouteErrorGuard${this.props.label ? `:${this.props.label}` : ''}] caught:`,
      error,
      errorInfo?.componentStack
    )
  }

  private reset = () => {
    this.setState({ error: null })
  }

  public render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) {
      // A fallback that throws must not take the app down with it.
      try {
        return this.props.fallback(error, this.reset)
      } catch (fallbackError) {
        console.error('[RouteErrorGuard] fallback render failed:', fallbackError)
        return null
      }
    }

    return (
      <ErrorState
        error={error}
        onRetry={this.reset}
        compact
      />
    )
  }
}

/**
 * Minimal, dependency-light fallback for the floating tab bar.
 *
 * If the liquid-glass bar throws, losing navigation entirely would strand the
 * user, so `RouteErrorGuard` swaps in this static row: same five destinations,
 * same order, token colours, no blur/gradient/animation to re-throw.
 */
export function StaticTabBarFallback({
  routes,
  activeIndex,
  onNavigate,
  unreadCount = 0,
}: {
  routes: Array<{ key: string; name: string }>
  activeIndex: number
  onNavigate: (name: string) => void
  unreadCount?: number
}) {
  const { colors, theme } = useTheme()
  const insets = useSafeAreaInsets()
  const accent = theme === 'green' ? colors.gold : colors.primary

  return (
    <View
      style={[
        styles.staticBar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
      testID="tab-bar-fallback"
    >
      {routes.map((route, index) => {
        const focused = index === activeIndex
        const label = STATIC_TAB_LABELS[route.name] ?? route.name
        return (
          <Pressable
            key={route.key}
            onPress={() => onNavigate(route.name)}
            style={styles.staticTabItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
          >
            <Text
              style={[
                styles.staticTabLabel,
                {
                  color: focused ? accent : colors.textMuted,
                  fontFamily: focused ? Fonts.bold : Fonts.medium,
                },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {route.name === 'messages' && unreadCount > 0 ? (
              <View style={[styles.staticBadge, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.staticBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        )
      })}
    </View>
  )
}

const STATIC_TAB_LABELS: Record<string, string> = {
  index: 'Eksploro',
  listings: 'Pronat',
  post: 'Posto',
  messages: 'Mesazhe',
  profile: 'Profili',
}

/** Neutral pending state for a guard that has nothing meaningful to show. */
export function RouteErrorFallbackSilent() {
  return null
}

/** Spinner used where a guard needs to hold space while a lazy chunk loads. */
export function RouteErrorPending() {
  const { colors } = useTheme()
  return (
    <View style={styles.pendingWrap}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  rootCompact: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardCompact: {
    padding: 18,
    borderRadius: 18,
    gap: 8,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 21,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19.5,
    marginBottom: 4,
  },
  messageBox: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 11.5,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionColumn: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 14.5,
  },
  secondaryBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 13.5,
  },
  detailsToggle: {
    marginTop: 6,
    paddingVertical: 6,
  },
  detailsToggleText: {
    fontSize: 12,
  },
  detailsScroll: {
    width: '100%',
    maxHeight: 150,
    borderRadius: 10,
    padding: 10,
  },
  detailsText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  staticBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  staticTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  staticTabLabel: {
    fontSize: 11,
  },
  staticBadge: {
    position: 'absolute',
    top: 0,
    right: '28%',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  staticBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: Fonts.bold,
  },
  pendingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
