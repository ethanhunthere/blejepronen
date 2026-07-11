'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, MessageCircle, ExternalLink, CheckCircle, MessagesSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase'

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
      className={`bg-[#060B1E] border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/40 sticky top-24 ${className || ''}`}
    >
      {/* Price */}
      <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Çmimi</p>
      <p className="text-4xl font-black text-white mb-1">
        {price}
        {type === 'qira' && (
          <span className="text-base font-normal text-white/50">/muaj</span>
        )}
      </p>
      {pricePerSqm && (
        <p className="text-sm text-white/40 mb-4">≈ {pricePerSqm}/m²</p>
      )}

      <div className="border-t border-white/8 my-4" />

      {/* Seller info */}
      <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Shitësi</p>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-full bg-[#1B4FFF] overflow-hidden flex-shrink-0 flex items-center justify-center text-white font-bold text-lg">
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
            <p className="font-bold text-white truncate">
              {seller.firstName} {seller.lastName}
            </p>
            {seller.emailVerified && (
              <span title="I verifikuar" className="flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              </span>
            )}
          </div>
          <a
            href={`/profili/${seller.userId}`}
            className="text-xs text-[#4D7CFF] hover:text-white inline-flex items-center gap-1 transition-colors"
          >
            Shiko profilin <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Contact buttons */}
      <div className="space-y-3">
        {isLoggedIn ? (
          <>
            {seller.phone ? (
              <>
                <a
                  href={`tel:${seller.phone}`}
                  className="w-full bg-[#1B4FFF] hover:bg-[#1640CC] text-white font-bold py-4 rounded-2xl text-base shadow-lg shadow-[#1B4FFF]/25 hover:shadow-[#1B4FFF]/40 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
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
              <p className="text-sm text-white/50 text-center py-2">
                Shitësi nuk ka numër telefoni të regjistruar.
              </p>
            )}
            {/* Message button — only if NOT own listing */}
            {!isOwnListing && (
              <button
                type="button"
                onClick={handleMessage}
                className="w-full bg-white/6 border border-white/12 text-white/80 hover:bg-white/10 hover:border-white/25 hover:text-white py-3 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessagesSquare className="h-5 w-5" />
                Dërgo mesazh
              </button>
            )}
          </>
        ) : (
          <>
            <a
              href={loginUrl}
              className="w-full bg-[#1B4FFF] hover:bg-[#1640CC] text-white font-bold py-4 rounded-2xl text-base shadow-lg shadow-[#1B4FFF]/25 hover:shadow-[#1B4FFF]/40 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Phone className="h-5 w-5" />
              Kyçu për të parë numrin
            </a>
            <p className="text-xs text-white/40 text-center px-2">
              Kyçu për të kontaktuar shitësin dhe parë numrin e telefonit
            </p>
          </>
        )}
      </div>

      {/* Listing ID */}
      <p className="text-white/15 text-[10px] text-center mt-4">
        ID: {listingId.slice(0, 8)}
      </p>
    </div>
  )
}
