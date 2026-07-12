import { createPublicSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import {
  MapPin,
  BedDouble,
  Maximize2,
  Building2,
  Home,
  Sparkles,
  CalendarDays,
  ChevronLeft,
} from 'lucide-react'
import ListingImageGallery from '@/components/ListingImageGallery'
import ExpandableText from '@/components/ExpandableText'
import ContactSellerCard from '@/components/ContactSellerCard'
import MobileContactBar from '@/components/MobileContactBar'
import ListingCard, { ListingCardSkeleton } from '@/components/ListingCard'

export const revalidate = 300

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

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

interface ListingMetadata {
  title: string
  description: string | null
  price: number
  city: string
  images: string[] | null
}

// ---- Data fetchers ----

async function getListingMetadata(id: string): Promise<ListingMetadata | null> {
  const supabase = createPublicSupabaseClient()
  const { data, error } = await supabase
    .from('listings')
    .select('title,description,price,city,images')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data as unknown as ListingMetadata
}

async function getListing(id: string) {
  const supabase = await createAdminSupabaseClient()
  return supabase
    .from('listings')
    .select(
      'id,title,description,price,city,neighborhood,address,rooms,area_m2,type,condition,floor,apartment_type,features,images,is_active,is_featured,created_at,user_id,updated_at,free_trial_until,profiles(first_name,last_name,phone,avatar_url,email_verified)'
    )
    .eq('id', id)
    .eq('is_active', true)
    .single()
}

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
    .limit(4)

  return (data as Listing[]) || []
}

// ---- Static generation ----

export async function generateStaticParams() {
  const supabase = createPublicSupabaseClient()
  const { data } = await supabase
    .from('listings')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(20)

  return (data || []).map(listing => ({ id: listing.id }))
}

export async function generateMetadata({
  params,
}: ListingDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const listing = await getListingMetadata(id)

  if (!listing) {
    return { title: 'Listim | Bleje Banesën' }
  }

  return {
    title: `${listing.title} – ${listing.city} | Bleje Banesën`,
    description: listing.description?.slice(0, 155),
    openGraph: {
      title: listing.title,
      description: listing.description?.slice(0, 155),
      images: listing.images?.[0]
        ? [{ url: listing.images[0], width: 1200, height: 630 }]
        : [],
    },
  }
}

// ---- Helpers ----

const conditionLabels: Record<string, string> = {
  'e-re': 'E re',
  'e-vjeter': 'E vjetër',
  rinovuar: 'E rinovuar',
  'ka-nevojë-për-rinovim': 'Ka nevojë për rinovim',
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <div className="h-8 w-64 animate-pulse rounded bg-gray-100 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
  const { data, error } = await getListing(id)

  if (error) {
    if (error.code === 'PGRST116') notFound()
    console.error('Supabase query error:', error.code, error.message)
    throw new Error(`Failed to load listing: ${error.message}`)
  }

  const listing = (data as unknown as ListingWithProfile | null) ?? null
  if (!listing) notFound()

  const priceStr = formatPrice(listing.price)
  const pricePerSqm =
    listing.area_m2 > 0 && listing.type === 'shitje'
      ? formatPrice(Math.round(listing.price / listing.area_m2))
      : null

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
    <div className="min-h-screen bg-[#F5F7FA] pb-20 lg:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ====== BACK + BREADCRUMB ====== */}
      <div className="max-w-7xl 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <Link
          href="/listings"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-[#1A1A2E] transition-colors duration-200 text-sm font-medium group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
          Kthehu te Banesat
        </Link>
        <p className="text-gray-300 text-xs mt-1">
          Ballina / Banesat / {listing.city}
        </p>
      </div>

      {/* ====== PHOTO HERO ====== */}
      <div className="max-w-7xl 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        <ListingImageGallery
          images={listing.images || []}
          title={listing.title}
          type={listing.type}
          featured={listing.is_featured}
        />
      </div>

      {/* ====== MAIN CONTENT + SIDEBAR ====== */}
      <div className="max-w-7xl 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-10">
          {/* ---- Left column ---- */}
          <div className="space-y-8 min-w-0">
            {/* TITLE + LOCATION */}
            <section>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-2xl md:text-3xl font-black text-[#1A1A2E] tracking-tight leading-tight">
                  {listing.title}
                </h1>
                <span className="inline-flex bg-[#1B4FFF]/20 text-[#1B4FFF] border border-[#1B4FFF]/30 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap">
                  {listing.type === 'shitje' ? 'Shitje' : 'Me qira'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mt-2">
                <MapPin className="h-4 w-4 text-[#1B4FFF] flex-shrink-0" />
                <span>
                  {[listing.city, listing.neighborhood, listing.address]
                    .filter(Boolean)
                    .join(' › ')}
                </span>
              </div>
              <p className="text-gray-300 text-xs mt-1">
                Postuar {getRelativeTime(listing.created_at)}
              </p>
            </section>

            {/* STATS BAR */}
            <section>
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4">
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center hover:bg-gray-100 transition-colors">
                    <BedDouble className="h-5 w-5 mx-auto mb-1.5 text-[#1B4FFF]" />
                    <p className="text-[#1A1A2E] font-bold text-base">{listing.rooms}</p>
                    <p className="text-gray-400 text-xs mt-0.5 uppercase tracking-wide">Dhoma</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center hover:bg-gray-100 transition-colors">
                    <Maximize2 className="h-5 w-5 mx-auto mb-1.5 text-[#1B4FFF]" />
                    <p className="text-[#1A1A2E] font-bold text-base">{listing.area_m2} m²</p>
                    <p className="text-gray-400 text-xs mt-0.5 uppercase tracking-wide">Sipërfaqja</p>
                  </div>
                  {listing.floor && (
                    <div className="bg-gray-50 rounded-xl p-3 text-center hover:bg-gray-100 transition-colors">
                      <Building2 className="h-5 w-5 mx-auto mb-1.5 text-[#1B4FFF]" />
                      <p className="text-[#1A1A2E] font-bold text-base">{listing.floor}</p>
                      <p className="text-gray-400 text-xs mt-0.5 uppercase tracking-wide">Kati</p>
                    </div>
                  )}
                  {listing.apartment_type && (
                    <div className="bg-gray-50 rounded-xl p-3 text-center hover:bg-gray-100 transition-colors">
                      <Home className="h-5 w-5 mx-auto mb-1.5 text-[#1B4FFF]" />
                      <p className="text-[#1A1A2E] font-bold text-base">{listing.apartment_type}</p>
                      <p className="text-gray-400 text-xs mt-0.5 uppercase tracking-wide">Tipologjia</p>
                    </div>
                  )}
                  {listing.condition && (
                    <div className="bg-gray-50 rounded-xl p-3 text-center hover:bg-gray-100 transition-colors">
                      <Sparkles className="h-5 w-5 mx-auto mb-1.5 text-[#1B4FFF]" />
                      <p className="text-[#1A1A2E] font-bold text-base">
                        {conditionLabels[listing.condition] || listing.condition}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5 uppercase tracking-wide">Gjendja</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile: price between stats and description */}
              <div className="mt-5 lg:hidden bg-white border border-gray-100 shadow-sm rounded-2xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Çmimi</p>
                <p className="text-2xl font-black text-[#1A1A2E]">
                  {priceStr}
                  {listing.type === 'qira' && (
                    <span className="text-sm font-normal text-gray-400">
                      /muaj
                    </span>
                  )}
                </p>
                {pricePerSqm && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    ≈ {pricePerSqm}/m²
                  </p>
                )}
              </div>
            </section>

            {/* DESCRIPTION */}
            {listing.description && (
              <section>
                <h2 className="text-lg font-bold text-[#1A1A2E] border-b border-gray-100 pb-3 mb-4">
                  Përshkrimi
                </h2>
                <ExpandableText text={listing.description} maxLength={350} />
              </section>
            )}

            {/* FEATURES */}
            {listing.features && listing.features.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-[#1A1A2E] border-b border-gray-100 pb-3 mb-4">
                  Karakteristikat
                </h2>
                <div className="flex flex-wrap gap-2">
                  {listing.features.map(feature => (
                    <span
                      key={feature}
                      className="inline-flex items-center gap-1.5 bg-[#1B4FFF]/8 border border-[#1B4FFF]/20 text-[#1B4FFF] hover:bg-[#1B4FFF]/15 rounded-full px-4 py-2 text-sm transition-all duration-200"
                    >
                      <span className="text-base">{featureIcon(feature)}</span>
                      {feature}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* LOCATION */}
            <section>
              <h2 className="text-lg font-bold text-[#1A1A2E] border-b border-gray-100 pb-3 mb-4">
                Vendndodhja
              </h2>
              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1B4FFF]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="h-5 w-5 text-[#1B4FFF]" />
                  </div>
                  <div>
                    <p className="text-[#1A1A2E] font-semibold">
                      {listing.city}
                    </p>
                    {listing.neighborhood && (
                      <p className="text-gray-600 text-sm">{listing.neighborhood}</p>
                    )}
                    {listing.address && (
                      <p className="text-gray-600 text-sm">Rruga {listing.address}</p>
                    )}
                    <p className="text-gray-400 text-xs mt-1">Kosovë</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* ---- Desktop sidebar ---- */}
          <aside className="hidden lg:block">
            <ContactSellerCard
              price={priceStr}
              pricePerSqm={pricePerSqm}
              type={listing.type}
              seller={{
                firstName: listing.profiles?.first_name || '',
                lastName: listing.profiles?.last_name || '',
                phone: listing.profiles?.phone || null,
                avatarUrl: listing.profiles?.avatar_url || null,
                emailVerified: listing.profiles?.email_verified || false,
                userId: listing.user_id,
              }}
              listingId={listing.id}
            />
          </aside>
        </div>
      </div>

      {/* ====== DIVIDER ====== */}
      <div className="max-w-7xl 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        <hr className="border-gray-100" />
      </div>

      {/* ====== SIMILAR LISTINGS ====== */}
      <div className="max-w-7xl 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <h2 className="text-xl md:text-2xl font-bold text-[#1A1A2E] border-l-4 border-[#1B4FFF] pl-3 mb-2">
          Banesa të ngjashme
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Banesa të tjera në {listing.city}
        </p>
        <Suspense fallback={<SimilarListingsSkeleton />}>
          <SimilarListingsSection city={listing.city} excludeId={listing.id} />
        </Suspense>
      </div>

      {/* ====== MOBILE CONTACT BAR ====== */}
      <MobileContactBar
        price={priceStr}
        pricePerSqm={pricePerSqm}
      />
    </div>
  )
}
