import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { createClient } from '@supabase/supabase-js'

// Env-first with hardcoded fallback so existing builds keep working.
// EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY override at build time.
const SUPABASE_URL =
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ||
  'https://tjpxxtkebindirhpthhg.supabase.co'
const SUPABASE_ANON_KEY =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcHh4dGtlYmluZGlyaHB0aGhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMjM5NDMsImV4cCI6MjA5ODY5OTk0M30.RA8kIkC--1d6-BeoDsgQ2BbkmIos6NCcj2tgksuRSJs'

const memoryStorage = new Map<string, string>()

// Sessions (incl. refresh tokens) live in the encrypted keystore/keychain on
// device. AsyncStorage is kept only as (a) the web backend and (b) a fallback
// when SecureStore itself fails — never as the primary path for tokens.
const USE_SECURE = Platform.OS === 'ios' || Platform.OS === 'android'
const SECURE_MAX = 2040
const CHUNK_SIZE = 1800
const CHUNK_COUNT_SUFFIX = '__chunk_count'
const CHUNK_INDEX_SUFFIX = '__chunk_'
let migrationStarted = false

async function secureSet(key: string, value: string): Promise<void> {
  // Single-value path (fits under SecureStore's per-item cap).
  if (value.length <= SECURE_MAX) {
    await SecureStore.setItemAsync(key, value)
    // Retire any leftover chunks from a previous oversized write.
    const countStr = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX)
    if (countStr !== null) {
      const count = Number(countStr)
      if (Number.isFinite(count) && count > 0) {
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(key + CHUNK_INDEX_SUFFIX + i).catch(() => {})
        }
      }
      await SecureStore.deleteItemAsync(key + CHUNK_COUNT_SUFFIX).catch(() => {})
    }
    return
  }

  // Oversized session → chunked SecureStore write. Never falls back to plaintext
  // AsyncStorage for token material.
  //
  // Atomicity: chunks are written FIRST, the count LAST. A crash mid-write
  // therefore leaves no count marker, so the next read falls through cleanly
  // (base key → AsyncStorage → re-auth) instead of assembling a torn value.
  const chunks: string[] = []
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE))
  }

  // Retire any stale single-value + leftover chunks from a previous write.
  await SecureStore.deleteItemAsync(key).catch(() => {})
  const staleCountStr = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX)
  if (staleCountStr !== null) {
    const staleCount = Number(staleCountStr)
    if (Number.isFinite(staleCount) && staleCount > 0) {
      for (let i = 0; i < staleCount; i++) {
        await SecureStore.deleteItemAsync(key + CHUNK_INDEX_SUFFIX + i).catch(() => {})
      }
    }
    await SecureStore.deleteItemAsync(key + CHUNK_COUNT_SUFFIX).catch(() => {})
  }

  for (let i = 0; i < chunks.length; i++) {
    await SecureStore.setItemAsync(key + CHUNK_INDEX_SUFFIX + i, chunks[i])
  }
  // Count last — acts as the commit marker.
  await SecureStore.setItemAsync(key + CHUNK_COUNT_SUFFIX, String(chunks.length))
}

async function secureGet(key: string): Promise<string | null> {
  const countStr = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX)
  if (countStr !== null) {
    const count = Number(countStr)
    if (Number.isFinite(count) && count > 0) {
      let assembled = ''
      for (let i = 0; i < count; i++) {
        const chunk = await SecureStore.getItemAsync(key + CHUNK_INDEX_SUFFIX + i)
        if (chunk === null) return null
        assembled += chunk
      }
      return assembled
    }
  }
  return SecureStore.getItemAsync(key)
}

async function secureDelete(key: string): Promise<void> {
  const countStr = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX)
  if (countStr !== null) {
    const count = Number(countStr)
    if (Number.isFinite(count) && count > 0) {
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(key + CHUNK_INDEX_SUFFIX + i).catch(() => {})
      }
    }
    await SecureStore.deleteItemAsync(key + CHUNK_COUNT_SUFFIX).catch(() => {})
  }
  await SecureStore.deleteItemAsync(key).catch(() => {})
}

/** One-time move of legacy plaintext sb-* sessions into secure storage.
 *  Oversized values are chunked into SecureStore; plaintext is always wiped
 *  after a successful secure write. */
function migrateLegacySession() {
  if (migrationStarted || !USE_SECURE) return
  migrationStarted = true
  void (async () => {
    try {
      const keys = await AsyncStorage.getAllKeys()
      for (const key of keys) {
        if (!key.startsWith('sb-')) continue
        const already = await secureGet(key)
        if (already !== null) continue
        const value = await AsyncStorage.getItem(key)
        if (value === null) continue
        try {
          await secureSet(key, value)
          await AsyncStorage.removeItem(key)
        } catch (e) {
          console.warn('Session migration to secure storage failed for', key, e)
        }
      }
    } catch (e) {
      console.warn('Session migration to secure storage skipped:', e)
    }
  })()
}
migrateLegacySession()

/**
 * Storage adapter for Supabase auth sessions.
 *
 * SecureStore is the source of truth on native; a failed write retries once,
 * then degrades to AsyncStorage, then to memory — never silently dropping the
 * session (which would log the user out on next launch).
 * Oversized values are chunked into SecureStore rather than stored plaintext.
 */
const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (USE_SECURE) {
        const secure = await secureGet(key)
        if (secure !== null) return secure
      }
      const legacy = await AsyncStorage.getItem(key)
      if (legacy !== null) {
        // Opportunistic upgrade: if secure storage can take it, write + wipe plaintext.
        if (USE_SECURE) {
          try {
            await secureSet(key, legacy)
            await AsyncStorage.removeItem(key)
          } catch {}
        }
        return legacy
      }
      return memoryStorage.get(key) ?? null
    } catch (e) {
      console.warn('Session read failed, using memory fallback:', e)
      return memoryStorage.get(key) ?? null
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    memoryStorage.set(key, value)
    if (USE_SECURE) {
      try {
        await secureSet(key, value)
        // Wipe any plaintext copy that may still exist under the same key.
        await AsyncStorage.removeItem(key).catch(() => {})
        return
      } catch (e) {
        console.warn('Secure storage write failed, retrying once:', e)
      }
      try {
        await secureSet(key, value)
        await AsyncStorage.removeItem(key).catch(() => {})
        return
      } catch (e) {
        console.warn('Secure storage write FAILED twice - staying memory-only:', e)
      }
    }
    // SecureStore failed twice: keep the session in memory only. This adapter
    // only ever carries auth material, so a plaintext AsyncStorage fallback
    // would write tokens to disk — never acceptable.
    return
  },
  removeItem: async (key: string): Promise<void> => {
    memoryStorage.delete(key)
    if (USE_SECURE) {
      try {
        await secureDelete(key)
      } catch (e) {
        console.warn('Secure storage remove failed:', e)
      }
    }
    try {
      await AsyncStorage.removeItem(key)
    } catch (e) {
      console.warn('Session remove failed:', e)
    }
  },
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE: exchange the short-lived `code` for a session natively. Tokens are
    // never present in the redirect URL, so a leaked deep-link cannot be replayed.
    flowType: 'pkce',
  },
})

export interface Listing {
  id: string
  user_id: string
  title: string
  description: string
  price: number
  city: string
  neighborhood: string | null
  address: string
  rooms: number
  area_m2: number
  type: 'shitje' | 'qira'
  condition: string | null
  floor: string | null
  apartment_type: string | null
  features: string[]
  images: string[]
  is_active: boolean
  is_featured: boolean
  created_at: string
  profiles?: Profile | null
}

export interface Profile {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  email_verified: boolean
  avatar_url: string | null
  account_type?: 'individual' | 'company'
  company_name?: string
  fiscal_number?: string
  address?: string
}
