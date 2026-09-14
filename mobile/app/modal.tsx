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
import { X, Mail, Lock, User, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'

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
      setErrorMessage('Ju lutemi shkruani një email të vlefshëm.')
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

  const primaryBtnText =
    theme === 'green' ? '#003E37' : '#FFFFFF'

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
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: colors.badgeBg }]}>
            <Sparkles size={13} color={colors.badgeText} strokeWidth={2.4} />
            <Text style={[styles.badgeText, { color: colors.badgeText }]}>Bleje Pronën ID</Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {activeTab === 'login' ? 'Mirësevini Përsëri' : 'Krijoni Llogari Falas'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {activeTab === 'login'
              ? 'Kyçuni për të menaxhuar pronat dhe ofertat tuaja'
              : 'Bashkohuni me mijëra përdorues në Kosovë'}
          </Text>
        </View>

        {/* Tab Switcher (Kyçu / Regjistrohu) */}
        <View style={[styles.tabSwitcher, { backgroundColor: colors.surfaceSubtle }]}>
          <Pressable
            style={[
              styles.tabBtn,
              activeTab === 'login' && [
                styles.tabBtnActive,
                {
                  backgroundColor: colors.surface,
                  shadowColor: '#000',
                  shadowOpacity: theme === 'black' ? 0.3 : 0.08,
                },
              ],
            ]}
            onPress={() => handleTabChange('login')}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'login' ? colors.textPrimary : colors.textMuted },
                activeTab === 'login' && { fontFamily: Fonts.bold },
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
                  shadowColor: '#000',
                  shadowOpacity: theme === 'black' ? 0.3 : 0.08,
                },
              ],
            ]}
            onPress={() => handleTabChange('register')}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'register' ? colors.textPrimary : colors.textMuted },
                activeTab === 'register' && { fontFamily: Fonts.bold },
              ]}
            >
              Regjistrohu
            </Text>
          </Pressable>
        </View>

        {/* Error Alert */}
        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Form Inputs */}
        <View style={styles.form}>
          {activeTab === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Emri dhe Mbiemri
              </Text>
              <View
                style={[
                  styles.inputField,
                  { backgroundColor: colors.searchBg, borderColor: colors.searchBorder },
                ]}
              >
                <User size={18} color={colors.textMuted} strokeWidth={2} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="psh. Artan Krasniqi"
                  placeholderTextColor={colors.textLight}
                  value={fullName}
                  onChangeText={setFullName}
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
                { backgroundColor: colors.searchBg, borderColor: colors.searchBorder },
              ]}
            >
              <Mail size={18} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                placeholder="shembull@email.com"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={setEmail}
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
                { backgroundColor: colors.searchBg, borderColor: colors.searchBorder },
              ]}
            >
              <Lock size={18} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                placeholder="Të paktën 6 karaktere"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
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

          {/* Submit CTA */}
          <Pressable
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primary },
              loading && styles.submitBtnDisabled,
            ]}
            onPress={handleAuthSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={primaryBtnText} />
            ) : (
              <Text style={[styles.submitBtnText, { color: primaryBtnText }]}>
                {activeTab === 'login' ? 'Kyçu Menjëherë' : 'Krijo Llogari'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Security badge */}
        <View style={styles.securityNote}>
          <ShieldCheck size={14} color={colors.textLight} strokeWidth={2} />
          <Text style={[styles.securityText, { color: colors.textLight }]}>
            Të dhënat tuaja ruhen me enkriptim të sigurt sipas standardeve më të larta
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
    width: 36,
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
  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.extraBold,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
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
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
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
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 16,
  },
  securityText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 15,
  },
})
