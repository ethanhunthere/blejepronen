import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native'
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
  Sparkles,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { BrandColors } from '@/constants/Colors'
import { supabase } from '@/lib/supabase'

export default function ProfileScreen() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState<boolean>(true)
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F7F7" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profili Im</Text>
        <Text style={styles.headerSubtitle}>Menaxhoni të dhënat dhe shpalljet tuaja</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <User size={36} color={BrandColors.primary} strokeWidth={2} />
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>Përdorues i Bleje Pronën</Text>
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={13} color={BrandColors.primary} strokeWidth={2.4} />
                <Text style={styles.verifiedBadgeText}>E verifikuar</Text>
              </View>
            </View>

            <Text style={styles.userEmail}>{userEmail}</Text>

            <View style={styles.accountTypePill}>
              <Text style={styles.accountTypePillText}>
                {accountType === 'individual' ? 'Llogari Individuale' : 'Llogari Kompanie'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Management Section */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>Aktiviteti</Text>

          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/listings' as any)}
          >
            <View style={styles.menuIconContainer}>
              <Building2 size={18} color={BrandColors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Shpalljet e mia</Text>
              <Text style={styles.menuSubtitle}>Shiko dhe menaxho pronat që ke postuar</Text>
            </View>
            <ChevronRight size={18} color={BrandColors.textLight} />
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/listings' as any)}
          >
            <View style={styles.menuIconContainer}>
              <Heart size={18} color="#EF4444" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Pronat e ruajtura</Text>
              <Text style={styles.menuSubtitle}>Pronat që keni shënuar si të preferuara</Text>
            </View>
            <ChevronRight size={18} color={BrandColors.textLight} />
          </Pressable>
        </View>

        {/* Settings & Support Section */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>Cilësimet e sistemit</Text>

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('Cilësimet', 'Cilësimet e plota të llogarisë janë të sinkronizuara me platformën web.')
            }}
          >
            <View style={styles.menuIconContainer}>
              <Settings size={18} color={BrandColors.textSecondary} strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Cilësimet e profilit</Text>
              <Text style={styles.menuSubtitle}>Ndrysho fjalëkalimin, emrin ose llojin e llogarisë</Text>
            </View>
            <ChevronRight size={18} color={BrandColors.textLight} />
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('Mbështetja', 'Për ndihmë kontaktoni: support@blejepronen.com')
            }}
          >
            <View style={styles.menuIconContainer}>
              <HelpCircle size={18} color={BrandColors.textSecondary} strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Ndihmë & Mbështetje</Text>
              <Text style={styles.menuSubtitle}>Pyetje të shpeshta dhe kontakt me stafin</Text>
            </View>
            <ChevronRight size={18} color={BrandColors.textLight} />
          </Pressable>
        </View>

        {/* Logout Button */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={18} color="#EF4444" strokeWidth={2.2} />
          <Text style={styles.logoutButtonText}>Çkyçu nga llogaria</Text>
        </Pressable>

        {/* Version branding */}
        <Text style={styles.appVersion}>Bleje Pronën v1.0.0 • Kosovë</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F7F7',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: BrandColors.textMuted,
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 18,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: BrandColors.border,
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
    backgroundColor: BrandColors.primaryLight,
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
    fontWeight: '800',
    color: BrandColors.textPrimary,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 100, 89, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  userEmail: {
    fontSize: 12,
    color: BrandColors.textMuted,
  },
  accountTypePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  accountTypePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  groupHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: BrandColors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
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
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  menuSubtitle: {
    fontSize: 11,
    color: BrandColors.textMuted,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  appVersion: {
    fontSize: 11,
    color: BrandColors.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
})
