import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  User,
  ShieldCheck,
  Building2,
  Heart,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Palette,
  LogIn,
  UserPlus,
  Check,
  Sun,
  Sparkles,
  Moon,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts, ThemeMode } from '@/constants/theme'
import { supabase } from '@/lib/supabase'

export default function ProfileScreen() {
  const router = useRouter()
  const { colors, theme, setTheme } = useTheme()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkSession() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setCurrentUser(user || null)
      } catch (err) {
        console.warn('Session check notice:', err)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Real-time auth listener for instant synchronization
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    Alert.alert('Çkyçja nga llogaria', 'A jeni të sigurt që dëshironi të çkyçeni?', [
      { text: 'Anulo', style: 'cancel' },
      {
        text: 'Çkyçu',
        style: 'destructive',
        onPress: async () => {
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          }
          await supabase.auth.signOut()
          setCurrentUser(null)
        },
      },
    ])
  }

  const openAuthModal = (initialTab: 'login' | 'register') => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    router.push({ pathname: '/modal', params: { initialTab } })
  }

  const handleThemeSelect = (selectedTheme: ThemeMode) => {
    if (theme === selectedTheme) return
    setTheme(selectedTheme)
  }

  const primaryBtnText = theme === 'green' ? '#003E37' : '#FFFFFF'

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {currentUser ? 'Profili Im' : 'Llogaria & Cilësimet'}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          {currentUser
            ? 'Menaxhoni pronat, të dhënat dhe temën'
            : 'Kyçuni ose rregulloni pamjen e aplikacionit'}
        </Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Card: Authenticated vs Guest */}
        {currentUser ? (
          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
              <User size={34} color={colors.primary} strokeWidth={2.2} />
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>
                  {currentUser.user_metadata?.first_name
                    ? `${currentUser.user_metadata.first_name} ${currentUser.user_metadata.last_name || ''}`.trim()
                    : 'Përdorues i regjistruar'}
                </Text>
                <View style={[styles.verifiedBadge, { backgroundColor: colors.badgeBg }]}>
                  <ShieldCheck size={12} color={colors.badgeText} strokeWidth={2.4} />
                  <Text style={[styles.verifiedBadgeText, { color: colors.badgeText }]}>Aktiv</Text>
                </View>
              </View>

              <Text style={[styles.userEmail, { color: colors.textMuted }]}>{currentUser.email}</Text>

              <View style={[styles.accountTypePill, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={[styles.accountTypePillText, { color: colors.textSecondary }]}>
                  Llogari e Verifikuar
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.guestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.guestIconWrap, { backgroundColor: colors.primaryLight }]}>
              <User size={32} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={[styles.guestTitle, { color: colors.textPrimary }]}>
              Mirësevini në Bleje Pronën
            </Text>
            <Text style={[styles.guestSubtitle, { color: colors.textMuted }]}>
              Kyçuni për të publikuar shpallje, ruajtur pronat e preferuara dhe biseduar me shitësit.
            </Text>

            <View style={styles.authButtonsRow}>
              <Pressable
                style={[styles.loginBtn, { backgroundColor: colors.primary }]}
                onPress={() => openAuthModal('login')}
              >
                <LogIn size={16} color={primaryBtnText} strokeWidth={2.2} />
                <Text style={[styles.loginBtnText, { color: primaryBtnText }]}>Kyçu</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.registerBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => openAuthModal('register')}
              >
                <UserPlus size={16} color={colors.textPrimary} strokeWidth={2.2} />
                <Text style={[styles.registerBtnText, { color: colors.textPrimary }]}>
                  Regjistrohu
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* SETTINGS: Theme Selector (E Bardhë / E Gjelbër / E Zezë) */}
        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.groupHeaderRow}>
            <View style={styles.groupHeaderLeft}>
              <Palette size={18} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.groupHeading, { color: colors.textPrimary }]}>
                Tema e Aplikacionit
              </Text>
            </View>
            <Text style={[styles.currentThemeLabel, { color: colors.primary }]}>
              {theme === 'green' ? 'E Gjelbër' : theme === 'black' ? 'E Zezë' : 'E Bardhë'}
            </Text>
          </View>

          <View style={styles.themeCardsGrid}>
            {/* White Theme */}
            <Pressable
              style={[
                styles.themeCard,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: theme === 'white' ? colors.primary : colors.border,
                },
                theme === 'white' && styles.themeCardActive,
              ]}
              onPress={() => handleThemeSelect('white')}
            >
              <View style={styles.themeCardTop}>
                <View style={[styles.themeIconCircle, { backgroundColor: '#FFFFFF' }]}>
                  <Sun size={18} color="#006459" strokeWidth={2.2} />
                </View>
                {theme === 'white' && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </View>
              <Text style={[styles.themeCardName, { color: colors.textPrimary }]}>E Bardhë</Text>
              <Text style={[styles.themeCardDesc, { color: colors.textMuted }]}>
                Klasike & e pastër
              </Text>
            </Pressable>

            {/* Green Theme (Brand Emerald) */}
            <Pressable
              style={[
                styles.themeCard,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: theme === 'green' ? colors.gold : colors.border,
                },
                theme === 'green' && styles.themeCardActive,
              ]}
              onPress={() => handleThemeSelect('green')}
            >
              <View style={styles.themeCardTop}>
                <View style={[styles.themeIconCircle, { backgroundColor: '#006459' }]}>
                  <Sparkles size={18} color="#C8B882" strokeWidth={2.2} />
                </View>
                {theme === 'green' && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.gold }]}>
                    <Check size={11} color="#003E37" strokeWidth={3} />
                  </View>
                )}
              </View>
              <Text style={[styles.themeCardName, { color: colors.textPrimary }]}>E Gjelbër</Text>
              <Text style={[styles.themeCardDesc, { color: colors.textMuted }]}>
                Ngjyra zyrtare
              </Text>
            </Pressable>

            {/* Black Theme (OLED Dark) */}
            <Pressable
              style={[
                styles.themeCard,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: theme === 'black' ? '#34D399' : colors.border,
                },
                theme === 'black' && styles.themeCardActive,
              ]}
              onPress={() => handleThemeSelect('black')}
            >
              <View style={styles.themeCardTop}>
                <View style={[styles.themeIconCircle, { backgroundColor: '#0B0F0E' }]}>
                  <Moon size={18} color="#34D399" strokeWidth={2.2} />
                </View>
                {theme === 'black' && (
                  <View style={[styles.checkCircle, { backgroundColor: '#34D399' }]}>
                    <Check size={11} color="#0B0F0E" strokeWidth={3} />
                  </View>
                )}
              </View>
              <Text style={[styles.themeCardName, { color: colors.textPrimary }]}>E Zezë</Text>
              <Text style={[styles.themeCardDesc, { color: colors.textMuted }]}>
                OLED Dark Mode
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Activity Section */}
        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.subGroupHeading, { color: colors.textLight }]}>Aktiviteti</Text>

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              if (!currentUser) {
                openAuthModal('login')
              } else {
                router.push('/listings' as any)
              }
            }}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.surfaceSubtle }]}>
              <Building2 size={18} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Shpalljet e mia</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                {currentUser ? 'Shiko dhe menaxho pronat që ke postuar' : 'Kyçu për të parë shpalljet e tua'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textLight} />
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/listings' as any)}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.surfaceSubtle }]}>
              <Heart size={18} color="#EF4444" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Pronat e ruajtura</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                Pronat që keni shënuar si të preferuara
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textLight} />
          </Pressable>
        </View>

        {/* Support & Legal */}
        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.subGroupHeading, { color: colors.textLight }]}>Ndihmë & Ligjore</Text>

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('Mbështetja Teknike', 'Për çdo pyetje apo ndihmë kontaktoni ekipin: support@blejepronen.com ose në WhatsApp.')
            }}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.surfaceSubtle }]}>
              <HelpCircle size={18} color={colors.textSecondary} strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Ndihmë & Mbështetje</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                Pyetje të shpeshta dhe kontakt me ekipin
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textLight} />
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('Kushtet e Përdorimit', 'Bleje Pronën është platformë imobiliare e licencuar në Republikën e Kosovës. Të gjitha të drejtat të rezervuara.')
            }}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.surfaceSubtle }]}>
              <Settings size={18} color={colors.textSecondary} strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Kushtet & Privatësia</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                Rregullat dhe politikat e sigurisë
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textLight} />
          </Pressable>
        </View>

        {/* Logout (Shown only if logged in) */}
        {currentUser && (
          <Pressable
            style={[
              styles.logoutButton,
              {
                backgroundColor:
                  theme === 'white'
                    ? '#FEE2E2'
                    : theme === 'green'
                    ? 'rgba(239, 68, 68, 0.16)'
                    : '#2A1414',
                borderColor:
                  theme === 'white'
                    ? '#FECACA'
                    : 'rgba(239, 68, 68, 0.35)',
                borderWidth: 1,
              },
            ]}
            onPress={handleLogout}
            hitSlop={8}
          >
            <LogOut
              size={18}
              color={theme === 'green' ? '#FCA5A5' : '#EF4444'}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.logoutButtonText,
                { color: theme === 'green' ? '#FCA5A5' : '#EF4444' },
              ]}
            >
              Çkyçu nga llogaria
            </Text>
          </Pressable>
        )}

        <Text style={[styles.appVersion, { color: colors.textLight }]}>
          Bleje Pronën Mobile v1.0.0 • Kosovë
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  accountTypePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  accountTypePillText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  guestCard: {
    alignItems: 'center',
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  guestIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  guestTitle: {
    fontSize: 19,
    fontFamily: Fonts.bold,
    marginBottom: 6,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  authButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  loginBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  registerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  registerBtnText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  menuGroup: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupHeading: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  currentThemeLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  subGroupHeading: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  themeCardsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  themeCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  themeCardActive: {
    borderWidth: 2,
  },
  themeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  themeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCardName: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  themeCardDesc: {
    fontSize: 10,
    fontFamily: Fonts.regular,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  menuIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  menuSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    marginTop: 4,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  appVersion: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: Fonts.medium,
    marginTop: 10,
  },
})
