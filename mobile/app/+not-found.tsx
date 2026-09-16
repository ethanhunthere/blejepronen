import React from 'react'
import { StyleSheet, View, Text, Pressable } from 'react-native'
import { Link, Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Compass, ArrowLeft } from 'lucide-react-native'
import { useTheme, Fonts } from '@/constants/theme'

export default function NotFoundScreen() {
  const { colors, theme } = useTheme()
  const router = useRouter()

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor:
                  theme === 'green'
                    ? 'rgba(200, 184, 130, 0.16)'
                    : colors.primaryLight,
              },
            ]}
          >
            <Compass
              size={36}
              color={theme === 'green' ? colors.gold : colors.primary}
              strokeWidth={2.2}
            />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Faqja nuk ekziston
          </Text>

          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Faqja që po kërkoni nuk mund të gjendet ose adresa e saj ka ndryshuar.
          </Text>

          <Pressable
            style={[
              styles.primaryBtn,
              { backgroundColor: theme === 'green' ? colors.gold : colors.primary },
            ]}
            onPress={() => router.replace('/' as any)}
          >
            <ArrowLeft
              size={18}
              color={theme === 'green' ? '#003E37' : '#FFFFFF'}
              strokeWidth={2.4}
            />
            <Text
              style={[
                styles.primaryBtnText,
                { color: theme === 'green' ? '#003E37' : '#FFFFFF' },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Kthehu në Kryefaqe
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  card: {
    maxWidth: 440,
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 14.5,
    fontFamily: Fonts.bold,
  },
})
