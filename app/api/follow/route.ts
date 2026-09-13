import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Supabase admin environment variables are not configured')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type FollowUserItem = {
  id: string
  name: string
  avatarUrl: string
  isCompany: boolean
  isVerified: boolean
  isFollowingViewer?: boolean
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('targetUserId')
    const includeLists = searchParams.get('includeLists') === '1' || searchParams.get('includeLists') === 'true'

    if (!targetUserId) {
      return NextResponse.json({ error: 'missing_target', message: 'targetUserId is required' }, { status: 400 })
    }

    const serverSupabase = await createServerSupabaseClient()
    const {
      data: { user: currentUser },
    } = await serverSupabase.auth.getUser()
    const currentUserId = currentUser?.id || null

    const admin = getAdminClient()

    // First attempt: check public.follows table
    let useTable = true
    let followersCount = 0
    let followingCount = 0
    let isFollowing = false
    let followerIds: string[] = []
    let followingIds: string[] = []

    try {
      const [{ count: fCount, error: fErr }, { count: ingCount, error: ingErr }] = await Promise.all([
        admin.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId),
        admin.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId),
      ])

      if (fErr || ingErr) {
        useTable = false
      } else {
        followersCount = fCount ?? 0
        followingCount = ingCount ?? 0

        if (currentUserId) {
          const { data: myFollow } = await admin
            .from('follows')
            .select('follower_id')
            .eq('follower_id', currentUserId)
            .eq('following_id', targetUserId)
            .maybeSingle()
          isFollowing = Boolean(myFollow)
        }

        if (includeLists) {
          const [{ data: fList }, { data: ingList }] = await Promise.all([
            admin.from('follows').select('follower_id').eq('following_id', targetUserId).limit(100),
            admin.from('follows').select('following_id').eq('follower_id', targetUserId).limit(100),
          ])
          followerIds = (fList || []).map((r: { follower_id: string }) => r.follower_id)
          followingIds = (ingList || []).map((r: { following_id: string }) => r.following_id)
        }
      }
    } catch {
      useTable = false
    }

    // Fallback if table doesn't exist yet: read from user_metadata
    if (!useTable) {
      const { data: targetUserData } = await admin.auth.admin.getUserById(targetUserId)
      const targetMeta = targetUserData?.user?.user_metadata || {}

      followerIds = Array.isArray(targetMeta.followers) ? targetMeta.followers : []
      followingIds = Array.isArray(targetMeta.following) ? targetMeta.following : []

      followersCount = followerIds.length
      followingCount = followingIds.length

      if (currentUserId) {
        isFollowing = followerIds.includes(currentUserId)
      }
    }

    let followers: FollowUserItem[] = []
    let following: FollowUserItem[] = []
    let viewerFollowingIds: string[] = []

    if (includeLists) {
      const allUniqueIds = Array.from(new Set([...followerIds, ...followingIds]))
      if (allUniqueIds.length > 0) {
        const { data: profiles } = await admin
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, email_verified')
          .in('id', allUniqueIds)

        type ProfileRecord = {
          id: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          email_verified: boolean | null
        }

        const profileMap = new Map(((profiles as ProfileRecord[]) || []).map((p) => [p.id, p]))

        // Also fetch user metadata for companies if needed
        const userObjects = await Promise.all(
          allUniqueIds.map(async (id) => {
            const prof = profileMap.get(id)
            const metaRes = await admin.auth.admin.getUserById(id).catch(() => ({ data: { user: null } }))
            const meta = metaRes?.data?.user?.user_metadata || {}
            const isComp = meta.account_type === 'company' || Boolean(meta.company_name) || prof?.last_name === 'Kompani'
            const name = isComp
              ? (meta.company_name || prof?.first_name || 'Kompani')
              : `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim() || 'Përdorues'

            return {
              id,
              name,
              avatarUrl: prof?.avatar_url || meta?.avatar_url || '/avatars/avatar-1.png',
              isCompany: isComp,
              isVerified: Boolean(prof?.email_verified),
            }
          })
        )

        const userItemMap = new Map(userObjects.map((u) => [u.id, u]))

        followers = followerIds.map((id) => userItemMap.get(id) || {
          id,
          name: 'Përdorues',
          avatarUrl: '/avatars/avatar-1.png',
          isCompany: false,
          isVerified: false,
        })

        following = followingIds.map((id) => userItemMap.get(id) || {
          id,
          name: 'Përdorues',
          avatarUrl: '/avatars/avatar-1.png',
          isCompany: false,
          isVerified: false,
        })
      }

      // If viewer is logged in, find who the viewer follows
      if (currentUserId) {
        if (useTable) {
          const { data: vf } = await admin.from('follows').select('following_id').eq('follower_id', currentUserId)
          viewerFollowingIds = (vf || []).map((r: { following_id: string }) => r.following_id)
        } else {
          const { data: viewerData } = await admin.auth.admin.getUserById(currentUserId)
          viewerFollowingIds = Array.isArray(viewerData?.user?.user_metadata?.following)
            ? viewerData.user.user_metadata.following
            : []
        }
      }
    }

    return NextResponse.json({
      followersCount,
      followingCount,
      isFollowing,
      currentUserId,
      followers: includeLists ? followers : undefined,
      following: includeLists ? following : undefined,
      viewerFollowingIds: includeLists ? viewerFollowingIds : undefined,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    console.error('GET /api/follow error:', err)
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerSupabaseClient()
    const {
      data: { user: currentUser },
      error: authError,
    } = await serverSupabase.auth.getUser()

    if (authError || !currentUser) {
      return NextResponse.json({ error: 'unauthorized', message: 'Ju lutem kyçuni për të ndjekur këtë profil.' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const targetUserId = body?.targetUserId
    if (!targetUserId) {
      return NextResponse.json({ error: 'missing_target', message: 'targetUserId is required' }, { status: 400 })
    }

    if (currentUser.id === targetUserId) {
      return NextResponse.json({ error: 'self_follow', message: 'Nuk mund të ndiqni veten.' }, { status: 400 })
    }

    const admin = getAdminClient()

    // 1. Try public.follows table
    let tableSuccess = false
    try {
      const { error: insErr } = await admin.from('follows').upsert(
        { follower_id: currentUser.id, following_id: targetUserId },
        { onConflict: 'follower_id,following_id' }
      )
      if (!insErr) tableSuccess = true
    } catch {}

    // 2. Dual-layer sync: always keep user_metadata up-to-date as resilient fallback
    try {
      const [{ data: viewerData }, { data: targetData }] = await Promise.all([
        admin.auth.admin.getUserById(currentUser.id),
        admin.auth.admin.getUserById(targetUserId),
      ])

      const viewerMeta = viewerData?.user?.user_metadata || {}
      const targetMeta = targetData?.user?.user_metadata || {}

      const currentFollowing: string[] = Array.isArray(viewerMeta.following) ? viewerMeta.following : []
      const currentFollowers: string[] = Array.isArray(targetMeta.followers) ? targetMeta.followers : []

      if (!currentFollowing.includes(targetUserId)) {
        await admin.auth.admin.updateUserById(currentUser.id, {
          user_metadata: {
            ...viewerMeta,
            following: [...currentFollowing, targetUserId],
          },
        })
      }

      if (!currentFollowers.includes(currentUser.id)) {
        await admin.auth.admin.updateUserById(targetUserId, {
          user_metadata: {
            ...targetMeta,
            followers: [...currentFollowers, currentUser.id],
          },
        })
      }
    } catch (e) {
      console.error('Metadata fallback sync error in POST /api/follow:', e)
    }

    // Get fresh count
    let followersCount = 1
    if (tableSuccess) {
      const { count } = await admin.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId)
      if (typeof count === 'number') followersCount = count
    } else {
      const { data: targetData } = await admin.auth.admin.getUserById(targetUserId)
      const list = targetData?.user?.user_metadata?.followers || []
      followersCount = Array.isArray(list) ? list.length : 1
    }

    return NextResponse.json({
      success: true,
      isFollowing: true,
      followersCount,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    console.error('POST /api/follow error:', err)
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const serverSupabase = await createServerSupabaseClient()
    const {
      data: { user: currentUser },
      error: authError,
    } = await serverSupabase.auth.getUser()

    if (authError || !currentUser) {
      return NextResponse.json({ error: 'unauthorized', message: 'Ju lutem kyçuni për të menaxhuar ndjekjet.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let targetUserId = searchParams.get('targetUserId')

    if (!targetUserId) {
      const body = await request.json().catch(() => null)
      targetUserId = body?.targetUserId
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'missing_target', message: 'targetUserId is required' }, { status: 400 })
    }

    const admin = getAdminClient()

    // 1. Try public.follows table
    let tableSuccess = false
    try {
      const { error: delErr } = await admin
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId)
      if (!delErr) tableSuccess = true
    } catch {}

    // 2. Dual-layer sync: remove from user_metadata
    try {
      const [{ data: viewerData }, { data: targetData }] = await Promise.all([
        admin.auth.admin.getUserById(currentUser.id),
        admin.auth.admin.getUserById(targetUserId),
      ])

      const viewerMeta = viewerData?.user?.user_metadata || {}
      const targetMeta = targetData?.user?.user_metadata || {}

      const currentFollowing: string[] = Array.isArray(viewerMeta.following) ? viewerMeta.following : []
      const currentFollowers: string[] = Array.isArray(targetMeta.followers) ? targetMeta.followers : []

      await admin.auth.admin.updateUserById(currentUser.id, {
        user_metadata: {
          ...viewerMeta,
          following: currentFollowing.filter((id) => id !== targetUserId),
        },
      })

      await admin.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          ...targetMeta,
          followers: currentFollowers.filter((id) => id !== currentUser.id),
        },
      })
    } catch (e) {
      console.error('Metadata fallback sync error in DELETE /api/follow:', e)
    }

    // Get fresh count
    let followersCount = 0
    if (tableSuccess) {
      const { count } = await admin.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId)
      if (typeof count === 'number') followersCount = count
    } else {
      const { data: targetData } = await admin.auth.admin.getUserById(targetUserId)
      const list = targetData?.user?.user_metadata?.followers || []
      followersCount = Array.isArray(list) ? list.length : 0
    }

    return NextResponse.json({
      success: true,
      isFollowing: false,
      followersCount,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    console.error('DELETE /api/follow error:', err)
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 })
  }
}
