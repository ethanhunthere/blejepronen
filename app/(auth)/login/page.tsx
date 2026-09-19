'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Mail, Lock, CheckCircle2, Loader2 } from 'lucide-react'
import AuthShell from '@/components/AuthShell'
import AuthPanel from '@/components/AuthPanel'
import AuthField from '@/components/AuthField'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function VerifiedMessage() {
  const searchParams = useSearchParams()
  const isVerified = searchParams.get('verified') === 'true'
  if (!isVerified) return null

  return (
    <div className="mb-3 p-2.5 rounded-xl bg-[#006459]/10 border border-[#006459]/20 text-[#006459] text-xs sm:text-[13px] flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#006459]" />
      <span>Email-i u verifikua me sukses! Tani mund të hyni në llogari.</span>
    </div>
  )
}

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

function LoginForm() {
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState<React.ReactNode>('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    router.prefetch('/')
    router.prefetch('/completo-profilin-fast')
    router.prefetch('/completo-profilin-company')
    router.prefetch('/postimet-e-mia')
  }, [router])

  const validate = () => {
    const next: { email?: string; password?: string } = {}
    if (!email.trim()) {
      next.email = accountType === 'company'
        ? 'Email-i i kompanisë është i detyrueshëm.'
        : 'Email-i është i detyrueshëm.'
    } else if (!EMAIL_RE.test(email.trim())) {
      next.email = 'Shkruaj një email të vlefshëm.'
    }
    if (!password) {
      next.password = 'Fjalëkalimi është i detyrueshëm.'
    }
    setFieldErrors(next)
    if (next.email) document.getElementById('email')?.focus()
    else if (next.password) document.getElementById('password')?.focus()
    return Object.keys(next).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    if (!validate()) return
    setLoading(true)

    const cleanEmail = email.trim().toLowerCase()

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (!signInError) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          try {
            localStorage.setItem('blejepronen_cached_user', JSON.stringify(user))
            document.documentElement.setAttribute('data-auth', 'logged-in')
          } catch {}

          const hasCompletedOnboarding = Boolean(user.user_metadata?.onboarding_completed)
          const isComp = user.user_metadata?.account_type === 'company' || Boolean(user.user_metadata?.company_name) || accountType === 'company'

          if (!hasCompletedOnboarding) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, email_verified')
              .eq('id', user.id)
              .maybeSingle()

            if (!profile?.first_name || !profile?.email_verified) {
              router.replace(isComp ? '/completo-profilin-company' : '/completo-profilin-fast')
              return
            }
          }
        }

        const nextUrl = searchParams.get('redirect') || searchParams.get('next') || '/'
        router.replace(nextUrl)
        return
      }

      const msg = signInError.message?.toLowerCase() || ''

      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        setError(
          <span>
            Email-i nuk është verifikuar ende.{' '}
            <Link href="/register" className="font-bold underline hover:opacity-90">
              Shko te regjistrimi për të futur kodin
            </Link>
          </span>
        )
        setFieldErrors({ email: 'Email-i nuk është verifikuar ende.' })
        setLoading(false)
        return
      }

      // Check if user exists in the system to provide accurate, specific feedback
      const checkRes = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      })

      if (checkRes.ok) {
        const checkData = await checkRes.json()

        if (checkData.exists === false) {
          setError(
            <span>
              Kjo llogari nuk ekziston.{' '}
              <Link href="/register" className="font-bold underline hover:opacity-90">
                Regjistrohu falas këtu
              </Link>
            </span>
          )
          setFieldErrors({ email: 'Kjo llogari nuk është e regjistruar.' })
          setLoading(false)
          return
        }

        if (checkData.exists === true && checkData.emailConfirmed === false) {
          setError(
            <span>
              Llogaria juaj nuk është verifikuar ende.{' '}
              <Link href="/register" className="font-bold underline hover:opacity-90">
                Verifiko email-in këtu
              </Link>
            </span>
          )
          setFieldErrors({ email: 'Email-i nuk është verifikuar ende.' })
          setLoading(false)
          return
        }

        if (checkData.exists === true) {
          setError('Fjalëkalimi është i pasaktë. Ju lutemi provoni përsëri.')
          setFieldErrors({ password: 'Fjalëkalimi është i pasaktë.' })
          setLoading(false)
          return
        }
      }

      setError('Email ose fjalëkalimi është i pasaktë.')
      setLoading(false)
    } catch (err) {
      console.error('Login error:', err)
      setError('Ndodhi një gabim gjatë hyrjes. Provoni përsëri.')
      setLoading(false)
    }
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
        if (msg.includes('provider is not enabled') || (oauthErr as any).code === 400 || (oauthErr as any).status === 400) {
          setError(`Hyrja përmes ${providerTitle} po përgatitet në sistem. Mund të kyçeni menjëherë me Google ose me email.`)
        } else {
          setError(oauthErr.message || `Ndodhi një problem me hyrjen përmes ${providerTitle}.`)
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
      setError(`Hyrja përmes këtij opsioni po aktivizohet. Përdorni Google ose email për hyrje të menjëhershme.`)
      setOauthLoading(null)
    }
  }

  return (
    <AuthShell
      headline="Mirë se erdhe prapë"
      subline="Gjej shtëpinë tënde të re ose menaxho pronat e tua me shpejtësi."
    >
      <AuthPanel
        title="Hyr në llogari"
        subtitle={
          accountType === 'company'
            ? 'Kyçu në profilin e biznesit ose agjencisë'
            : 'Futu me llogarinë tënde personale'
        }
        googleLabel="Google"
        onGoogle={() => handleOAuth('google')}
        onApple={() => handleOAuth('apple')}
        onFacebook={() => handleOAuth('facebook')}
        oauthLoading={oauthLoading}
        accountType={accountType}
        onAccountTypeChange={setAccountType}
        showAccountTypeSelector={true}
        error={error}
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5">
            <span>Nuk keni llogari ende?</span>
            <Link
              href="/register"
              className="font-bold text-[#006459] hover:underline inline-flex items-center gap-0.5"
            >
              Regjistrohu falas →
            </Link>
          </div>
        }
      >
        <Suspense fallback={null}>
          <VerifiedMessage />
        </Suspense>

        <form onSubmit={handleLogin} noValidate className="space-y-2.5 sm:space-y-3">
          <AuthField
            id="email"
            label={accountType === 'company' ? 'Email Zyrtar i Kompanisë' : 'Email'}
            type="email"
            placeholder={accountType === 'company' ? 'zyra@kompania.com' : 'emri@email.com'}
            autoComplete="email"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(v) => {
              setEmail(v)
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }))
              if (error) setError('')
            }}
            error={fieldErrors.email}
          />

          <AuthField
            id="password"
            label="Fjalëkalimi"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            icon={<Lock className="h-4 w-4" />}
            topRight={
              <Link
                href="/forgot-password"
                className="font-medium text-[11.5px] text-[#006459] hover:underline"
              >
                Keni harruar fjalëkalimin?
              </Link>
            }
            value={password}
            onChange={(v) => {
              setPassword(v)
              if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }))
              if (error) setError('')
            }}
            error={fieldErrors.password}
          />

          <button
            type="submit"
            className="mt-1 w-full min-h-[40px] h-10 sm:h-10.5 bg-[#006459] hover:bg-[#005048] active:scale-[0.99] text-white text-xs sm:text-[14px] font-semibold rounded-xl transition-all shadow-sm shadow-[#006459]/20 hover:shadow-md hover:shadow-[#006459]/30 inline-flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading || !!oauthLoading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Duke hyrë...
              </span>
            ) : accountType === 'company' ? (
              'Hyr si Kompani / Biznes'
            ) : (
              'Hyr në llogari'
            )}
          </button>
        </form>
      </AuthPanel>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
