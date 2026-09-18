export const BrandColors = {
  primary: '#00675B',
  primaryDark: '#004D43',
  primaryLight: '#E8F5F2',
  primaryMuted: 'rgba(0, 103, 91, 0.08)',
  gold: '#D4AF37',
  goldLight: 'rgba(212, 175, 55, 0.16)',
  background: '#F5F7FA',
  card: '#FFFFFF',
  cardBorder: 'rgba(15, 23, 42, 0.08)',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  border: 'rgba(15, 23, 42, 0.08)',
  danger: '#EF4444',
  success: '#10B981',
}

export default {
  light: {
    text: BrandColors.textPrimary,
    background: BrandColors.background,
    tint: BrandColors.primary,
    tabIconDefault: BrandColors.textLight,
    tabIconSelected: BrandColors.primary,
    card: BrandColors.card,
    border: BrandColors.border,
  },
  dark: {
    text: '#FFFFFF',
    background: '#0B1514',
    tint: '#34D399',
    tabIconDefault: '#4B5563',
    tabIconSelected: '#34D399',
    card: '#132321',
    border: '#1F3431',
  },
}
