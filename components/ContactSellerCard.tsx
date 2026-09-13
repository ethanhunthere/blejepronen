'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Phone,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  MessagesSquare,
  Heart,
  Share2,
  Check,
  Sparkles,
  Lock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useFavorites } from '@/lib/useFavorites'
import { normalizePhoneNumber, formatPhoneDisplay } from '@/lib/phone'
import { toast } from 'sonner'
import SocialLinksBar from '@/components/SocialIcons'
import { type SocialLinks, hasAnySocial } from '@/lib/socials'

interface SellerInfo {
  firstName: string
  lastName: string
  phone: string | null
  avatarUrl: string | null
  emailVerified: boolean
  userId: string
  socials?: SocialLinks | null
}

interface ContactSellerCardProps {
  price: string
  pricePerSqm: string | null
  type: 'shitje' | 'qira'
  seller: SellerInfo
  listingId: string
  listingTitle?: string
  listingCity?: string
  socials?: SocialLinks | null
  className?: string
}

export default function ContactSellerCard({
  price,
  pricePerSqm,
  type,
  seller,
  listingId,
  listingTitle,
  listingCity,
  socials,
  className,
}: ContactSellerCardProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loginUrl, setLoginUrl] = useState(`/login`)
  const [copied, setCopied] = useState(false)
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

  const rawPhone = seller.phone || ''
  const cleanPhone = rawPhone ? normalizePhoneNumber(rawPhone).replace(/\D/g, '') : ''
  const displayPhone = rawPhone ? formatPhoneDisplay(rawPhone) : ''

  const waGreeting = encodeURIComponent(
    `Përshëndetje! Po ju kontaktoj nga BlejePronën lidhur me pronën tuaj: "${listingTitle || 'Pronë'}"${listingCity ? ` në ${listingCity}` : ''} (https://blejepronen.com/listings/${listingId}). A është ende e lirë?`
  )
  const whatsAppUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waGreeting}` : '#'

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

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : `https://blejepronen.com/listings/${listingId}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${listingTitle || 'Pronë'} | Bleje Pronën`,
          text: `Shiko këtë pronë në ${listingCity || 'Kosovë'}: ${listingTitle || ''} (${price})`,
          url,
        })
        return
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Linku i pronës u kopjua me sukses!')
      setTimeout(() => setCopied(false), 2200)
    } catch {
      toast.error('Nuk u arrit kopjimi i linkut.')
    }
  }

  return (
    <div
      id="contact-card"
      className={`bg-white border border-gray-100/90 shadow-[0_12px_40px_-15px_rgba(0,0,0,0.08)] rounded-3xl p-6 sticky top-24 transition-all ${className || ''}`}
    >
      {/* Price Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Çmimi i kërkuar
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-[#006459] border border-emerald-100">
            <Sparkles className="h-3 w-3" />
            {type === 'shitje' ? 'Shitje direkte' : 'Qira mujore'}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-3xl xl:text-4xl font-black text-[#101828] tracking-tight">
            {price}
          </span>
          {type === 'qira' && (
            <span className="text-sm font-semibold text-gray-500">/muaj</span>
          )}
        </div>

        {pricePerSqm && (
          <p className="text-xs font-semibold text-gray-500 mt-1">
            ≈ {pricePerSqm}/m²
          </p>
        )}
      </div>

      {/* Quick Action Bar: Heart + Share */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggleFavorite(listingId)
            if (!isFav) toast.success('U ruajt te të preferuarat!')
            else toast.info('U hoq nga të preferuarat.')
          }}
          className={`h-10 flex items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95 ${
            isFav
              ? 'border-rose-200 bg-rose-50 text-rose-600 shadow-2xs'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'
          }`}
          aria-label={isFav ? 'E ruajtur' : 'Ruaj pronën'}
        >
          <Heart className={`h-3.5 w-3.5 ${isFav ? 'text-rose-500 fill-rose-500' : 'text-gray-500'}`} />
          <span>{isFav ? 'E ruajtur' : 'Ruaj pronën'}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="h-10 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95"
          aria-label="Ndaj me dikë"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700">U kopjua</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5 text-gray-500" />
              <span>Ndaj me mik</span>
            </>
          )}
        </button>
      </div>

      <div className="border-t border-gray-100 pt-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Informacioni i Shitësit
          </span>
          {seller.emailVerified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              I verifikuar
            </span>
          )}
        </div>

        {/* Seller Info Row */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/70 border border-gray-100">
          <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-[#006459]/10 border border-gray-200">
            <Image
              src={seller.avatarUrl || '/avatars/avatar-1.png'}
              alt={seller.firstName || 'Shitësi'}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[#101828] text-sm truncate">
              {seller.firstName} {seller.lastName}
            </p>
            <a
              href={`/profili/${seller.userId}`}
              className="text-[11px] font-medium text-[#006459] hover:underline inline-flex items-center gap-1 mt-0.5"
            >
              Shiko profilin publik <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Primary Conversion CTAs */}
      <div className="space-y-2.5">
        {cleanPhone ? (
          <>
            {/* WhatsApp - #1 Conversion Driver */}
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[46px] bg-[#25D366] hover:bg-[#20ba59] text-white py-3 px-4 rounded-2xl font-bold text-sm shadow-md shadow-[#25D366]/25 hover:shadow-lg hover:shadow-[#25D366]/35 active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="h-4 w-4 fill-white" />
              <span>Shkruaj në WhatsApp</span>
            </a>

            {/* Direct Phone Call */}
            <a
              href={`tel:${seller.phone}`}
              className="w-full min-h-[44px] bg-[#006459] hover:bg-[#005048] text-white py-2.5 px-4 rounded-2xl font-bold text-sm shadow-md shadow-[#006459]/20 hover:shadow-lg hover:shadow-[#006459]/30 active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Phone className="h-4 w-4" />
              <span>Telefono ({displayPhone})</span>
            </a>
          </>
        ) : (
          <p className="text-xs text-gray-500 text-center py-2 bg-gray-50 rounded-xl border border-gray-100">
            Shitësi nuk ka specifikuar numër telefoni.
          </p>
        )}

        {/* Platform Direct Messaging */}
        {isLoggedIn ? (
          !isOwnListing && (
            <button
              type="button"
              onClick={handleMessage}
              className="w-full min-h-[42px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 px-4 rounded-2xl font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <MessagesSquare className="h-4 w-4 text-[#006459]" />
              <span>Dërgo Mesazh në Platformë</span>
            </button>
          )
        ) : (
          <div className="pt-1">
            <a
              href={loginUrl}
              className="w-full min-h-[38px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessagesSquare className="h-3.5 w-3.5 text-gray-500" />
              <span>Hyr për të dërguar mesazh</span>
            </a>
          </div>
        )}
      </div>

      {/* Seller Socials (Instagram, Facebook, WhatsApp, TikTok) - Positioned below CTAs */}
      {hasAnySocial(socials || seller.socials) && (
        <div className="mt-4 pt-3.5 border-t border-gray-100">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
            Rrjetet Sociale të Shitësit
          </p>
          <SocialLinksBar socials={socials || seller.socials} variant="pills" />
        </div>
      )}

      {/* Trust & Transparency Guarantee */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
        <div className="flex items-center gap-1">
          <Lock className="h-3 w-3 text-emerald-600" />
          <span>Kontakt direkt me pronarin</span>
        </div>
        <span className="text-gray-300">•</span>
        <span>Pa komisione</span>
      </div>
    </div>
  )
}
