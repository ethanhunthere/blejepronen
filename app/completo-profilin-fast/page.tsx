'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Phone, ArrowRight, Loader2, CheckCircle2, Building2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import AvatarPickerModal from '@/components/AvatarPickerModal'
import { DEFAULT_AVATAR } from '@/lib/avatars'

export default function CompletoProfilinFastPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const isCompany = false
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatar, setAvatar] = useState<string>(DEFAULT_AVATAR)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ firstName?: string; lastName?: string; phone?: string }>({})

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
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
        // Wait 400ms retry in case auth tokens are synchronizing
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

      // Pre-fill from Google user_metadata or signup metadata
      const meta = user.user_metadata
      const isComp = meta?.account_type === 'company' || Boolean(meta?.company_name)
      if (isComp) {
        router.replace('/completo-profilin-company')
        return
      }

      if (meta) {
        const googleFirst = meta.given_name || meta.first_name || ''
        const googleLast = meta.family_name || meta.last_name || ''

        if (!googleFirst && !googleLast && meta.full_name) {
          const parts = meta.full_name.split(' ')
          if (parts.length >= 2) {
            setFirstName(parts[0])
            setLastName(parts.slice(1).join(' '))
          } else {
            setFirstName(meta.full_name)
          }
        } else {
          setFirstName(googleFirst || '')
          setLastName(googleLast || '')
        }
      }

      // If user already has profile details saved, load them
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        if (profile.first_name) setFirstName(prev => prev || profile.first_name)
        if (profile.last_name && profile.last_name !== 'Kompani') setLastName(prev => prev || profile.last_name)
        if (profile.phone) setPhone(prev => prev || profile.phone)
        if (profile.avatar_url) setAvatar(profile.avatar_url)
      }

      setChecking(false)
    }

    init()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const nextErrors: { firstName?: string; lastName?: string; phone?: string } = {}
    if (!firstName.trim()) {
      nextErrors.firstName = isCompany ? 'Emri i kompanisë është i detyrueshëm.' : 'Emri është i detyrueshëm.'
    }
    if (!isCompany && !lastName.trim()) {
      nextErrors.lastName = 'Mbiemri është i detyrueshëm.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: isCompany ? (lastName.trim() || 'Kompani') : lastName.trim(),
          phone: phone.trim(),
          emailVerified: true,
          isCompany,
          avatarUrl: avatar,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        if (data.error === 'duplicate_phone') {
          setFieldErrors((p) => ({ ...p, phone: data.message }))
        }
        setError(data.message || 'Gabim gjatë ruajtjes së profilit.')
        setLoading(false)
        return
      }

      toast.success('Profili u plotësua me sukses!')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profile-updated'))
        window.location.href = '/'
      }
    } catch (err) {
      console.error('Submit error:', err)
      setError('Ndodhi një gabim. Provoni përsëri.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#F2F7F7] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#006459]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F7F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Verification Success Pill */}
        <div className="mb-4 py-2 px-3 rounded-2xl bg-[#006459]/10 border border-[#006459]/20 text-[#006459] text-xs sm:text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#006459]" />
          <span>Email-i u konfirmua me sukses</span>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-xl p-6 sm:p-8 md:p-9">
          <div className="mb-5 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#101828]">
              {isCompany ? 'Plotëso profilin e kompanisë' : 'Plotëso profilin tënd'}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              {isCompany
                ? 'Konfirmo të dhënat e kompanisë dhe numrin e telefonit'
                : 'Vendos emrin, mbiemrin dhe numrin e telefonit për të vazhduar'}
            </p>
          </div>

          {/* Avatar Preview & Selection */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div
              onClick={() => setAvatarModalOpen(true)}
              className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm cursor-pointer group hover:border-[#006459]/40 hover:shadow-md transition-all duration-200 bg-gray-50"
              title="Kliko për të zgjedhur avatarin tënd"
            >
              <Image
                src={avatar}
                alt="Avatar"
                fill
                sizes="80px"
                className="object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Sparkles className="h-5 w-5 drop-shadow" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006459]/10 text-[#006459] text-xs font-semibold hover:bg-[#006459] hover:text-white transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Zgjidh avatar
            </button>
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="mb-5 bg-red-50 border-red-200 text-red-600 rounded-xl text-xs sm:text-[13px]"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label
                htmlFor="firstName"
                className={`text-xs sm:text-[13px] font-semibold block mb-1.5 ${
                  fieldErrors.firstName ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                {isCompany ? 'Emri i Kompanisë' : 'Emri'}
              </Label>
              <div className="relative">
                {isCompany ? (
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                ) : (
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                )}
                <Input
                  id="firstName"
                  placeholder={isCompany ? 'psh. Iliria Real Estate' : 'Emri yt'}
                  autoFocus
                  className={`pl-10 h-11 rounded-xl bg-gray-50 text-sm text-[#101828] placeholder:text-gray-400 focus:bg-white transition-colors ${
                    fieldErrors.firstName
                      ? 'border-red-300 bg-red-50/60 focus:border-red-400'
                      : 'border-gray-200 focus:border-[#006459]'
                  }`}
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    if (fieldErrors.firstName) setFieldErrors((p) => ({ ...p, firstName: undefined }))
                    if (error) setError('')
                  }}
                  required
                />
              </div>
              {fieldErrors.firstName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>
              )}
            </div>

            <div>
              <Label
                htmlFor="lastName"
                className={`text-xs sm:text-[13px] font-semibold block mb-1.5 ${
                  fieldErrors.lastName ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                {isCompany ? 'Personi kontaktues (opsionale)' : 'Mbiemri'}
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="lastName"
                  placeholder={isCompany ? 'psh. Menaxher shitjesh' : 'Mbiemri yt'}
                  className={`pl-10 h-11 rounded-xl bg-gray-50 text-sm text-[#101828] placeholder:text-gray-400 focus:bg-white transition-colors ${
                    fieldErrors.lastName
                      ? 'border-red-300 bg-red-50/60 focus:border-red-400'
                      : 'border-gray-200 focus:border-[#006459]'
                  }`}
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    if (fieldErrors.lastName) setFieldErrors((p) => ({ ...p, lastName: undefined }))
                    if (error) setError('')
                  }}
                  required={!isCompany}
                />
              </div>
              {fieldErrors.lastName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>
              )}
            </div>

            <div>
              <Label
                htmlFor="phone"
                className={`text-xs sm:text-[13px] font-semibold block mb-1.5 ${
                  fieldErrors.phone ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                {isCompany ? 'Numri i telefonit të kompanisë' : 'Numri i telefonit'}
              </Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+383 44 123 456"
                  className={`pl-10 h-11 rounded-xl bg-gray-50 text-sm text-[#101828] placeholder:text-gray-400 focus:bg-white transition-colors ${
                    fieldErrors.phone
                      ? 'border-red-300 bg-red-50/60 focus:border-red-400'
                      : 'border-gray-200 focus:border-[#006459]'
                  }`}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }))
                    if (error) setError('')
                  }}
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
              )}
            </div>

            <Button
              type="submit"
              className="mt-2 w-full h-11 rounded-xl font-semibold text-white bg-[#006459] shadow-md shadow-[#006459]/20 hover:bg-[#005048] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Duke ruajtur...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Përfundo dhe vazhdo
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </div>

        <AvatarPickerModal
          isOpen={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          currentAvatarUrl={avatar}
          onSelectAvatar={async (url) => {
            setAvatar(url)
            setAvatarModalOpen(false)
          }}
        />
      </div>
    </div>
  )
}
