'use server'

import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase'

/**
 * Called after a seller updates their profile (phone, name, avatar).
 * Revalidates all of that seller's active listing pages so the ISR
 * cache immediately reflects the new profile data.
 */
export async function revalidateSellerListings(userId: string) {
  try {
    const supabase = await createAdminSupabaseClient()

    const { data: listings, error } = await supabase
      .from('listings')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      console.error('revalidateSellerListings: failed to fetch listings', error)
      return
    }
    if (!listings || listings.length === 0) return

    for (const listing of listings) {
      revalidatePath(`/listings/${listing.id}`)
    }
  } catch (e) {
    console.error('revalidateSellerListings: unexpected error', e)
  }
}
