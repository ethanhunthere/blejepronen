import { createPublicSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, CalendarDays, MapPin } from 'lucide-react'
import ListingCard from '@/components/ListingCard'

export const revalidate = 3600

interface ProfilePageProps {
  params: Promise<{ id: string }>
}

async function getProfile(id: string) {
  const supabase = await createAdminSupabaseClient()
  return supabase
    .from('profiles')
    .select('id,first_name,last_name,avatar_url,email_verified,created_at')
    .eq('id', id)
    .single()
}

async function getProfileListings(userId: string) {
  const supabase = createPublicSupabaseClient()
  const { data } = await supabase
    .from('listings')
    .select('id,title,price,city,address,rooms,area_m2,type,images,is_featured')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(20)
  return data || []
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { id } = await params
  const { data: profile } = await getProfile(id)
  if (!profile) return { title: 'Profili | Bleje Banesën' }
  return {
    title: `${profile.first_name} ${profile.last_name} | Bleje Banesën`,
  }
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { id } = await params
  const { data: profile, error } = await getProfile(id)

  if (error || !profile) notFound()

  const listings = await getProfileListings(profile.id)
  const memberSince = new Date(profile.created_at).toLocaleDateString('sq-AL', {
    year: 'numeric',
    month: 'long',
  })

  return (
    <div className="min-h-screen bg-[#0A0F2E]">
      <div className="max-w-7xl 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <Link
          href="/listings"
          className="inline-flex items-center text-white/40 hover:text-white/60 text-sm mb-8 transition-colors"
        >
          ← Kthehu te banesat
        </Link>

        {/* Profile header */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-[#1B4FFF] overflow-hidden flex-shrink-0 flex items-center justify-center text-white font-bold text-2xl">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                (profile.first_name || '?')[0].toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {profile.first_name} {profile.last_name}
                </h1>
                {profile.email_verified && (
                  <span title="I verifikuar">
                    <ShieldCheck className="h-5 w-5 text-[#1B4FFF]" />
                  </span>
                )}
              </div>
              <p className="text-white/50 text-sm flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Anëtar që nga {memberSince}
              </p>
            </div>
          </div>
        </div>

        {/* Listings */}
        <h2 className="text-xl font-bold text-white mb-6">
          Banesat e {profile.first_name}
          {listings.length > 0 && (
            <span className="text-white/40 font-normal ml-2">
              ({listings.length})
            </span>
          )}
        </h2>

        {listings.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <MapPin className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-lg">
              Ky përdorues nuk ka banesa aktive.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {listings.map(l => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
