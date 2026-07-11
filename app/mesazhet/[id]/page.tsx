'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, SendHorizonal, WifiOff } from 'lucide-react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// ---- Types ----
interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  is_read: boolean
}

interface ConvData {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  listing: {
    id: string
    title: string
    price: number
    city: string
    rooms: number
    area_m2: number
    type: string
    images: string[]
  } | null
  otherUser: {
    id: string
    first_name: string
    last_name: string
    avatar_url: string | null
  } | null
}

// ---- Helpers ----
const formatPrice = (n: number) =>
  new Intl.NumberFormat('sq-AL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const MSG_EXPIRY_MS = 60 * 24 * 60 * 60 * 1000

function isExpired(date: string): boolean {
  return new Date(date).getTime() < Date.now() - MSG_EXPIRY_MS
}

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = (today.getTime() - msgDay.getTime()) / 86_400_000

  if (diff === 0) return 'Sot'
  if (diff === 1) return 'Dje'
  if (diff < 7) return d.toLocaleDateString('sq-AL', { weekday: 'long' })
  return d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string

  const [conv, setConv] = useState<ConvData | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [connected, setConnected] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabaseRef = useRef(createClient())

  const scrollToBottom = useCallback((smooth = false) => {
    if (!containerRef.current) return
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    })
  }, [])

  // ---- Load conversation + messages ----
  useEffect(() => {
    const supabase = supabaseRef.current

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push(`/login?next=${encodeURIComponent(`/mesazhet/${conversationId}`)}`)
        return
      }
      setUserId(session.user.id)

      supabase
        .from('conversations')
        .select('id,listing_id,buyer_id,seller_id,listing:listings!inner(id,title,price,city,rooms,area_m2,type,images)')
        .eq('id', conversationId)
        .single()
        .then(({ data: c }) => {
          if (!c) { router.push('/mesazhet'); return }

          const otherId = c.buyer_id === session.user.id ? c.seller_id : c.buyer_id
          supabase
            .from('profiles')
            .select('id,first_name,last_name,avatar_url')
            .eq('id', otherId)
            .single()
            .then(({ data: profile }) => {
              setConv({
                id: c.id,
                listing_id: c.listing_id,
                buyer_id: c.buyer_id,
                seller_id: c.seller_id,
                listing: c.listing as unknown as ConvData['listing'],
                otherUser: profile as ConvData['otherUser'],
              })
              setLoading(false)
            })
        })

      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .then(({ data: msgs }) => {
          const ms = (msgs || []) as MessageRow[]
          setMessages(ms)
          const unreadIds = ms.filter(m => !m.is_read && m.sender_id !== session.user.id).map(m => m.id)
          if (unreadIds.length > 0) {
            supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then(() => {})
          }
        })
    })
  }, [conversationId, router])

  useEffect(() => {
    if (!loading && messages.length > 0) scrollToBottom(false)
  }, [loading, messages.length, scrollToBottom])

  // ---- Realtime ----
  useEffect(() => {
    if (!conversationId || !userId) return

    const supabase = supabaseRef.current
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload: RealtimePostgresChangesPayload<MessageRow>) => {
          const msg = payload.new as MessageRow
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            scrollToBottom(true)
            return [...prev, msg]
          })
          if (msg.sender_id !== userId) {
            supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then(() => {})
          }
        }
      )
      .on('broadcast', { event: 'typing' }, (payload: { payload: { userId: string } }) => {
        if (payload.payload.userId !== userId) {
          setIsTyping(true)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000)
        }
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      channel.unsubscribe()
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [conversationId, userId, scrollToBottom])

  // ---- Typing broadcast ----
  const broadcastTyping = useCallback(() => {
    supabaseRef.current.channel(`conversation:${conversationId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId },
    })
  }, [conversationId, userId])

  // ---- Send message ----
  const sendMessage = async () => {
    const text = newMsg.trim()
    if (!text || !userId || text.length > 1000) return

    setNewMsg('')
    const supabase = supabaseRef.current
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: text,
      is_read: false,
    })

    if (!error) {
      supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId).then(() => {})
    }
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0A0F2E]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#1B4FFF] rounded-full animate-spin" />
      </div>
    )
  }

  if (!conv) return null

  const formatMsgTime = (d: string) =>
    new Date(d).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })

  // Group messages: date separators + sender groups
  const renderItems: (
    | { type: 'date'; label: string }
    | { type: 'msg'; msg: MessageRow; isLastInGroup: boolean; isFirst: boolean }
  )[] = []
  let lastDate = ''
  let lastSender = ''

  messages.forEach((msg, i) => {
    const msgDate = getDateLabel(msg.created_at)
    if (msgDate !== lastDate) {
      renderItems.push({ type: 'date', label: msgDate })
      lastDate = msgDate
      lastSender = ''
    }
    const nextMsg = messages[i + 1]
    renderItems.push({
      type: 'msg',
      msg,
      isLastInGroup: !nextMsg || nextMsg.sender_id !== msg.sender_id,
      isFirst: msg.sender_id !== lastSender,
    })
    lastSender = msg.sender_id
  })

  return (
    <div className="flex flex-col h-full bg-[#0A0F2E]">
      {/* ---- HEADER ---- */}
      <header className="flex-shrink-0 h-16 bg-[#060B1E] border-b border-white/8 flex items-center px-3 sm:px-4 gap-3">
        <Link href="/mesazhet" className="lg:hidden text-white/60 hover:text-white p-1 flex-shrink-0 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {/* Other user */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#1B4FFF] overflow-hidden flex items-center justify-center text-white font-bold text-sm">
              {conv.otherUser?.avatar_url ? (
                <img src={conv.otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (conv.otherUser?.first_name || '?')[0].toUpperCase()
              )}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#060B1E] ${connected ? 'bg-green-500' : 'bg-white/30'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {conv.otherUser?.first_name} {conv.otherUser?.last_name}
            </p>
          </div>
        </div>

        {/* Listing mini-card */}
        {conv.listing && (
          <Link
            href={`/listings/${conv.listing.id}`}
            className="hidden sm:flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-xl px-3 py-1.5 flex-shrink-0 transition-colors max-w-[220px]"
          >
            <div className="w-8 h-8 rounded-lg bg-white/10 overflow-hidden flex-shrink-0">
              {conv.listing.images?.[0] ? (
                <Image src={conv.listing.images[0]} alt="" width={32} height={32} className="object-cover w-full h-full" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{conv.listing.title}</p>
              <p className="text-[10px] text-white/50">
                {formatPrice(conv.listing.price)}{conv.listing.type === 'qira' ? '/muaj' : ''}
              </p>
            </div>
          </Link>
        )}
      </header>

      {/* ---- EXPIRY BANNER ---- */}
      <div className="flex-shrink-0 px-4 py-1.5 bg-white/3 border-b border-white/5 text-center">
        <p className="text-[10px] text-white/25">Mesazhet fshihen pas 60 ditësh</p>
      </div>

      {/* ---- MESSAGES ---- */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-5">
          {!connected && (
            <div className="flex items-center justify-center gap-2 text-xs text-white/30 py-2">
              <WifiOff className="h-3 w-3" />
              Duke u rilidhur...
            </div>
          )}

          {renderItems.map((item, i) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${item.label}-${i}`} className="flex justify-center">
                  <span className="text-[11px] text-white/30 bg-white/5 rounded-full px-3 py-1">
                    {item.label}
                  </span>
                </div>
              )
            }

            const { msg, isLastInGroup, isFirst } = item
            if (isExpired(msg.created_at)) {
              return (
                <div key={msg.id} className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[70%] md:max-w-[55%] bg-white/3 border border-white/5 rounded-2xl px-4 py-2.5 text-white/30 italic text-xs">
                    Ky mesazh ka skaduar (60 ditë)
                  </div>
                </div>
              )
            }

            const isMine = msg.sender_id === userId
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                style={{ marginTop: isFirst ? '0.25rem' : '0.125rem' }}
              >
                {!isMine && (
                  isLastInGroup ? (
                    <div className="w-7 h-7 rounded-full bg-[#1B4FFF] overflow-hidden flex-shrink-0 self-end flex items-center justify-center text-white text-[10px] font-bold">
                      {conv.otherUser?.avatar_url ? (
                        <img src={conv.otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (conv.otherUser?.first_name || '?')[0].toUpperCase()
                      )}
                    </div>
                  ) : (
                    <div className="w-7 flex-shrink-0" />
                  )
                )}

                <div
                  className={`max-w-[70%] md:max-w-[55%] px-4 py-2.5 text-sm leading-relaxed ${
                    isMine
                      ? 'bg-[#1B4FFF] text-white rounded-2xl rounded-tr-sm'
                      : 'bg-[#131B3A] border border-white/8 text-white rounded-2xl rounded-tl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                    <span className={`text-[10px] ${isMine ? 'text-white/50' : 'text-white/40'}`}>
                      {formatMsgTime(msg.created_at)}
                    </span>
                    {isMine && isLastInGroup && (
                      <span className="text-[10px] text-white/40" title="E lexuar">
                        {msg.is_read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start gap-2">
              <div className="w-7 h-7 rounded-full bg-[#1B4FFF] overflow-hidden flex-shrink-0 self-end flex items-center justify-center text-white text-[10px] font-bold">
                {conv.otherUser?.avatar_url ? (
                  <img src={conv.otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (conv.otherUser?.first_name || '?')[0].toUpperCase()
                )}
              </div>
              <div className="bg-[#131B3A] border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                {[0, 150, 300].map((delay, j) => (
                  <span
                    key={j}
                    className="w-2 h-2 rounded-full bg-white/60 inline-block"
                    style={{ animation: `bounce 1s ${delay}ms infinite` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div id="msg-bottom" />
        </div>
      </div>

      {/* ---- INPUT ---- */}
      <footer className="flex-shrink-0 bg-[#060B1E] border-t border-white/8 p-3">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={newMsg}
            onChange={e => {
              const v = e.target.value
              if (v.length <= 1000) setNewMsg(v)
              broadcastTyping()
            }}
            onKeyDown={handleKeyDown}
            placeholder="Shkruaj mesazh..."
            rows={1}
            className="flex-1 bg-white/8 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder:text-white/30 text-sm resize-none focus:outline-none focus:border-[#1B4FFF]/50 transition-colors"
            style={{ minHeight: '44px', maxHeight: '120px' }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={sendMessage}
              disabled={!newMsg.trim()}
              className="w-11 h-11 bg-[#1B4FFF] hover:bg-[#1640CC] disabled:opacity-40 disabled:cursor-not-allowed rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
            >
              <SendHorizonal className="h-5 w-5 text-white" />
            </button>
            {newMsg.length > 800 && (
              <span className={`text-[10px] ${newMsg.length >= 1000 ? 'text-red-400' : 'text-white/30'}`}>
                {newMsg.length}/1000
              </span>
            )}
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30%            { opacity: 1;   transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
