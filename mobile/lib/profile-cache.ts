import type { Listing } from '@/lib/supabase'
import { createTypedCache } from '@/lib/query-client'

/**
 * In-memory stale-while-revalidate cache for public profile storefronts.
 * Seeded by screens that already hold a seller fragment (listing detail,
 * feed caches) so a host tap paints identity on frame one; profili/[id]
 * revalidates in the background and writes fresh rows back here.
 *
 * Storage is delegated to the shared typed query cache (`lib/query-client`) so
 * this module owns *policy* — namespaces, TTL and invalidation group — rather
 * than a private unbounded `Map`. Both namespaces live in the `'profile'`
 * group, which means one `cacheInvalidateGroup('profile')` call (logout, a
 * user-triggered cache purge) reclaims every storefront seed at once, and the
 * per-group ceiling bounds how many profiles a long browsing session can hold.
 *
 * The public API is unchanged — every consumer keeps calling the same six
 * functions with the same signatures and the same `null`-on-miss contract.
 */
export type CachedProfile = Record<string, any> & { id: string }

/** Storefront identity is cheap to re-fetch but expensive to be wrong about
 *  for long: half an hour keeps a session warm without pinning stale rows. */
const PROFILE_TTL_MS = 30 * 60_000
/** A profile's listing feed churns faster than its identity. */
const PROFILE_LISTINGS_TTL_MS = 10 * 60_000

const profileCache = createTypedCache<CachedProfile>('profile:identity', {
  group: 'profile',
  ttlMs: PROFILE_TTL_MS,
})

const profileListingsCache = createTypedCache<Listing[]>('profile:listings', {
  group: 'profile',
  ttlMs: PROFILE_LISTINGS_TTL_MS,
})

export function getCachedProfile(id: string | null | undefined): CachedProfile | null {
  if (!id) return null
  return profileCache.get(id) ?? null
}

export function setCachedProfile(id: string, profile: CachedProfile): void {
  if (!id || !profile) return
  profileCache.set(id, profile)
}

export function getCachedProfileListings(id: string | null | undefined): Listing[] | null {
  if (!id) return null
  return profileListingsCache.get(id) ?? null
}

export function setCachedProfileListings(id: string, listings: Listing[]): void {
  if (!id) return
  profileListingsCache.set(id, listings)
}

export function clearCachedProfile(id: string): void {
  if (!id) return
  profileCache.delete(id)
  profileListingsCache.delete(id)
}
