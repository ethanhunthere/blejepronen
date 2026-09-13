export interface SocialLinks {
  instagram?: string | null
  facebook?: string | null
  whatsapp?: string | null
  tiktok?: string | null
}

export function normalizeSocialUrl(
  platform: 'instagram' | 'facebook' | 'whatsapp' | 'tiktok',
  input?: string | null
): string {
  if (!input || !input.trim()) return ''
  let val = input.trim()

  if (platform === 'instagram') {
    val = val.replace(/^@/, '')
    if (val.startsWith('http://') || val.startsWith('https://')) return val
    if (val.includes('instagram.com/')) {
      return `https://${val.replace(/^https?:\/\//, '')}`
    }
    return `https://instagram.com/${val}`
  }

  if (platform === 'facebook') {
    if (val.startsWith('http://') || val.startsWith('https://')) return val
    if (val.includes('facebook.com/')) {
      return `https://${val.replace(/^https?:\/\//, '')}`
    }
    return `https://facebook.com/${val}`
  }

  if (platform === 'tiktok') {
    val = val.replace(/^@/, '')
    if (val.startsWith('http://') || val.startsWith('https://')) return val
    if (val.includes('tiktok.com/')) {
      return `https://${val.replace(/^https?:\/\//, '')}`
    }
    return `https://tiktok.com/@${val}`
  }

  if (platform === 'whatsapp') {
    if (val.startsWith('https://wa.me/')) return val
    const clean = val.replace(/\D/g, '')
    // Local Kosovo/Albania conversion
    let intl = clean
    if (clean.startsWith('04') && clean.length === 9) intl = '383' + clean.slice(1)
    else if (clean.startsWith('06') && clean.length === 10) intl = '355' + clean.slice(1)
    return intl ? `https://wa.me/${intl}` : ''
  }

  return val
}

export function formatSocialHandle(
  platform: 'instagram' | 'facebook' | 'whatsapp' | 'tiktok',
  input?: string | null
): string {
  if (!input || !input.trim()) return ''
  let val = input.trim()

  try {
    if (val.startsWith('http://') || val.startsWith('https://')) {
      const url = new URL(val)
      val = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '')
    }
  } catch {}

  val = val.replace(/^@/, '')

  if (platform === 'instagram' || platform === 'tiktok') {
    return `@${val}`
  }

  return val
}

export function hasAnySocial(socials?: SocialLinks | null): boolean {
  if (!socials) return false
  return Boolean(
    socials.instagram?.trim() ||
    socials.facebook?.trim() ||
    socials.whatsapp?.trim() ||
    socials.tiktok?.trim()
  )
}
