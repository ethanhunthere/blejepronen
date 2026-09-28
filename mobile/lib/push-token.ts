import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { API_BASE_URL } from './api'
import { supabase } from './supabase'

/**
 * Bleje Pronën — push token registration (audit §4.6).
 * ─────────────────────────────────────────────────────────────────────
 * Tokens are uploaded to the app's OWN backend (`/api/push-token`), never
 * straight to Supabase from the device: the write lands in
 * `auth.users.raw_user_meta_data.push_tokens` and needs the service-role key,
 * which must not ship in a mobile bundle.
 *
 * The endpoint is auth-gated (cookie session or Bearer access token) and
 * idempotent, so re-registering on every launch / sign-in is free of
 * duplicates. This module adds a local memo on top so a repeat launch does not
 * even spend the round trip.
 */

const STORAGE_KEY = 'bp.push.lastUpload'
const REQUEST_TIMEOUT_MS = 12000

export type PushTokenType = 'expo' | 'device'

export interface PushTokenPayload {
  token: string
  /** `expo` = Expo push service token, `device` = raw APNs/FCM token. */
  type?: PushTokenType
  platform?: string
}

interface UploadResult {
  ok: boolean
  status?: number
  error?: string
}

interface StoredMemo {
  token: string
  userId: string
  at: number
}

async function readMemo(): Promise<StoredMemo | null> {
  if (Platform.OS === 'web') return null
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredMemo
    return parsed?.token && parsed?.userId ? parsed : null
  } catch {
    return null
  }
}

async function writeMemo(memo: StoredMemo | null): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    if (memo) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memo))
    else await AsyncStorage.removeItem(STORAGE_KEY)
  } catch {
    // Non-fatal: the server call is idempotent anyway.
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function resolveAuth(): Promise<{ userId: string; accessToken: string } | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token || !session?.user?.id) return null
    return { userId: session.user.id, accessToken: session.access_token }
  } catch {
    return null
  }
}

/**
 * Registers (or re-registers) this device's push token for the signed-in user.
 * Resolves `true` when the backend accepted it — including when it was already
 * registered, which the server reports as a no-op success.
 */
export async function uploadPushToken(payload: PushTokenPayload): Promise<boolean> {
  const token = payload?.token?.trim()
  if (!token) return false

  const auth = await resolveAuth()
  if (!auth) return false

  // Skip the round trip when this exact token is already registered for this
  // exact user. Any auth switch invalidates the memo.
  const memo = await readMemo()
  if (memo && memo.token === token && memo.userId === auth.userId) return true

  const result = await sendToken('POST', token, auth.accessToken, {
    type: payload.type ?? 'expo',
    platform: payload.platform ?? Platform.OS,
  })

  if (result.ok) {
    await writeMemo({ token, userId: auth.userId, at: Date.now() })
  }
  return result.ok
}

/** Removes this device's token — call on sign-out and before account deletion. */
export async function unregisterPushToken(token?: string): Promise<boolean> {
  const auth = await resolveAuth()
  const target = token?.trim() || (await readMemo())?.token

  // Nothing known to unregister: clear the memo so the next sign-in
  // re-registers, and report success (the desired end state is already true).
  if (!target) {
    await writeMemo(null)
    return true
  }
  if (!auth) return false

  const result = await sendToken('DELETE', target, auth.accessToken)
  if (result.ok) await writeMemo(null)
  return result.ok
}

async function sendToken(
  method: 'POST' | 'DELETE',
  token: string,
  accessToken: string,
  extra?: { type?: string; platform?: string }
): Promise<UploadResult> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/push-token`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token, ...extra }),
    })

    const data = (await res.json().catch(() => null)) as any
    if (!res.ok || (data && data.success === false)) {
      return {
        ok: false,
        status: res.status,
        error: data?.message || data?.error || `HTTP ${res.status}`,
      }
    }
    return { ok: true, status: res.status }
  } catch (err: any) {
    // Offline / endpoint not yet deployed — silent, retried on next launch.
    return { ok: false, error: String(err?.message || err) }
  }
}
