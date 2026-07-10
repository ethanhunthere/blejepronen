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
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Store email for OTP
      setUserEmail(user.email ?? '')

      // Pre-fill from Google user_metadata if available
      const meta = user.user_metadata
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

      // Check if profile is already complete — redirect home
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, email_verified')
        .eq('id', user.id)
        .single()

      if (profile?.first_name && profile?.email_verified) {
        router.push('/')
        return
      }

      setChecking(false)
    }

    init()
  }, [router])

  // Countdown timer for OTP resend
  useEffect(() => {
    if (step !== 2) return
    setCountdown(60)
    setCanResend(false)

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
  }, [step])

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (otp.length === 6) {
      handleVerifyOtp(otp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  const sendOtp = async () => {
    try {
      const res = await fetch('/api/send-otp', { method: 'POST' })
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

  const handleVerifyOtp = async (code: string) => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        console.error('Verify OTP API error:', data.error)
        if (data.error === 'expired') {
          setError("Kodi ka skaduar. Klikoni 'Ridërgo kodin' për të marrë një kod të ri.")
        } else if (data.error === 'invalid') {
          setError('Kodi është i gabuar.')
        } else if (data.error === 'too_many_attempts') {
          setError('Shumë përpjekje. Prisni pak.')
        } else {
          setError(data.message || 'Kodi i verifikimit është i pasaktë ose ka skaduar.')
        }
        setLoading(false)
        return
      }

      toast.success('Profili u verifikua me sukses!')
      router.push('/')
    } catch (err) {
      console.error('Verify OTP fetch error:', err)
      setError('Gabim gjatë verifikimit. Provo përsëri.')
      setLoading(false)
    }
  }

  const handleStep1Submit = useCallback(async (e: React.FormEvent) => {
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

    // Save profile data
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      })

    if (profileError) {
      console.error('Profile update error:', profileError)
      setError('Gabim gjatë ruajtjes së profilit. Provo përsëri.')
      setLoading(false)
      return
    }

    // Send 6-digit OTP code to email
    const sent = await sendOtp()
    if (!sent) {
      setLoading(false)
      return
    }

    toast.success('Kodi i verifikimit u dërgua me email!')
    setOtp('')
    setStep(2)
    setLoading(false)
  }, [firstName, lastName, phone, userEmail])

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
      <div className="min-h-screen bg-[#0A0F2E] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B4FFF]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F2E] flex items-start justify-center pt-24 md:pt-32 p-4">
      <div className="w-full max-w-lg">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {([1, 2] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  s <= step
                    ? 'bg-[#1B4FFF] text-white shadow-lg shadow-[#1B4FFF]/30'
                    : 'bg-white/5 border border-white/10 text-white/30'
                }`}
              >
                {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
              {s < 2 && (
                <div className={`w-12 h-0.5 rounded-full transition-colors duration-300 ${s < step ? 'bg-[#1B4FFF]' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Premium card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl shadow-2xl shadow-black/40 p-8 md:p-10">

          {/* === STEP 1: Profile Form === */}
          {step === 1 && (
            <>
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Kompleto profilin</h2>
                <p className="text-white/50 text-sm">Plotëso të dhënat për të vazhduar</p>
              </div>

              {submitted && error && (
                <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/20 text-red-400 rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleStep1Submit} className="space-y-5">
                <div>
                  <Label htmlFor="firstName" className="text-white/60 text-sm font-medium mb-1.5">Emri</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input
                      id="firstName"
                      placeholder="Emri yt"
                      className="pl-11 h-12 rounded-xl bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-[#1B4FFF]/60 focus:bg-white/12"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="lastName" className="text-white/60 text-sm font-medium mb-1.5">Mbiemri</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input
                      id="lastName"
                      placeholder="Mbiemri yt"
                      className="pl-11 h-12 rounded-xl bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-[#1B4FFF]/60 focus:bg-white/12"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white/60 text-sm font-medium mb-1.5">Numri i telefonit</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+383 44 123 456"
                      className="pl-11 h-12 rounded-xl bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-[#1B4FFF]/60 focus:bg-white/12"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl font-semibold text-white bg-[#1B4FFF] hover:bg-[#1640CC] shadow-lg shadow-[#1B4FFF]/25 cursor-pointer"
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
                <h2 className="text-2xl font-bold text-white mb-2">Verifiko email-in</h2>
                <p className="text-white/50 text-sm">
                  Shkruani kodin 6-shifror që dërguam në {userEmail}
                </p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/20 text-red-400 rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-[#1B4FFF]/15 rounded-2xl flex items-center justify-center">
                    <Mail className="h-10 w-10 text-[#1B4FFF]" />
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
                    }}
                    className="w-48 h-16 text-center text-4xl font-bold tracking-[0.5em] bg-white/8 border border-white/15 rounded-xl text-white placeholder:text-white/20 focus:border-[#1B4FFF]/60 focus:bg-white/12"
                  />
                </div>

                <p className="text-sm text-center text-white/40">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resending}
                      className="text-[#1B4FFF] hover:text-[#1640CC] font-medium cursor-pointer disabled:opacity-50"
                    >
                      {resending ? 'Duke u ridërguar...' : 'Ridërgo kodin'}
                    </button>
                  ) : (
                    <>Kodi skadon pas {countdown} sekondave</>
                  )}
                </p>

                <button
                  type="button"
                  onClick={() => { router.push('/'); router.refresh() }}
                  className="w-full h-12 rounded-xl border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white font-medium transition-colors inline-flex items-center justify-center cursor-pointer"
                >
                  Vazhdo pa verifikim
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
