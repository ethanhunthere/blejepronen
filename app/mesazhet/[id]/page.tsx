'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft,
  Send,
  MapPin,
  BedDouble,
  Maximize2,
} from 'lucide-react'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  is_read: boolean
}

interface ConversationData {
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

const formatPrice = (price: number) =>
  new Intl.NumberFormat('sq-AL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price)

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string

  const [conversation, setConversation] = useState<ConversationData | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabaseRef = useRef(createClient())

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load conversation data
  useEffect(() => {
    const supabase = supabaseRef.current

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push(`/login?next=${encodeURIComponent(`/mesazhet/${conversationId}`)}`)
        return
      }
      setUserId(session.user.id)

      // Fetch conversation + listing + other user
      supabase
        .from('conversations')
        .select(
          'id,listing_id,buyer_id,seller_id,listing:listings!inner(id,title,price,city,rooms,area_m2,type,images)'
        )
        .eq('id', conversationId)
        .single()
        .then(({ data: conv }) => {
          if (!conv) {
            router.push('/mesazhet')
            return
          }

          const otherId =
            conv.buyer_id === session.user.id
              ? conv.seller_id
              : conv.buyer_id

          supabase
            .from('profiles')
            .select('id,first_name,last_name,avatar_url')
            .eq('id', otherId)
            .single()
            .then(({ data: profile }) => {
              setConversation({
                id: conv.id,
                listing_id: conv.listing_id,
                buyer_id: conv.buyer_id,
                seller_id: conv.seller_id,
                listing: (conv.listing as unknown as ConversationData['listing']) || null,
                otherUser: profile as ConversationData['otherUser'],
              })
              setLoading(false)
            })
        })

      // Fetch existing messages
      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .then(({ data: msgs }) => {
          setMessages((msgs as Message[]) || [])
          // Mark unread messages as read
          const unreadIds = (msgs || [])
            .filter(m => !m.is_read && m.sender_id !== session.user.id)
            .map(m => m.id)
          if (unreadIds.length > 0) {
            supabase
              .from('messages')
              .update({ is_read: true })
              .in('id', unreadIds)
              .then(() => {})
          }
        })
    })
  }, [conversationId, router])

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return

    const channel = supabaseRef.current
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as Message
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          // Mark as read if from other user
          if (userId && msg.sender_id !== userId) {
            supabaseRef.current
              .from('messages')
              .update({ is_read: true })
              .eq('id', msg.id)
              .then(() => {})
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [conversationId, userId])

  const sendMessage = async () => {
    const text = newMessage.trim()
    if (!text || !userId) return

    setNewMessage('')
    const { error } = await supabaseRef.current.from('messages').insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: text,
      is_read: false,
    })

    if (error) {
      console.error('Send message error:', error.message)
    }

    // Update conversation updated_at
    if (!error) {
      supabaseRef.current
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .then(() => {})
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
      <div className="min-h-screen bg-[#0A0F2E] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#1B4FFF] rounded-full animate-spin" />
      </div>
    )
  }

  if (!conversation) return null

  const formatMsgTime = (date: string) =>
    new Date(date).toLocaleTimeString('sq-AL', {
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="min-h-screen bg-[#0A0F2E] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-[#0A0F2E]/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/mesazhet"
              className="text-white/60 hover:text-white p-1 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            {conversation.listing && (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden flex-shrink-0">
                  {conversation.listing.images?.[0] ? (
                    <Image
                      src={conversation.listing.images[0]}
                      alt=""
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {conversation.listing.title}
                  </p>
                  <p className="text-xs text-white/50">
                    {formatPrice(conversation.listing.price)}
                    {conversation.listing.type === 'qira' && '/muaj'}
                    <span className="mx-1.5">·</span>
                    <BedDouble className="h-3 w-3 inline" />{' '}
                    {conversation.listing.rooms}
                    <span className="mx-1">·</span>
                    <Maximize2 className="h-3 w-3 inline" />{' '}
                    {conversation.listing.area_m2}m²
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => {
            const isMine = msg.sender_id === userId
            const showAvatar =
              i === 0 ||
              messages[i - 1]?.sender_id !== msg.sender_id

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                {!isMine && showAvatar && (
                  <div className="w-8 h-8 rounded-full bg-[#1B4FFF] overflow-hidden flex-shrink-0 flex items-center justify-center text-white text-xs font-bold self-end">
                    {conversation.otherUser?.avatar_url ? (
                      <img
                        src={conversation.otherUser.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (conversation.otherUser?.first_name || '?')[0].toUpperCase()
                    )}
                  </div>
                )}
                {!isMine && !showAvatar && <div className="w-8 flex-shrink-0" />}

                <div
                  className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed ${
                    isMine
                      ? 'bg-[#1B4FFF] text-white rounded-2xl rounded-br-sm'
                      : 'bg-white/10 text-white rounded-2xl rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isMine ? 'text-white/60' : 'text-white/40'
                    }`}
                  >
                    {formatMsgTime(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-white/10 bg-[#0A0F2E]/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Shkruaj mesazh..."
              rows={1}
              className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/30 text-sm resize-none focus:outline-none focus:border-[#1B4FFF]/50 transition-colors"
              style={{ maxHeight: '120px' }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="w-12 h-12 bg-[#1B4FFF] hover:bg-[#1640CC] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
