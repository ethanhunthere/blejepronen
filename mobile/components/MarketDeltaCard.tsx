import { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react-native'

import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'

interface MarketDeltaCardProps {
  city: string
  pricePerM2: number
}

const fmt = (n: number) => new Intl.NumberFormat('de-DE').format(n)

/**
 * Honest market context: this listing's €/m² against the live city median
 * (sale inventory only, computed from up to 1000 active rows).
 */
export function MarketDeltaCard({ city, pricePerM2 }: MarketDeltaCardProps) {
  const { colors, theme } = useTheme()
  const [median, setMedian] = useState<number | null>(null)
  const [sample, setSample] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase
          .from('listings')
          .select('price, area_m2')
          .eq('is_active', true)
          .eq('type', 'shitje')
          .eq('city', city)
          .gt('price', 0)
          .gt('area_m2', 0)
          .order('created_at', { ascending: false })
          .limit(1000)
        if (!mounted) return
        const ppms = (data || [])
          .map((r: { price: number | null; area_m2: number | null }) =>
            r.price && r.area_m2 ? r.price / r.area_m2 : null
          )
          .filter((v): v is number => v !== null)
          .sort((a, b) => a - b)
        setSample(ppms.length)
        setMedian(ppms.length ? Math.round(ppms[Math.floor(ppms.length / 2)]) : null)
      } catch {
        if (mounted) setMedian(null)
      } finally {
        if (mounted) setLoaded(true)
      }
    })()
    return () => {
      mounted = false
    }
  }, [city])

  if (!loaded || !median) return null
  const deltaPct = Math.round(((pricePerM2 - median) / median) * 100)
  const above = deltaPct > 0
  const flat = deltaPct === 0
  const accent = above ? '#B45309' : colors.primary

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme === 'white' ? colors.surfaceSubtle : 'rgba(255,255,255,0.04)',
          borderColor: colors.border,
        },
      ]}
    >
      {flat ? (
        <Minus size={15} color={colors.textMuted} strokeWidth={2.4} />
      ) : above ? (
        <TrendingUp size={15} color={accent} strokeWidth={2.4} />
      ) : (
        <TrendingDown size={15} color={accent} strokeWidth={2.4} />
      )}
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        <Text style={{ fontFamily: Fonts.bold, color: accent }}>
          {above ? '+' : ''}
          {deltaPct}%
        </Text>{' '}
        {flat ? '— sa mediana' : ' vs mediana'} e {city} ({fmt(median)} €/m², {sample} shpallje)
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  text: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
})
