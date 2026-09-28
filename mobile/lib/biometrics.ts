import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { AppState, Platform } from 'react-native'

export const SECURE_BIOMETRIC_PREF_KEY = 'blejepronen_biometric_enabled'
export const SECURE_BIOMETRIC_TOKEN_KEY = 'blejepronen_biometric_session_token'
const LEGACY_STORAGE_KEY = '@blejepronen_biometric_lock_enabled'

export type BiometricSensorType =
  | 'face_id'
  | 'touch_id'
  | 'fingerprint'
  | 'face_recognition'
  | 'biometrics'
  | 'none'

export interface BiometricCapability {
  supported: boolean
  enrolled: boolean
  sensorType: BiometricSensorType
  displayName: string
  actionLabel: string
  badgeLabel: string
  description: string
  enrollmentGuide: string
  iconName: 'face' | 'fingerprint' | 'shield'
}

let cachedCapability: BiometricCapability | null = null

// Session unlocked memory flag — stays unlocked while user navigates inside foreground app
let isSessionUnlocked = true

export function setSessionUnlocked(unlocked: boolean): void {
  isSessionUnlocked = unlocked
}

export function isSessionUnlockedState(): boolean {
  return isSessionUnlocked
}

/**
 * Dynamically queries hardware and enrollment status, returning an authoritative
 * capability descriptor tailored for iOS (Face ID / Touch ID) and Android (Samsung / Pixel / etc.).
 */
export async function getDeviceBiometricCapability(
  forceRefresh = false
): Promise<BiometricCapability> {
  if (Platform.OS === 'web') {
    return {
      supported: false,
      enrolled: false,
      sensorType: 'none',
      displayName: 'Biometria',
      actionLabel: 'Kyçja Biometrike',
      badgeLabel: 'E padisponueshme në Web',
      description: 'Kyçja biometrike mbështetet vetëm në telefonat mobilë.',
      enrollmentGuide: '',
      iconName: 'shield',
    }
  }

  if (cachedCapability && !forceRefresh) return cachedCapability

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false
    const types = hasHardware ? await LocalAuthentication.supportedAuthenticationTypesAsync() : []

    const hasFacial = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    const hasIris = types.includes(LocalAuthentication.AuthenticationType.IRIS)

    let sensorType: BiometricSensorType = 'none'
    let displayName = 'Biometria'
    let actionLabel = 'Aktivizo Biometrinë'
    let iconName: 'face' | 'fingerprint' | 'shield' = 'shield'
    let description = 'Mbroni llogarinë dhe pronat tuaja me sensorët e sigurisë të telefonit.'
    let enrollmentGuide = ''

    if (Platform.OS === 'ios') {
      if (hasFacial) {
        sensorType = 'face_id'
        displayName = 'Face ID'
        actionLabel = 'Aktivizo Face ID'
        iconName = 'face'
        description = 'Kërkon skanimin e fytyrës me Face ID për të hyrë në aplikacion.'
        enrollmentGuide =
          'Për të përdorur Face ID, hapni Settings -> Face ID & Passcode në iPhone dhe regjistroni fytyrën tuaj.'
      } else if (hasFingerprint) {
        sensorType = 'touch_id'
        displayName = 'Touch ID'
        actionLabel = 'Aktivizo Touch ID'
        iconName = 'fingerprint'
        description = 'Kërkon skanimin e gishtit me Touch ID për të hyrë në aplikacion.'
        enrollmentGuide =
          'Për të përdorur Touch ID, hapni Settings -> Touch ID & Passcode në iPhone dhe regjistroni gjurmën e gishtit.'
      }
    } else {
      // Android: Samsung Galaxy, Google Pixel, Xiaomi, etc.
      if (hasFingerprint && hasFacial) {
        sensorType = 'biometrics'
        displayName = 'Gjurmë Gishti / Fytyrë'
        actionLabel = 'Aktivizo Biometrinë'
        iconName = 'fingerprint'
        description = 'Mbroni llogarinë me gjurmë gishti ose skanim fytyre (Android BiometricPrompt).'
        enrollmentGuide =
          'Hapni Settings -> Siguria & Privatësia -> Biometria në telefonin tuaj Android për të regjistruar biometrinë.'
      } else if (hasFingerprint) {
        sensorType = 'fingerprint'
        displayName = 'Gjurmë Gishti'
        actionLabel = 'Aktivizo me Gjurmë Gishti'
        iconName = 'fingerprint'
        description = 'Kërkon verifikimin me gjurmë gishti për të hyrë në aplikacion.'
        enrollmentGuide =
          'Hapni Settings -> Siguria -> Gjurmë Gishti në telefonin tuaj Android për të regjistruar gishtin.'
      } else if (hasFacial || hasIris) {
        sensorType = 'face_recognition'
        displayName = 'Njohja e Fytyrës'
        actionLabel = 'Aktivizo Njohjen e Fytyrës'
        iconName = 'face'
        description = 'Kërkon njohjen biometrike të fytyrës për të hyrë në aplikacion.'
        enrollmentGuide =
          'Hapni Settings -> Siguria & Privatësia -> Njohja e Fytyrës në telefonin tuaj Android.'
      } else if (hasHardware) {
        sensorType = 'biometrics'
        displayName = 'Identifikimi Biometrik'
        actionLabel = 'Aktivizo Biometrinë'
        iconName = 'shield'
        description = 'Mbroni llogarinë me sensorët biometrikë të pajisjes.'
        enrollmentGuide = 'Regjistroni biometrinë në Cilësimet e sigurisë së telefonit tuaj.'
      }
    }

    const badgeLabel = !hasHardware
      ? 'E pambështetur nga pajisja'
      : !isEnrolled
      ? 'E paregjistruar në telefon'
      : 'E gatshme për përdorim'

    cachedCapability = {
      supported: hasHardware,
      enrolled: isEnrolled,
      sensorType,
      displayName,
      actionLabel,
      badgeLabel,
      description,
      enrollmentGuide,
      iconName,
    }

    return cachedCapability
  } catch {
    return {
      supported: false,
      enrolled: false,
      sensorType: 'none',
      displayName: 'Biometria',
      actionLabel: 'Kyçja Biometrike',
      badgeLabel: 'Status i panjohur',
      description: 'Mbroni llogarinë me sensorët biometrikë.',
      enrollmentGuide: '',
      iconName: 'shield',
    }
  }
}

/**
 * Checks whether biometric lock is enabled in hardware-backed SecureStore (Keychain / Keystore).
 */
export async function isBiometricLockEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  try {
    const secureVal = await SecureStore.getItemAsync(SECURE_BIOMETRIC_PREF_KEY)
    if (secureVal !== null) return secureVal === 'true'

    // Fallback migration check from legacy AsyncStorage key
    const legacyVal = await AsyncStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacyVal === 'true') {
      await SecureStore.setItemAsync(SECURE_BIOMETRIC_PREF_KEY, 'true').catch(() => {})
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Persists the biometric preference in hardware-backed SecureStore (iOS Keychain / Android Keystore).
 */
export async function setBiometricLockEnabled(
  enabled: boolean,
  sessionToken?: string | null
): Promise<void> {
  try {
    if (enabled) {
      await SecureStore.setItemAsync(SECURE_BIOMETRIC_PREF_KEY, 'true', {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      })
      if (sessionToken) {
        await SecureStore.setItemAsync(SECURE_BIOMETRIC_TOKEN_KEY, sessionToken, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        })
      }
      // Keep legacy key mirrored for backwards-compatibility
      await AsyncStorage.setItem(LEGACY_STORAGE_KEY, 'true').catch(() => {})
      isSessionUnlocked = true
    } else {
      await SecureStore.deleteItemAsync(SECURE_BIOMETRIC_PREF_KEY).catch(() => {})
      await SecureStore.deleteItemAsync(SECURE_BIOMETRIC_TOKEN_KEY).catch(() => {})
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => {})
    }
  } catch {
    // Non-blocking fallback
    if (enabled) {
      await AsyncStorage.setItem(LEGACY_STORAGE_KEY, 'true').catch(() => {})
    } else {
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => {})
    }
  }
}

let isAuthRunning = false

export interface AuthOptions {
  disableDeviceFallback?: boolean
  fallbackLabel?: string
}

/**
 * Prompts native biometric verification using iOS LocalAuthentication or Android BiometricPrompt.
 * Enforces strict biometrics (no passcode fallback) when disableDeviceFallback is true.
 */
export async function authenticateWithBiometrics(
  promptMessage?: string,
  options?: AuthOptions
): Promise<{ success: boolean; error?: string; cancelled?: boolean }> {
  if (Platform.OS === 'web') return { success: true }

  if (isAuthRunning) {
    return { success: false, error: 'Autentifikimi është në proces' }
  }

  isAuthRunning = true

  try {
    // iOS rejects the prompt before presentation if the scene is not fully
    // active (e.g. invocation during a transition or right after foregrounding).
    if (AppState.currentState !== 'active') {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }

    // Fresh hardware/enrollment read: a stale cached capability can block a
    // prompt the device would actually present (e.g. user just enrolled).
    const capability = await getDeviceBiometricCapability(true)

    if (!capability.supported) {
      return {
        success: false,
        error: 'Pajisja juaj nuk ka sensor biometrik (Face ID ose Gjurmë Gishti).',
      }
    }

    if (!capability.enrolled) {
      return {
        success: false,
        error:
          capability.enrollmentGuide ||
          'Nuk u gjet asnjë biometri e regjistruar në cilësimet e telefonit tuaj.',
      }
    }

    const defaultPrompt =
      Platform.OS === 'ios'
        ? `Verifikoni me ${capability.displayName}`
        : `Vendosni gishtin ose skanoni fytyrën për ${capability.displayName}`

    // On iOS, empty fallbackLabel hides the passcode button to keep the prompt strictly biometric.
    // disableDeviceFallback: true attempts LAPolicyDeviceOwnerAuthenticationWithBiometrics.
    const attempt = (disableFallback: boolean) =>
      LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || defaultPrompt,
        fallbackLabel: options?.fallbackLabel ?? '',
        disableDeviceFallback: disableFallback,
        cancelLabel: 'Anulo',
      })

    const isExpoGo =
      (Constants as any)?.executionEnvironment === ExecutionEnvironment.StoreClient ||
      (Constants as any)?.appOwnership === 'expo'

    // 1. Initial attempt:
    // On iOS in Expo Go, the precompiled host binary lacks project-specific Info.plist keys,
    // so requesting disableDeviceFallback: true will be immediately rejected by Expo's Swift module
    // with 'missing_usage_description' before showing Face ID. We bypass this by requesting
    // deviceOwnerAuthentication with fallbackLabel: '' which natively invokes Face ID without the error.
    const requestedDisableFallback = options?.disableDeviceFallback ?? true
    const initialDisableFallback = Platform.OS === 'ios' && isExpoGo ? false : requestedDisableFallback

    let result = await attempt(initialDisableFallback)

    // 2. Critical Universal Fallback for standalone builds or unconfigured host environments:
    // If any host environment still rejects with missing_usage_description,
    // fall back cleanly to deviceOwnerAuthentication with empty fallbackLabel.
    if (!result.success) {
      const err = (result as any).error as string | undefined
      const warn = (result as any).warning as string | undefined

      if (
        err === 'missing_usage_description' ||
        err?.toLowerCase().includes('missing') ||
        warn?.includes('NSFaceIDUsageDescription')
      ) {
        result = await attempt(false)
      }
    }

    // 3. Spurious system/app cancel retry (scene activation race)
    if (!result.success) {
      const err = (result as any).error as string | undefined
      if (err === 'system_cancel' || err === 'app_cancel') {
        await new Promise((resolve) => setTimeout(resolve, 200))
        result = await attempt(false)
      }
    }

    if (result.success) {
      isSessionUnlocked = true
      return { success: true }
    } else {
      const authError = (result as any).error as string | undefined
      const isCancelled =
        authError === 'user_cancel' ||
        authError === 'app_cancel' ||
        authError === 'system_cancel'

      let friendlyError = `Verifikimi me ${capability.displayName} dështoi.`
      if (authError === 'not_enrolled') {
        friendlyError = capability.enrollmentGuide || 'Biometria nuk është e regjistruar në telefon.'
      } else if (authError === 'not_available') {
        friendlyError = `Sensori për ${capability.displayName} nuk është i disponueshëm në këtë moment.`
      } else if (authError === 'lockout') {
        friendlyError = `Sensori i ${capability.displayName} është përkohësisht i bllokuar nga sistemi për shkak të shumë tentimeve. Zhbllokoni telefonin një herë me kodin e ekranit.`
      } else if (authError === 'authentication_failed') {
        friendlyError = `${capability.displayName} nuk u njoh. Ju lutemi provoni përsëri.`
      } else if (
        authError === 'missing_usage_description' ||
        authError?.toLowerCase().includes('missing')
      ) {
        friendlyError = `Leja për ${capability.displayName} duhet të konfigurohet në cilësimet e pajisjes.`
      } else if (isCancelled) {
        friendlyError = 'Verifikimi u anulua.'
      } else if (authError) {
        friendlyError = `Verifikimi me ${capability.displayName} dështoi (${authError}).`
      }

      return {
        success: false,
        cancelled: isCancelled,
        error: friendlyError,
      }
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Ndodhi një gabim gjatë verifikimit biometrik.' }
  } finally {
    setTimeout(() => {
      isAuthRunning = false
    }, 400)
  }
}
