'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Mail, Lock, CheckCircle2, RotateCcw, ArrowLeft, Loader2, AlertCircle, Building2 } from 'lucide-react'
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const [oauthLoading, setOauthLoading] = useState<string | null>(null)

  const isOAuthCancel = (errText?: string | null) => {
    if (!errText) return false
    const lower = errText.toLowerCase()
    return (
      lower.includes('cancel') ||
      lower.includes('dismiss') ||
      lower.includes('popup_closed') ||
      lower.includes('access_denied') ||
      lower.includes('user closed') ||
      lower.includes('window closed')
    )
  }

  const handleOAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    try {
      setOauthLoading(provider)
      setError('')

      const providerNames: Record<string, string> = {
        google: 'Google',
        apple: 'Apple',
        facebook: 'Facebook',
      }
      const providerTitle = providerNames[provider] || provider

      // Persist persona selection across OAuth boundary
      try {
        document.cookie = `blejepronen_persona=${accountType}; path=/; max-age=600; SameSite=Lax`
        localStorage.setItem('blejepronen_persona', accountType)
      } catch {}

      const origin = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace('www.', '')
      const targetProvider = provider as
        | 'google'
        | 'apple'
        | 'facebook'

      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: targetProvider,
        options: {
          redirectTo: `${origin}/auth/callback`,
          skipBrowserRedirect: false,
          queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
        },
      })

      if (oauthErr) {
        if (isOAuthCancel(oauthErr.message)) {
          setOauthLoading(null)
          return
        }
        const msg = oauthErr.message?.toLowerCase() || ''
        const errObj = oauthErr as unknown as { code?: string | number; status?: number }
        if (msg.includes('provider is not enabled') || errObj.code === 400 || errObj.status === 400) {
          setError(`Regjistrimi përmes ${providerTitle} po përgatitet në sistem. Mund të regjistroheni menjëherë me Google ose me email.`)
        } else {
          setError(oauthErr.message || `Ndodhi një problem gjatë regjistrimit me ${providerTitle}.`)
        }
        setOauthLoading(null)
        return
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      if (isOAuthCancel(errMsg)) {
        setOauthLoading(null)
        return
      }
      console.error(`${provider} OAuth error:`, err)
      setError(`Regjistrimi përmes këtij opsioni po aktivizohet. Përdorni Google ose email për hyrje të menjëhershme.`)
      setOauthLoading(null)
    }
  }

  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <AuthShell
      headline="Regjistrohu dhe fillo sot"
      subline="Zbulo shtëpinë tënde të ardhshme ose vendos pronën tënde para mijëra vizitorëve."
    >
      {step === 'form' ? (
        <AuthPanel
          title="Krijo llogari"
          subtitle={
            accountType === 'company'
              ? 'Regjistro agjencinë ose kompaninë tënde'
              : 'Krijo profilin tënd personal falas'
          }
          googleLabel="Google"
          onGoogle={() => handleOAuth('google')}
          onApple={() => handleOAuth('apple')}
          onFacebook={() => handleOAuth('facebook')}
          oauthLoading={oauthLoading}
          accountType={accountType}
          onAccountTypeChange={(t) => {
            setAccountType(t)
            if (fieldErrors.companyName) setFieldErrors((p) => ({ ...p, companyName: undefined }))
          }}
          showAccountTypeSelector={true}
          error={error}
          footer={
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5">
              <span>Keni tashmë një llogari?</span>
              <Link href="/login" className="font-bold text-[#00675B] hover:underline inline-flex items-center gap-0.5">
                Hyr këtu →
              </Link>
            </div>
          }
        >
          <form onSubmit={handleRegister} noValidate className="space-y-2.5 sm:space-y-3">
            {/* Extra reassurance hint when Kompani is selected */}
            {accountType === 'company' && (
              <div className="p-2 rounded-xl bg-[#00675B]/5 border border-[#00675B]/20 text-[11px] text-[#00675B] flex items-center gap-1.5 animate-in fade-in duration-200">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-[#00675B]" />
                <span>
                  Llogaria e kompanisë pajiset me profil agjencie dhe etiketë zyrtare në të gjitha pronat.
                </span>
              </div>
            )}

            {/* Extra field when Kompani is selected */}
            {accountType === 'company' && (
              <AuthField
                id="companyName"
                label="Emri i Kompanisë / Agjencisë"
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
              label={accountType === 'company' ? 'Email zyrtar i kompanisë' : 'Email'}
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
              helperText={
                password.length > 0 ? (
                  password.length >= 6 ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-1 mt-0.5 text-[11px]">
                      <CheckCircle2 className="h-3 w-3" /> Fjalëkalimi plotëson kriteret
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium flex items-center gap-1 mt-0.5 text-[11px]">
                      <AlertCircle className="h-3 w-3" /> Duhen të paktën 6 karaktere
                    </span>
                  )
                ) : undefined
              }
            />

            <button
              type="submit"
              className="mt-1 w-full min-h-[40px] h-10 sm:h-10.5 bg-[#00675B] hover:bg-[#004D43] active:scale-[0.99] text-white text-xs sm:text-[14px] font-semibold rounded-xl transition-all shadow-sm shadow-[#00675B]/20 hover:shadow-md hover:shadow-[#00675B]/30 inline-flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading || !!oauthLoading}
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

            <p className="text-[10.5px] text-gray-500 text-center leading-normal pt-0.5">
              Duke u regjistruar, ju pranoni{' '}
              <Link href="/kushtet" className="text-gray-700 underline hover:text-[#00675B]">
                Kushtet e Përdorimit
              </Link>{' '}
              dhe{' '}
              <Link href="/privatesia" className="text-gray-700 underline hover:text-[#00675B]">
                Politikën e Privatësisë
              </Link>
              .
            </p>
          </form>
        </AuthPanel>
      ) : (
        <div className="w-full">
          {/* Professional Success Banner */}
          <div className="mb-3 p-2.5 rounded-xl bg-[#00675B]/10 border border-[#00675B]/25 text-[#00675B] text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="h-4 w-4 text-[#00675B] shrink-0 mt-0.5" />
            <div className="leading-snug">
              <p className="font-bold text-[#00675B]">Kodi i verifikimit u dërgua me sukses!</p>
              <p className="mt-0.5 text-gray-600">
                Kemi dërguar kodin 6-shifror te <strong className="text-[#101828] font-semibold">{email}</strong>.
              </p>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-[#101828]">
            Verifiko email-in
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Vendos kodin 6-shifror për të aktivizuar llogarinë
          </p>

          <div className="mt-3.5">
            {error && (
              <Alert
                variant="destructive"
                className="mb-3.5 py-2.5 px-3.5 bg-red-50/90 border border-red-200 text-red-600 rounded-xl text-xs sm:text-[13px] leading-snug animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <AlertDescription className="text-xs sm:text-[13px] font-medium flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="otp-code" className="text-xs sm:text-[13px] font-semibold text-gray-700 block mb-2">
                  Kodi i verifikimit
                </label>
                <div
                  className="relative cursor-text"
                  onClick={() => inputRef.current?.focus()}
                >
                  <input
                    ref={inputRef}
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
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
                    className="absolute inset-0 opacity-0 w-full h-full cursor-text z-10"
                    aria-label="Kodi i verifikimit 6-shifror"
                  />
                  <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                    {[0, 1, 2, 3, 4, 5].map((index) => {
                      const char = code[index] || ''
                      const isFocused = code.length === index || (code.length === 6 && index === 5)
                      return (
                        <div
                          key={index}
                          className={`h-12 sm:h-14 rounded-xl border flex items-center justify-center text-xl sm:text-2xl font-bold font-mono transition-all duration-150 select-none ${
                            char
                              ? 'border-[#00675B] bg-[#00675B]/5 text-[#101828] shadow-xs'
                              : isFocused
                              ? 'border-[#00675B] bg-white ring-2 ring-[#00675B]/20 text-transparent'
                              : 'border-gray-200 bg-gray-50/80 text-transparent'
                          }`}
                        >
                          {char || (isFocused ? <span className="w-0.5 h-6 bg-[#00675B] animate-pulse" /> : '')}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleVerify(code)}
                disabled={verifying || redirecting || code.length !== 6}
                className="w-full min-h-[44px] h-11 sm:h-12 bg-[#00675B] hover:bg-[#004D43] active:scale-[0.99] text-white text-sm sm:text-[15px] font-semibold rounded-xl transition-all shadow-md shadow-[#00675B]/20 hover:shadow-lg hover:shadow-[#00675B]/30 inline-flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="text-[#00675B] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
