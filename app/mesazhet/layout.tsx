'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { MessageCircle, Search } from 'lucide-react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface ConversationItem {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  updated_at: string
  listing: {
    title: string
    images: string[]
    price: number
  } | null
  otherUser: {
    id: string
    first_name: string
    last_name: string
    avatar_url: string | null
  } | null
  lastMessage: {
    content: string
    created_at: string
    sender_id: string
  } | null
  unreadCount: number
}

function formatListTime(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Dje'
  return d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' })
}

export default function MesazhetLayout({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const pathname = usePathname()
  const router = useRouter()
  const supabaseRef = { current: createClient() }
  const userIdRef = useRef<string | null>(null)
  const isChatOpen = pathname !== '/mesazhet'

  const fetchConversations = useCallback(async (uid: string) => {
    const supabase = supabaseRef.current
    const { data } = await supabase
      .from('conversations')
      .select(
        `id, listing_id, buyer_id, seller_id, updated_at,
         listing:listings!inner ( title, images, price ),
         messages ( content, created_at, sender_id, is_read )`
      )
      .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
      .order('updated_at', { ascending: false })

    if (!data) return

    const userIds = new Set<string>()
    data.forEach(c => {
      userIds.add(c.buyer_id === uid ? c.seller_id : c.buyer_id)
    })

    if (userIds.size === 0) { setConversations([]); return }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,first_name,last_name,avatar_url')
      .in('id', Array.from(userIds))

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    const result: ConversationItem[] = data.map(c => {
      const msgs = (c.messages || []) as { content: string; created_at: string; sender_id: string; is_read: boolean }[]
      const sorted = [...msgs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const otherId = c.buyer_id === uid ? c.seller_id : c.buyer_id
      const listingData = c.listing as unknown as { title: string; images: string[]; price: number }[] | { title: string; images: string[]; price: number }
      const listing = Array.isArray(listingData) ? listingData[0] : listingData

      return {
        id: c.id,
        listing_id: c.listing_id,
        buyer_id: c.buyer_id,
        seller_id: c.seller_id,
        updated_at: c.updated_at,
        listing: listing || null,
        otherUser: profileMap.get(otherId) || null,
        lastMessage: sorted[0] || null,
        unreadCount: msgs.filter(m => !m.is_read && m.sender_id !== uid).length,
      }
    })

    setConversations(result)
  }, [])

  useEffect(() => {
    const supabase = supabaseRef.current
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { setLoading(false); return }
      const uid = session.user.id
      setUserId(uid)
      userIdRef.current = uid
      fetchConversations(uid).then(() => setLoading(false))
    })

    // Realtime: listen for new messages across all conversations to keep list fresh
    const channel = supabase
      .channel('mesazhet-list-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          const uid = userIdRef.current
          if (uid) fetchConversations(uid)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => {
          const uid = userIdRef.current
          if (uid) fetchConversations(uid)
        }
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [fetchConversations])

  const filteredConvs = search.trim()
    ? conversations.filter(
        c =>
          c.otherUser?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.otherUser?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.listing?.title?.toLowerCase().includes(search.toLowerCase())
      )
    : conversations

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0A0F2E] flex">
      {/* ---- SIDEBAR: visible on lg+, hidden on mobile when chat is open ---- */}
      <aside
        className={`${
          isChatOpen ? 'hidden lg:flex' : 'flex'
        } lg:flex flex-col w-full lg:w-80 xl:w-96 flex-shrink-0 border-r border-white/8 bg-[#060B1E]`}
      >
        {/* Sidebar header */}
        <div className="flex-shrink-0 px-4 py-4 border-b border-white/8">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-white">Mesazhet</h1>
            {totalUnread > 0 && (
              <span className="bg-[#1B4FFF] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Kërko bisedë..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#1B4FFF]/50 transition-colors"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-white/10 rounded" />
                    <div className="h-3 w-36 bg-white/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 py-12 text-center">
              <MessageCircle className="h-10 w-10 text-white/15 mb-3" />
              <p className="text-white/30 text-sm">
                {search ? 'Asnjë bisedë nuk përputhet' : 'Nuk keni mesazhe ende'}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {filteredConvs.map(conv => {
                const isActive = pathname === `/mesazhet/${conv.id}`
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => router.push(`/mesazhet/${conv.id}`)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                      isActive
                        ? 'bg-white/8 border-l-2 border-[#1B4FFF]'
                        : 'hover:bg-white/5 border-l-2 border-transparent'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#1B4FFF] overflow-hidden flex-shrink-0 flex items-center justify-center text-white font-bold text-sm">
                      {conv.otherUser?.avatar_url ? (
                        <img
                          src={conv.otherUser.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (conv.otherUser?.first_name || '?')[0].toUpperCase()
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-semibold text-white text-sm truncate">
                          {conv.otherUser?.first_name} {conv.otherUser?.last_name}
                        </p>
                        <span className="text-[10px] text-white/40 flex-shrink-0 ml-2">
                          {formatListTime(conv.updated_at)}
                        </span>
                      </div>
                      <p className="text-xs text-white/50 truncate mb-0.5">
                        {conv.listing?.title || 'Banesa'}
                      </p>
                      <div className="flex items-center gap-2">
                        {conv.lastMessage && (
                          <p className="text-xs text-white/60 truncate flex-1">
                            {conv.lastMessage.sender_id === userId ? 'Ti: ' : ''}
                            {conv.lastMessage.content.slice(0, 40)}
                          </p>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="bg-[#1B4FFF] text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 flex-shrink-0">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ---- RIGHT PANEL (desktop) / FULL SCREEN (mobile chat) ---- */}
      <main className={`${isChatOpen ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0`}>
        {children}
      </main>
    </div>
  )
}
