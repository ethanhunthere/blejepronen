import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { useTheme, Fonts } from '@/constants/theme'

interface LogoProps {
  size?: number
  showTagline?: boolean
}

export function Logo({ size = 36, showTagline = true }: LogoProps) {
  const { colors, theme } = useTheme()

  const blejeColor = theme === 'green' ? '#FFFFFF' : theme === 'black' ? '#FFFFFF' : '#006459'
  const pronenColor = colors.gold // #C8B882

  return (
    <View style={styles.container}>
      {/* Official Graphical Brand Logo Icon */}
      <View style={[styles.iconWrapper, { width: size + 2, height: size + 2, backgroundColor: colors.surface }]}>
        <Image
          source={require('@/assets/images/logo-icon.png')}
          style={{ width: size, height: size, borderRadius: 8 }}
          contentFit="contain"
          transition={200}
        />
      </View>

      <View style={styles.textContainer}>
        <View style={styles.brandRow}>
          <Text style={[styles.brandBleje, { color: blejeColor }]}>Bleje</Text>
          <Text style={[styles.brandPronen, { color: pronenColor }]}>Pronën</Text>
        </View>
        {showTagline && (
          <Text style={[styles.brandTagline, { color: colors.textMuted }]}>
            Gjej pronën tënde ideale në Kosovë
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textContainer: {
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  brandBleje: {
    fontSize: 21,
    fontWeight: '900',
    fontFamily: Fonts.black,
    letterSpacing: -0.5,
  },
  brandPronen: {
    fontSize: 21,
    fontWeight: '900',
    fontFamily: Fonts.black,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Fonts.medium,
    marginTop: 1,
  },
})
