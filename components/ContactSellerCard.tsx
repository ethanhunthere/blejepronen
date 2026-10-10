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
  Lock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useFavorites } from '@/lib/useFavorites'
import { normalizePhoneNumber, formatPhoneDisplay } from '@/lib/phone'
import { toast } from 'sonner'
import SocialLinksBar from '@/components/SocialIcons'
import { type SocialLinks, hasAnySocial } from '@/lib/socials'
import { trackListingLead } from '@/lib/analytics'
import FollowButton from '@/components/FollowButton'
import {
  deriveTrustSignals,
  shouldShowBadge,
  trustLabel,
  type TrustSignals,
} from '@/lib/verification'

interface SellerInfo {
  firstName: string
  lastName: string
  avatarUrl: string | null
  emailVerified: boolean
  userId: string
  socials?: SocialLinks | null
  followersCount?: number
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
  /** Server-derived trust signals (from deriveTrustSignals). Optional so older
   *  callers degrade to a weak derivation computed from seller props only. */
  trust?: TrustSignals
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
  trust,
  className,
}: ContactSellerCardProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loginUrl, setLoginUrl] = useState(`/login`)
  const [copied, setCopied] = useState(false)
  const [resolvedPhone, setResolvedPhone] = useState<string | null>(null)
  const { favoriteIds, toggleFavorite } = useFavorites()

  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) {
        setIsLoggedIn(true)
        setCurrentUserId(session.user.id)
        // Contact details are never server-rendered: resolve after login.
        fetch(`/api/contact?listingId=${encodeURIComponent(listingId)}`, {
          credentials: 'same-origin',
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((json: { phone?: string | null } | null) => {
            setResolvedPhone(json?.phone ?? null)
          })
          .catch(() => setResolvedPhone(null))
      } else {
        setIsLoggedIn(false)
        setResolvedPhone(null)
      }
    })
    setLoginUrl(`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`)
    return () => {
      mounted = false
    }
  }, [listingId])

  const rawPhone = resolvedPhone || ''
  const cleanPhone = rawPhone ? normalizePhoneNumber(rawPhone).replace(/\D/g, '') : ''
  const displayPhone = rawPhone ? formatPhoneDisplay(rawPhone) : ''

  const waGreeting = encodeURIComponent(
    `Përshëndetje! Po ju kontaktoj nga BlejePronën lidhur me pronën tuaj: "${listingTitle || 'Pronë'}"${listingCity ? ` në ${listingCity}` : ''} (https://blejepronen.com/listings/${listingId}). A është ende e lirë?`
  )
  const whatsAppUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waGreeting}` : '#'

  const isOwnListing = currentUserId === seller.userId
  const isFav = isLoggedIn && favoriteIds.includes(listingId)

  // Badges may ONLY come from deriveTrustSignals() (lib/verification).
  const trustSignals =
    trust ??
    deriveTrustSignals({
      email_verified: seller.emailVerified,
      phone: resolvedPhone,
    })
  const showTrustBadge = shouldShowBadge(trustSignals)

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
    let url = typeof window !== 'undefined' ? window.location.href : `https://blejepronen.com/listings/${listingId}`
    try {
      const parsed = new URL(url)
      parsed.searchParams.delete('fbclid')
      parsed.searchParams.delete('ref')
      url = parsed.toString()
    } catch {}

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${listingTitle || 'Pronë'} | Bleje Pronën`,
          text: `Shiko këtë pronë në ${listingCity || 'Kosovë'}: ${listingTitle || ''} (${price})`,
          url,
        })
        return
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') {
          return
        }
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
      className={`bg-white border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] rounded-2xl p-6 transition-all scroll-mt-24 ${className || ''}`}
    >
      {/* Price Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Çmimi i kërkuar
          </span>
          <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
            {type === 'shitje' ? 'Shitje direkte' : 'Qira mujore'}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-3xl xl:text-4xl font-extrabold text-slate-900 tracking-tight">
            {price}
          </span>
          {type === 'qira' && (
            <span className="text-sm font-medium text-slate-500">/muaj</span>
          )}
        </div>

        {pricePerSqm && (
          <p className="text-xs font-medium text-slate-500 mt-1">
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
          className={`h-10 flex items-center justify-center gap-1.5 rounded-xl border text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95 ${
            isFav
              ? 'border-red-200 bg-red-50 text-red-600'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
          aria-label={isFav ? 'E ruajtur' : 'Ruaj pronën'}
        >
          <Heart className={`h-3.5 w-3.5 ${isFav ? 'text-red-500 fill-red-500' : 'text-slate-500'}`} />
          <span>{isFav ? 'E ruajtur' : 'Ruaj pronën'}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="h-10 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95"
          aria-label="Ndaj me dikë"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-medium">U kopjua</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5 text-slate-500" />
              <span>Ndaj me mik</span>
            </>
          )}
        </button>
      </div>

      <div className="border-t border-slate-100 pt-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Informacioni i Shitësit
          </span>
          {showTrustBadge && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700"
              title="Sinjal besimi i derivuar nga lib/verification"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              {trustLabel(trustSignals)}
            </span>
          )}
        </div>

        {/* Seller Info Row */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 border border-slate-200">
              <Image
                src={seller.avatarUrl || '/avatars/avatar-1.png'}
                alt={seller.firstName || 'Shitësi'}
                fill
                sizes="44px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 text-sm truncate">
                {seller.firstName} {seller.lastName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <a
                  href={`/profili/${seller.userId}`}
                  className="text-[11px] font-medium text-[#00675B] hover:underline inline-flex items-center gap-1"
                >
                  Shiko profilin <ExternalLink className="h-2.5 w-2.5" />
                </a>
                {typeof seller.followersCount === 'number' && seller.followersCount > 0 && (
                  <>
                    <span className="text-slate-300 text-[10px]">•</span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {seller.followersCount} ndiqës
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <FollowButton
              targetUserId={seller.userId}
              targetUserName={seller.firstName}
              initialFollowersCount={seller.followersCount}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Primary Conversion CTAs */}
      <div className="space-y-2.5">
        {!isLoggedIn ? (
          <a
            href={loginUrl}
            className="w-full min-h-[44px] bg-[#00675B] hover:bg-[#004D43] text-white py-2.5 px-4 rounded-xl font-semibold text-sm shadow-xs active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="h-4 w-4" />
            <span>Kyçu për të parë kontaktin</span>
          </a>
        ) : cleanPhone ? (
          <>
            {/* WhatsApp */}
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void trackListingLead(listingId)}
              className="w-full min-h-[44px] bg-[#25D366] hover:bg-[#20ba59] text-white py-2.5 px-4 rounded-xl font-semibold text-sm shadow-xs active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="h-4 w-4 fill-white" />
              <span>Shkruaj në WhatsApp</span>
            </a>

            {/* Direct Phone Call */}
            <a
              href={`tel:${normalizePhoneNumber(rawPhone)}`}
              onClick={() => void trackListingLead(listingId)}
              className="w-full min-h-[44px] bg-[#00675B] hover:bg-[#004D43] text-white py-2.5 px-4 rounded-xl font-semibold text-sm shadow-xs active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Phone className="h-4 w-4" />
              <span>Telefono ({displayPhone})</span>
            </a>
          </>
        ) : (
          <p className="text-xs text-slate-500 text-center py-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
            Shitësi nuk ka specifikuar numër telefoni.
          </p>
        )}

        {/* Platform Direct Messaging */}
        {isLoggedIn ? (
          !isOwnListing && (
            <button
              type="button"
              onClick={handleMessage}
              className="w-full min-h-[40px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 px-4 rounded-xl font-medium text-xs transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <MessagesSquare className="h-4 w-4 text-[#00675B]" />
              <span>Dërgo Mesazh në Platformë</span>
            </button>
          )
        ) : (
          <div className="pt-1">
            <a
              href={loginUrl}
              className="w-full min-h-[38px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessagesSquare className="h-3.5 w-3.5 text-slate-400" />
              <span>Hyr për të dërguar mesazh</span>
            </a>
          </div>
        )}
      </div>

      {/* Seller Socials */}
      {hasAnySocial(socials || seller.socials) && (
        <div className="mt-4 pt-3.5 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Rrjetet Sociale të Shitësit
          </p>
          <SocialLinksBar socials={socials || seller.socials} variant="pills" />
        </div>
      )}

      {/* Trust & Transparency Guarantee */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-emerald-600" />
          <span>Komunikim i sigurt</span>
        </div>
        <span className="text-slate-300">•</span>
        <span>0% Provizion Platforme</span>
      </div>
    </div>
  )
}
