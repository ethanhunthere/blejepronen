import { createServerSupabaseClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
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

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('listings')
    .select('*, profiles(first_name, last_name, phone)')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  const listing = data as ListingWithProfile | null

  // Only 404 on "not found" error; surface other errors
  if (!listing) notFound()
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load listing: ${error.message}`)
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('sq-AL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <Link href="/listings" className="inline-flex items-center text-gray-500 hover:text-[#1B4FFF] mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kthehu te banesat
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Images + Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Image */}
            <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden bg-gray-200">
              {listing.images?.[0] ? (
                <Image
                  src={listing.images[0]}
                  alt={listing.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-lg">
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
              <div className="grid grid-cols-4 gap-3">
                {listing.images.slice(1).map((img: string, i: number) => (
                  <div key={i} className="relative h-24 rounded-xl overflow-hidden bg-gray-200">
                    <Image src={img} alt={`Foto ${i + 2}`} fill className="object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Title + Info */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h1 className="text-2xl font-bold text-gray-900 mb-3">{listing.title}</h1>
              <div className="flex items-center text-gray-500 mb-4">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{listing.city} · {listing.address}</span>
              </div>

              <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-100 mb-4">
                <div className="text-center">
                  <BedDouble className="h-5 w-5 text-[#1B4FFF] mx-auto mb-1" />
                  <p className="text-lg font-semibold">{listing.rooms}</p>
                  <p className="text-xs text-gray-500">Dhoma</p>
                </div>
                <div className="text-center">
                  <Maximize2 className="h-5 w-5 text-[#1B4FFF] mx-auto mb-1" />
                  <p className="text-lg font-semibold">{listing.area_m2} m²</p>
                  <p className="text-xs text-gray-500">Sipërfaqe</p>
                </div>
                <div className="text-center">
                  <Calendar className="h-5 w-5 text-[#1B4FFF] mx-auto mb-1" />
                  <p className="text-sm font-semibold">{formatDate(listing.created_at)}</p>
                  <p className="text-xs text-gray-500">Postuar</p>
                </div>
              </div>

              <h2 className="font-semibold text-gray-900 mb-2">Përshkrimi</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            </div>
          </div>

          {/* Right: Price + Contact */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 sticky top-24">
              <p className="text-3xl font-bold text-[#1B4FFF] mb-1">
                {formatPrice(listing.price)}
                {listing.type === 'qira' && <span className="text-base font-normal text-gray-500">/muaj</span>}
              </p>
              {listing.area_m2 > 0 && listing.type === 'shitje' && (
                <p className="text-sm text-gray-400 mb-4">
                  {formatPrice(Math.round(listing.price / listing.area_m2))}/m²
                </p>
              )}

              <div className="border-t border-gray-100 pt-4 mb-4">
                <p className="text-sm text-gray-500 mb-1">Shitësi</p>
                <p className="font-semibold text-gray-900">
                  {listing.profiles?.first_name} {listing.profiles?.last_name}
                </p>
              </div>

              {listing.profiles?.phone && (
                <>
                  <a href={`tel:${listing.profiles.phone}`}>
                    <Button className="w-full h-12 bg-[#1B4FFF] hover:bg-[#1640CC] text-white text-base">
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
                    <Button variant="outline" className="w-full h-11 border-gray-200">
                      Kontakto me WhatsApp
                    </Button>
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
