import React, { memo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { useTheme, Fonts } from '@/constants/theme'
import {
  LOGO_TEAL_DATA_URI,
  LOGO_WHITE_DATA_URI,
} from '@/assets/brand/logo-data'

interface LogoProps {
  size?: number
}

export const Logo = memo(function Logo({ size = 36 }: LogoProps) {
  const { colors, theme } = useTheme()

  const blejeColor = theme === 'green' ? '#FFFFFF' : theme === 'black' ? '#FFFFFF' : colors.primary
  const pronenColor = colors.gold

  // Inlined Base64 Data URI: 100% memory-resident in JS bundle.
  // 0ms network latency, zero Metro HTTP dev-server requests, immune to tunnel latency.
  const logoDataUri = theme === 'white' ? LOGO_TEAL_DATA_URI : LOGO_WHITE_DATA_URI
  const fontSize = Math.max(16, Math.round(size * 0.58))

  return (
    <View style={styles.container}>
      {/* Official Graphical Brand Logo Emblem - Hardware-accelerated native layer binding (0ms first frame) */}
      <Image
        source={{ uri: logoDataUri }}
        style={{ width: size, height: size }}
        contentFit="contain"
        priority="high"
        cachePolicy="memory"
        transition={0}
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
})

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
