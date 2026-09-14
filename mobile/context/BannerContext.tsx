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
  Info,
  LogOut,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'

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
  const scale = useRef(new Animated.Value(0.95)).current
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hideBanner = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.94,
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

      // Haptic feedback tailored to the action type
      if (Platform.OS !== 'web') {
        if (options.type === 'success') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } else if (options.type === 'error') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        } else if (options.type === 'delete') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        }
      }

      translateY.setValue(-120)
      opacity.setValue(0)
      scale.setValue(0.92)

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 50,
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
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start()

      const timeoutDuration = options.duration || 3800
      timerRef.current = setTimeout(() => {
        hideBanner()
      }, timeoutDuration)
    },
    [translateY, opacity, scale, hideBanner]
  )

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -10) {
          hideBanner()
        }
      },
    })
  ).current

  const topPosition = insets.top > 0 ? insets.top + 6 : 14

  const renderIcon = () => {
    if (!banner) return null

    switch (banner.type) {
      case 'success':
        return (
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor:
                  theme === 'green'
                    ? 'rgba(200, 184, 130, 0.22)'
                    : 'rgba(0, 100, 89, 0.14)',
              },
            ]}
          >
            <CheckCircle2
              size={20}
              color={theme === 'green' ? colors.gold : colors.primary}
              strokeWidth={2.4}
            />
          </View>
        )
      case 'error':
        return (
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.16)' }]}>
            <AlertCircle size={20} color="#EF4444" strokeWidth={2.4} />
          </View>
        )
      case 'logout':
        return (
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor:
                  theme === 'green'
                    ? 'rgba(255, 255, 255, 0.16)'
                    : 'rgba(0, 100, 89, 0.12)',
              },
            ]}
          >
            <LogOut
              size={18}
              color={theme === 'green' ? '#FFFFFF' : colors.primary}
              strokeWidth={2.2}
            />
          </View>
        )
      case 'delete':
        return (
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.20)' }]}>
            <Trash2 size={18} color="#EF4444" strokeWidth={2.4} />
          </View>
        )
      case 'info':
      default:
        return (
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor:
                  theme === 'green'
                    ? 'rgba(200, 184, 130, 0.20)'
                    : 'rgba(0, 100, 89, 0.12)',
              },
            ]}
          >
            <Sparkles
              size={18}
              color={theme === 'green' ? colors.gold : colors.primary}
              strokeWidth={2.2}
            />
          </View>
        )
    }
  }

  const specularBorderColor =
    theme === 'white'
      ? 'rgba(0, 0, 0, 0.10)'
      : theme === 'green'
      ? 'rgba(255, 255, 255, 0.22)'
      : 'rgba(255, 255, 255, 0.15)'

  const cardBackdrop =
    theme === 'white'
      ? 'rgba(255, 255, 255, 0.90)'
      : theme === 'green'
      ? 'rgba(0, 60, 54, 0.88)'
      : 'rgba(20, 26, 25, 0.92)'

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
              <BlurView
                intensity={Platform.OS === 'ios' ? 85 : 100}
                tint={colors.blurTint}
                style={StyleSheet.absoluteFill}
              />

              {/* Icon Container */}
              {renderIcon()}

              {/* Text Information */}
              <View style={styles.textContainer}>
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

              {/* Dismiss Button */}
              <View style={styles.closeBtn}>
                <X
                  size={15}
                  color={theme === 'green' ? 'rgba(255, 255, 255, 0.6)' : colors.textMuted}
                  strokeWidth={2.4}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  bannerPressable: {
    width: '100%',
    maxWidth: 480,
  },
  bannerCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 0.5,
    overflow: 'hidden',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 1.5,
  },
  title: {
    fontSize: 14.5,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    lineHeight: 16.5,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
  },
})
