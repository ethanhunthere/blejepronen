import { createPublicSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cache, Suspense } from 'react'
import {
  MapPin,
  BedDouble,
  Maximize2,
  Building2,
  Home,
  Sparkles,
  ChevronLeft,
  Phone,
  MessageCircle,
  MessagesSquare,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  FileCheck,
} from 'lucide-react'
import ListingImageGallery from '@/components/ListingImageGallery'
import ExpandableText from '@/components/ExpandableText'
import ContactSellerCard from '@/components/ContactSellerCard'
import MobileContactBar from '@/components/MobileContactBar'
import ListingHeaderActions from '@/components/ListingHeaderActions'
import ListingCard, { ListingCardSkeleton } from '@/components/ListingCard'
import { normalizePhoneNumber } from '@/lib/phone'
import SocialLinksBar from '@/components/SocialIcons'
import { type SocialLinks, hasAnySocial } from '@/lib/socials'

export const revalidate = 300

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blejepronen.com'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('sq-AL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('sq-AL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

function getRelativeTime(date: string): string {
  const now = Date.now()
  const posted = new Date(date).getTime()
  const diffMs = now - posted
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Tani'
  if (diffMins < 60) return `${diffMins} minuta më parë`
  if (diffHours < 24) return `${diffHours} orë më parë`
  if (diffDays === 1) return 'Dje'
  if (diffDays < 30) return `${diffDays} ditë më parë`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} muaj më parë`
  return formatDate(date)
}

const FEATURE_ICONS: Record<string, string> = {
  parking: '🚗',
  ashensor: '🛗',
  ballkon: '🌅',
  oxhak: '🔥',
  magazine: '📦',
  siguri: '🔒',
  kondicioner: '❄️',
  ngrohje: '🌡️',
  intercom: '📞',
  kamera: '📹',
  katiperdhe: '🏠',
  mobiluar: '🪑',
  pamje: '🏔️',
  'ujë': '💧',
  'rrymë': '⚡',
  'internet': '🌐',
  'tv-kabllor': '📺',
  'depo': '📦',
  'oborr': '🌳',
  'tarracë': '🏖️',
  'bodrum': '🏚️',
  'papafingo': '🏠',
}

interface ListingDetailPageProps {
  params: Promise<{ id: string }>
}

interface ListingWithProfile extends Listing {
  profiles: {
    first_name: string
    last_name: string
    phone: string | null
    avatar_url: string | null
    email_verified?: boolean
  } | null
}

// ---- Data fetchers ----

const getListing = cache(async (id: string) => {
  const supabase = await createAdminSupabaseClient()
  return supabase
    .from('listings')
    .select(
      'id,title,description,price,city,neighborhood,address,rooms,area_m2,type,condition,floor,apartment_type,features,images,is_active,is_featured,created_at,user_id,updated_at,free_trial_until,profiles(first_name,last_name,phone,avatar_url,email_verified)'
    )
    .eq('id', id)
    .eq('is_active', true)
    .single()
})

const getSellerData = cache(async (userId: string) => {
  try {
    const supabase = await createAdminSupabaseClient()
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    const meta = userData?.user?.user_metadata || {}
    const socials: SocialLinks = {
      instagram: meta.instagram || null,
      facebook: meta.facebook || null,
      whatsapp: meta.whatsapp || null,
      tiktok: meta.tiktok || null,
    }
    return {
      socials,
      isCompany: meta.account_type === 'company' || Boolean(meta.company_name),
      companyDescription: meta.company_description || null,
    }
  } catch (err) {
    console.error('Failed to get seller data:', err)
    return { socials: {}, isCompany: false, companyDescription: null }
  }
})

async function getSimilarListings(
  city: string,
  excludeId: string
): Promise<Listing[]> {
  const supabase = createPublicSupabaseClient()
  const { data } = await supabase
    .from('listings')
    .select(
      'id,title,price,city,address,rooms,area_m2,type,images,is_featured'
    )
    .eq('city', city)
    .eq('is_active', true)
    .neq('id', excludeId)
    .order('created_at', { ascending: false })
    .limit(3)

  return (data as Listing[]) || []
}

// ---- Static generation ----

export async function generateStaticParams() {
  try {
    const supabase = createPublicSupabaseClient()
    const { data } = await supabase
      .from('listings')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50)

    return (data || []).map(listing => ({ id: listing.id }))
  } catch (err) {
    console.error('generateStaticParams notice:', err)
    return []
  }
}

export async function generateMetadata({
  params,
}: ListingDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const { data: listing } = await getListing(id)

  if (!listing) {
    return { title: 'Prona | Bleje Pronën' }
  }

  const priceFormatted = formatPrice(listing.price)
  const metaTitle = `${listing.title} — ${priceFormatted} në ${listing.city} | Bleje Pronën`
  const metaDesc =
    listing.description?.slice(0, 160) ||
    `${listing.title} në ${listing.city}. ${listing.rooms} dhoma, ${listing.area_m2} m². Shiko çmimin dhe kontakto shitësin direkt në BlejePronën.`

  return {
    title: metaTitle,
    description: metaDesc,
    openGraph: {
      title: metaTitle,
      description: metaDesc,
      images: listing.images?.[0]
        ? [{ url: listing.images[0], width: 1200, height: 630, alt: listing.title }]
        : [],
    },
  }
}

// ---- Helpers ----

const conditionLabels: Record<string, string> = {
  'e-re': 'E re (E papërdorur)',
  'e-vjeter': 'E vjetër',
  rinovuar: 'E rinovuar',
  'ka-nevojë-për-rinovim': 'Ka nevojë për renovim',
}

function featureIcon(feature: string): string {
  const key = feature
    .toLowerCase()
    .replace(/ë/g, 'e')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, '')
  return FEATURE_ICONS[key] || '🏷️'
}

// ---- Streaming sub-components ----

async function SimilarListingsSection({
  city,
  excludeId,
}: {
  city: string
  excludeId: string
}) {
  const listings = await getSimilarListings(city, excludeId)

  if (!listings || listings.length === 0) return null

  return (
    <section>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {listings.map(l => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </section>
  )
}

function SimilarListingsSkeleton() {
  return (
    <section>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </section>
  )
}

// ---- Page ----

export default async function ListingDetailPage({
  params,
}: ListingDetailPageProps) {
  const { id } = await params
  let data = null
  try {
    const res = await getListing(id)
    if (res.error) {
      console.warn('Listing fetch notice:', res.error.code, res.error.message)
      notFound()
    }
    data = res.data
  } catch (err) {
    console.warn('Failed to load listing details:', err)
    notFound()
  }

  const listing = (data as unknown as ListingWithProfile | null) ?? null
  if (!listing) notFound()

  const sellerData = await getSellerData(listing.user_id)
  const effectiveSocials: SocialLinks = {
    ...sellerData.socials,
    whatsapp: sellerData.socials?.whatsapp || (listing.profiles?.phone ? listing.profiles.phone : null),
  }

  const priceStr = formatPrice(listing.price)
  const pricePerSqm =
    listing.area_m2 > 0 && listing.type === 'shitje'
      ? formatPrice(Math.round(listing.price / listing.area_m2))
      : null

  const sellerPhone = listing.profiles?.phone || null
  const cleanPhone = sellerPhone ? normalizePhoneNumber(sellerPhone).replace(/\D/g, '') : ''
  const waGreeting = encodeURIComponent(
    `Përshëndetje! Po ju kontaktoj nga BlejePronën lidhur me pronën: "${listing.title}" në ${listing.city} (${siteUrl}/listings/${listing.id}). A është ende e lirë?`
  )
  const sellerWhatsAppUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waGreeting}` : null

  const googleMapsQuery = encodeURIComponent(
    [listing.address, listing.neighborhood, listing.city, 'Kosovo'].filter(Boolean).join(', ')
  )
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${googleMapsQuery}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.title,
    description: listing.description,
    url: `${siteUrl}/listings/${listing.id}`,
    price: listing.price,
    priceCurrency: 'EUR',
    image: listing.images?.[0] || '',
    address: {
      '@type': 'PostalAddress',
      addressLocality: listing.city,
      addressCountry: 'XK',
      streetAddress: listing.address,
    },
    numberOfRooms: listing.rooms,
    floorSize: {
      '@type': 'QuantitativeValue',
      value: listing.area_m2,
      unitCode: 'MTK',
    },
  }

  return (
    <div className="min-h-screen bg-[#F2F7F7] pb-28 lg:pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ====== HEADER NAVIGATION & QUICK ACTIONS ====== */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-500 overflow-hidden truncate">
            <Link
              href="/listings"
              className="inline-flex items-center gap-1 text-gray-600 hover:text-[#101828] transition-colors shrink-0 group"
            >
              <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Pronat</span>
            </Link>
            <span className="text-gray-300">/</span>
            <Link
              href={`/listings?city=${encodeURIComponent(listing.city)}`}
              className="hover:text-[#101828] transition-colors shrink-0 text-gray-600"
            >
              {listing.city}
            </Link>
            {listing.neighborhood && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-gray-400 truncate max-w-[120px] sm:max-w-[200px]">
                  {listing.neighborhood}
                </span>
              </>
            )}
          </nav>

          {/* Share & Save Actions */}
          <div className="shrink-0">
            <ListingHeaderActions
              listingId={listing.id}
              title={listing.title}
              price={priceStr}
              city={listing.city}
            />
          </div>
        </div>
      </div>

      {/* ====== PHOTO HERO (COMPACT & BALANCED) ====== */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ListingImageGallery
          images={listing.images || []}
          title={listing.title}
          type={listing.type}
          featured={listing.is_featured}
        />
      </div>

      {/* ====== MAIN 2-COLUMN ARCHITECTURE ====== */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px] lg:gap-8 items-start">
          {/* ---- Left Column: Specs, Features, Description, Location ---- */}
          <div className="space-y-6 min-w-0">
            
            {/* 1. CORE PROPERTY HEADLINE & LOCATION */}
            <div className="bg-white border border-gray-100/90 shadow-2xs rounded-3xl p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                    listing.type === 'shitje'
                      ? 'bg-[#006459] text-white shadow-2xs'
                      : 'bg-indigo-600 text-white shadow-2xs'
                  }`}
                >
                  {listing.type === 'shitje' ? 'Në Shitje' : 'Me Qira'}
                </span>

                {listing.is_featured && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    <Sparkles className="h-3 w-3 text-amber-600 fill-amber-600" />
                    E Veçuar
                  </span>
                )}

                <span className="text-[11px] text-gray-600 font-mono ml-auto">
                  ID: #{listing.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#101828] tracking-tight leading-snug sm:leading-tight">
                {listing.title}
              </h1>

              <div className="flex items-center justify-between flex-wrap gap-2 mt-3 pt-3 border-t border-gray-50 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#006459] shrink-0" />
                  <span className="font-semibold text-gray-800">
                    {[listing.city, listing.neighborhood, listing.address].filter(Boolean).join(', ')}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-600 ml-auto">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{getRelativeTime(listing.created_at)}</span>
                </div>
              </div>
            </div>

            {/* 2. INSTANT SPECS BENTO (All critical specs visible in 1 glance!) */}
            <div className="bg-white border border-gray-100/90 shadow-2xs rounded-3xl p-5 sm:p-7">
              <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4">
                Specifikat Kryesore
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Rooms */}
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 transition-all hover:bg-white hover:shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-[#006459]/10 text-[#006459] flex items-center justify-center shrink-0">
                    <BedDouble className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">Dhoma</p>
                    <p className="text-sm sm:text-base font-bold text-[#101828] truncate">
                      {listing.rooms} {listing.rooms === 1 ? 'dhomë' : 'dhoma'}
                    </p>
                  </div>
                </div>

                {/* Area m² */}
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 transition-all hover:bg-white hover:shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-[#006459]/10 text-[#006459] flex items-center justify-center shrink-0">
                    <Maximize2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">Sipërfaqja</p>
                    <p className="text-sm sm:text-base font-bold text-[#101828] truncate">
                      {listing.area_m2} m²
                    </p>
                    {pricePerSqm && (
                      <p className="text-[10px] text-gray-600 font-medium">{pricePerSqm}/m²</p>
                    )}
                  </div>
                </div>

                {/* Floor */}
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 transition-all hover:bg-white hover:shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-[#006459]/10 text-[#006459] flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">Kati</p>
                    <p className="text-sm sm:text-base font-bold text-[#101828] truncate">
                      {listing.floor ? `Kati ${listing.floor}` : 'Përdhesë'}
                    </p>
                  </div>
                </div>

                {/* Condition */}
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 transition-all hover:bg-white hover:shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-[#006459]/10 text-[#006459] flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">Gjendja</p>
                    <p className="text-sm sm:text-base font-bold text-[#101828] truncate">
                      {(listing.condition && conditionLabels[listing.condition]) || listing.condition || 'E gatshme'}
                    </p>
                  </div>
                </div>

                {/* Type / Category */}
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 transition-all hover:bg-white hover:shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-[#006459]/10 text-[#006459] flex items-center justify-center shrink-0">
                    <Home className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">Struktura</p>
                    <p className="text-sm sm:text-base font-bold text-[#101828] truncate">
                      {listing.apartment_type || 'Rezidenciale'}
                    </p>
                  </div>
                </div>

                {/* Verification */}
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 transition-all hover:bg-white hover:shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">Statusi</p>
                    <p className="text-sm sm:text-base font-bold text-emerald-700 truncate">
                      E Verifikuar
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. MOBILE FAST CONTACT ROW (Right after specs for instant conversion!) */}
            <div className="lg:hidden bg-white border border-gray-100/90 shadow-2xs rounded-3xl p-5">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Çmimi</p>
                  <p className="text-2xl sm:text-3xl font-black text-[#101828]">
                    {priceStr}
                    {listing.type === 'qira' && (
                      <span className="text-sm font-semibold text-gray-500 ml-1">/muaj</span>
                    )}
                  </p>
                </div>
                {pricePerSqm && (
                  <span className="text-xs font-bold text-[#006459] bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                    {pricePerSqm}/m²
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {sellerWhatsAppUrl && (
                  <a
                    href={sellerWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-11 flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-white font-bold text-sm shadow-sm active:scale-95 transition-all"
                  >
                    <MessageCircle className="h-4 w-4 fill-white" />
                    <span>WhatsApp</span>
                  </a>
                )}

                {sellerPhone ? (
                  <a
                    href={`tel:${sellerPhone}`}
                    className="h-11 flex items-center justify-center gap-2 rounded-2xl bg-[#006459] text-white font-bold text-sm shadow-sm active:scale-95 transition-all"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Telefono</span>
                  </a>
                ) : (
                  <span className="h-11 flex items-center justify-center text-xs text-gray-600 bg-gray-50 rounded-2xl border border-gray-100">
                    Pa telefon
                  </span>
                )}
              </div>

              {/* Direct messaging CTA on mobile */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <a
                  href={`/register?next=${encodeURIComponent(`/listings/${listing.id}`)}`}
                  className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-xs border border-gray-200 transition-colors"
                >
                  <MessagesSquare className="h-3.5 w-3.5 text-[#006459]" />
                  <span>Dërgo mesazh në platformë</span>
                </a>
              </div>
            </div>

            {/* 4. DESCRIPTION (With clean progressive disclosure) */}
            {listing.description && (
              <div className="bg-white border border-gray-100/90 shadow-2xs rounded-3xl p-5 sm:p-7">
                <h2 className="text-base sm:text-lg font-bold text-[#101828] mb-3">
                  Përshkrimi i Pronës
                </h2>
                <ExpandableText text={listing.description} maxLength={380} />
              </div>
            )}

            {/* 5. FEATURES & AMENITIES */}
            {listing.features && listing.features.length > 0 && (
              <div className="bg-white border border-gray-100/90 shadow-2xs rounded-3xl p-5 sm:p-7">
                <h2 className="text-base sm:text-lg font-bold text-[#101828] mb-3.5">
                  Karakteristikat & Pajisjet
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {listing.features.map(feature => (
                    <div
                      key={feature}
                      className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50/80 border border-gray-100 text-xs sm:text-sm font-semibold text-gray-800 transition-colors hover:bg-white hover:border-gray-200"
                    >
                      <span className="text-lg shrink-0">{featureIcon(feature)}</span>
                      <span className="truncate">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. LOCATION & MAP ACCORD */}
            <div className="bg-white border border-gray-100/90 shadow-2xs rounded-3xl p-5 sm:p-7">
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-base sm:text-lg font-bold text-[#101828]">
                  Vendndodhja
                </h2>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006459] hover:underline"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#006459]/10 text-[#006459] flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">
                    {listing.city} {listing.neighborhood ? `— ${listing.neighborhood}` : ''}
                  </p>
                  {listing.address && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      Rruga / Adresa: {listing.address}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-600 mt-1">
                    Republika e Kosovës
                  </p>
                </div>
              </div>
            </div>

            {/* 7. TRUST & SAFETY NOTICE (Apple/Airbnb high-trust banner) */}
            <div className="bg-gradient-to-br from-[#006459]/5 via-white to-gray-50 border border-[#006459]/15 shadow-2xs rounded-3xl p-5 sm:p-6">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#006459] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#101828]">
                    Siguria dhe Transparenca në BlejePronën
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Të gjitha njoftimet moderohen për të siguruar informacion të saktë. Ju kontaktoni drejtpërdrejt pronarin ose agjentin e autorizuar pa tarifa të fshehura nga platforma.
                  </p>
                  <div className="flex items-center gap-4 mt-2.5 text-[11px] font-semibold text-gray-700">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Kontakt Direkt
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      0% Komision Platforme
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 8. SELLER & SOCIALS CARD (Mobile view) */}
            <div className="block lg:hidden bg-white border border-gray-100/90 shadow-2xs rounded-3xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-base sm:text-lg font-bold text-[#101828]">
                  Informacioni i Shitësit
                </h2>
                {listing.profiles?.email_verified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    I verifikuar
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-gray-50/80 border border-gray-100 mb-3.5">
                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-[#006459]/10 border border-gray-200">
                  <Image
                    src={listing.profiles?.avatar_url || '/avatars/avatar-1.png'}
                    alt={listing.profiles?.first_name || 'Shitësi'}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#101828] text-sm truncate">
                    {listing.profiles?.first_name} {listing.profiles?.last_name}
                  </p>
                  <Link
                    href={`/profili/${listing.user_id}`}
                    className="text-xs font-semibold text-[#006459] hover:underline inline-flex items-center gap-1 mt-0.5"
                  >
                    Shiko profilin publik <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {hasAnySocial(effectiveSocials) && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Rrjetet Sociale të Shitësit
                  </p>
                  <SocialLinksBar socials={effectiveSocials} variant="pills" />
                </div>
              )}
            </div>

          </div>

          {/* ---- Right Column: Sticky Contact Sidebar (Desktop) ---- */}
          <aside className="hidden lg:block sticky top-20">
            <ContactSellerCard
              price={priceStr}
              pricePerSqm={pricePerSqm}
              type={listing.type}
              listingId={listing.id}
              listingTitle={listing.title}
              listingCity={listing.city}
              socials={effectiveSocials}
              seller={{
                firstName: listing.profiles?.first_name || '',
                lastName: listing.profiles?.last_name || '',
                phone: listing.profiles?.phone || null,
                avatarUrl: listing.profiles?.avatar_url || null,
                emailVerified: listing.profiles?.email_verified || false,
                userId: listing.user_id,
                socials: effectiveSocials,
              }}
            />
          </aside>
        </div>
      </div>

      {/* ====== SIMILAR PROPERTIES SECTION ====== */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <div className="border-t border-gray-200/70 pt-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#101828] tracking-tight">
                Prona të ngjashme në {listing.city}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Mundësi të tjera që mund t&apos;ju përshtaten
              </p>
            </div>
            <Link
              href={`/listings?city=${encodeURIComponent(listing.city)}`}
              className="text-xs sm:text-sm font-bold text-[#006459] hover:underline inline-flex items-center gap-1"
            >
              <span>Shiko të gjitha</span>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </Link>
          </div>
        </div>

        <Suspense fallback={<SimilarListingsSkeleton />}>
          <SimilarListingsSection city={listing.city} excludeId={listing.id} />
        </Suspense>
      </div>

      {/* ====== MOBILE DOCK CONTACT BAR ====== */}
      <MobileContactBar
        price={priceStr}
        pricePerSqm={pricePerSqm}
        phone={listing.profiles?.phone || null}
        listingId={listing.id}
        listingTitle={listing.title}
        listingCity={listing.city}
      />
    </div>
  )
}
