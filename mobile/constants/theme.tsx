import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'
import type { BlurTint } from 'expo-blur'

export type ThemeMode = 'white' | 'green' | 'black'

export interface ThemeColors {
  mode: ThemeMode
  primary: string
  primaryDark: string
  primaryLight: string
  gold: string
  goldLight: string
  background: string
  surface: string
  surfaceSubtle: string
  surfaceHighlight: string
  border: string
  borderSubtle: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  textLight: string
  tabBarBg: string
  tabBarBorder: string
  tabBarActive: string
  tabBarInactive: string
  statusBar: 'light-content' | 'dark-content'
  statusBg: string
  chipBg: string
  chipActiveBg: string
  chipText: string
  chipTextActive: string
  searchBg: string
  searchBorder: string
  badgeBg: string
  badgeText: string
  placeholder: string
  glassSurface: string
  glassBorder: string
  glassBorderSubtle: string
  blurTint: BlurTint
}

export const THEMES: Record<ThemeMode, ThemeColors> = {
  white: {
    mode: 'white',
    primary: '#00675B',
    primaryDark: '#004D43',
    primaryLight: '#E8F5F2',
    gold: '#9A7228',
    goldLight: 'rgba(154, 114, 40, 0.12)',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceSubtle: '#F8FAFC',
    surfaceHighlight: '#EBF5F3',
    border: 'rgba(15, 23, 42, 0.08)',
    borderSubtle: 'rgba(15, 23, 42, 0.04)',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    textLight: '#6B7280',
    tabBarBg: '#FFFFFF',
    tabBarBorder: 'rgba(15, 23, 42, 0.07)',
    tabBarActive: '#00675B',
    tabBarInactive: '#64748B',
    statusBar: 'dark-content',
    statusBg: '#F5F7FA',
    chipBg: '#FFFFFF',
    chipActiveBg: '#00675B',
    chipText: '#334155',
    chipTextActive: '#FFFFFF',
    searchBg: '#FFFFFF',
    searchBorder: 'rgba(15, 23, 42, 0.09)',
    badgeBg: 'rgba(0, 103, 91, 0.09)',
    badgeText: '#00675B',
    placeholder: 'rgba(15, 23, 42, 0.32)',
    glassSurface: 'rgba(255, 255, 255, 0.88)',
    glassBorder: 'rgba(255, 255, 255, 0.95)',
    glassBorderSubtle: 'rgba(15, 23, 42, 0.06)',
    blurTint: 'systemUltraThinMaterialLight',
  },
  green: {
    mode: 'green',
    primary: '#D4AF37',
    primaryDark: '#071C18',
    primaryLight: 'rgba(212, 175, 55, 0.16)',
    gold: '#D4AF37',
    goldLight: 'rgba(212, 175, 55, 0.22)',
    background: '#071C18',
    surface: '#0E332A',
    surfaceSubtle: '#144237',
    surfaceHighlight: '#1A5346',
    border: 'rgba(212, 175, 55, 0.22)',
    borderSubtle: 'rgba(255, 255, 255, 0.09)',
    textPrimary: '#FFFFFF',
    textSecondary: '#E2F0EC',
    textMuted: '#8FAFA7',
    textLight: '#7FA69D',
    tabBarBg: '#071C18',
    tabBarBorder: 'rgba(212, 175, 55, 0.18)',
    tabBarActive: '#D4AF37',
    tabBarInactive: '#7FA69D',
    statusBar: 'light-content',
    statusBg: '#071C18',
    chipBg: '#0E332A',
    chipActiveBg: '#D4AF37',
    chipText: '#E2F0EC',
    chipTextActive: '#071C18',
    searchBg: '#0E332A',
    searchBorder: 'rgba(212, 175, 55, 0.24)',
    badgeBg: 'rgba(212, 175, 55, 0.16)',
    badgeText: '#D4AF37',
    placeholder: 'rgba(255, 255, 255, 0.28)',
    glassSurface: 'rgba(14, 51, 42, 0.82)',
    glassBorder: 'rgba(212, 175, 55, 0.28)',
    glassBorderSubtle: 'rgba(255, 255, 255, 0.10)',
    blurTint: 'systemMaterialDark',
  },
  black: {
    mode: 'black',
    primary: '#2FBF8B',
    primaryDark: '#059669',
    primaryLight: 'rgba(52, 211, 153, 0.15)',
    gold: '#D4AF37',
    goldLight: 'rgba(212, 175, 55, 0.20)',
    background: '#000000',
    surface: '#101615',
    surfaceSubtle: '#161D1B',
    surfaceHighlight: '#1D2724',
    border: 'rgba(255, 255, 255, 0.12)',
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    textPrimary: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    textLight: '#8B95A1',
    tabBarBg: '#000000',
    tabBarBorder: 'rgba(255, 255, 255, 0.10)',
    tabBarActive: '#2FBF8B',
    tabBarInactive: '#8B95A1',
    statusBar: 'light-content',
    statusBg: '#000000',
    chipBg: '#0E1413',
    chipActiveBg: '#2FBF8B',
    chipText: '#D1D5DB',
    chipTextActive: '#000000',
    searchBg: '#0E1413',
    searchBorder: 'rgba(255, 255, 255, 0.14)',
    badgeBg: 'rgba(52, 211, 153, 0.15)',
    badgeText: '#2FBF8B',
    placeholder: 'rgba(255, 255, 255, 0.28)',
    glassSurface: 'rgba(16, 22, 21, 0.85)',
    glassBorder: 'rgba(255, 255, 255, 0.14)',
    glassBorderSubtle: 'rgba(255, 255, 255, 0.07)',
    blurTint: 'systemUltraThinMaterialDark',
  },
}

export const Fonts = {
  regular: 'AlbertSans_400Regular',
  medium: 'AlbertSans_500Medium',
  semiBold: 'AlbertSans_600SemiBold',
  bold: 'AlbertSans_700Bold',
  extraBold: 'AlbertSans_800ExtraBold',
  black: 'AlbertSans_900Black',
}

interface ThemeContextType {
  theme: ThemeMode
  colors: ThemeColors
  isThemeLoaded: boolean
  setTheme: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const THEME_STORAGE_KEY = '@blejepronen_app_theme_mode'

const ThemeContext = createContext<ThemeContextType>({
  theme: 'white',
  colors: THEMES.white,
  isThemeLoaded: false,
  setTheme: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('white')
  const [isThemeLoaded, setIsThemeLoaded] = useState(false)

  useEffect(() => {
    async function loadSavedTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY)
        if (saved && (saved === 'white' || saved === 'green' || saved === 'black')) {
          setThemeState(saved as ThemeMode)
        }
      } catch (e) {
        console.warn('Failed to load theme preference', e)
      } finally {
        setIsThemeLoaded(true)
      }
    }
    loadSavedTheme()
  }, [])

  const setTheme = (mode: ThemeMode) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync()
    }
    setThemeState(mode)
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {})
  }

  const toggleTheme = () => {
    const next: ThemeMode = theme === 'white' ? 'green' : theme === 'green' ? 'black' : 'white'
    setTheme(next)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors: THEMES[theme],
        isThemeLoaded,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
