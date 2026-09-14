'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Building2,
  ExternalLink,
  Share2,
  Settings,
  ShieldCheck,
  CalendarDays,
  Mail,
  Phone,
  MapPin,
  Plus,
  Home,
  MessageCircle,
  Camera,
  Check,
  ArrowRight,
  LogOut,
  Loader2,
  Globe,
} from 'lucide-react'
import type { Profile } from '@/lib/supabase'
import LogoutModal from '@/components/LogoutModal'
import AvatarPickerModal from '@/components/AvatarPickerModal'
import { getAvatarUrl } from '@/lib/avatars'
import { toast } from 'sonner'
import SocialLinksBar from '@/components/SocialIcons'
import { type SocialLinks, hasAnySocial } from '@/lib/socials'
import ProfileSocialStats from '@/components/ProfileSocialStats'
import { revalidateSellerListings } from '@/app/actions'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [isCompany, setIsCompany] = useState(false)
  const [companyDescription, setCompanyDescription] = useState('')
  const [foundedYear, setFoundedYear] = useState('')
  const [nipt, setNipt] = useState('')
  const [officeAddress, setOfficeAddress] = useState('')
  const [website, setWebsite] = useState('')
  const [city, setCity] = useState('')
  const [socials, setSocials] = useState<SocialLinks>({
    instagram: '',
    facebook: '',
    whatsapp: '',
    tiktok: '',
  })
  const [listingsCount, setListingsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      let activeUser = null
      try {
        const { data } = await supabase.auth.getUser()
        activeUser = data?.user || null
      } catch {}

      if (!activeUser) {
        try {
          const { data: sessData } = await supabase.auth.getSession()
          activeUser = sessData?.session?.user || null
        } catch {}
      }

      if (!activeUser) {
        await new Promise((r) => setTimeout(r, 400))
        try {
          const { data } = await supabase.auth.getUser()
          activeUser = data?.user || null
        } catch {}
        if (!activeUser) {
          try {
            const { data: sessData } = await supabase.auth.getSession()
            activeUser = sessData?.session?.user || null
          } catch {}
        }
      }

      if (!activeUser) {
        if (typeof window !== 'undefined' && sessionStorage.getItem('blejepronen_logging_out')) {
          return
        }
        router.push('/login')
        return
      }

      setUserId(activeUser.id)
      setUserEmail(activeUser.email || '')

      const [{ data: prof }, { count: lCount }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id,first_name,last_name,phone,email_verified,avatar_url,created_at,updated_at')
          .eq('id', activeUser.id)
          .single(),
        supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', activeUser.id)
          .eq('is_active', true),
      ])

      setListingsCount(lCount || 0)

      const meta = activeUser.user_metadata || {}
      const isComp =
        meta.account_type === 'company' ||
        Boolean(meta.company_name) ||
        prof?.last_name === 'Kompani'

      setIsCompany(isComp)

      if (meta) {
        if (meta.company_description) setCompanyDescription(meta.company_description)
        if (meta.founded_year) setFoundedYear(String(meta.founded_year))
        if (meta.nipt) setNipt(meta.nipt)
        if (meta.office_address) setOfficeAddress(meta.office_address)
        if (meta.website) setWebsite(meta.website)
        if (meta.city) setCity(meta.city)

        setSocials({
          instagram: meta.instagram || '',
          facebook: meta.facebook || '',
          whatsapp: meta.whatsapp || prof?.phone || '',
          tiktok: meta.tiktok || '',
        })
      }

      if (prof) {
        setProfile(prof as Profile)
      }

      setLoading(false)
    }

    load()
  }, [router, supabase])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploadingAvatar(true)

    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Vetëm foto JPEG, PNG ose WebP lejohen.')
        setUploadingAvatar(false)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Fotoja duhet të jetë më e vogël se 5MB.')
        setUploadingAvatar(false)
        return
      }

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${userId}/${Date.now()}-avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(path)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) throw updateError

      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev))

      // Update cached profile for instant navbar reactivity
      try {
        const cached = localStorage.getItem('bp_profile_cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          parsed.avatarUrl = publicUrl
          localStorage.setItem('bp_profile_cache', JSON.stringify(parsed))
          document.documentElement.style.setProperty('--nav-avatar', `url("${publicUrl}")`)
        }
      } catch {}

      window.dispatchEvent(new CustomEvent('profile-updated'))
      toast.success('Fotoja e profilit u përditësua me sukses!')

      try {
        await revalidateSellerListings(userId)
      } catch (err) {
        console.error('Revalidation notice:', err)
      }
    } catch {
      toast.error('Ngarkimi i fotos dështoi. Provoni përsëri.')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSelectAvatar = async (selectedAvatarUrl: string) => {
    if (!userId) return

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: selectedAvatarUrl })
        .eq('id', userId)

      if (updateError) throw updateError

      setProfile((prev) => (prev ? { ...prev, avatar_url: selectedAvatarUrl } : prev))

      try {
        const cached = localStorage.getItem('bp_profile_cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          parsed.avatarUrl = selectedAvatarUrl
          localStorage.setItem('bp_profile_cache', JSON.stringify(parsed))
          document.documentElement.style.setProperty('--nav-avatar', `url("${selectedAvatarUrl}")`)
        }
      } catch {}

      window.dispatchEvent(new CustomEvent('profile-updated'))
      toast.success('Fotoja e profilit u përditësua me sukses!')

      try {
        await revalidateSellerListings(userId)
      } catch (err) {
        console.error('Revalidation notice:', err)
      }
    } catch {
      toast.error('Përditësimi i fotos dështoi. Provoni përsëri.')
    }
  }

  const handleShareProfile = async () => {
    if (!userId) return
    const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://blejepronen.com'}/profili/${userId}`

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} — Bleje Pronën`,
          text: `Shiko profilin dhe pronat e ${displayName} në Bleje Pronën`,
          url: publicUrl,
        })
        return
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopiedLink(true)
      toast.success('Linku i profilit u kopjua me sukses!')
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      toast.error('Nuk u arrit kopjimi i linkut.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F7F7] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-9 w-9 animate-spin text-[#006459] mx-auto mb-3" />
          <p className="text-xs text-gray-500 font-semibold">Po hapim profilin tuaj...</p>
        </div>
      </div>
    )
  }

  const displayName = isCompany
    ? profile?.first_name || 'Kompania'
    : `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Përdorues'

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('sq-AL', {
        month: 'long',
        year: 'numeric',
      })
    : ''

  const isVerified = profile?.email_verified === true

  const handleLogoutConfirmed = async () => {
    try {
      sessionStorage.setItem('blejepronen_logging_out', '1')
      document.cookie = 'blejepronen_logging_out=1; path=/; max-age=10; SameSite=Lax'
    } catch {}
    try {
      localStorage.removeItem('bp_user_cache')
      localStorage.removeItem('bp_profile_cache')
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-')) localStorage.removeItem(key)
      })
    } catch {}
    try {
      await fetch('/api/logout', { method: 'POST', keepalive: true })
    } catch {}
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {}
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#F2F7F7] py-6 sm:py-10 pb-20 sm:pb-16">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Breadcrumb & Quick Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <Link href="/" className="hover:text-[#006459] transition-colors">
              Ballina
            </Link>
            <span>/</span>
            <span className="text-[#101828] font-bold">Profili Im</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/posto-prona"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#006459] hover:bg-[#005048] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Posto Pronë</span>
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:text-[#006459] hover:border-[#006459]/30 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Cilësimet</span>
            </Link>
          </div>
        </div>

        {/* ====== MASTER PROFILE SHOWCASE HERO ====== */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Avatar + Main Identity Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 text-center sm:text-left">
              {/* Avatar with luxury click-to-change options */}
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div
                  onClick={() => setShowAvatarModal(true)}
                  className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-4 border-white shadow-md bg-gray-100 cursor-pointer group hover:scale-[1.02] transition-all duration-200 ring-2 ring-[#006459]/15"
                  title="Kliko për të ndryshuar avatarin"
                >
                  <Image
                    src={getAvatarUrl(profile?.avatar_url)}
                    alt="Foto Profili"
                    fill
                    sizes="112px"
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                    <Camera className="h-6 w-6 mb-1 drop-shadow" />
                    <span className="text-[10px] font-bold tracking-wide">Ndrysho</span>
                  </div>
                </div>

                {/* Micro Action Pills for Avatar */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAvatarModal(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-[#006459]/10 text-[#006459] hover:bg-[#006459] hover:text-white transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <Camera className="w-3 h-3" />
                    <span>20 Avatarë</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    title="Ngarko foton nga kompjuteri"
                    className="p-1 text-gray-500 hover:text-[#006459] rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              {/* Name, Badges, Details */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#101828] tracking-tight">
                    {displayName}
                  </h1>

                  {isVerified && (
                    <span
                      title="Llogari e Verifikuar"
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      E verifikuar
                    </span>
                  )}

                  {isCompany ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#006459]/10 text-[#006459] border border-[#006459]/20">
                      <Building2 className="h-3 w-3" />
                      Kompani
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      Individual
                    </span>
                  )}
                </div>

                {/* Subtitle Details Row */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-y-1.5 gap-x-4 text-xs sm:text-sm text-gray-500 pt-0.5">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    <span className="font-medium text-gray-700">{userEmail}</span>
                  </span>

                  {profile?.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium text-gray-700">{profile.phone}</span>
                    </span>
                  )}

                  {city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span>{city}</span>
                    </span>
                  )}

                  {memberSince && (
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                      <span>Anëtar nga {memberSince}</span>
                    </span>
                  )}
                </div>

                {/* Instagram-style Social Stats (Listings, Followers, Following) */}
                {userId && (
                  <ProfileSocialStats
                    userId={userId}
                    userName={displayName}
                    listingsCount={listingsCount}
                    className="justify-center sm:justify-start pt-1.5"
                  />
                )}
              </div>
            </div>

            {/* Fast Actions Column */}
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-100 shrink-0">
              {userId && (
                <Link
                  href={`/profili/${userId}`}
                  className="h-10 px-4 rounded-xl bg-white border border-gray-200 hover:border-[#006459]/40 hover:text-[#006459] text-gray-700 font-bold text-xs flex items-center gap-2 shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Profili Publik</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleShareProfile}
                className="h-10 px-4 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-bold text-xs flex items-center gap-2 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">U kopjua</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-gray-500" />
                    <span>Ndaj</span>
                  </>
                )}
              </button>

              <Link
                href="/settings"
                className="h-10 px-4 rounded-xl bg-[#006459] hover:bg-[#005048] text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-[#006459]/20 active:scale-95 transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Ndrysho të Dhënat</span>
              </Link>
            </div>
          </div>

          {/* Description Section */}
          {(companyDescription || isCompany) && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                {isCompany ? 'Rreth Kompanisë' : 'Përshkrim'}
              </h3>
              {companyDescription ? (
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed max-w-3xl">
                  {companyDescription}
                </p>
              ) : (
                <div className="flex items-center justify-between gap-3 text-xs text-gray-500 py-1">
                  <span>Nuk keni vendosur ende një përshkrim për profilin tuaj.</span>
                  <Link
                    href="/settings"
                    className="text-[#006459] font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <span>+ Shto në Cilësime</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ====== 2-COLUMN DASHBOARD BENTO ====== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Col 1 & 2: Quick Property Management & Digital Presence */}
          <div className="md:col-span-2 space-y-6">
            {/* Properties Overview Banner */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#006459]/10 text-[#006459] flex items-center justify-center shrink-0">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#101828]">Pronat e Mia Aktive</h2>
                    <p className="text-xs text-gray-500">
                      Shpalljet tuaja të publikuara në tregun e Kosovës
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-[#006459] border border-emerald-100">
                  {listingsCount} {listingsCount === 1 ? 'pronë' : 'prona'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#101828]">
                    {listingsCount > 0
                      ? `Keni ${listingsCount} pronë të publikuar aktualisht.`
                      : 'Nuk keni asnjë pronë të publikuar ende.'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Mund të shtoni foto, të ndryshoni çmimin ose të fshini shpalljet tuaja në çdo çast.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <Link
                    href="/postimet-e-mia"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:text-[#006459] hover:border-[#006459]/30 transition-all shadow-2xs"
                  >
                    <span>Menaxho</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/posto-prona"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#006459] hover:bg-[#005048] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Shto pronë</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Social Media & Digital Presence Card */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#006459]/10 text-[#006459] flex items-center justify-center shrink-0">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#101828]">
                      Rrjetet Sociale & Lidhja me Blerësit
                    </h2>
                    <p className="text-xs text-gray-500">
                      Shfaqen në kartën e kontaktit në çdo njoftim tuajin
                    </p>
                  </div>
                </div>

                <Link
                  href="/settings?tab=socials"
                  className="text-xs font-bold text-[#006459] hover:underline cursor-pointer"
                >
                  Ndrysho
                </Link>
              </div>

              {hasAnySocial(socials) ? (
                <div className="space-y-3">
                  <SocialLinksBar socials={socials} variant="large" />
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center">
                  <p className="text-xs text-gray-600 mb-3">
                    Nuk keni lidhur ende rrjetet tuaja (Instagram, Facebook, WhatsApp, TikTok).
                  </p>
                  <Link
                    href="/settings?tab=socials"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#006459] text-white hover:bg-[#005048] shadow-xs transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lidh rrjetet sociale tani</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Col 3: Side Card (Account Summary, Fast Links, Logout) */}
          <div className="space-y-6">
            {/* Quick Status Info */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#101828] uppercase tracking-wider text-gray-500">
                Detajet e Llogarisë
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Statusi</span>
                  <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Aktiv & Verifikuar
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Lloji i Llogarisë</span>
                  <span className="font-bold text-gray-900">
                    {isCompany ? 'Kompani / Biznes' : 'Individual'}
                  </span>
                </div>

                {isCompany && foundedYear && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Themeluar</span>
                    <span className="font-bold text-gray-900">{foundedYear}</span>
                  </div>
                )}

                {isCompany && nipt && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">NIPT</span>
                    <span className="font-bold text-gray-900">{nipt}</span>
                  </div>
                )}

                {isCompany && website && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Website</span>
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#006459] hover:underline inline-flex items-center gap-1 truncate max-w-[140px]"
                    >
                      <Globe className="w-3 h-3" />
                      <span>{website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  </div>
                )}

                {isCompany && officeAddress && (
                  <div className="py-2 border-b border-gray-100">
                    <span className="text-gray-500 block mb-0.5">Adresa e Zyrës</span>
                    <span className="font-medium text-gray-900">{officeAddress}</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Link
                  href="/mesazhet"
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-[#006459]/5 border border-gray-200/70 hover:border-[#006459]/30 text-xs font-bold text-gray-800 hover:text-[#006459] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-4 h-4 text-[#006459]" />
                    <span>Bisedat e Mia</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#006459] group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Account Settings & Sign Out Actions */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-2">
              <Link
                href="/settings"
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-700 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-500" />
                <span>Hap të Gjitha Cilësimet</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-rose-50/60 hover:bg-rose-50 text-xs font-bold text-rose-600 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Dil nga Llogaria</span>
              </button>
            </div>
          </div>
        </div>

        {/* Avatar Picker Modal */}
        <AvatarPickerModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          currentAvatarUrl={profile?.avatar_url}
          onSelectAvatar={handleSelectAvatar}
          onTriggerFileUpload={() => fileInputRef.current?.click()}
          isUploadingCustom={uploadingAvatar}
        />

        {/* Logout Modal */}
        <LogoutModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          userName={displayName}
          userEmail={userEmail}
          avatarUrl={getAvatarUrl(profile?.avatar_url)}
          onLogoutConfirmed={handleLogoutConfirmed}
        />
      </div>
    </div>
  )
}
