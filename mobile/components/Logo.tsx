import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { BrandColors } from '@/constants/Colors'

interface LogoProps {
  size?: number
  showTagline?: boolean
}

export function Logo({ size = 36, showTagline = true }: LogoProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/logo-icon.png')}
        style={[styles.logoIcon, { width: size, height: size }]}
        contentFit="contain"
        transition={200}
      />
      <View style={styles.textContainer}>
        <View style={styles.brandRow}>
          <Text style={styles.brandBleje}>Bleje</Text>
          <Text style={styles.brandPronen}>Pronën</Text>
        </View>
        {showTagline && (
          <Text style={styles.brandTagline}>Gjej pronën tënde ideale në Kosovë</Text>
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
  logoIcon: {
    borderRadius: 9,
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
    color: BrandColors.primary, // #006459
    letterSpacing: -0.5,
  },
  brandPronen: {
    fontSize: 21,
    fontWeight: '900',
    color: BrandColors.gold, // #C8B882
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 11,
    color: BrandColors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
})
