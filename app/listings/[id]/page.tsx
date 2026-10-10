import { createPublicSupabaseClient } from '@/lib/supabase'
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
  Star,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  FileCheck,
  Car,
  Sun,
  Flame,
  Package,
  Shield,
  Snowflake,
  Thermometer,
  Phone,
  Video,
  Armchair,
  Mountain,
  Droplets,
  Zap,
  Wifi,
  Tv,
  Trees,
  Warehouse,
  Check,
} from 'lucide-react'
import ListingImageGallery from '@/components/ListingImageGallery'
import ExpandableText from '@/components/ExpandableText'
import ContactSellerCard from '@/components/ContactSellerCard'
import MobileContactBar from '@/components/MobileContactBar'
import ListingHeaderActions from '@/components/ListingHeaderActions'
import ListingCard, { ListingCardSkeleton } from '@/components/ListingCard'
import SocialLinksBar from '@/components/SocialIcons'
import { type SocialLinks, hasAnySocial } from '@/lib/socials'
import MortgageCalculator from '@/components/MortgageCalculator'
import FollowButton from '@/components/FollowButton'
import { slugify } from '@/lib/seo-slugs'
import { fetchMarketStats } from '@/lib/listings-query'
import { ListingViewTracker } from '@/lib/analytics'
import {
  deriveTrustSignals,
  shouldShowBadge,
  trustLabel,
} from '@/lib/verification'

export const revalidate = 300

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blejepronen.com'

const formatPrice = (price?: number | null) => {
  if (price === undefined || price === null || isNaN(price) || price <= 0) {
    return 'Me marrëveshje'
  }
  return new Intl.NumberFormat('sq-AL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price)
}

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

function renderFeatureIcon(feature: string) {
  const key = feature
    .toLowerCase()
    .replace(/ë/g, 'e')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, '')

  const props = { className: 'h-4 w-4 text-[#00675B] shrink-0' }
  switch (key) {
    case 'parking': return <Car {...props} />
    case 'ashensor': return <Building2 {...props} />
    case 'ballkon': return <Sun {...props} />
    case 'oxhak': return <Flame {...props} />
    case 'magazine':
    case 'depo': return <Package {...props} />
    case 'siguri': return <Shield {...props} />
    case 'kondicioner': return <Snowflake {...props} />
    case 'ngrohje': return <Thermometer {...props} />
    case 'intercom': return <Phone {...props} />
    case 'kamera': return <Video {...props} />
    case 'katiperdhe':
    case 'papafingo': return <Home {...props} />
    case 'mobiluar': return <Armchair {...props} />
    case 'pamje': return <Mountain {...props} />
    case 'uje': return <Droplets {...props} />
    case 'rryme': return <Zap {...props} />
    case 'internet': return <Wifi {...props} />
    case 'tv-kabllor': return <Tv {...props} />
    case 'oborr': return <Trees {...props} />
    case 'tarrace': return <Sun {...props} />
    case 'bodrum': return <Warehouse {...props} />
    default: return <Check {...props} />
  }
}

interface ListingDetailPageProps {
  params: Promise<{ id: string }>
}

interface ListingWithProfile extends Listing {
  profiles: {
    first_name: string
    last_name: string
    avatar_url: string | null
    email_verified?: boolean
  } | null
}

// ---- Data fetchers ----

const getListing = cache(async (id: string) => {
  const supabase = createPublicSupabaseClient()
  return supabase
    .from('listings')
    .select(
      'id,title,description,price,city,neighborhood,address,rooms,area_m2,type,condition,floor,apartment_type,features,images,is_active,is_featured,created_at,user_id,updated_at,free_trial_until,profiles:profiles_public(first_name,last_name,avatar_url,email_verified)'
    )
    .eq('id', id)
    .eq('is_active', true)
    .single()
})

const getSellerData = cache(async (userId: string) => {
  try {
    const supabase = createPublicSupabaseClient()
    const [{ data: profileData }, { count: fCount }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    ])
    const prof = (profileData as Record<string, unknown>) || {}
    const socials: SocialLinks = {
      instagram: (prof.instagram as string) || null,
      facebook: (prof.facebook as string) || null,
      whatsapp: (prof.whatsapp as string) || null,
      tiktok: (prof.tiktok as string) || null,
    }
    const followersCount = typeof fCount === 'number' ? fCount : 0
    return {
      socials,
      isCompany: prof.account_type === 'company' || Boolean(prof.company_name),
      companyDescription: (prof.bio as string) || (prof.company_description as string) || null,
      followersCount,
      // Server-owned row → canonical trust derivation (single source of truth).
      trust: deriveTrustSignals({
        email_verified: typeof prof.email_verified === 'boolean' ? prof.email_verified : null,
        phone: (prof.phone as string) || null,
        created_at: (prof.created_at as string) || null,
        listings_count: typeof prof.listings_count === 'number' ? prof.listings_count : null,
      }),
    }
  } catch (err) {
    console.error('Failed to get seller data:', err)
    return {
      socials: {} as SocialLinks,
      isCompany: false,
      companyDescription: null,
      followersCount: 0,
      trust: deriveTrustSignals(null),
    }
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
  const canonicalUrl = `https://blejepronen.com/listings/${listing.id}`

  return {
    title: metaTitle,
    description: metaDesc,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: metaTitle,
      description: metaDesc,
      url: canonicalUrl,
      siteName: 'Bleje Pronën',
      locale: 'sq_AL',
      type: 'website',
      images: [
        {
          url: `${canonicalUrl}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: listing.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: metaDesc,
      images: [`${canonicalUrl}/opengraph-image`],
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
  const sellerTrust = sellerData.trust
  const showSellerBadge = shouldShowBadge(sellerTrust)
  const effectiveSocials: SocialLinks = {
    ...sellerData.socials,
    whatsapp: sellerData.socials?.whatsapp || null,
  }

  const priceStr = formatPrice(listing.price)
  const pricePerSqm =
    listing.area_m2 > 0 && listing.type === 'shitje'
      ? formatPrice(Math.round(listing.price / listing.area_m2))
      : null

  const googleMapsQuery = encodeURIComponent(
    [listing.address, listing.neighborhood, listing.city, 'Kosovo'].filter(Boolean).join(', ')
  )
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${googleMapsQuery}`

  const rawRecord = listing as unknown as Record<string, unknown>
  const lat = typeof rawRecord.latitude === 'number' ? rawRecord.latitude : null
  const lng = typeof rawRecord.longitude === 'number' ? rawRecord.longitude : null
  const pricePerSqmValue =
    listing.area_m2 > 0 && listing.type === 'shitje'
      ? Math.round(listing.price / listing.area_m2)
      : null

  // Market delta signal (€/m² vs city median) — computed server-side from
  // live inventory so the page stays a trustworthy, indexable money page.
  const marketStats =
    listing.type === 'shitje' && pricePerSqmValue ? await fetchMarketStats(listing.city) : null
  const marketDeltaPct =
    pricePerSqmValue && marketStats?.medianSalePpm2
      ? Math.round(((pricePerSqmValue - marketStats.medianSalePpm2) / marketStats.medianSalePpm2) * 100)
      : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'RealEstateListing',
        '@id': `${siteUrl}/listings/${listing.id}#listing`,
        name: listing.title,
        description: listing.description,
        url: `${siteUrl}/listings/${listing.id}`,
        image: listing.images?.[0] || '',
        datePosted: listing.created_at,
        dateModified: typeof rawRecord.updated_at === 'string' ? rawRecord.updated_at : listing.created_at,
        offers: {
          '@type': 'Offer',
          price: listing.price,
          priceCurrency: 'EUR',
          availability: listing.is_active
            ? 'https://schema.org/InStock'
            : 'https://schema.org/SoldOut',
          url: `${siteUrl}/listings/${listing.id}`,
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: listing.city,
          addressCountry: 'XK',
          streetAddress: listing.address,
        },
        ...(lat && lng
          ? { geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lng } }
          : {}),
        numberOfRooms: listing.rooms,
        floorSize: {
          '@type': 'QuantitativeValue',
          value: listing.area_m2,
          unitCode: 'MTK',
        },
        ...(pricePerSqmValue
          ? {
              additionalProperty: {
                '@type': 'PropertyValue',
                name: 'price_per_square_meter',
                value: pricePerSqmValue,
                unitText: 'EUR/MTK',
              },
            }
          : {}),
        ...(listing.profiles?.first_name
          ? {
              broker: {
                '@type': sellerData.isCompany ? 'RealEstateAgent' : 'Person',
                name: [listing.profiles.first_name, listing.profiles.last_name]
                  .filter(Boolean)
                  .join(' '),
                url: `${siteUrl}/profili/${listing.user_id}`,
              },
            }
          : {}),
        isPartOf: { '@type': 'WebSite', name: 'Bleje Pronën', url: siteUrl },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Kreu', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Pronat', item: `${siteUrl}/listings` },
          {
            '@type': 'ListItem',
            position: 3,
            name: listing.city,
            item: `${siteUrl}/pronat/${slugify(listing.city)}/${listing.type}`,
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: listing.title,
            item: `${siteUrl}/listings/${listing.id}`,
          },
        ],
      },
    ],
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 lg:pb-16">
      <ListingViewTracker listingId={listing.id} ownerId={listing.user_id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ====== HEADER NAVIGATION & BREADCRUMB ====== */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 overflow-hidden truncate">
            <Link
              href="/listings"
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors shrink-0 group"
            >
              <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Pronat</span>
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              href={`/listings?city=${encodeURIComponent(listing.city)}`}
              className="hover:text-slate-900 transition-colors shrink-0 text-slate-600"
            >
              {listing.city}
            </Link>
            {listing.neighborhood && (
              <>
                <span className="text-slate-300">/</span>
                <span className="text-slate-400 truncate max-w-[120px] sm:max-w-[200px]">
                  {listing.neighborhood}
                </span>
              </>
            )}
          </nav>

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

      {/* ====== PHOTO HERO ====== */}
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
          
          {/* ---- Left Column: Continuous Editorial Property Canvas ---- */}
          <div className="space-y-6 min-w-0">
            
            {/* Unified Property Card Container */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100">
              
              {/* Section 1: Title, Category, Location */}
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase ${
                      listing.type === 'shitje'
                        ? 'bg-[#00675B] text-white'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {listing.type === 'shitje' ? 'Në Shitje' : 'Me Qira'}
                  </span>

                  {listing.is_featured && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200/80">
                      <Star className="h-3 w-3 text-amber-600 fill-amber-600" />
                      E Veçuar
                    </span>
                  )}

                  <span className="text-xs text-slate-400 font-mono ml-auto">
                    ID: #{listing.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug sm:leading-tight">
                  {listing.title}
                </h1>

                <div className="flex items-center justify-between flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100 text-xs sm:text-sm text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#00675B] shrink-0" />
                    <span className="font-medium text-slate-800">
                      {[listing.city, listing.neighborhood, listing.address].filter(Boolean).join(', ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{getRelativeTime(listing.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Architectural Specs Grid */}
              <div className="p-6 sm:p-8">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Specifikat Kryesore
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Rooms */}
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200/80 text-[#00675B] flex items-center justify-center shrink-0 shadow-2xs">
                      <BedDouble className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Dhoma</p>
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {listing.rooms > 0 ? `${listing.rooms} dhoma` : (listing.apartment_type || 'Prona')}
                      </p>
                    </div>
                  </div>

                  {/* Area */}
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200/80 text-[#00675B] flex items-center justify-center shrink-0 shadow-2xs">
                      <Maximize2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Sipërfaqja</p>
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {listing.area_m2} m²
                      </p>
                      {pricePerSqm && (
                        <p className="text-[10px] text-slate-400 font-normal">{pricePerSqm}/m²</p>
                      )}
                      {marketDeltaPct !== null && (
                        <p
                          className={`text-[10px] font-semibold ${
                            marketDeltaPct > 0 ? 'text-amber-600' : 'text-[#00675B]'
                          }`}
                        >
                          {marketDeltaPct > 0 ? '+' : ''}
                          {marketDeltaPct}% vs mesatarja e {listing.city}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Floor */}
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200/80 text-[#00675B] flex items-center justify-center shrink-0 shadow-2xs">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Kati</p>
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {listing.floor ? `Kati ${listing.floor}` : 'Përdhesë'}
                      </p>
                    </div>
                  </div>

                  {/* Condition */}
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200/80 text-[#00675B] flex items-center justify-center shrink-0 shadow-2xs">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Gjendja</p>
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {(listing.condition && conditionLabels[listing.condition]) || listing.condition || 'E gatshme'}
                      </p>
                    </div>
                  </div>

                  {/* Structure */}
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200/80 text-[#00675B] flex items-center justify-center shrink-0 shadow-2xs">
                      <Home className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Struktura</p>
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {listing.apartment_type || 'Rezidenciale'}
                      </p>
                    </div>
                  </div>

                  {/* Verification status — badge only via deriveTrustSignals() */}
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        showSellerBadge
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60'
                          : 'bg-white text-[#00675B] border-slate-200/80'
                      }`}
                    >
                      {showSellerBadge ? (
                        <ShieldCheck className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Statusi</p>
                      <p
                        className={`text-sm font-semibold truncate ${
                          showSellerBadge ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {showSellerBadge ? trustLabel(sellerTrust) : 'E Publikuar'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Description */}
              {listing.description && (
                <div className="p-6 sm:p-8">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3">
                    Përshkrimi i Pronës
                  </h2>
                  <ExpandableText text={listing.description} maxLength={380} />
                </div>
              )}

              {/* Section 4: Features & Amenities */}
              {listing.features && listing.features.length > 0 && (
                <div className="p-6 sm:p-8">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4">
                    Karakteristikat & Pajisjet
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {listing.features.map(feature => (
                      <div
                        key={feature}
                        className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs sm:text-sm font-medium text-slate-700"
                      >
                        {renderFeatureIcon(feature)}
                        <span className="truncate">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 5: Location & Map */}
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-3.5">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Vendndodhja
                  </h2>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00675B] hover:underline"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200/80 text-[#00675B] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {listing.city} {listing.neighborhood ? `— ${listing.neighborhood}` : ''}
                    </p>
                    {listing.address && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Rruga / Adresa: {listing.address}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">
                      Republika e Kosovës
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 6: Mortgage Calculator */}
              {listing.type === 'shitje' && (
                <div className="p-6 sm:p-8">
                  <MortgageCalculator
                    propertyPrice={listing.price}
                    city={listing.city}
                  />
                </div>
              )}

              {/* Section 7: Mobile Seller Card */}
              <div id="seller-info" className="block lg:hidden p-6 sm:p-8 scroll-mt-24">
                <div className="flex items-center justify-between mb-3.5">
                  <h2 className="text-base font-bold text-slate-900">
                    Informacioni i Shitësit
                  </h2>
                  {showSellerBadge && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      {trustLabel(sellerTrust)}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 border border-slate-200">
                      <Image
                        src={listing.profiles?.avatar_url || '/avatars/avatar-1.png'}
                        alt={listing.profiles?.first_name || 'Shitësi'}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {listing.profiles?.first_name} {listing.profiles?.last_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Link
                          href={`/profili/${listing.user_id}`}
                          className="text-xs font-medium text-[#00675B] hover:underline inline-flex items-center gap-1"
                        >
                          Shiko profilin <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                        {sellerData.followersCount > 0 && (
                          <>
                            <span className="text-slate-300 text-[10px]">•</span>
                            <span className="text-[11px] font-medium text-slate-500">
                              {sellerData.followersCount} ndiqës
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <FollowButton
                      targetUserId={listing.user_id}
                      targetUserName={listing.profiles?.first_name || 'Shitësi'}
                      initialFollowersCount={sellerData.followersCount}
                      size="sm"
                    />
                  </div>
                </div>

                {hasAnySocial(effectiveSocials) && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Rrjetet Sociale të Shitësit
                    </p>
                    <SocialLinksBar socials={effectiveSocials} variant="pills" />
                  </div>
                )}
              </div>

              {/* Section 8: Trust & Safety Guarantee */}
              <div className="p-6 sm:p-8 bg-slate-50/50">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#00675B] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Siguria dhe Transparenca në BlejePronën
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Të gjitha njoftimet moderohen për të siguruar informacion të saktë. Ju kontaktoni drejtpërdrejt pronarin ose agjentin e autorizuar pa tarifa të fshehura nga platforma.
                    </p>
                    <div className="flex items-center gap-4 mt-2.5 text-[11px] font-medium text-slate-600">
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

            </div>

          </div>

          {/* ---- Right Column: Sticky Contact Sidebar (Desktop) ---- */}
          <aside className="hidden lg:block sticky top-20 max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain scroll-mt-24">
            <ContactSellerCard
              price={priceStr}
              pricePerSqm={pricePerSqm}
              type={listing.type}
              listingId={listing.id}
              listingTitle={listing.title}
              listingCity={listing.city}
              socials={effectiveSocials}
              trust={sellerTrust}
              seller={{
                firstName: listing.profiles?.first_name || '',
                lastName: listing.profiles?.last_name || '',
                avatarUrl: listing.profiles?.avatar_url || null,
                emailVerified: listing.profiles?.email_verified || false,
                userId: listing.user_id,
                socials: effectiveSocials,
                followersCount: sellerData.followersCount,
              }}
            />
          </aside>
        </div>
      </div>

      {/* ====== SIMILAR PROPERTIES SECTION ====== */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <div className="border-t border-slate-200/80 pt-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Prona të ngjashme në {listing.city}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-normal">
                Mundësi të tjera që mund t&apos;ju përshtaten
              </p>
            </div>
            <Link
              href={`/listings?city=${encodeURIComponent(listing.city)}`}
              className="text-xs sm:text-sm font-semibold text-[#00675B] hover:underline inline-flex items-center gap-1"
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
        listingId={listing.id}
        listingTitle={listing.title}
        listingCity={listing.city}
      />
    </div>
  )
}
