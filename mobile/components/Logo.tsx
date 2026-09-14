import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { useTheme, Fonts } from '@/constants/theme'

interface LogoProps {
  size?: number
}

export function Logo({ size = 34 }: LogoProps) {
  const { colors, theme } = useTheme()

  const blejeColor = theme === 'green' ? '#FFFFFF' : theme === 'black' ? '#FFFFFF' : '#006459'
  const pronenColor = colors.gold // #C8B882

  // Dynamically select the exact emblem asset to guarantee 0% background mismatch
  const logoSource =
    theme === 'green'
      ? require('@/assets/images/logo-white.png')
      : theme === 'black'
      ? require('@/assets/images/logo-white.png')
      : require('@/assets/images/logo-teal.png')

  return (
    <View style={styles.container}>
      {/* Official Graphical Brand Logo Emblem */}
      <View
        style={[
          styles.iconWrapper,
          {
            width: size + 2,
            height: size + 2,
            backgroundColor: theme === 'green' ? 'transparent' : theme === 'black' ? 'transparent' : 'rgba(0, 100, 89, 0.08)',
          },
        ]}
      >
        <Image
          source={logoSource}
          style={{ width: size, height: size }}
          contentFit="contain"
          transition={150}
        />
      </View>

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
  },
  iconWrapper: {
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
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
