'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
import Image from 'next/image'
import ListingCard from '@/components/ListingCard'
import SearchBar from '@/components/SearchBar'
import AnimateOnScroll from '@/components/AnimateOnScroll'
import ScrollToTop from '@/components/ScrollToTop'
import { Button } from '@/components/ui/button'


interface HomeData {
  featuredListings: Listing[]
  latestListings: Listing[]
  totalListings: number
  totalUsers: number
}

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function fetchHomeData() {
      try {
        const [
          { data: featuredListings },
          { data: latestListings },
          { count: totalListings },
          { count: totalUsers },
        ] = await Promise.all([
          supabase
            .from('listings')
            .select('*')
            .eq('is_active', true)
            .eq('is_featured', true)
            .order('created_at', { ascending: false })
            .limit(4),
          supabase
            .from('listings')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true),
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true }),
        ])

        if (!cancelled) {
          setData({
            featuredListings: (featuredListings || []) as unknown as Listing[],
            latestListings: (latestListings || []) as unknown as Listing[],
            totalListings: totalListings ?? 0,
            totalUsers: totalUsers ?? 0,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError('Kërkesa dështoi. Ju lutemi provoni përsëri më vonë.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchHomeData()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#0A0F2E]">
      {/* Hero — photorealistic Pristina background */}
      <section className="relative overflow-hidden min-h-screen flex flex-col">
        {/* Background photo with Ken Burns zoom */}
        <Image
          src="/pristinalandscape.jpg"
          alt="Prishtina"
          fill
          priority
          className="object-cover ken-burns z-0"
          sizes="100vw"
        />

        {/* Dark blue gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(10,20,80,0.7)] to-[rgba(10,20,60,0.4)] z-10" />

        {/* Top fade from page background to blend navbar seamlessly */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-64 z-10"
          style={{ background: 'linear-gradient(to top, transparent 0%, rgba(10,15,46,0.5) 50%, #0A0F2E 100%)' }}
        />

        {/* Bottom fade into page background */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-64 z-10"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(10,15,46,0.5) 50%, #0A0F2E 100%)' }}
        />

        <div className="relative z-20 flex-1 flex items-center pt-12 md:pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 md:py-18 w-full">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center border border-white/15 bg-white/5 text-white/70 text-xs px-4 py-1.5 rounded-full mb-6">
                🇽🇰 Platforma e Banesave në Kosovë
              </div>

              <h1 className="text-5xl md:text-6xl font-black text-white leading-tight tracking-tight text-center">
                Gjej banesën e duhur në Kosovë
              </h1>

              <p className="text-base md:text-lg text-white/60 max-w-2xl mt-6 leading-relaxed text-center mx-auto">
                Bli, shit ose jep me qira banesën tënde duke kontaktuar drejtpërdrejt me pronarët. Nuk ka komisione dhe nuk ka ndërmjetës të panevojshëm.
              </p>

              <p className="text-white/40 text-sm text-center mb-3 mt-10">
                Kërko sipas qytetit ose lagjes
              </p>

              {/* Search Bar */}
              <SearchBar
                placeholder="Kërko sipas qytetit, lagjes ose çmimit..."
                buttonText="Kërko Banesë"
              />

              {/* City links */}
              <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 mt-6 text-white/40 text-sm">
                {['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Gjilan', 'Mitrovicë'].map((city, i, arr) => (
                  <span key={city}>
                    <Link href={`/listings?city=${encodeURIComponent(city)}`} className="text-white/60 hover:text-white transition-colors">
                      {city}
                    </Link>
                    {i < arr.length - 1 && <span className="ml-2">/</span>}
                  </span>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
                <Link
                  href="/listings"
                  className="inline-flex items-center justify-center rounded-xl h-12 px-6 font-medium bg-white text-[#1B4FFF] hover:bg-white/90 transition-colors"
                >
                  Shfleto banesat
                </Link>
                <Link
                  href="/posto-banese"
                  className="inline-flex items-center justify-center rounded-xl h-12 px-6 font-medium border border-white/20 text-white hover:bg-white/10 transition-colors"
                >
                  Posto banesën tënde
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Error state */}
      {error && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-900/20 border border-red-800 rounded-2xl p-6 text-center">
            <p className="text-red-300 mb-3">{error}</p>
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => {
                setError(null)
                setLoading(true)
                window.location.reload()
              }}
            >
              Provo përsëri
            </Button>
          </div>
        </section>
      )}

      {/* Featured Listings — skeleton while loading */}
      <section className="dot-grid bg-[#0A0F2E] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">⭐ Të rekomanduara</h2>
            <p className="text-slate-400 text-sm mt-1">Listimet e zgjedhura me kujdes</p>
          </div>
          <Link href="/listings">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">Shiko të gjitha →</Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#111936] rounded-2xl border border-white/10 overflow-hidden">
                <div className="aspect-[4/3] bg-slate-700 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-700 rounded animate-pulse w-3/4" />
                  <div className="h-6 bg-slate-700 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-slate-700 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : data && data.featuredListings.length > 0 ? (
          <AnimateOnScroll className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.featuredListings.map((listing) => (
              <div key={listing.id} className="aos-fade-up">
                <ListingCard listing={listing} />
              </div>
            ))}
          </AnimateOnScroll>
        ) : !loading ? (
          <div className="text-center py-10 bg-[#111936] rounded-2xl border border-white/10">
            <p className="text-slate-400">Asnjë listim i rekomanduar për momentin.</p>
          </div>
        ) : null}
      </section>

      {/* Latest Listings — skeleton while loading */}
      <section className="dot-grid max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">🏠 Banesat e Fundit</h2>
            <p className="text-slate-400 text-sm mt-1">Të shtuara në 24 orët e fundit</p>
          </div>
          <Link href="/listings">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">Shiko të gjitha →</Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[#111936] rounded-2xl border border-white/10 overflow-hidden">
                <div className="aspect-[4/3] bg-slate-700 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-700 rounded animate-pulse w-3/4" />
                  <div className="h-6 bg-slate-700 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-slate-700 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : data && data.latestListings.length > 0 ? (
          <AnimateOnScroll className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.latestListings.map((listing) => (
              <div key={listing.id} className="aos-fade-up">
                <ListingCard listing={listing} />
              </div>
            ))}
          </AnimateOnScroll>
        ) : !loading ? (
          <div className="text-center py-16 bg-[#111936] rounded-2xl border border-white/10">
            <div className="text-5xl mb-4">🏠</div>
            <h3 className="text-lg font-semibold text-white mb-2">Ende nuk ka listime</h3>
            <p className="text-slate-400 mb-6">Bëhu i pari që poston banesën tënde në platformën tonë falas!</p>
            <Link href="/posto-banese">
              <Button className="bg-[#1B4FFF] hover:bg-[#1640CC] text-white">
                Posto banesën tënde falas
              </Button>
            </Link>
          </div>
        ) : null}
      </section>

      <ScrollToTop />
    </main>
  )
}
