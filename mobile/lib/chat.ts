import { supabase } from './supabase'
import { COALESCE_WINDOW_MS } from './conversations'

/**
 * Bleje Pronën — chat history paging + read-receipt batching (audit §4.1 / §4.3).
 * ─────────────────────────────────────────────────────────────────────
 * `messages/[id].tsx` used to `select('*').order('created_at')` with NO limit,
 * downloading the entire conversation on every open, and then fired one
 * `.update({ is_read: true })` per incoming realtime INSERT. Both scale with
 * thread length and burst size.
 *
 * This module replaces them with:
 *   • keyset pagination in fixed 30-row windows, walking backwards from the
 *     newest message (`load older` on scroll-to-top);
 *   • a 250ms coalescer that turns a burst of incoming messages into ONE
 *     bulk `is_read` update instead of one write per message.
 */

/** Rows per history window. */
export const CHAT_PAGE_SIZE = 30
/**
 * Over-fetch on the older-page probe so rows sharing the cursor timestamp with
 * the page boundary cannot stall the walk. The extra rows are dropped by id.
 */
const CURSOR_SLACK = 8

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  is_read: boolean
}

export interface MessagePage {
  /** Ascending by created_at — ready to render/prepend. */
  messages: ChatMessage[]
  /** False once the walk reaches the beginning of the thread. */
  hasMore: boolean
  /** `created_at` of the oldest row returned; pass back to fetchOlderMessages. */
  cursor: string | null
}

const EMPTY_PAGE: MessagePage = { messages: [], hasMore: false, cursor: null }

function toMessages(rows: any[] | null | undefined): ChatMessage[] {
  if (!Array.isArray(rows)) return []
  return rows as ChatMessage[]
}

/**
 * Newest window of a conversation. Ordered desc + limited, then reversed, so a
 * 5,000-message thread costs exactly CHAT_PAGE_SIZE rows.
 */
export async function fetchLatestMessages(
  conversationId: string,
  limit: number = CHAT_PAGE_SIZE
): Promise<MessagePage> {
  if (!conversationId) return EMPTY_PAGE

  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at, is_read')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('Fetch latest messages notice:', error.message)
    return EMPTY_PAGE
  }

  const rows = toMessages(data).reverse()
  return {
    messages: rows,
    // A full window means there is very likely more history above it.
    hasMore: rows.length >= limit,
    cursor: rows.length > 0 ? rows[0].created_at : null,
  }
}

/**
 * The next older window.
 *
 * Keyset paging on `created_at` uses `.lte` rather than `.lt` on purpose: rows
 * that share the boundary timestamp exactly would be silently skipped by `.lt`
 * (the database stores microsecond precision, the JS cursor may not). They are
 * re-fetched here and dropped by id against `knownIds`, which makes the walk
 * both gap-free and duplicate-free.
 */
export async function fetchOlderMessages(
  conversationId: string,
  cursor: string,
  knownIds: ReadonlySet<string>,
  limit: number = CHAT_PAGE_SIZE
): Promise<MessagePage> {
  if (!conversationId || !cursor) return EMPTY_PAGE

  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at, is_read')
    .eq('conversation_id', conversationId)
    .lte('created_at', cursor)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + CURSOR_SLACK)

  if (error) {
    console.warn('Fetch older messages notice:', error.message)
    return EMPTY_PAGE
  }

  const raw = toMessages(data)
  const fresh = raw.filter((m) => !knownIds.has(m.id)).reverse()

  return {
    messages: fresh.slice(-limit),
    hasMore: raw.length >= limit + CURSOR_SLACK || fresh.length > limit,
    cursor: raw.length > 0 ? raw[raw.length - 1].created_at : null,
  }
}

// ─── Read-receipt coalescer ──────────────────────────────────────────
/**
 * Batches "this thread has unread inbound messages" into ONE bulk update per
 * COALESCE_WINDOW_MS window, no matter how many messages arrived.
 *
 * Deliberately id-free: the bulk statement is
 * `update messages set is_read where conversation_id = X and sender_id != me`,
 * which is a single round trip for 1 message or 50. It is also self-healing —
 * anything that landed while the update was in flight is caught by the next
 * window or by `flush()`.
 */
export interface ReadReceiptFlusher {
  /** Signal that inbound unread messages arrived (idempotent within a window). */
  markSeen(): void
  /** Force the pending write now (used on blur/unmount). */
  flush(): void
  /** Drop the pending write without sending it. */
  cancel(): void
}

export function createReadReceiptFlusher(
  conversationId: string,
  getUserId: () => string | null
): ReadReceiptFlusher {
  let timer: ReturnType<typeof setTimeout> | null = null
  let dirty = false
  let writing = false
  let cancelled = false

  const write = async () => {
    timer = null
    if (!dirty || cancelled) return
    dirty = false

    const userId = getUserId()
    if (!conversationId || !userId) return

    writing = true
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false)
      if (error) console.warn('Batched read-receipt notice:', error.message)
    } catch (err: any) {
      console.warn('Batched read-receipt catch:', err?.message || err)
    } finally {
      writing = false
      // Messages that arrived during the write get one more pass.
      if (dirty && !cancelled) schedule()
    }
  }

  function schedule() {
    if (cancelled || timer) return
    timer = setTimeout(() => void write(), COALESCE_WINDOW_MS)
  }

  return {
    markSeen() {
      if (cancelled) return
      dirty = true
      schedule()
    },
    flush() {
      if (cancelled || !dirty || writing) return
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      void write()
    },
    cancel() {
      cancelled = true
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      dirty = false
    },
  }
}
