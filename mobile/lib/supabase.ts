import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tjpxxtkebindirhpthhg.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcHh4dGtlYmluZGlyaHB0aGhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMjM5NDMsImV4cCI6MjA5ODY5OTk0M30.RA8kIkC--1d6-BeoDsgQ2BbkmIos6NCcj2tgksuRSJs'

const memoryStorage = new Map<string, string>()

// Sessions (incl. refresh tokens) live in the encrypted keystore/keychain on
// device. AsyncStorage is kept only as (a) the web backend and (b) an overflow
// path for values above SecureStore's 2048-byte cap.
const USE_SECURE = Platform.OS === 'ios' || Platform.OS === 'android'
const SECURE_MAX = 2040
let migrationStarted = false

/** One-time move of legacy plaintext sb-* sessions into secure storage. */
function migrateLegacySession() {
  if (migrationStarted || !USE_SECURE) return
  migrationStarted = true
  void (async () => {
    try {
      const keys = await AsyncStorage.getAllKeys()
      for (const key of keys) {
        if (!key.startsWith('sb-')) continue
        const already = await SecureStore.getItemAsync(key)
        if (already !== null) continue
        const value = await AsyncStorage.getItem(key)
        if (value !== null && value.length <= SECURE_MAX) {
          await SecureStore.setItemAsync(key, value)
          await AsyncStorage.removeItem(key)
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
 */
const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (USE_SECURE) {
        const secure = await SecureStore.getItemAsync(key)
        if (secure !== null) return secure
      }
      const legacy = await AsyncStorage.getItem(key)
      if (legacy !== null) return legacy
      return memoryStorage.get(key) ?? null
    } catch (e) {
      console.warn('Session read failed, using memory fallback:', e)
      return memoryStorage.get(key) ?? null
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    memoryStorage.set(key, value)
    if (USE_SECURE && value.length <= SECURE_MAX) {
      try {
        await SecureStore.setItemAsync(key, value)
        return
      } catch (e) {
        console.warn('Secure storage write failed, retrying once:', e)
      }
      try {
        await SecureStore.setItemAsync(key, value)
        return
      } catch (e) {
        console.warn('Secure storage write FAILED twice - falling back to AsyncStorage:', e)
      }
    }
    try {
      await AsyncStorage.setItem(key, value)
    } catch (e) {
      console.warn('Session persistence failed entirely - memory-only until next write:', e)
    }
  },
  removeItem: async (key: string): Promise<void> => {
    memoryStorage.delete(key)
    if (USE_SECURE) {
      try {
        await SecureStore.deleteItemAsync(key)
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
