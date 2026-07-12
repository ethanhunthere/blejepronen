'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
import ListingCard from '@/components/ListingCard'
import { ListingCardSkeleton } from '@/components/ListingCard'
import { Button } from '@/components/ui/button'
import { Building2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function PostimetEMiaPage() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [now] = useState(() => Date.now())
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = createClient()

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)
      await fetchListings(user.id)
    }

    init()
  }, [router, supabase, fetchListings])

  const deleteListing = async (listing: Listing) => {
    if (!userId) return

    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listing.id)
      .eq('user_id', userId)

    if (error) {
      console.error('Delete listing error:', error)
      toast.error('Gabim gjatë fshirjes së listimit.')
      return
    }

    // Remove from local state immediately
    setListings(prev => prev.filter(l => l.id !== listing.id))
    toast.success('Banesa u fshi me sukses.')
  }

  const total = listings.length

  const getTrialStatus = (listing: Listing) => {
    if (!listing.free_trial_until) return null
    const daysLeft = Math.ceil(
      (new Date(listing.free_trial_until).getTime() - now) / (1000 * 60 * 60 * 24)
    )
    if (daysLeft < 0) {
      return { label: 'Provë skaduar', className: 'bg-red-500/10 text-red-300 border-red-500/20' }
    }
    if (daysLeft <= 3) {
      return { label: `Skadon për ${daysLeft} ditë`, className: 'bg-amber-500/10 text-amber-300 border-amber-500/20' }
    }
    return { label: `Skadon për ${daysLeft} ditë`, className: 'bg-blue-500/10 text-blue-300 border-blue-500/20' }
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="max-w-[1800px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 sm:py-12 lg:py-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Postimet e Mia</h1>
          <p className="text-gray-400 text-sm mt-1">Menaxho banesat që ke postuar në platformë</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
              <Building2 className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-[#1A1A2E] mb-2">Nuk keni postuar asnjë banesë</h2>
            <p className="text-gray-400 max-w-md mb-8">
              Postoni banesën tuaj dhe arrini mijëra blerës dhe qiramarrës në Kosovë
            </p>
            <Link href="/posto-banese">
              <Button className="h-11 px-6 bg-[#111827] hover:bg-[#1F2937] text-white rounded-xl font-semibold">
                Posto banesën tënde
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-8">
              <div className="inline-flex bg-white border border-gray-100 shadow-sm rounded-xl p-4 text-center min-w-[120px]">
                <div>
                  <p className="text-2xl font-bold text-[#1A1A2E]">{total}</p>
                  <p className="text-xs text-gray-400 mt-1">Gjithsej</p>
                </div>
              </div>
            </div>

            {/* Listings grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <div key={listing.id} className="flex flex-col gap-3">
                  <div className="relative">
                    <ListingCard listing={listing} />
                    <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          listing.is_active
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-300 border-red-500/20'
                        }`}
                      >
                        {listing.is_active ? 'Aktiv' : 'Joaktiv'}
                      </span>
                      {(() => {
                        const trial = getTrialStatus(listing)
                        if (!trial) return null
                        return (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${trial.className}`}
                          >
                            {trial.label}
                          </span>
                        )
                      })()}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteListing(listing)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-medium text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Fshi
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
