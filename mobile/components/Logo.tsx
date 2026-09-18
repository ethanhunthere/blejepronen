import React from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { Image } from 'expo-image'
import { useTheme, Fonts } from '@/constants/theme'

interface LogoProps {
  size?: number
}

export function Logo({ size = 36 }: LogoProps) {
  const { colors, theme } = useTheme()

  const blejeColor = theme === 'green' ? '#FFFFFF' : theme === 'black' ? '#FFFFFF' : colors.primary
  const pronenColor = colors.gold

  // On white theme: green transparent PNG without background
  // On green theme: white transparent PNG without background
  // On black theme: white transparent PNG without background
  const logoSource =
    theme === 'white'
      ? require('@/assets/images/logo-teal.png')
      : require('@/assets/images/logo-white.png')

  const fontSize = Math.max(16, Math.round(size * 0.58))

  return (
    <View style={styles.container}>
      {/* Official Graphical Brand Logo Emblem - Transparent PNG with No Background */}
      <Image
        source={logoSource}
        style={{ width: size, height: size }}
        contentFit="contain"
        transition={100}
      />

      <View style={styles.textContainer}>
        <View style={styles.brandRow}>
          <Text style={[styles.brandBleje, { color: blejeColor, fontSize, lineHeight: fontSize + 3 }]}>
            Bleje
          </Text>
          <Text style={[styles.brandPronen, { color: pronenColor, fontSize, lineHeight: fontSize + 3 }]}>
            Pronën
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'transparent',
  },
  textContainer: {
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingTop: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  brandBleje: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Fonts.black,
    letterSpacing: -0.6,
  },
  brandPronen: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Fonts.black,
    letterSpacing: -0.6,
  },
})
