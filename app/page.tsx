import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { Listing } from '@/lib/supabase'
import ListingCard from '@/components/ListingCard'
import SearchBar from '@/components/SearchBar'
import { Button } from '@/components/ui/button'
import { Building2, Shield, Globe, Star } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()

  // Fetch featured listings
  const { data: featuredListings } = await supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(4)

  // Fetch latest listings
  const { data: latestListings } = await supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(8)

  const typedFeatured = (featuredListings || []) as unknown as Listing[]
  const typedLatest = (latestListings || []) as unknown as Listing[]

  // Stats
  const { count: totalListings } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  return (
    <main className="min-h-screen bg-[#F8F9FF]">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1B4FFF] via-[#2D5FFF] to-[#1B4FFF] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center bg-white/10 rounded-full px-4 py-2 text-sm mb-6 backdrop-blur-sm">
              🇽🇰 🇦🇱 🇲🇰 Platforma kryesore shqipfolëse e banesave
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Gjej shtëpinë e{' '}
              <span className="text-yellow-300">ëndrrave</span>
            </h1>
            <p className="text-xl text-blue-100 mb-10">
              Bli, shit ose jep me qira banesën tënde në Prishtinë, Prizren, Pejë dhe gjithë rajonin.
            </p>

            {/* Search Bar */}
            <SearchBar />

            {/* Quick filters */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë'].map(city => (
                <Link key={city} href={`/listings?city=${encodeURIComponent(city)}`}>
                  <span className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full cursor-pointer transition-all">
                    {city}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-white/5 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
              {[
                { value: `+${totalListings || 0}`, label: 'Banesa aktive' },
                { value: `+${totalUsers || 0}`, label: 'Shitës të besuar' },
                { value: '7', label: 'Qytete' },
                { value: '30 ditë', label: 'Falas për fillim' },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-blue-200 text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      {typedFeatured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">⭐ Të rekomanduara</h2>
              <p className="text-gray-500 text-sm mt-1">Listimet e zgjedhura me kujdes</p>
            </div>
            <Link href="/listings">
              <Button variant="outline" className="border-gray-200">Shiko të gjitha →</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {typedFeatured.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* Latest Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🏠 Banesat më të reja</h2>
            <p className="text-gray-500 text-sm mt-1">Listimet e fundit në platformë</p>
          </div>
          <Link href="/listings">
            <Button variant="outline" className="border-gray-200">Shiko të gjitha →</Button>
          </Link>
        </div>

        {typedLatest.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {typedLatest.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
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
        )}
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Si funksionon?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: '🔍', title: 'Kërko', desc: 'Shfleto qindra banesa dhe filtro sipas qytetit, çmimit dhe numrit të dhomave.' },
              { step: '02', icon: '📞', title: 'Kontakto', desc: 'Kontakto direkt shitësin me telefon ose WhatsApp, pa ndërmjetës.' },
              { step: '03', icon: '🏠', title: 'Merr çelësin', desc: 'Bije dakord me shitësin dhe kryej transaksionin në mënyrën që ju përshtatet.' },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <div className="text-xs font-bold text-[#1B4FFF] mb-2">HAPI {item.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Pse Bleje Banesën?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: <Star className="h-6 w-6 text-[#1B4FFF]" />, title: '30 ditë falas', desc: 'Posto banesën pa paguar asgjë për muajin e parë.' },
            { icon: <Shield className="h-6 w-6 text-[#1B4FFF]" />, title: 'Siguri e plotë', desc: 'Çdo shitës verifikohet me numër telefoni real.' },
            { icon: <Globe className="h-6 w-6 text-[#1B4FFF]" />, title: 'Gjithë rajoni', desc: 'Kosovë, Shqipëri, Maqedoni e Veriut — një platformë.' },
            { icon: <Building2 className="h-6 w-6 text-[#1B4FFF]" />, title: 'Vetëm shqip', desc: 'Platforma e vetme e dedikuar plotësisht për tregun shqipfolës.' },
          ].map(item => (
            <div key={item.title} className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
              <div className="w-12 h-12 bg-[#1B4FFF]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                {item.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-gradient-to-r from-[#1B4FFF] to-[#2D6FFF] text-white py-16 mx-4 sm:mx-6 lg:mx-8 rounded-3xl mb-16 max-w-7xl lg:mx-auto">
        <div className="text-center px-6">
          <h2 className="text-3xl font-bold mb-4">Gati për të shitur ose dhënë me qira?</h2>
          <p className="text-blue-100 mb-8 text-lg">Posto banesën tënde sot — falas për 30 ditët e para.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/posto-banese">
              <Button className="bg-white text-[#1B4FFF] hover:bg-blue-50 font-semibold px-8 h-12">
                Posto banesën falas
              </Button>
            </Link>
            <Link href="/listings">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 px-8 h-12">
                Shiko banesat
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
