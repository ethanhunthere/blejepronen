export interface BlejeAvatar {
  id: number
  url: string
  name: string
}

export const BLEJE_AVATARS: BlejeAvatar[] = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  url: `/avatars/avatar-${i + 1}.png`,
  name: `Avatar ${i + 1}`,
}))

export const DEFAULT_AVATAR = '/avatars/avatar-1.png'
export const ASSET_BASE_URL = 'https://blejepronen.com'

/**
 * Returns a fully qualified, valid avatar URI for mobile React Native `<Image>`.
 * Seamlessly resolves local web paths like `/avatars/avatar-1.png` to `https://blejepronen.com/avatars/avatar-1.png`.
 */
export function getAvatarUri(url?: string | null): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return `${ASSET_BASE_URL}${DEFAULT_AVATAR}`
  }

  const clean = url.trim()
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean
  }

  if (clean.startsWith('/')) {
    return `${ASSET_BASE_URL}${clean}`
  }

  return `${ASSET_BASE_URL}/${clean}`
}
