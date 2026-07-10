import { createServerSupabaseClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { MapPin, BedDouble, Maximize2, ArrowLeft, Calendar } from 'lucide-react'
import ListingImageGallery from '@/components/ListingImageGallery'

export const revalidate = 3600

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('sq-AL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric' })

interface ListingDetailPageProps {
  params: Promise<{ id: string }>
}

interface ListingWithProfile extends Listing {
  profiles: { first_name: string; last_name: string; phone: string | null; avatar_url: string | null } | null
}

interface ListingMetadata {
  title: string
  description: string | null
  price: number
  city: string
  images: string[] | null
}

async function getListing(id: string) {
  const supabase = await createServerSupabaseClient()
  return supabase
    .from('listings')
    .select(
      'id,title,description,price,city,neighborhood,address,rooms,area_m2,type,condition,floor,apartment_type,features,images,is_active,is_featured,created_at,user_id,updated_at,free_trial_until,profiles(first_name,last_name,phone,avatar_url)'
    )
    .eq('id', id)
    .eq('is_active', true)
    .single()
}

export async function generateMetadata({ params }: ListingDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const { data, error } = await getListing(id)

  if (error || !data) {
    return { title: 'Listim | Bleje Banesën' }
  }

  const listing = data as unknown as ListingMetadata

  return {
    title: `${listing.title} – ${listing.city} | Bleje Banesën`,
    description: listing.description?.slice(0, 155),
    openGraph: {
      title: listing.title,
      description: listing.description?.slice(0, 155),
      images: listing.images?.[0] ? [{ url: listing.images[0], width: 1200, height: 630 }] : [],
    },
  }
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params
  const { data, error } = await getListing(id)

  if (error) {
    if (error.code === 'PGRST116') {
      notFound()
    }
    console.error('Supabase query error:', error.code, error.message)
    throw new Error(`Failed to load listing: ${error.message}`)
  }

  const listing = (data as unknown as ListingWithProfile | null) ?? null

  if (!listing) notFound()

  const conditionLabels: Record<string, string> = {
    'e-re': 'E re',
    'e-vjeter': 'E vjetër',
    'rinovuar': 'E rinovuar',
    'ka-nevojë-për-rinovim': 'Ka nevojë për rinovim'
  }

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
    <div className="min-h-screen bg-[#0A0F2E]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-5xl 2xl:max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <Link href="/listings" className="inline-flex items-center text-gray-400 hover:text-[#4d7cff] mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kthehu te banesat
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image gallery */}
            {listing.images && listing.images.length > 0 ? (
              <ListingImageGallery images={listing.images} title={listing.title} />
            ) : (
              <div className="aspect-[16/10] rounded-2xl bg-[#111936] flex items-center justify-center text-gray-500">
                Pa foto
              </div>
            )}

            {/* Title & meta */}
            <div className="bg-[#111936] rounded-2xl p-6 border border-white/10">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{listing.title}</h1>
                <Badge className={listing.type === 'shitje' ? 'bg-[#1B4FFF]/20 text-[#4d7cff]' : 'bg-emerald-500/20 text-emerald-400'}>
                  {listing.type === 'shitje' ? 'Shitje' : 'Me qira'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-gray-400 text-sm mb-4">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {listing.address}, {listing.city}
                  {listing.neighborhood && ` – ${listing.neighborhood}`}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(listing.created_at)}
                </span>
              </div>

              {listing.description && (
                <p className="text-gray-300 leading-relaxed whitespace-pre-line">{listing.description}</p>
              )}
            </div>

            {/* Features */}
            <div className="bg-[#111936] rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4">Karakteristikat</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-gray-300">
                  <BedDouble className="h-5 w-5 text-[#4d7cff]" />
                  <span>{listing.rooms} dhoma</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Maximize2 className="h-5 w-5 text-[#4d7cff]" />
                  <span>{listing.area_m2} m²</span>
                </div>
                {listing.condition && (
                  <div className="text-gray-300">
                    Gjendja: <span className="text-white">{conditionLabels[listing.condition] || listing.condition}</span>
                  </div>
                )}
                {listing.floor && (
                  <div className="text-gray-300">
                    Kati: <span className="text-white">{listing.floor}</span>
                  </div>
                )}
                {listing.apartment_type && (
                  <div className="text-gray-300">
                    Tipologjia: <span className="text-white">{listing.apartment_type}</span>
                  </div>
                )}
              </div>

              {listing.features && listing.features.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {listing.features.map(feature => (
                    <span key={feature} className="px-3 py-1 rounded-full bg-white/5 text-gray-300 text-sm border border-white/10">
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-[#111936] rounded-2xl p-6 border border-white/10 sticky top-24">
              <p className="text-3xl font-bold text-[#1B4FFF] mb-1">
                {formatPrice(listing.price)}
                {listing.type === 'qira' && <span className="text-base font-normal text-gray-400">/muaj</span>}
              </p>
              {listing.area_m2 > 0 && listing.type === 'shitje' && (
                <p className="text-sm text-gray-500 mb-4">
                  {formatPrice(Math.round(listing.price / listing.area_m2))}/m²
                </p>
              )}

              <div className="border-t border-white/10 pt-4 mb-4">
                <p className="text-sm text-gray-400 mb-1">Shitësi</p>
                <p className="font-semibold text-white">
                  {listing.profiles?.first_name} {listing.profiles?.last_name}
                </p>
              </div>

              <p className="text-sm text-gray-500">
                Për të kontaktuar shitësin, kyçuni në platformë ose shkoni te profili i tij.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
