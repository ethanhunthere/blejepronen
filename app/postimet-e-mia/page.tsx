'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
import { useFavorites } from '@/lib/useFavorites'
import ListingCard, { ListingCardSkeleton } from '@/components/ListingCard'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Trash2,
  Heart,
  Eye,
  MapPin,
  BedDouble,
  Maximize2,
  AlertTriangle,
  Loader2,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('sq-AL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price)

interface MyListingCardProps {
  listing: Listing
  now: number
  onDelete: (listing: Listing) => void
}

function MyListingCard({ listing, now, onDelete }: MyListingCardProps) {
  const cycleImages = (listing.images || []).filter(Boolean).slice(0, 6)
  const hasMultiple = cycleImages.length > 1
  const [activeIndex, setActiveIndex] = useState(0)
  const [hasInteracted, setHasInteracted] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopCycle = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setActiveIndex(0)
  }, [])

  const startCycle = useCallback(() => {
    if (!hasMultiple) return
    setHasInteracted(true)
    stopCycle()
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % cycleImages.length)
    }, 1100)
  }, [hasMultiple, cycleImages.length, stopCycle])

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const trial = (() => {
    if (!listing.free_trial_until) return null
    const daysLeft = Math.ceil(
      (new Date(listing.free_trial_until).getTime() - now) / (1000 * 60 * 60 * 24)
    )
    if (daysLeft < 0) {
      return {
        label: 'Provë skaduar',
        badgeClass: 'bg-rose-600 text-white shadow-sm',
      }
    }
    if (daysLeft <= 3) {
      return {
        label: `Skadon për ${daysLeft} ${daysLeft === 1 ? 'ditë' : 'ditë'}`,
        badgeClass: 'bg-amber-600 text-white shadow-sm',
      }
    }
    return {
      label: `Skadon për ${daysLeft} ditë`,
      badgeClass: 'bg-sky-700 text-white shadow-sm',
    }
  })()

  return (
    <div
      className="group h-full flex flex-col rounded-2xl overflow-hidden bg-white ring-1 ring-black/5 shadow-[0_1px_3px_rgba(16,24,40,0.08)] hover:shadow-md transition-all duration-200"
      onMouseEnter={startCycle}
      onMouseLeave={stopCycle}
    >
      {/* Clickable Image Section */}
      <Link
        href={`/listings/${listing.id}`}
        className="block relative aspect-[4/3] bg-gray-100 flex-shrink-0 overflow-hidden"
      >
        {cycleImages.length > 0 ? (
          <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.03]">
            <Image
              src={cycleImages[0]}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className={`object-cover transition-opacity duration-700 ease-out ${
                hasMultiple && activeIndex !== 0 ? 'opacity-0' : 'opacity-100'
              }`}
            />
            {hasMultiple &&
              hasInteracted &&
              cycleImages.slice(1).map((img, idx) => {
                const i = idx + 1
                return (
                  <Image
                    key={img + i}
                    src={img}
                    alt={listing.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className={`object-cover transition-opacity duration-700 ease-out ${
                      i === activeIndex ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                )
              })}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
            <Building2 className="w-12 h-12 stroke-[1.2]" />
          </div>
        )}

        {/* Bottom scrim + progress dots */}
        {hasMultiple && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="pointer-events-none absolute bottom-3 inset-x-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {cycleImages.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Type badge - top left */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <span className="inline-flex items-center bg-white/95 backdrop-blur-md text-[#101828] text-[12px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
            {listing.type === 'shitje' ? 'Shitje' : 'Me qira'}
          </span>
        </div>

        {/* Status badges - top right (NO heart button, no overlap) */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 pointer-events-none">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-sm border ${
              listing.is_active
                ? 'bg-white/95 text-emerald-700 border-emerald-200/80'
                : 'bg-white/95 text-gray-700 border-gray-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                listing.is_active ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-gray-400'
              }`}
            />
            {listing.is_active ? 'Aktiv' : 'Joaktiv'}
          </span>

          {trial && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${trial.badgeClass}`}
            >
              {trial.label}
            </span>
          )}
        </div>
      </Link>

      {/* Clickable Info Section */}
      <Link href={`/listings/${listing.id}`} className="flex-1 flex flex-col gap-2 p-4 pb-3">
        <h3 className="font-semibold text-[#101828] text-[16px] leading-snug line-clamp-2 min-h-[44px] group-hover:text-[#00675B] transition-colors">
          {listing.title}
        </h3>

        <div className="flex items-center text-[#4B5563] text-[14px] truncate">
          <MapPin className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-gray-400" />
          <span className="truncate">{listing.city} · {listing.address}</span>
        </div>

        <div className="flex items-center gap-3 text-[14px] text-[#4B5563]">
          {listing.rooms > 0 ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <BedDouble className="h-3.5 w-3.5 text-gray-400" />
              <span className="whitespace-nowrap">{listing.rooms} dhoma</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 flex-shrink-0 text-[#00675B] font-medium">
              <Building2 className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap truncate max-w-[120px]">{listing.apartment_type || 'Prona'}</span>
            </div>
          )}
          <span className="text-gray-300">·</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Maximize2 className="h-3.5 w-3.5 text-gray-400" />
            <span className="whitespace-nowrap">{listing.area_m2} m²</span>
          </div>
        </div>

        <div className="flex items-baseline gap-1 mt-auto pt-2">
          <span className="text-[18px] font-bold text-[#00675B] tracking-tight whitespace-nowrap">
            {formatPrice(listing.price)}
          </span>
          {listing.type === 'qira' && <span className="text-[14px] text-[#4B5563]">/muaj</span>}
        </div>
      </Link>

      {/* Management Actions Footer */}
      <div className="border-t border-gray-100 bg-gray-50/70 p-3 px-4 flex items-center justify-between gap-2 mt-auto">
        <Link
          href={`/listings/${listing.id}`}
          className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#00675B] hover:border-[#00675B]/40 hover:shadow-xs transition-all duration-150"
        >
          <Eye className="w-3.5 h-3.5" />
          Shiko pronën
        </Link>
        <button
          type="button"
          onClick={() => onDelete(listing)}
          className="min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-rose-50 border border-rose-200/80 hover:border-rose-300 rounded-xl text-xs font-semibold text-rose-600 transition-all duration-150 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Fshi
        </button>
      </div>
    </div>
  )
}

export default function PostimetEMiaPage() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [now] = useState(() => Date.now())
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'mine' | 'favorites'>('mine')
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const hasFetchedFavoritesRef = useRef(false)

  const supabase = createClient()
  const { toggleFavorite } = useFavorites()

  const fetchListings = useCallback(async (uid: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('listings')
      .select('id,title,price,city,neighborhood,address,type,images,rooms,area_m2,is_featured,is_active,created_at,user_id,condition,floor,apartment_type,features,free_trial_until')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      console.error('Fetch listings error:', error)
      toast.error('Gabim gjatë ngarkimit të listimeve.')
    } else {
      setListings((data || []) as unknown as Listing[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      let activeUser = null
      try {
        const { data } = await supabase.auth.getUser()
        activeUser = data?.user || null
      } catch {}

      if (!activeUser) {
        try {
          const { data: sessData } = await supabase.auth.getSession()
          activeUser = sessData?.session?.user || null
        } catch {}
      }

      if (!activeUser) {
        await new Promise((r) => setTimeout(r, 400))
        try {
          const { data } = await supabase.auth.getUser()
          activeUser = data?.user || null
        } catch {}
        if (!activeUser) {
          try {
            const { data: sessData } = await supabase.auth.getSession()
            activeUser = sessData?.session?.user || null
          } catch {}
        }
      }

      if (!activeUser) {
        if (typeof window !== 'undefined' && sessionStorage.getItem('blejepronen_logging_out')) {
          return
        }
        router.push('/login')
        return
      }
      setUserId(activeUser.id)
      await fetchListings(activeUser.id)
    }

    init()
  }, [router, supabase, fetchListings])

  const fetchFavorites = useCallback(async () => {
    setFavoritesLoading(true)
    try {
      const res = await fetch('/api/favorites')
      if (!res.ok) throw new Error('Failed to fetch favorites')
      const { listing_ids } = await res.json()

      if (!listing_ids || listing_ids.length === 0) {
        setFavoriteListings([])
        return
      }

      const { data, error } = await supabase
        .from('listings')
        .select('id,title,price,city,neighborhood,address,type,images,rooms,area_m2,is_featured,is_active,created_at,user_id,condition,floor,apartment_type,features,free_trial_until')
        .in('id', listing_ids)

      if (error) throw error
      setFavoriteListings((data || []) as unknown as Listing[])
    } catch (err) {
      console.error('Fetch favorites error:', err)
      toast.error('Gabim gjatë ngarkimit të të preferuarave.')
    } finally {
      setFavoritesLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (activeTab !== 'favorites' || hasFetchedFavoritesRef.current) return
    hasFetchedFavoritesRef.current = true
    fetchFavorites()
  }, [activeTab, fetchFavorites])

  const handleUnfavorite = useCallback((id: string) => {
    setFavoriteListings(prev => prev.filter(l => l.id !== id))
    toggleFavorite(id)
  }, [toggleFavorite])

  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteListing = async () => {
    if (!userId || !listingToDelete) return
    setIsDeleting(true)

    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingToDelete.id)
      .eq('user_id', userId)

    setIsDeleting(false)

    if (error) {
      console.error('Delete listing error:', error)
      toast.error('Gabim gjatë fshirjes së listimit.')
      return
    }

    setListings((prev) => prev.filter((l) => l.id !== listingToDelete.id))
    toast.success('Prona u fshi me sukses.')
    setListingToDelete(null)
  }

  const total = listings.length

  return (
    <div className="min-h-screen bg-[#F2F7F7]">
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 sm:py-12 lg:py-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#101828] tracking-tight">Postimet e Mia</h1>
            <p className="text-gray-500 text-sm sm:text-base mt-1">Menaxho pronat që ke postuar në platformë</p>
          </div>
          <Link href="/posto-prona" className="self-start sm:self-auto">
            <Button className="h-11 px-5 bg-[#00675B] hover:bg-[#004D43] text-white rounded-xl font-semibold inline-flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-150">
              <Plus className="w-4 h-4" />
              Posto pronë të re
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 sm:gap-8 border-b border-gray-200/80 mb-8 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className={`pb-3.5 text-sm sm:text-base cursor-pointer transition-all duration-150 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'mine'
                ? 'border-b-2 border-[#00675B] text-[#00675B] font-bold'
                : 'text-gray-500 hover:text-gray-700 font-medium'
            }`}
          >
            <span>Postimet e mia</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                activeTab === 'mine' ? 'bg-[#00675B]/10 text-[#00675B]' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {listings.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`pb-3.5 text-sm sm:text-base cursor-pointer transition-all duration-150 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'favorites'
                ? 'border-b-2 border-[#00675B] text-[#00675B] font-bold'
                : 'text-gray-500 hover:text-gray-700 font-medium'
            }`}
          >
            <span>Të preferuarat</span>
            {favoriteListings.length > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  activeTab === 'favorites' ? 'bg-[#00675B]/10 text-[#00675B]' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {favoriteListings.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'favorites' ? (
          favoritesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2000px]:grid-cols-6 min-[2500px]:grid-cols-8 min-[3000px]:grid-cols-10 min-[4000px]:grid-cols-12 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          ) : favoriteListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-6">
                <Heart className="h-10 w-10 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-[#101828] mb-2">Nuk keni pronë të preferuar ende</h2>
              <p className="text-gray-500 max-w-md mb-8 text-sm sm:text-base">
                Klikoni ikonën e zemrës në çdo pronë për ta ruajtur këtu
              </p>
              <Link href="/listings">
                <Button className="h-11 px-6 bg-[#00675B] hover:bg-[#004D43] text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all">
                  Eksploro pronat
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2000px]:grid-cols-6 min-[2500px]:grid-cols-8 min-[3000px]:grid-cols-10 min-[4000px]:grid-cols-12 gap-6">
              {favoriteListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  isFavorited
                  onToggleFavorite={handleUnfavorite}
                />
              ))}
            </div>
          )
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2000px]:grid-cols-6 min-[2500px]:grid-cols-8 min-[3000px]:grid-cols-10 min-[4000px]:grid-cols-12 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-6">
              <Building2 className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-[#101828] mb-2">Nuk keni postuar asnjë pronë</h2>
            <p className="text-gray-500 max-w-md mb-8 text-sm sm:text-base">
              Postoni pronën tuaj dhe arrini mijëra blerës dhe qiramarrës në Kosovë
            </p>
            <Link href="/posto-prona">
              <Button className="h-11 px-6 bg-[#00675B] text-white rounded-xl font-semibold hover:bg-[#004D43] hover:shadow-lg hover:shadow-[#00675B]/25 hover:-translate-y-[1px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-out">
                Posto pronën tënde
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Quick stats indicator */}
            <div className="mb-8 flex items-center gap-3">
              <div className="bg-white border border-gray-200/70 shadow-xs rounded-2xl px-5 py-3.5 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#00675B]/10 flex items-center justify-center text-[#00675B]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#101828] leading-none">{total}</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    {total === 1 ? 'Pronë aktive' : 'Prona gjithsej'}
                  </p>
                </div>
              </div>
            </div>

            {/* Responsive listings grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2000px]:grid-cols-6 min-[2500px]:grid-cols-8 min-[3000px]:grid-cols-10 min-[4000px]:grid-cols-12 gap-6">
              {listings.map((listing) => (
                <MyListingCard
                  key={listing.id}
                  listing={listing}
                  now={now}
                  onDelete={(item) => setListingToDelete(item)}
                />
              ))}
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {listingToDelete && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => !isDeleting && setListingToDelete(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative space-y-5 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-[#101828]">Fshirja e pronës</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    A jeni të sigurt që dëshironi ta fshini këtë pronë? Ky veprim nuk mund të kthehet.
                  </p>
                </div>
              </div>

              {/* Property summary in modal */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                <div className="relative w-16 h-14 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                  {listingToDelete.images && listingToDelete.images[0] ? (
                    <Image
                      src={listingToDelete.images[0]}
                      alt={listingToDelete.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#101828] truncate">{listingToDelete.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {listingToDelete.city} {listingToDelete.address ? `· ${listingToDelete.address}` : ''}
                  </p>
                  <p className="text-xs font-bold text-[#00675B] mt-0.5">
                    {formatPrice(listingToDelete.price)}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setListingToDelete(null)}
                  className="min-h-[42px] px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Anulo
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteListing}
                  className="min-h-[42px] px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 shadow-sm shadow-rose-600/20"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Po fshihet...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Po, fshije
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
