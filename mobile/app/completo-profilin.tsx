import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { BlurView } from 'expo-blur'
import {
  User,
  Building2,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Globe,
  Sparkles,
  Check,
  ChevronLeft,
  ShieldCheck,
  ArrowRight,
  Camera,
  AlertCircle,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useBanner } from '@/context/BannerContext'
import { BLEJE_AVATARS, DEFAULT_AVATAR, getAvatarUri } from '@/lib/avatars'
import { apiSaveProfileSettings, ProfileSettingsPayload } from '@/lib/api'

const { width } = Dimensions.get('window')

const MAJOR_CITIES = [
  'Prishtinë',
  'Prizren',
  'Pejë',
  'Ferizaj',
  'Gjilan',
  'Gjakovë',
  'Mitrovicë',
  'Fushë Kosovë',
  'Podujevë',
  'Vushtrri',
  'Tiranë',
  'Durrës',
]

export default function CompletoProfilinScreen() {
  const router = useRouter()
  const { colors, theme } = useTheme()
  const { showBanner } = useBanner()

  const [loadingInitial, setLoadingInitial] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [accessToken, setAccessToken] = useState<string>('')

  // Account Type
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual')

  // Avatar
  const [selectedAvatar, setSelectedAvatar] = useState<string>(DEFAULT_AVATAR)

  // Individual Fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [individualPhone, setIndividualPhone] = useState('')
  const [individualCity, setIndividualCity] = useState('Prishtinë')
  const [individualBio, setIndividualBio] = useState('')

  // Company Fields
  const [companyName, setCompanyName] = useState('')
  const [companyContactPerson, setCompanyContactPerson] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyCity, setCompanyCity] = useState('Prishtinë')
  const [foundedYear, setFoundedYear] = useState('')
  const [nipt, setNipt] = useState('')
  const [companyDescription, setCompanyDescription] = useState('')
  const [website, setWebsite] = useState('')

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          router.replace('/modal')
          return
        }

        const user = session.user
        setCurrentUser(user)
        setAccessToken(session.access_token)

        const meta = user.user_metadata || {}
        const isComp = meta.account_type === 'company' || Boolean(meta.company_name)
        setAccountType(isComp ? 'company' : 'individual')

        // Fetch DB profile to prefill
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.avatar_url) {
          setSelectedAvatar(profile.avatar_url)
        } else if (meta.avatar_url) {
          setSelectedAvatar(meta.avatar_url)
        }

        // Prefill Individual
        const initialFirst =
          profile?.first_name ||
          meta.first_name ||
          meta.given_name ||
          (meta.full_name ? meta.full_name.split(' ')[0] : '') ||
          ''
        const initialLast =
          profile?.last_name ||
          meta.last_name ||
          meta.family_name ||
          (meta.full_name && meta.full_name.split(' ').length > 1
            ? meta.full_name.split(' ').slice(1).join(' ')
            : '') ||
          ''
        setFirstName(initialFirst)
        setLastName(initialLast)
        setIndividualPhone(profile?.phone || meta.phone || meta.individual_phone || '')
        setIndividualBio(meta.bio || meta.individual_bio || '')
        if (meta.city) setIndividualCity(meta.city)

        // Prefill Company
        setCompanyName(meta.company_name || (isComp ? profile?.first_name : '') || '')
        setCompanyContactPerson(
          meta.contact_person || (isComp && profile?.last_name !== 'Kompani' ? profile?.last_name : '') || ''
        )
        setCompanyPhone(meta.company_phone || (isComp ? profile?.phone : '') || meta.phone || '')
        setFoundedYear(meta.founded_year ? String(meta.founded_year) : '')
        setNipt(meta.nipt || '')
        setCompanyDescription(meta.company_description || meta.bio || '')
        setWebsite(meta.website || '')
        if (meta.city) setCompanyCity(meta.city)
      } catch (e) {
        console.warn('Load user in completo profilin notice:', e)
      } finally {
        setLoadingInitial(false)
      }
    }

    loadData()
  }, [])

  const handleAccountTypeSwitch = (type: 'individual' | 'company') => {
    if (accountType === type) return
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync()
    }
    setAccountType(type)
    setErrors({})
  }

  const handleSelectAvatar = (avatarUrl: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    setSelectedAvatar(avatarUrl)
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}

    if (accountType === 'individual') {
      if (!firstName.trim()) {
        nextErrors.firstName = 'Emri është i detyrueshëm.'
      }
      if (!lastName.trim()) {
        nextErrors.lastName = 'Mbiemri është i detyrueshëm.'
      }
      if (individualPhone.trim() && individualPhone.trim().length < 6) {
        nextErrors.phone = 'Numri i telefonit duhet të ketë të paktën 6 shifra.'
      }
    } else {
      if (!companyName.trim()) {
        nextErrors.companyName = 'Emri i kompanisë është i detyrueshëm.'
      }
      if (!companyContactPerson.trim()) {
        nextErrors.companyContactPerson = 'Personi kontaktues është i detyrueshëm.'
      }
      if (!companyPhone.trim()) {
        nextErrors.companyPhone = 'Numri i telefonit të kompanisë është i detyrueshëm.'
      } else if (companyPhone.trim().length < 6) {
        nextErrors.companyPhone = 'Ju lutem shkruani një numër telefoni të saktë.'
      }
      if (foundedYear.trim()) {
        const year = parseInt(foundedYear.trim(), 10)
        const currentYear = new Date().getFullYear()
        if (isNaN(year) || year < 1920 || year > currentYear) {
          nextErrors.foundedYear = `Viti duhet të jetë midis 1920 dhe ${currentYear}.`
        }
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
      showBanner({
        type: 'error',
        title: 'Plotësoni të dhënat',
        message: 'Ju lutemi plotësoni të gjitha fushat e kërkuara me yll (*).',
      })
      return
    }

    setSubmitting(true)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }

    try {
      const isCompany = accountType === 'company'

      const payload: ProfileSettingsPayload = {
        isCompany,
        accountType,
        avatarUrl: selectedAvatar,
        city: isCompany ? companyCity : individualCity,
        emailVerified: true,

        // Individual fields
        individualFirstName: isCompany ? undefined : firstName.trim(),
        individualLastName: isCompany ? undefined : lastName.trim(),
        individualPhone: isCompany ? undefined : individualPhone.trim(),
        individualBio: isCompany ? undefined : individualBio.trim(),

        // Company fields
        companyName: isCompany ? companyName.trim() : undefined,
        companyContactPerson: isCompany ? companyContactPerson.trim() : undefined,
        companyPhone: isCompany ? companyPhone.trim() : undefined,
        companyDescription: isCompany ? companyDescription.trim() : undefined,
        foundedYear: isCompany ? foundedYear.trim() : undefined,
        nipt: isCompany ? nipt.trim() : undefined,
        website: isCompany ? website.trim() : undefined,

        // Unified top-level helpers
        firstName: isCompany ? companyName.trim() : firstName.trim(),
        lastName: isCompany ? companyContactPerson.trim() : lastName.trim(),
        phone: isCompany ? companyPhone.trim() : individualPhone.trim(),
        bio: isCompany ? companyDescription.trim() : individualBio.trim(),
      }

      const res = await apiSaveProfileSettings(payload, accessToken)

      if (!res.success) {
        showBanner({
          type: 'error',
          title: 'Ruajtja Dështoi',
          message: res.error || 'Ju lutem kontrolloni të dhënat dhe provoni përsëri.',
        })
        setSubmitting(false)
        return
      }

      showBanner({
        type: 'success',
        title: 'Profili u Plotësua!',
        message: isCompany
          ? `Llogaria e agjencisë "${companyName}" u konfigurua me sukses!`
          : `Mirësevini ${firstName}! Profili juaj u plotësua plotësisht.`,
      })

      // Navigate back or to tabs
      router.replace('/(tabs)/profile')
    } catch (err: any) {
      console.error('Save profile completion exception:', err)
      showBanner({
        type: 'error',
        title: 'Gabim i Papritur',
        message: 'Ndodhi një gabim gjatë ruajtjes. Provoni përsëri.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync()
    }
    showBanner({
      type: 'info',
      title: 'Mund ta plotësoni më vonë',
      message: 'Mund të përditësoni profilin tuaj në çdo kohë nga rubrika "Profili".',
    })
    router.replace('/(tabs)/profile')
  }

  const isDark = theme === 'black' || theme === 'green'
  const specularBorder =
    theme === 'white'
      ? 'rgba(0, 0, 0, 0.08)'
      : theme === 'green'
      ? 'rgba(255, 255, 255, 0.16)'
      : 'rgba(255, 255, 255, 0.12)'

  if (loadingInitial) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Po ngarkojmë të dhënat e profilit...
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Navigation Bar */}
        <View style={[styles.navBar, { borderBottomColor: specularBorder }]}>
          <Pressable
            style={[
              styles.navBackBtn,
              { backgroundColor: colors.surface, borderColor: specularBorder },
            ]}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.navTitleWrap}>
            <Text style={[styles.navStep, { color: colors.primary }]}>HAPI 2 NGA 2</Text>
            <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Plotësoni Profilin</Text>
          </View>

          <Pressable onPress={handleSkip} hitSlop={10} style={styles.skipBtn}>
            <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>Kalo</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Banner */}
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
            <View
              style={[
                styles.heroIconBox,
                {
                  backgroundColor:
                    theme === 'green' ? 'rgba(200, 184, 130, 0.2)' : colors.primaryLight,
                },
              ]}
            >
              <Sparkles size={24} color={theme === 'green' ? colors.gold : colors.primary} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroHeading, { color: colors.textPrimary }]}>
                Personalizoni Përvojën Tuaj
              </Text>
              <Text style={[styles.heroSubheading, { color: colors.textSecondary }]}>
                Plotësoni të dhënat kryesore për të pasur një profil të besueshëm dhe të verifikuar në tregun imobiliar.
              </Text>
            </View>
          </View>

          {/* Account Type Selector (Apple Segmented Glass Control) */}
          <View style={[styles.segmentContainer, { backgroundColor: colors.surfaceSubtle, borderColor: specularBorder }]}>
            <Pressable
              style={[
                styles.segmentItem,
                accountType === 'individual' && [
                  styles.segmentItemActive,
                  {
                    backgroundColor: colors.surface,
                    borderColor: theme === 'white' ? colors.border : colors.primary,
                  },
                ],
              ]}
              onPress={() => handleAccountTypeSwitch('individual')}
            >
              <User
                size={18}
                color={
                  accountType === 'individual'
                    ? colors.primary
                    : colors.textMuted
                }
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      accountType === 'individual'
                        ? colors.textPrimary
                        : colors.textMuted,
                    fontFamily: accountType === 'individual' ? Fonts.bold : Fonts.medium,
                  },
                ]}
              >
                Individual
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.segmentItem,
                accountType === 'company' && [
                  styles.segmentItemActive,
                  {
                    backgroundColor: colors.surface,
                    borderColor: theme === 'white' ? colors.border : colors.gold,
                  },
                ],
              ]}
              onPress={() => handleAccountTypeSwitch('company')}
            >
              <Building2
                size={18}
                color={
                  accountType === 'company'
                    ? theme === 'green' ? colors.gold : colors.primary
                    : colors.textMuted
                }
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      accountType === 'company'
                        ? colors.textPrimary
                        : colors.textMuted,
                    fontFamily: accountType === 'company' ? Fonts.bold : Fonts.medium,
                  },
                ]}
              >
                Kompani / Agjenci
              </Text>
            </Pressable>
          </View>

          {/* Avatar Section */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <Camera size={18} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Zgjidhni Avataron
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                  20 avatarë modernë të përzgjedhur nga Bleje Pronën
                </Text>
              </View>
            </View>

            {/* Current Large Avatar Showcase */}
            <View style={styles.avatarShowcaseRow}>
              <View
                style={[
                  styles.largeAvatarWrap,
                  {
                    borderColor: theme === 'green' ? colors.gold : colors.primary,
                    backgroundColor: colors.surfaceSubtle,
                  },
                ]}
              >
                <Image
                  source={{ uri: getAvatarUri(selectedAvatar) }}
                  style={styles.largeAvatarImg}
                  contentFit="cover"
                  transition={200}
                />
                <View style={[styles.avatarBadgeCheck, { backgroundColor: colors.primary }]}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              </View>

              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.avatarTipTitle, { color: colors.textPrimary }]}>
                  {accountType === 'company' ? 'Logo ose Avatar Agjencie' : 'Avatari Juaj Publik'}
                </Text>
                <Text style={[styles.avatarTipDesc, { color: colors.textMuted }]}>
                  Ky imazh do të shfaqet në të gjitha shpalljet, mesazhet dhe profilin tuaj publik.
                </Text>
              </View>
            </View>

            {/* Horizontal 20 Avatars Picker Bar */}
            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
              Zgjidhni një nga koleksioni:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.avatarScrollRow}
            >
              {BLEJE_AVATARS.map((item) => {
                const isSelected = selectedAvatar === item.url
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelectAvatar(item.url)}
                    style={[
                      styles.avatarThumbWrap,
                      {
                        borderColor: isSelected
                          ? theme === 'green' ? colors.gold : colors.primary
                          : specularBorder,
                        backgroundColor: colors.surfaceSubtle,
                      },
                      isSelected && styles.avatarThumbActive,
                    ]}
                  >
                    <Image
                      source={{ uri: getAvatarUri(item.url) }}
                      style={styles.avatarThumbImg}
                      contentFit="cover"
                      transition={150}
                    />
                    {isSelected && (
                      <View
                        style={[
                          styles.avatarThumbCheck,
                          {
                            backgroundColor:
                              theme === 'green' ? colors.gold : colors.primary,
                          },
                        ]}
                      >
                        <Check
                          size={10}
                          color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                          strokeWidth={3}
                        />
                      </View>
                    )}
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>

          {/* Form Fields: Individual */}
          {accountType === 'individual' ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                  <User size={18} color={colors.primary} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Të Dhënat Personale
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                    Informacione për identifikimin tuaj
                  </Text>
                </View>
              </View>

              {/* Emri & Mbiemri Row */}
              <View style={styles.rowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    Emri <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: errors.firstName ? '#EF4444' : specularBorder,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text)
                      if (errors.firstName) setErrors((p) => ({ ...p, firstName: '' }))
                    }}
                    placeholder="p.sh. Alban"
                    placeholderTextColor={colors.textLight}
                  />
                  {errors.firstName && (
                    <Text style={styles.fieldError}>{errors.firstName}</Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    Mbiemri <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: errors.lastName ? '#EF4444' : specularBorder,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text)
                      if (errors.lastName) setErrors((p) => ({ ...p, lastName: '' }))
                    }}
                    placeholder="p.sh. Kelmendi"
                    placeholderTextColor={colors.textLight}
                  />
                  {errors.lastName && (
                    <Text style={styles.fieldError}>{errors.lastName}</Text>
                  )}
                </View>
              </View>

              {/* Numri i Telefonit */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Numri i Telefonit / WhatsApp
                </Text>
                <View
                  style={[
                    styles.phoneInputWrap,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: errors.phone ? '#EF4444' : specularBorder,
                    },
                  ]}
                >
                  <Phone size={18} color={colors.textMuted} strokeWidth={2.2} />
                  <TextInput
                    style={[styles.phoneTextInput, { color: colors.textPrimary }]}
                    value={individualPhone}
                    onChangeText={(text) => {
                      setIndividualPhone(text)
                      if (errors.phone) setErrors((p) => ({ ...p, phone: '' }))
                    }}
                    placeholder="+383 49 123 456"
                    placeholderTextColor={colors.textLight}
                    keyboardType="phone-pad"
                  />
                </View>
                {errors.phone && <Text style={styles.fieldError}>{errors.phone}</Text>}
              </View>

              {/* Qyteti */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Qyteti</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cityChipsRow}
                >
                  {MAJOR_CITIES.map((city) => {
                    const isSelected = individualCity === city
                    return (
                      <Pressable
                        key={city}
                        style={[
                          styles.cityChip,
                          {
                            backgroundColor: isSelected
                              ? theme === 'green' ? colors.gold : colors.primary
                              : colors.surfaceSubtle,
                            borderColor: isSelected
                              ? theme === 'green' ? colors.gold : colors.primary
                              : specularBorder,
                          },
                        ]}
                        onPress={() => {
                          if (Platform.OS !== 'web') Haptics.selectionAsync()
                          setIndividualCity(city)
                        }}
                      >
                        <MapPin
                          size={13}
                          color={
                            isSelected
                              ? theme === 'green' ? '#003E37' : '#FFFFFF'
                              : colors.textMuted
                          }
                          strokeWidth={2.2}
                        />
                        <Text
                          style={[
                            styles.cityChipText,
                            {
                              color: isSelected
                                ? theme === 'green' ? '#003E37' : '#FFFFFF'
                                : colors.textPrimary,
                              fontFamily: isSelected ? Fonts.bold : Fonts.medium,
                            },
                          ]}
                        >
                          {city}
                        </Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>
              </View>

              {/* Bio */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Rreth Meje (Opsionale)
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: specularBorder,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={individualBio}
                  onChangeText={setIndividualBio}
                  placeholder="Shkruani një përshkrim të shkurtër për veten ose preferencat tuaja imobiliare..."
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          ) : (
            /* Form Fields: Company / Agency */
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor:
                        theme === 'green' ? 'rgba(200, 184, 130, 0.2)' : 'rgba(245, 158, 11, 0.14)',
                    },
                  ]}
                >
                  <Building2
                    size={18}
                    color={theme === 'green' ? colors.gold : '#D97706'}
                    strokeWidth={2.2}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Të Dhënat e Agjencisë
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                    Profile të verifikuara për biznese dhe agjentë imobiliarë
                  </Text>
                </View>
              </View>

              {/* Emri i Kompanisë */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Emri i Kompanisë / Agjencisë <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: errors.companyName ? '#EF4444' : specularBorder,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={companyName}
                  onChangeText={(text) => {
                    setCompanyName(text)
                    if (errors.companyName) setErrors((p) => ({ ...p, companyName: '' }))
                  }}
                  placeholder="p.sh. Pristina Real Estate LLC"
                  placeholderTextColor={colors.textLight}
                />
                {errors.companyName && (
                  <Text style={styles.fieldError}>{errors.companyName}</Text>
                )}
              </View>

              {/* Përfaqësuesi & Telefoni Row */}
              <View style={styles.rowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    Përfaqësuesi <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: errors.companyContactPerson ? '#EF4444' : specularBorder,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={companyContactPerson}
                    onChangeText={(text) => {
                      setCompanyContactPerson(text)
                      if (errors.companyContactPerson)
                        setErrors((p) => ({ ...p, companyContactPerson: '' }))
                    }}
                    placeholder="p.sh. Besnik Krasniqi"
                    placeholderTextColor={colors.textLight}
                  />
                  {errors.companyContactPerson && (
                    <Text style={styles.fieldError}>{errors.companyContactPerson}</Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    Telefoni Zyrtar <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: errors.companyPhone ? '#EF4444' : specularBorder,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={companyPhone}
                    onChangeText={(text) => {
                      setCompanyPhone(text)
                      if (errors.companyPhone) setErrors((p) => ({ ...p, companyPhone: '' }))
                    }}
                    placeholder="+383 38 123 456"
                    placeholderTextColor={colors.textLight}
                    keyboardType="phone-pad"
                  />
                  {errors.companyPhone && (
                    <Text style={styles.fieldError}>{errors.companyPhone}</Text>
                  )}
                </View>
              </View>

              {/* Selia / Qyteti */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Qyteti i Selisë
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cityChipsRow}
                >
                  {MAJOR_CITIES.map((city) => {
                    const isSelected = companyCity === city
                    return (
                      <Pressable
                        key={city}
                        style={[
                          styles.cityChip,
                          {
                            backgroundColor: isSelected
                              ? theme === 'green' ? colors.gold : colors.primary
                              : colors.surfaceSubtle,
                            borderColor: isSelected
                              ? theme === 'green' ? colors.gold : colors.primary
                              : specularBorder,
                          },
                        ]}
                        onPress={() => {
                          if (Platform.OS !== 'web') Haptics.selectionAsync()
                          setCompanyCity(city)
                        }}
                      >
                        <MapPin
                          size={13}
                          color={
                            isSelected
                              ? theme === 'green' ? '#003E37' : '#FFFFFF'
                              : colors.textMuted
                          }
                          strokeWidth={2.2}
                        />
                        <Text
                          style={[
                            styles.cityChipText,
                            {
                              color: isSelected
                                ? theme === 'green' ? '#003E37' : '#FFFFFF'
                                : colors.textPrimary,
                              fontFamily: isSelected ? Fonts.bold : Fonts.medium,
                            },
                          ]}
                        >
                          {city}
                        </Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>
              </View>

              {/* Viti i Themelimit & NIPT Row */}
              <View style={styles.rowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    Viti i Themelimit
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: errors.foundedYear ? '#EF4444' : specularBorder,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={foundedYear}
                    onChangeText={(text) => {
                      setFoundedYear(text)
                      if (errors.foundedYear) setErrors((p) => ({ ...p, foundedYear: '' }))
                    }}
                    placeholder="p.sh. 2018"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  {errors.foundedYear && (
                    <Text style={styles.fieldError}>{errors.foundedYear}</Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    NIPT / Nr. Biznesit
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: specularBorder,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={nipt}
                    onChangeText={setNipt}
                    placeholder="p.sh. 811234567"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              </View>

              {/* Website */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Faqja e Internetit / Website (Opsionale)
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: specularBorder,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="https://agjencia.com"
                  placeholderTextColor={colors.textLight}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              {/* Përshkrimi i Kompanisë */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Përshkrimi i Agjencisë
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: specularBorder,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={companyDescription}
                  onChangeText={setCompanyDescription}
                  placeholder="Prezantoni shërbimet tuaja, përvojën në treg dhe zonat ku operoni..."
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <Pressable
              style={[
                styles.saveButton,
                {
                  backgroundColor:
                    theme === 'green' ? colors.gold : colors.primary,
                },
              ]}
              onPress={handleSave}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator
                  size="small"
                  color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                />
              ) : (
                <>
                  <ShieldCheck
                    size={19}
                    color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                    strokeWidth={2.4}
                  />
                  <Text
                    style={[
                      styles.saveButtonText,
                      { color: theme === 'green' ? '#003E37' : '#FFFFFF' },
                    ]}
                  >
                    Ruaj & Përfundo Profilin
                  </Text>
                  <ArrowRight
                    size={18}
                    color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                    strokeWidth={2.4}
                  />
                </>
              )}
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={handleSkip}>
              <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>
                Plotësoje më vonë nga profili
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 60,
    gap: 16,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  navBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  navTitleWrap: {
    alignItems: 'center',
  },
  navStep: {
    fontSize: 10,
    fontFamily: Fonts.extraBold,
    letterSpacing: 0.8,
  },
  navTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  skipBtnText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 0.5,
    gap: 14,
    marginTop: 4,
  },
  heroIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroHeading: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  heroSubheading: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    lineHeight: 16,
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    borderWidth: 0.5,
    gap: 6,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  segmentItemActive: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13.5,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 0.5,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
  avatarShowcaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 6,
  },
  largeAvatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    position: 'relative',
    overflow: 'hidden',
  },
  largeAvatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarBadgeCheck: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarTipTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  avatarTipDesc: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },
  subLabel: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
    marginTop: 4,
  },
  avatarScrollRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  avatarThumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarThumbActive: {
    borderWidth: 2.5,
    transform: [{ scale: 1.05 }],
  },
  avatarThumbImg: {
    width: '100%',
    height: '100%',
  },
  avatarThumbCheck: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldWrap: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  phoneInputWrap: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  textArea: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  fieldError: {
    fontSize: 11,
    color: '#EF4444',
    fontFamily: Fonts.semiBold,
    marginTop: 2,
  },
  cityChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  cityChipText: {
    fontSize: 12.5,
  },
  actionContainer: {
    gap: 12,
    marginTop: 6,
    marginBottom: 20,
  },
  saveButton: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  secondaryButton: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
})
