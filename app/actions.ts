'use server'

import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Server actions are publicly reachable endpoints, so every moderation action
 * re-checks the caller against ADMIN_EMAIL before touching the service-role
 * client. Mirrors the guard used by app/admin/page.tsx.
 */
async function requireAdmin(): Promise<{ admin: SupabaseClient } | { ok: false; message: string }> {
  if (!ADMIN_EMAIL) {
    return { ok: false, message: 'ADMIN_EMAIL nuk është konfiguruar.' }
  }
  try {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return { ok: false, message: 'Nuk keni leje për këtë veprim.' }
    }
    const admin = await createAdminSupabaseClient()
    return { admin }
  } catch {
    return { ok: false, message: 'Verifikimi i autorizimit dështoi.' }
  }
}

function deny(message: string): void {
  console.warn(`[admin action refused] ${message}`)
}

/**
 * Activate / deactivate a listing (moderation lever used by the admin table).
 * `listings.is_active` is the real availability switch — every public query
 * (home, search, listing detail, sitemap) filters on it. The `status` column
 * from migration 20260928_003 is intentionally untouched: no read path uses it.
 */
export async function toggleListingStatus(listingId: string, nextActive: boolean): Promise<void> {
  if (typeof listingId !== 'string' || !UUID_RE.test(listingId)) return deny('Id i pavlefshëm listimi.')
  if (typeof nextActive !== 'boolean') return deny('Statusi i dërguar është i pavlefshëm.')

  const auth = await requireAdmin()
  if (!('admin' in auth)) return deny(auth.message)

  const { error } = await auth.admin.from('listings').update({ is_active: nextActive }).eq('id', listingId)
  if (error) {
    console.error('toggleListingStatus failed:', error.code, error.message)
    return
  }

  revalidatePath('/admin')
  revalidatePath(`/listings/${listingId}`)
  revalidatePath('/')
}

/**
 * Ban / unban a user account.
 *
 * There is no `banned`/`locked` column on `public.profiles` — the closest real
 * mechanism is Supabase Auth's account ban (`auth.users.banned_until`), which
 * blocks sign-in and refresh-token grants at the Auth layer. `ban_duration`
 * flips it; 'none' lifts it.
 */
export async function toggleUserBan(userId: string): Promise<void> {
  if (typeof userId !== 'string' || !UUID_RE.test(userId)) return deny('Id i pavlefshëm përdoruesi.')

  const auth = await requireAdmin()
  if (!('admin' in auth)) return deny(auth.message)

  const { data: current, error: readError } = await auth.admin.auth.admin.getUserById(userId)
  if (readError || !current.user) {
    console.error('toggleUserBan lookup failed:', readError?.code, readError?.message)
    return
  }

  const bannedUntil = current.user.banned_until
  const isBanned = Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now())

  const { error } = await auth.admin.auth.admin.updateUserById(userId, {
    ban_duration: isBanned ? 'none' : '876000h',
  })
  if (error) {
    console.error('toggleUserBan update failed:', error.code, error.message)
    return
  }

  revalidatePath('/admin')
}

/**
 * Resolve an abuse report.
 *
 * `listing_reports` (migration 20260928_003) has no status/resolution column,
 * so "resolved" is modelled as removing the row from the open queue — the same
 * effect the schema supports today.
 */
export async function resolveListingReport(reportId: number): Promise<void> {
  if (typeof reportId !== 'number' || !Number.isInteger(reportId) || reportId <= 0) {
    return deny('Id i pavlefshëm raporti.')
  }

  const auth = await requireAdmin()
  if (!('admin' in auth)) return deny(auth.message)

  const { error } = await auth.admin.from('listing_reports').delete().eq('id', reportId)
  if (error) {
    if (error.code === '42P01') {
      console.error('resolveListingReport: listing_reports table missing — apply migration 20260928_003')
    } else {
      console.error('resolveListingReport failed:', error.code, error.message)
    }
    return
  }

  revalidatePath('/admin')
}

export type TelemetrySnapshot = {
  available: boolean
  total24h: number
  groupedTotal: number
  byEvent: { event: string; count: number }[]
  latest: { id: number; event: string; created_at: string }[]
}

/**
 * Live telemetry inspection for the admin dashboard.
 * `telemetry_events` is RLS-enabled with zero policies (write-only for
 * clients), so only the service-role client can read it — that is why this is
 * a server action and not a client-side realtime subscription.
 */
export async function getTelemetrySnapshot(): Promise<TelemetrySnapshot> {
  const empty: TelemetrySnapshot = { available: false, total24h: 0, groupedTotal: 0, byEvent: [], latest: [] }

  const auth = await requireAdmin()
  if (!('admin' in auth)) return empty

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  try {
    const { count, error: countError } = await auth.admin
      .from('telemetry_events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since)
    if (countError) {
      if (countError.code === '42P01') return empty
      console.error('getTelemetrySnapshot count failed:', countError.code, countError.message)
      return empty
    }

    const { data: rows, error: rowsError } = await auth.admin
      .from('telemetry_events')
      .select('id,event,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500)
    if (rowsError) {
      console.error('getTelemetrySnapshot rows failed:', rowsError.code, rowsError.message)
      return empty
    }

    const grouped = new Map<string, number>()
    for (const row of rows || []) grouped.set(row.event, (grouped.get(row.event) || 0) + 1)

    return {
      available: true,
      total24h: count ?? 0,
      groupedTotal: (rows || []).length,
      byEvent: [...grouped.entries()]
        .map(([event, eventCount]) => ({ event, count: eventCount }))
        .sort((a, b) => b.count - a.count),
      latest: (rows || []).slice(0, 8).map((row) => ({
        id: row.id as number,
        event: row.event as string,
        created_at: row.created_at as string,
      })),
    }
  } catch (e) {
    console.error('getTelemetrySnapshot unexpected error:', e)
    return empty
  }
}

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
