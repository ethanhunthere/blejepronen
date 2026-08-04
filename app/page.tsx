import Link from 'next/link'
import Image from 'next/image'
import { createPublicSupabaseClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
import SearchBar from '@/components/SearchBar'
import FavoritableListingsGrid from '@/components/FavoritableListingsGrid'
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
    <main className="min-h-screen bg-[#F2F7F7]">
      {/* Hero - search-first, Zillow-inspired */}
      <section
        aria-label="Hero section"
        className="relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #F3F4F6 0%, #FFFFFF 60%)' }}
      >
        {/* Ambient brand layer: soft teal + gold light, house watermark */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_0%,rgba(0,100,89,0.08),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(35%_30%_at_88%_10%,rgba(200,184,130,0.16),transparent_70%)]" />
          <Image
            src="/logo-teal.png"
            alt=""
            width={512}
            height={512}
            className="absolute -right-20 -bottom-28 w-[360px] max-w-none opacity-[0.05] -rotate-6"
          />
        </div>
        <div className="relative z-20 py-16 md:py-24">
          <div className="max-w-[1800px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 w-full">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-[40px] sm:text-[48px] md:text-[64px] font-extrabold tracking-tight text-[#111827] leading-[1.1]">
                Gjej banesën
                <br />
                <span className="text-[#111827] underline decoration-[#C8B882] decoration-4 underline-offset-[10px]">e duhur</span> në Kosovë
              </h1>

              <p className="text-[16px] text-[#6B7280] max-w-lg mx-auto leading-relaxed mt-4">
                Bli, shit ose jep me qira banesën tënde duke folur direkt me pronarët, pa ndërmjetës.
              </p>

              {/* Search Bar */}
              <div className="relative z-0 mt-10">
                <SearchBar
                  placeholder="Kërko banesë, agjent, kompani, adresë..."
                  buttonText="Kërko Banesë"
                />
              </div>

              {/* City strip - horizontal scroll, Airbnb category style */}
              {/* outer: handles horizontal scroll; pt-2 gives pills room to translate up without clipping */}
              <div className="relative z-20 mt-10 overflow-x-auto scrollbar-hide px-1 pt-2 pb-1">
                <div className="flex items-center justify-center gap-2 min-w-max mx-auto">
                {['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Gjilan', 'Mitrovicë'].map((city) => (
                  <Link
                    key={city}
                    href={`/listings?city=${encodeURIComponent(city)}`}
                    className="relative flex-shrink-0 text-[13px] font-medium text-[#374151] px-4 py-1.5 rounded-full border border-transparent hover:bg-[#F3F4F6] hover:text-[#006459] hover:border-[#006459]/15 hover:-translate-y-0.5 hover:z-30 transition-all duration-200"
                  >
                    {city}
                  </Link>
                ))}
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <Link
                  href="/listings"
                  className="inline-flex items-center justify-center min-h-[44px] bg-[#006459] text-white font-semibold px-8 py-3 rounded-full shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_8px_20px_-8px_rgba(0,100,89,0.5)] hover:bg-[#005048] hover:shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_14px_28px_-8px_rgba(0,100,89,0.55)] hover:-translate-y-[1px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-out cursor-pointer"
                >
                  Shiko banesat
                </Link>
                <Link
                  href="/posto-banese"
                  className="inline-flex items-center justify-center min-h-[44px] bg-white border-2 border-[#006459] text-[#006459] font-semibold px-8 py-3 rounded-full hover:bg-[#006459] hover:text-white hover:shadow-[0_14px_28px_-8px_rgba(0,100,89,0.45)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 ease-out cursor-pointer"
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
              className="inline-flex items-center justify-center w-full sm:w-auto min-h-[44px] h-11 px-5 bg-[#006459] text-white rounded-xl font-semibold hover:bg-[#005048] hover:shadow-lg hover:shadow-[#006459]/25 hover:-translate-y-[1px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-out cursor-pointer"
            >
              Provo përsëri
            </Link>
          </div>
        </section>
      )}

      {/* Unified Listings */}
      <section aria-label="Banesat e disponueshme" className="bg-[#F2F7F7] max-w-[1800px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 sm:py-12 lg:py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="h-1 w-12 rounded-full bg-[#C8B882] mb-3" />
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#1A1A2E]">Banesa në Shitje dhe me Qira</h2>
            <p className="text-gray-500 text-sm mt-1.5">Të gjitha banesat e disponueshme në platformë</p>
          </div>
          <Link href="/listings" className="inline-flex items-center min-h-[44px] text-sm font-medium text-gray-600 px-5 py-2.5 rounded-full border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] hover:text-[#006459] hover:border-[#006459]/40 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 ease-out cursor-pointer">
            Shiko të gjitha →
          </Link>
        </div>

        {listings.length > 0 ? (
          <FavoritableListingsGrid listings={listings} />
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#006459] shadow-[0_12px_24px_-8px_rgba(0,100,89,0.5)] flex items-center justify-center">
              <Image src="/logo-white.png" alt="" width={40} height={40} className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-semibold text-[#1A1A2E] mb-2">Ende nuk ka listime</h3>
            <p className="text-gray-500 mb-6">Bëhu i pari që poston banesën tënde në platformën tonë falas!</p>
            <Link href="/posto-banese">
              <Button className="h-11 w-full sm:w-auto px-5 bg-[#006459] text-white rounded-xl font-semibold hover:bg-[#005048] hover:shadow-lg hover:shadow-[#006459]/25 hover:-translate-y-[1px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-out">
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
