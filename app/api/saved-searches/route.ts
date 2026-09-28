import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveUser(request: Request) {
  try {
    const serverSupabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()
    if (user) return { user, client: serverSupabase }
  } catch {
    // no cookie session
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (url && anonKey) {
      const client = createClient(url, anonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
      const {
        data: { user },
      } = await client.auth.getUser()
      if (user) return { user, client }
    }
  }

  return { user: null, client: null }
}

export async function GET(request: Request) {
  const { user, client } = await resolveUser(request)
  if (!user || !client) {
    return NextResponse.json({ error: 'unauthorized', message: 'Ju lutemi kyçuni.' }, { status: 401 })
  }

  try {
    const { data, error } = await client
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      // 42P01 table does not exist
      if (error.code === '42P01') {
        return NextResponse.json({ savedSearches: [] })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ savedSearches: data || [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gabim i brendshëm'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { user, client } = await resolveUser(request)
  if (!user || !client) {
    return NextResponse.json({ error: 'unauthorized', message: 'Ju lutemi kyçuni.' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const {
      title,
      city,
      type,
      minPrice,
      maxPrice,
      rooms,
      minArea,
      maxArea,
      apartmentType,
      searchQuery,
      notifyPush = true,
      notifyEmail = true,
    } = body

    const row = {
      user_id: user.id,
      title: typeof title === 'string' && title.trim() ? title.trim().slice(0, 80) : null,
      city: typeof city === 'string' && city.trim() ? city.trim() : null,
      type: type === 'shitje' || type === 'qira' ? type : null,
      min_price: typeof minPrice === 'number' && Number.isFinite(minPrice) ? minPrice : null,
      max_price: typeof maxPrice === 'number' && Number.isFinite(maxPrice) ? maxPrice : null,
      rooms: typeof rooms === 'number' && Number.isFinite(rooms) ? rooms : null,
      min_area: typeof minArea === 'number' && Number.isFinite(minArea) ? minArea : null,
      max_area: typeof maxArea === 'number' && Number.isFinite(maxArea) ? maxArea : null,
      apartment_type: typeof apartmentType === 'string' ? apartmentType : null,
      search_query: typeof searchQuery === 'string' && searchQuery.trim() ? searchQuery.trim().slice(0, 100) : null,
      notify_push: Boolean(notifyPush),
      notify_email: Boolean(notifyEmail),
    }

    const { data, error } = await client
      .from('saved_searches')
      .insert(row)
      .select()
      .single()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'table_unavailable', message: 'Shërbimi i njoftimeve po përgatitet.' },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, savedSearch: data }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gabim gjatë ruajtjes së kërkimit'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { user, client } = await resolveUser(request)
  if (!user || !client) {
    return NextResponse.json({ error: 'unauthorized', message: 'Ju lutemi kyçuni.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'missing_id', message: 'ID e kërkimit mungon.' }, { status: 400 })
  }

  try {
    const { error } = await client
      .from('saved_searches')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gabim gjatë fshirjes'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
