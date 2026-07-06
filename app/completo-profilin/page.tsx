'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Mail, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

// NOTE: SMS OTP via phone provider is disabled. Email OTP is used instead.
// Supabase Dashboard → Authentication → Providers → Phone: disable if not using SMS.
// Supabase Dashboard → Authentication → Email → enable "Enable email OTP" / "Confirm email" as needed.

type Step = 1 | 2 | 3

export default function CompletoProfilinPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Step 1 fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  // Step 2 fields
  const [otp, setOtp] = useState('')

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
        .select('first_name, phone_verified')
        .eq('id', user.id)
        .single()

      if (profile?.first_name && profile?.phone_verified) {
        router.push('/')
      }
    }

    init()
  }, [router])

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

    // Save profile data (first_name and last_name only)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      })

    if (profileError) {
      console.error('Profile update error:', profileError)
      setError('Gabim gjatë ruajtjes së profilit. Provo përsëri.')
      setLoading(false)
      return
    }

    // Send OTP to email
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: userEmail,
      options: {
        shouldCreateUser: false,
      },
    })

    if (otpError) {
      console.error('Email OTP send error:', otpError)
      setError('Gabim gjatë dërgimit të kodit me email. Provo përsëri.')
      setLoading(false)
      return
    }

    toast.success('Kodi i verifikimit u dërgua me email!')
    setStep(2)
    setLoading(false)
  }, [firstName, lastName, userEmail])

  const handleStep2Submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitted(true)

    if (otp.length < 6) {
      setError('Kodi duhet të ketë të paktën 6 shifra.')
      return
    }

    if (!userEmail) {
      setError('Nuk u gjet email-i. Ju lutemi ri-filloni procesin.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Sesioni ka skaduar.')
      setLoading(false)
      return
    }

    // Verify OTP via email
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: userEmail,
      token: otp,
      type: 'email',
    })

    if (verifyError) {
      console.error('Email OTP verify error:', verifyError)
      setError('Kodi i gabuar ose ka skaduar. Provo përsëri.')
      setLoading(false)
      return
    }

    // Email OTP verified — mark profile as verified
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ phone_verified: true })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile verify update error:', updateError)
      // Don't block — OTP was verified, profile update is non-critical
    }

    setStep(3)
    setLoading(false)
  }, [otp, userEmail])

  // Auto-redirect after step 3
  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [step, router])

  const handleResendOtp = async () => {
    if (!userEmail) return
    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: userEmail,
      options: { shouldCreateUser: false },
    })

    if (otpError) {
      toast.error('Gabim gjatë ridërgimit të kodit.')
    } else {
      toast.success('Kodi u ridërgua me email!')
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  s <= step
                    ? 'bg-[#1B4FFF] text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-8 h-0.5 ${s < step ? 'bg-[#1B4FFF]' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step titles */}
        <div className="text-center mb-6">
          {step === 1 && (
            <p className="text-sm text-gray-500">Hapi 1 — Plotëso të dhënat e profilit</p>
          )}
          {step === 2 && (
            <p className="text-sm text-gray-500">Hapi 2 — Verifiko email-in</p>
          )}
          {step === 3 && (
            <p className="text-sm text-gray-500">Hapi 3 — Profili u kompletua</p>
          )}
        </div>

        <Card className="shadow-lg border-0">
          {/* === STEP 1: Profile Form === */}
          {step === 1 && (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">Kompleto profilin</CardTitle>
                <CardDescription className="text-center">
                  Plotëso të dhënat për të vazhduar
                </CardDescription>
              </CardHeader>

              <CardContent>
                {submitted && error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleStep1Submit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Emri</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="firstName"
                        placeholder="Emri yt"
                        className="pl-10 h-11"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Mbiemri</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="lastName"
                        placeholder="Mbiemri yt"
                        className="pl-10 h-11"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-[#1B4FFF] hover:bg-[#1640CC] text-white"
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
              </CardContent>
            </>
          )}

          {/* === STEP 2: Email OTP Verification === */}
          {step === 2 && (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">Verifiko email-in</CardTitle>
                <CardDescription className="text-center">
                  Dërguam një kod 6-shifror te email-i juaj:{' '}
                  <strong>{userEmail}</strong>
                </CardDescription>
              </CardHeader>

              <CardContent>
                {submitted && error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleStep2Submit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Kodi i verifikimit</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={7}
                        placeholder="000000"
                        className="pl-10 h-14 text-center text-2xl tracking-[0.5em] font-mono"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-[#1B4FFF] hover:bg-[#1640CC] text-white"
                    disabled={loading || otp.length < 6}
                  >
                    {loading ? 'Duke verifikuar...' : 'Verifiko'}
                  </Button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="w-full text-sm text-[#1B4FFF] hover:underline py-2"
                    disabled={loading}
                  >
                    Ridërgo kodin
                  </button>
                </form>
              </CardContent>
            </>
          )}

          {/* === STEP 3: Success === */}
          {step === 3 && (
            <>
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Profili u kompletua!</h2>
                <p className="text-gray-500">
                  Të dhënat u ruajtën me sukses. Po të ridrejtojmë në faqen kryesore...
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

