import { createServerSupabaseClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { listing_id, seller_id } = body

  if (!listing_id || !seller_id) {
    return NextResponse.json({ error: 'listing_id and seller_id are required' }, { status: 400 })
  }

  // Don't create conversation with yourself
  if (user.id === seller_id) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
  }

  // Check if conversation already exists
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listing_id)
    .eq('buyer_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ conversation_id: existing.id })
  }

  // Create new conversation
  const { data: created, error: createError } = await supabase
    .from('conversations')
    .insert({
      listing_id,
      buyer_id: user.id,
      seller_id,
    })
    .select('id')
    .single()

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  return NextResponse.json({ conversation_id: created.id })
}
