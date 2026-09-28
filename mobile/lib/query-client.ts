/**
 * Typed, bounded in-memory query cache.
 *
 * Why this exists
 * ───────────────
 * Every feature module used to declare its own `const cache = new Map()` at
 * module scope. Those maps were unbounded, had no expiry, could only be cleared
 * by reaching into the module that owned them, and survived nothing — a logout
 * or a "clear cache" action could not see them. This module replaces that
 * pattern with one small, typed store that has:
 *
 *   • TTL          — entries expire; staleness is a property of the entry, not
 *                    of whatever screen happened to read it last.
 *   • Groups       — 'listings' | 'favorites' | 'profile' | 'conversations',
 *                    each independently invalidatable in O(group size).
 *   • Bounds       — a global LRU cap, a per-group cap and a sticky cap, so no
 *                    browsing session can grow memory without limit.
 *   • Sticky pin   — authoritative state (the auth session snapshot) is exempt
 *                    from LRU eviction and from bulk clears, so a cache purge
 *                    can never log the user out.
 *
 * This is a *cache*, not a state container: it holds no subscribers and drives
 * no renders. Modules that need to notify the UI keep their own subscriber sets
 * and store their payload here (see `lib/auth-cache.ts`, `lib/profile-cache.ts`).
 *
 * HMR
 * ───
 * The store lives on `globalThis` under a versioned key so a hot reload of this
 * module (or of any module that imports it) reuses the live entries instead of
 * silently dropping the whole cache — and instead of leaking a second store.
 */

/** Bounded invalidation groups. Keep this list closed on purpose: an
 *  unbounded set of group names would defeat the per-group cap. */
export type CacheGroup = 'listings' | 'favorites' | 'profile' | 'conversations'

export interface CacheSetOptions {
  /**
   * Milliseconds until the entry counts as stale. `undefined`, `null`, `0` or
   * a non-finite value means "never expires" — use that only for authoritative
   * state, and pair it with `sticky` when it must also survive eviction.
   */
  ttlMs?: number | null
  /** Invalidation group. Omit to keep the entry out of every group sweep. */
  group?: CacheGroup | null
  /**
   * Exempt from LRU eviction and from `cacheClear()`'s default bulk purge.
   * Targeted `cacheDelete` / `cacheInvalidate` still remove sticky entries, so
   * an explicit logout can always clear the session. Reserve for authoritative
   * state — a cache full of sticky entries is a leak by another name.
   */
  sticky?: boolean
}

export interface CacheStats {
  entries: number
  stickyEntries: number
  evictions: number
  hits: number
  misses: number
  byGroup: Record<CacheGroup, number>
}

interface CacheEntry {
  value: unknown
  /** Absolute epoch ms, or `null` when the entry never expires. */
  expiresAt: number | null
  group: CacheGroup | null
  sticky: boolean
  writtenAt: number
}

/** Bump the suffix whenever `CacheEntry`'s shape changes so a hot reload can
 *  never read entries written by an older revision of this file. */
const STORE_KEY = '__blejepronen_query_cache_v1__'

/** Total non-sticky entries kept before the LRU tail is dropped. */
const MAX_ENTRIES = 512
/** Per-group ceiling — bounds how much one feature can occupy the store. */
const MAX_PER_GROUP = 160
/** Hard ceiling on pinned entries; a runaway sticky writer still can't leak. */
const MAX_STICKY = 24
/** Expired entries are swept at most this often, and only a bounded slice. */
const SWEEP_INTERVAL_MS = 2000
const SWEEP_BUDGET = 96

interface CacheStore {
  /** Insertion-ordered: reads re-insert, so iteration order *is* LRU order. */
  entries: Map<string, CacheEntry>
  groups: Map<CacheGroup, Set<string>>
  evictions: number
  hits: number
  misses: number
  lastSweepAt: number
}

function createStore(): CacheStore {
  return {
    entries: new Map(),
    groups: new Map(),
    evictions: 0,
    hits: 0,
    misses: 0,
    lastSweepAt: 0,
  }
}

function getStore(): CacheStore {
  const host = globalThis as unknown as { [STORE_KEY]?: CacheStore }
  let store = host[STORE_KEY]
  if (!store || !(store.entries instanceof Map) || !(store.groups instanceof Map)) {
    store = createStore()
    host[STORE_KEY] = store
  }
  return store
}

const store = getStore()

function now(): number {
  return Date.now()
}

function isExpired(entry: CacheEntry, at: number): boolean {
  return entry.expiresAt !== null && entry.expiresAt <= at
}

function detachGroup(key: string, group: CacheGroup | null): void {
  if (!group) return
  const keys = store.groups.get(group)
  if (!keys) return
  keys.delete(key)
  if (keys.size === 0) store.groups.delete(group)
}

function removeEntry(key: string): boolean {
  const entry = store.entries.get(key)
  if (!entry) return false
  store.entries.delete(key)
  detachGroup(key, entry.group)
  return true
}

/** Drop expired entries. Throttled and sliced so a write is never O(n) in the
 *  common case, while a long-lived session still reclaims every dead entry. */
function sweepExpired(at: number): void {
  if (at - store.lastSweepAt < SWEEP_INTERVAL_MS) return
  store.lastSweepAt = at
  let budget = SWEEP_BUDGET
  for (const key of Array.from(store.entries.keys())) {
    if (budget-- <= 0) break
    const entry = store.entries.get(key)
    if (entry && isExpired(entry, at)) removeEntry(key)
  }
}

/** Enforce the per-group, global and sticky ceilings. Iteration order is LRU
 *  order, so the tail of each walk is exactly what should go. */
function enforceBounds(): void {
  for (const group of Array.from(store.groups.keys())) {
    const keys = store.groups.get(group)
    if (!keys) continue
    let overflow = keys.size - MAX_PER_GROUP
    if (overflow <= 0) continue
    for (const key of Array.from(store.entries.keys())) {
      if (overflow <= 0) break
      const entry = store.entries.get(key)
      if (entry && entry.group === group && removeEntry(key)) {
        store.evictions++
        overflow--
      }
    }
  }

  let evictable = 0
  let sticky = 0
  for (const entry of store.entries.values()) {
    if (entry.sticky) sticky++
    else evictable++
  }

  let overflow = evictable - MAX_ENTRIES
  if (overflow > 0) {
    for (const key of Array.from(store.entries.keys())) {
      if (overflow <= 0) break
      const entry = store.entries.get(key)
      if (entry && !entry.sticky && removeEntry(key)) {
        store.evictions++
        overflow--
      }
    }
  }

  overflow = sticky - MAX_STICKY
  if (overflow > 0) {
    for (const key of Array.from(store.entries.keys())) {
      if (overflow <= 0) break
      const entry = store.entries.get(key)
      if (entry && entry.sticky && removeEntry(key)) {
        store.evictions++
        overflow--
      }
    }
  }
}

/** Read a value by key. Expired entries are dropped on read and count as a miss. */
export function cacheGet<T>(key: string): T | undefined {
  if (!key) return undefined
  const entry = store.entries.get(key)
  if (!entry) {
    store.misses++
    return undefined
  }
  const at = now()
  if (isExpired(entry, at)) {
    removeEntry(key)
    store.misses++
    return undefined
  }
  // Re-insert to move the entry to the most-recently-used end of the map.
  store.entries.delete(key)
  store.entries.set(key, entry)
  store.hits++
  return entry.value as T
}

/** True when the key holds a live (non-expired) entry. */
export function cacheHas(key: string): boolean {
  if (!key) return false
  const entry = store.entries.get(key)
  if (!entry) return false
  if (isExpired(entry, now())) {
    removeEntry(key)
    return false
  }
  return true
}

/** Write a value. Re-writing a key refreshes its TTL and LRU position. */
export function cacheSet<T>(key: string, value: T, options: CacheSetOptions = {}): void {
  if (!key) return
  const at = now()
  const previous = store.entries.get(key)
  if (previous) detachGroup(key, previous.group)

  const ttl = options.ttlMs
  const expiresAt =
    typeof ttl === 'number' && Number.isFinite(ttl) && ttl > 0 ? at + ttl : null
  const group = options.group ?? null

  store.entries.delete(key)
  store.entries.set(key, {
    value,
    expiresAt,
    group,
    sticky: options.sticky === true,
    writtenAt: at,
  })

  if (group) {
    let keys = store.groups.get(group)
    if (!keys) {
      keys = new Set()
      store.groups.set(group, keys)
    }
    keys.add(key)
  }

  sweepExpired(at)
  enforceBounds()
}

/** Remove one exact key. Works on sticky entries too (logout depends on it). */
export function cacheDelete(key: string): boolean {
  if (!key) return false
  return removeEntry(key)
}

/**
 * Remove a key and everything nested under it, e.g. `cacheInvalidate('profile:')`
 * clears `profile:identity:*` and `profile:listings:*` in one call.
 * Returns the number of entries removed.
 */
export function cacheInvalidate(keyOrPrefix: string): number {
  if (!keyOrPrefix) return 0
  let removed = 0
  for (const key of Array.from(store.entries.keys())) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      if (removeEntry(key)) removed++
    }
  }
  return removed
}

/** Remove every entry in one bounded invalidation group. */
export function cacheInvalidateGroup(group: CacheGroup): number {
  const keys = store.groups.get(group)
  if (!keys || keys.size === 0) return 0
  let removed = 0
  for (const key of Array.from(keys)) {
    if (removeEntry(key)) removed++
  }
  return removed
}

/** Remove several groups in one pass. */
export function cacheInvalidateGroups(groups: CacheGroup[]): number {
  let removed = 0
  for (const group of groups) removed += cacheInvalidateGroup(group)
  return removed
}

/**
 * Bulk purge. Sticky entries survive by default so a user-facing "clear cache"
 * action can never drop authoritative state such as the auth session snapshot.
 */
export function cacheClear(options: { keepSticky?: boolean } = {}): number {
  const keepSticky = options.keepSticky !== false
  let removed = 0
  for (const key of Array.from(store.entries.keys())) {
    const entry = store.entries.get(key)
    if (!entry) continue
    if (keepSticky && entry.sticky) continue
    if (removeEntry(key)) removed++
  }
  return removed
}

/** Snapshot of occupancy and hit-rate counters — used for honest user copy. */
export function cacheStats(): CacheStats {
  const byGroup: Record<CacheGroup, number> = {
    listings: 0,
    favorites: 0,
    profile: 0,
    conversations: 0,
  }
  let stickyEntries = 0
  for (const entry of store.entries.values()) {
    if (entry.sticky) stickyEntries++
    if (entry.group) byGroup[entry.group]++
  }
  return {
    entries: store.entries.size,
    stickyEntries,
    evictions: store.evictions,
    hits: store.hits,
    misses: store.misses,
    byGroup,
  }
}

/** Build a namespaced key, skipping empty/undefined parts: `cacheKey('profile', id)`. */
export function cacheKey(
  namespace: string,
  ...parts: Array<string | number | null | undefined>
): string {
  let key = namespace ?? ''
  for (const part of parts) {
    if (part === null || part === undefined || part === '') continue
    key = key.length > 0 ? `${key}:${part}` : String(part)
  }
  return key
}

/** Namespace-scoped, value-typed view over the store. */
export interface TypedCache<T> {
  /** Fully qualified key for `key` inside this namespace. */
  keyFor(key: string): string
  get(key: string): T | undefined
  /** `options` override the namespace defaults for this write. */
  set(key: string, value: T, options?: CacheSetOptions): void
  has(key: string): boolean
  delete(key: string): boolean
  /** Drop every entry in this namespace (or under `prefix` within it). */
  invalidate(prefix?: string): number
}

/**
 * Create a typed handle bound to a key namespace.
 *
 * ```ts
 * const profiles = createTypedCache<CachedProfile>('profile:identity', {
 *   group: 'profile',
 *   ttlMs: 30 * 60_000,
 * })
 * profiles.set(id, profile)   // stored as `profile:identity:<id>`
 * ```
 *
 * `defaults` supply the group/TTL/sticky policy so call sites cannot forget it;
 * per-call options may still override the TTL or the sticky flag.
 */
export function createTypedCache<T>(
  namespace: string,
  defaults: CacheSetOptions = {}
): TypedCache<T> {
  const prefix = namespace.length > 0 ? `${namespace}:` : ''
  const keyFor = (key: string) => `${prefix}${key}`

  return {
    keyFor,
    get: (key) => cacheGet<T>(keyFor(key)),
    // Per-call options win over the namespace defaults, but an explicitly
    // `undefined` option must not erase a default (e.g. the group policy).
    set: (key, value, options) => {
      const merged: CacheSetOptions = { ...defaults }
      if (options) {
        if (options.ttlMs !== undefined) merged.ttlMs = options.ttlMs
        if (options.group !== undefined) merged.group = options.group
        if (options.sticky !== undefined) merged.sticky = options.sticky
      }
      cacheSet<T>(keyFor(key), value, merged)
    },
    has: (key) => cacheHas(keyFor(key)),
    delete: (key) => cacheDelete(keyFor(key)),
    invalidate: (subPrefix) => cacheInvalidate(subPrefix ? keyFor(subPrefix) : prefix),
  }
}
