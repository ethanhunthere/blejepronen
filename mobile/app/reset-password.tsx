import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Lock, CheckCircle2 } from 'lucide-react-native'

import { useTheme, useSemantic, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { safeBack } from '@/lib/navigation'

/**
 * Password reset completion screen. Reached from the recovery email via
 * /auth/callback?next=/reset-password (the recovery link sets a session
 * through PKCE, so updateUser is authorized here).
 */
export default function ResetPasswordScreen() {
  const { colors } = useTheme()
  const semantic = useSemantic()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    if (password.length < 8) {
      setError('Fjalëkalimi duhet të ketë të paktën 8 karaktere.')
      return
    }
    if (password !== confirm) {
      setError('Fjalëkalimet nuk përputhen.')
      return
    }
    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setDone(true)
    } catch (err: any) {
      setError('Nuk u ndryshua dot fjalëkalimi. Provoni përsëri.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => safeBack(router, '/login')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Kthehu prapa"
          style={[styles.backBtn, { backgroundColor: colors.surfaceSubtle }]}
        >
          <Text style={[styles.backText, { color: colors.textPrimary }]}>‹</Text>
        </Pressable>

        {done ? (
          <View style={styles.doneBox}>
            <CheckCircle2 size={28} color={colors.primary} />
            <Text style={[styles.doneTitle, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
              Fjalëkalimi u ndryshua
            </Text>
            <Text style={[styles.doneText, { color: colors.textMuted }]}>
              Tani mund të kyçeni me fjalëkalimin e ri.
            </Text>
            <Pressable
              style={[styles.cta, { backgroundColor: colors.primary }]}
              onPress={() => router.replace('/login')}
              accessibilityRole="button"
            >
              <Text style={[styles.ctaText, { color: colors.chipTextActive }]}>Vazhdo te Hyrja</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.iconWrap}>
              <Lock size={22} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
              Vendosni fjalëkalimin e ri
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Zgjidhni një fjalëkalim të fortë me të paktën 8 karaktere.
            </Text>

            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
              placeholder="Fjalëkalimi i ri"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              accessibilityLabel="Fjalëkalimi i ri"
            />
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
              placeholder="Konfirmoni fjalëkalimin"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              accessibilityLabel="Konfirmoni fjalëkalimin"
              onSubmitEditing={() => void handleSubmit()}
            />

            {error ? (
              <Text style={[styles.error, { color: semantic.dangerText }]} role="alert">
                {error}
              </Text>
            ) : null}

            <Pressable
              style={[styles.cta, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
              onPress={() => void handleSubmit()}
              disabled={saving}
              accessibilityRole="button"
            >
              <Text style={[styles.ctaText, { color: colors.chipTextActive }]}>
                {saving ? 'Duke ruajtur…' : 'Ruaj fjalëkalimin'}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, gap: 14 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 22, lineHeight: 26 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,103,91,0.08)',
  },
  title: { fontSize: 22, lineHeight: 28 },
  subtitle: { fontSize: 13, lineHeight: 19 },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  error: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  cta: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 15, fontWeight: '700' },
  doneBox: { gap: 10, alignItems: 'center', paddingTop: 40 },
  doneTitle: { fontSize: 20 },
  doneText: { fontSize: 13, textAlign: 'center' },
})
