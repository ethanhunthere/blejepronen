'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { MessageCircle, Search } from 'lucide-react'

// ---- Types ----
interface ConversationItem {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  updated_at: string
  listing: { title: string; images: string[]; price: number } | null
  otherUser: {
    id: string
    first_name: string
    last_name: string
    avatar_url: string | null
  } | null
  lastMessage: { content: string; created_at: string; sender_id: string } | null
  unreadCount: number
}

// ---- Helpers ----
function formatListTime(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Dje'
  return d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' })
}

export default function MesazhetPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const userIdRef = useRef<string | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

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

    const channel = supabase
      .channel('mesazhet-page-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => { const uid = userIdRef.current; if (uid) fetchConversations(uid) }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => { const uid = userIdRef.current; if (uid) fetchConversations(uid) }
      )
      .subscribe()

    channelRef.current = channel
    return () => { channel.unsubscribe(); channelRef.current = null }
  }, [fetchConversations])

  const filteredConvs = search.trim()
    ? conversations.filter(
        c =>
          c.otherUser?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.otherUser?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.listing?.title?.toLowerCase().includes(search.toLowerCase())
      )
    : conversations

  // ---- Empty state (no conversations at all) ----
  if (!loading && conversations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0A0F2E] px-6">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <MessageCircle className="h-8 w-8 text-white/10" />
        </div>
        <p className="text-white/40 font-medium text-sm">Nuk keni mesazhe</p>
        <p className="text-white/25 text-xs text-center max-w-xs mt-2">
          Kontaktoni shitësit duke klikuar &apos;Dërgo mesazh&apos; në çdo banesë
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#0A0F2E]">
      {/* ---- Header ---- */}
      <div className="flex-shrink-0 bg-[#060B1E] border-b border-white/[0.08] px-6 py-4">
        <h1 className="text-xl font-bold text-white">Mesazhet</h1>
        <p className="text-white/40 text-sm mt-0.5">
          {loading ? 'Duke u ngarkuar...' : `${conversations.length} biseda aktive`}
        </p>
      </div>

      {/* ---- Search ---- */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06]">
        <div className="relative group">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#1B4FFF]/20 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none" />
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

      {/* ---- Conversation list ---- */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="space-y-0.5 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl animate-pulse">
                <div className="w-12 h-12 rounded-full bg-white/[0.06] flex-shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-3 w-28 bg-white/[0.06] rounded-full" />
                  <div className="h-2.5 w-40 bg-white/[0.04] rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConvs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <p className="text-white/40 text-sm font-medium">Asnjë bisedë nuk përputhet</p>
            <p className="text-white/20 text-xs mt-1.5">Provo një kërkim tjetër</p>
          </div>
        ) : (
          <div>
            {filteredConvs.map(conv => (
              <Link
                key={conv.id}
                href={`/mesazhet/${conv.id}`}
                className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.05] hover:bg-white/[0.03] cursor-pointer transition-all duration-200 active:bg-white/[0.06]"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-[#1B4FFF]/20 border border-[#1B4FFF]/30 flex items-center justify-center text-[#4D7CFF] font-bold text-lg flex-shrink-0 overflow-hidden">
                  {conv.otherUser?.avatar_url ? (
                    <img src={conv.otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (conv.otherUser?.first_name || '?')[0].toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-white text-sm truncate">
                      {conv.otherUser?.first_name} {conv.otherUser?.last_name}
                    </p>
                    <span className="text-white/30 text-xs flex-shrink-0 ml-2">
                      {formatListTime(conv.updated_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-white/50 text-xs truncate">
                      {conv.listing?.title || 'Banesa'}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 bg-[#1B4FFF] text-white text-[10px] rounded-full flex items-center justify-center font-bold flex-shrink-0 ml-2">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p className={`text-xs truncate mt-0.5 ${
                      conv.unreadCount > 0 ? 'text-white/60 font-medium' : 'text-white/40'
                    }`}>
                      {conv.lastMessage.sender_id === userId ? 'Ti: ' : ''}
                      {conv.lastMessage.content.slice(0, 50)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 999px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  )
}
