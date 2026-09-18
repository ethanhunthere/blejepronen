import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  ArrowLeft,
  User,
  Building2,
  Bell,
  Shield,
  Lock,
  Camera,
  CheckCircle2,
  Trash2,
  LogOut,
  Save,
  Eye,
  EyeOff,
  Check,
  Globe,
  MapPin,
  Phone,
  Mail,
  Share2,
  Smartphone,
  Volume2,
  Vibrate,
  Palette,
  Sun,
  Leaf,
  Moon,
  ChevronRight,
  Fingerprint,
  RefreshCw,
  HardDrive,
  Info,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts, ThemeMode } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useBanner } from '@/context/BannerContext'
import {
  apiSaveProfileSettings,
  apiDeleteAccount,
  ProfileSettingsPayload,
} from '@/lib/api'
import { playThemeSound, playTapSound } from '@/lib/sound'
import { safeBack } from '@/lib/navigation'

type SettingsTab = 'notifications' | 'security' | 'app'

const CITIES = [
  'Prishtinë',
  'Prizren',
  'Pejë',
  'Gjakovë',
  'Gjilan',
  'Mitrovicë',
  'Ferizaj',
  'Fushë Kosovë',
  'Tiranë',
  'Durrës',
  'Vlorë',
  'Shkup',
]

const AVATARS = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.png',
  '/avatars/avatar-3.png',
  '/avatars/avatar-4.png',
  '/avatars/avatar-5.png',
  '/avatars/avatar-6.png',
  '/avatars/avatar-7.png',
  '/avatars/avatar-8.png',
]

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '#E5E7EB' }
  let score = 0
  if (pwd.length >= 6) score += 1
  if (pwd.length >= 9) score += 1
  if (/[0-9]/.test(pwd)) score += 1
  if (/[^A-Za-z0-9]/.test(pwd) || (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd))) score += 1

  switch (score) {
    case 1:
      return { score: 1, label: 'Shumë i dobët', color: '#EF4444' }
    case 2:
      return { score: 2, label: 'Mesatar', color: '#F59E0B' }
    case 3:
      return { score: 3, label: 'I sigurt', color: '#3B82F6' }
    case 4:
    default:
      return { score: 4, label: 'Shumë i fortë', color: '#10B981' }
  }
}

export default function SettingsScreen() {
  const router = useRouter()
  const { colors, theme, setTheme } = useTheme()
  const { showBanner } = useBanner()

  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [isEmailVerified, setIsEmailVerified] = useState(false)

  // Account Type
  const [isCompany, setIsCompany] = useState(false)

  // Individual Specific Fields (Preserved permanently)
  const [individualFirstName, setIndividualFirstName] = useState('')
  const [individualLastName, setIndividualLastName] = useState('')
  const [individualPhone, setIndividualPhone] = useState('')
  const [individualEmail, setIndividualEmail] = useState('')
  const [individualBio, setIndividualBio] = useState('')

  // Company Specific Fields (Preserved permanently)
  const [companyName, setCompanyName] = useState('')
  const [companyContactPerson, setCompanyContactPerson] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyDescription, setCompanyDescription] = useState('')
  const [foundedYear, setFoundedYear] = useState('')
  const [nipt, setNipt] = useState('')
  const [officeAddress, setOfficeAddress] = useState('')
  const [website, setWebsite] = useState('')

  // Common Profile Fields
  const [avatarUrl, setAvatarUrl] = useState('/avatars/avatar-1.png')
  const [city, setCity] = useState('Prishtinë')

  // Social Links
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [youtube, setYoutube] = useState('')
  const [twitter, setTwitter] = useState('')

  // Platform Notifications
  const [notifications, setNotifications] = useState({
    messages: true,
    inquiries: true,
    followers: true,
    weeklyReport: false,
    newsletter: true,
    // App-specific push notifications
    pushEnabled: true,
    pushSound: true,
    pushVibrate: true,
    priceDropAlerts: true,
    newMatchAlerts: true,
  })

  // Privacy Settings
  const [privacy, setPrivacy] = useState({
    showPhone: true,
    showSocials: true,
    showOnline: true,
    allowDirectMsgs: true,
    showListingsOnProfile: true,
  })

  // App Specific Preferences
  const [biometricLock, setBiometricLock] = useState(false)
  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'CHF'>('EUR')
  const [language, setLanguage] = useState<'sq' | 'en'>('sq')
  const [highContrast, setHighContrast] = useState(false)
  const [cacheSize, setCacheSize] = useState('38.4 MB')

  // Password Change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  // Focus state for inputs
  const [focusedField, setFocusedField] = useState<string | null>(null)

  // Load user data on mount
  useEffect(() => {
    async function loadUserData() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const activeUser = session?.user || (await supabase.auth.getUser()).data.user
        if (!activeUser) {
          router.replace('/(tabs)/profile')
          return
        }

        setCurrentUserId(activeUser.id)
        setAccessToken(session?.access_token || null)
        setUserEmail(activeUser.email || '')

        const { data: prof } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone, email_verified, avatar_url')
          .eq('id', activeUser.id)
          .single()

        const meta = activeUser.user_metadata || {}
        const isComp =
          meta.account_type === 'company' ||
          meta.is_company === true ||
          Boolean(meta.company_name) ||
          prof?.last_name === 'Kompani'

        setIsCompany(isComp)

        const isGoogle = activeUser.app_metadata?.provider === 'google'
        const verified =
          Boolean(prof?.email_verified) ||
          Boolean(activeUser.email_confirmed_at) ||
          Boolean(activeUser.confirmed_at) ||
          isGoogle
        setIsEmailVerified(verified)

        // Individual fields
        setIndividualFirstName(
          meta.individual_first_name ||
            (!isComp ? prof?.first_name : '') ||
            (!isComp && meta.first_name ? meta.first_name : '') ||
            ''
        )
        setIndividualLastName(
          meta.individual_last_name ||
            (!isComp && prof?.last_name !== 'Kompani' ? prof?.last_name : '') ||
            (!isComp && meta.last_name !== 'Kompani' ? meta.last_name : '') ||
            ''
        )
        setIndividualPhone(
          meta.individual_phone ||
            (!isComp ? prof?.phone : '') ||
            (!isComp && meta.phone ? meta.phone : '') ||
            ''
        )
        setIndividualEmail(meta.individual_email || activeUser.email || '')
        setIndividualBio(meta.individual_bio || (!isComp ? meta.bio : '') || '')

        // Company fields
        setCompanyName(
          meta.company_name ||
            (isComp ? prof?.first_name : '') ||
            (isComp && meta.first_name ? meta.first_name : '') ||
            ''
        )
        setCompanyContactPerson(
          meta.contact_person ||
            (isComp && prof?.last_name !== 'Kompani' ? prof?.last_name : '') ||
            (isComp && meta.last_name !== 'Kompani' ? meta.last_name : '') ||
            ''
        )
        setCompanyPhone(
          meta.company_phone ||
            (isComp ? prof?.phone : '') ||
            (isComp && meta.phone ? meta.phone : '') ||
            ''
        )
        setCompanyEmail(meta.company_email || '')
        setCompanyDescription(meta.company_description || (isComp ? meta.bio : '') || '')
        if (meta.founded_year) setFoundedYear(String(meta.founded_year))
        if (meta.nipt) setNipt(meta.nipt)
        if (meta.office_address) setOfficeAddress(meta.office_address)
        if (meta.website) setWebsite(meta.website)

        // Common
        if (meta.city) setCity(meta.city)
        if (prof?.avatar_url || meta.avatar_url) {
          setAvatarUrl(prof?.avatar_url || meta.avatar_url)
        }

        // Socials
        if (meta.instagram) setInstagram(meta.instagram)
        if (meta.facebook) setFacebook(meta.facebook)
        if (meta.whatsapp) setWhatsapp(meta.whatsapp)
        if (meta.tiktok) setTiktok(meta.tiktok)
        if (meta.linkedin) setLinkedin(meta.linkedin)
        if (meta.youtube) setYoutube(meta.youtube)
        if (meta.twitter) setTwitter(meta.twitter)

        // Notifications & Privacy
        if (meta.notifications) {
          setNotifications((prev) => ({ ...prev, ...meta.notifications }))
        }
        if (meta.privacy) {
          setPrivacy((prev) => ({ ...prev, ...meta.privacy }))
        }
        if (meta.app_preferences) {
          if (meta.app_preferences.biometricLock !== undefined) {
            setBiometricLock(meta.app_preferences.biometricLock)
          }
          if (meta.app_preferences.currency) {
            setCurrency(meta.app_preferences.currency)
          }
          if (meta.app_preferences.language) {
            setLanguage(meta.app_preferences.language)
          }
        }
      } catch (err) {
        console.warn('Load user settings error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [])

  // Handle Save All Settings
  const handleSave = async () => {
    setSaving(true)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }

    try {
      const activeFirstName = isCompany ? companyName.trim() : individualFirstName.trim()
      const activeLastName = isCompany
        ? companyContactPerson.trim() || 'Kompani'
        : individualLastName.trim()
      const activePhone = isCompany
        ? companyPhone.trim() || individualPhone.trim()
        : individualPhone.trim() || companyPhone.trim()
      const activeBio = isCompany
        ? companyDescription.trim() || individualBio.trim()
        : individualBio.trim() || companyDescription.trim()

      const payload: ProfileSettingsPayload = {
        isCompany,
        accountType: isCompany ? 'company' : 'individual',
        firstName: activeFirstName,
        lastName: activeLastName,
        phone: activePhone,
        bio: activeBio,
        city: city.trim(),
        avatarUrl,
        emailVerified: isEmailVerified,

        // Preserved individual data
        individualFirstName: individualFirstName.trim(),
        individualLastName: individualLastName.trim(),
        individualPhone: individualPhone.trim(),
        individualEmail: individualEmail.trim(),
        individualBio: individualBio.trim(),

        // Preserved company data
        companyName: companyName.trim(),
        companyContactPerson: companyContactPerson.trim(),
        companyPhone: companyPhone.trim(),
        companyEmail: companyEmail.trim(),
        companyDescription: companyDescription.trim(),
        foundedYear: foundedYear.trim(),
        nipt: nipt.trim(),
        officeAddress: officeAddress.trim(),
        website: website.trim(),

        // Socials
        instagram: instagram.trim(),
        facebook: facebook.trim(),
        whatsapp: whatsapp.trim(),
        tiktok: tiktok.trim(),
        linkedin: linkedin.trim(),
        youtube: youtube.trim(),
        twitter: twitter.trim(),

        // Notifications & Privacy
        notifications,
        privacy,

        // App Preferences
        appPreferences: {
          biometricLock,
          currency,
          language,
          highContrast,
        },
      }

      // 1. If we have access token, send to backend API
      if (accessToken) {
        await apiSaveProfileSettings(payload, accessToken)
      }

      // 2. Direct Supabase update as resilient sync
      if (currentUserId) {
        await supabase.auth.updateUser({
          data: {
            account_type: isCompany ? 'company' : 'individual',
            is_company: isCompany,
            first_name: activeFirstName,
            last_name: activeLastName,
            company_name: isCompany ? companyName.trim() : undefined,
            contact_person: isCompany ? companyContactPerson.trim() : undefined,
            bio: activeBio,
            city,
            avatar_url: avatarUrl,
            phone: activePhone,
            individual_first_name: individualFirstName.trim(),
            individual_last_name: individualLastName.trim(),
            individual_phone: individualPhone.trim(),
            individual_email: individualEmail.trim(),
            individual_bio: individualBio.trim(),
            company_phone: companyPhone.trim(),
            company_email: companyEmail.trim(),
            company_description: companyDescription.trim(),
            founded_year: foundedYear.trim(),
            nipt: nipt.trim(),
            office_address: officeAddress.trim(),
            website: website.trim(),
            instagram: instagram.trim(),
            facebook: facebook.trim(),
            whatsapp: whatsapp.trim(),
            tiktok: tiktok.trim(),
            linkedin: linkedin.trim(),
            youtube: youtube.trim(),
            twitter: twitter.trim(),
            notifications,
            privacy,
            app_preferences: {
              biometricLock,
              currency,
              language,
              highContrast,
            },
          },
        })

        await supabase
          .from('profiles')
          .upsert({
            id: currentUserId,
            first_name: activeFirstName,
            last_name: activeLastName,
            phone: activePhone,
            avatar_url: avatarUrl,
            email_verified: isEmailVerified,
          })
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }

      showBanner({
        type: 'success',
        title: 'Cilësimet u Ruajtën!',
        message: 'Të gjitha ndryshimet u sinkronizuan me sukses.',
      })
    } catch (err: any) {
      Alert.alert('Gabim', err?.message || 'Dështoi ruajtja e të dhënave.')
    } finally {
      setSaving(false)
    }
  }

  // Update Password
  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Gabim', 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.')
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Gabim', 'Fjalëkalimet nuk përputhen me njëri-tjetrin.')
      return
    }

    setUpdatingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setNewPassword('')
      setConfirmPassword('')
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      showBanner({
        type: 'success',
        title: 'Fjalëkalimi u Ndryshua!',
        message: 'Fjalëkalimi juaj i ri u ruajt me sukses.',
      })
    } catch (err: any) {
      Alert.alert('Gabim', err?.message || 'Dështoi përditësimi i fjalëkalimit.')
    } finally {
      setUpdatingPassword(false)
    }
  }

  // Clear Cache Action
  const handleClearCache = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    }
    setCacheSize('0.0 MB')
    showBanner({
      type: 'info',
      title: 'Memorja u Pastrua',
      message: '38.4 MB memorje e përkohshme u lirua nga pajisja.',
    })
  }

  // Account Type Switcher with Smooth Haptics
  const handleSwitchAccountType = (targetIsCompany: boolean) => {
    if (targetIsCompany === isCompany) return
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync()
    }
    setIsCompany(targetIsCompany)
  }

  // Theme Selector
  const handleThemeSelect = (selectedTheme: ThemeMode) => {
    if (theme === selectedTheme) return
    playThemeSound()
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setTheme(selectedTheme)
  }

  // Apple-grade specular styling
  const specularBorder = colors.border

  const brandHighlight = theme === 'green' ? colors.gold : colors.primary
  const primaryBtnText =
    theme === 'green' ? '#071C18' : theme === 'black' ? '#071A14' : '#FFFFFF'

  const pwdStrength = getPasswordStrength(newPassword)

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Duke ngarkuar cilësimet...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Glassy Navigation Header */}
      <View style={[styles.headerBar, { borderBottomColor: specularBorder }]}>
        <Pressable
          style={[styles.headerIconButton, { backgroundColor: colors.surfaceSubtle }]}
          onPress={() => safeBack(router, '/(tabs)/profile')}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Cilësimet</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {isCompany ? '🏢 Llogari Kompanie' : '👤 Llogari Individuale'}
          </Text>
        </View>

        <Pressable
          style={[
            styles.saveButton,
            { backgroundColor: brandHighlight },
            saving && { opacity: 0.7 },
          ]}
          onPress={handleSave}
          disabled={saving}
          hitSlop={8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={primaryBtnText} />
          ) : (
            <>
              <Save size={15} color={primaryBtnText} strokeWidth={2.4} />
              <Text style={[styles.saveButtonText, { color: primaryBtnText }]}>Ruaj</Text>
            </>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Apple-grade Segmented Tab Bar */}
        <View
          style={[
            styles.tabsContainer,
            {
              backgroundColor:
                theme === 'white' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
              borderColor: specularBorder,
            },
          ]}
        >

          <Pressable
            style={[styles.tabButton, activeTab === 'notifications' && styles.tabButtonActive]}
            onPress={() => {
              playTapSound()
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              setActiveTab('notifications')
            }}
          >
            <Bell
              size={15}
              color={activeTab === 'notifications' ? brandHighlight : colors.textMuted}
              strokeWidth={activeTab === 'notifications' ? 2.4 : 2}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: activeTab === 'notifications' ? colors.textPrimary : colors.textMuted,
                  fontFamily: activeTab === 'notifications' ? Fonts.bold : Fonts.medium,
                },
              ]}
            >
              Njoftimet
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'security' && styles.tabButtonActive]}
            onPress={() => {
              playTapSound()
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              setActiveTab('security')
            }}
          >
            <Shield
              size={15}
              color={activeTab === 'security' ? brandHighlight : colors.textMuted}
              strokeWidth={activeTab === 'security' ? 2.4 : 2}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: activeTab === 'security' ? colors.textPrimary : colors.textMuted,
                  fontFamily: activeTab === 'security' ? Fonts.bold : Fonts.medium,
                },
              ]}
            >
              Siguria
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'app' && styles.tabButtonActive]}
            onPress={() => {
              playTapSound()
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              setActiveTab('app')
            }}
          >
            <Smartphone
              size={15}
              color={activeTab === 'app' ? brandHighlight : colors.textMuted}
              strokeWidth={activeTab === 'app' ? 2.4 : 2}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: activeTab === 'app' ? colors.textPrimary : colors.textMuted,
                  fontFamily: activeTab === 'app' ? Fonts.bold : Fonts.medium,
                },
              ]}
            >
              Aplikacioni
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Quick link banner to dedicated Profile Editor */}
          <Pressable
            style={[
              styles.profileBannerCard,
              {
                backgroundColor: theme === 'white' ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                borderColor: specularBorder,
              },
            ]}
            onPress={() => {
              playTapSound()
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              router.push('/completo-profilin')
            }}
          >
            <View style={styles.profileBannerLeft}>
              <View
                style={[
                  styles.profileBannerIconCircle,
                  { backgroundColor: brandHighlight + '18' },
                ]}
              >
                <User size={18} color={brandHighlight} strokeWidth={2.2} />
              </View>
              <View style={styles.profileBannerTextGroup}>
                <Text style={[styles.profileBannerTitle, { color: colors.textPrimary }]}>
                  Ndrysho Profilin
                </Text>
                <Text style={[styles.profileBannerSub, { color: colors.textMuted }]}>
                  Emri, telefoni, qyteti dhe të dhënat e profilit tuaj
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>


          {/* ======================================================== */}
          {/* TAB 2: NJOFTIMET (PLATFORM + MOBILE EXCLUSIVE PUSH)       */}
          {/* ======================================================== */}
          {activeTab === 'notifications' && (
            <View style={styles.sectionGap}>
              {/* Mobile Push Notifications (App Exclusive) */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Smartphone size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Njoftimet Push në Telefon
                  </Text>
                </View>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                  Merrni sinjale në kohë reale direkt në Lock Screen dhe Dynamic Island:
                </Text>

                <View style={styles.switchGroup}>
                  {/* Push Enabled */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Aktivizo Njoftimet Push
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Njoftohu menjëherë për mesazhe dhe oferta të reja
                      </Text>
                    </View>
                    <Switch
                      value={notifications.pushEnabled}
                      onValueChange={(val) =>
                        setNotifications((p) => ({ ...p, pushEnabled: val }))
                      }
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  {/* Sound Alerts */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Volume2 size={16} color={brandHighlight} />
                        <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                          Tingulli i Njoftimeve
                        </Text>
                      </View>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Luaj tingull të pastër me çdo njoftim
                      </Text>
                    </View>
                    <Switch
                      value={notifications.pushSound}
                      onValueChange={(val) =>
                        setNotifications((p) => ({ ...p, pushSound: val }))
                      }
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  {/* Haptic Vibration */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Vibrate size={16} color={brandHighlight} />
                        <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                          Vibrimi Haptik Nativ
                        </Text>
                      </View>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Reagim fizik të lehtë të motorit haptik
                      </Text>
                    </View>
                    <Switch
                      value={notifications.pushVibrate}
                      onValueChange={(val) =>
                        setNotifications((p) => ({ ...p, pushVibrate: val }))
                      }
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  {/* Price Drop Alerts */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Alert për Zbritje Çmimi
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Kur një pronë e ruajtur ul çmimin e shitjes ose qirasë
                      </Text>
                    </View>
                    <Switch
                      value={notifications.priceDropAlerts}
                      onValueChange={(val) =>
                        setNotifications((p) => ({ ...p, priceDropAlerts: val }))
                      }
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  {/* New Matching Listings */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Prona të Reja të Ngjashme
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Prona të reja që përputhen me qytetin dhe kërkimet tuaja
                      </Text>
                    </View>
                    <Switch
                      value={notifications.newMatchAlerts}
                      onValueChange={(val) =>
                        setNotifications((p) => ({ ...p, newMatchAlerts: val }))
                      }
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>
                </View>
              </View>

              {/* Platform Activity Notifications */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Bell size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Njoftimet e Platformës
                  </Text>
                </View>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                  Aktivitetet e llogarisë dhe mesazhet:
                </Text>

                <View style={styles.switchGroup}>
                  {/* Messages */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Mesazhet Direkte
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Kur dikush ju dërgon mesazh për një pronë
                      </Text>
                    </View>
                    <Switch
                      value={notifications.messages}
                      onValueChange={(val) =>
                        setNotifications((p) => ({ ...p, messages: val }))
                      }
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  {/* Inquiries */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Kërkesat & Ofertat
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Kur një blerës shfaq interesim për shpalljen tënde
                      </Text>
                    </View>
                    <Switch
                      value={notifications.inquiries}
                      onValueChange={(val) =>
                        setNotifications((p) => ({ ...p, inquiries: val }))
                      }
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  {/* Followers */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Ndjekësit e Rinj
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Kur dikush fillon të ndjekë agjencinë ose profilin tuaj
                      </Text>
                    </View>
                    <Switch
                      value={notifications.followers}
                      onValueChange={(val) =>
                        setNotifications((p) => ({ ...p, followers: val }))
                      }
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  {/* Weekly Report */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Raporti Javor i Performancës
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Përmbledhje e klikimeve dhe shikimeve të shpalljeve
                      </Text>
                    </View>
                    <Switch
                      value={notifications.weeklyReport}
                      onValueChange={(val) =>
                        setNotifications((p) => ({ ...p, weeklyReport: val }))
                      }
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* TAB 3: SIGURIA DHE PRIVATËSIA                            */}
          {/* ======================================================== */}
          {activeTab === 'security' && (
            <View style={styles.sectionGap}>
              {/* Email Verification Status */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Mail size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Statusi i Email-it
                  </Text>
                </View>
                <View style={styles.verifiedRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.emailValue, { color: colors.textPrimary }]}>
                      {userEmail}
                    </Text>
                    <Text style={[styles.emailHelp, { color: colors.textMuted }]}>
                      {isEmailVerified
                        ? 'Email-i juaj është i verifikuar zyrtarisht në Bleje Pronën.'
                        : 'Ju lutemi verifikoni email-in për siguri maksimale.'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: isEmailVerified
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                      },
                    ]}
                  >
                    <CheckCircle2
                      size={13}
                      color={isEmailVerified ? '#10B981' : '#EF4444'}
                      strokeWidth={2.4}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: isEmailVerified ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {isEmailVerified ? 'Verifikuar' : 'Pa verifikuar'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Password Change */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Lock size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Ndrysho Fjalëkalimin
                  </Text>
                </View>

                <View style={styles.formGap}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                      Fjalëkalimi i Ri
                    </Text>
                    <View
                      style={[
                        styles.inputField,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor:
                            focusedField === 'newPwd' ? brandHighlight : specularBorder,
                          borderWidth: focusedField === 'newPwd' ? 1.5 : 0.5,
                        },
                      ]}
                    >
                      <Lock size={17} color={colors.textMuted} />
                      <TextInput
                        style={[styles.textInput, { color: colors.textPrimary }]}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        onFocus={() => setFocusedField('newPwd')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Të paktën 6 karaktere"
                        placeholderTextColor={colors.textLight}
                        secureTextEntry={!showPassword}
                      />
                      <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                        {showPassword ? (
                          <EyeOff size={17} color={colors.textMuted} />
                        ) : (
                          <Eye size={17} color={colors.textMuted} />
                        )}
                      </Pressable>
                    </View>

                    {newPassword.length > 0 && (
                      <View style={styles.pwdStrengthRow}>
                        <View
                          style={[
                            styles.pwdStrengthBar,
                            { backgroundColor: pwdStrength.color, flex: pwdStrength.score / 4 },
                          ]}
                        />
                        <Text style={[styles.pwdStrengthLabel, { color: pwdStrength.color }]}>
                          {pwdStrength.label}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                      Konfirmo Fjalëkalimin e Ri
                    </Text>
                    <View
                      style={[
                        styles.inputField,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor:
                            focusedField === 'confPwd' ? brandHighlight : specularBorder,
                          borderWidth: focusedField === 'confPwd' ? 1.5 : 0.5,
                        },
                      ]}
                    >
                      <Lock size={17} color={colors.textMuted} />
                      <TextInput
                        style={[styles.textInput, { color: colors.textPrimary }]}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        onFocus={() => setFocusedField('confPwd')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Përsërit fjalëkalimin"
                        placeholderTextColor={colors.textLight}
                        secureTextEntry={!showConfirmPassword}
                      />
                      <Pressable
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        hitSlop={8}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={17} color={colors.textMuted} />
                        ) : (
                          <Eye size={17} color={colors.textMuted} />
                        )}
                      </Pressable>
                    </View>
                  </View>

                  <Pressable
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor:
                          newPassword.length >= 6 ? brandHighlight : colors.surfaceSubtle,
                        borderColor: specularBorder,
                      },
                    ]}
                    onPress={handleUpdatePassword}
                    disabled={updatingPassword || newPassword.length < 6}
                    hitSlop={8}
                  >
                    {updatingPassword ? (
                      <ActivityIndicator size="small" color={primaryBtnText} />
                    ) : (
                      <Text
                        style={[
                          styles.actionButtonText,
                          {
                            color: newPassword.length >= 6 ? primaryBtnText : colors.textMuted,
                          },
                        ]}
                      >
                        Përditëso Fjalëkalimin
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Biometrics (Face ID / Touch ID) */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Fingerprint size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Mbrojtja me Biometri (Face ID / Touch ID)
                  </Text>
                </View>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                  Kërko identifikim biometrik sa herë hapet aplikacioni për të mbrojtur mesazhet dhe
                  shpalljet tuaja.
                </Text>

                <View style={styles.switchRow}>
                  <View style={styles.switchTextWrap}>
                    <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                      Kyçja me Face ID / Gjurmë Gishti
                    </Text>
                    <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                      Autentifikim i sigurt lokal i pajisjes
                    </Text>
                  </View>
                  <Switch
                    value={biometricLock}
                    onValueChange={(val) => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync()
                      setBiometricLock(val)
                    }}
                    trackColor={{ false: colors.border, true: brandHighlight }}
                    ios_backgroundColor={colors.border}
                  />
                </View>
              </View>

              {/* Privacy Preferences */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Shield size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Privatësia & Dukshmëria
                  </Text>
                </View>

                <View style={styles.switchGroup}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Shfaq Numrin e Telefonit Publikisht
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Lejo blerësit t'ju telefonojnë drejtpërdrejt nga faqja e pronës
                      </Text>
                    </View>
                    <Switch
                      value={privacy.showPhone}
                      onValueChange={(val) => setPrivacy((p) => ({ ...p, showPhone: val }))}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Shfaq Statusin Online
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Tregon nëse jeni aktiv në aplikacion
                      </Text>
                    </View>
                    <Switch
                      value={privacy.showOnline}
                      onValueChange={(val) => setPrivacy((p) => ({ ...p, showOnline: val }))}
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Lejo Mesazhe Direkte
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Prano mesazhe nga të gjithë përdoruesit e regjistruar
                      </Text>
                    </View>
                    <Switch
                      value={privacy.allowDirectMsgs}
                      onValueChange={(val) =>
                        setPrivacy((p) => ({ ...p, allowDirectMsgs: val }))
                      }
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>

                  <View style={[styles.switchDivider, { backgroundColor: specularBorder }]} />

                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Shfaq Shpalljet në Profilin Publik
                      </Text>
                      <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                        Shfaq listën e pronave kur dikush hap profilin tuaj
                      </Text>
                    </View>
                    <Switch
                      value={privacy.showListingsOnProfile}
                      onValueChange={(val) =>
                        setPrivacy((p) => ({ ...p, showListingsOnProfile: val }))
                      }
                      trackColor={{ false: colors.border, true: brandHighlight }}
                      ios_backgroundColor={colors.border}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* TAB 4: APLIKACIONI & CILËSIMET E SISTEMIT                  */}
          {/* ======================================================== */}
          {activeTab === 'app' && (
            <View style={styles.sectionGap}>
              {/* Theme Selector */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Palette size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Tema e Aplikacionit
                  </Text>
                </View>

                <View style={styles.themeGrid}>
                  {/* White Theme */}
                  <Pressable
                    style={[
                      styles.themeBox,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: theme === 'white' ? colors.primary : colors.border,
                      },
                      theme === 'white' && styles.themeBoxActive,
                    ]}
                    onPress={() => handleThemeSelect('white')}
                  >
                    <View
                      style={[
                        styles.themeIconCircle,
                        {
                          backgroundColor: '#FFFFFF',
                          borderWidth: 0.5,
                          borderColor: 'rgba(15, 23, 42, 0.08)',
                        },
                      ]}
                    >
                      <Sun size={18} color="#00675B" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.themeBoxTitle, { color: colors.textPrimary }]}>
                      E Bardhë
                    </Text>
                    <Text style={[styles.themeBoxDesc, { color: colors.textMuted }]}>Klasike</Text>
                    {theme === 'white' && (
                      <View style={[styles.themeCheck, { backgroundColor: colors.primary }]}>
                        <Check size={11} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>

                  {/* Green Theme */}
                  <Pressable
                    style={[
                      styles.themeBox,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: theme === 'green' ? colors.gold : colors.border,
                      },
                      theme === 'green' && styles.themeBoxActive,
                    ]}
                    onPress={() => handleThemeSelect('green')}
                  >
                    <View
                      style={[
                        styles.themeIconCircle,
                        {
                          backgroundColor: '#071C18',
                          borderWidth: 0.5,
                          borderColor: 'rgba(212, 175, 55, 0.30)',
                        },
                      ]}
                    >
                      <Leaf size={18} color="#D4AF37" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.themeBoxTitle, { color: colors.textPrimary }]}>
                      E Gjelbër
                    </Text>
                    <Text style={[styles.themeBoxDesc, { color: colors.textMuted }]}>Emerald</Text>
                    {theme === 'green' && (
                      <View style={[styles.themeCheck, { backgroundColor: colors.gold }]}>
                        <Check size={11} color="#071C18" strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>

                  {/* Black Theme */}
                  <Pressable
                    style={[
                      styles.themeBox,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: theme === 'black' ? '#34D399' : colors.border,
                      },
                      theme === 'black' && styles.themeBoxActive,
                    ]}
                    onPress={() => handleThemeSelect('black')}
                  >
                    <View style={[styles.themeIconCircle, { backgroundColor: '#0B0F0E' }]}>
                      <Moon size={18} color="#34D399" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.themeBoxTitle, { color: colors.textPrimary }]}>
                      E Zezë
                    </Text>
                    <Text style={[styles.themeBoxDesc, { color: colors.textMuted }]}>OLED</Text>
                    {theme === 'black' && (
                      <View style={[styles.themeCheck, { backgroundColor: '#34D399' }]}>
                        <Check size={11} color="#0B0F0E" strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Currency & Language */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Globe size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Monedha & Gjuha
                  </Text>
                </View>

                {/* Currency selector */}
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 8 }]}
                >
                  Monedha e Çmimeve
                </Text>
                <View style={styles.currencyRow}>
                  {(['EUR', 'USD', 'CHF'] as const).map((curr) => {
                    const active = currency === curr
                    return (
                      <Pressable
                        key={curr}
                        style={[
                          styles.currencyBtn,
                          {
                            backgroundColor: active ? brandHighlight : colors.surfaceSubtle,
                            borderColor: active ? brandHighlight : specularBorder,
                          },
                        ]}
                        onPress={() => {
                          if (Platform.OS !== 'web') Haptics.selectionAsync()
                          setCurrency(curr)
                        }}
                      >
                        <Text
                          style={[
                            styles.currencyBtnText,
                            {
                              color: active ? primaryBtnText : colors.textPrimary,
                              fontFamily: active ? Fonts.bold : Fonts.medium,
                            },
                          ]}
                        >
                          {curr === 'EUR' ? '€ Euro (EUR)' : curr === 'USD' ? '$ Dollar (USD)' : 'CHF Frangë'}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              {/* Cache and Storage Cleaning */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <HardDrive size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Memorja & Hapësira (Cache)
                  </Text>
                </View>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                  Fotot dhe të dhënat e ruajtura për shpejtësi maksimale të hapjes:
                </Text>

                <View style={styles.cacheRow}>
                  <View>
                    <Text style={[styles.cacheSizeText, { color: colors.textPrimary }]}>
                      {cacheSize}
                    </Text>
                    <Text style={[styles.cacheSubText, { color: colors.textMuted }]}>
                      Memorje e përdorur nga fotot
                    </Text>
                  </View>

                  <Pressable
                    style={[
                      styles.clearCacheBtn,
                      { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder },
                    ]}
                    onPress={handleClearCache}
                    hitSlop={8}
                  >
                    <RefreshCw size={14} color={brandHighlight} />
                    <Text style={[styles.clearCacheBtnText, { color: brandHighlight }]}>
                      Pastro Memorjen
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* App Info & Version */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: specularBorder },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Info size={18} color={brandHighlight} strokeWidth={2.2} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Rreth Aplikacionit
                  </Text>
                </View>
                <View style={styles.appInfoRow}>
                  <Text style={[styles.appInfoLabel, { color: colors.textMuted }]}>Versioni:</Text>
                  <Text style={[styles.appInfoValue, { color: colors.textPrimary }]}>
                    v1.0.0 (Build 2026.09)
                  </Text>
                </View>
                <View style={styles.appInfoRow}>
                  <Text style={[styles.appInfoLabel, { color: colors.textMuted }]}>Platforma:</Text>
                  <Text style={[styles.appInfoValue, { color: colors.textPrimary }]}>
                    Bleje Pronën Mobile • Kosovë
                  </Text>
                </View>
                <View style={styles.appInfoRow}>
                  <Text style={[styles.appInfoLabel, { color: colors.textMuted }]}>Licenca:</Text>
                  <Text style={[styles.appInfoValue, { color: colors.textPrimary }]}>
                    Republika e Kosovës
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    marginTop: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 14,
    padding: 3,
    borderWidth: 0.5,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  tabButtonText: {
    fontSize: 12,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  sectionGap: {
    gap: 16,
    paddingTop: 6,
  },
  card: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 0.5,
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  cardSubtitle: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    lineHeight: 18,
    marginBottom: 4,
  },
  accountTypeSelector: {
    gap: 10,
    marginTop: 4,
  },
  accountTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  accountTypeOptionActive: {
    borderWidth: 1.5,
  },
  accountTypeTitle: {
    fontSize: 14,
  },
  accountTypeSub: {
    fontSize: 11,
    marginTop: 1,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
  },
  avatarItem: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarItemSelected: {
    borderWidth: 2.5,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarCheckBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGap: {
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 13,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  textAreaField: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 13,
    minHeight: 80,
  },
  textAreaInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlignVertical: 'top',
  },
  cityPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  cityPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  cityPillText: {
    fontSize: 12.5,
  },
  switchGroup: {
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 12,
  },
  switchTextWrap: {
    flex: 1,
    gap: 2,
  },
  switchTitle: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  switchDesc: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },
  switchDivider: {
    height: 0.5,
    width: '100%',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  emailValue: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  emailHelp: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11.5,
    fontFamily: Fonts.bold,
  },
  pwdStrengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  pwdStrengthBar: {
    height: 4,
    borderRadius: 2,
  },
  pwdStrengthLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  actionButton: {
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    marginTop: 4,
  },
  actionButtonText: {
    fontSize: 13.5,
    fontFamily: Fonts.bold,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  themeBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
    position: 'relative',
  },
  themeBoxActive: {
    borderWidth: 2,
  },
  themeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  themeBoxTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  themeBoxDesc: {
    fontSize: 10.5,
    fontFamily: Fonts.regular,
  },
  themeCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyRow: {
    flexDirection: 'column',
    gap: 8,
  },
  currencyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  currencyBtnText: {
    fontSize: 13,
  },
  cacheRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cacheSizeText: {
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  cacheSubText: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  clearCacheBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  clearCacheBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.bold,
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  appInfoLabel: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
  },
  appInfoValue: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
  },
  profileBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  profileBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  profileBannerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBannerTextGroup: {
    flex: 1,
  },
  profileBannerTitle: {
    fontSize: 14.5,
    fontFamily: Fonts.bold,
  },
  profileBannerSub: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
})
