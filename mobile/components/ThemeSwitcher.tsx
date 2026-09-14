import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Sun, Leaf, Moon } from 'lucide-react-native'
import { useTheme, ThemeMode, Fonts } from '@/constants/theme'

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, colors } = useTheme()

  const modes: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: 'white', label: 'E Bardhë', icon: Sun },
    { id: 'green', label: 'E Gjelbër', icon: Leaf },
    { id: 'black', label: 'E Zezë', icon: Moon },
  ]

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
        {modes.map((m) => {
          const Icon = m.icon
          const isActive = theme === m.id
          return (
            <Pressable
              key={m.id}
              style={[
                styles.compactBtn,
                isActive && { backgroundColor: colors.chipActiveBg, shadowColor: '#000', shadowOpacity: 0.15 },
              ]}
              onPress={() => setTheme(m.id)}
            >
              <Icon
                size={14}
                color={isActive ? colors.chipTextActive : colors.textMuted}
                strokeWidth={2.4}
              />
            </Pressable>
          )
        })}
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
      {modes.map((m) => {
        const Icon = m.icon
        const isActive = theme === m.id
        return (
          <Pressable
            key={m.id}
            style={[
              styles.optionBtn,
              isActive && { backgroundColor: colors.chipActiveBg },
            ]}
            onPress={() => setTheme(m.id)}
          >
            <Icon
              size={15}
              color={isActive ? colors.chipTextActive : colors.textMuted}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.optionLabel,
                { color: isActive ? colors.chipTextActive : colors.textSecondary },
              ]}
            >
              {m.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  optionLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  compactContainer: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
  },
  compactBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
