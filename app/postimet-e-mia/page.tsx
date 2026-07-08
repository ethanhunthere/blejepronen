'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
import ListingCard from '@/components/ListingCard'
import { ListingCardSkeleton } from '@/components/ListingCard'
import { Button } from '@/components/ui/button'
import { Building2, Power, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function PostimetEMiaPage() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      await fetchListings(user.id)
    }

    init()
  }, [router, supabase])

  const fetchListings = async (uid: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch listings error:', error)
      toast.error('Gabim gjatë ngarkimit të listimeve.')
    } else {
      setListings((data || []) as unknown as Listing[])
    }
    setLoading(false)
  }

  const toggleActive = async (listing: Listing) => {
    const newStatus = !listing.is_active
    const { error } = await supabase
      .from('listings')
      .update({ is_active: newStatus })
      .eq('id', listing.id)

    if (error) {
      console.error('Toggle active error:', error)
      toast.error('Gabim gjatë ndryshimit të statusit.')
      return
    }

    setListings(prev =>
      prev.map(item => (item.id === listing.id ? { ...item, is_active: newStatus } : item))
    )
    toast.success(newStatus ? 'Listimi u aktivizua.' : 'Listimi u çaktivizua.')
  }

  const softDelete = async (listing: Listing) => {
    const { error } = await supabase
      .from('listings')
      .update({ is_active: false })
      .eq('id', listing.id)

    if (error) {
      console.error('Soft delete error:', error)
      toast.error('Gabim gjatë fshirjes së listimit.')
      return
    }

    setListings(prev =>
      prev.map(item => (item.id === listing.id ? { ...item, is_active: false } : item))
    )
    toast.success('Listimi u fshi.')
  }

  const total = listings.length
  const activeCount = listings.filter(l => l.is_active).length
  const inactiveCount = listings.filter(l => !l.is_active).length

  return (
    <div className="min-h-screen bg-[#0A0F2E]">
      <div className="max-w-[1800px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 sm:py-12 lg:py-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Postimet e Mia</h1>
          <p className="text-white/40 text-sm mt-1">Menaxho banesat që ke postuar në platformë</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <Building2 className="h-10 w-10 text-white/40" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Nuk keni postuar asnjë banesë</h2>
            <p className="text-white/50 max-w-md mb-8">
              Postoni banesën tuaj dhe arrini mijëra blerës dhe qiramarrës në Kosovë
            </p>
            <Link href="/posto-banese">
              <Button className="h-11 px-6 bg-[#1B4FFF] hover:bg-[#1640CC] text-white rounded-xl font-semibold">
                Posto banesën tënde
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{total}</p>
                <p className="text-xs text-white/40 mt-1">Gjithsej</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
                <p className="text-xs text-white/40 mt-1">Aktive</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{inactiveCount}</p>
                <p className="text-xs text-white/40 mt-1">Joaktive</p>
              </div>
            </div>

            {/* Listings grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <div key={listing.id} className="flex flex-col gap-3">
                  <div className="relative">
                    <ListingCard listing={listing} />
                    <div className="absolute top-3 right-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          listing.is_active
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-300 border-red-500/20'
                        }`}
                      >
                        {listing.is_active ? 'Aktiv' : 'Joaktiv'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(listing)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white/70 transition-colors cursor-pointer"
                    >
                      <Power className="h-3.5 w-3.5" />
                      {listing.is_active ? 'Çaktivo' : 'Aktivo'}
                    </button>
                    <button
                      type="button"
                      onClick={() => softDelete(listing)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-medium text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Fshi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
