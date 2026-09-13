'use client'

import PageHeader from '@/components/PageHeader'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Camera, CheckCircle2, Mail, Phone, Calendar, Loader2, AlertTriangle, Trash2, LogOut, Building2, Sparkles, ExternalLink, Share2, Settings } from 'lucide-react'
import type { Profile } from '@/lib/supabase'
import { revalidateSellerListings } from '@/app/actions'
import LogoutModal from '@/components/LogoutModal'
import DeleteAccountModal from '@/components/DeleteAccountModal'
import AvatarPickerModal from '@/components/AvatarPickerModal'
import { getAvatarUrl } from '@/lib/avatars'
import { toast } from 'sonner'
import SocialLinksBar, { InstagramIcon, FacebookIcon, WhatsAppIcon, TikTokIcon } from '@/components/SocialIcons'
import { type SocialLinks, hasAnySocial } from '@/lib/socials'
import ProfileSocialStats from '@/components/ProfileSocialStats'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isCompany, setIsCompany] = useState(false)
  const [companyDescription, setCompanyDescription] = useState('')
  const [foundedYear, setFoundedYear] = useState('')
  const [socials, setSocials] = useState<SocialLinks>({ instagram: '', facebook: '', whatsapp: '', tiktok: '' })
  const [savedSocials, setSavedSocials] = useState<SocialLinks>({ instagram: '', facebook: '', whatsapp: '', tiktok: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [listingsCount, setListingsCount] = useState(0)
  const [formData, setFormData] = useState({ first_name: '', last_name: '', phone: '' })
  const [userEmail, setUserEmail] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
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

      const user = activeUser

      const [{ data: prof }, { count: lCount }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id,first_name,last_name,phone,email_verified,avatar_url,created_at,updated_at')
          .eq('id', user.id)
          .single(),
        supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_active', true),
      ])

      setListingsCount(lCount || 0)

      const isComp = user.user_metadata?.account_type === 'company' || Boolean(user.user_metadata?.company_name) || prof?.last_name === 'Kompani'
      setIsCompany(isComp)

      if (user.user_metadata) {
        if (user.user_metadata.company_description) setCompanyDescription(user.user_metadata.company_description)
        if (user.user_metadata.founded_year) setFoundedYear(String(user.user_metadata.founded_year))
        const loadedSocials: SocialLinks = {
          instagram: user.user_metadata.instagram || '',
          facebook: user.user_metadata.facebook || '',
          whatsapp: user.user_metadata.whatsapp || '',
          tiktok: user.user_metadata.tiktok || '',
        }
        setSocials(loadedSocials)
        setSavedSocials(loadedSocials)
      }

      if (prof) {
        setProfile(prof as Profile)
        setFormData({
          first_name: prof.first_name || '',
          last_name: isComp && prof.last_name === 'Kompani' ? '' : (prof.last_name || ''),
          phone: prof.phone || '',
        })
      }
      setUserEmail(user?.email || '')
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let phoneToSave = formData.phone?.trim() || ''
    if (phoneToSave) {
      try {
        const checkRes = await fetch('/api/check-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneToSave, userId: user.id }),
        })
        const checkData = await checkRes.json()
        if (!checkRes.ok || !checkData.available) {
          setError(checkData.error || 'Ky numër telefoni është i regjistruar tashmë në një llogari tjetër.')
          setSaving(false)
          return
        }
        if (checkData.normalized) phoneToSave = checkData.normalized
      } catch (err) {
        console.error('Check phone error in profile:', err)
      }
    }

    const payload = {
      first_name: formData.first_name.trim(),
      last_name: isCompany ? (formData.last_name.trim() || 'Kompani') : formData.last_name.trim(),
      phone: phoneToSave,
    }

    const { error: err } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)

    if (err) { setError('Gabim gjatë ruajtjes.'); setSaving(false); return }

    const socialsPayload = {
      instagram: socials.instagram?.trim() || '',
      facebook: socials.facebook?.trim() || '',
      whatsapp: socials.whatsapp?.trim() || '',
      tiktok: socials.tiktok?.trim() || '',
    }

    try {
      await supabase.auth.updateUser({
        data: {
          ...(isCompany
            ? {
                company_description: companyDescription.trim(),
                founded_year: foundedYear.trim(),
                contact_person: formData.last_name.trim(),
              }
            : {}),
          ...socialsPayload,
        },
      })
    } catch (metaErr) {
      console.error('Update user_metadata in profile page:', metaErr)
    }

    try {
      await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: payload.first_name,
          lastName: payload.last_name,
          phone: payload.phone,
          isCompany,
          companyDescription: companyDescription.trim(),
          foundedYear: foundedYear.trim(),
          ...socialsPayload,
        }),
      })
    } catch (apiErr) {
      console.error('API profile save sync error in profile page:', apiErr)
    }

    setSavedSocials(socialsPayload)

    setProfile(prev => prev ? { ...prev, ...payload } : prev)
    // Bust ISR cache + client router cache so listing pages reflect the new
    // phone / name immediately - even on client-side navigation.
    try {
      await revalidateSellerListings(user.id)
    } catch (e) {
      console.error('Failed to revalidate listing pages after profile update:', e)
    }
    router.refresh()
    setSuccess(true)
    setEditMode(false)
    setTimeout(() => setSuccess(false), 3000)
    setSaving(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Vetëm foto JPEG, PNG ose WebP lejohen.')
        setUploadingAvatar(false)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Fotoja duhet të jetë më e vogël se 5MB.')
        setUploadingAvatar(false)
        return
      }

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${Date.now()}-avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev)

      // Update cached profile for instant navbar update
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
        await revalidateSellerListings(user.id)
      } catch (e) {
        console.error('Failed to revalidate after avatar upload:', e)
      }
      router.refresh()
    } catch {
      setError('Ngarkimi i fotos dështoi. Provo përsëri.')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSelectAvatar = async (selectedAvatarUrl: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: selectedAvatarUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile(prev => (prev ? { ...prev, avatar_url: selectedAvatarUrl } : prev))

      // Update cached profile for instant navbar update
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
        await revalidateSellerListings(user.id)
      } catch (e) {
        console.error('Failed to revalidate after avatar change:', e)
      }
      router.refresh()
    } catch {
      setError('Përditësimi i fotos dështoi. Provo përsëri.')
    }
  }

  const handleConfirmDelete = async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        setError(errData?.message || 'Ndodhi një gabim gjatë fshirjes së llogarisë.')
        return false
      }

      try {
        sessionStorage.setItem('blejepronen_logging_out', '1')
        document.cookie = 'blejepronen_logging_out=1; path=/; max-age=10; SameSite=Lax'
      } catch {}
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) localStorage.removeItem(key)
        })
      } catch {}

      await supabase.auth.signOut({ scope: 'local' })
      try {
        await fetch('/api/logout', { method: 'POST', keepalive: true })
      } catch {}

      return true
    } catch (err) {
      console.error('Delete account error:', err)
      return false
    }
  }

  const handleDirectLogout = async () => {
    try {
      sessionStorage.setItem('blejepronen_logging_out', '1')
      document.cookie = 'blejepronen_logging_out=1; path=/; max-age=10; SameSite=Lax'
    } catch {}
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key)
      })
    } catch {}
    try {
      await fetch('/api/logout', { method: 'POST', keepalive: true })
    } catch {}
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {}
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F2F7F7] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#101828]" />
    </div>
  )

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const isVerified = profile?.email_verified === true

  return (
    <div className="min-h-screen bg-[#F2F7F7] py-10">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
        <PageHeader title="Profili im" />

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="text-green-700">Profili u ruajt!</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Profile Card */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2.5 flex-shrink-0">
              <div
                onClick={() => setShowAvatarModal(true)}
                className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm bg-gray-100 cursor-pointer group hover:border-[#006459]/40 hover:shadow-md transition-all duration-200"
                title="Kliko për të zgjedhur një avatar"
              >
                <Image
                  src={getAvatarUrl(profile?.avatar_url)}
                  alt="Avatar"
                  fill
                  sizes="96px"
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Sparkles className="h-6 w-6 drop-shadow" />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#006459]/10 text-[#006459] hover:bg-[#006459] hover:text-white transition-all cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3 h-3" />
                  Zgjidh avatar
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Ngarko foton tënde nga kompjuteri"
                  className="p-1.5 text-gray-500 hover:text-[#006459] rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
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

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              {isVerified ? (
                <>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <h2 className="text-xl font-semibold text-[#101828]">
                      {profile?.first_name} {isCompany ? (profile?.last_name && profile?.last_name !== 'Kompani' ? `(${profile.last_name})` : '') : profile?.last_name}
                    </h2>
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-600 border border-green-200 rounded-full px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" /> E verifikuar
                    </span>
                    {isCompany && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#006459]/10 text-[#006459] border border-[#006459]/20 rounded-full px-2.5 py-0.5">
                        <Building2 className="h-3 w-3" /> Kompani
                      </span>
                    )}
                  </div>

                  {profile && (
                    <ProfileSocialStats
                      userId={profile.id}
                      userName={isCompany ? (formData.first_name || 'Kompania') : `${formData.first_name} ${formData.last_name}`.trim()}
                      listingsCount={listingsCount}
                      className="justify-center sm:justify-start my-1"
                    />
                  )}

                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600 text-sm">
                      <Mail className="h-4 w-4" />
                      <span className="text-[#101828] font-medium">{userEmail}</span>
                    </div>
                    {profile?.phone && (
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600 text-sm">
                        <Phone className="h-4 w-4" />
                        <span className="text-[#101828] font-medium">{profile.phone}</span>
                      </div>
                    )}
                    {isCompany && foundedYear && (
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600 text-sm">
                        <Calendar className="h-4 w-4" />
                        <span className="text-gray-500 text-xs uppercase tracking-wider mr-1">Operon që nga viti</span>
                        <span className="text-[#101828] font-medium">{foundedYear}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span className="text-gray-500 text-xs uppercase tracking-wider mr-1">Anëtar që nga</span>
                      <span className="text-[#101828] font-medium">{memberSince}</span>
                    </div>
                  </div>
                  {isCompany && companyDescription && (
                    <div className="mt-3.5 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs sm:text-sm text-gray-700 leading-relaxed text-left">
                      <p className="font-semibold text-gray-900 text-xs mb-1">Rreth kompanisë:</p>
                      <p>{companyDescription}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <h2 className="text-xl font-semibold text-[#101828]">
                      {profile?.first_name || 'Profili im'} {isCompany ? (profile?.last_name && profile?.last_name !== 'Kompani' ? `(${profile.last_name})` : '') : (profile?.last_name || '')}
                    </h2>
                    {isCompany && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#006459]/10 text-[#006459] border border-[#006459]/20 rounded-full px-2.5 py-0.5">
                        <Building2 className="h-3 w-3" /> Kompani
                      </span>
                    )}
                  </div>

                  {profile && (
                    <ProfileSocialStats
                      userId={profile.id}
                      userName={isCompany ? (formData.first_name || 'Kompania') : `${formData.first_name} ${formData.last_name}`.trim()}
                      listingsCount={listingsCount}
                      className="justify-center sm:justify-start my-1"
                    />
                  )}

                  <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600 text-sm mb-1">
                    <Mail className="h-4 w-4" />
                    <span className="text-[#101828] font-medium">{userEmail}</span>
                  </div>
                  <p className="text-sm font-medium text-amber-600 mt-1">Llogaria juaj nuk është e verifikuar</p>
                </>
              )}
            </div>
          </div>

          {profile && (
            <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Sparkles className="h-3.5 w-3.5 text-[#006459]" />
                <span>Profili juaj është i dukshëm për blerësit dhe vizitorët</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/profili/${profile.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006459] hover:underline bg-[#006459]/5 hover:bg-[#006459]/10 px-3 py-1.5 rounded-full transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Shiko si vizitor</span>
                </Link>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-[#006459] bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
                >
                  <Settings className="h-3 w-3" />
                  <span>Cilësimet</span>
                </Link>
              </div>
            </div>
          )}

          {!isVerified && (
            <div className="mt-6 bg-[#006459]/10 border border-[#006459]/30 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#006459]/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-[#101828]" />
                  </div>
                  <p className="text-gray-700 text-sm">
                    Verifikoni llogarinë tuaj për të pasur qasje të plotë në platformë
                  </p>
                </div>
                <Link
                  href={isCompany ? '/completo-profilin-company' : '/completo-profilin-fast'}
                  className="inline-flex items-center justify-center min-h-[44px] rounded-xl px-5 py-2.5 text-sm font-semibold bg-[#006459] text-white hover:bg-[#005048] hover:shadow-lg hover:shadow-[#006459]/25 hover:-translate-y-[1px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-out whitespace-nowrap cursor-pointer"
                >
                  Verifiko tani →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Socials Card in View Mode */}
        {isVerified && !editMode && (
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[#101828] font-bold text-base flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-[#006459]" />
                  Rrjetet Sociale & Kontakti
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Shfaqen në njoftimet e pronave tuaja dhe te profili publik.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="text-xs font-bold text-[#006459] hover:underline cursor-pointer"
              >
                {hasAnySocial(socials) ? 'Modifiko' : '+ Shto'}
              </button>
            </div>

            {hasAnySocial(socials) ? (
              <SocialLinksBar socials={socials} variant="large" />
            ) : (
              <div className="p-5 rounded-xl bg-gray-50/80 border border-dashed border-gray-200 text-center">
                <p className="text-xs sm:text-sm text-gray-600 mb-3">
                  Nuk keni lidhur ende llogaritë tuaja të Instagram, Facebook, WhatsApp ose TikTok.
                </p>
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#006459] text-white hover:bg-[#005048] shadow-sm transition-all cursor-pointer"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Shto rrjetet sociale tani
                </button>
              </div>
            )}
          </div>
        )}

        {/* Edit Form - verified only */}
        {isVerified && (
          <>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mb-6">
              {!editMode ? (
                <div className="flex items-center justify-between">
                  <h3 className="text-[#101828] font-semibold text-lg">Të dhënat e profilit</h3>
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center justify-center min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold bg-gray-100 text-[#101828] hover:bg-gray-200 hover:shadow-sm hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 ease-out cursor-pointer"
                  >
                    Ndrysho profilin
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-[#101828] font-semibold text-lg mb-5">Ndrysho të dhënat</h3>
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name" className="text-gray-500 text-xs uppercase tracking-wider">
                          {isCompany ? 'Emri i Kompanisë' : 'Emri'}
                        </Label>
                        <Input
                          id="first_name"
                          className="mt-1 h-11 bg-white border-gray-200 text-[#101828] placeholder:text-gray-500 rounded-xl"
                          value={formData.first_name}
                          onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name" className="text-gray-500 text-xs uppercase tracking-wider">
                          {isCompany ? 'Personi kontaktues (opsionale)' : 'Mbiemri'}
                        </Label>
                        <Input
                          id="last_name"
                          className="mt-1 h-11 bg-white border-gray-200 text-[#101828] placeholder:text-gray-500 rounded-xl"
                          value={formData.last_name}
                          onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))}
                          required={!isCompany}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-gray-500 text-xs uppercase tracking-wider">
                        <Phone className="h-3 w-3 inline mr-1" />
                        Numri i telefonit
                      </Label>
                      <Input
                        id="phone"
                        className="mt-1 h-11 bg-white border-gray-200 text-[#101828] placeholder:text-gray-500 rounded-xl"
                        placeholder="+383 44 123 456"
                        value={formData.phone}
                        onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                    {isCompany && (
                      <>
                        <div>
                          <Label htmlFor="founded_year" className="text-gray-500 text-xs uppercase tracking-wider">
                            Nga cili vit operoni?
                          </Label>
                          <Input
                            id="founded_year"
                            type="number"
                            min="1900"
                            max={new Date().getFullYear()}
                            placeholder="psh. 2018"
                            className="mt-1 h-11 bg-white border-gray-200 text-[#101828] placeholder:text-gray-500 rounded-xl"
                            value={foundedYear}
                            onChange={e => setFoundedYear(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="company_description" className="text-gray-500 text-xs uppercase tracking-wider">
                            Përshkrimi i kompanisë (Kush jeni ju?)
                          </Label>
                          <textarea
                            id="company_description"
                            rows={3}
                            placeholder="Shkruani përvojën, specializimin dhe shërbimet e kompanisë suaj..."
                            className="mt-1 w-full p-3 text-sm rounded-xl border border-gray-200 bg-white text-[#101828] placeholder:text-gray-500 focus:border-[#006459] outline-none transition-colors resize-none leading-relaxed"
                            value={companyDescription}
                            onChange={e => setCompanyDescription(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {/* Socials Input Section */}
                    <div className="pt-4 border-t border-gray-100">
                      <div className="mb-3">
                        <Label className="text-[#101828] text-sm font-bold flex items-center gap-1.5">
                          <Share2 className="h-4 w-4 text-[#006459]" />
                          Rrjetet Sociale & Kontakti
                        </Label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Lidhni llogaritë tuaja për t&apos;u shfaqur automatikisht në njoftimet e pronave tuaja dhe te profili publik.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Instagram */}
                        <div>
                          <Label htmlFor="instagram" className="text-gray-600 text-xs font-semibold flex items-center gap-1.5 mb-1">
                            <InstagramIcon className="h-3.5 w-3.5 text-pink-600" />
                            Instagram
                          </Label>
                          <Input
                            id="instagram"
                            placeholder="@perdoruesi ose linku"
                            className="h-11 bg-white border-gray-200 text-[#101828] placeholder:text-gray-400 rounded-xl"
                            value={socials.instagram || ''}
                            onChange={e => setSocials(p => ({ ...p, instagram: e.target.value }))}
                          />
                        </div>

                        {/* Facebook */}
                        <div>
                          <Label htmlFor="facebook" className="text-gray-600 text-xs font-semibold flex items-center gap-1.5 mb-1">
                            <FacebookIcon className="h-3.5 w-3.5 text-[#1877F2]" />
                            Facebook
                          </Label>
                          <Input
                            id="facebook"
                            placeholder="facebook.com/... ose emri"
                            className="h-11 bg-white border-gray-200 text-[#101828] placeholder:text-gray-400 rounded-xl"
                            value={socials.facebook || ''}
                            onChange={e => setSocials(p => ({ ...p, facebook: e.target.value }))}
                          />
                        </div>

                        {/* WhatsApp */}
                        <div>
                          <Label htmlFor="whatsapp" className="text-gray-600 text-xs font-semibold flex items-center gap-1.5 mb-1">
                            <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" />
                            WhatsApp
                          </Label>
                          <Input
                            id="whatsapp"
                            placeholder="+383 44 123 456"
                            className="h-11 bg-white border-gray-200 text-[#101828] placeholder:text-gray-400 rounded-xl"
                            value={socials.whatsapp || ''}
                            onChange={e => setSocials(p => ({ ...p, whatsapp: e.target.value }))}
                          />
                        </div>

                        {/* TikTok */}
                        <div>
                          <Label htmlFor="tiktok" className="text-gray-600 text-xs font-semibold flex items-center gap-1.5 mb-1">
                            <TikTokIcon className="h-3.5 w-3.5 text-gray-900" />
                            TikTok
                          </Label>
                          <Input
                            id="tiktok"
                            placeholder="@perdoruesi ose linku"
                            className="h-11 bg-white border-gray-200 text-[#101828] placeholder:text-gray-400 rounded-xl"
                            value={socials.tiktok || ''}
                            onChange={e => setSocials(p => ({ ...p, tiktok: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        disabled={saving}
                        className="flex-1 h-11 bg-[#006459] text-white rounded-xl font-semibold hover:bg-[#005048] hover:shadow-lg hover:shadow-[#006459]/25 hover:-translate-y-[1px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-out cursor-pointer disabled:hover:translate-y-0 disabled:hover:shadow-none"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ruaj ndryshimet'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditMode(false)
                          if (profile) {
                            setFormData({
                              first_name: profile.first_name,
                              last_name: profile.last_name,
                              phone: profile.phone || '',
                            })
                          }
                          setSocials(savedSocials)
                        }}
                        className="flex-1 h-11 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100 hover:text-[#101828] hover:shadow-sm hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 ease-out cursor-pointer"
                      >
                        Anulo
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>

            {/* Danger Zone */}
            <div className="border border-red-200 bg-red-50/70 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-red-900">Zona e rrezikut</h3>
                <p className="text-xs sm:text-sm text-red-700/80 mt-0.5">
                  Fshirja e llogarisë do të largojë përgjithmonë profilin dhe të gjitha pronat tuaja.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center justify-center min-h-[44px] rounded-xl px-5 py-2.5 text-sm font-semibold bg-white border border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-lg hover:shadow-red-600/25 transition-all duration-200 ease-out cursor-pointer shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Fshij llogarinë
              </button>
            </div>

            {/* Logout Card */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-[#101828]">Shkyçja nga llogaria</h3>
                <p className="text-xs text-gray-500 mt-0.5">Dil nga llogaria në këtë pajisje me siguri të plotë.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="inline-flex items-center justify-center min-h-[44px] rounded-xl px-5 py-2.5 text-sm font-semibold bg-gray-50 border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200 cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Dil nga llogaria
              </button>
            </div>
          </>
        )}

        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          userEmail={userEmail}
          userName={profile ? (isCompany ? profile.first_name : `${profile.first_name} ${profile.last_name}`.trim()) : null}
          isCompany={isCompany}
          avatarUrl={profile?.avatar_url}
          onDeleteConfirmed={handleConfirmDelete}
        />

        <LogoutModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          userEmail={userEmail}
          userName={profile ? (isCompany ? profile.first_name : `${profile.first_name} ${profile.last_name}`.trim()) : null}
          avatarUrl={profile?.avatar_url}
          onLogoutConfirmed={handleDirectLogout}
        />

        <AvatarPickerModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          currentAvatarUrl={profile?.avatar_url}
          onSelectAvatar={handleSelectAvatar}
          onTriggerFileUpload={() => fileInputRef.current?.click()}
          isUploadingCustom={uploadingAvatar}
        />
      </div>
    </div>
  )
}
