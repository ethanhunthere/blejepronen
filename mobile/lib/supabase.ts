import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tjpxxtkebindirhpthhg.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcHh4dGtlYmluZGlyaHB0aGhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMjM5NDMsImV4cCI6MjA5ODY5OTk0M30.RA8kIkC--1d6-BeoDsgQ2BbkmIos6NCcj2tgksuRSJs'

const memoryStorage = new Map<string, string>()

/**
 * Storage adapter for Supabase auth sessions.
 *
 * AsyncStorage is the source of truth (persisted on device). The memory map is
 * only a last-resort fallback so the app keeps working if a read/write blips.
 *
 * IMPORTANT: a failed `setItem` would leave the session in memory only — i.e.
 * the user would appear logged out after the next reload. We therefore retry
 * the write once before falling back, and log loudly so it is diagnosable.
 */
const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const val = await AsyncStorage.getItem(key)
      if (val !== null) return val
      // AsyncStorage had nothing — only then consider the memory fallback
      return memoryStorage.get(key) ?? null
    } catch (e) {
      console.warn('Secure storage read failed, using memory fallback:', e)
      return memoryStorage.get(key) ?? null
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    // Always keep a memory copy so nothing breaks mid-session
    memoryStorage.set(key, value)
    try {
      await AsyncStorage.setItem(key, value)
      return
    } catch (e) {
      console.warn('Secure storage write failed, retrying once:', e)
    }
    try {
      await AsyncStorage.setItem(key, value)
    } catch (e) {
      console.warn(
        'Secure storage write FAILED twice — session is memory-only until the next successful write:',
        e
      )
    }
  },
  removeItem: async (key: string): Promise<void> => {
    memoryStorage.delete(key)
    try {
      await AsyncStorage.removeItem(key)
    } catch (e) {
      console.warn('Secure storage remove failed:', e)
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
