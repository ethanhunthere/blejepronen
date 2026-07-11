'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { MessageCircle, Search, Sparkles } from 'lucide-react'
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
      {/* ---- SIDEBAR ---- */}
      <aside
        className={`${
          isChatOpen ? 'hidden lg:flex' : 'flex'
        } lg:flex flex-col w-full lg:w-80 xl:w-96 flex-shrink-0 bg-[#060B1E]/70 backdrop-blur-2xl border-r border-white/[0.06]`}
      >
        {/* Sidebar header */}
        <div className="flex-shrink-0 px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1B4FFF] to-[#4D3CFF] flex items-center justify-center shadow-lg shadow-[#1B4FFF]/20">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">Mesazhet</h1>
            </div>
            {totalUnread > 0 && (
              <span className="bg-gradient-to-r from-[#1B4FFF] to-[#3B6FFF] text-white text-[11px] font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5 shadow-lg shadow-[#1B4FFF]/30 animate-pulse"
                style={{ animationDuration: '3s' }}>
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          {/* Search */}
          <div className="relative group">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#1B4FFF]/20 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-xl" />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 group-focus-within:text-[#1B4FFF]/60 transition-colors duration-300" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Kërko bisedë..."
              className="relative w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#1B4FFF]/30 focus:bg-white/[0.06] transition-all duration-300"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="space-y-0.5 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl animate-pulse">
                  <div className="w-11 h-11 rounded-full bg-white/[0.06] flex-shrink-0 ring-2 ring-white/[0.04]" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-3 w-28 bg-white/[0.06] rounded-full" />
                    <div className="h-2.5 w-40 bg-white/[0.04] rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-16 text-center">
              <div className="relative mb-5">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1B4FFF]/10 to-transparent flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1B4FFF]/20 to-transparent flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-white/20" />
                  </div>
                </div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#1B4FFF]/5 to-transparent blur-2xl" />
              </div>
              <p className="text-white/40 text-sm font-medium">
                {search ? 'Asnjë bisedë nuk përputhet' : 'Nuk keni mesazhe ende'}
              </p>
              <p className="text-white/20 text-xs mt-1.5">
                {search ? 'Provo një kërkim tjetër' : 'Kur të kontaktoni një shitës, biseda shfaqet këtu'}
              </p>
            </div>
          ) : (
            <div className="px-2 pb-2 space-y-0.5">
              {filteredConvs.map(conv => {
                const isActive = pathname === `/mesazhet/${conv.id}`
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => router.push(`/mesazhet/${conv.id}`)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-[#1B4FFF]/10 to-transparent border-l-[3px] border-[#1B4FFF] shadow-[inset_0_0_20px_rgba(27,79,255,0.05)]'
                        : 'hover:bg-white/[0.03] hover:translate-x-[2px] border-l-[3px] border-transparent'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm transition-all duration-300 ${
                        conv.otherUser?.avatar_url
                          ? 'ring-2 ring-white/[0.08] group-hover:ring-[#1B4FFF]/30'
                          : 'bg-gradient-to-br from-[#1B4FFF] to-[#4D3CFF] ring-2 ring-[#1B4FFF]/20 group-hover:ring-[#1B4FFF]/40'
                      }`}>
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
                      {/* Online indicator */}
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#060B1E]" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`font-semibold text-sm truncate transition-colors duration-200 ${
                          isActive ? 'text-white' : 'text-white/80 group-hover:text-white'
                        }`}>
                          {conv.otherUser?.first_name} {conv.otherUser?.last_name}
                        </p>
                        <span className="text-[10px] text-white/30 flex-shrink-0 ml-2 font-medium tracking-tight">
                          {formatListTime(conv.updated_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/35 truncate mb-1 font-medium">
                        {conv.listing?.title || 'Banesa'}
                      </p>
                      <div className="flex items-center gap-2">
                        {conv.lastMessage && (
                          <p className={`text-xs truncate flex-1 transition-colors duration-200 ${
                            conv.unreadCount > 0 ? 'text-white/70 font-medium' : 'text-white/40'
                          }`}>
                            {conv.lastMessage.sender_id === userId ? 'Ti: ' : ''}
                            {conv.lastMessage.content.slice(0, 45)}
                          </p>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="bg-gradient-to-r from-[#1B4FFF] to-[#3B6FFF] text-white text-[10px] font-bold min-w-[20px] h-[20px] rounded-full flex items-center justify-center px-1.5 flex-shrink-0 shadow-md shadow-[#1B4FFF]/25"
                            style={{ animation: 'unreadPulse 2.5s ease-in-out infinite' }}>
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

      {/* ---- RIGHT PANEL ---- */}
      <main className={`${isChatOpen ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0 bg-gradient-to-br from-[#0A0F2E] via-[#0D1235] to-[#0A0F2E]`}>
        {children}
      </main>

      {/* Animations */}
      <style jsx global>{`
        @keyframes unreadPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 999px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  )
}
