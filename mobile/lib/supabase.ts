import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tjpxxtkebindirhpthhg.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcHh4dGtlYmluZGlyaHB0aGhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMjM5NDMsImV4cCI6MjA5ODY5OTk0M30.RA8kIkC--1d6-BeoDsgQ2BbkmIos6NCcj2tgksuRSJs'

const memoryStorage = new Map<string, string>()

const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const val = await AsyncStorage.getItem(key)
      return val !== null ? val : memoryStorage.get(key) || null
    } catch {
      return memoryStorage.get(key) || null
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value)
    } catch {
      memoryStorage.set(key, value)
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key)
    } catch {
      memoryStorage.delete(key)
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
