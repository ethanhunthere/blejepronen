import { API_BASE_URL } from './api'
import { supabase } from './supabase'

export interface FollowUserItem {
  id: string
  name: string
  avatarUrl: string
  isCompany: boolean
  isVerified: boolean
  isFollowingViewer?: boolean
}

export interface FollowStats {
  followersCount: number
  followingCount: number
  isFollowing: boolean
  currentUserId: string | null
  followers?: FollowUserItem[]
  following?: FollowUserItem[]
  viewerFollowingIds?: string[]
}

const TIMEOUT_MS = 12000

async function resilientRequest(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown = null
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(timer)
      return res
    } catch (e) {
      clearTimeout(timer)
      lastError = e
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 400))
      }
    }
  }
  void lastError
  throw new Error('Lidhja me serverin dështoi. Kontrollo internetin dhe provo përsëri.')
}

/**
 * Fetch follow counts and optionally full follower/following lists for a profile.
 */
export async function fetchFollowStats(
  targetUserId: string,
  includeLists = false,
  accessToken?: string | null
): Promise<FollowStats> {
  const url = `${API_BASE_URL}/api/follow?targetUserId=${encodeURIComponent(
    targetUserId
  )}${includeLists ? '&includeLists=1' : ''}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const res = await resilientRequest(url, {
    method: 'GET',
    headers,
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => null)
    throw new Error(errData?.message || 'Dështoi ngarkimi i të dhënave të ndjekësve.')
  }

  const data = await res.json()
  return {
    followersCount: typeof data.followersCount === 'number' ? data.followersCount : 0,
    followingCount: typeof data.followingCount === 'number' ? data.followingCount : 0,
    isFollowing: Boolean(data.isFollowing),
    currentUserId: data.currentUserId ?? null,
    followers: Array.isArray(data.followers) ? data.followers : undefined,
    following: Array.isArray(data.following) ? data.following : undefined,
    viewerFollowingIds: Array.isArray(data.viewerFollowingIds) ? data.viewerFollowingIds : undefined,
  }
}

/**
 * Follow a profile.
 */
export async function followUser(
  targetUserId: string,
  accessToken?: string
): Promise<{ success: boolean; followersCount?: number; error?: string }> {
  try {
    let token = accessToken
    if (!token) {
      const { data: sessionData } = await supabase.auth.getSession()
      token = sessionData.session?.access_token
    }
    if (!token) {
      return { success: false, error: 'Kërkohet kyçja në llogari.' }
    }

    const res = await resilientRequest(`${API_BASE_URL}/api/follow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetUserId }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      return {
        success: false,
        error: data?.message || 'Dështoi ndjekja e profilit.',
      }
    }

    return {
      success: true,
      followersCount: data.followersCount,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Ndodhi një gabim gjatë lidhjes me serverin.',
    }
  }
}

/**
 * Unfollow a profile.
 */
export async function unfollowUser(
  targetUserId: string,
  accessToken?: string
): Promise<{ success: boolean; followersCount?: number; error?: string }> {
  try {
    let token = accessToken
    if (!token) {
      const { data: sessionData } = await supabase.auth.getSession()
      token = sessionData.session?.access_token
    }
    if (!token) {
      return { success: false, error: 'Kërkohet kyçja në llogari.' }
    }

    const res = await resilientRequest(
      `${API_BASE_URL}/api/follow?targetUserId=${encodeURIComponent(targetUserId)}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      return {
        success: false,
        error: data?.message || 'Dështoi heqja e ndjekjes së profilit.',
      }
    }

    return {
      success: true,
      followersCount: data.followersCount,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Ndodhi një gabim gjatë lidhjes me serverin.',
    }
  }
}
