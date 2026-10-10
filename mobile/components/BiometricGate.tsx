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
  getDevicePosture,
  setSessionUnlocked,
  isSessionUnlockedState,
  BiometricCapability,
  DevicePosture,
} from '@/lib/biometrics'

interface BiometricGateProps {
  active?: boolean
  onColdStartResolved?: () => void
}

export function BiometricGate({ active = true, onColdStartResolved }: BiometricGateProps) {
  const { colors, theme } = useTheme()
  const [isLocked, setIsLocked] = useState(false)
  const [capability, setCapability] = useState<BiometricCapability | null>(null)
  // What THIS lock demands: biometric vs device credential (device posture at
  // the moment the lock engaged). Drives prompt wording and verification path.
  const [lockPosture, setLockPosture] = useState<'biometric' | 'credential'>('biometric')
  const lockPostureRef = useRef<'biometric' | 'credential'>('biometric')
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const appState = useRef<AppStateStatus>(AppState.currentState)
  const lastBackgroundTime = useRef<number>(0)
  const isMounted = useRef(true)
  const hasAttemptedColdStart = useRef(false)
  const [relockTick, setRelockTick] = useState(0)
  const onColdStartResolvedRef = useRef(onColdStartResolved)
  onColdStartResolvedRef.current = onColdStartResolved

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const triggerAuth = useCallback(async () => {
    if (Platform.OS === 'web') {
      setIsLocked(false)
      setSessionUnlocked(true)
      return
    }

    setIsAuthenticating(true)
    const message =
      lockPostureRef.current === 'credential'
        ? 'Vendosni kodin e ekranit për të hapur Bleje Pronën'
        : undefined
    const result = await authenticateWithBiometrics(message)

    if (!isMounted.current) return
    setIsAuthenticating(false)

    if (result.success) {
      setSessionUnlocked(true)
      setIsLocked(false)
    }
  }, [])

  // Cold Start verification — runs at mount, under the opaque splash veil, so
  // the lock state is known before the handoff finishes. SecureStore/posture
  // reads are raced with a timeout: fail-open rather than hang launch behind F3.
  //
  // Posture-driven lock decision (mirrors the OS, not our cached capability):
  // - lock enabled + any device security (biometric OR credential) -> LOCK
  // - lock enabled + device has no security at all -> no gate (nothing to verify)
  // - lock disabled -> no gate
  useEffect(() => {
    let cancelled = false

    async function checkColdStart() {
      try {
        if (Platform.OS === 'web') {
          if (!cancelled) setIsLocked(false)
          onColdStartResolvedRef.current?.()
          return
        }

        const [enabled, deviceCap, posture] = await Promise.race([
          Promise.all([
            isBiometricLockEnabled(),
            getDeviceBiometricCapability(),
            getDevicePosture(),
          ]),
          new Promise<[boolean, BiometricCapability | null, DevicePosture]>((resolve) =>
            setTimeout(() => resolve([true, null, 'none']), 1500),
          ),
        ])

        if (!isMounted.current || cancelled) return
        if (deviceCap) setCapability(deviceCap)

        const securePosture = posture === 'strong' || posture === 'weak' || posture === 'credential'
        const shouldLock = enabled && securePosture && !isSessionUnlockedState()

        const nextLock = shouldLock ? (posture === 'credential' ? 'credential' : 'biometric') : null
        if (nextLock) {
          lockPostureRef.current = nextLock
          setLockPosture(nextLock)
        }

        setIsLocked(shouldLock)
        onColdStartResolvedRef.current?.()
      } catch {
        if (!cancelled) setIsLocked(false)
        onColdStartResolvedRef.current?.()
      }
    }

    void checkColdStart()
    return () => {
      cancelled = true
    }
  }, [])

  // Auth attempt is derived state: fires only once the veil is gone
  // (active) and a lock is requested — cold start or any later relock.
  useEffect(() => {
    if (!active || !isLocked) return
    if (hasAttemptedColdStart.current) return
    hasAttemptedColdStart.current = true
    const timer = setTimeout(() => {
      if (isMounted.current) triggerAuth()
    }, 300)
    return () => clearTimeout(timer)
  }, [active, isLocked, relockTick, triggerAuth])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const prevState = appState.current

      if (nextState === 'background') {
        lastBackgroundTime.current = Date.now()
      } else if (prevState === 'background' && nextState === 'active') {
        const timeInBackground = Date.now() - lastBackgroundTime.current
        if (timeInBackground > 2500) {
          const [enabled, posture] = await Promise.all([
            isBiometricLockEnabled(),
            getDevicePosture(),
          ])

          if (
            enabled &&
            posture !== 'none' &&
            isMounted.current
          ) {
            lockPostureRef.current = posture === 'credential' ? 'credential' : 'biometric'
            setLockPosture(lockPostureRef.current)
            setSessionUnlocked(false)
            hasAttemptedColdStart.current = false
            setIsLocked(true)
            setRelockTick((tick) => tick + 1)
          }
        }
      }

      appState.current = nextState
    })

    return () => {
      subscription.remove()
    }
  }, [])

  // Emergency safety unlock. Requires a fresh verification (biometric or
  // device credential, per current posture) BEFORE disabling the lock —
  // otherwise the "emergency" path is a permanent, frictionless bypass that
  // anyone with the unlocked phone can use.
  const handleEmergencyDisable = () => {
    const isCredential = lockPosture === 'credential'
    const displayName = isCredential ? 'Kodi i ekranit' : capability?.displayName || 'Biometrike'
    const verifyName = isCredential ? 'kodin e ekranit' : capability?.displayName || 'Biometrike'
    Alert.alert(
      `Çaktivizo Kyçjen (${displayName})`,
      `Për siguri, verifikoni me ${verifyName} para se të çaktivizoni kyçjen. A dëshironi ta bëni?`,
      [
        { text: 'Anulo', style: 'cancel' },
        {
          text: 'Vazhdo',
          style: 'destructive',
          onPress: async () => {
            setIsAuthenticating(true)
            const result = await authenticateWithBiometrics(
              `Verifikoni me ${verifyName} për të çaktivizuar kyçjen`
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

  // Lock UI mounts in the same commit the veil unmounts (active flips) —
  // no frame of app visible before the gate covers it.
  if (!(active && isLocked)) return null

  const isDark = theme !== 'white'
  const brandHighlight = theme === 'green' ? colors.gold : colors.primary
  const isCredentialLock = lockPosture === 'credential'
  const biometryName = capability?.displayName || 'Biometrike'
  const verifyName = isCredentialLock ? 'kodin e ekranit' : biometryName
  const iconKind = isCredentialLock ? 'shield' : capability?.iconName

  const renderIcon = (size: number, color: string) => {
    if (iconKind === 'face') {
      return <ScanFace size={size} color={color} strokeWidth={2} />
    }
    if (iconKind === 'fingerprint') {
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
          {isCredentialLock
            ? 'Përdorni kodin e ekranit të pajisjes suaj për të vazhduar.'
            : `Përdorni ${biometryName} për të vërtetuar identitetin tuaj dhe për të vazhduar.`}
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
                Zhblloko me {verifyName}
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
    zIndex: 1000000,
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
