import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { Platform, StyleSheet } from 'react-native'
import type { TextStyle } from 'react-native'
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

/* ------------------------------------------------------------------ *
 * SEMANTIC TOKEN LAYER
 * ------------------------------------------------------------------ *
 * The raw `THEMES` palette above is a *component-level* vocabulary
 * (chipBg, tabBarActive, glassSurface, ...). It answers "what colour is
 * this specific widget?" The semantic layer below answers "what role does
 * this colour play?" and is the layer new UI should consume.
 *
 * Every value is an alias of an already-shipping hex/rgba so adopting the
 * semantic layer is a refactor, not a restyle. Where a role had no raw
 * equivalent (status colours, focus ring, scrim) the value is taken from
 * the hex the app already hardcodes in that role.
 * ------------------------------------------------------------------ */

export interface SemanticColors {
  /** App canvas behind every screen. */
  background: string
  /** Cards, sheets, bars — the primary raised container. */
  surface: string
  /** Inset wells, counters, disabled fills inside a `surface`. */
  surfaceMuted: string
  /** Primary reading text. */
  text: string
  /** Body copy that must stay prominent but is not a heading. */
  textSecondary: string
  /** Secondary/supporting text. */
  textMuted: string
  /** Tertiary text, placeholders, timestamps. */
  textSubtle: string
  /** Text that sits on `primary` / `text` fills. */
  textInverse: string
  /** Brand action colour (deep teal, gold in the green theme). */
  primary: string
  /** `primary` pressed/hovered, or the deeper step on dark canvases. */
  primaryStrong: string
  /** Translucent `primary` wash — selected chips, active tab pills. */
  primaryMuted: string
  /** Contrast-safe `primary` for text/icons on a light wash. */
  primaryText: string
  /** Gold accent — verification, premium, brand highlights. */
  accent: string
  /** Translucent accent wash. */
  accentMuted: string
  /** Hairline border for accent-tinted chips and badges. */
  accentBorder: string
  /** Contrast-safe accent for text/icons. */
  accentText: string
  /** Default hairline/border. */
  border: string
  /** Emphasised border — focused inputs, dividers on raised cards. */
  borderStrong: string

  /**
   * Selected-control treatment: the pill behind an active tab / chip, its
   * stroke, its label colour, and the nested counter badge. The black theme
   * deliberately uses a neutral white wash here rather than a green one, so
   * these are roles of their own and not aliases of `primary*`.
   */
  selectedBg: string
  selectedBorder: string
  selectedText: string
  selectedBadgeBg: string
  selectedBadgeText: string

  success: string
  successText: string
  successMuted: string
  successBorder: string
  warning: string
  warningText: string
  warningMuted: string
  warningBorder: string
  danger: string
  dangerText: string
  dangerMuted: string
  dangerBorder: string

  /** Loading placeholder fill. */
  skeleton: string
  /** Shadow colour fed to the `ShadowPresets` below. */
  shadow: string
  /** Modal/action-sheet scrim. */
  overlay: string
  /** Keyboard-focus ring (a11y). */
  focusRing: string
}

export const SEMANTIC: Record<ThemeMode, SemanticColors> = {
  white: {
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceMuted: '#F8FAFC',
    text: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    textSubtle: '#6B7280',
    textInverse: '#FFFFFF',
    primary: '#00675B',
    primaryStrong: '#004D43',
    primaryMuted: 'rgba(0, 103, 91, 0.09)',
    primaryText: '#00675B',
    accent: '#9A7228',
    accentMuted: 'rgba(154, 114, 40, 0.12)',
    accentBorder: 'rgba(154, 114, 40, 0.26)',
    accentText: '#9A7228',
    border: 'rgba(15, 23, 42, 0.08)',
    borderStrong: 'rgba(15, 23, 42, 0.14)',
    selectedBg: 'rgba(0, 103, 91, 0.10)',
    selectedBorder: '#00675B',
    selectedText: '#00675B',
    selectedBadgeBg: 'rgba(0, 103, 91, 0.16)',
    selectedBadgeText: '#00675B',
    success: '#10B981',
    successText: '#047857',
    successMuted: 'rgba(16, 185, 129, 0.12)',
    successBorder: 'rgba(16, 185, 129, 0.28)',
    warning: '#F59E0B',
    warningText: '#B45309',
    warningMuted: 'rgba(245, 158, 11, 0.14)',
    warningBorder: 'rgba(245, 158, 11, 0.30)',
    danger: '#EF4444',
    dangerText: '#DC2626',
    dangerMuted: 'rgba(239, 68, 68, 0.10)',
    dangerBorder: 'rgba(239, 68, 68, 0.28)',
    skeleton: 'rgba(15, 23, 42, 0.06)',
    shadow: '#0F172A',
    overlay: 'rgba(15, 23, 42, 0.45)',
    focusRing: '#00675B',
  },
  green: {
    background: '#071C18',
    surface: '#0E332A',
    surfaceMuted: '#144237',
    text: '#FFFFFF',
    textSecondary: '#E2F0EC',
    textMuted: '#8FAFA7',
    textSubtle: '#7FA69D',
    textInverse: '#071C18',
    primary: '#D4AF37',
    primaryStrong: '#E3C45E',
    primaryMuted: 'rgba(212, 175, 55, 0.16)',
    primaryText: '#D4AF37',
    accent: '#D4AF37',
    accentMuted: 'rgba(212, 175, 55, 0.22)',
    accentBorder: 'rgba(212, 175, 55, 0.38)',
    accentText: '#D4AF37',
    border: 'rgba(212, 175, 55, 0.22)',
    borderStrong: 'rgba(212, 175, 55, 0.38)',
    selectedBg: 'rgba(212, 168, 83, 0.18)',
    selectedBorder: '#D4AF37',
    selectedText: '#D4AF37',
    selectedBadgeBg: 'rgba(212, 168, 83, 0.25)',
    selectedBadgeText: '#D4AF37',
    success: '#34D399',
    successText: '#34D399',
    successMuted: 'rgba(52, 211, 153, 0.16)',
    successBorder: 'rgba(52, 211, 153, 0.32)',
    warning: '#FBBF24',
    warningText: '#FBBF24',
    warningMuted: 'rgba(251, 191, 36, 0.16)',
    warningBorder: 'rgba(251, 191, 36, 0.32)',
    danger: '#EF4444',
    dangerText: '#F87171',
    dangerMuted: 'rgba(239, 68, 68, 0.18)',
    dangerBorder: 'rgba(239, 68, 68, 0.34)',
    skeleton: 'rgba(212, 175, 55, 0.12)',
    shadow: '#030D0B',
    overlay: 'rgba(0, 0, 0, 0.62)',
    focusRing: '#D4AF37',
  },
  black: {
    background: '#000000',
    surface: '#101615',
    surfaceMuted: '#161D1B',
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    textSubtle: '#8B95A1',
    textInverse: '#000000',
    primary: '#2FBF8B',
    primaryStrong: '#57D6A8',
    primaryMuted: 'rgba(47, 191, 139, 0.15)',
    primaryText: '#2FBF8B',
    accent: '#D4AF37',
    accentMuted: 'rgba(212, 175, 55, 0.20)',
    accentBorder: 'rgba(212, 175, 55, 0.36)',
    accentText: '#D4AF37',
    border: 'rgba(255, 255, 255, 0.12)',
    borderStrong: 'rgba(255, 255, 255, 0.22)',
    selectedBg: 'rgba(255, 255, 255, 0.14)',
    selectedBorder: 'rgba(255, 255, 255, 0.28)',
    selectedText: '#FFFFFF',
    selectedBadgeBg: 'rgba(255, 255, 255, 0.22)',
    selectedBadgeText: '#FFFFFF',
    success: '#34D399',
    successText: '#34D399',
    successMuted: 'rgba(52, 211, 153, 0.16)',
    successBorder: 'rgba(52, 211, 153, 0.32)',
    warning: '#F59E0B',
    warningText: '#FBBF24',
    warningMuted: 'rgba(245, 158, 11, 0.18)',
    warningBorder: 'rgba(245, 158, 11, 0.34)',
    danger: '#EF4444',
    dangerText: '#F87171',
    dangerMuted: 'rgba(239, 68, 68, 0.20)',
    dangerBorder: 'rgba(239, 68, 68, 0.36)',
    skeleton: 'rgba(255, 255, 255, 0.08)',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.72)',
    focusRing: '#2FBF8B',
  },
}

/* ------------------------------------------------------------------ *
 * DENSITY / METRIC SCALES
 * ------------------------------------------------------------------ *
 * Values are dp and were harvested from the shipping UI, so migrating a
 * literal to its token is pixel-identical. `s1_5` reads "1.5".
 * ------------------------------------------------------------------ */

/**
 * Spacing ramp in dp. Key `sN` = N dp, `sN_5` = N.5 dp.
 *
 * Doubles as the size ramp for square metrics (icon glyph sizes, avatar and
 * touch-target diameters) so there is one dp vocabulary in the app.
 */
export const Spacing = {
  s0: 0,
  s1: 1,
  s1_5: 1.5,
  s2: 2,
  s2_5: 2.5,
  s3: 3,
  s3_5: 3.5,
  s4: 4,
  s4_5: 4.5,
  s5: 5,
  s5_5: 5.5,
  s6: 6,
  s7: 7,
  s8: 8,
  s9: 9,
  s10: 10,
  s11: 11,
  s12: 12,
  s13: 13,
  s14: 14,
  s15: 15,
  s16: 16,
  s18: 18,
  s20: 20,
  s22: 22,
  s24: 24,
  s26: 26,
  s28: 28,
  s32: 32,
  s36: 36,
  s40: 40,
  s44: 44,
  s48: 48,
  s52: 52,
  s56: 56,
  s60: 60,
  s64: 64,
} as const

/** Corner radius ramp in dp. `circle`/`pill` clamp to a full round. */
export const Radii = {
  none: 0,
  r4: 4,
  r5: 5,
  r6: 6,
  r7: 7,
  r8: 8,
  r10: 10,
  r11: 11,
  r12: 12,
  r14: 14,
  r16: 16,
  r18: 18,
  r20: 20,
  r22: 22,
  r24: 24,
  r26: 26,
  r28: 28,
  r32: 32,
  circle: 999,
  pill: 999,
} as const

/** Border stroke widths in dp. */
export const BorderWidths = {
  none: 0,
  hair: 0.5,
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  medium: 1.5,
  thick: 2,
} as const

/** Type size ramp in dp. `*Lg` entries are the half-steps the UI uses. */
export const FontSizes = {
  micro: 10,
  microLg: 10.5,
  caption: 11,
  captionLg: 11.5,
  footnote: 12,
  footnoteLg: 12.5,
  subhead: 13,
  subheadLg: 13.5,
  body: 14,
  bodyLg: 15,
  callout: 16,
  headline: 17,
  headlineLg: 17.5,
  title3: 20,
  title2: 24,
  title1: 28,
  display: 34,
} as const

/**
 * Numeric CSS/RN font weights keyed by the same names as `Fonts`, so a
 * loaded family and its fallback weight can never drift apart.
 */
export const FontWeights = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
  black: '900',
} as const

/**
 * Letter-tracking ramp in dp. Key `tN` = -N dp of tracking (`t1_5` = -0.15);
 * the UI tracks tighter as type grows.
 */
export const Tracking = {
  t0: 0,
  t1: -0.1,
  t1_5: -0.15,
  t2: -0.2,
  t3: -0.3,
  t4: -0.4,
} as const

/** Ready-made `TextStyle` presets — family, size and tracking paired. */
export const Typography = {
  micro: { fontFamily: Fonts.medium, fontSize: FontSizes.micro, letterSpacing: Tracking.t1 },
  caption: { fontFamily: Fonts.semiBold, fontSize: FontSizes.caption, letterSpacing: Tracking.t1 },
  footnote: { fontFamily: Fonts.medium, fontSize: FontSizes.footnote, letterSpacing: Tracking.t1 },
  body: { fontFamily: Fonts.regular, fontSize: FontSizes.body, letterSpacing: Tracking.t1_5 },
  bodyStrong: { fontFamily: Fonts.semiBold, fontSize: FontSizes.body, letterSpacing: Tracking.t1_5 },
  callout: { fontFamily: Fonts.semiBold, fontSize: FontSizes.callout, letterSpacing: Tracking.t2 },
  headline: { fontFamily: Fonts.bold, fontSize: FontSizes.headline, letterSpacing: Tracking.t3 },
  headlineLg: { fontFamily: Fonts.bold, fontSize: FontSizes.headlineLg, letterSpacing: Tracking.t4 },
  title: { fontFamily: Fonts.bold, fontSize: FontSizes.title3, letterSpacing: Tracking.t4 },
} satisfies Record<string, TextStyle>

/* ------------------------------------------------------------------ *
 * SHADOW / ELEVATION PRESETS
 * ------------------------------------------------------------------ *
 * Geometry is theme-independent; only `shadowColor` varies, so a level
 * means the same physical elevation everywhere. react-native-web maps
 * the `shadow*` props onto `box-shadow`, so no web-specific key is
 * needed (and adding `boxShadow` would override native on RN >= 0.76).
 * ------------------------------------------------------------------ */

export type ShadowLevel = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface ShadowPreset {
  shadowColor: string
  shadowOffset: { width: number; height: number }
  shadowOpacity: number
  shadowRadius: number
  elevation: number
}

const SHADOW_GEOMETRY: Record<Exclude<ShadowLevel, 'none'>, Omit<ShadowPreset, 'shadowColor'>> = {
  xs: { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  sm: { shadowOffset: { width: 0, height: 1.5 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  md: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  lg: { shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 8 },
  xl: { shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.18, shadowRadius: 28, elevation: 12 },
}

function buildShadowPresets(shadowColor: string): Record<ShadowLevel, ShadowPreset> {
  return {
    none: {
      shadowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: { shadowColor, ...SHADOW_GEOMETRY.xs },
    sm: { shadowColor, ...SHADOW_GEOMETRY.sm },
    md: { shadowColor, ...SHADOW_GEOMETRY.md },
    lg: { shadowColor, ...SHADOW_GEOMETRY.lg },
    xl: { shadowColor, ...SHADOW_GEOMETRY.xl },
  }
}

export const SHADOWS: Record<ThemeMode, Record<ShadowLevel, ShadowPreset>> = {
  white: buildShadowPresets(SEMANTIC.white.shadow),
  green: buildShadowPresets(SEMANTIC.green.shadow),
  black: buildShadowPresets(SEMANTIC.black.shadow),
}

/** Motion durations in ms, shared so easing feels consistent app-wide. */
export const Durations = {
  instant: 0,
  fast: 120,
  base: 180,
  slow: 240,
  slower: 360,
} as const

interface ThemeContextType {
  theme: ThemeMode
  /** Legacy component-level palette. Prefer `semantic` for new UI. */
  colors: ThemeColors
  /** Role-based colour tokens — the layer new UI should consume. */
  semantic: SemanticColors
  /** Theme-tinted elevation presets, indexed by `ShadowLevel`. */
  shadows: Record<ShadowLevel, ShadowPreset>
  spacing: typeof Spacing
  radii: typeof Radii
  borderWidths: typeof BorderWidths
  fontSizes: typeof FontSizes
  fontWeights: typeof FontWeights
  tracking: typeof Tracking
  typography: typeof Typography
  durations: typeof Durations
  isThemeLoaded: boolean
  setTheme: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const THEME_STORAGE_KEY = '@blejepronen_app_theme_mode'

const ThemeContext = createContext<ThemeContextType>({
  theme: 'white',
  colors: THEMES.white,
  semantic: SEMANTIC.white,
  shadows: SHADOWS.white,
  spacing: Spacing,
  radii: Radii,
  borderWidths: BorderWidths,
  fontSizes: FontSizes,
  fontWeights: FontWeights,
  tracking: Tracking,
  typography: Typography,
  durations: Durations,
  isThemeLoaded: false,
  setTheme: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('white')
  const [isThemeLoaded, setIsThemeLoaded] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function loadSavedTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY)
        if (isMounted && saved && (saved === 'white' || saved === 'green' || saved === 'black')) {
          setThemeState(saved as ThemeMode)
        }
      } catch (e) {
        console.warn('Failed to load theme preference', e)
      } finally {
        if (isMounted) {
          setIsThemeLoaded(true)
        }
      }
    }
    loadSavedTheme()
    return () => {
      isMounted = false
    }
  }, [])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState((current) => {
      if (current === mode) return current
      // Asynchronous non-blocking persistence
      AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {})
      return mode
    })
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: ThemeMode = current === 'white' ? 'green' : current === 'green' ? 'black' : 'white'
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {})
      return next
    })
  }, [])

  const contextValue = useMemo(
    () => ({
      theme,
      colors: THEMES[theme],
      semantic: SEMANTIC[theme],
      shadows: SHADOWS[theme],
      spacing: Spacing,
      radii: Radii,
      borderWidths: BorderWidths,
      fontSizes: FontSizes,
      fontWeights: FontWeights,
      tracking: Tracking,
      typography: Typography,
      durations: Durations,
      isThemeLoaded,
      setTheme,
      toggleTheme,
    }),
    [theme, isThemeLoaded, setTheme, toggleTheme]
  )

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

/**
 * Convenience selector for the semantic colour layer.
 *
 * Prefer this over `useTheme().colors` in new UI: it returns role tokens
 * (`surface`, `textMuted`, `dangerBorder`, ...) instead of the legacy
 * widget-keyed palette, so a component stops caring which theme is active.
 */
export function useSemantic(): SemanticColors {
  return useContext(ThemeContext).semantic
}
