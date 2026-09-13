import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

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

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getAdminClient()
    let userId: string | null = null

    // 1. Try to get user from session cookies
    try {
      const supabase = await createServerSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.id) {
        userId = user.id
      }
    } catch {
      // fallback
    }

    // 2. Fallback to Bearer token if cookies were missing
    if (!userId) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim()
        const {
          data: { user },
        } = await supabaseAdmin.auth.getUser(token)
        if (user?.id) {
          userId = user.id
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'unauthorized', message: 'Nuk jeni i kyçur.' }, { status: 401 })
    }

    // 1. Delete all properties owned by this user
    await supabaseAdmin.from('listings').delete().eq('user_id', userId)

    // 2. Delete favorites
    await supabaseAdmin.from('favorites').delete().eq('user_id', userId)

    // 3. Delete messages & conversations
    try {
      await supabaseAdmin.from('messages').delete().eq('sender_id', userId)
      await supabaseAdmin
        .from('conversations')
        .delete()
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    } catch {
      // continue
    }

    // 4. Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    // 5. Hard delete user from Supabase auth.users
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteAuthError) {
      console.error('Error deleting auth user from Supabase:', deleteAuthError)
      return NextResponse.json({ error: 'delete_failed', message: 'Dështoi fshirja e llogarisë.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Llogaria u fshi me sukses.' })
  } catch (err) {
    console.error('Account deletion error:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
