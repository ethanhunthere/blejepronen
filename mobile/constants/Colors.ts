export const BrandColors = {
  primary: '#006459',
  primaryDark: '#005048',
  primaryLight: '#E6F2F1',
  primaryMuted: 'rgba(0, 100, 89, 0.08)',
  gold: '#C8B882',
  goldLight: 'rgba(200, 184, 130, 0.2)',
  background: '#F2F7F7',
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',
  textPrimary: '#101828',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
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
