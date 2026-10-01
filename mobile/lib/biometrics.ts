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

// Session unlocked memory flag — stays unlocked while user navigates inside
// foreground app. Starts LOCKED: a fresh process has no verified session, so an
// enabled lock must engage at cold start (a `true` default silently disabled
// the entire cold-start gate).
let isSessionUnlocked = false

export function setSessionUnlocked(unlocked: boolean): void {
  isSessionUnlocked = unlocked
}

export function isSessionUnlockedState(): boolean {
  return isSessionUnlocked
}

/**
 * What the OS itself currently demands to unlock the device:
 * - `strong`   — Android Class 3 biometrics enrolled (fingerprint / 3D face)
 * - `weak`     — Android Class 2 biometrics enrolled (2D camera face unlock)
 * - `credential` — no biometrics, but a device PIN/pattern/password is set.
 *                Also what BOTH platforms report while biometrics are in
 *                system lockout — the OS will demand the credential next.
 * - `none`     — device has no screen security at all
 *
 * Source of truth is `getEnrolledLevelAsync()`, which reads the platform's
 * own enrollment state (iOS `canEvaluatePolicy`, Android `BiometricManager` +
 * `KeyguardManager`), not our cached capability.
 */
export type DevicePosture = 'strong' | 'weak' | 'credential' | 'none'

export async function getDevicePosture(): Promise<DevicePosture> {
  if (Platform.OS === 'web') return 'none'
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync()
    switch (level) {
      case LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG:
        return 'strong'
      case LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK:
        return 'weak'
      case LocalAuthentication.SecurityLevel.SECRET:
        return 'credential'
      default:
        return 'none'
    }
  } catch {
    return 'none'
  }
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
  /**
   * Overrides the posture-driven policy: `true` forces strictly-biometric
   * (no credential ever), `false` forces device-credential-allowed. When
   * omitted, policy is derived from `getDevicePosture()`.
   */
  disableDeviceFallback?: boolean
  fallbackLabel?: string
}

/**
 * Errors the OS uses to say "biometrics cannot verify right now"
 * (lockout, enrollment gone, sensor unusable, unenrolled-after-probe).
 * Android maps ERROR_NONE_ENROLRED (11) and friends to `unknown`.
 */
const BIOMETRIC_UNAVAILABLE_ERRORS = new Set([
  'lockout',
  'not_available',
  'not_enrolled',
  'unable_to_process',
  'unknown',
])

/**
 * Native biometric/device-credential verification, posture-driven.
 *
 * Policy matrix (device posture -> native policy):
 * - strong/weak biometric -> strict biometric ONLY:
 *     iOS `LAPolicyDeviceOwnerAuthenticationWithBiometrics` (passcode button
 *     hidden via empty fallback title), Android `BIOMETRIC_STRONG` /
 *     `BIOMETRIC_WEAK` with no `DEVICE_CREDENTIAL`. The passcode/PIN can
 *     never satisfy this gate while biometrics are available.
 * - credential -> device credential as the PRIMARY method (biometrics are
 *     gone from the device): iOS `LAPolicyDeviceOwnerAuthentication`,
 *     Android `biometric | DEVICE_CREDENTIAL`.
 * - none -> refused; nothing on the device could verify.
 *
 * Retry ladder (the old ladder downgraded to passcode/PIN policy on any
 * failure — that was the desync bug):
 * 1. `system_cancel`/`app_cancel` scene races retry with the SAME policy.
 * 2. `missing_usage_description` fails closed (build misconfiguration) —
 *    never silently evaluated as passcode.
 * 3. Only when the OS itself declares biometrics unavailable (lockout,
 *    stale enrollment, class mismatch) do we re-probe posture and, if the
 *    device still has any lock, verify with the device credential — exactly
 *    mirroring what the OS demands next.
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

    const posture = await getDevicePosture()

    if (posture === 'none') {
      return {
        success: false,
        error:
          'Pajisja nuk ka as biometri të regjistruar as kod të ekranit. Aktivizoni sigurinë e pajisjes në cilësimet e saj.',
      }
    }

    const biometricPosture = posture === 'strong' || posture === 'weak'
    const capability = biometricPosture ? await getDeviceBiometricCapability(true) : null
    const displayName = capability?.displayName || 'identifikuesin e pajisjes'

    const defaultPrompt = !biometricPosture
      ? 'Vendosni kodin e ekranit për të vazhduar'
      : Platform.OS === 'ios'
        ? `Verifikoni me ${displayName}`
        : `Vendosni gishtin ose skanoni fytyrën për ${displayName}`

    const isExpoGo =
      (Constants as any)?.executionEnvironment === ExecutionEnvironment.StoreClient ||
      (Constants as any)?.appOwnership === 'expo'

    // Strict-biometric unless posture is credential-only, caller overrode it,
    // or we are inside Expo Go (host binary lacks this project's
    // NSFaceIDUsageDescription, so strict Face ID is rejected outright there).
    let biometricOnly = options?.disableDeviceFallback ?? biometricPosture
    if (Platform.OS === 'ios' && isExpoGo && biometricOnly) {
      biometricOnly = false
    }

    const attempt = (strict: boolean) =>
      LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || defaultPrompt,
        cancelLabel: 'Anulo',
        disableDeviceFallback: strict,
        fallbackLabel:
          options?.fallbackLabel ?? (strict ? '' : Platform.OS === 'ios' ? 'Kodi i ekranit' : ''),
        // Android-only native field; omitted on iOS (record has no such key).
        ...(Platform.OS === 'android' && biometricPosture
          ? {
              biometricsSecurityLevel:
                posture === 'strong' ? ('strong' as const) : ('weak' as const),
            }
          : {}),
      })

    let result = await attempt(biometricOnly)
    const currentError = () => (result as any).error as string | undefined

    // 1. Transient scene race (foregrounding, double-invoke): retry the SAME
    // policy. Never downgrade — a race must not turn into a passcode prompt.
    if (!result.success && (currentError() === 'system_cancel' || currentError() === 'app_cancel')) {
      await new Promise((resolve) => setTimeout(resolve, 250))
      result = await attempt(biometricOnly)
    }

    // 2. Missing Face ID usage description = broken build config. Fail closed
    // with a precise message; passcode must never silently satisfy the gate.
    if (!result.success && currentError() === 'missing_usage_description') {
      return {
        success: false,
        error:
          'NSFaceIDUsageDescription mungon në Info.plist — rindisni ndërtimin e aplikacionit për ta aktivizuar Face ID.',
      }
    }

    // 3. The OS just declared biometrics unavailable (lockout after N tries,
    // enrollment removed between probe and prompt, sensor class mismatch).
    // Mirror the posture: if the device still has any lock, verify with the
    // device credential — this is what the OS itself demands next.
    if (biometricOnly && !result.success && BIOMETRIC_UNAVAILABLE_ERRORS.has(currentError() ?? '')) {
      const postureNow = await getDevicePosture()
      if (postureNow !== 'none') {
        result = await attempt(false)
      }
    }

    if (result.success) {
      isSessionUnlocked = true
      return { success: true }
    }

    const authError = currentError()
    const isCancelled =
      authError === 'user_cancel' || authError === 'app_cancel' || authError === 'system_cancel'

    const promptName = biometricPosture ? displayName : 'kodin e ekranit'
    let friendlyError = `Verifikimi me ${promptName} dështoi.`
    if (authError === 'not_enrolled') {
      friendlyError = !biometricPosture
        ? 'Kodi i ekranit u hoq nga pajisja. Vendosni një të ri në cilësimet e saj.'
        : capability?.enrollmentGuide || 'Biometria nuk është e regjistruar në telefon.'
    } else if (authError === 'not_available') {
      friendlyError = !biometricPosture
        ? 'Verifikimi me kodin e ekranit nuk është i disponueshëm në këtë moment.'
        : `Sensori për ${displayName} nuk është i disponueshëm në këtë moment.`
    } else if (authError === 'lockout') {
      friendlyError = `${displayName} u bllokua nga sistemi pas disa tentimeve. Zhbllokoni pajisjen nga ekrani i saj me kodin e ekranit, pastaj provoni përsëri.`
    } else if (authError === 'passcode_not_set') {
      friendlyError = 'Pajisja nuk ka kod të ekranit. Vendosni një në cilësimet e saj.'
    } else if (authError === 'authentication_failed') {
      friendlyError = biometricPosture
        ? `${displayName} nuk u njoh. Ju lutemi provoni përsëri.`
        : 'Kodi i ekranit nuk është i saktë. Ju lutemi provoni përsëri.'
    } else if (isCancelled) {
      friendlyError = 'Verifikimi u anulua.'
    } else if (authError) {
      friendlyError = `Verifikimi me ${promptName} dështoi (${authError}).`
    }

    return {
      success: false,
      cancelled: isCancelled,
      error: friendlyError,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Ndodhi një gabim gjatë verifikimit biometrik.' }
  } finally {
    setTimeout(() => {
      isAuthRunning = false
    }, 400)
  }
}
