import Link from 'next/link'
import Image from 'next/image'
import { createPublicSupabaseClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
import ScrollVideoHero from '@/components/ScrollVideoHero'
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
    <main className="min-h-screen bg-white">
      <ScrollVideoHero />

      {/* Error state */}
      {error && (
        <section className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-600 mb-3">Kërkesa dështoi. Ju lutemi provoni përsëri më vonë.</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full sm:w-auto min-h-[44px] h-11 px-5 bg-[#0D9488] text-white rounded-xl font-semibold hover:bg-[#0F766E] hover:shadow-lg hover:shadow-[#0D9488]/25 hover:-translate-y-[1px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-out cursor-pointer"
            >
              Provo përsëri
            </Link>
          </div>
        </section>
      )}

      {/* Unified Listings */}
      <section aria-label="Banesat e disponueshme" className="bg-white w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 sm:py-12 lg:py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="h-1 w-12 rounded-full bg-[#C8B882] mb-3" />
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1A1A2E]">Banesa në Shitje dhe me Qira</h2>
            <p className="text-gray-500 text-sm mt-1.5">Të gjitha banesat e disponueshme në platformë</p>
          </div>
          <Link href="/listings" className="inline-flex items-center min-h-[44px] text-sm font-medium text-gray-600 px-5 py-2.5 rounded-full border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] hover:text-[#0D9488] hover:border-[#0D9488]/40 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 ease-out cursor-pointer">
            Shiko të gjitha →
          </Link>
        </div>

        {listings.length > 0 ? (
          <FavoritableListingsGrid listings={listings} />
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#0D9488] shadow-[0_12px_24px_-8px_rgba(0,100,89,0.5)] flex items-center justify-center">
              <Image src="/logo-white.png" alt="" width={40} height={40} className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-semibold text-[#1A1A2E] mb-2">Ende nuk ka listime</h3>
            <p className="text-gray-500 mb-6">Bëhu i pari që poston banesën tënde në platformën tonë falas!</p>
            <Link href="/posto-banese">
              <Button className="h-11 w-full sm:w-auto px-5 bg-[#0D9488] text-white rounded-xl font-semibold hover:bg-[#0F766E] hover:shadow-lg hover:shadow-[#0D9488]/25 hover:-translate-y-[1px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-out">
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
