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
  listings: Listing[]
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
        const { data: listings } = await supabase
          .from('listings')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(12)

        if (!cancelled) {
          setData({
            listings: (listings || []) as unknown as Listing[],
          })
        }
      } catch {
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

        {/* Soft radial vignette */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 45%, rgba(5,10,35,0.22) 0%, transparent 100%)' }}
        />

        {/* Top fade from page background to blend navbar seamlessly */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-24 z-10"
          style={{ background: 'linear-gradient(to top, transparent 0%, rgba(10,15,46,0.3) 50%, #0A0F2E 100%)' }}
        />

        {/* Bottom fade into page background */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-64 z-10"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(10,15,46,0.5) 50%, #0A0F2E 100%)' }}
        />

        <div className="relative z-20 flex-1 flex items-center pt-4 md:pt-8">
          <div className="max-w-[1800px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-10 sm:py-14 md:py-18 2xl:py-24 w-full">
            <div className="text-center max-w-3xl mx-auto">
              <h1
                className="inline-block uppercase text-4xl md:text-5xl lg:text-6xl 2xl:text-8xl font-black text-white leading-tight tracking-tight text-center px-3 sm:px-4 py-2"
                style={{ textShadow: '0 0 60px rgba(0,0,0,1), 0 4px 12px rgba(0,0,0,1), 2px 2px 0px rgba(0,0,0,0.8)' }}
              >
                Gjej banesën e duhur në Kosovë
              </h1>

              <p
                className="inline-block text-lg md:text-xl text-white/85 max-w-2xl mt-6 leading-relaxed text-center mx-auto px-3 sm:px-4 py-2 font-medium"
                style={{ textShadow: '0 2px 15px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.7)' }}
              >
                Bli, shit ose jep me qira banesën tënde duke kontaktuar drejtpërdrejt me pronarët. Shiko qindra banesa në të gjitha qytetet kryesore të Kosovës.
              </p>

              <p
                className="inline-block text-white/60 text-xs sm:text-sm text-center mb-3 mt-10 px-3 py-1"
                style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.7)' }}
              >
                Kërko sipas qytetit ose lagjes
              </p>

              {/* Search Bar */}
              <SearchBar
                placeholder="Kërko banesë, agjent, kompani, adresë..."
                buttonText="Kërko Banesë"
                className="2xl:max-w-4xl 2xl:h-16"
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
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-full px-7 py-3 font-semibold bg-[#1B4FFF]/80 backdrop-blur-md border border-[#1B4FFF]/40 text-white hover:bg-[#1B4FFF] transition-all cursor-pointer shadow-lg shadow-[#1B4FFF]/20"
                >
                  Shiko banesat
                </Link>
                <Link
                  href="/posto-banese"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-full px-7 py-3 font-semibold bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/15 hover:border-white/30 transition-all cursor-pointer"
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
        <section className="max-w-[1800px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
          <div className="bg-red-900/20 border border-red-800 rounded-2xl p-6 text-center">
            <p className="text-red-300 mb-3">{error}</p>
            <Button
              className="w-full sm:w-auto h-11 bg-[#1B4FFF] hover:bg-[#1640CC] text-white rounded-xl font-semibold"
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

      {/* Unified Listings */}
      <section className="bg-[#0A0F2E] max-w-[1800px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 sm:py-12 lg:py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Banesa në Shitje dhe me Qira</h2>
            <p className="text-white/40 text-sm mt-1">Të gjitha banesat e disponueshme në platformë</p>
          </div>
          <Link href="/listings" className="text-sm font-semibold text-white hover:text-white/80 transition-colors">
            Shiko të gjitha →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {Array.from({ length: 12 }).map((_, i) => (
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
        ) : data && data.listings.length > 0 ? (
          <AnimateOnScroll className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {data.listings.map((listing) => (
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
              <Button className="h-11 w-full sm:w-auto px-5 bg-[#1B4FFF] hover:bg-[#1640CC] text-white rounded-xl font-semibold">
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
