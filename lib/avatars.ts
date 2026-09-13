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

/**
 * Returns a guaranteed valid avatar URL.
 * Falls back to DEFAULT_AVATAR (/avatars/avatar-1.png) if null, empty, or undefined.
 */
export function getAvatarUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return DEFAULT_AVATAR
  }
  return url
}
