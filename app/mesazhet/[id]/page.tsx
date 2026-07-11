'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, SendHorizonal, WifiOff, Clock3, ShieldAlert } from 'lucide-react'
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const scrollToBottom = useCallback((smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
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
            window.dispatchEvent(new CustomEvent('messages-read', { detail: { count: unreadIds.length } }))
            supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then(() => {
              window.dispatchEvent(new CustomEvent('messages-read'))
            })
          }
          // Auto-scroll to bottom after initial load
          setTimeout(() => scrollToBottom(false), 50)
        })
    })
  }, [conversationId, router, scrollToBottom])

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
            const optimisticIdx = prev.findIndex(
              m => m.id.startsWith('optimistic-') && m.sender_id === msg.sender_id && m.content === msg.content
            )
            if (optimisticIdx !== -1) {
              const next = [...prev]
              next[optimisticIdx] = msg
              return next
            }
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          // Scroll to bottom on new message
          setTimeout(() => scrollToBottom(true), 50)
          if (msg.sender_id !== userId) {
            window.dispatchEvent(new CustomEvent('messages-read', { detail: { count: 1 } }))
            supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then(() => {
              window.dispatchEvent(new CustomEvent('messages-read'))
            })
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

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [conversationId, userId, scrollToBottom])

  // ---- Typing broadcast ----
  const broadcastTyping = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId },
    })
  }, [userId])

  // ---- Send message (optimistic) ----
  const sendMessage = async () => {
    const text = newMsg.trim()
    if (!text || !userId || text.length > 1000) return

    setNewMsg('')

    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const optimisticMsg: MessageRow = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: userId,
      content: text,
      created_at: new Date().toISOString(),
      is_read: false,
    }
    setMessages(prev => [...prev, optimisticMsg])
    scrollToBottom(true)

    const supabase = supabaseRef.current
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: text,
      is_read: false,
    })

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } else {
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
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-[#0A0F2E] via-[#0D1235] to-[#0A0F2E]">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1B4FFF]/20 to-transparent animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/20 border-t-[#1B4FFF] rounded-full animate-spin" />
          </div>
        </div>
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
    <div className="h-full flex flex-col bg-[#0A0F2E] overflow-hidden">
      {/* ---- HEADER ---- */}
      <header className="flex-shrink-0 bg-[#060B1E] border-b border-white/[0.08] px-3 py-2.5 flex items-center gap-3">
        {/* Back button */}
        <Link
          href="/mesazhet"
          className="text-white/50 hover:text-white p-2 -ml-2 rounded-xl hover:bg-white/[0.06] transition-all duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-[#1B4FFF]/20 border border-[#1B4FFF]/30 flex items-center justify-center text-[#4D7CFF] font-bold text-sm flex-shrink-0 overflow-hidden">
          {conv.otherUser?.avatar_url ? (
            <img src={conv.otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            (conv.otherUser?.first_name || '?')[0].toUpperCase()
          )}
        </div>

        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">
            {conv.otherUser?.first_name} {conv.otherUser?.last_name}
          </p>
          {conv.listing && (
            <p className="text-white/40 text-xs truncate">{conv.listing.title}</p>
          )}
          {isTyping && (
            <p className="text-[11px] text-[#1B4FFF]/70 font-medium animate-fade-in">duke shkruar...</p>
          )}
        </div>

        {/* Listing thumbnail */}
        {conv.listing?.images?.[0] && (
          <Link
            href={`/listings/${conv.listing.id}`}
            className="w-10 h-10 rounded-lg overflow-hidden border border-white/[0.1] flex-shrink-0 hover:border-white/[0.2] transition-colors"
          >
            <img
              src={conv.listing.images[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          </Link>
        )}

        {/* Connection status */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-500 ${
          connected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-white/20'
        }`} />
      </header>

      {/* ---- MESSAGES ---- */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5 scrollbar-thin">
        <div className="max-w-3xl mx-auto">
          {!connected && (
            <div className="flex items-center justify-center gap-2 text-xs text-white/25 py-2 animate-pulse">
              <WifiOff className="h-3 w-3" />
              Duke u rilidhur...
            </div>
          )}

          {renderItems.map((item, i) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${item.label}-${i}`} className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[11px] text-white/25 font-medium tracking-wide flex-shrink-0">
                    {item.label}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
              )
            }

            const { msg, isLastInGroup, isFirst } = item
            if (isExpired(msg.created_at)) {
              return (
                <div key={msg.id} className="flex justify-center py-1">
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl px-4 py-2 flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-white/15 flex-shrink-0" />
                    <span className="text-white/20 italic text-xs">Ky mesazh ka skaduar (60 ditë)</span>
                  </div>
                </div>
              )
            }

            const isMine = msg.sender_id === userId
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                style={{
                  marginTop: isFirst ? '0.75rem' : '0.125rem',
                  animation: 'msgSlideIn 0.3s ease-out',
                }}
              >
                {!isMine && (
                  isLastInGroup ? (
                    <div className="w-7 h-7 rounded-full bg-[#1B4FFF]/20 border border-[#1B4FFF]/30 flex items-center justify-center text-[#4D7CFF] font-bold text-[10px] flex-shrink-0 self-end overflow-hidden">
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
                  className={`max-w-[75%] md:max-w-[60%] px-3.5 py-2 text-sm leading-relaxed ${
                    isMine
                      ? 'bg-[#1B4FFF] text-white rounded-2xl rounded-br-md'
                      : 'bg-[#1E2344] text-white/90 rounded-2xl rounded-bl-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <div className={`flex items-center gap-1.5 mt-1 ${isMine ? 'justify-end' : ''}`}>
                    <span className={`text-[10px] font-medium ${isMine ? 'text-white/50' : 'text-white/30'}`}>
                      {formatMsgTime(msg.created_at)}
                    </span>
                    {isMine && isLastInGroup && (
                      <span className={`text-[10px] ${msg.is_read ? 'text-[#8CB4FF]' : 'text-white/35'}`} title={msg.is_read ? 'E lexuar' : 'E dërguar'}>
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
            <div className="flex justify-start gap-2" style={{ animation: 'fadeSlideUp 0.25s ease-out' }}>
              <div className="w-7 h-7 rounded-full bg-[#1B4FFF]/20 border border-[#1B4FFF]/30 flex items-center justify-center text-[#4D7CFF] font-bold text-[10px] flex-shrink-0 self-end overflow-hidden">
                {conv.otherUser?.avatar_url ? (
                  <img src={conv.otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (conv.otherUser?.first_name || '?')[0].toUpperCase()
                )}
              </div>
              <div className="bg-[#1E2344] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                {[0, 150, 300].map((delay, j) => (
                  <span
                    key={j}
                    className="w-2 h-2 rounded-full bg-[#4D7CFF]/70 inline-block"
                    style={{ animation: `typingWave 1.2s ${delay}ms infinite` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Invisible element at bottom — scroll target */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ---- INPUT ---- */}
      <footer className="flex-shrink-0 bg-[#060B1E] border-t border-white/[0.08] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
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
            className="flex-1 bg-white/[0.08] border border-white/[0.12] rounded-2xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 resize-none min-h-[40px] max-h-[100px] focus:border-[#1B4FFF]/40 focus:outline-none focus:bg-white/[0.1] transition-all duration-200"
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 100) + 'px'
            }}
          />
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={sendMessage}
              disabled={!newMsg.trim()}
              className="w-10 h-10 bg-[#1B4FFF] hover:bg-[#1640CC] rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
            >
              <SendHorizonal className="h-4 w-4 text-white" />
            </button>
            {newMsg.length > 800 && (
              <span className={`text-[10px] font-medium transition-colors ${newMsg.length >= 1000 ? 'text-red-400' : 'text-white/25'}`}>
                {newMsg.length}/1000
              </span>
            )}
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes msgSlideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes typingWave {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30%            { opacity: 1;   transform: translateY(-5px); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 999px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
        .animate-fade-in { animation: fadeSlideUp 0.3s ease-out; }
      `}</style>
    </div>
  )
}
