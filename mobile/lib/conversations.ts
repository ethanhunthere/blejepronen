import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'
import { apiResolveContacts } from './api'
import { createSafeChannel } from './realtime'
import { isLogoutInProgress, subscribeAuthEvents } from './auth-cache'

/**
 * Bleje Pronën — conversation list store (single source of truth).
 * ─────────────────────────────────────────────────────────────────────
 * Why this module exists (audit §4.2 / §4.3 / §4.4):
 *
 *   • The messages tab used to `select('…, messages(id, content, sender_id,
 *     created_at, is_read)')` for EVERY conversation — i.e. it downloaded the
 *     whole corpus of the user's chats just to render a one-line preview and a
 *     badge. Payload grew without bound with conversation length.
 *   • Every realtime event (an INSERT, the `conversations.updated_at` touch
 *     that follows it, and each read receipt) fired its own refetch + its own
 *     `setState`, so a 5-message burst produced 10+ full re-selects and 10+
 *     React renders.
 *   • The tab badge and the list each kept their own copy of "unread", so they
 *     could disagree.
 *
 * This store replaces all three:
 *
 *   1. Conversations are fetched WITHOUT the messages embed. The last message
 *      comes from ONE bounded `.in('conversation_id', ids)` query ordered by
 *      `created_at desc`, reduced client-side (no RPC exists in this database —
 *      see supabase/schema.sql, which only defines handle_new_user /
 *      handle_updated_at). Ids are capped at CONVERSATION_LIST_LIMIT.
 *   2. Unread counts come from ONE bounded `.select('conversation_id')` probe
 *      reduced into a per-conversation map. Badges everywhere read that map —
 *      there is no second counter to drift.
 *   3. ALL realtime filters for this feature live on ONE supabase channel
 *      (`bp_messages_mux`), reference-counted across screens, and every burst
 *      is coalesced by a 250ms window into a single load + a single `emit()`.
 *      The channel is removed when the last subscriber leaves, so navigating
 *      away cannot leak listeners.
 */

// ─── Tunables ────────────────────────────────────────────────────────
/** Coalescing window for realtime bursts — one state write per window. */
export const COALESCE_WINDOW_MS = 250
/** Hard cap on how many conversations (and therefore ids) we ever pull. */
export const CONVERSATION_LIST_LIMIT = 60
/** Rows pulled per last-message probe: ids * factor, capped. */
const LAST_MESSAGE_WINDOW_FACTOR = 4
const LAST_MESSAGE_ROW_CAP = 800
/** Unread probe returns only conversation_id values, so a wide cap is cheap. */
const UNREAD_ROW_CAP = 1000

// ─── Public types ────────────────────────────────────────────────────
export interface ConversationSummary {
  id: string
  listing_id: string
  listing_title: string
  listing_image: string
  counterpart_id?: string
  counterpart_name: string
  counterpart_avatar?: string
  counterpart_phone?: string
  is_agency: boolean
  counterpart_email_verified: boolean
  last_message: string
  last_time: string
  last_message_at?: string
  unread_count: number
  is_last_message_mine: boolean
  is_last_message_read: boolean
}

export interface ConversationsSnapshot {
  items: ConversationSummary[]
  /** Per-conversation unread counts — the ONLY badge source in the app. */
  unreadById: Record<string, number>
  totalUnread: number
  /** True only until the first load for the current user settles. */
  loading: boolean
  refreshing: boolean
  /**
   * False until the user has been resolved and the first load attempt has
   * settled — lets screens distinguish "still bootstrapping" from "signed in
   * with genuinely no conversations" without a second local flag.
   */
  ready: boolean
  userId: string | null
  lastLoadedAt: number | null
  error: string | null
}

/** Which parts of the store a reload must refresh (union of a burst). */
export interface ReloadParts {
  /** conversations rows + counterpart/listing joins */
  meta?: boolean
  /** last-message probe */
  messages?: boolean
  /** unread-count probe */
  unread?: boolean
}

// ─── Internal caches ─────────────────────────────────────────────────
interface MetaRow {
  id: string
  listing_id: string
  updated_at: string
  listing_title: string
  listing_image: string
  counterpart_id?: string
  counterpart_name: string
  counterpart_avatar?: string
  counterpart_phone?: string
  is_agency: boolean
  counterpart_email_verified: boolean
}

interface LastMessageRow {
  id: string
  sender_id: string
  content: string
  created_at: string
  is_read: boolean
}

type AnyChannel = ReturnType<typeof createSafeChannel>
type SnapshotListener = (snapshot: ConversationsSnapshot) => void

let snapshot: ConversationsSnapshot = {
  items: [],
  unreadById: {},
  totalUnread: 0,
  loading: false,
  refreshing: false,
  ready: false,
  userId: null,
  lastLoadedAt: null,
  error: null,
}

let metaCache: MetaRow[] = []
let lastCache: Record<string, LastMessageRow> = {}
let unreadCache: Record<string, number> = {}
let loadedUserId: string | null = null

const listeners = new Set<SnapshotListener>()

let channel: AnyChannel | null = null
let refCount = 0
let authSubscription: (() => void) | null = null

let pendingParts: Required<ReloadParts> | null = null
let pendingTimer: ReturnType<typeof setTimeout> | null = null
let inFlight: Promise<void> | null = null
let rerunParts: Required<ReloadParts> | null = null

// ─── Emit (the single state write) ───────────────────────────────────
function emit(patch: Partial<ConversationsSnapshot>): void {
  snapshot = { ...snapshot, ...patch }
  for (const fn of listeners) {
    try {
      fn(snapshot)
    } catch {
      // A throwing subscriber must never break the store.
    }
  }
}

const AGENCY_RE = /agjenci|real estate|invest|patundshm|group|shpk/i

function formatLastTime(iso?: string): string {
  if (!iso) return 'Sot'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return 'Sot'
    const now = new Date()
    return d.toDateString() === now.toDateString()
      ? d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' })
  } catch {
    return 'Sot'
  }
}

function timeOf(iso?: string): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : 0
}

/** Merges the three caches into the ordered summary list. */
function compose(): ConversationSummary[] {
  const userId = snapshot.userId
  const decorated = metaCache.map((m) => {
    const last = lastCache[m.id]
    return {
      // Newest activity wins: the last message, or the conversation touch.
      rank: Math.max(timeOf(last?.created_at), timeOf(m.updated_at)),
      item: {
        id: m.id,
        listing_id: m.listing_id,
        listing_title: m.listing_title,
        listing_image: m.listing_image,
        counterpart_id: m.counterpart_id,
        counterpart_name: m.counterpart_name,
        counterpart_avatar: m.counterpart_avatar,
        counterpart_phone: m.counterpart_phone,
        is_agency: m.is_agency,
        counterpart_email_verified: m.counterpart_email_verified,
        last_message: last?.content || 'Bisedë e re',
        last_time: formatLastTime(last?.created_at),
        last_message_at: last?.created_at,
        unread_count: unreadCache[m.id] ?? 0,
        is_last_message_mine: !!userId && last?.sender_id === userId,
        is_last_message_read: last ? !!last.is_read : true,
      } satisfies ConversationSummary,
    }
  })
  decorated.sort((a, b) => b.rank - a.rank)
  return decorated.map((d) => d.item)
}

function totalOf(map: Record<string, number>): number {
  let sum = 0
  for (const key of Object.keys(map)) sum += map[key] || 0
  return sum
}

// ─── Queries ─────────────────────────────────────────────────────────
/**
 * Conversations WITHOUT any messages embed. Counterpart identity is resolved
 * through the `profiles_public` view (RLS-safe for other users) rather than
 * the private `profiles` table, which RLS-nulls for anyone but the owner.
 * Phone remains private and is read only when RLS permits it.
 */
async function fetchMeta(userId: string): Promise<MetaRow[] | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      listing_id,
      buyer_id,
      seller_id,
      updated_at,
      listings(id, title, images)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('updated_at', { ascending: false })
    .limit(CONVERSATION_LIST_LIMIT)

  if (isLogoutInProgress()) return null
  if (error) {
    console.warn('Conversations meta notice:', error.message)
    return null
  }
  if (!data) return []

  // Batch-fetch counterpart rows from the public view (safe under RLS).
  const counterpartIds = new Set<string>()
  for (const c of data as any[]) {
    if (c.buyer_id && c.buyer_id !== userId) counterpartIds.add(c.buyer_id)
    if (c.seller_id && c.seller_id !== userId) counterpartIds.add(c.seller_id)
  }

  const publicById = new Map<string, any>()
  const privateById = new Map<string, any>()
  const ids = Array.from(counterpartIds)

  if (ids.length > 0) {
    const [pubRes, session] = await Promise.all([
      supabase
        .from('profiles_public')
        .select('id, first_name, last_name, avatar_url, email_verified')
        .in('id', ids),
      supabase.auth.getSession(),
    ])
    if (pubRes.data) for (const p of pubRes.data as any[]) publicById.set(p.id, p)
    // Phones resolve through the gated web route (profiles is owner-only).
    const contacts = await apiResolveContacts(
      session.data.session?.access_token ?? null,
      `userIds=${encodeURIComponent(ids.join(','))}`
    )
    if (contacts?.phones) {
      for (const [id, phone] of Object.entries(contacts.phones)) {
        privateById.set(id, { id, phone })
      }
    }
  }

  return (data as any[]).map((c) => {
    const isBuyer = userId === c.buyer_id
    const counterpartId = (isBuyer ? c.seller_id : c.buyer_id) as string | undefined
    const pub = counterpartId ? publicById.get(counterpartId) : undefined
    const priv = counterpartId ? privateById.get(counterpartId) : undefined

    const name =
      (pub &&
        `${pub.first_name || ''} ${pub.last_name || ''}`.trim()) ||
      (isBuyer ? 'Shitësi' : 'Blerësi')

    const emailVerified = Boolean(pub?.email_verified)
    // Name-token agency detection is only trustworthy on a verified account.
    const isAgency = emailVerified && AGENCY_RE.test(name)

    return {
      id: c.id,
      listing_id: c.listing_id,
      updated_at: c.updated_at,
      listing_title: c.listings?.title || 'Pronë në Bleje Pronën',
      listing_image: c.listings?.images?.[0] || '',
      counterpart_id: counterpartId,
      counterpart_name: name,
      counterpart_avatar: pub?.avatar_url || '',
      counterpart_phone: priv?.phone || '',
      is_agency: isAgency,
      counterpart_email_verified: emailVerified,
    } satisfies MetaRow
  })
}

/**
 * One bounded probe for the newest message of every capped conversation, then
 * a single gap-fill for any conversation the first window missed. Returns
 * `conversation_id -> newest message`.
 */
async function fetchLastMessages(ids: string[]): Promise<Record<string, LastMessageRow> | null> {
  const next: Record<string, LastMessageRow> = {}
  if (ids.length === 0) return next

  const windowSize = Math.min(ids.length * LAST_MESSAGE_WINDOW_FACTOR, LAST_MESSAGE_ROW_CAP)

  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at, is_read')
    .in('conversation_id', ids)
    .order('created_at', { ascending: false })
    .limit(windowSize)

  if (isLogoutInProgress()) return null
  if (error) {
    console.warn('Last-message probe notice:', error.message)
    return null
  }

  for (const row of (data ?? []) as any[]) {
    // Rows arrive newest-first, so the first sighting per conversation wins.
    if (!next[row.conversation_id]) {
      next[row.conversation_id] = {
        id: row.id,
        sender_id: row.sender_id,
        content: row.content,
        created_at: row.created_at,
        is_read: !!row.is_read,
      }
    }
  }

  // A very chatty conversation can crowd the window out; one extra bounded
  // probe covers whatever is still missing (older/quieter threads).
  const missing = ids.filter((id) => !next[id])
  if (missing.length > 0) {
    const { data: fill, error: fillErr } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at, is_read')
      .in('conversation_id', missing)
      .order('created_at', { ascending: false })
      .limit(Math.min(missing.length * LAST_MESSAGE_WINDOW_FACTOR, LAST_MESSAGE_ROW_CAP))

    if (isLogoutInProgress()) return null
    if (!fillErr) {
      for (const row of (fill ?? []) as any[]) {
        if (!next[row.conversation_id]) {
          next[row.conversation_id] = {
            id: row.id,
            sender_id: row.sender_id,
            content: row.content,
            created_at: row.created_at,
            is_read: !!row.is_read,
          }
        }
      }
    }
  }

  return next
}

/**
 * One bounded probe returning only `conversation_id` for every unread inbound
 * message, reduced into counts. Cheap enough to run on any burst and it is the
 * single source the tab badge and the row badges both read.
 */
async function fetchUnread(
  userId: string,
  ids: string[]
): Promise<Record<string, number> | null> {
  const next: Record<string, number> = {}
  if (ids.length === 0) return next

  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', ids)
    .eq('is_read', false)
    .neq('sender_id', userId)
    .limit(UNREAD_ROW_CAP)

  if (isLogoutInProgress()) return null
  if (error) {
    console.warn('Unread probe notice:', error.message)
    return null
  }

  for (const row of (data ?? []) as any[]) {
    next[row.conversation_id] = (next[row.conversation_id] ?? 0) + 1
  }
  return next
}

// ─── Load orchestration ──────────────────────────────────────────────
async function runLoad(parts: Required<ReloadParts>): Promise<void> {
  const userId = snapshot.userId
  if (!userId) return

  if (parts.meta) {
    const meta = await fetchMeta(userId)
    if (meta === null) return
    metaCache = meta
    // Drop last/unread entries for conversations that fell out of the cap.
    const live = new Set(meta.map((m) => m.id))
    for (const key of Object.keys(lastCache)) if (!live.has(key)) delete lastCache[key]
    for (const key of Object.keys(unreadCache)) if (!live.has(key)) delete unreadCache[key]
  }

  const ids = metaCache.map((m) => m.id)

  const [last, unread] = await Promise.all([
    parts.messages ? fetchLastMessages(ids) : Promise.resolve(lastCache),
    parts.unread ? fetchUnread(userId, ids) : Promise.resolve(unreadCache),
  ])

      if (last !== null) lastCache = { ...lastCache, ...last }
  if (unread !== null) unreadCache = unread

  if (isLogoutInProgress()) {
    resetForLogout()
    return
  }

  loadedUserId = userId
  const items = compose()
  // ONE state write for the whole reload.
  emit({
    items,
    unreadById: { ...unreadCache },
    totalUnread: totalOf(unreadCache),
    loading: false,
    refreshing: false,
    ready: true,
    lastLoadedAt: Date.now(),
    error: null,
  })

  // Persist locally for instant frame-zero hydration on next visit
  try {
    AsyncStorage.setItem(
      `@blejepronen_conversations_cache_${userId}`,
      JSON.stringify({ items, unreadCache, totalUnread: totalOf(unreadCache) })
    ).catch(() => {})
  } catch {}
}

async function drain(): Promise<void> {
  if (inFlight) return
  const parts = pendingParts ?? rerunParts
  pendingParts = null
  rerunParts = null
  if (!parts) return

  const full: Required<ReloadParts> = {
    meta: !!parts.meta,
    messages: !!parts.messages,
    unread: !!parts.unread,
  }

  inFlight = (async () => {
    try {
      await runLoad(full)
    } catch (err: any) {
      console.warn('Conversations store load notice:', err?.message || err)
      // ready must flip on failure too — otherwise the tab renders its
      // skeleton forever with no error card and no retry path.
      emit({ loading: false, refreshing: false, ready: true, error: String(err?.message || err) })
    } finally {
      inFlight = null
    }
  })()

  await inFlight

  // Events that arrived while we were loading get their own pass.
  if (rerunParts) void drain()
}

function mergeParts(
  target: Required<ReloadParts> | null,
  parts: ReloadParts
): Required<ReloadParts> {
  const base = target ?? { meta: false, messages: false, unread: false }
  return {
    meta: base.meta || !!parts.meta,
    messages: base.messages || !!parts.messages,
    unread: base.unread || !!parts.unread,
  }
}

/**
 * Fixed 250ms window (not a trailing debounce): the first event of a burst
 * schedules the flush, later events only widen the part set. A long burst
 * therefore produces at most one load + one `emit()` per window instead of one
 * per event, and latency stays bounded.
 */
export function scheduleConversationsReload(parts: ReloadParts = {}): void {
  if (!snapshot.userId) return
  if (inFlight) {
    rerunParts = mergeParts(rerunParts, parts)
    return
  }
  pendingParts = mergeParts(pendingParts, parts)
  if (pendingTimer) return
  pendingTimer = setTimeout(() => {
    pendingTimer = null
    void drain()
  }, COALESCE_WINDOW_MS)
}

function resetForLogout(): void {
  // auth-cache's performAtomicLogout destroys every supabase channel, so the
  // mux transport is dead; drop our ref or the next login short-circuits on a
  // zombie channel and realtime stays silent for the life of the process.
  stopChannel()
  metaCache = []
  lastCache = {}
  unreadCache = {}
  loadedUserId = null

  // Already in the signed-out shape — skip the write so subscribers (and the
  // `onAuthStateChange` storm that accompanies a logout) do not re-render.
  const alreadyEmpty =
    snapshot.items.length === 0 &&
    snapshot.userId === null &&
    snapshot.totalUnread === 0 &&
    !snapshot.loading &&
    !snapshot.refreshing &&
    snapshot.error === null &&
    snapshot.ready
  if (alreadyEmpty) return

  emit({
    items: [],
    unreadById: {},
    totalUnread: 0,
    loading: false,
    refreshing: false,
    ready: true,
    userId: null,
    lastLoadedAt: null,
    error: null,
  })
}

function clearTimers(): void {
  if (pendingTimer) {
    clearTimeout(pendingTimer)
    pendingTimer = null
  }
  pendingParts = null
  rerunParts = null
}

// ─── Realtime: ONE channel, many filters ─────────────────────────────
/**
 * A single multiplexed channel replaces the previous per-screen channels.
 * Supabase Realtime applies RLS to `postgres_changes` for an authenticated
 * client, so these unfiltered table subscriptions only ever deliver rows the
 * signed-in user can already read.
 */
function startChannel(): void {
  if (channel) return
  try {
    channel = createSafeChannel('bp_messages_mux')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => scheduleConversationsReload({ messages: true, unread: true })
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        // Read receipts only move badges + the ✓✓ tick.
        () => scheduleConversationsReload({ messages: true, unread: true })
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        () => scheduleConversationsReload({ messages: true, unread: true })
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        () => scheduleConversationsReload({ meta: true, messages: true, unread: true })
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        () => scheduleConversationsReload({ meta: true })
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'conversations' },
        () => scheduleConversationsReload({ meta: true, messages: true, unread: true })
      )
      .subscribe()
  } catch (err) {
    channel = null
    console.warn('Conversations mux channel notice:', err)
  }
}

function stopChannel(): void {
  clearTimers()
  if (channel) {
    try {
      supabase.removeChannel(channel)
    } catch (err) {
      console.warn('Conversations mux teardown notice:', err)
    }
    channel = null
  }
  if (authSubscription) {
    try {
      authSubscription()
    } catch (err) {
      console.warn('Conversations auth unsubscribe notice:', err)
    }
    authSubscription = null
  }
}

async function resolveUser(): Promise<string | null> {
  if (isLogoutInProgress()) return null
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (isLogoutInProgress()) return null
    return user?.id ?? null
  } catch {
    return null
  }
}

/** Points the store at a user and kicks the first load if needed. */
async function adoptUser(userId: string | null): Promise<void> {
  if (isLogoutInProgress() || !userId) {
    resetForLogout()
    return
  }

  if (snapshot.userId === userId) {
    if (loadedUserId !== userId) {
      scheduleConversationsReload({ meta: true, messages: true, unread: true })
    } else if (!snapshot.ready) {
      emit({ ready: true, loading: false })
    }
    return
  }

  // Identity switch — check for persisted conversations cache for frame-0 paint
  metaCache = []
  lastCache = {}
  unreadCache = {}
  loadedUserId = null

  let hydrated = false
  try {
    const raw = await AsyncStorage.getItem(`@blejepronen_conversations_cache_${userId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
        unreadCache = parsed.unreadCache || {}
        emit({
          userId,
          items: parsed.items,
          unreadById: { ...unreadCache },
          totalUnread: parsed.totalUnread ?? totalOf(unreadCache),
          loading: false,
          ready: true,
          error: null,
        })
        hydrated = true
      }
    }
  } catch {}

  if (!hydrated) {
    emit({
      userId,
      items: [],
      unreadById: {},
      totalUnread: 0,
      loading: true,
      ready: false,
      error: null,
    })
  }
  await runLoad({ meta: true, messages: true, unread: true })
  // runLoad bails out early on logout/network abort — never leave a subscriber
  // hanging on the skeleton in that case.
  if (!snapshot.ready) emit({ ready: true, loading: false, refreshing: false })
}

// ─── Public API ──────────────────────────────────────────────────────
export function getConversationsSnapshot(): ConversationsSnapshot {
  return snapshot
}

export function getTotalUnread(): number {
  return snapshot.totalUnread
}

/**
 * Reference-counted subscription. The first subscriber creates the multiplexed
 * channel and the auth listener; the last one removes both. Screens therefore
 * never leak listeners across navigation.
 */
export function subscribeConversations(fn: SnapshotListener): () => void {
  listeners.add(fn)
  fn(snapshot)

  refCount += 1
  if (refCount === 1) {
    startChannel()
    try {
      // Single consolidated auth bus — never open a second raw onAuthStateChange.
      authSubscription = subscribeAuthEvents((event) => {
        void adoptUser(
          event.isLoggingOut ? null : (event.session?.user?.id ?? null)
        )
      })
    } catch (err) {
      console.warn('Conversations store auth notice:', err)
    }
  }

  void resolveUser().then((userId) => {
    if (refCount === 0) return
    void adoptUser(userId)
  })

  return () => {
    if (!listeners.has(fn)) return
    listeners.delete(fn)
    refCount = Math.max(0, refCount - 1)
    if (refCount === 0) stopChannel()
  }
}

/** Pull-to-refresh: forces a full reload. */
export async function refreshConversations(): Promise<void> {
  const userId = await resolveUser()
  if (!userId) {
    resetForLogout()
    return
  }
  if (snapshot.userId !== userId) {
    await adoptUser(userId)
    return
  }
  emit({ refreshing: true })
  await runLoad({ meta: true, messages: true, unread: true })
  emit({ refreshing: false })
}

/**
 * Called when a conversation is opened: zeroes its badge immediately and
 * locally, without waiting for the read-receipt round trip. The realtime UPDATE
 * burst that follows converges on the same numbers.
 */
export function markConversationReadLocally(conversationId: string): void {
  if (!conversationId) return
  const hadUnread = (unreadCache[conversationId] ?? 0) > 0
  const last = lastCache[conversationId]
  if (!hadUnread && (!last || last.is_read)) return

  delete unreadCache[conversationId]
  if (last && !last.is_read) lastCache[conversationId] = { ...last, is_read: true }

  emit({
    unreadById: { ...unreadCache },
    totalUnread: totalOf(unreadCache),
    items: compose(),
  })
}

/**
 * Optimistic last-message write after a successful send, so the list reflects
 * the reply without a refetch. Also re-reads the badge map for that thread.
 */
export function noteOutgoingMessage(
  conversationId: string,
  content: string,
  senderId: string
): void {
  if (!conversationId || !senderId) return
  lastCache[conversationId] = {
    id: `local-${Date.now().toString(36)}`,
    sender_id: senderId,
    content,
    created_at: new Date().toISOString(),
    is_read: false,
  }
  emit({ items: compose() })
}

/** Test/diagnostic helper — reports how many channels this store owns. */
export function __conversationsChannelCount(): number {
  return channel ? 1 : 0
}
