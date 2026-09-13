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
  Share2,
  Bell,
  Shield,
  Lock,
  Camera,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  LogOut,
  ExternalLink,
  Save,
  Eye,
  EyeOff,
  Laptop,
  Check,
  Globe,
  MapPin,
  Phone,
  ShieldCheck,
  ArrowLeft,
  ArrowDown,
  AlertCircle,
  X,
} from 'lucide-react'
import { CITIES } from '@/lib/cities'
import { getAvatarUrl } from '@/lib/avatars'
import AvatarPickerModal from '@/components/AvatarPickerModal'
import LogoutModal from '@/components/LogoutModal'
import DeleteAccountModal from '@/components/DeleteAccountModal'
import SocialLinksBar, {
  InstagramIcon,
  FacebookIcon,
  WhatsAppIcon,
  TikTokIcon,
} from '@/components/SocialIcons'
import { revalidateSellerListings } from '@/app/actions'
import { toast } from 'sonner'
import { type SocialLinks, hasAnySocial, normalizeSocialUrl } from '@/lib/socials'

type SettingsTab = 'profile' | 'socials' | 'notifications' | 'privacy' | 'security'

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: 'bg-gray-200' }
  let score = 0
  if (pwd.length >= 6) score += 1
  if (pwd.length >= 9) score += 1
  if (/[0-9]/.test(pwd)) score += 1
  if (/[^A-Za-z0-9]/.test(pwd) || (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd))) score += 1

  switch (score) {
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [isEmailVerified, setIsEmailVerified] = useState(false)

  // Account Type
  const [isCompany, setIsCompany] = useState(false)

  // Profile Fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')

  // Company Specific Fields
  const [companyDescription, setCompanyDescription] = useState('')
  const [foundedYear, setFoundedYear] = useState('')
  const [nipt, setNipt] = useState('')
  const [officeAddress, setOfficeAddress] = useState('')
  const [website, setWebsite] = useState('')

  // Social Links
  const [socials, setSocials] = useState<SocialLinks>({
    instagram: '',
    facebook: '',
    whatsapp: '',
    tiktok: '',
  })
  const [linkedin, setLinkedin] = useState('')
  const [youtube, setYoutube] = useState('')
  const [twitter, setTwitter] = useState('')

  // Notification Preferences
  const [notifications, setNotifications] = useState({
    messages: true,
    inquiries: true,
    followers: true,
    weeklyReport: false,
    newsletter: true,
  })

  // Privacy Settings
  const [privacy, setPrivacy] = useState({
    showPhone: true,
    showSocials: true,
    showOnline: true,
    allowDirectMsgs: true,
    showListingsOnProfile: true,
  })

  // Security / Password Change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Modals
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
        await new Promise((r) => setTimeout(r, 300))
        const { data } = await supabase.auth.getUser()
        activeUser = data?.user || null
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
        Boolean(meta.company_name) ||
        prof?.last_name === 'Kompani'

      setIsCompany(isComp)
      setIsEmailVerified(Boolean(prof?.email_verified))

      if (prof) {
        setFirstName(prof.first_name || '')
        setLastName(isComp && prof.last_name === 'Kompani' ? '' : (prof.last_name || ''))
        setPhone(prof.phone || '')
        setAvatarUrl(prof.avatar_url || '/avatars/avatar-1.png')
      }

      if (meta) {
        if (meta.bio) setBio(meta.bio)
        if (meta.city) setCity(meta.city)
        if (meta.company_description) setCompanyDescription(meta.company_description)
        if (meta.founded_year) setFoundedYear(String(meta.founded_year))
        if (meta.nipt) setNipt(meta.nipt)
        if (meta.office_address) setOfficeAddress(meta.office_address)
        if (meta.website) setWebsite(meta.website)

        setSocials({
          instagram: meta.instagram || '',
          facebook: meta.facebook || '',
          whatsapp: meta.whatsapp || '',
          tiktok: meta.tiktok || '',
        })
        if (meta.linkedin) setLinkedin(meta.linkedin)
        if (meta.youtube) setYoutube(meta.youtube)
        if (meta.twitter) setTwitter(meta.twitter)

        if (meta.notifications) {
          setNotifications((prev) => ({ ...prev, ...meta.notifications }))
        }
        if (meta.privacy) {
          setPrivacy((prev) => ({ ...prev, ...meta.privacy }))
        }
      }

      setLoading(false)
    }

    loadUserData()
  }, [router, supabase])

  // Save changes handler
  const handleSaveSettings = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!currentUserId) return

    setSaving(true)

    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: isCompany ? (lastName.trim() || 'Kompani') : lastName.trim(),
        phone: phone.trim(),
        avatarUrl,
        isCompany,
        accountType: isCompany ? 'company' : 'individual',
        bio: bio.trim(),
        city: city.trim(),
        companyDescription: companyDescription.trim(),
        foundedYear: foundedYear.trim(),
        nipt: nipt.trim(),
        officeAddress: officeAddress.trim(),
        website: website.trim(),
        instagram: socials.instagram?.trim() || '',
        facebook: socials.facebook?.trim() || '',
        whatsapp: socials.whatsapp?.trim() || '',
        tiktok: socials.tiktok?.trim() || '',
        linkedin: linkedin.trim(),
        youtube: youtube.trim(),
        twitter: twitter.trim(),
        notifications,
        privacy,
      }

      const res = await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.message || 'Dështoi ruajtja e të dhënave.')
      }

      // Sync local cache and broadcast instant update to Navbar
      try {
        const cached = localStorage.getItem('bp_profile_cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          parsed.avatarUrl = avatarUrl
          parsed.firstName = firstName.trim()
          parsed.lastName = isCompany ? (lastName.trim() || 'Kompani') : lastName.trim()
          parsed.isCompany = isCompany
          parsed.incomplete = false
          localStorage.setItem('bp_profile_cache', JSON.stringify(parsed))
          document.documentElement.style.setProperty('--nav-avatar', `url("${avatarUrl}")`)
        }
      } catch {}
      window.dispatchEvent(new CustomEvent('profile-updated'))

      // Revalidate listings cache
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
  }, [
    currentUserId,
    firstName,
    lastName,
    phone,
    avatarUrl,
    isCompany,
    bio,
    city,
    companyDescription,
    foundedYear,
    nipt,
    officeAddress,
    website,
    socials,
    linkedin,
    youtube,
    twitter,
    notifications,
    privacy,
  ])

  // Keyboard shortcut Ctrl+S / Cmd+S listener
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

  // Password update handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      toast.error('Fjalëkalimi duhet të ketë të paktën 6 karaktere.')
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

  // Avatar pick from modal
  const handleSelectAvatar = async (url: string) => {
    setAvatarUrl(url)
    try {
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', currentUserId)
      try {
        const cached = localStorage.getItem('bp_profile_cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          parsed.avatarUrl = url
          localStorage.setItem('bp_profile_cache', JSON.stringify(parsed))
          document.documentElement.style.setProperty('--nav-avatar', `url("${url}")`)
        }
      } catch {}
      window.dispatchEvent(new CustomEvent('profile-updated'))
      toast.success('Fotoja e profilit u përzgjodh!')
    } catch {
      toast.error('Dështoi ruajtja e fotos.')
    }
  }

  // Avatar upload from device
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

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${currentUserId}/${Date.now()}-settings.${ext}`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(publicUrl)

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUserId)

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
      toast.success('Fotoja e re u ngarkua me sukses!')
    } catch {
      toast.error('Ngarkimi i fotos dështoi.')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Account deletion confirmed
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
        toast.error(errData?.message || 'Ndodhi një gabim gjatë fshirjes së llogarisë.')
        return false
      }

      try {
        sessionStorage.setItem('blejepronen_logging_out', '1')
        document.cookie = 'blejepronen_logging_out=1; path=/; max-age=10; SameSite=Lax'
      } catch {}
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('sb-') || key.startsWith('bp_')) localStorage.removeItem(key)
        })
      } catch {}

      await supabase.auth.signOut({ scope: 'local' })
      try {
        await fetch('/api/logout', { method: 'POST', keepalive: true })
      } catch {}

      return true
    } catch (err) {
      console.error('Delete account error in settings:', err)
      return false
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F7F7] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-9 w-9 animate-spin text-[#006459] mx-auto mb-3" />
          <p className="text-xs text-gray-500 font-semibold tracking-wide">Duke ngarkuar cilësimet...</p>
        </div>
      </div>
    )
  }

  const tabs: {
    id: SettingsTab
    label: string
    icon: React.ComponentType<{ className?: string }>
  }[] = [
    { id: 'profile', label: isCompany ? 'Profili i Kompanisë' : 'Profili & Llogaria', icon: isCompany ? Building2 : User },
    { id: 'socials', label: 'Rrjetet Sociale', icon: Share2 },
    { id: 'notifications', label: 'Njoftimet', icon: Bell },
    { id: 'privacy', label: 'Privatësia', icon: Shield },
    { id: 'security', label: 'Siguria', icon: Lock },
  ]

  const isCompanyDataComplete = Boolean(
    isCompany &&
    firstName.trim().length > 0 &&
    (companyDescription.trim().length > 0 || nipt.trim().length > 0 || officeAddress.trim().length > 0)
  )

  return (
    <div className="min-h-screen bg-[#F2F7F7] py-6 sm:py-10 pb-24 sm:pb-12">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back navigation to profile */}
        <div className="mb-4">
          <Link
            href="/profili"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-500 hover:text-[#006459] transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Kthehu te profili</span>
          </Link>
        </div>

        {/* Header with Quick Profile View Link and Save CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <PageHeader
              title="Cilësimet"
              subtitle="Menaxhoni profilin, të dhënat e kompanisë, rrjetet sociale, njoftimet dhe sigurinë e llogarisë"
            />
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {currentUserId && (
              <Link
                href={`/profili/${currentUserId}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl border border-gray-200 bg-white text-gray-700 hover:text-[#006459] hover:border-[#006459]/30 hover:shadow-xs transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Profili Publik</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => handleSaveSettings()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-[#006459] hover:bg-[#005048] text-white shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-75"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Duke ruajtur...' : 'Ruaj ndryshimet'}</span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-white/20 text-white rounded-md">
                ⌘S
              </kbd>
            </button>
          </div>
        </div>

        {/* Save Success Banner */}
        {saveSuccessBanner && (
          <div className="mb-6 flex items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-sm animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#006459] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-emerald-950">
                  Cilësimet u ruajtën me sukses!
                </p>
                <p className="text-xs text-emerald-800/80 mt-0.5">
                  Të gjitha ndryshimet tuaja u ruajtën dhe janë aktive menjëherë pa rifreskuar faqen.
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

        {/* Tab Bar Navigation */}
        <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-6 flex overflow-x-auto no-scrollbar gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#006459] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: PROFILI & LLOGARIA */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Interactive Account Type Dual-Card Selector */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-7 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base sm:text-lg font-black text-[#101828]">
                  Zgjidhni Llojin e Llogarisë
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Përcakton se si shfaqeni në njoftimet e pronave dhe në profilin publik para mijëra blerësve.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option 1: Individual */}
                <div
                  onClick={() => setIsCompany(false)}
                  className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    !isCompany
                      ? 'border-[#006459] bg-[#006459]/[0.03] shadow-sm ring-2 ring-[#006459]/10'
                      : 'border-gray-200 bg-gray-50/40 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-colors ${
                        !isCompany ? 'bg-[#006459] text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-[#101828]">
                          Llogari Individuale
                        </h4>
                        <span className="text-[11px] text-gray-500">Person fizik / Pronar privat</span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      !isCompany ? 'border-[#006459] bg-[#006459]' : 'border-gray-300 bg-white'
                    }`}>
                      {!isCompany && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </div>
                  </div>
                  <ul className="mt-3.5 space-y-1.5 text-xs text-gray-600 border-t border-gray-200/60 pt-3">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Emri dhe mbiemri personal në çdo pronë</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Komunikim i drejtpërdrejtë me blerësit</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Ideale për pronarë që shesin ose japin me qira</span>
                    </li>
                  </ul>
                </div>

                {/* Option 2: Company */}
                <div
                  onClick={() => setIsCompany(true)}
                  className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isCompany
                      ? 'border-[#006459] bg-[#006459]/[0.03] shadow-sm ring-2 ring-[#006459]/10'
                      : 'border-gray-200 bg-gray-50/40 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-colors ${
                        isCompany ? 'bg-[#006459] text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-extrabold text-[#101828]">
                            Kompani / Agjenci
                          </h4>
                          {isCompany && !isCompanyDataComplete ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                              E PAVERIFIKUAR
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[#C8B882] text-[#006459]">
                              BIZNES
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-500">Agjenci imobiliare / Ndërtues</span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCompany ? 'border-[#006459] bg-[#006459]' : 'border-gray-300 bg-white'
                    }`}>
                      {isCompany && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </div>
                  </div>
                  <ul className="mt-3.5 space-y-1.5 text-xs text-gray-600 border-t border-gray-200/60 pt-3">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#006459] shrink-0" />
                      <span>Logoja zyrtare e kompanisë në të gjitha shpalljet</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#006459] shrink-0" />
                      <span>Shfaqje e NIPT-it, vitit të themelimit dhe adresës</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#006459] shrink-0" />
                      <span>Faqe zyrtare e dedikuar me të gjitha pronat e agjencisë</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Unverified Company Prompt Banner with Scroll Signal */}
              {isCompany && !isCompanyDataComplete && (
                <div className="mt-4 p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in-50 duration-200">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-amber-900">
                        Statusi: E paverifikuar si Kompani
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Ju lutemi plotësoni emrin dhe të dhënat e kompanisë poshtë në faqe për t&apos;u shfaqur si biznes i verifikuar.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('company-details-section')
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        el.classList.add('ring-2', 'ring-[#006459]', 'transition-all')
                        setTimeout(() => el.classList.remove('ring-2', 'ring-[#006459]'), 2000)
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <span>Plotëso të dhënat poshtë</span>
                    <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                  </button>
                </div>
              )}
            </div>

            {/* Live Profile Card Preview */}
            <div className="bg-gradient-to-br from-[#006459]/[0.05] via-[#F2F7F7] to-[#C8B882]/[0.08] border border-[#006459]/15 rounded-3xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#006459]">
                    Pamja Live e Profilit Tuaj Publik
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 font-medium hidden sm:inline-block">
                  Përditësohet në kohë reale gjatë shkrimit
                </span>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-[#006459]/20 shadow-xs shrink-0 bg-gray-100">
                  <Image
                    src={getAvatarUrl(avatarUrl)}
                    alt="Foto Profili"
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base sm:text-lg font-black text-[#101828] truncate">
                      {isCompany
                        ? (firstName || 'Emri i Kompanisë')
                        : `${firstName || 'Emri'} ${lastName || 'Mbiemri'}`.trim()}
                    </h4>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      isCompany
                        ? isCompanyDataComplete
                          ? 'bg-[#006459]/10 text-[#006459] border border-[#006459]/20'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    }`}>
                      {isCompany ? (
                        isCompanyDataComplete ? (
                          <>
                            <Building2 className="w-3 h-3" />
                            <span>Kompani e Verifikuar</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            <span>E paverifikuar — Kërkohen të dhënat</span>
                          </>
                        )
                      ) : (
                        <>
                          <ShieldCheck className="w-3 h-3" />
                          <span>Përdorues i Verifikuar</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-0.5">
                    {city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#006459]" />
                        {city}
                      </span>
                    )}
                    {phone && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-[#006459]" />
                        {phone}
                      </span>
                    )}
                    {isCompany && website && (
                      <span className="flex items-center gap-1 text-[#006459] font-medium">
                        <Globe className="w-3.5 h-3.5" />
                        {website.replace(/^https?:\/\//, '')}
                      </span>
                    )}
                  </div>

                  {(isCompany ? companyDescription : bio) && (
                    <p className="text-xs text-gray-600 line-clamp-2 pt-1">
                      {isCompany ? companyDescription : bio}
                    </p>
                  )}

                  {hasAnySocial(socials) && (
                    <div className="pt-2">
                      <SocialLinksBar socials={socials} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Avatar & Branding Card */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-7 shadow-sm">
              <h3 className="text-base font-bold text-[#101828] mb-4">
                {isCompany ? 'Logoja ose Fotoja e Kompanisë' : 'Fotoja e Profilit'}
              </h3>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-4 border-gray-100 shadow-md bg-gray-100 flex-shrink-0 group">
                  <Image
                    src={getAvatarUrl(avatarUrl)}
                    alt="Foto Profili"
                    fill
                    sizes="112px"
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                  <div
                    onClick={() => setShowAvatarModal(true)}
                    className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                  >
                    <Camera className="w-6 h-6 mb-1 drop-shadow" />
                    <span className="text-[10px] font-bold">Ndrysho</span>
                  </div>
                </div>

                <div className="space-y-3 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowAvatarModal(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#006459]/10 text-[#006459] hover:bg-[#006459] hover:text-white transition-all cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Zgjidh nga biblioteka
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-all cursor-pointer shadow-xs"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5 text-gray-500" />
                      )}
                      Ngarko foto nga pajisja
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Formate të mbështetura: JPEG, PNG, WebP (maksimumi 5MB).
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
              </div>
            </div>

            {/* General Info Card */}
            <div id="company-details-section" className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-7 shadow-sm transition-all duration-300">
              <h3 className="text-base font-bold text-[#101828] mb-5">
                {isCompany ? 'Të dhënat zyrtare të kompanisë' : 'Të dhënat personale'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    {isCompany ? 'Emri i Kompanisë / Agjencisë *' : 'Emri *'}
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={isCompany ? 'p.sh. Elite Real Estate' : 'Emri juaj'}
                    required
                    className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    {isCompany ? 'Personi Përgjegjës / Kontaktues' : 'Mbiemri *'}
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={isCompany ? 'p.sh. Agron Berisha' : 'Mbiemri juaj'}
                    className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Numri i Telefonit
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+383 44 123 456"
                    className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Qyteti Kryesor
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                  >
                    <option value="">Zgjidh qytetin...</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {isCompany ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Numri Unik Identifikues (NIPT)
                      </label>
                      <input
                        type="text"
                        value={nipt}
                        onChange={(e) => setNipt(e.target.value)}
                        placeholder="p.sh. 810123456"
                        className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Viti i Themelimit
                      </label>
                      <input
                        type="number"
                        min="1950"
                        max="2026"
                        value={foundedYear}
                        onChange={(e) => setFoundedYear(e.target.value)}
                        placeholder="p.sh. 2018"
                        className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Website Zyrtar i Kompanisë
                      </label>
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://kompania.com"
                        className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Adresa e Zyrës Qendrore
                      </label>
                      <input
                        type="text"
                        value={officeAddress}
                        onChange={(e) => setOfficeAddress(e.target.value)}
                        placeholder="p.sh. Rr. Nëna Terezë, Nr. 45, Prishtinë"
                        className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                          Përshkrimi Zyrtar i Kompanisë
                        </label>
                        <span className="text-[11px] text-gray-400">
                          {companyDescription.length}/1000
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={companyDescription}
                        onChange={(e) => setCompanyDescription(e.target.value)}
                        placeholder="Shkruani një përshkrim për historikun, shërbimet dhe misionin e kompanisë suaj..."
                        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                        Bio / Përshkrim i shkurtër
                      </label>
                      <span className="text-[11px] text-gray-400">
                        {bio.length}/500
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Një përshkrim i shkurtër për veten, përvojën ose kërkesat tuaja imobiliare..."
                      className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveSettings()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006459] hover:bg-[#005048] text-white text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Ruaj të dhënat e profilit</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: RRJETET SOCIALE */}
        {/* ========================================================================= */}
        {activeTab === 'socials' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-7 shadow-sm">
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-bold text-[#101828] flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-[#006459]" />
                  Lidhjet me Rrjetet Sociale
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Këto rrjete sociale shfaqen poshtë opsionit të mesazheve në çdo shpallje të publikuar nga ju, dhe në profilin tuaj publik.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Instagram */}
                <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center text-white">
                        <InstagramIcon className="w-4 h-4 fill-white" />
                      </div>
                      <label className="text-xs font-bold text-gray-700">Instagram</label>
                    </div>
                    {socials.instagram && (
                      <a
                        href={normalizeSocialUrl('instagram', socials.instagram)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-[#006459] hover:underline inline-flex items-center gap-0.5"
                      >
                        Testo <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={socials.instagram || ''}
                    onChange={(e) => setSocials((p) => ({ ...p, instagram: e.target.value }))}
                    placeholder="@kompania ose https://instagram.com/..."
                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                  />
                </div>

                {/* Facebook */}
                <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#1877F2] flex items-center justify-center text-white">
                        <FacebookIcon className="w-4 h-4 fill-white" />
                      </div>
                      <label className="text-xs font-bold text-gray-700">Facebook</label>
                    </div>
                    {socials.facebook && (
                      <a
                        href={normalizeSocialUrl('facebook', socials.facebook)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-[#006459] hover:underline inline-flex items-center gap-0.5"
                      >
                        Testo <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={socials.facebook || ''}
                    onChange={(e) => setSocials((p) => ({ ...p, facebook: e.target.value }))}
                    placeholder="https://facebook.com/..."
                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                  />
                </div>

                {/* WhatsApp */}
                <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#25D366] flex items-center justify-center text-white">
                        <WhatsAppIcon className="w-4 h-4 fill-white" />
                      </div>
                      <label className="text-xs font-bold text-gray-700">WhatsApp</label>
                    </div>
                    {socials.whatsapp && (
                      <a
                        href={normalizeSocialUrl('whatsapp', socials.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-[#006459] hover:underline inline-flex items-center gap-0.5"
                      >
                        Testo <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={socials.whatsapp || ''}
                    onChange={(e) => setSocials((p) => ({ ...p, whatsapp: e.target.value }))}
                    placeholder="+383 44 123 456 ose link"
                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                  />
                </div>

                {/* TikTok */}
                <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#000000] flex items-center justify-center text-white">
                        <TikTokIcon className="w-4 h-4 fill-white" />
                      </div>
                      <label className="text-xs font-bold text-gray-700">TikTok</label>
                    </div>
                    {socials.tiktok && (
                      <a
                        href={normalizeSocialUrl('tiktok', socials.tiktok)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-[#006459] hover:underline inline-flex items-center gap-0.5"
                      >
                        Testo <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={socials.tiktok || ''}
                    onChange={(e) => setSocials((p) => ({ ...p, tiktok: e.target.value }))}
                    placeholder="@kompania ose https://tiktok.com/@..."
                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                  />
                </div>

                {/* LinkedIn */}
                <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#0A66C2] flex items-center justify-center text-white font-bold text-xs">
                        in
                      </div>
                      <label className="text-xs font-bold text-gray-700">LinkedIn</label>
                    </div>
                    {linkedin && (
                      <a
                        href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-[#006459] hover:underline inline-flex items-center gap-0.5"
                      >
                        Testo <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                  />
                </div>

                {/* YouTube */}
                <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#FF0000] flex items-center justify-center text-white font-bold text-xs">
                        YT
                      </div>
                      <label className="text-xs font-bold text-gray-700">YouTube Channel</label>
                    </div>
                    {youtube && (
                      <a
                        href={youtube.startsWith('http') ? youtube : `https://${youtube}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-[#006459] hover:underline inline-flex items-center gap-0.5"
                      >
                        Testo <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    placeholder="https://youtube.com/@..."
                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                  />
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-200/80">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Pamja live e lidhjeve tuaja sociale:
                  </span>
                  <span className="text-[11px] text-[#006459] font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> E sinkronizuar me shpalljet
                  </span>
                </div>
                <SocialLinksBar socials={socials} variant="large" />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveSettings()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006459] hover:bg-[#005048] text-white text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Ruaj rrjetet sociale</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: NJOFTIMET */}
        {/* ========================================================================= */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-7 shadow-sm">
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-bold text-[#101828] flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#006459]" />
                  Preferencat e Njoftimeve
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Zgjidhni se për çfarë aktivitetesh dëshironi të merrni njoftime me email ose në platformë.
                </p>
              </div>

              {/* Group 1: Property Activity */}
              <div className="mb-6">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                  Aktiviteti i Pronave & Blerësit
                </h4>
                <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 px-4 bg-gray-50/30">
                  {/* Messages */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-[#101828]">
                        Mesazhet e reja nga blerësit
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Merrni një njoftim të menjëhershëm kur një blerës ju dërgon mesazh mbi një pronë.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications((p) => ({ ...p, messages: !p.messages }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notifications.messages ? 'bg-[#006459]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notifications.messages ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Inquiries */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-[#101828]">
                        Kërkesa interesi & telefonata
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Njoftim kur një klient kërkon të vizitojë pronën ose klikon numrin tuaj të telefonit.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications((p) => ({ ...p, inquiries: !p.inquiries }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notifications.inquiries ? 'bg-[#006459]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notifications.inquiries ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Followers */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-[#101828]">
                        Ndiqës të rinj (Followers)
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Merrni njoftim kur një blerës ose kompani tjetër fillon të ndjekë profilin tuaj.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications((p) => ({ ...p, followers: !p.followers }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notifications.followers ? 'bg-[#006459]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notifications.followers ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Group 2: Market & Platform */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                  Tregu & Statistikat
                </h4>
                <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 px-4 bg-gray-50/30">
                  {/* Weekly Report */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-[#101828]">
                        Raporti javor i shikueshmërisë
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Statistika javore mbi klikimet, ruajtjet në të preferuara dhe interesin për pronat tuaja.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications((p) => ({ ...p, weeklyReport: !p.weeklyReport }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notifications.weeklyReport ? 'bg-[#006459]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notifications.weeklyReport ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Newsletter */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-[#101828]">
                        Buletini me tendencat e tregut imobiliar
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Këshilla për shitjen e pronave, çmimet mesatare për m² në Kosovë dhe përditësime të platformës.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications((p) => ({ ...p, newsletter: !p.newsletter }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notifications.newsletter ? 'bg-[#006459]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notifications.newsletter ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveSettings()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006459] hover:bg-[#005048] text-white text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Ruaj preferencat e njoftimeve</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PRIVATËSIA */}
        {/* ========================================================================= */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-7 shadow-sm">
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-bold text-[#101828] flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#006459]" />
                  Privatësia & Dukshmëria
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Kontrolloni se si të dhënat tuaja të kontaktit dhe aktiviteti shfaqen para blerësve dhe publikut.
                </p>
              </div>

              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 px-4 bg-gray-50/30">
                {/* Show Phone */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#101828]">
                      Shfaq numrin e telefonit publikisht
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Blerësit mund të shohin numrin tuaj dhe t&apos;ju telefonojnë drejtpërdrejt nga shpallja.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrivacy((p) => ({ ...p, showPhone: !p.showPhone }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      privacy.showPhone ? 'bg-[#006459]' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        privacy.showPhone ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Show Socials */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#101828]">
                      Shfaq lidhjet e rrjeteve sociale në shpallje
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Lejoni blerësit të hapin Instagram, Facebook, WhatsApp dhe TikTok tuaj direkt nga faqja e pronës.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrivacy((p) => ({ ...p, showSocials: !p.showSocials }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      privacy.showSocials ? 'bg-[#006459]' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        privacy.showSocials ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Show Online Status */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#101828]">
                      Shfaq statusin Online / Aktiv
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Tregon një pikë të gjelbër kur jeni aktiv në platformë, duke rritur besueshmërinë te blerësit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrivacy((p) => ({ ...p, showOnline: !p.showOnline }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      privacy.showOnline ? 'bg-[#006459]' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        privacy.showOnline ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Direct Messages */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#101828]">
                      Lejo mesazhe të menjëhershme në platformë
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Përdoruesit e kyçur mund t&apos;ju shkruajnë përmes sistemit të mesazheve të Bleje Pronën.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrivacy((p) => ({ ...p, allowDirectMsgs: !p.allowDirectMsgs }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      privacy.allowDirectMsgs ? 'bg-[#006459]' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        privacy.allowDirectMsgs ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Show Listings on Profile */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#101828]">
                      Shfaq listën e pronave në profilin publik
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Të gjithë vizitorët e profilit tuaj mund të shfletojnë të gjitha shpalljet tuaja aktive.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrivacy((p) => ({ ...p, showListingsOnProfile: !p.showListingsOnProfile }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      privacy.showListingsOnProfile ? 'bg-[#006459]' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        privacy.showListingsOnProfile ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveSettings()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006459] hover:bg-[#005048] text-white text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Ruaj cilësimet e privatësisë</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: SIGURIA & SESIONET */}
        {/* ========================================================================= */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Password Change Card */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-7 shadow-sm">
              <div className="mb-5">
                <h3 className="text-base sm:text-lg font-bold text-[#101828] flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#006459]" />
                  Ndrysho Fjalëkalimin
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Përdorni një fjalëkalim të sigurt me shkronja, numra dhe simbole.
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Fjalëkalimi i ri
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 px-3.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Live Password Strength Meter */}
                  {newPassword && (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 font-medium">Siguria e fjalëkalimit:</span>
                        <span className="font-bold text-gray-700">
                          {getPasswordStrength(newPassword).label}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 3, 4].map((step) => {
                          const strength = getPasswordStrength(newPassword)
                          const isFilled = strength.score >= step
                          return (
                            <div
                              key={step}
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                isFilled ? strength.color : 'bg-gray-200'
                              }`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Konfirmo fjalëkalimin e ri
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 px-3.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updatingPassword || !newPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006459] hover:bg-[#005048] disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  {updatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Përditëso Fjalëkalimin</span>
                </button>
              </form>
            </div>

            {/* Verification Status Card */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-7 shadow-sm">
              <h3 className="text-base font-bold text-[#101828] mb-4">
                Statusi i Sigurisë së Llogarisë
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isEmailVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {isEmailVerified ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#101828]">Email i verifikuar</p>
                    <p className="text-xs text-gray-500 mt-0.5">{userEmail}</p>
                    <span className={`inline-block mt-2 text-[11px] font-bold ${isEmailVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {isEmailVerified ? '✓ E verifikuar zyrtarisht' : '⚠️ Jo e verifikuar'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#006459]/10 text-[#006459] flex items-center justify-center shrink-0">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#101828]">Sesioni Aktiv</p>
                    <p className="text-xs text-gray-500 mt-0.5">Shfletuesi aktual në përdorim</p>
                    <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-bold text-emerald-700">
                      Aktiv Tani
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50/50 border border-red-200/60 rounded-3xl p-5 sm:p-7">
              <h3 className="text-base font-bold text-red-700 mb-1">
                Zona e Rrezikut
              </h3>
              <p className="text-xs text-gray-600 mb-5">
                Veprimet e mëposhtme janë përfundimtare dhe mund të fshijnë të gjitha të dhënat tuaja nga Bleje Pronën.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <LogOut className="w-4 h-4 text-gray-500" />
                  <span>Dil nga llogaria</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Fshi llogarinë përfundimisht</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Floating Save Bar */}
      <div className="sm:hidden fixed bottom-4 inset-x-4 z-40 bg-white/95 backdrop-blur-xl border border-gray-200/90 p-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] flex items-center justify-between gap-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-200">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-gray-900 truncate">
            {tabs.find((t) => t.id === activeTab)?.label}
          </p>
          <p className="text-[10px] text-gray-500 truncate">
            Ruani ndryshimet tuaja me 1-prekje
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleSaveSettings()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#006459] active:scale-95 text-white text-xs font-bold shadow-md cursor-pointer shrink-0 disabled:opacity-75"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Ruajtje...' : 'Ruaj'}</span>
        </button>
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
        userName={firstName ? `${firstName} ${lastName}`.trim() : 'Përdorues'}
        avatarUrl={avatarUrl}
        onLogoutConfirmed={async () => {
          try {
            sessionStorage.setItem('blejepronen_logging_out', '1')
            document.cookie = 'blejepronen_logging_out=1; path=/; max-age=10; SameSite=Lax'
            await supabase.auth.signOut({ scope: 'local' })
            await fetch('/api/logout', { method: 'POST', keepalive: true })
          } catch {}
          router.push('/login')
        }}
      />

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        userEmail={userEmail}
        userName={firstName ? `${firstName} ${lastName}`.trim() : 'Përdorues'}
        isCompany={isCompany}
        avatarUrl={avatarUrl}
        onDeleteConfirmed={handleConfirmDelete}
      />
    </div>
  )
}
