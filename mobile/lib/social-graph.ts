import { API_BASE_URL } from './api'
import { supabase } from './supabase'
import { getSyncAuthUser } from './auth-cache'

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

export interface UserSocialMetrics {
  followersCount: number
  followingCount: number
  isFollowing?: boolean
}

export interface SocialGraphEvent {
  targetUserId: string
  viewerUserId: string
  action: 'follow' | 'unfollow'
  targetMetrics: UserSocialMetrics
  viewerMetrics: UserSocialMetrics
}

type SocialGraphListener = (event: SocialGraphEvent) => void

// ─── Reactive In-Memory Store ────────────────────────────────────────────────
class SocialGraphStore {
  private metrics = new Map<string, UserSocialMetrics>()
  private viewerFollowing = new Set<string>()
  private listeners = new Set<SocialGraphListener>()

  subscribe(listener: SocialGraphListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getMetrics(userId: string): UserSocialMetrics | null {
    if (!userId) return null
    return this.metrics.get(userId) || null
  }

  setMetrics(userId: string, partial: Partial<UserSocialMetrics>): UserSocialMetrics {
    const prev = this.metrics.get(userId) || { followersCount: 0, followingCount: 0, isFollowing: false }
    const next: UserSocialMetrics = {
      ...prev,
      ...partial,
      followersCount: Math.max(0, partial.followersCount ?? prev.followersCount),
      followingCount: Math.max(0, partial.followingCount ?? prev.followingCount),
    }
    this.metrics.set(userId, next)
    return next
  }

  isViewerFollowing(targetUserId: string): boolean {
    if (this.viewerFollowing.has(targetUserId)) return true
    const cached = this.metrics.get(targetUserId)
    return Boolean(cached?.isFollowing)
  }

  setViewerFollowing(targetUserId: string, following: boolean): void {
    if (following) {
      this.viewerFollowing.add(targetUserId)
    } else {
      this.viewerFollowing.delete(targetUserId)
    }
    const current = this.getMetrics(targetUserId)
    if (current) {
      current.isFollowing = following
      this.metrics.set(targetUserId, current)
    }
  }

  setViewerFollowingIds(ids: string[]): void {
    this.viewerFollowing.clear()
    for (const id of ids) {
      this.viewerFollowing.add(id)
      const m = this.metrics.get(id)
      if (m) m.isFollowing = true
    }
  }

  notify(event: SocialGraphEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.warn('Social graph listener notification error:', err)
      }
    })
  }
}

export const socialStore = new SocialGraphStore()

export function subscribeSocialGraph(listener: SocialGraphListener): () => void {
  return socialStore.subscribe(listener)
}

export function getSocialMetrics(userId: string): UserSocialMetrics | null {
  return socialStore.getMetrics(userId)
}

export function setSocialMetrics(userId: string, partial: Partial<UserSocialMetrics>): UserSocialMetrics {
  return socialStore.setMetrics(userId, partial)
}

const TIMEOUT_MS = 10000

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
        await new Promise((r) => setTimeout(r, 300))
      }
    }
  }
  void lastError
  throw new Error('Lidhja me serverin dështoi. Kontrollo internetin dhe provo përsëri.')
}

/**
 * Fetch follow counts and optionally full follower/following lists for a profile.
 * Fast-paths direct PostgreSQL public.follows counts for zero UI delay (~35ms).
 */
export async function fetchFollowStats(
  targetUserId: string,
  includeLists = false,
  accessToken?: string | null
): Promise<FollowStats> {
  if (!targetUserId) {
    return { followersCount: 0, followingCount: 0, isFollowing: false, currentUserId: null }
  }

  // 1. Fast Direct PostgreSQL query for instant response
  try {
    const currentViewer = getSyncAuthUser()
    const viewerId = currentViewer?.id || null

    const [{ count: fCount, error: fErr }, { count: ingCount, error: ingErr }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId),
    ])

    if (!fErr && !ingErr && typeof fCount === 'number' && typeof ingCount === 'number') {
      let isFollowing = false
      if (viewerId) {
        const { data: myFollow } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', viewerId)
          .eq('following_id', targetUserId)
          .maybeSingle()
        isFollowing = Boolean(myFollow)
      }

      const followersCount = fCount
      const followingCount = ingCount

      // Update reactive store
      socialStore.setMetrics(targetUserId, { followersCount, followingCount, isFollowing })
      if (viewerId) {
        socialStore.setViewerFollowing(targetUserId, isFollowing)
      }

      if (!includeLists) {
        return {
          followersCount,
          followingCount,
          isFollowing,
          currentUserId: viewerId,
        }
      }
    }
  } catch {
    // Fall through to resilient API endpoint
  }

  // 2. Full HTTP Route Fallback (with follower/following lists if requested)
  const url = `${API_BASE_URL}/api/follow?targetUserId=${encodeURIComponent(
    targetUserId
  )}${includeLists ? '&includeLists=1' : ''}`

  let token = accessToken
  if (!token) {
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
    token = sessionData?.session?.access_token || null
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
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
  const followersCount = typeof data.followersCount === 'number' ? data.followersCount : 0
  const followingCount = typeof data.followingCount === 'number' ? data.followingCount : 0
  const isFollowing = Boolean(data.isFollowing)

  // Update reactive store
  socialStore.setMetrics(targetUserId, { followersCount, followingCount, isFollowing })
  socialStore.setViewerFollowing(targetUserId, isFollowing)
  if (Array.isArray(data.viewerFollowingIds)) {
    socialStore.setViewerFollowingIds(data.viewerFollowingIds)
  }

  return {
    followersCount,
    followingCount,
    isFollowing,
    currentUserId: data.currentUserId ?? null,
    followers: Array.isArray(data.followers) ? data.followers : undefined,
    following: Array.isArray(data.following) ? data.following : undefined,
    viewerFollowingIds: Array.isArray(data.viewerFollowingIds) ? data.viewerFollowingIds : undefined,
  }
}

/**
 * Bidirectional, Instant Optimistic Follow/Unfollow with Synchronous Frame-0 Pub/Sub Broadcast
 */
export async function toggleFollowUser(
  targetUserId: string,
  targetProfileSeed?: { followersCount?: number; followingCount?: number; name?: string }
): Promise<{ success: boolean; isFollowing: boolean; followersCount: number; error?: string }> {
  const currentViewer = getSyncAuthUser()
  if (!currentViewer?.id) {
    return {
      success: false,
      isFollowing: false,
      followersCount: 0,
      error: 'Kërkohet kyçja në llogari.',
    }
  }

  const viewerId = currentViewer.id
  if (viewerId === targetUserId) {
    return {
      success: false,
      isFollowing: false,
      followersCount: 0,
      error: 'Nuk mund të ndiqni llogarinë tuaj.',
    }
  }

  // 1. Current states
  const targetPrev = socialStore.getMetrics(targetUserId) || {
    followersCount: targetProfileSeed?.followersCount ?? 0,
    followingCount: targetProfileSeed?.followingCount ?? 0,
    isFollowing: false,
  }
  const viewerPrev = socialStore.getMetrics(viewerId) || {
    followersCount: 0,
    followingCount: 0,
    isFollowing: false,
  }

  const wasFollowing = socialStore.isViewerFollowing(targetUserId)
  const nextIsFollowing = !wasFollowing
  const delta = nextIsFollowing ? 1 : -1

  // 2. Synchronous Instant Optimistic Store Update (<1ms!)
  const targetNext: UserSocialMetrics = {
    ...targetPrev,
    followersCount: Math.max(0, targetPrev.followersCount + delta),
    isFollowing: nextIsFollowing,
  }
  const viewerNext: UserSocialMetrics = {
    ...viewerPrev,
    followingCount: Math.max(0, viewerPrev.followingCount + delta),
  }

  socialStore.setMetrics(targetUserId, targetNext)
  socialStore.setMetrics(viewerId, viewerNext)
  socialStore.setViewerFollowing(targetUserId, nextIsFollowing)

  // 3. Immediately broadcast to all subscribers on frame zero
  socialStore.notify({
    targetUserId,
    viewerUserId: viewerId,
    action: nextIsFollowing ? 'follow' : 'unfollow',
    targetMetrics: targetNext,
    viewerMetrics: viewerNext,
  })

  // 4. Execute Backend Persistence (Direct PostgreSQL first, then HTTP fallback)
  try {
    let operationSucceeded = false

    // Direct Supabase public.follows mutation
    try {
      if (nextIsFollowing) {
        const { error: insErr } = await supabase.from('follows').insert({
          follower_id: viewerId,
          following_id: targetUserId,
        })
        if (!insErr || insErr.code === '23505') { // 23505 = duplicate key unique violation (already following)
          operationSucceeded = true
        }
      } else {
        const { error: delErr } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', viewerId)
          .eq('following_id', targetUserId)
        if (!delErr) {
          operationSucceeded = true
        }
      }
    } catch {
      operationSucceeded = false
    }

    // Resilient fallback to API route if direct SQL was restricted
    if (!operationSucceeded) {
      const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
      const token = sessionData?.session?.access_token

      if (nextIsFollowing) {
        const res = await followUser(targetUserId, token)
        if (!res.success) throw new Error(res.error || 'Dështoi ndjekja e profilit.')
      } else {
        const res = await unfollowUser(targetUserId, token)
        if (!res.success) throw new Error(res.error || 'Dështoi heqja e ndjekjes së profilit.')
      }
    }

    return {
      success: true,
      isFollowing: nextIsFollowing,
      followersCount: targetNext.followersCount,
    }
  } catch (err: any) {
    // 5. Rollback on failure and re-broadcast
    socialStore.setMetrics(targetUserId, targetPrev)
    socialStore.setMetrics(viewerId, viewerPrev)
    socialStore.setViewerFollowing(targetUserId, wasFollowing)

    socialStore.notify({
      targetUserId,
      viewerUserId: viewerId,
      action: wasFollowing ? 'follow' : 'unfollow',
      targetMetrics: targetPrev,
      viewerMetrics: viewerPrev,
    })

    return {
      success: false,
      isFollowing: wasFollowing,
      followersCount: targetPrev.followersCount,
      error: err?.message || 'Ndodhi një gabim gjatë veprimit.',
    }
  }
}

/**
 * Follow a profile (legacy wrapper with store synchronization).
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

    if (typeof data.followersCount === 'number') {
      socialStore.setMetrics(targetUserId, { followersCount: data.followersCount, isFollowing: true })
      socialStore.setViewerFollowing(targetUserId, true)
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
 * Unfollow a profile (legacy wrapper with store synchronization).
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

    if (typeof data.followersCount === 'number') {
      socialStore.setMetrics(targetUserId, { followersCount: data.followersCount, isFollowing: false })
      socialStore.setViewerFollowing(targetUserId, false)
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
