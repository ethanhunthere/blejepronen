import React from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { Image } from 'expo-image'
import { useTheme, Fonts } from '@/constants/theme'

interface LogoProps {
  size?: number
}

export function Logo({ size = 36 }: LogoProps) {
  const { colors, theme } = useTheme()

  const blejeColor = theme === 'green' ? '#FFFFFF' : theme === 'black' ? '#FFFFFF' : '#006459'
  const pronenColor = colors.gold // #C8B882

  // On white theme: green (#006459) transparent PNG without background
  // On green theme: white (#FFFFFF) transparent PNG without background
  // On black theme: white (#FFFFFF) transparent PNG without background
  const logoSource =
    theme === 'white'
      ? require('@/assets/images/logo-teal.png')
      : require('@/assets/images/logo-white.png')

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
          <Text style={[styles.brandBleje, { color: blejeColor }]}>Bleje</Text>
          <Text style={[styles.brandPronen, { color: pronenColor }]}>Pronën</Text>
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
