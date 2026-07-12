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
      {/* Hero — clean gradient */}
      <section
        aria-label="Hero section"
        className="relative overflow-hidden min-h-[80vh] md:min-h-[85vh] flex flex-col bg-gradient-to-br from-[#1B4FFF] via-[#2563EB] to-[#1E40AF] hero-gradient-animate"
      >
        <div className="relative z-20 flex-1 flex items-center pt-4 md:pt-8">
          <div className="max-w-[1800px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-10 sm:py-14 md:py-18 2xl:py-24 w-full">
            <div className="relative text-center max-w-3xl mx-auto">
              <h1 className="inline-block uppercase text-4xl md:text-5xl lg:text-6xl 2xl:text-8xl font-black text-white leading-tight tracking-tight text-center px-3 sm:px-4 py-2">
                Gjej banesën e duhur në Kosovë
              </h1>

              <p className="inline-block text-lg md:text-xl text-white/80 max-w-2xl mt-6 leading-relaxed text-center mx-auto px-3 sm:px-4 py-2 font-medium">
                Bli, shit ose jep me qira banesën tënde duke kontaktuar drejtpërdrejt me pronarët. Shiko qindra banesa në të gjitha qytetet kryesore të Kosovës.
              </p>

              <p className="inline-block text-white text-xs sm:text-sm text-center mb-3 mt-10 px-3 py-1">
                Kërko sipas qytetit ose lagjes
              </p>

              {/* Search Bar */}
              <SearchBar
                placeholder="Kërko banesë, agjent, kompani, adresë..."
                buttonText="Kërko Banesë"
                className="2xl:max-w-4xl 2xl:h-16"
              />

              {/* City links */}
              <div className="flex items-center justify-center flex-wrap gap-2 mt-6 text-sm">
                {['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Gjilan', 'Mitrovicë'].map((city) => (
                  <Link
                    key={city}
                    href={`/listings?city=${encodeURIComponent(city)}`}
                    className="bg-white/15 hover:bg-white/25 border border-white/30 transition-all duration-200 font-medium text-white rounded-full px-4 py-1.5"
                  >
                    {city}
                  </Link>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
                <Link
                  href="/listings"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl px-8 py-3.5 font-bold bg-white text-[#1B4FFF] hover:bg-gray-50 transition-all duration-300 hover:scale-105 cursor-pointer shadow-xl shadow-black/10"
                >
                  Shiko banesat
                </Link>
                <Link
                  href="/posto-banese"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl px-8 py-3.5 font-semibold border-2 border-white text-white hover:bg-white/10 transition-all duration-300 cursor-pointer"
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
