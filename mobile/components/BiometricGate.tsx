import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  AppState,
  AppStateStatus,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { ScanFace, Fingerprint, ShieldCheck } from 'lucide-react-native'
import { useTheme, Fonts } from '@/constants/theme'
import {
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  authenticateWithBiometrics,
  getDeviceBiometricCapability,
  setSessionUnlocked,
  isSessionUnlockedState,
  BiometricCapability,
} from '@/lib/biometrics'

export function BiometricGate() {
  const { colors, theme } = useTheme()
  const [isLocked, setIsLocked] = useState(false)
  const [capability, setCapability] = useState<BiometricCapability | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const appState = useRef<AppStateStatus>(AppState.currentState)
  const lastBackgroundTime = useRef<number>(0)
  const isMounted = useRef(true)
  const hasAttemptedColdStart = useRef(false)

  const triggerAuth = useCallback(async () => {
    if (Platform.OS === 'web') {
      setIsLocked(false)
      setSessionUnlocked(true)
      return
    }

    setIsAuthenticating(true)
    const result = await authenticateWithBiometrics()

    if (!isMounted.current) return
    setIsAuthenticating(false)

    if (result.success) {
      setSessionUnlocked(true)
      setIsLocked(false)
    }
  }, [])

  // Cold Start verification
  useEffect(() => {
    isMounted.current = true

    async function checkColdStart() {
      if (Platform.OS === 'web') return

      const [enabled, deviceCap] = await Promise.all([
        isBiometricLockEnabled(),
        getDeviceBiometricCapability(),
      ])

      if (!isMounted.current) return
      setCapability(deviceCap)

      // If phone hardware is not supported or not enrolled, do not lock
      if (!deviceCap.supported || !deviceCap.enrolled) {
        setIsLocked(false)
        return
      }

      if (enabled && !isSessionUnlockedState()) {
        setIsLocked(true)

        if (!hasAttemptedColdStart.current) {
          hasAttemptedColdStart.current = true
          // Wait briefly for first paint
          setTimeout(() => {
            if (isMounted.current) {
              triggerAuth()
            }
          }, 300)
        }
      } else {
        setIsLocked(false)
      }
    }

    checkColdStart()

    // AppState listener: ONLY lock on true 'background' -> 'active' transition
    // NEVER on 'inactive' -> 'active' (which fires whenever system biometric modal closes)
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const prevState = appState.current

      if (nextState === 'background') {
        lastBackgroundTime.current = Date.now()
      } else if (prevState === 'background' && nextState === 'active') {
        const timeInBackground = Date.now() - lastBackgroundTime.current
        // Only lock if user actually left the app for more than 2.5 seconds
        if (timeInBackground > 2500) {
          const [enabled, devCap] = await Promise.all([
            isBiometricLockEnabled(),
            getDeviceBiometricCapability(),
          ])

          if (enabled && devCap.supported && devCap.enrolled && isMounted.current) {
            setSessionUnlocked(false)
            setIsLocked(true)
            setTimeout(() => {
              if (isMounted.current) {
                triggerAuth()
              }
            }, 250)
          }
        }
      }

      appState.current = nextState
    })

    return () => {
      isMounted.current = false
      subscription.remove()
    }
  }, [triggerAuth])

  // Emergency safety unlock. Requires a fresh biometric pass BEFORE disabling
  // the lock — otherwise the "emergency" path is a permanent, frictionless
  // bypass that anyone with the unlocked phone can use.
  const handleEmergencyDisable = () => {
    const biometryName = capability?.displayName || 'Biometrike'
    Alert.alert(
      `Çaktivizo Kyçjen (${biometryName})`,
      `Për siguri, verifikoni me ${biometryName} para se të çaktivizoni kyçjen. A dëshironi ta bëni?`,
      [
        { text: 'Anulo', style: 'cancel' },
        {
          text: 'Vazhdo',
          style: 'destructive',
          onPress: async () => {
            setIsAuthenticating(true)
            const result = await authenticateWithBiometrics(
              `Verifikoni me ${biometryName} për të çaktivizuar kyçjen`
            )
            if (!isMounted.current) return
            setIsAuthenticating(false)
            if (!result.success) return
            await setBiometricLockEnabled(false)
            setSessionUnlocked(true)
            setIsLocked(false)
          },
        },
      ]
    )
  }

  if (!isLocked) return null

  const isDark = theme !== 'white'
  const brandHighlight = theme === 'green' ? colors.gold : colors.primary
  const biometryName = capability?.displayName || 'Biometrike'

  const renderIcon = (size: number, color: string) => {
    if (capability?.iconName === 'face') {
      return <ScanFace size={size} color={color} strokeWidth={2} />
    }
    if (capability?.iconName === 'fingerprint') {
      return <Fingerprint size={size} color={color} strokeWidth={2} />
    }
    return <ShieldCheck size={size} color={color} strokeWidth={2} />
  }

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { backgroundColor: colors.background },
      ]}
      // The overlay blocks all pointer events to the screens underneath while
      // locked — otherwise a stack behind the gate stays tappable.
      pointerEvents="auto"
    >
      <View style={styles.contentWrap} pointerEvents="auto">
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 103, 91, 0.08)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 103, 91, 0.2)',
            },
          ]}
        >
          {renderIcon(54, brandHighlight)}
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Bleje Pronën është e kyçur
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Përdorni {biometryName} për të vërtetuar identitetin tuaj dhe për të vazhduar.
        </Text>

        <Pressable
          style={[
            styles.unlockButton,
            { backgroundColor: brandHighlight },
            isAuthenticating && { opacity: 0.7 },
          ]}
          onPress={triggerAuth}
          disabled={isAuthenticating}
          hitSlop={8}
        >
          {isAuthenticating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              {renderIcon(20, '#FFFFFF')}
              <Text style={styles.unlockButtonText}>
                Zhblloko me {biometryName}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={styles.fallbackButton}
          onPress={handleEmergencyDisable}
          hitSlop={8}
        >
          <Text style={[styles.fallbackButtonText, { color: colors.textMuted }]}>
            Nuk po funksionon? Çaktivizo kyçjen
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  contentWrap: {
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 21,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 52,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.bold,
    letterSpacing: 0.1,
  },
  fallbackButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  fallbackButtonText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    textDecorationLine: 'underline',
  },
})
