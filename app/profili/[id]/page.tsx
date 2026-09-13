import { createPublicSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ShieldCheck,
  CalendarDays,
  MapPin,
  Building2,
  Phone,
  MessageCircle,
  Sparkles,
  ChevronLeft,
  Home,
} from 'lucide-react'
import ListingCard from '@/components/ListingCard'
import SocialLinksBar from '@/components/SocialIcons'
import { type SocialLinks, hasAnySocial } from '@/lib/socials'
import { normalizePhoneNumber, formatPhoneDisplay } from '@/lib/phone'
import ProfileShareButton from '@/components/ProfileShareButton'

export const revalidate = 300

interface ProfilePageProps {
  params: Promise<{ id: string }>
}

async function getPublicProfile(id: string) {
  const supabase = await createAdminSupabaseClient()
  const [{ data: profile }, userRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,first_name,last_name,phone,avatar_url,email_verified,created_at')
      .eq('id', id)
      .single(),
    supabase.auth.admin.getUserById(id).catch(() => ({ data: { user: null } })),
  ])

  if (!profile) return null

  const meta = userRes?.data?.user?.user_metadata || {}
  const isCompany =
    meta.account_type === 'company' ||
    Boolean(meta.company_name) ||
    profile.last_name === 'Kompani'

  const displayName = isCompany
    ? (meta.company_name || profile.first_name)
    : `${profile.first_name} ${profile.last_name}`.trim()

  const companyDescription = meta.company_description || ''
  const foundedYear = meta.founded_year ? String(meta.founded_year) : ''

  const socials: SocialLinks = {
    instagram: meta.instagram || null,
    facebook: meta.facebook || null,
    whatsapp: meta.whatsapp || (profile.phone ? profile.phone : null),
    tiktok: meta.tiktok || null,
  }

  return {
    profile,
    meta,
    isCompany,
    displayName,
    companyDescription,
    foundedYear,
    socials,
  }
}

async function getProfileListings(userId: string) {
  const supabase = createPublicSupabaseClient()
  const { data } = await supabase
    .from('listings')
    .select('id,title,price,city,address,rooms,area_m2,type,images,is_featured')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(30)
  return data || []
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { id } = await params
  const data = await getPublicProfile(id)
  if (!data) return { title: 'Profili | Bleje Pronën' }
  return {
    title: `${data.displayName} — Profili dhe Pronat | Bleje Pronën`,
    description: data.companyDescription || `Shiko profilin, rrjetet sociale dhe të gjitha pronat e listuara nga ${data.displayName} në Bleje Pronën.`,
  }
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { id } = await params
  const data = await getPublicProfile(id)

  if (!data) notFound()

  const { profile, isCompany, displayName, companyDescription, foundedYear, socials } = data
  const listings = await getProfileListings(profile.id)

  const memberSince = new Date(profile.created_at).toLocaleDateString('sq-AL', {
    year: 'numeric',
    month: 'long',
  })

  const rawPhone = profile.phone || ''
  const cleanPhone = rawPhone ? normalizePhoneNumber(rawPhone).replace(/\D/g, '') : ''
  const displayPhone = rawPhone ? formatPhoneDisplay(rawPhone) : ''
  const waGreeting = encodeURIComponent(
    `Përshëndetje ${displayName}! Po ju kontaktoj nga platforma Bleje Pronën.`
  )
  const whatsAppUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${waGreeting}`
    : socials.whatsapp
      ? `https://wa.me/${socials.whatsapp.replace(/\D/g, '')}?text=${waGreeting}`
      : null

  return (
    <div className="min-h-screen bg-[#F2F7F7]">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb / Back Link */}
        <Link
          href="/listings"
          className="inline-flex items-center gap-1 text-gray-500 hover:text-[#006459] text-xs sm:text-sm font-semibold mb-6 transition-colors group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Kthehu te të gjitha pronat</span>
        </Link>

        {/* Profile Card Showcase */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6 sm:p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Avatar & Identity Details */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gray-100 overflow-hidden flex-shrink-0 border-4 border-gray-50 shadow-md">
                <Image
                  src={profile.avatar_url || '/avatars/avatar-1.png'}
                  alt={displayName}
                  fill
                  sizes="(max-width: 640px) 96px, 112px"
                  className="object-cover"
                  priority
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#101828] tracking-tight">
                    {displayName}
                  </h1>
                  {profile.email_verified && (
                    <span
                      title="Llogari e Verifikuar"
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      E verifikuar
                    </span>
                  )}
                  {isCompany && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#006459]/10 text-[#006459] border border-[#006459]/20">
                      <Building2 className="h-3 w-3" />
                      Kompani
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs sm:text-sm text-gray-500 mt-2">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    Anëtar që nga {memberSince}
                  </span>
                  {isCompany && foundedYear && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      Operon nga viti {foundedYear}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                    <Home className="h-4 w-4 text-[#006459]" />
                    {listings.length} {listings.length === 1 ? 'pronë e listuar' : 'prona të listuara'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Fast Contact & Share Actions */}
            <div className="flex flex-wrap items-center gap-2.5 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-100">
              {whatsAppUrl && (
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                >
                  <MessageCircle className="h-4 w-4 fill-white" />
                  <span>WhatsApp</span>
                </a>
              )}

              {cleanPhone && (
                <a
                  href={`tel:${profile.phone}`}
                  className="h-10 px-4 rounded-xl bg-[#006459] hover:bg-[#005048] text-white font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                >
                  <Phone className="h-4 w-4" />
                  <span>Telefono ({displayPhone})</span>
                </a>
              )}

              <ProfileShareButton displayName={displayName} />
            </div>
          </div>

          {/* Company Description */}
          {isCompany && companyDescription && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Rreth Kompanisë
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed max-w-3xl">
                {companyDescription}
              </p>
            </div>
          )}
        </div>

        {/* Social Links Section (Stalking & Direct Connections) */}
        {hasAnySocial(socials) && (
          <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6 sm:p-7 mb-8">
            <div className="mb-4">
              <h2 className="text-base sm:text-lg font-bold text-[#101828] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#006459]" />
                Rrjetet Sociale & Prezenca Digjitale
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Ndiqni ose kontaktoni {displayName} direkt në platformat sociale:
              </p>
            </div>

            <SocialLinksBar socials={socials} variant="large" />
          </div>
        )}

        {/* Listings Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#101828] tracking-tight">
              Pronat e listuara nga {displayName}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Të gjitha njoftimet aktive të publikuara nga ky përdorues
            </p>
          </div>
          {listings.length > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-700">
              {listings.length} {listings.length === 1 ? 'pronë' : 'prona'}
            </span>
          )}
        </div>

        {listings.length === 0 ? (
          <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3.5">
              <MapPin className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-[#101828] mb-1">
              Nuk ka prona aktive për momentin
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
              Ky përdorues nuk ka asnjë pronë të publikuar aktualisht. Mund të ktheheni te të gjitha pronat për të parë mundësi të tjera.
            </p>
            <div className="mt-5">
              <Link
                href="/listings"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006459] text-white text-xs font-bold hover:bg-[#005048] shadow-sm transition-all"
              >
                Eksploro pronat
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map(l => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

