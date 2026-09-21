import React, { createContext, useContext, useState, useRef, useCallback } from 'react'
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
  const translateY = useRef(new Animated.Value(-120)).current
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.94)).current
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hideBanner = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.94,
        duration: 220,
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

      translateY.setValue(-120)
      opacity.setValue(0)
      scale.setValue(0.94)

      const duration = options.duration || (options.type === 'delete' ? 4500 : 3800)

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 9.5,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 9.5,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start()

      timerRef.current = setTimeout(() => {
        hideBanner()
      }, duration)
    },
    [translateY, opacity, scale, hideBanner]
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
            friction: 8,
            tension: 60,
            useNativeDriver: true,
          }).start()
        }
      },
    })
  ).current

  // Optimal Dynamic Island & notch clearance
  const topPosition = Math.max(insets.top + 8, 16)

  // Badge metadata based on banner type
  const getBadgeMeta = () => {
    if (!banner) return null
    switch (banner.type) {
      case 'delete':
        return {
          label: 'LLOGARIA U FSHI',
          accent: '#EF4444',
          bg: theme === 'white' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.16)',
          border: 'rgba(239, 68, 68, 0.30)',
          icon: ShieldAlert,
        }
      case 'logout':
        return {
          label: 'SESIONI U MBYLL',
          accent: theme === 'green' ? colors.gold : colors.primary,
          bg: theme === 'green' ? 'rgba(212, 175, 55, 0.14)' : 'rgba(0, 103, 91, 0.10)',
          border: theme === 'green' ? 'rgba(212, 175, 55, 0.28)' : 'rgba(0, 103, 91, 0.22)',
          icon: LogOut,
        }
      case 'success':
        return {
          label: 'VEPRIMI U KRYE',
          accent: theme === 'green' ? colors.gold : '#10B981',
          bg: theme === 'green' ? 'rgba(212, 175, 55, 0.14)' : 'rgba(16, 185, 129, 0.10)',
          border: theme === 'green' ? 'rgba(212, 175, 55, 0.28)' : 'rgba(16, 185, 129, 0.22)',
          icon: ShieldCheck,
        }
      case 'error':
        return {
          label: 'VËREJTJE E SISTEMIT',
          accent: '#EF4444',
          bg: theme === 'white' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.16)',
          border: 'rgba(239, 68, 68, 0.30)',
          icon: AlertCircle,
        }
      default:
        return {
          label: 'NJOFTIM',
          accent: theme === 'green' ? colors.gold : colors.primary,
          bg: theme === 'green' ? 'rgba(212, 175, 55, 0.14)' : 'rgba(0, 103, 91, 0.10)',
          border: theme === 'green' ? 'rgba(212, 175, 55, 0.28)' : 'rgba(0, 103, 91, 0.22)',
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
          <View style={[styles.iconBox, { backgroundColor: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.4)' }]}>
            <Trash2 size={18} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        )
      case 'logout':
        return (
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: theme === 'green' ? colors.gold : colors.primary,
                borderColor: theme === 'green' ? 'rgba(212, 175, 55, 0.4)' : 'rgba(0, 103, 91, 0.3)',
              },
            ]}
          >
            <LogOut
              size={17}
              color={theme === 'green' ? '#071C18' : '#FFFFFF'}
              strokeWidth={2.2}
            />
          </View>
        )
      case 'success':
        return (
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: theme === 'green' ? colors.gold : '#10B981',
                borderColor: theme === 'green' ? 'rgba(212, 175, 55, 0.4)' : 'rgba(16, 185, 129, 0.3)',
              },
            ]}
          >
            <CheckCircle2
              size={18}
              color={theme === 'green' ? '#071C18' : '#FFFFFF'}
              strokeWidth={2.4}
            />
          </View>
        )
      case 'error':
        return (
          <View style={[styles.iconBox, { backgroundColor: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.4)' }]}>
            <AlertCircle size={18} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        )
      default:
        return (
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: theme === 'green' ? colors.gold : colors.primary,
                borderColor: theme === 'green' ? 'rgba(212, 175, 55, 0.4)' : 'rgba(0, 103, 91, 0.3)',
              },
            ]}
          >
            <Info
              size={18}
              color={theme === 'green' ? '#071C18' : '#FFFFFF'}
              strokeWidth={2.2}
            />
          </View>
        )
    }
  }

  const isDark = theme === 'black' || theme === 'green'

  const cardBackdrop =
    theme === 'white'
      ? 'rgba(255, 255, 255, 0.94)'
      : theme === 'green'
      ? 'rgba(4, 28, 24, 0.95)'
      : 'rgba(16, 20, 20, 0.95)'

  const specularBorderColor =
    banner?.type === 'delete'
      ? 'rgba(239, 68, 68, 0.35)'
      : banner?.type === 'error'
      ? 'rgba(239, 68, 68, 0.30)'
      : banner?.type === 'logout'
      ? theme === 'green'
        ? 'rgba(212, 175, 55, 0.35)'
        : 'rgba(0, 103, 91, 0.25)'
      : theme === 'white'
      ? 'rgba(0, 0, 0, 0.08)'
      : theme === 'green'
      ? 'rgba(212, 175, 55, 0.32)'
      : 'rgba(255, 255, 255, 0.12)'

  const specularHighlightColor =
    banner?.type === 'delete'
      ? 'rgba(239, 68, 68, 0.30)'
      : isDark
      ? theme === 'green'
        ? 'rgba(212, 175, 55, 0.20)'
        : 'rgba(255, 255, 255, 0.16)'
      : 'rgba(255, 255, 255, 0.90)'

  return (
    <BannerContext.Provider value={{ showBanner, hideBanner }}>
      {children}

      <View
        style={[
          StyleSheet.absoluteFill,
          styles.portalRoot,
        ]}
        pointerEvents="box-none"
      >
        {banner && (
          <Animated.View
            style={[
              styles.bannerPositioner,
              {
                top: topPosition,
                transform: [{ translateY }, { scale }],
                opacity,
              },
            ]}
            pointerEvents="box-none"
          >
            <View
              {...panResponder.panHandlers}
              style={styles.bannerCenterWrapper}
              pointerEvents="auto"
            >
              <Pressable
                onPress={hideBanner}
                style={({ pressed }) => [
                  styles.bannerCard,
                  {
                    backgroundColor: cardBackdrop,
                    borderColor: specularBorderColor,
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                  },
                ]}
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
              >
                {/* Frosted Glass Blur */}
                <BlurView
                  intensity={Platform.OS === 'ios' ? 85 : 100}
                  tint={isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />

                {/* Top Specular Hairline Highlight (Authentic Optical Refraction) */}
                <View
                  style={[
                    styles.specularHighlight,
                    { backgroundColor: specularHighlightColor },
                  ]}
                />

                {/* Main Content Row */}
                <View style={styles.mainRow}>
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
                              ? 'rgba(255, 255, 255, 0.82)'
                              : colors.textSecondary,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {banner.message}
                    </Text>
                  </View>

                  {/* Tactile Close Touchpoint */}
                  <Pressable
                    onPress={hideBanner}
                    style={[
                      styles.closeBtn,
                      {
                        backgroundColor:
                          isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                        borderColor:
                          isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                      },
                    ]}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Mbyll njoftimin"
                  >
                    <X
                      size={13}
                      color={isDark ? 'rgba(255, 255, 255, 0.70)' : colors.textMuted}
                      strokeWidth={2.4}
                    />
                  </Pressable>
                </View>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
    </BannerContext.Provider>
  )
}

const styles = StyleSheet.create({
  portalRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    elevation: 999999,
  },
  bannerPositioner: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  bannerCenterWrapper: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 20,
  },
  bannerCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  specularHighlight: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 13,
    paddingBottom: 13,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    gap: 2.5,
    paddingRight: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14.5,
    fontFamily: Fonts.bold,
    letterSpacing: -0.25,
    lineHeight: 18.5,
  },
  message: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    lineHeight: 17,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
})
