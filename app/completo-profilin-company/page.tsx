'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, User, Phone, Calendar, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { DEFAULT_AVATAR } from '@/lib/avatars'

export default function CompletoProfilinCompanyPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [foundedYear, setFoundedYear] = useState('')
  const [description, setDescription] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [avatar, setAvatar] = useState<string>(DEFAULT_AVATAR)

  const [fieldErrors, setFieldErrors] = useState<{
    companyName?: string
    phone?: string
    foundedYear?: string
    description?: string
    contactPerson?: string
  }>({})

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

      // Pre-fill from user_metadata
      const meta = user.user_metadata
      if (meta) {
        const comp = meta.company_name || meta.first_name || meta.full_name || ''
        if (comp) setCompanyName(comp)
        if (meta.phone) setPhone(meta.phone)
        if (meta.founded_year) setFoundedYear(String(meta.founded_year))
        if (meta.company_description) setDescription(meta.company_description)
        if (meta.contact_person) setContactPerson(meta.contact_person)
      }

      // If user already has profile record saved, merge
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        if (profile.first_name) setCompanyName(prev => prev || profile.first_name)
        if (profile.last_name && profile.last_name !== 'Kompani') {
          setContactPerson(prev => prev || profile.last_name)
        }
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

    const nextErrors: {
      companyName?: string
      phone?: string
      foundedYear?: string
      description?: string
      contactPerson?: string
    } = {}

    if (!companyName.trim()) {
      nextErrors.companyName = 'Emri i kompanisë është i detyrueshëm.'
    } else if (companyName.trim().length < 2) {
      nextErrors.companyName = 'Të paktën 2 karaktere.'
    }

    if (!phone.trim()) {
      nextErrors.phone = 'Numri i telefonit të kompanisë është i detyrueshëm.'
    } else if (phone.trim().length < 6) {
      nextErrors.phone = 'Ju lutem shkruani një numër telefoni të vlefshëm.'
    }

    if (foundedYear.trim()) {
      const yearNum = parseInt(foundedYear.trim(), 10)
      const currentYear = new Date().getFullYear()
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear) {
        nextErrors.foundedYear = `Viti duhet të jetë midis 1900 dhe ${currentYear}.`
      }
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
          firstName: companyName.trim(),
          lastName: contactPerson.trim() || 'Kompani',
          phone: phone.trim(),
          emailVerified: true,
          isCompany: true,
          companyDescription: description.trim(),
          foundedYear: foundedYear.trim(),
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

      toast.success('Llogaria e kompanisë u verifikua me sukses!')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profile-updated'))
        window.location.href = '/'
      }
    } catch (err) {
      console.error('Submit company profile error:', err)
      setError('Ndodhi një gabim gjatë ruajtjes. Provoni përsëri.')
      setLoading(false)
    }
  }

  const handleContinueWithoutVerifying = async () => {
    setLoading(true)
    setError('')
    try {
      await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: companyName.trim() || 'Kompani',
          lastName: contactPerson.trim() || 'Kompani',
          phone: phone.trim(),
          emailVerified: false,
          isCompany: true,
          companyDescription: description.trim(),
          foundedYear: foundedYear.trim(),
        }),
      })
    } catch (e) {
      console.warn('Continue without verifying save notice:', e)
    }

    toast.info('Mund ta verifikoni llogarinë tuaj në çdo kohë nga profili.')
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('profile-updated'))
      window.location.href = '/'
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
    <div className="min-h-screen bg-[#F2F7F7] flex items-center justify-center p-4 py-8 sm:py-12">
      <div className="w-full max-w-lg">
        {/* Verification Success Pill - Clean reassurance */}
        <div className="mb-4 py-2.5 px-3.5 rounded-2xl bg-[#006459]/10 border border-[#006459]/25 text-[#006459] text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#006459]" />
            <span>Email-i u konfirmua me sukses</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#006459] text-white rounded-full px-2.5 py-0.5">
            <Building2 className="h-3 w-3" /> Kompani
          </span>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-xl p-6 sm:p-8 md:p-9">
          <div className="mb-5 text-center">
            <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#101828]">
              Plotëso profilin e kompanisë
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
              Plotësoni të dhënat e kompanisë për të verifikuar llogarinë tuaj në Bleje Pronën.
            </p>
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
            {/* 1. Emri i Kompanisë */}
            <div>
              <Label
                htmlFor="companyName"
                className={`text-xs sm:text-[13px] font-semibold block mb-1.5 ${
                  fieldErrors.companyName ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                Emri i Kompanisë <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="companyName"
                  placeholder="psh. Iliria Real Estate"
                  autoFocus
                  className={`pl-10 h-11 rounded-xl bg-gray-50 text-sm text-[#101828] placeholder:text-gray-400 focus:bg-white transition-colors ${
                    fieldErrors.companyName
                      ? 'border-red-300 bg-red-50/60 focus:border-red-400'
                      : 'border-gray-200 focus:border-[#006459]'
                  }`}
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value)
                    if (fieldErrors.companyName) setFieldErrors((p) => ({ ...p, companyName: undefined }))
                    if (error) setError('')
                  }}
                  required
                />
              </div>
              {fieldErrors.companyName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.companyName}</p>
              )}
            </div>

            {/* 2. Numri i telefonit të kompanisë */}
            <div>
              <Label
                htmlFor="phone"
                className={`text-xs sm:text-[13px] font-semibold block mb-1.5 ${
                  fieldErrors.phone ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                Numri i telefonit të kompanisë <span className="text-red-500">*</span>
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
                  required
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
              )}
            </div>

            {/* 3. Nga cili vit operoni & Personi kontaktues */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label
                  htmlFor="foundedYear"
                  className={`text-xs sm:text-[13px] font-semibold block mb-1.5 ${
                    fieldErrors.foundedYear ? 'text-red-600' : 'text-gray-700'
                  }`}
                >
                  Nga cili vit operoni?
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="foundedYear"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    placeholder="psh. 2018"
                    className={`pl-10 h-11 rounded-xl bg-gray-50 text-sm text-[#101828] placeholder:text-gray-400 focus:bg-white transition-colors ${
                      fieldErrors.foundedYear
                        ? 'border-red-300 bg-red-50/60 focus:border-red-400'
                        : 'border-gray-200 focus:border-[#006459]'
                    }`}
                    value={foundedYear}
                    onChange={(e) => {
                      setFoundedYear(e.target.value)
                      if (fieldErrors.foundedYear) setFieldErrors((p) => ({ ...p, foundedYear: undefined }))
                      if (error) setError('')
                    }}
                  />
                </div>
                {fieldErrors.foundedYear && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.foundedYear}</p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="contactPerson"
                  className={`text-xs sm:text-[13px] font-semibold block mb-1.5 ${
                    fieldErrors.contactPerson ? 'text-red-600' : 'text-gray-700'
                  }`}
                >
                  Personi kontaktues (opsionale)
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="contactPerson"
                    placeholder="psh. Agjent shitjesh"
                    className={`pl-10 h-11 rounded-xl bg-gray-50 text-sm text-[#101828] placeholder:text-gray-400 focus:bg-white transition-colors ${
                      fieldErrors.contactPerson
                        ? 'border-red-300 bg-red-50/60 focus:border-red-400'
                        : 'border-gray-200 focus:border-[#006459]'
                    }`}
                    value={contactPerson}
                    onChange={(e) => {
                      setContactPerson(e.target.value)
                      if (fieldErrors.contactPerson) setFieldErrors((p) => ({ ...p, contactPerson: undefined }))
                      if (error) setError('')
                    }}
                  />
                </div>
                {fieldErrors.contactPerson && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.contactPerson}</p>
                )}
              </div>
            </div>

            {/* 4. Përshkrimi i kompanisë - kush jeni ju */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label
                  htmlFor="description"
                  className={`text-xs sm:text-[13px] font-semibold ${
                    fieldErrors.description ? 'text-red-600' : 'text-gray-700'
                  }`}
                >
                  Përshkrim i shkurtër i kompanisë
                </Label>
                <span className="text-[11px] text-gray-400">Opsionale</span>
              </div>
              <div className="relative">
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Kush jeni ju? Shkruani shkurtimisht përvojën tuaj në treg, zonat ku operoni dhe shërbimet e patundshmërisë..."
                  className="w-full p-3 text-sm rounded-xl border border-gray-200 bg-gray-50 text-[#101828] placeholder:text-gray-400 focus:bg-white focus:border-[#006459] outline-none transition-colors resize-none leading-relaxed"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    if (fieldErrors.description) setFieldErrors((p) => ({ ...p, description: undefined }))
                    if (error) setError('')
                  }}
                />
              </div>
              {fieldErrors.description && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="mt-3 w-full min-h-[44px] h-11 sm:h-12 rounded-xl font-semibold text-white bg-[#006459] shadow-md shadow-[#006459]/20 hover:bg-[#005048] hover:shadow-lg hover:shadow-[#006459]/30 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Duke verifikuar llogarinë...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Përfundo dhe verifiko llogarinë
                </span>
              )}
            </Button>

            {/* Skip / Continue without verifying */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleContinueWithoutVerifying}
                disabled={loading}
                className="text-xs sm:text-sm font-medium text-gray-500 hover:text-[#006459] transition-colors py-1.5 cursor-pointer disabled:opacity-50"
              >
                Vazhdo pa verifikuar →
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
