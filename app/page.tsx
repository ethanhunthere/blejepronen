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
          <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-6 text-center max-w-xl mx-auto">
            <p className="text-red-700 mb-4 text-[15px] font-medium">Kërkesa dështoi. Ju lutemi provoni përsëri më vonë.</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center min-h-[44px] px-6 bg-[#00675B] text-white rounded-xl text-[15px] font-medium hover:bg-[#004D43] transition-colors cursor-pointer"
            >
              Provo përsëri
            </Link>
          </div>
        </section>
      )}

      {/* Listings Section */}
      <section id="pronat" aria-label="Pronat e disponueshme" className="bg-white w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-12 sm:py-16">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8 sm:mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
                Pronat e disponueshme
              </h2>
              <p className="text-slate-600 text-[15px] sm:text-[16px] mt-1.5 font-normal">
                Pronat më të reja në shitje dhe me qira në platformë
              </p>
            </div>
            <Link
              href="/listings"
              className="inline-flex items-center min-h-[42px] text-sm font-semibold text-[#00675B] px-5 rounded-full border border-slate-200 bg-white hover:border-[#00675B] hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              Shiko të gjitha →
            </Link>
          </div>

          {listings.length > 0 ? (
            <FavoritableListingsGrid listings={listings} />
          ) : (
            <div className="text-center py-16 px-4 bg-slate-50/50 rounded-2xl border border-slate-200/80 max-w-lg mx-auto">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#00675B] shadow-sm flex items-center justify-center">
                <Image src="/logo-white.png" alt="" width={36} height={36} className="w-9 h-9" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1.5">Ende nuk ka listime</h3>
              <p className="text-slate-600 text-sm mb-6 max-w-sm mx-auto">Bëhu i pari që poston pronën tënde në platformë pa asnjë komision.</p>
              <Link href="/posto-prona">
                <Button className="h-11 px-6 bg-[#00675B] text-white text-sm rounded-xl font-medium hover:bg-[#004D43] transition-colors cursor-pointer">
                  Posto pronën falas
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="w-full bg-slate-50/70 border-t border-b border-slate-200/60 px-4 sm:px-6 lg:px-8 2xl:px-12 py-16 sm:py-20">
        <div className="mx-auto max-w-[1400px]">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
              Si funksionon
            </h2>
            <p className="text-slate-600 text-[15px] sm:text-[16px] mt-2 font-normal">
              Proces i drejtpërdrejtë dhe transparent midis blerësve dhe shitësve
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="relative bg-white rounded-2xl p-7 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200">
              <div className="flex items-center justify-between mb-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900 font-semibold text-sm">
                  01
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  Kërkim
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Kërko me saktësi
              </h3>
              <p className="text-[14px] leading-relaxed text-slate-600 font-normal">
                Eksploro mijëra prona me filtra sipas qytetit, çmimit, sipërfaqes dhe tipologjisë në Kosovë, Shqipëri e Diasporë.
              </p>
            </div>

            <div className="relative bg-white rounded-2xl p-7 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200">
              <div className="flex items-center justify-between mb-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900 font-semibold text-sm">
                  02
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  Komunikim
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Kontakto pa ndërmjetës
              </h3>
              <p className="text-[14px] leading-relaxed text-slate-600 font-normal">
                Bisedo drejtpërdrejt me pronarin ose agjencinë përmes telefonatës ose mesazheve direkte pa komisione të fshehura.
              </p>
            </div>

            <div className="relative bg-white rounded-2xl p-7 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200">
              <div className="flex items-center justify-between mb-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900 font-semibold text-sm">
                  03
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  Përfundim
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Mbyll marrëveshjen
              </h3>
              <p className="text-[14px] leading-relaxed text-slate-600 font-normal">
                Cakto vizitën në pronë dhe negocio me kushte transparente dhe marrëveshje të qartë midis palëve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="relative overflow-hidden bg-[#004D43] px-4 sm:px-6 lg:px-8 2xl:px-12 py-16 sm:py-20 text-center">
        <div className="relative mx-auto max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200/80 mb-3">
            Tregu i pronave në Kosovë & Shqipëri
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            Ke një pronë për të shitur ose dhënë me qira?
          </h2>
          <p className="mt-3 text-[15px] sm:text-[16px] text-emerald-100/80 leading-relaxed font-normal">
            Bashkohu me mijëra pronarë. Postimi është i thjeshtë, i shpejtë dhe pa asnjë pagesë të fshehur.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/posto-prona"
              className="inline-flex items-center justify-center min-h-[46px] w-full sm:w-auto rounded-xl bg-white px-7 text-[15px] font-semibold text-[#004D43] shadow-sm transition-all duration-150 hover:bg-slate-100 cursor-pointer"
            >
              Posto pronën falas
            </Link>
            <Link
              href="/listings"
              className="inline-flex items-center justify-center min-h-[46px] w-full sm:w-auto rounded-xl border border-white/20 bg-white/10 px-7 text-[15px] font-medium text-white transition-all duration-150 hover:bg-white/15 cursor-pointer"
            >
              Eksploro tregun
            </Link>
          </div>
        </div>
      </section>

      <ScrollToTop />
    </main>
  )
}
