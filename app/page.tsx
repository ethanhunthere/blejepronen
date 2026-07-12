import Link from 'next/link'
import { createPublicSupabaseClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
import ListingCard from '@/components/ListingCard'
import SearchBar from '@/components/SearchBar'
import AnimateOnScroll from '@/components/AnimateOnScroll'
import ScrollToTop from '@/components/ScrollToTop'
import { Button } from '@/components/ui/button'

export const revalidate = 300

export default async function HomePage() {
  let listings: Listing[] = []
  let error = false

  try {
    const supabase = createPublicSupabaseClient()
    const { data, error: fetchError } = await supabase
      .from('listings')
      .select('id,title,price,city,neighborhood,address,type,images,rooms,area_m2,is_featured,is_active,created_at,user_id,condition,floor,apartment_type,features,free_trial_until,updated_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(12)

    if (fetchError) {
      console.error('Homepage listings fetch error:', fetchError)
      error = true
    } else {
      listings = (data || []) as unknown as Listing[]
    }
  } catch (err) {
    console.error('Homepage listings fetch exception:', err)
    error = true
  }

  return (
    <main className="min-h-screen bg-[#F5F7FA]">
      {/* Hero — search-first, Zillow-inspired */}
      <section
        aria-label="Hero section"
        className="relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #EEF2FF 0%, #FFFFFF 60%)' }}
      >
        <div className="relative z-20 py-20 md:py-28">
          <div className="max-w-[1800px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 w-full">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-[40px] sm:text-[48px] md:text-[64px] font-extrabold tracking-tight text-[#111827] leading-[1.1]">
                Gjej banesën
                <br />
                <span className="text-[#1B4FFF]">e duhur</span> në Kosovë
              </h1>

              <p className="text-[16px] text-[#6B7280] max-w-lg mx-auto leading-relaxed mt-4">
                Bli, shit ose jep me qira banesën tënde duke kontaktuar drejtpërdrejt me pronarët — pa ndërmjetës.
              </p>

              {/* Search Bar */}
              <div className="mt-10">
                <SearchBar
                  placeholder="Kërko banesë, agjent, kompani, adresë..."
                  buttonText="Kërko Banesë"
                />
              </div>

              {/* City strip — horizontal scroll, Airbnb category style */}
              <div className="flex items-center justify-center gap-2 mt-8 overflow-x-auto scrollbar-hide px-1">
                {['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Gjilan', 'Mitrovicë'].map((city) => (
                  <Link
                    key={city}
                    href={`/listings?city=${encodeURIComponent(city)}`}
                    className="flex-shrink-0 text-[13px] font-medium text-[#374151] px-4 py-1.5 rounded-full border border-transparent hover:bg-[#EEF2FF] hover:text-[#1B4FFF] hover:border-[#1B4FFF]/15 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    {city}
                  </Link>
                ))}
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <Link
                  href="/listings"
                  className="bg-[#1B4FFF] text-white font-semibold px-8 py-3 rounded-xl hover:bg-[#1440E8] shadow-sm transition-all duration-200"
                >
                  Shiko banesat
                </Link>
                <Link
                  href="/posto-banese"
                  className="border-2 border-[#1B4FFF] text-[#1B4FFF] font-semibold px-8 py-3 rounded-xl hover:bg-[#1B4FFF] hover:text-white transition-all duration-200"
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
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-600 mb-3">Kërkesa dështoi. Ju lutemi provoni përsëri më vonë.</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full sm:w-auto h-11 px-5 bg-[#1B4FFF] hover:bg-[#1640CC] text-white rounded-xl font-semibold transition-colors"
            >
              Provo përsëri
            </Link>
          </div>
        </section>
      )}

      {/* Unified Listings */}
      <section aria-label="Banesat e disponueshme" className="bg-[#F5F7FA] max-w-[1800px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 sm:py-12 lg:py-16">
        <div className="border-t border-[#F3F4F6] mb-8" />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-[#1A1A2E] border-l-4 border-[#1B4FFF] pl-4">Banesa në Shitje dhe me Qira</h2>
            <p className="text-gray-500 text-sm mt-1">Të gjitha banesat e disponueshme në platformë</p>
          </div>
          <Link href="/listings" className="text-sm font-medium text-gray-600 hover:text-[#1B4FFF] transition-all px-5 py-2.5 rounded-xl border border-gray-300 hover:border-[#1B4FFF]">
            Shiko të gjitha →
          </Link>
        </div>

        {listings.length > 0 ? (
          <AnimateOnScroll className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {listings.map((listing) => (
              <div key={listing.id} className="aos-fade-up">
                <ListingCard listing={listing} />
              </div>
            ))}
          </AnimateOnScroll>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="text-5xl mb-4">🏠</div>
            <h3 className="text-lg font-semibold text-[#1A1A2E] mb-2">Ende nuk ka listime</h3>
            <p className="text-gray-500 mb-6">Bëhu i pari që poston banesën tënde në platformën tonë falas!</p>
            <Link href="/posto-banese">
              <Button className="h-11 w-full sm:w-auto px-5 bg-[#1B4FFF] hover:bg-[#1640CC] text-white rounded-xl font-semibold">
                Posto banesën tënde falas
              </Button>
            </Link>
          </div>
        )}
      </section>

      <ScrollToTop />
    </main>
  )
}
