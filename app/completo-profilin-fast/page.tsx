'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Phone, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
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
        <div className="mb-4 py-2.5 px-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs sm:text-sm font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Email-i u konfirmua me sukses</span>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
            Individual
          </span>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-xl p-6 sm:p-8 md:p-9">
          <div className="mb-5 text-center">
            <h1 className="text-2xl sm:text-[26px] font-black tracking-tight text-[#101828]">
              Plotëso profilin tënd
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
              Vendos emrin, mbiemrin dhe numrin tënd të telefonit për të filluar menjëherë.
            </p>
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="mb-5 bg-red-50/90 border-red-200 text-red-600 rounded-xl text-xs sm:text-[13px]"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              <div>
                <Label
                  htmlFor="firstName"
                  className={`text-xs sm:text-[13px] font-semibold block mb-1.5 ${
                    fieldErrors.firstName ? 'text-red-600' : 'text-gray-700'
                  }`}
                >
                  Emri <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="firstName"
                    placeholder="Emri yt"
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
                  Mbiemri <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="lastName"
                    placeholder="Mbiemri yt"
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
                    required
                  />
                </div>
                {fieldErrors.lastName && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label
                  htmlFor="phone"
                  className={`text-xs sm:text-[13px] font-semibold ${
                    fieldErrors.phone ? 'text-red-600' : 'text-gray-700'
                  }`}
                >
                  Numri i telefonit
                </Label>
                <span className="text-[11px] text-gray-400">Për kontakt direkt</span>
              </div>
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
              className="mt-2 w-full min-h-[44px] h-11 sm:h-12 rounded-xl font-semibold text-white bg-[#006459] shadow-md shadow-[#006459]/20 hover:bg-[#005048] hover:shadow-lg hover:shadow-[#006459]/30 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Duke ruajtur...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Përfundo dhe vazhdo
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
