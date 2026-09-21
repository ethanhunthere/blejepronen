import Link from 'next/link'
import Image from 'next/image'
import { createPublicSupabaseClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
import HomeHero from '@/components/HomeHero'
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
    console.error('Homepage fetch exception:', err)
    error = true
  }

  return (
    <main className="min-h-screen bg-white">
      <HomeHero />

      {/* Error state */}
      {error && (
        <section className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-600 mb-3 text-[16px]">Kërkesa dështoi. Ju lutemi provoni përsëri më vonë.</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full sm:w-auto min-h-[48px] h-12 px-6 bg-[#00675B] text-white rounded-xl text-[16px] font-semibold hover:bg-[#004D43] transition-colors cursor-pointer"
            >
              Provo përsëri
            </Link>
          </div>
        </section>
      )}

      {/* Listings — the real content of the platform */}
      <section id="pronat" aria-label="Pronat e disponueshme" className="bg-white w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-10 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="h-1 w-12 rounded-full bg-[#C8B882] mb-3" />
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#101828]">
                Pronat e disponueshme
              </h2>
              <p className="text-gray-600 text-[16px] mt-1.5">
                Të gjitha pronat në shitje dhe me qira, të postuara së fundmi.
              </p>
            </div>
            <Link href="/listings" className="inline-flex items-center min-h-[48px] h-12 text-[16px] font-semibold text-[#00675B] px-6 rounded-full border border-[#00675B]/30 bg-white hover:bg-[#00675B] hover:text-white transition-colors cursor-pointer whitespace-nowrap">
              Shiko të gjitha →
            </Link>
          </div>

          {listings.length > 0 ? (
            <FavoritableListingsGrid listings={listings} />
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#00675B] shadow-[0_12px_24px_-8px_rgba(0,100,89,0.5)] flex items-center justify-center">
                <Image src="/logo-white.png" alt="" width={40} height={40} className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-semibold text-[#101828] mb-2">Ende nuk ka listime</h3>
              <p className="text-gray-600 text-[16px] mb-6">Bëhu i pari që poston pronën tënde në platformën tonë falas!</p>
              <Link href="/posto-prona">
                <Button className="h-12 w-full sm:w-auto px-6 bg-[#00675B] text-white text-[16px] rounded-xl font-semibold hover:bg-[#004D43] transition-colors">
                  Posto pronën tënde falas
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How it works — architectural 3-column grid */}
      <section className="w-full bg-[#F7FAF9] px-4 sm:px-6 lg:px-8 2xl:px-12 py-14 sm:py-20">
        <div className="mx-auto max-w-[1400px]">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <div className="h-1 w-12 rounded-full bg-[#C8B882] mb-4 mx-auto" />
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#101828]">
              Si funksionon
            </h2>
            <p className="text-gray-600 text-[16px] mt-2">
              Procesi më i thjeshtë dhe transparent për të gjetur ose shitur pronën tuaj.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="group relative bg-white rounded-3xl p-8 border border-gray-200/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_-8px_rgba(0,100,89,0.12)] hover:border-[#00675B]/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00675B]/10 text-[#00675B] font-bold text-lg group-hover:scale-105 group-hover:bg-[#00675B] group-hover:text-white transition-all duration-300">
                  01
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
                  Kërkim
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#101828] mb-2">
                Kërko me saktësi
              </h3>
              <p className="text-[15px] leading-relaxed text-gray-600">
                Eksploro mijëra prona me filtra inteligjentë sipas qytetit, çmimit, sipërfaqes dhe tipologjisë në Kosovë, Shqipëri e Diasporë.
              </p>
            </div>

            <div className="group relative bg-white rounded-3xl p-8 border border-gray-200/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_-8px_rgba(0,100,89,0.12)] hover:border-[#00675B]/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00675B]/10 text-[#00675B] font-bold text-lg group-hover:scale-105 group-hover:bg-[#00675B] group-hover:text-white transition-all duration-300">
                  02
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C8B882] bg-[#C8B882]/10 px-3 py-1 rounded-full border border-[#C8B882]/30">
                  Direkt
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#101828] mb-2">
                Kontakto pa ndërmjetës
              </h3>
              <p className="text-[15px] leading-relaxed text-gray-600">
                Dërgo mesazh direkt pronarit ose agjencisë së autorizuar përmes sistemit të sigurt të bisedave pa komisione të fshehura.
              </p>
            </div>

            <div className="group relative bg-white rounded-3xl p-8 border border-gray-200/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_-8px_rgba(0,100,89,0.12)] hover:border-[#00675B]/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00675B]/10 text-[#00675B] font-bold text-lg group-hover:scale-105 group-hover:bg-[#00675B] group-hover:text-white transition-all duration-300">
                  03
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#00675B] bg-[#00675B]/10 px-3 py-1 rounded-full border border-[#00675B]/20">
                  Finalizim
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#101828] mb-2">
                Mbyll marrëveshjen
              </h3>
              <p className="text-[15px] leading-relaxed text-gray-600">
                Cakto vizitën në pronë dhe negocio çmimin me kushte transparente dhe dokumentacion të qartë ligjor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action — elevated editorial finish */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#00675B] via-[#00574D] to-[#004840] px-4 sm:px-6 lg:px-8 2xl:px-12 py-16 sm:py-20 text-center">
        <div className="absolute inset-0 pointer-events-none opacity-25 bg-[radial-gradient(circle_at_top_right,rgba(200,184,130,0.3),transparent_50%)]" />
        <div className="relative mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-white text-xs font-semibold tracking-wide uppercase mb-4 backdrop-blur-sm border border-white/15">
            Posto pronën falas
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Ke një pronë për të shitur ose dhënë me qira?
          </h2>
          <p className="mt-3 text-[17px] text-white/90 max-w-xl mx-auto leading-relaxed">
            Bashkohu me mijëra pronarë e blerës. Postimi është falas për 30 ditët e para pa asnjë detyrim.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/posto-prona"
              className="inline-flex items-center justify-center h-13 min-h-[52px] w-full sm:w-auto rounded-2xl bg-white px-8 text-[16px] font-semibold text-[#00675B] shadow-lg shadow-black/20 transition-all duration-200 hover:bg-[#C8B882] hover:text-[#101828] cursor-pointer"
            >
              Posto pronën falas
            </Link>
            <Link
              href="/listings"
              className="inline-flex items-center justify-center h-13 min-h-[52px] w-full sm:w-auto rounded-2xl border border-white/30 bg-white/10 backdrop-blur-sm px-8 text-[16px] font-semibold text-white transition-all duration-200 hover:bg-white/20 cursor-pointer"
            >
              Shiko të gjitha pronat
            </Link>
          </div>
        </div>
      </section>

      <ScrollToTop />
    </main>
  )
}
