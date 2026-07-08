import { createServerSupabaseClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, BedDouble, Maximize2, Phone, ArrowLeft, Calendar } from 'lucide-react'

interface ListingDetailPageProps {
  params: Promise<{ id: string }>
}

interface ListingWithProfile extends Listing {
  profiles: { first_name: string; last_name: string; phone: string } | null
}

interface ListingMetadata {
  title: string
  description: string | null
  price: number
  city: string
  images: string[] | null
}

export async function generateMetadata({ params }: ListingDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('listings')
    .select('title,description,price,city,images')
    .eq('id', id)
    .single()

  if (!data) {
    return { title: 'Listim | Bleje Banesën' }
  }

  const listing = data as ListingMetadata

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
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('listings')
    .select('*, profiles(first_name, last_name, phone)')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('Supabase query error:', error.code, error.message)
    throw new Error(`Failed to load listing: ${error.message}`)
  }

  const listing = (data as ListingWithProfile | null) ?? null

  if (!listing) notFound()

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('sq-AL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric' })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.title,
    description: listing.description,
    url: `https://blejebanesen.com/listings/${listing.id}`,
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <Link href="/listings" className="inline-flex items-center text-gray-400 hover:text-[#4d7cff] mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kthehu te banesat
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Images + Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Image */}
            <div className="relative h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden bg-gray-800">
              {listing.images?.[0] ? (
                <Image
                  src={listing.images[0]}
                  alt={listing.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-lg">
                  Pa foto
                </div>
              )}
              <div className="absolute top-4 left-4">
                <Badge className={listing.type === 'shitje' ? 'bg-[#1B4FFF] text-white' : 'bg-emerald-500 text-white'}>
                  {listing.type === 'shitje' ? 'Shitje' : 'Me qira'}
                </Badge>
              </div>
            </div>

            {/* Image Gallery */}
            {listing.images && listing.images.length > 1 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {listing.images.slice(1).map((img: string, i: number) => (
                  <div key={i} className="relative h-24 rounded-xl overflow-hidden bg-gray-800">
                    <Image src={img} alt={`Foto ${i + 2}`} fill sizes="(max-width: 640px) 25vw, 15vw" className="object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Title + Info */}
            <div className="bg-[#111936] rounded-2xl p-6 border border-white/10">
              <h1 className="text-2xl font-bold text-white mb-3">{listing.title}</h1>
              <div className="flex items-center text-gray-400 mb-4 min-w-0">
                <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="break-words min-w-0">{listing.city} · {listing.address}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-4 py-4 border-y border-white/10 mb-4">
                <div className="text-center">
                  <BedDouble className="h-5 w-5 text-[#1B4FFF] mx-auto mb-1" />
                  <p className="text-lg font-semibold">{listing.rooms}</p>
                  <p className="text-sm text-gray-400">Dhoma</p>
                </div>
                <div className="text-center">
                  <Maximize2 className="h-5 w-5 text-[#1B4FFF] mx-auto mb-1" />
                  <p className="text-lg font-semibold">{listing.area_m2} m²</p>
                  <p className="text-sm text-gray-400">Sipërfaqe</p>
                </div>
                <div className="text-center">
                  <Calendar className="h-5 w-5 text-[#1B4FFF] mx-auto mb-1" />
                  <p className="text-sm font-semibold">{formatDate(listing.created_at)}</p>
                  <p className="text-sm text-gray-400">Postuar</p>
                </div>
              </div>

              <h2 className="font-semibold text-white mb-2">Përshkrimi</h2>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            </div>
          </div>

          {/* Right: Price + Contact */}
          <div className="space-y-4">
            <div className="bg-[#111936] rounded-2xl p-6 border border-white/10 lg:sticky lg:top-24">
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

              {listing.profiles?.phone && (
                <>
                  <a href={`tel:${listing.profiles.phone}`}>
                    <Button className="w-full h-12 bg-[#1B4FFF] hover:bg-[#1640CC] text-white text-base font-semibold rounded-xl cursor-pointer">
                      <Phone className="h-4 w-4 mr-2" />
                      {listing.profiles.phone}
                    </Button>
                  </a>
                  <a
                    href={`https://wa.me/${listing.profiles.phone.replace(/\s/g, '').replace('+', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-3"
                  >
                    <button type="button" className="w-full h-11 border-2 border-white bg-transparent text-white hover:bg-white hover:text-[#1B4FFF] rounded-xl font-semibold transition-colors inline-flex items-center justify-center whitespace-nowrap cursor-pointer">
                      Kontakto me WhatsApp
                    </button>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
