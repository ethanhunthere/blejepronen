import Link from 'next/link'
import Image from 'next/image'
import { createPublicSupabaseClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
import HomeHero from '@/components/HomeHero'
import FavoritableListingsGrid from '@/components/FavoritableListingsGrid'
import ScrollToTop from '@/components/ScrollToTop'
import { Button } from '@/components/ui/button'

export const revalidate = 300

const STEPS = [
  {
    title: 'Kërko',
    text: 'Shkruaj qytetin ose adresën në kërkim dhe shiko pronat me foto e çmim.',
  },
  {
    title: 'Kontakto',
    text: 'Dërgo mesazh direkt pronarit nga faqja e pronës. Pa ndërmjetës.',
  },
  {
    title: 'Merr çelësat',
    text: 'Merresh vesh me pronarin për çmimin dhe vizitën. Pa komisione.',
  },
]

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
              className="inline-flex items-center justify-center w-full sm:w-auto min-h-[48px] h-12 px-6 bg-[#006459] text-white rounded-xl text-[16px] font-semibold hover:bg-[#005048] transition-colors cursor-pointer"
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
            <Link href="/listings" className="inline-flex items-center min-h-[48px] h-12 text-[16px] font-semibold text-[#006459] px-6 rounded-full border border-[#006459]/30 bg-white hover:bg-[#006459] hover:text-white transition-colors cursor-pointer whitespace-nowrap">
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
              <h3 className="text-lg font-semibold text-[#101828] mb-2">Ende nuk ka listime</h3>
              <p className="text-gray-600 text-[16px] mb-6">Bëhu i pari që poston pronën tënde në platformën tonë falas!</p>
              <Link href="/posto-prona">
                <Button className="h-12 w-full sm:w-auto px-6 bg-[#006459] text-white text-[16px] rounded-xl font-semibold hover:bg-[#005048] transition-colors">
                  Posto pronën tënde falas
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How it works — plain numbered steps, no decorative panels */}
      <section className="w-full bg-[#F7FAF9] px-4 sm:px-6 lg:px-8 2xl:px-12 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="h-1 w-12 rounded-full bg-[#C8B882] mb-4 mx-auto" />
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#101828]">
            Si funksionon
          </h2>

          <ol className="mt-8 space-y-6 text-left">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#006459] text-[17px] font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[18px] font-bold text-[#101828]">{s.title}</h3>
                  <p className="mt-1 text-[16px] leading-relaxed text-gray-600">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Single clear call to action */}
      <section className="bg-[#006459] px-4 sm:px-6 lg:px-8 2xl:px-12 py-12 sm:py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Ke një pronë për të shitur ose dhënë me qira?
        </h2>
        <p className="mt-2 text-[16px] text-white/85">
          Postimi është falas për 30 ditët e para.
        </p>
        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/posto-prona"
            className="inline-flex items-center justify-center h-12 w-full sm:w-auto rounded-2xl bg-white px-8 text-[16px] font-semibold text-[#006459] shadow-lg shadow-black/20 transition-colors hover:bg-[#C8B882] cursor-pointer"
          >
            Posto pronën falas
          </Link>
          <Link
            href="/listings"
            className="inline-flex items-center justify-center h-12 w-full sm:w-auto rounded-2xl border border-white/40 px-8 text-[16px] font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer"
          >
            Shiko pronat
          </Link>
        </div>
      </section>

      <ScrollToTop />
    </main>
  )
}
