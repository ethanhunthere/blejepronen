'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Phone, Mail, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// NOTE: Custom 6-digit OTP email verification is handled via Resend API.
// The verification code is stored in the profiles table and verified
// through /api/send-otp and /api/verify-otp routes.

type Step = 1 | 2

export default function CompletoProfilinPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [resending, setResending] = useState(false)

  // Step 1 fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [userEmail, setUserEmail] = useState('')

  // Step 2 fields
  const [otp, setOtp] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [canResend, setCanResend] = useState(true)

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

      // Store email for OTP
      setUserEmail(user.email ?? '')

      // Check if profile is already complete and verified - redirect home
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, email_verified')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.first_name && profile?.email_verified) {
        router.push('/')
        return
      }

      const isComp = user.user_metadata?.account_type === 'company' || Boolean(user.user_metadata?.company_name)
      if (isComp) {
        router.replace('/completo-profilin-company')
        return
      }

      // Pre-fill from existing profile or Google user_metadata
      let initialFirst = profile?.first_name || ''
      let initialLast = profile?.last_name || ''
      const initialPhone = profile?.phone || ''

      const meta = user.user_metadata
      if (meta) {
        const googleFirst = meta.given_name || meta.first_name || ''
        const googleLast = meta.family_name || meta.last_name || ''

        if (!initialFirst && !initialLast && meta.full_name) {
          const parts = meta.full_name.split(' ')
          if (parts.length >= 2) {
            initialFirst = parts[0]
            initialLast = parts.slice(1).join(' ')
          } else {
            initialFirst = meta.full_name
          }
        } else {
          if (!initialFirst) initialFirst = googleFirst || ''
          if (!initialLast) initialLast = googleLast || ''
        }
      }

      setFirstName(initialFirst)
      setLastName(initialLast)
      setPhone(initialPhone)
      setChecking(false)
    }

    init()
  }, [router])

  // Countdown timer for OTP resend
  useEffect(() => {
    if (step !== 2 || countdown <= 0 || canResend) return

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [step, countdown, canResend])

  const verifyOtp = useCallback(async (code: string) => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email: userEmail }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        console.error('Verify OTP API error:', data.error)
        if (data.error === 'expired') {
          setError("Kodi ka skaduar. Klikoni 'Ridërgo kodin' për të marrë një kod të ri.")
        } else if (data.error === 'invalid') {
          setError(data.message || 'Kodi është i gabuar.')
        } else if (data.error === 'too_many_attempts') {
          setError('Shumë përpjekje. Prisni pak.')
        } else {
          setError(data.message || 'Kodi i verifikimit është i pasaktë ose ka skaduar.')
        }
        setLoading(false)
        return
      }

      toast.success('Profili u verifikua me sukses!')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profile-updated'))
        window.location.href = '/'
      }
    } catch (err) {
      console.error('Verify OTP fetch error:', err)
      setError('Gabim gjatë verifikimit. Provo përsëri.')
      setLoading(false)
    }
  }, [userEmail])

  const sendOtp = async () => {
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        console.error('Send OTP API error:', data.error)
        setError(data.error || 'Gabim gjatë dërgimit të kodit. Provo përsëri.')
        return false
      }

      return true
    } catch (err) {
      console.error('Send OTP fetch error:', err)
      setError('Gabim gjatë dërgimit të kodit. Provo përsëri.')
      return false
    }
  }

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitted(true)

    if (!firstName.trim() || !lastName.trim()) {
      setError('Emri dhe mbiemri janë të detyrueshëm.')
      return
    }

    if (!userEmail) {
      setError('Nuk u gjet email-i i përdoruesit. Ju lutemi ri-regjistrohuni.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Sesioni ka skaduar. Ju lutemi regjistrohuni përsëri.')
      setLoading(false)
      return
    }

    try {
      const saveRes = await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        }),
      })

      const saveData = await saveRes.json()

      if (!saveRes.ok || !saveData.success) {
        setError(saveData.message || 'Gabim gjatë ruajtjes së profilit. Provo përsëri.')
        setLoading(false)
        return
      }

      // If email is already verified (e.g. Google user), finish immediately
      if (saveData.emailVerified) {
        toast.success('Profili u plotësua me sukses!')
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('profile-updated'))
          window.location.href = '/'
        }
        return
      }
    } catch (err) {
      console.error('Save profile error:', err)
      setError('Gabim gjatë ruajtjes së profilit. Provo përsëri.')
      setLoading(false)
      return
    }

    // Send 6-digit OTP code to email only if unverified
    const sent = await sendOtp()
    if (!sent) {
      setLoading(false)
      return
    }

    toast.success('Kodi i verifikimit u dërgua me email!')
    setOtp('')
    setStep(2)
    setCountdown(60)
    setCanResend(false)
    setLoading(false)
  }

  const handleResendOtp = async () => {
    if (!userEmail || !canResend) return
    setResending(true)
    const sent = await sendOtp()
    if (sent) {
      toast.success('Kodi u ridërgua me email!')
      setOtp('')
      setCountdown(60)
      setCanResend(false)
    }
    setResending(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#F2F7F7] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#101828]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F7F7] flex items-start justify-center pt-24 md:pt-32 p-4">
      <div className="w-full max-w-lg">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {([1, 2] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  s <= step
                    ? 'bg-[#006459] text-white shadow-lg shadow-[#006459]/30'
                    : 'bg-gray-100 border border-gray-200 text-gray-500'
                }`}
              >
                {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
              {s < 2 && (
                <div className={`w-12 h-0.5 rounded-full transition-colors duration-300 ${s < step ? 'bg-[#006459]' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Premium card */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-xl p-8 md:p-10">

          {/* === STEP 1: Profile Form === */}
          {step === 1 && (
            <>
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-[#101828] mb-2">Kompleto profilin</h2>
                <p className="text-gray-600 text-sm">Plotëso të dhënat për të vazhduar</p>
              </div>

              {submitted && error && (
                <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200 text-red-600 rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleStep1Submit} className="space-y-5">
                <div>
                  <Label htmlFor="firstName" className="text-gray-600 text-sm font-medium mb-1.5">Emri</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="firstName"
                      placeholder="Emri yt"
                      className="pl-11 h-12 rounded-xl bg-white border-gray-200 text-[#101828] placeholder:text-gray-500 focus:border-[#006459]/60"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="lastName" className="text-gray-600 text-sm font-medium mb-1.5">Mbiemri</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="lastName"
                      placeholder="Mbiemri yt"
                      className="pl-11 h-12 rounded-xl bg-white border-gray-200 text-[#101828] placeholder:text-gray-500 focus:border-[#006459]/60"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-gray-600 text-sm font-medium mb-1.5">Numri i telefonit</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+383 44 123 456"
                      className="pl-11 h-12 rounded-xl bg-white border-gray-200 text-[#101828] placeholder:text-gray-500 focus:border-[#006459]/60"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl font-semibold text-white bg-[#006459] shadow-lg shadow-[#006459]/25 hover:bg-[#005048] hover:-translate-y-[1px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-out cursor-pointer disabled:hover:translate-y-0"
                  disabled={loading}
                >
                  {loading ? 'Duke u përpunuar...' : (
                    <>
                      Vazhdo
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </>
          )}

          {/* === STEP 2: OTP Verification === */}
          {step === 2 && (
            <>
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-[#101828] mb-2">Verifiko email-in</h2>
                <p className="text-gray-600 text-sm">
                  Shkruani kodin 6-shifror që dërguam në {userEmail}
                </p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200 text-red-600 rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-[#006459]/10 rounded-2xl flex items-center justify-center">
                    <Mail className="h-10 w-10 text-[#006459]" />
                  </div>
                </div>

                <div className="flex justify-center">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    disabled={loading}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setOtp(value)
                      if (error) setError('')
                      if (value.length === 6) verifyOtp(value)
                    }}
                    className="w-48 h-16 text-center text-4xl font-bold tracking-[0.5em] bg-white border border-gray-200 rounded-xl text-[#101828] placeholder:text-gray-300 focus:border-[#006459]/60"
                  />
                </div>

                <p className="text-sm text-center text-gray-500">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resending}
                      className="text-[#006459] hover:underline font-medium transition-colors duration-150 cursor-pointer disabled:opacity-50"
                    >
                      {resending ? 'Duke u ridërguar...' : 'Ridërgo kodin'}
                    </button>
                  ) : (
                    <>Kodi skadon pas {countdown} sekondave</>
                  )}
                </p>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError('') }}
                    className="text-xs text-gray-500 hover:text-[#006459] hover:underline cursor-pointer text-center"
                  >
                    ← Ndrysho të dhënat e profilit
                  </button>

                  <button
                    type="button"
                    onClick={() => { window.location.href = '/' }}
                    className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-medium hover:bg-gray-100 hover:text-[#101828] hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 ease-out inline-flex items-center justify-center cursor-pointer"
                  >
                    Vazhdo pa verifikim
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
