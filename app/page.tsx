'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
import ListingCard from '@/components/ListingCard'
import SearchBar from '@/components/SearchBar'
import KosovoSkyline from '@/components/KosovoSkyline'
import AnimateOnScroll from '@/components/AnimateOnScroll'
import ScrollToTop from '@/components/ScrollToTop'
import { Button } from '@/components/ui/button'
import { Building2, Shield, Globe, Star } from 'lucide-react'

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

  // Static sections that render instantly even while data loads
  const staticSections = (
    <>
      {/* How it works */}
      <section className="relative border-y border-gray-100 py-8 sm:py-12 lg:py-16 bg-gradient-to-br from-[#F0F4FF] via-[#EEF2FF] to-[#F8F9FF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll className="aos-fade-up">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Si funksionon?</h2>
          </AnimateOnScroll>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Connecting dotted line — hidden on mobile */}
            <svg
              className="absolute top-[4.5rem] left-0 w-full h-6 hidden md:block pointer-events-none"
              preserveAspectRatio="none"
            >
              <line
                x1="17%"
                y1="50%"
                x2="83%"
                y2="50%"
                stroke="#1B4FFF"
                strokeWidth="2"
                strokeDasharray="8 10"
                strokeLinecap="round"
                className="dotted-line"
              />
            </svg>

            {[
              { step: '01', icon: '🔍', title: 'Kërko', desc: 'Shfleto qindra banesa dhe filtro sipas qytetit, çmimit dhe numrit të dhomave.', direction: 'aos-from-left' },
              { step: '02', icon: '📞', title: 'Kontakto', desc: 'Kontakto direkt shitësin me telefon ose WhatsApp, pa ndërmjetës.', direction: 'aos-from-bottom' },
              { step: '03', icon: '🏠', title: 'Merr çelësin', desc: 'Bije dakord me shitësin dhe kryej transaksionin në mënyrën që ju përshtatet.', direction: 'aos-from-right' },
            ].map(item => (
              <AnimateOnScroll key={item.step} className={item.direction}>
                <div className="text-center relative z-10">
                  <div className="text-4xl mb-4 step-icon-pulse inline-block">{item.icon}</div>
                  <div className="text-xs font-bold text-[#1B4FFF] mb-2">HAPI {item.step}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="bg-gradient-to-br from-[#FFFFFF] to-[#F5F8FF] py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll className="aos-fade-up">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Pse Bleje Banesën?</h2>
          </AnimateOnScroll>

          <AnimateOnScroll className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Star className="h-6 w-6 text-[#1B4FFF]" />, title: '30 ditë falas', desc: 'Posto banesën pa paguar asgjë për muajin e parë.' },
              { icon: <Shield className="h-6 w-6 text-[#1B4FFF]" />, title: 'Siguri e plotë', desc: 'Çdo shitës verifikohet me numër telefoni real.' },
              { icon: <Globe className="h-6 w-6 text-[#1B4FFF]" />, title: 'Gjithë rajoni', desc: 'Kosovë, Shqipëri, Maqedoni e Veriut — një platformë.' },
              { icon: <Building2 className="h-6 w-6 text-[#1B4FFF]" />, title: 'Vetëm shqip', desc: 'Platforma e vetme e dedikuar plotësisht për tregun shqipfolës.' },
            ].map(item => (
              <div key={item.title} className="aos-fade-up why-card bg-white rounded-2xl p-6 border border-gray-100 text-center">
                <div className="why-icon w-12 h-12 bg-[#1B4FFF]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </AnimateOnScroll>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#1B4FFF] to-[#1640CC] py-12 sm:py-16 mx-0 sm:mx-4 lg:mx-8 rounded-none sm:rounded-2xl lg:rounded-3xl mb-16 max-w-7xl lg:mx-auto">
        {/* Shimmer overlay */}
        <div className="cta-shimmer" />

        {/* Floating dots */}
        <div className="absolute inset-0 pointer-events-none">
          <span className="cta-dot" />
          <span className="cta-dot" />
          <span className="cta-dot" />
          <span className="cta-dot" />
          <span className="cta-dot" />
        </div>

        <AnimateOnScroll className="relative z-10 text-center px-6 aos-fade-up">
          <h2 className="text-3xl font-bold mb-4 text-white drop-shadow-sm">Gati për të shitur ose dhënë me qira?</h2>
          <p className="text-white/90 mb-8 text-lg">Posto banesën tënde sot — falas për 30 ditët e para.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/posto-banese">
              <Button className="cta-glow bg-white text-[#1B4FFF] hover:bg-white/95 font-semibold px-8 h-12">
                Posto banesën falas
              </Button>
            </Link>
            <Link href="/listings">
              <Button variant="outline" className="cta-glow border-white text-white hover:bg-white/10 px-8 h-12">
                Shiko banesat
              </Button>
            </Link>
          </div>
        </AnimateOnScroll>
      </section>
    </>
  )

  return (
    <main className="min-h-screen bg-[#F8F9FF]">
      {/* Hero — cinematic Kosovo skyline background */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#0F1D4D] min-h-[760px] flex flex-col">
        <KosovoSkyline />

        {/* Top contrast gradient for white text */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b from-[rgba(15,29,77,0.6)] to-transparent z-10" />

        {/* Bottom fade into page background */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#F8F9FF] via-[#F8F9FF]/85 to-transparent z-10" />

        <div className="relative z-20 flex-1 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-28">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm mb-6 text-white font-medium border border-white/10">
                🇽🇰 🇦🇱 🇲🇰 Platforma kryesore shqipfolëse e banesave
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6 leading-tight text-white drop-shadow-lg">
                Gjej shtëpinë e{' '}
                <span className="text-white">ëndrrave</span>
              </h1>
              <p className="text-xl text-white/90 mb-10 drop-shadow">
                Bli, shit ose jep me qira banesën tënde në Prishtinë, Prizren, Pejë dhe gjithë rajonin.
              </p>

              {/* Search Bar */}
              <SearchBar />

              {/* Quick filters */}
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                {['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë'].map(city => (
                  <Link key={city} href={`/listings?city=${encodeURIComponent(city)}`}>
                    <span className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-full cursor-pointer transition-all border border-white/10 backdrop-blur-sm">
                      {city}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar — shows skeleton while loading */}
        <div className="relative z-20 bg-[#F8F9FF] border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 md:gap-16">
              {loading ? (
                <>
                  {['Banesa aktive', 'Shitës të besuar', 'Qytete', 'Falas për fillim'].map(label => (
                    <div key={label} className="text-center">
                      <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mx-auto mb-1" />
                      <p className="text-gray-400 text-sm">{label}</p>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {[
                    { value: `+${data?.totalListings ?? 0}`, label: 'Banesa aktive' },
                    { value: `+${data?.totalUsers ?? 0}`, label: 'Shitës të besuar' },
                    { value: '7', label: 'Qytete' },
                    { value: '30 ditë', label: 'Falas për fillim' },
                  ].map(stat => (
                    <div key={stat.label} className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-gray-400 text-sm">{stat.label}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Error state */}
      {error && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-700 mb-3">{error}</p>
            <Button
              variant="outline"
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
      <section className="dot-grid max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">⭐ Të rekomanduara</h2>
            <p className="text-gray-500 text-sm mt-1">Listimet e zgjedhura me kujdes</p>
          </div>
          <Link href="/listings">
            <Button variant="outline" className="border-gray-200">Shiko të gjitha →</Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
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
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-400">Asnjë listim i rekomanduar për momentin.</p>
          </div>
        ) : null}
      </section>

      {/* Latest Listings — skeleton while loading */}
      <section className="dot-grid max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🏠 Banesat më të reja</h2>
            <p className="text-gray-500 text-sm mt-1">Listimet e fundit në platformë</p>
          </div>
          <Link href="/listings">
            <Button variant="outline" className="border-gray-200">Shiko të gjitha →</Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
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
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="text-5xl mb-4">🏠</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Ende nuk ka listrime</h3>
            <p className="text-gray-500 mb-6">Bëhu i pari që poston një banesë!</p>
            <Link href="/posto-banese">
              <Button className="bg-[#1B4FFF] hover:bg-[#1640CC] text-white">
                Posto banesën tënde falas
              </Button>
            </Link>
          </div>
        ) : null}
      </section>

      {staticSections}

      <ScrollToTop />
    </main>
  )
}
