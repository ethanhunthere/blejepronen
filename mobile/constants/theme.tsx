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
  glassSurface: string
  glassBorder: string
  glassBorderSubtle: string
  blurTint: BlurTint
}

export const THEMES: Record<ThemeMode, ThemeColors> = {
  white: {
    mode: 'white',
    primary: '#006459',
    primaryDark: '#005048',
    primaryLight: '#E6F2F1',
    gold: '#C8B882',
    goldLight: 'rgba(200, 184, 130, 0.2)',
    background: '#F2F7F7',
    surface: '#FFFFFF',
    surfaceSubtle: '#F9FAFB',
    surfaceHighlight: '#E8F3F1',
    border: '#E5E7EB',
    borderSubtle: '#F3F4F6',
    textPrimary: '#101828',
    textSecondary: '#374151',
    textMuted: '#6B7280',
    textLight: '#9CA3AF',
    tabBarBg: '#FFFFFF',
    tabBarBorder: '#E5E7EB',
    tabBarActive: '#006459',
    tabBarInactive: '#9CA3AF',
    statusBar: 'dark-content',
    statusBg: '#F2F7F7',
    chipBg: '#FFFFFF',
    chipActiveBg: '#006459',
    chipText: '#374151',
    chipTextActive: '#FFFFFF',
    searchBg: '#FFFFFF',
    searchBorder: '#E5E7EB',
    badgeBg: 'rgba(0, 100, 89, 0.1)',
    badgeText: '#006459',
    glassSurface: 'rgba(255, 255, 255, 0.82)',
    glassBorder: 'rgba(255, 255, 255, 0.75)',
    glassBorderSubtle: 'rgba(0, 0, 0, 0.06)',
    blurTint: 'systemUltraThinMaterialLight',
  },
  green: {
    mode: 'green',
    primary: '#C8B882', // gold stands out boldly against deep emerald
    primaryDark: '#003E37',
    primaryLight: 'rgba(255, 255, 255, 0.15)',
    gold: '#C8B882',
    goldLight: 'rgba(200, 184, 130, 0.25)',
    background: '#006459', // Signature brand emerald canvas
    surface: '#005048', // Luxurious slightly deeper emerald container
    surfaceSubtle: '#00453E',
    surfaceHighlight: '#005F55',
    border: 'rgba(255, 255, 255, 0.15)',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    textPrimary: '#FFFFFF',
    textSecondary: '#D1EAE7',
    textMuted: '#94C7C1',
    textLight: '#7BAEA8',
    tabBarBg: '#00463E',
    tabBarBorder: 'rgba(255, 255, 255, 0.12)',
    tabBarActive: '#C8B882',
    tabBarInactive: '#8EBDB7',
    statusBar: 'light-content',
    statusBg: '#006459',
    chipBg: '#005048',
    chipActiveBg: '#C8B882',
    chipText: '#E6F4F2',
    chipTextActive: '#003E37',
    searchBg: '#005048',
    searchBorder: 'rgba(255, 255, 255, 0.2)',
    badgeBg: 'rgba(200, 184, 130, 0.2)',
    badgeText: '#C8B882',
    glassSurface: 'rgba(0, 75, 68, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.20)',
    glassBorderSubtle: 'rgba(255, 255, 255, 0.08)',
    blurTint: 'systemMaterialDark',
  },
  black: {
    mode: 'black',
    primary: '#34D399', // radiant emerald neon
    primaryDark: '#059669',
    primaryLight: 'rgba(52, 211, 153, 0.15)',
    gold: '#C8B882',
    goldLight: 'rgba(200, 184, 130, 0.2)',
    background: '#000000', // Pure OLED True Black for infinite contrast & battery preservation
    surface: '#0B0F0E', // Deepest dark graphite with subtle emerald undertone
    surfaceSubtle: '#111716',
    surfaceHighlight: '#18221F',
    border: 'rgba(255, 255, 255, 0.12)', // 0.5px hairline specular border on OLED
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    textPrimary: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    textLight: '#6B7280',
    tabBarBg: '#000000',
    tabBarBorder: 'rgba(255, 255, 255, 0.10)',
    tabBarActive: '#34D399',
    tabBarInactive: '#6B7280',
    statusBar: 'light-content',
    statusBg: '#000000',
    chipBg: '#0E1413',
    chipActiveBg: '#34D399',
    chipText: '#D1D5DB',
    chipTextActive: '#000000',
    searchBg: '#0E1413',
    searchBorder: 'rgba(255, 255, 255, 0.14)',
    badgeBg: 'rgba(52, 211, 153, 0.15)',
    badgeText: '#34D399',
    glassSurface: 'rgba(11, 15, 14, 0.85)',
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
  setTheme: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const THEME_STORAGE_KEY = '@blejepronen_app_theme_mode'

const ThemeContext = createContext<ThemeContextType>({
  theme: 'white',
  colors: THEMES.white,
  setTheme: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('white')

  useEffect(() => {
    async function loadSavedTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY)
        if (saved && (saved === 'white' || saved === 'green' || saved === 'black')) {
          setThemeState(saved as ThemeMode)
        }
      } catch (e) {
        console.warn('Failed to load theme preference', e)
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
