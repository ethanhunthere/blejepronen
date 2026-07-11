'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { MessageCircle } from 'lucide-react'

interface Conversation {
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

export default function MesazhetPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        setLoading(false)
        return
      }
      setUserId(session.user.id)

      supabase
        .from('conversations')
        .select(
          `
          id, listing_id, buyer_id, seller_id, updated_at,
          listing:listings!inner ( title, images, price ),
          messages ( content, created_at, sender_id, is_read )
        `
        )
        .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
        .order('updated_at', { ascending: false })
        .then(({ data }) => {
          if (!data) {
            setLoading(false)
            return
          }

          // Extract unique user IDs
          const userIds = new Set<string>()
          data.forEach(c => {
            const otherId =
              c.buyer_id === session.user.id ? c.seller_id : c.buyer_id
            userIds.add(otherId)
          })

          // Fetch profile for each other user
          if (userIds.size > 0) {
            const ids = Array.from(userIds)
            supabase
              .from('profiles')
              .select('id,first_name,last_name,avatar_url')
              .in('id', ids)
              .then(({ data: profiles }) => {
                const profileMap = new Map(
                  (profiles || []).map(p => [p.id, p])
                )

                const result: Conversation[] = data.map(c => {
                  const msgs = (c.messages || []) as {
                    content: string
                    created_at: string
                    sender_id: string
                    is_read: boolean
                  }[]
                  const sorted = [...msgs].sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                  )
                  const otherId =
                    c.buyer_id === session.user!.id
                      ? c.seller_id
                      : c.buyer_id

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
                    unreadCount: msgs.filter(
                      m => !m.is_read && m.sender_id !== session.user!.id
                    ).length,
                  }
                })

                setConversations(result)
                setLoading(false)
              })
          } else {
            setConversations([])
            setLoading(false)
          }
        })
    })
  }, [])

  function formatTime(date: string): string {
    const d = new Date(date)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) {
      return d.toLocaleTimeString('sq-AL', {
        hour: '2-digit',
        minute: '2-digit',
      })
    }
    return d.toLocaleDateString('sq-AL', {
      day: 'numeric',
      month: 'short',
    })
  }

  if (loading) return null // loading.tsx handles skeleton

  return (
    <div className="min-h-screen bg-[#0A0F2E]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Mesazhet</h1>

        {conversations.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <MessageCircle className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-lg">Nuk keni mesazhe ende.</p>
            <p className="text-white/30 text-sm mt-2">
              Kur të kontaktoni një shitës, biseda do të shfaqet këtu.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map(conv => (
              <Link
                key={conv.id}
                href={`/mesazhet/${conv.id}`}
                className="block bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Listing photo */}
                  <div className="w-14 h-14 rounded-xl bg-white/10 overflow-hidden flex-shrink-0">
                    {conv.listing?.images?.[0] ? (
                      <Image
                        src={conv.listing.images[0]}
                        alt=""
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <MessageCircle className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-white truncate">
                        {conv.otherUser?.first_name}{' '}
                        {conv.otherUser?.last_name}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-white/40 text-xs truncate mb-1">
                      {conv.listing?.title || 'Banesa'}
                    </p>
                    {conv.lastMessage && (
                      <p className="text-white/60 text-sm truncate">
                        {conv.lastMessage.sender_id === userId
                          ? 'Ti: '
                          : ''}
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>

                  {/* Time */}
                  {conv.updated_at && (
                    <span className="text-white/30 text-xs flex-shrink-0">
                      {formatTime(conv.updated_at)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
