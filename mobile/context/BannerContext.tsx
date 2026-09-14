import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  PanResponder,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  CheckCircle2,
  AlertCircle,
  LogOut,
  Trash2,
  X,
  ShieldAlert,
  ShieldCheck,
  Info,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { playSuccessSound, playDeleteSound, playUnlikeSound, playTapSound } from '@/lib/sound'

export type BannerType = 'success' | 'error' | 'info' | 'logout' | 'delete'

export interface BannerOptions {
  type: BannerType
  title: string
  message: string
  duration?: number
}

interface BannerContextValue {
  showBanner: (options: BannerOptions) => void
  hideBanner: () => void
}

const BannerContext = createContext<BannerContextValue>({
  showBanner: () => {},
  hideBanner: () => {},
})

export const useBanner = () => useContext(BannerContext)

export function BannerProvider({ children }: { children: React.ReactNode }) {
  const { colors, theme } = useTheme()
  const insets = useSafeAreaInsets()

  const [banner, setBanner] = useState<BannerOptions | null>(null)
  const translateY = useRef(new Animated.Value(-160)).current
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.92)).current
  const progressAnim = useRef(new Animated.Value(1)).current
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hideBanner = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -160,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.92,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setBanner(null)
    })
  }, [translateY, opacity, scale])

  const showBanner = useCallback(
    (options: BannerOptions) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      setBanner(options)

      // Apple-tier tailored tactile haptic & acoustic audio feedback
      if (options.type === 'delete') {
        playDeleteSound()
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        }
      } else if (options.type === 'error') {
        playUnlikeSound()
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        }
      } else if (options.type === 'success') {
        playSuccessSound()
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }
      } else if (options.type === 'logout') {
        playUnlikeSound()
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        }
      } else {
        playTapSound()
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }
      }

      translateY.setValue(-160)
      opacity.setValue(0)
      scale.setValue(0.92)
      progressAnim.setValue(1)

      const duration = options.duration || (options.type === 'delete' ? 4500 : 3800)

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 55,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 55,
          useNativeDriver: true,
        }),
      ]).start()

      // Progress bar animation
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: duration,
        useNativeDriver: false,
      }).start()

      timerRef.current = setTimeout(() => {
        hideBanner()
      }, duration)
    },
    [translateY, opacity, scale, progressAnim, hideBanner]
  )

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 4
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -15 || gestureState.vy < -0.5) {
          hideBanner()
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            friction: 7,
            useNativeDriver: true,
          }).start()
        }
      },
    })
  ).current

  const topPosition = insets.top > 0 ? insets.top + 6 : 14

  // Badge metadata based on banner type
  const getBadgeMeta = () => {
    if (!banner) return null
    switch (banner.type) {
      case 'delete':
        return {
          label: 'LLOGARIA U FSHI',
          accent: '#EF4444',
          bg: 'rgba(239, 68, 68, 0.14)',
          border: 'rgba(239, 68, 68, 0.35)',
          icon: ShieldAlert,
        }
      case 'logout':
        return {
          label: 'SESIONI U MBYLL',
          accent: theme === 'green' ? colors.gold : colors.primary,
          bg: theme === 'green' ? 'rgba(200, 184, 130, 0.18)' : 'rgba(0, 100, 89, 0.12)',
          border: theme === 'green' ? 'rgba(200, 184, 130, 0.3)' : 'rgba(0, 100, 89, 0.25)',
          icon: LogOut,
        }
      case 'success':
        return {
          label: 'VEPRIMI U KRYE',
          accent: theme === 'green' ? colors.gold : '#10B981',
          bg: theme === 'green' ? 'rgba(200, 184, 130, 0.18)' : 'rgba(16, 185, 129, 0.12)',
          border: theme === 'green' ? 'rgba(200, 184, 130, 0.3)' : 'rgba(16, 185, 129, 0.25)',
          icon: ShieldCheck,
        }
      case 'error':
        return {
          label: 'VËREJTJE E SISTEMIT',
          accent: '#EF4444',
          bg: 'rgba(239, 68, 68, 0.14)',
          border: 'rgba(239, 68, 68, 0.35)',
          icon: AlertCircle,
        }
      default:
        return {
          label: 'NJOFTIM',
          accent: theme === 'green' ? colors.gold : colors.primary,
          bg: theme === 'green' ? 'rgba(200, 184, 130, 0.18)' : 'rgba(0, 100, 89, 0.12)',
          border: theme === 'green' ? 'rgba(200, 184, 130, 0.3)' : 'rgba(0, 100, 89, 0.25)',
          icon: Info,
        }
    }
  }

  const badgeMeta = getBadgeMeta()

  const renderIcon = () => {
    if (!banner) return null

    switch (banner.type) {
      case 'delete':
        return (
          <View style={[styles.iconHalo, { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.14)' }]}>
            <View style={[styles.iconInner, { backgroundColor: '#EF4444' }]}>
              <Trash2 size={18} color="#FFFFFF" strokeWidth={2.4} />
            </View>
          </View>
        )
      case 'logout':
        return (
          <View
            style={[
              styles.iconHalo,
              {
                borderColor:
                  theme === 'green' ? 'rgba(200, 184, 130, 0.35)' : 'rgba(0, 100, 89, 0.25)',
                backgroundColor:
                  theme === 'green' ? 'rgba(200, 184, 130, 0.15)' : 'rgba(0, 100, 89, 0.12)',
              },
            ]}
          >
            <View
              style={[
                styles.iconInner,
                { backgroundColor: theme === 'green' ? colors.gold : colors.primary },
              ]}
            >
              <LogOut
                size={17}
                color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                strokeWidth={2.4}
              />
            </View>
          </View>
        )
      case 'success':
        return (
          <View
            style={[
              styles.iconHalo,
              {
                borderColor:
                  theme === 'green' ? 'rgba(200, 184, 130, 0.35)' : 'rgba(16, 185, 129, 0.25)',
                backgroundColor:
                  theme === 'green' ? 'rgba(200, 184, 130, 0.15)' : 'rgba(16, 185, 129, 0.12)',
              },
            ]}
          >
            <View
              style={[
                styles.iconInner,
                { backgroundColor: theme === 'green' ? colors.gold : '#10B981' },
              ]}
            >
              <CheckCircle2
                size={18}
                color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                strokeWidth={2.4}
              />
            </View>
          </View>
        )
      case 'error':
        return (
          <View style={[styles.iconHalo, { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.14)' }]}>
            <View style={[styles.iconInner, { backgroundColor: '#EF4444' }]}>
              <AlertCircle size={18} color="#FFFFFF" strokeWidth={2.4} />
            </View>
          </View>
        )
      default:
        return (
          <View
            style={[
              styles.iconHalo,
              {
                borderColor:
                  theme === 'green' ? 'rgba(200, 184, 130, 0.35)' : 'rgba(0, 100, 89, 0.25)',
                backgroundColor:
                  theme === 'green' ? 'rgba(200, 184, 130, 0.15)' : 'rgba(0, 100, 89, 0.12)',
              },
            ]}
          >
            <View
              style={[
                styles.iconInner,
                { backgroundColor: theme === 'green' ? colors.gold : colors.primary },
              ]}
            >
              <Info
                size={18}
                color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                strokeWidth={2.4}
              />
            </View>
          </View>
        )
    }
  }

  // Apple frosted glass styling
  const isDark = theme === 'black' || theme === 'green'

  const cardBackdrop =
    theme === 'white'
      ? 'rgba(255, 255, 255, 0.88)'
      : theme === 'green'
      ? 'rgba(0, 52, 47, 0.88)'
      : 'rgba(18, 24, 23, 0.90)'

  const specularBorderColor =
    banner?.type === 'delete'
      ? 'rgba(239, 68, 68, 0.38)'
      : banner?.type === 'logout'
      ? theme === 'green'
        ? 'rgba(200, 184, 130, 0.45)'
        : 'rgba(0, 100, 89, 0.35)'
      : theme === 'white'
      ? 'rgba(0, 0, 0, 0.12)'
      : 'rgba(255, 255, 255, 0.22)'

  return (
    <BannerContext.Provider value={{ showBanner, hideBanner }}>
      {children}

      {banner && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.bannerContainer,
            {
              top: topPosition,
              transform: [{ translateY }, { scale }],
              opacity,
            },
          ]}
        >
          <Pressable onPress={hideBanner} style={styles.bannerPressable}>
            <View
              style={[
                styles.bannerCard,
                {
                  backgroundColor: cardBackdrop,
                  borderColor: specularBorderColor,
                },
              ]}
            >
              {/* Apple Frosted Glass Blur */}
              <BlurView
                intensity={Platform.OS === 'ios' ? 95 : 100}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />

              {/* Top Specular Hairline Highlight (Apple Glass Physics) */}
              <View
                style={[
                  styles.specularHighlight,
                  {
                    backgroundColor:
                      banner.type === 'delete'
                        ? 'rgba(239, 68, 68, 0.35)'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.22)'
                        : 'rgba(255, 255, 255, 0.75)',
                  },
                ]}
              />

              {/* Main Content Row */}
              <View style={styles.mainRow}>
                {/* Icon Halo */}
                {renderIcon()}

                {/* Text Block */}
                <View style={styles.textContainer}>
                  {badgeMeta && (
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.badgePill,
                          {
                            backgroundColor: badgeMeta.bg,
                            borderColor: badgeMeta.border,
                          },
                        ]}
                      >
                        <badgeMeta.icon size={10} color={badgeMeta.accent} strokeWidth={2.6} />
                        <Text style={[styles.badgeText, { color: badgeMeta.accent }]}>
                          {badgeMeta.label}
                        </Text>
                      </View>
                    </View>
                  )}

                  <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                    {banner.title}
                  </Text>

                  <Text
                    style={[
                      styles.message,
                      {
                        color:
                          theme === 'green'
                            ? 'rgba(255, 255, 255, 0.88)'
                            : colors.textSecondary,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {banner.message}
                  </Text>
                </View>

                {/* Dismiss Touch Area */}
                <Pressable
                  onPress={hideBanner}
                  style={[
                    styles.closeBtn,
                    {
                      backgroundColor:
                        isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.05)',
                    },
                  ]}
                  hitSlop={8}
                >
                  <X
                    size={14}
                    color={isDark ? 'rgba(255, 255, 255, 0.75)' : colors.textMuted}
                    strokeWidth={2.4}
                  />
                </Pressable>
              </View>

              {/* Apple Auto-Dismiss Countdown Bar */}
              <View style={styles.progressBarTrack}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor:
                        banner.type === 'delete'
                          ? '#EF4444'
                          : banner.type === 'logout'
                          ? theme === 'green' ? colors.gold : colors.primary
                          : banner.type === 'success'
                          ? theme === 'green' ? colors.gold : '#10B981'
                          : colors.primary,
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </BannerContext.Provider>
  )
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 12,
  },
  bannerPressable: {
    width: '100%',
    maxWidth: 500,
  },
  bannerCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  specularHighlight: {
    height: 1,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 13,
  },
  iconHalo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  iconInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 3,
    paddingRight: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  badgeText: {
    fontSize: 9.5,
    fontFamily: Fonts.extraBold,
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    lineHeight: 17,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  progressBarTrack: {
    height: 2.5,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
})
