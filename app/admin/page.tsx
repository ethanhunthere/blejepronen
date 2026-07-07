import { createServerSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { Profile, Listing } from '@/lib/supabase'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL

interface ListingWithSeller extends Listing {
  profiles: { first_name: string; last_name: string } | null
}

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !ADMIN_EMAIL || user.email !== ADMIN_EMAIL) redirect('/')

  const { data: listings } = await supabase
    .from('listings')
    .select('*, profiles(first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  const typedListings = (listings || []) as unknown as ListingWithSeller[]
  const typedProfiles = (profiles || []) as unknown as Profile[]

  const active = typedListings.filter(l => l.is_active).length
  const total = typedListings.length

  return (
    <div className="min-h-screen bg-[#0A0F2E]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-white mb-8">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Listime totale', value: total },
            { label: 'Listime aktive', value: active },
            { label: 'Listime joaktive', value: total - active },
            { label: 'Përdorues', value: typedProfiles.length },
          ].map(stat => (
            <div key={stat.label} className="bg-[#111936] rounded-2xl p-5 border border-white/10 text-center">
              <p className="text-3xl font-bold text-[#1B4FFF]">{stat.value}</p>
              <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Listings Table */}
        <div className="bg-[#111936] rounded-2xl border border-white/10 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold text-white">Të gjitha listimet</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0D1235]">
                <tr>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-400 font-medium">Titulli</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-400 font-medium">Shitësi</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-400 font-medium">Qyteti</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-400 font-medium">Çmimi</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-400 font-medium">Statusi</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-400 font-medium">Veprimet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {typedListings.map(listing => (
                  <tr key={listing.id} className="hover:bg-white/5">
                    <td className="px-3 py-3 md:px-6 md:py-4 font-medium text-white max-w-xs truncate">
                      {listing.title}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4 text-gray-400">
                      {listing.profiles?.first_name} {listing.profiles?.last_name}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4 text-gray-400">{listing.city}</td>
                    <td className="px-3 py-3 md:px-6 md:py-4 text-white font-medium">€{listing.price.toLocaleString()}</td>
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <Badge className={listing.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                        {listing.is_active ? 'Aktiv' : 'Joaktiv'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/listings/${listing.id}`} className="text-[#1B4FFF] hover:underline text-sm">
                        Shiko →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-[#111936] rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold text-white">Përdoruesit</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0D1235]">
                <tr>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-400 font-medium">Emri</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-400 font-medium">Telefoni</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-400 font-medium">Verifikuar</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-400 font-medium">Regjistruar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {typedProfiles.map(profile => (
                  <tr key={profile.id} className="hover:bg-white/5">
                    <td className="px-3 py-3 md:px-6 md:py-4 font-medium text-white">
                      {profile.first_name} {profile.last_name}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4 text-gray-400">{profile.phone || '—'}</td>
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <Badge className={profile.phone_verified ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                        {profile.phone_verified ? 'Po' : 'Jo'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4 text-gray-400">
                      {new Date(profile.created_at).toLocaleDateString('sq-AL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
