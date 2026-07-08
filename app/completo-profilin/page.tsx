'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Mail, CheckCircle2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

// NOTE: Magic link verification is used instead of OTP.
// The callback route handles token_hash for magic link verification.
// Supabase Dashboard → Authentication → Email → enable magic link.

type Step = 1 | 2

export default function CompletoProfilinPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [resending, setResending] = useState(false)

  // Step 1 fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [userEmail, setUserEmail] = useState('')

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

    // Send magic link to email — no shouldCreateUser because users
    // who signed up via Google OAuth have provider:'google', not 'email'.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: userEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (otpError) {
      console.error('OTP error:', JSON.stringify(otpError))
      console.error('Magic link send error details:', {
        message: otpError.message,
        name: otpError.name,
        status: (otpError as unknown as { status?: number }).status,
        code: (otpError as unknown as { code?: string }).code,
        email: userEmail,
      })
      setError('Gabim gjatë dërgimit të linkut. Provo përsëri.')
      setLoading(false)
      return
    }

    toast.success('Linku i verifikimit u dërgua me email!')
    setStep(2)
    setLoading(false)
  }, [firstName, lastName, userEmail])

  const handleResendMagicLink = async () => {
    if (!userEmail) return
    setResending(true)
    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: userEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (otpError) {
      console.error('Resend OTP error:', JSON.stringify(otpError))
      toast.error('Gabim gjatë ridërgimit të linkut.')
    } else {
      toast.success('Linku u ridërgua me email!')
    }
    setResending(false)
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
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/40 p-8 md:p-10">

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

          {/* === STEP 2: Magic Link Sent === */}
          {step === 2 && (
            <>
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Verifiko email-in</h2>
                <p className="text-white/50 text-sm">
                  Klikoni linkun në email-in tuaj për të verifikuar llogarinë.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-[#1B4FFF]/15 rounded-2xl flex items-center justify-center">
                    <Mail className="h-10 w-10 text-[#1B4FFF]" />
                  </div>
                </div>

                <p className="text-sm text-center text-white/40">
                  Nëse nuk e shihni email-in, kontrolloni dosjen e spam-it.
                </p>

                <button
                  type="button"
                  onClick={handleResendMagicLink}
                  className="w-full h-12 rounded-xl border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white font-medium transition-colors cursor-pointer"
                  disabled={resending}
                >
                  {resending ? 'Duke u ridërguar...' : 'Ridërgo linkun'}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#0A0F2E] px-3 text-white/30">ose</span>
                  </div>
                </div>

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

