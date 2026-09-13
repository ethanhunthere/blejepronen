'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Mail, Lock, CheckCircle2, RotateCcw, ArrowLeft, Loader2, AlertCircle, User, Building2 } from 'lucide-react'
import AuthShell from '@/components/AuthShell'
import AuthPanel from '@/components/AuthPanel'
import AuthField from '@/components/AuthField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
    companyName?: string
  }>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    router.prefetch('/completo-profilin-fast')
    router.prefetch('/completo-profilin-company')
    router.prefetch('/')
  }, [router])

  useEffect(() => {
    if (step === 'verify') {
      try {
        if (accountType === 'company') {
          router.prefetch('/completo-profilin-company')
        } else {
          router.prefetch('/completo-profilin-fast')
        }
      } catch {}
      setCountdown(60)
      setCanResend(false)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [step, accountType, router])

  const validate = () => {
    const next: { email?: string; password?: string; companyName?: string } = {}
    if (accountType === 'company') {
      if (!companyName.trim()) next.companyName = 'Emri i kompanisë është i detyrueshëm.'
      else if (companyName.trim().length < 2) next.companyName = 'Të paktën 2 karaktere.'
    }
    if (!email.trim()) next.email = 'Email-i është i detyrueshëm.'
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Shkruaj një email të vlefshëm.'
    if (!password) next.password = 'Fjalëkalimi është i detyrueshëm.'
    else if (password.length < 6) next.password = 'Të paktën 6 karaktere.'
    setFieldErrors(next)
    if (next.companyName) document.getElementById('companyName')?.focus()
    else if (next.email) document.getElementById('email')?.focus()
    else if (next.password) document.getElementById('password')?.focus()
    return Object.keys(next).length === 0
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          accountType,
          companyName: accountType === 'company' ? companyName.trim() : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Gabim gjatë regjistrimit. Ju lutemi provoni përsëri.')
        setLoading(false)
        return
      }

      setStep('verify')
      setLoading(false)
    } catch (err) {
      console.error('Registration submit error:', err)
      setError('Lidhja me serverin dështoi. Kontrolloni internetin dhe provoni përsëri.')
      setLoading(false)
    }
  }

  const handleVerify = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6 || verifying) return
    setError('')
    setVerifying(true)

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: codeToVerify,
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.message || 'Kodi është i gabuar ose ka skaduar.')
        setVerifying(false)
        return
      }

      // Automatically sign in the user now that email is confirmed
      setRedirecting(true)

      let authed = false
      if (password) {
        try {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })
          if (!signInErr && signInData?.session) {
            authed = true
          }
        } catch (signInErr) {
          console.warn('Auto sign-in notice:', signInErr)
        }
      }

      if (!authed && data.session) {
        try {
          await supabase.auth.setSession(data.session)
          authed = true
        } catch (sessErr) {
          console.warn('setSession notice:', sessErr)
        }
      }

      const targetRoute = accountType === 'company' ? '/completo-profilin-company' : '/completo-profilin-fast'
      if (typeof window !== 'undefined') {
        window.location.replace(targetRoute)
      } else {
        router.replace(targetRoute)
      }
    } catch (err) {
      console.error('Verification error:', err)
      setError('Gabim gjatë verifikimit. Provoni përsëri.')
      setVerifying(false)
      setRedirecting(false)
    }
  }

  const handleResend = async () => {
    if (!canResend || resending) return
    setError('')
    setResending(true)

    try {
      const res = await fetch('/api/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Dështoi ridërgimi i kodit. Provoni përsëri.')
        setResending(false)
        return
      }

      toast.success(`Një kod i ri u dërgua me sukses në ${email.trim()}.`)
      setCode('')
      setCountdown(60)
      setCanResend(false)
      setResending(false)
    } catch (err) {
      console.error('Resend error:', err)
      setError('Lidhja me serverin dështoi. Provoni përsëri.')
      setResending(false)
    }
  }

  const handleGoogleLogin = async () => {
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace('www.', '')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
        skipBrowserRedirect: false,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })
  }

  return (
    <AuthShell
      headline="Regjistrohu dhe fillo sot"
      subline="Zbulo shtëpinë tënde të ardhshme ose vendos pronën tënde para mijëra vizitorëve."
    >
      {step === 'form' ? (
        <AuthPanel
          title="Krijo llogari"
          subtitle="Gjej shtëpi ose posto pronën tënde"
          googleLabel="Regjistrohu me Google"
          onGoogle={handleGoogleLogin}
          error={error}
          footer={
            <span>
              Ke llogari?{' '}
              <Link href="/login" className="font-medium text-[#006459] hover:underline">
                Hyr këtu
              </Link>
            </span>
          }
        >
          <form onSubmit={handleRegister} noValidate className="space-y-2.5 sm:space-y-3">
            {/* Account Type Selector — Lands on Individual by default */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 border border-gray-200/80 mb-3">
              <button
                type="button"
                onClick={() => {
                  setAccountType('individual')
                  if (fieldErrors.companyName) setFieldErrors((p) => ({ ...p, companyName: undefined }))
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs sm:text-[13px] font-semibold transition-all cursor-pointer ${
                  accountType === 'individual'
                    ? 'bg-white text-[#006459] shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Individual</span>
              </button>

              <button
                type="button"
                onClick={() => setAccountType('company')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs sm:text-[13px] font-semibold transition-all cursor-pointer ${
                  accountType === 'company'
                    ? 'bg-white text-[#006459] shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Kompani</span>
              </button>
            </div>

            {/* Extra field when Kompani is selected */}
            {accountType === 'company' && (
              <AuthField
                id="companyName"
                label="Emri i Kompanisë"
                type="text"
                placeholder="psh. Iliria Real Estate"
                autoComplete="organization"
                icon={<Building2 className="h-4 w-4" />}
                value={companyName}
                onChange={(v) => {
                  setCompanyName(v)
                  if (fieldErrors.companyName) setFieldErrors((p) => ({ ...p, companyName: undefined }))
                }}
                error={fieldErrors.companyName}
              />
            )}

            <AuthField
              id="email"
              label={accountType === 'company' ? 'Email i kompanisë' : 'Email'}
              type="email"
              placeholder={accountType === 'company' ? 'info@kompania.com' : 'emri@email.com'}
              autoComplete="email"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(v) => {
                setEmail(v)
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }))
              }}
              error={fieldErrors.email}
            />

            <AuthField
              id="password"
              label="Fjalëkalimi"
              type="password"
              placeholder="Minimum 6 karaktere"
              autoComplete="new-password"
              icon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={(v) => {
                setPassword(v)
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }))
              }}
              error={fieldErrors.password}
            />

            <button
              type="submit"
              className="mt-1 w-full h-10 sm:h-11 bg-[#006459] text-white text-sm font-semibold rounded-xl hover:bg-[#005048] transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Duke u regjistruar...
                </span>
              ) : (
                'Regjistrohu'
              )}
            </button>
          </form>
        </AuthPanel>
      ) : (
        <div className="w-full">
          {/* Professional Success Banner */}
          <div className="mb-4 p-3 rounded-2xl bg-[#006459]/10 border border-[#006459]/25 text-[#006459] text-xs sm:text-[13px] flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="h-4 w-4 text-[#006459] shrink-0 mt-0.5" />
            <div className="leading-snug">
              <p className="font-bold text-[#006459]">Kodi i verifikimit u dërgua me sukses!</p>
              <p className="mt-0.5 text-gray-600">
                Kemi dërguar kodin 6-shifror te <strong className="text-[#101828] font-semibold">{email}</strong>.
              </p>
            </div>
          </div>

          <h1 className="text-2xl sm:text-[26px] font-extrabold leading-tight tracking-tight text-[#101828]">
            Verifiko email-in
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Vendos kodin 6-shifror për të aktivizuar llogarinë
          </p>

          <div className="mt-5">
            {error && (
              <Alert
                variant="destructive"
                className="mb-3 py-2 px-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs sm:text-[13px] leading-snug"
              >
                <AlertDescription className="text-xs sm:text-[13px] font-medium flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <div>
                <label htmlFor="otp-code" className="text-xs sm:text-[13px] font-semibold text-gray-700 block mb-1.5">
                  Kodi i verifikimit
                </label>
                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="••••••"
                  autoFocus
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setCode(val)
                    if (error) setError('')
                    if (val.length === 6) {
                      handleVerify(val)
                    }
                  }}
                  className="w-full h-12 text-center text-2xl sm:text-3xl font-bold font-mono tracking-[0.35em] sm:tracking-[0.5em] rounded-xl border border-gray-200 bg-gray-50/80 focus:bg-white focus:border-[#006459] outline-none text-[#101828] transition-all placeholder:text-gray-300"
                />
              </div>

              <button
                type="button"
                onClick={() => handleVerify(code)}
                disabled={verifying || redirecting || code.length !== 6}
                className="w-full h-10 sm:h-11 bg-[#006459] text-white text-sm font-semibold rounded-xl hover:bg-[#005048] transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {redirecting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Po hapet profili...
                  </span>
                ) : verifying ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Duke verifikuar...
                  </span>
                ) : (
                  'Verifiko dhe vazhdo'
                )}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('form')
                    setError('')
                  }}
                  className="text-gray-500 hover:text-gray-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Ndrysho email-in
                </button>

                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-[#006459] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Duke dërguar...' : 'Ridërgo kodin'}
                  </button>
                ) : (
                  <span className="text-gray-400">
                    Ridërgo pas <strong className="text-gray-600 font-semibold">{countdown}s</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthShell>
  )
}
