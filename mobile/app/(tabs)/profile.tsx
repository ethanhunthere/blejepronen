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
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

export default function ProfileScreen() {
  const router = useRouter()
  const { colors, theme } = useTheme()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual')

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUserEmail(user.email || null)
      } else {
        setUserEmail('perdorues@blejepronen.com')
      }
    }
    checkUser()
  }, [])

  const handleLogout = async () => {
    Alert.alert('Çkyçja', 'A jeni të sigurt që dëshironi të çkyçeni?', [
      { text: 'Anulo', style: 'cancel' },
      {
        text: 'Çkyçu',
        style: 'destructive',
        onPress: async () => {
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          await supabase.auth.signOut()
          Alert.alert('U çkyçët', 'Jeni çkyçur me sukses nga llogaria.')
        },
      },
    ])
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Profili Im</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          Menaxhoni të dhënat dhe shpalljet tuaja
        </Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <User size={36} color={colors.primary} strokeWidth={2} />
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: colors.textPrimary }]}>
                Përdorues i Bleje Pronën
              </Text>
              <View style={[styles.verifiedBadge, { backgroundColor: colors.badgeBg }]}>
                <ShieldCheck size={13} color={colors.badgeText} strokeWidth={2.4} />
                <Text style={[styles.verifiedBadgeText, { color: colors.badgeText }]}>E verifikuar</Text>
              </View>
            </View>

            <Text style={[styles.userEmail, { color: colors.textMuted }]}>{userEmail}</Text>

            <View style={[styles.accountTypePill, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.accountTypePillText, { color: colors.textSecondary }]}>
                {accountType === 'individual' ? 'Llogari Individuale' : 'Llogari Kompanie'}
              </Text>
            </View>
          </View>
        </View>

        {/* Theme Selector Section (White, Green, Black) */}
        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.themeHeaderRow}>
            <View style={styles.themeTitleWrap}>
              <Palette size={16} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.groupHeading, { color: colors.textPrimary }]}>Pamja & Tema e Aplikacionit</Text>
            </View>
            <Text style={[styles.currentThemeBadge, { color: colors.primary, fontFamily: Fonts.bold }]}>
              {theme === 'green' ? 'E Gjelbër' : theme === 'black' ? 'E Zezë' : 'E Bardhë'}
            </Text>
          </View>
          <ThemeSwitcher />
        </View>

        {/* Activity Section */}
        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.groupHeading, { color: colors.textLight }]}>Aktiviteti</Text>

          <Pressable style={styles.menuItem} onPress={() => router.push('/listings' as any)}>
            <View style={[styles.menuIconContainer, { backgroundColor: colors.surfaceSubtle }]}>
              <Building2 size={18} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Shpalljet e mia</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                Shiko dhe menaxho pronat që ke postuar
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textLight} />
          </Pressable>

          <Pressable style={styles.menuItem} onPress={() => router.push('/listings' as any)}>
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

        {/* Settings & Support Section */}
        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.groupHeading, { color: colors.textLight }]}>Cilësimet e sistemit</Text>

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              Alert.alert(
                'Cilësimet e Llogarisë',
                'Të gjitha të dhënat dhe ndryshimet ruhen dhe sinkronizohen menjëherë në Supabase pa pasur nevojë për rifreskim.'
              )
            }}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.surfaceSubtle }]}>
              <Settings size={18} color={colors.textSecondary} strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Cilësimet e profilit</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                Ndrysho fjalëkalimin, emrin ose llojin e llogarisë
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textLight} />
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('Mbështetja Teknike', 'Për çdo ndihmë kontaktoni: support@blejepronen.com')
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
        </View>

        {/* Logout Button */}
        <Pressable
          style={[styles.logoutButton, { backgroundColor: theme === 'black' ? '#2A1414' : '#FEE2E2' }]}
          onPress={handleLogout}
        >
          <LogOut size={18} color="#EF4444" strokeWidth={2.2} />
          <Text style={styles.logoutButtonText}>Çkyçu nga llogaria</Text>
        </Pressable>

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
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
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
    justifyContent: 'space-between',
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  userEmail: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  accountTypePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  accountTypePillText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },
  themeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  themeTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentThemeBadge: {
    fontSize: 12,
  },
  menuGroup: {
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
  },
  groupHeading: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    letterSpacing: 0.3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  menuSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  logoutButtonText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#EF4444',
  },
  appVersion: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginTop: 8,
  },
})
