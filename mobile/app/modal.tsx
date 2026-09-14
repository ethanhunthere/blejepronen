import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  LogIn,
  UserPlus,
  ArrowRight,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'

export default function AuthModalScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ initialTab?: string }>()
  const { colors, theme } = useTheme()

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    params.initialTab === 'register' ? 'register' : 'login'
  )

  // Form Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<'fullName' | 'email' | 'password' | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleTabChange = (tab: 'login' | 'register') => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setActiveTab(tab)
    setErrorMessage(null)
  }

  const handleAuthSubmit = async () => {
    setErrorMessage(null)
    const trimmedEmail = email.trim()

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Ju lutemi shkruani një adresë email të vlefshme.')
      return
    }

    if (!password || password.length < 6) {
      setErrorMessage('Fjalëkalimi duhet të ketë të paktën 6 karaktere.')
      return
    }

    setLoading(true)

    try {
      if (activeTab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrorMessage('Email ose fjalëkalimi nuk është i saktë.')
          } else {
            setErrorMessage(error.message)
          }
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          }
          return
        }

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }
        router.back()
      } else {
        // Register flow
        const [firstName, ...lastNameParts] = fullName.trim().split(' ')
        const lastName = lastNameParts.join(' ')

        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              first_name: firstName || 'Përdorues',
              last_name: lastName || '',
            },
          },
        })

        if (error) {
          setErrorMessage(error.message)
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          }
          return
        }

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }

        Alert.alert(
          'Llogaria u krijua!',
          'Mirësevini në Bleje Pronën! Llogaria juaj është gati për përdorim.',
          [{ text: 'Vazhdo', onPress: () => router.back() }]
        )
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ndodhi një gabim i papritur.')
    } finally {
      setLoading(false)
    }
  }

  const primaryBtnText = theme === 'green' ? '#003E37' : '#FFFFFF'
  const brandHighlight = theme === 'green' ? colors.gold : colors.primary

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Top Drag Handle & Close */}
      <View style={styles.topBar}>
        <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
        <Pressable
          style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <X size={18} color={colors.textSecondary} strokeWidth={2.4} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Official Brand Logo & Text */}
        <View style={styles.brandHero}>
          <Logo size={42} />
          <Text style={[styles.brandTagline, { color: colors.textMuted }]}>
            Platforma #1 e Patundshmërive në Kosovë
          </Text>
        </View>

        {/* 2. Contextual Title & Subtitle */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {activeTab === 'login' ? 'Mirësevini Përsëri' : 'Krijoni Llogari Falas'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {activeTab === 'login'
              ? 'Kyçuni për të menaxhuar pronat, ofertat dhe bisedat'
              : 'Bëhuni pjesë e Bleje Pronën për të postuar dhe kontaktuar'}
          </Text>
        </View>

        {/* 3. Luxury Apple/Airbnb-Grade Segmented Tabs (Kyçu / Regjistrohu) */}
        <View
          style={[
            styles.tabSwitcher,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
          ]}
        >
          <Pressable
            style={[
              styles.tabBtn,
              activeTab === 'login' && [
                styles.tabBtnActive,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: '#000',
                  shadowOpacity: theme === 'black' ? 0.35 : 0.08,
                },
              ],
            ]}
            onPress={() => handleTabChange('login')}
          >
            <LogIn
              size={16}
              color={activeTab === 'login' ? brandHighlight : colors.textMuted}
              strokeWidth={activeTab === 'login' ? 2.5 : 2}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === 'login' ? colors.textPrimary : colors.textMuted,
                  fontFamily: activeTab === 'login' ? Fonts.bold : Fonts.medium,
                },
              ]}
            >
              Kyçu
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tabBtn,
              activeTab === 'register' && [
                styles.tabBtnActive,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: '#000',
                  shadowOpacity: theme === 'black' ? 0.35 : 0.08,
                },
              ],
            ]}
            onPress={() => handleTabChange('register')}
          >
            <UserPlus
              size={16}
              color={activeTab === 'register' ? brandHighlight : colors.textMuted}
              strokeWidth={activeTab === 'register' ? 2.5 : 2}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === 'register' ? colors.textPrimary : colors.textMuted,
                  fontFamily: activeTab === 'register' ? Fonts.bold : Fonts.medium,
                },
              ]}
            >
              Regjistrohu
            </Text>
          </Pressable>
        </View>

        {/* 4. Error Alert */}
        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* 5. Clean Input Fields */}
        <View style={styles.form}>
          {activeTab === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Emri dhe Mbiemri
              </Text>
              <View
                style={[
                  styles.inputField,
                  {
                    backgroundColor: colors.searchBg,
                    borderColor:
                      focusedField === 'fullName' ? brandHighlight : colors.searchBorder,
                    borderWidth: focusedField === 'fullName' ? 1.5 : 1,
                  },
                ]}
              >
                <User
                  size={18}
                  color={focusedField === 'fullName' ? brandHighlight : colors.textMuted}
                  strokeWidth={2}
                />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="psh. Artan Krasniqi"
                  placeholderTextColor={colors.textLight}
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Adresa Email</Text>
            <View
              style={[
                styles.inputField,
                {
                  backgroundColor: colors.searchBg,
                  borderColor: focusedField === 'email' ? brandHighlight : colors.searchBorder,
                  borderWidth: focusedField === 'email' ? 1.5 : 1,
                },
              ]}
            >
              <Mail
                size={18}
                color={focusedField === 'email' ? brandHighlight : colors.textMuted}
                strokeWidth={2}
              />
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                placeholder="shembull@email.com"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Fjalëkalimi</Text>
            <View
              style={[
                styles.inputField,
                {
                  backgroundColor: colors.searchBg,
                  borderColor:
                    focusedField === 'password' ? brandHighlight : colors.searchBorder,
                  borderWidth: focusedField === 'password' ? 1.5 : 1,
                },
              ]}
            >
              <Lock
                size={18}
                color={focusedField === 'password' ? brandHighlight : colors.textMuted}
                strokeWidth={2}
              />
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                placeholder="Të paktën 6 karaktere"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                {showPassword ? (
                  <EyeOff size={18} color={colors.textMuted} />
                ) : (
                  <Eye size={18} color={colors.textMuted} />
                )}
              </Pressable>
            </View>
          </View>

          {/* 6. Submit CTA Button */}
          <Pressable
            style={[
              styles.submitBtn,
              { backgroundColor: brandHighlight },
              loading && styles.submitBtnDisabled,
            ]}
            onPress={handleAuthSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={primaryBtnText} />
            ) : (
              <View style={styles.submitBtnInner}>
                <Text style={[styles.submitBtnText, { color: primaryBtnText }]}>
                  {activeTab === 'login' ? 'Kyçu në Llogari' : 'Krijo Llogarinë'}
                </Text>
                <ArrowRight size={18} color={primaryBtnText} strokeWidth={2.4} />
              </View>
            )}
          </Pressable>

          {/* 7. Quick Switcher Prompt */}
          <View style={styles.switchPromptRow}>
            <Text style={[styles.switchPromptText, { color: colors.textMuted }]}>
              {activeTab === 'login' ? 'Nuk keni llogari ende?' : 'Keni tashmë një llogari?'}
            </Text>
            <Pressable
              onPress={() => handleTabChange(activeTab === 'login' ? 'register' : 'login')}
              hitSlop={8}
            >
              <Text style={[styles.switchActionText, { color: brandHighlight }]}>
                {activeTab === 'login' ? 'Regjistrohuni falas' : 'Kyçuni këtu'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 8. Trust & Security Badge */}
        <View
          style={[
            styles.securityNote,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
          ]}
        >
          <ShieldCheck size={16} color={colors.primary} strokeWidth={2.2} />
          <Text style={[styles.securityText, { color: colors.textSecondary }]}>
            Komunikim dhe të dhëna të mbrojtura me enkriptim të sigurt sipas standardeve më të larta
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginHorizontal: 'auto',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  brandHero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 14,
    gap: 6,
  },
  brandTagline: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 6,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  submitBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  switchPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 4,
  },
  switchPromptText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  switchActionText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  securityText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    flex: 1,
    lineHeight: 15,
  },
})
