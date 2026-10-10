'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import { createClient } from '@/lib/supabase'
import {
  User,
  Building2,
  Lock,
  Camera,
  CheckCircle2,
  Loader2,
  Trash2,
  LogOut,
  ExternalLink,
  Save,
  Eye,
  EyeOff,
  Check,
  MapPin,
  Phone,
  ShieldCheck,
  ArrowLeft,
  X,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import { CITIES } from '@/lib/cities'
import { getAvatarUrl } from '@/lib/avatars'
import AvatarPickerModal, { prepareAvatarImage } from '@/components/AvatarPickerModal'
import LogoutModal from '@/components/LogoutModal'
import DeleteAccountModal from '@/components/DeleteAccountModal'
import { revalidateSellerListings } from '@/app/actions'
import { toast } from 'sonner'

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: 'bg-gray-200' }
  let score = 0
  if (pwd.length >= 8) score += 1
  if (pwd.length >= 12) score += 1
  if (/[0-9]/.test(pwd)) score += 1
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1
  else if (/[^A-Za-z0-9]/.test(pwd)) score += 1

  switch (score) {
    case 0:
    case 1:
      return { score: 1, label: 'Shumë i dobët', color: 'bg-red-500' }
    case 2:
      return { score: 2, label: 'Mesatar', color: 'bg-amber-500' }
    case 3:
      return { score: 3, label: 'I sigurt', color: 'bg-blue-500' }
    case 4:
    default:
      return { score: 4, label: 'Shumë i fortë', color: 'bg-emerald-500' }
  }
}

function getPasswordValidationError(pwd: string): string | null {
  if (pwd.length < 8) return 'Fjalëkalimi duhet të ketë të paktën 8 karaktere.'
  if (getPasswordStrength(pwd).score < 3) {
    return 'Fjalëkalimi është shumë i dobët: përdorni shkronja të mëdha, numra dhe simbole.'
  }
  return null
}

const DUMMY_SAMPLES = new Set([
  'p.sh. alban',
  'p.sh. kelmendi',
  'alban.kelmendi',
  '+383 49 123 456',
  '+38349123456',
  '+383 38 123 456',
  '+38338123456',
  '+383 44 123 456',
  '+38344123456',
  '049123456',
  '038123456',
  '044123456',
])

function sanitizeInitial(val?: string | null): string {
  if (!val || typeof val !== 'string') return ''
  const trimmed = val.trim()
  const lower = trimmed.toLowerCase()
  if (DUMMY_SAMPLES.has(lower)) return ''
  if (lower.startsWith('p.sh.') || lower.startsWith('psh.')) return ''
  return trimmed
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [isGoogleUser, setIsGoogleUser] = useState(false)
  const [isCompany, setIsCompany] = useState(false)

  // Core web-profile fields (10-20% essentials)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('Prishtinë')
  const [avatarUrl, setAvatarUrl] = useState('/avatars/avatar-1.png')

  // Password Update
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Modals & UI
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saveSuccessBanner, setSaveSuccessBanner] = useState(false)
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    }
  }, [])

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
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
        await new Promise((r) => setTimeout(r, 200))
        try {
          const { data } = await supabase.auth.getUser()
          activeUser = data?.user || null
        } catch {}
      }

      if (!activeUser) {
        router.push('/login')
        return
      }

      setCurrentUserId(activeUser.id)
      setUserEmail(activeUser.email || '')

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, email_verified, avatar_url')
        .eq('id', activeUser.id)
        .single()

      const meta = activeUser.user_metadata || {}
      const isComp =
        meta.account_type === 'company' ||
        meta.is_company === true ||
        Boolean(meta.company_name) ||
        prof?.last_name === 'Kompani'

      setIsCompany(isComp)

      const isGoogle = activeUser.app_metadata?.provider === 'google'
      setIsGoogleUser(isGoogle)
      const verified =
        Boolean(prof?.email_verified) ||
        Boolean(activeUser.email_confirmed_at) ||
        Boolean(activeUser.confirmed_at) ||
        isGoogle

      setIsEmailVerified(verified)

      // Set essentials
      const activeFirst = sanitizeInitial(
        isComp
          ? meta.company_name || prof?.first_name || meta.first_name || ''
          : meta.individual_first_name || prof?.first_name || meta.first_name || ''
      )
      const activeLast = sanitizeInitial(
        isComp
          ? ''
          : meta.individual_last_name || (prof?.last_name !== 'Kompani' ? prof?.last_name : '') || meta.last_name || ''
      )
      const activePhone = sanitizeInitial(
        isComp
          ? meta.company_phone || prof?.phone || meta.phone || ''
          : meta.individual_phone || prof?.phone || meta.phone || ''
      )

      setFirstName(activeFirst)
      setLastName(activeLast)
      setPhone(activePhone)
      if (meta.city) setCity(meta.city)
      setAvatarUrl(prof?.avatar_url || meta.avatar_url || '/avatars/avatar-1.png')

      setLoading(false)
    }

    loadUserData()
  }, [router, supabase])

  // Save essential profile settings
  const handleSaveSettings = useCallback(async () => {
    if (!currentUserId) return
    if (!firstName.trim()) {
      toast.error(isCompany ? 'Emri i kompanisë është i detyrueshëm.' : 'Emri është i detyrueshëm.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        city,
        avatarUrl,
        isCompany,
      }

      const res = await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.message || 'Dështoi ruajtja e cilësimeve.')
      }

      // Update local storage cache & broadcast
      try {
        const cached = localStorage.getItem('blejepronen_cached_navbar_profile')
        if (cached) {
          const parsed = JSON.parse(cached)
          parsed.firstName = firstName.trim()
          parsed.lastName = lastName.trim()
          parsed.avatarUrl = avatarUrl
          parsed.isCompany = isCompany
          localStorage.setItem('blejepronen_cached_navbar_profile', JSON.stringify(parsed))
          document.documentElement.style.setProperty('--nav-avatar', `url("${avatarUrl}")`)
        }
      } catch {}
      window.dispatchEvent(new CustomEvent('profile-updated'))

      try {
        await revalidateSellerListings(currentUserId)
      } catch {}

      setSaveSuccessBanner(true)
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
      bannerTimerRef.current = setTimeout(() => {
        setSaveSuccessBanner(false)
      }, 5000)

      toast.success('Cilësimet u ruajtën me sukses!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ndodhi një gabim gjatë ruajtjes.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }, [currentUserId, isCompany, firstName, lastName, phone, city, avatarUrl])

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSaveSettings()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSaveSettings])

  // Password update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = getPasswordValidationError(newPassword)
    if (validationError) {
      toast.error(validationError)
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Fjalëkalimet nuk përputhen.')
      return
    }

    setUpdatingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Fjalëkalimi u ndryshua me sukses!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Dështoi përditësimi i fjalëkalimit.'
      toast.error(message)
    } finally {
      setUpdatingPassword(false)
    }
  }

  // Select Avatar from modal
  const handleSelectAvatar = async (url: string) => {
    setAvatarUrl(url)
    try {
      const { error: avatarErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', currentUserId)
      if (avatarErr) throw avatarErr
      try {
        const cached = localStorage.getItem('blejepronen_cached_navbar_profile')
        if (cached) {
          const parsed = JSON.parse(cached)
          parsed.avatarUrl = url
          localStorage.setItem('blejepronen_cached_navbar_profile', JSON.stringify(parsed))
          document.documentElement.style.setProperty('--nav-avatar', `url("${url}")`)
        }
      } catch {}
      window.dispatchEvent(new CustomEvent('profile-updated'))
      toast.success('Fotoja e profilit u përzgjodh!')
    } catch {
      toast.error('Dështoi ruajtja e fotos.')
    }
  }

  // Direct avatar file upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUserId) return

    setUploadingAvatar(true)
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Vetëm JPEG, PNG ose WebP lejohen.')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Fotoja duhet të jetë nën 5MB.')
        return
      }

      const { blob, ext, contentType } = await prepareAvatarImage(file)
      const path = `${currentUserId}/${Date.now()}-settings.${ext}`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType, upsert: true })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(publicUrl)

      const { error: avatarErr } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUserId)
      if (avatarErr) throw avatarErr

      try {
        const cached = localStorage.getItem('blejepronen_cached_navbar_profile')
        if (cached) {
          const parsed = JSON.parse(cached)
          parsed.avatarUrl = publicUrl
          localStorage.setItem('blejepronen_cached_navbar_profile', JSON.stringify(parsed))
          document.documentElement.style.setProperty('--nav-avatar', `url("${publicUrl}")`)
        }
      } catch {}
      window.dispatchEvent(new CustomEvent('profile-updated'))
      toast.success('Fotoja e profilit u përditësua me sukses!')
    } catch {
      toast.error('Dështoi ngarkimi i fotos së profilit.')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F7F7] flex flex-col items-center justify-center py-20 px-4">
        <Loader2 className="w-9 h-9 animate-spin text-[#00675B] mb-3" />
        <p className="text-sm font-semibold text-gray-500">Duke ngarkuar cilësimet...</p>
      </div>
    )
  }

  const pwdStrength = getPasswordStrength(newPassword)

  return (
    <div className="min-h-screen bg-[#F2F7F7] py-6 sm:py-10 pb-24 sm:pb-12">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation & Header */}
        <div className="mb-4">
          <Link
            href="/profili"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-500 hover:text-[#00675B] transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Kthehu te profili</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <PageHeader
              title="Cilësimet e Llogarisë"
              subtitle="Menaxhoni profilin bazë dhe sigurinë thelbësore të llogarisë tuaj në web."
            />
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {currentUserId && (
              <Link
                href={`/profili/${currentUserId}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl border border-gray-200 bg-white text-gray-700 hover:text-[#00675B] hover:border-[#00675B]/30 hover:shadow-xs transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Profili Publik</span>
              </Link>
            )}
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-[#00675B] hover:bg-[#004D43] text-white shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-75"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Duke ruajtur...' : 'Ruaj ndryshimet'}</span>
            </button>
          </div>
        </div>

        {/* Save Success Banner */}
        {saveSuccessBanner && (
          <div className="mb-6 flex items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-sm animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00675B] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-emerald-950">
                  Cilësimet u ruajtën me sukses!
                </p>
                <p className="text-xs text-emerald-800/80 mt-0.5">
                  Të gjitha ndryshimet janë aktive menjëherë pa rifreskuar faqen.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessBanner(false)}
              className="text-emerald-700 hover:text-emerald-950 p-1.5 rounded-lg hover:bg-emerald-100/70 transition-colors cursor-pointer"
              aria-label="Mbyll njoftimin"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Mobile App Callout (Primary Experience Banner) */}
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-[#004D43] via-[#00675B] to-[#0A8F80] p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#C8B882]" />
                <span>Përvoja e plotë është në Aplikacion</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                Dëshironi njoftime në kohë reale, siguri biometrike dhe personalizim të temës?
              </h3>
              <p className="text-xs sm:text-sm text-white/80 mt-2 leading-relaxed">
                Të gjitha cilësimet e avancuara (Face ID / Touch ID, njoftimet e menjëhershme push, bisedat direkte dhe modaliteti i errët) janë të integruara ekskluzivisht në aplikacionin Bleje Pronën për iOS dhe Android.
              </p>
            </div>

            <div className="shrink-0 flex sm:flex-col items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 transition-all cursor-default">
                <Smartphone className="w-5 h-5 text-white" />
                <div className="text-left">
                  <p className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">Shkarkoni falas</p>
                  <p className="text-xs font-bold text-white">App Store & Google Play</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CORE SECTION 1: PROFILI BAZË (10-20% ESSENTIAL SETTINGS) */}
        {/* ========================================================================= */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-7 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-2xl bg-[#00675B]/10 flex items-center justify-center text-[#00675B]">
                {isCompany ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#101828]">
                  {isCompany ? 'Profili i Kompanisë' : 'Profili Juaj'}
                </h3>
                <p className="text-xs text-gray-500">
                  Të dhënat kryesore të identifikimit në platformë
                </p>
              </div>
            </div>

            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-2xl bg-gray-50/70 border border-gray-100 mb-6">
              <div className="relative group shrink-0 self-start sm:self-center">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-md bg-white">
                  <Image
                    src={getAvatarUrl(avatarUrl)}
                    alt="Foto e profilit"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#00675B] text-white flex items-center justify-center shadow-md hover:bg-[#004D43] transition-all cursor-pointer"
                  title="Ndrysho avatarin"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900">Foto e profilit</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Zgjidhni nga koleksioni i avatarëve ose ngarkoni një foto nga kompjuteri juaj.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setShowAvatarModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:text-[#00675B] hover:border-[#00675B]/30 hover:shadow-xs transition-all cursor-pointer"
                  >
                    Zgjidh Avatar
                  </button>
                  <label className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:text-[#00675B] hover:border-[#00675B]/30 hover:shadow-xs transition-all cursor-pointer flex items-center gap-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                    {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{uploadingAvatar ? 'Duke ngarkuar...' : 'Ngarko Foto'}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Core Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  {isCompany ? 'Emri i Kompanisë / Agjencisë *' : 'Emri *'}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={isCompany ? 'p.sh. Agjencia Pro Real' : 'Emri juaj'}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00675B]/20 focus:border-[#00675B] transition-all bg-white"
                />
              </div>

              {!isCompany && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Mbiemri
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Mbiemri juaj"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00675B]/20 focus:border-[#00675B] transition-all bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Numri i Telefonit (WhatsApp / Kontakt)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+383 49 123 456"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00675B]/20 focus:border-[#00675B] transition-all bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Qyteti Kryesor
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00675B]/20 focus:border-[#00675B] transition-all bg-white appearance-none cursor-pointer"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-[#00675B] hover:bg-[#004D43] text-white shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-75"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{saving ? 'Duke ruajtur...' : 'Ruaj të dhënat'}</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CORE SECTION 2: SIGURIA E FJALËKALIMIT */}
          {/* ========================================================================= */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-7 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#101828]">
                  Siguria dhe Fjalëkalimi
                </h3>
                <p className="text-xs text-gray-500">
                  Përditësoni fjalëkalimin tuaj për të mbrojtur llogarinë
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Fjalëkalimi i Ri *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Të paktën 8 karaktere"
                    className="w-full pl-4 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00675B]/20 focus:border-[#00675B] transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">Fortësia:</span>
                      <span className="font-bold text-gray-700">{pwdStrength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${pwdStrength.color}`}
                        style={{ width: `${(pwdStrength.score / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Konfirmo Fjalëkalimin e Ri *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Përsërisni fjalëkalimin"
                    className="w-full pl-4 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00675B]/20 focus:border-[#00675B] transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updatingPassword || !newPassword || !confirmPassword}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-gray-900 hover:bg-black text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {updatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>{updatingPassword ? 'Duke ndryshuar...' : 'Përditëso Fjalëkalimin'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* ========================================================================= */}
          {/* CORE SECTION 3: VEPRIME TË LLOGARISË */}
          {/* ========================================================================= */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-7 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#101828]">
                  Llogaria Juaj
                </h3>
                <p className="text-xs text-gray-500">
                  Menaxhimi i sesionit dhe privatësisë
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50/70 border border-gray-100 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-gray-900 font-mono">{userEmail}</span>
                  {isEmailVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verifikuar</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ky është emaili zyrtar i identifikimit në platformë.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-gray-200 bg-white text-gray-700 hover:text-gray-900 hover:border-gray-300 transition-all cursor-pointer self-start sm:self-center"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Çkyçu nga llogaria</span>
              </button>
            </div>

            {/* Danger Zone: Delete Account */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-red-600">Zonë e ndjeshme</p>
                <p className="text-[11px] text-gray-500">
                  Fshirja e llogarisë fshin të gjitha shpalljet dhe të dhënat tuaja përgjithmonë.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Fshij llogarinë</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modals */}
        <AvatarPickerModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          onSelectAvatar={handleSelectAvatar}
          currentAvatarUrl={avatarUrl}
        />

        <LogoutModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          userEmail={userEmail}
          userName={firstName || 'Përdorues'}
          avatarUrl={avatarUrl}
          onLogoutConfirmed={async () => {
            await supabase.auth.signOut()
            router.push('/login')
          }}
        />

        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          userEmail={userEmail}
          userName={firstName || 'Përdorues'}
          isCompany={isCompany}
          avatarUrl={avatarUrl}
          onDeleteConfirmed={async () => {
            try {
              const res = await fetch('/api/account/delete', { method: 'POST' })
              if (!res.ok) throw new Error('Dështoi fshirja e llogarisë.')
              await supabase.auth.signOut()
              toast.success('Llogaria u fshi me sukses.')
              router.push('/login')
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Dështoi fshirja e llogarisë.'
              toast.error(msg)
            }
          }}
        />
      </div>
    </div>
  )
}
