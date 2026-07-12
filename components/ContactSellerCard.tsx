'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, MessageCircle, ExternalLink, CheckCircle, MessagesSquare, Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useFavorites } from '@/lib/useFavorites'

interface SellerInfo {
  firstName: string
  lastName: string
  phone: string | null
  avatarUrl: string | null
  emailVerified: boolean
  userId: string
}

interface ContactSellerCardProps {
  price: string
  pricePerSqm: string | null
  type: 'shitje' | 'qira'
  seller: SellerInfo
  listingId: string
  className?: string
}

export default function ContactSellerCard({
  price,
  pricePerSqm,
  type,
  seller,
  listingId,
  className,
}: ContactSellerCardProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loginUrl, setLoginUrl] = useState(`/login`)
  const { favoriteIds, toggleFavorite } = useFavorites()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsLoggedIn(true)
        setCurrentUserId(session.user.id)
      } else {
        setIsLoggedIn(false)
      }
    })
    setLoginUrl(`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`)
  }, [listingId])

  const cleanPhone = seller.phone ? seller.phone.replace(/\D/g, '') : ''
  const whatsAppUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : '#'
  const isOwnListing = currentUserId === seller.userId
  const isFav = favoriteIds.includes(listingId)

  const handleMessage = async () => {
    if (!currentUserId || isOwnListing) return

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, seller_id: seller.userId }),
      })
      const data = await res.json()
      if (data.conversation_id) {
        window.location.href = `/mesazhet/${data.conversation_id}`
      }
    } catch (err) {
      console.error('Failed to create conversation:', err)
    }
  }

  return (
    <div
      id="contact-card"
      className={`bg-white border border-gray-100 shadow-xl rounded-3xl p-6 sticky top-24 ${className || ''}`}
    >
      {/* Price */}
      <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Çmimi</p>
      <p className="text-4xl font-black text-[#1A1A2E] mb-1">
        {price}
        {type === 'qira' && (
          <span className="text-base font-normal text-gray-400">/muaj</span>
        )}
      </p>
      {pricePerSqm && (
        <p className="text-sm text-gray-400 mb-4">≈ {pricePerSqm}/m²</p>
      )}

      {/* Favorite heart button */}
      <button
        type="button"
        onClick={() => toggleFavorite(listingId)}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all duration-200 font-semibold text-sm cursor-pointer ${
          isFav
            ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Heart
          className="h-4 w-4"
          fill={isFav ? 'currentColor' : 'none'}
        />
        {isFav ? 'E ruajtur' : 'Ruaj banesën'}
      </button>

      <div className="border-t border-gray-100 my-4" />

      {/* Seller info */}
      <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Shitësi</p>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-full bg-[#111827] overflow-hidden flex-shrink-0 flex items-center justify-center text-white font-bold text-lg">
          {seller.avatarUrl ? (
            <img
              src={seller.avatarUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            (seller.firstName || '?')[0].toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-[#1A1A2E] truncate">
              {seller.firstName} {seller.lastName}
            </p>
            {seller.emailVerified && (
              <span title="I verifikuar" className="flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </span>
            )}
          </div>
          <a
            href={`/profili/${seller.userId}`}
            className="text-xs text-[#111827] hover:text-[#1F2937] inline-flex items-center gap-1 transition-colors"
          >
            Shiko profilin <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Contact buttons */}
      <div className="space-y-3">
        {/* Phone & WhatsApp - always visible */}
        {seller.phone ? (
          <>
            <a
              href={`tel:${seller.phone}`}
              className="w-full bg-[#111827] hover:bg-[#1F2937] text-white font-bold py-4 rounded-2xl text-base shadow-lg shadow-[#111827]/25 hover:shadow-[#111827]/40 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Phone className="h-5 w-5" />
              {seller.phone}
            </a>
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 hover:border-[#25D366]/50 py-3 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="h-5 w-5" />
              WhatsApp
            </a>
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center py-2">
            Shitësi nuk ka numër telefoni të regjistruar.
          </p>
        )}

        {/* Direct message - gated behind login */}
        {isLoggedIn ? (
          !isOwnListing && (
            <button
              type="button"
              onClick={handleMessage}
              className="w-full bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessagesSquare className="h-5 w-5" />
              Dërgo mesazh
            </button>
          )
        ) : (
          <a
            href={loginUrl}
            className="w-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <MessagesSquare className="h-5 w-5" />
            Kyçu për të kontaktuar direkt me personin
          </a>
        )}
      </div>

      {/* Listing ID */}
      <p className="text-gray-200 text-[10px] text-center mt-4">
        ID: {listingId.slice(0, 8)}
      </p>
    </div>
  )
}
