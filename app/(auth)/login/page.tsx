'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Mail, Lock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import AuthShell from '@/components/AuthShell'
import AuthPanel from '@/components/AuthPanel'
import AuthField from '@/components/AuthField'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function QueryNotices() {
  const searchParams = useSearchParams()
  const isVerified = searchParams.get('verified') === 'true'
  const isReset = searchParams.get('reset') === 'success'
  const isOauthError = searchParams.get('error') === 'oauth_callback_failed'

  if (isOauthError) {
    return (
      <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs sm:text-[13px] flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
        <span>
          Hyrja përmes rrjetit social dështoi. Ju mund të provoni përsëri ose të hyni me email dhe fjalëkalim.
        </span>
      </div>
    )
  }

  if (!isVerified && !isReset) return null

  return (
    <div className="mb-3 p-2.5 rounded-xl bg-[#00675B]/10 border border-[#00675B]/20 text-[#00675B] text-xs sm:text-[13px] flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00675B]" />
      <span>
        {isReset
          ? 'Fjalëkalimi u rivendos me sukses! Tani mund të hyni në llogari me fjalëkalimin e ri.'
          : 'Email-i u verifikua me sukses! Tani mund të hyni në llogari.'}
      </span>
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState<React.ReactNode>('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // A blocked OAuth redirect can resolve without error and without leaving
  // the page; never let the form stay locked in that case.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setOauthLoading(null)
    }
    const t = setTimeout(() => setOauthLoading(null), 20000)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    router.prefetch('/')
    router.prefetch('/completo-profilin-fast')
    router.prefetch('/completo-profilin-company')
    router.prefetch('/postimet-e-mia')
  }, [router])

  const validate = () => {
    const next: { email?: string; password?: string } = {}
    if (!email.trim()) {
      next.email = 'Email-i është i detyrueshëm.'
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
          const isComp = user.user_metadata?.account_type === 'company' || Boolean(user.user_metadata?.company_name)

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

        const rawNext = searchParams.get('redirect') || searchParams.get('next') || '/'
        const nextUrl = /^\/(?!\/)/.test(rawNext) ? rawNext : '/'
        router.replace(nextUrl)
        return
      }

      const msg = signInError.message?.toLowerCase() || ''
      const code = String((signInError as unknown as { code?: string | number }).code ?? '').toLowerCase()

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

      // Supabase auth errors handled directly (no extra network round-trips).
      if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
        setError('Email ose fjalëkalimi është i pasaktë.')
        setFieldErrors({ password: 'Email ose fjalëkalimi është i pasaktë.' })
        setLoading(false)
        return
      }

      if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('request this after')) {
        setError('Shumë tentativa hyrjeje. Prisni pak minuta dhe provoni përsëri.')
        setLoading(false)
        return
      }

      if (msg.includes('network') || msg.includes('fetch failed')) {
        setError('Nuk u lidhëm me serverin. Kontrolloni lidhjen dhe provoni përsëri.')
        setLoading(false)
        return
      }

      setError('Email ose fjalëkalimi është i pasaktë. Ju lutemi provoni përsëri.')
      setLoading(false)
    } catch (err) {
      console.error('Login error:', err)
      setError('Ndodhi një gabim gjatë hyrjes. Provoni përsëri.')
      setLoading(false)
    }
  }

  const handleGoogleOAuth = async () => {
    try {
      setOauthLoading('google')
      setError('')

      const origin = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace('www.', '')

      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
          skipBrowserRedirect: false,
          queryParams: { prompt: 'select_account' },
        },
      })

      if (oauthErr) {
        if (isOAuthCancel(oauthErr.message)) {
          setOauthLoading(null)
          return
        }
        setError(oauthErr.message || 'Ndodhi një problem gjatë hyrjes me Google.')
        setOauthLoading(null)
        return
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      if (isOAuthCancel(errMsg)) {
        setOauthLoading(null)
        return
      }
      console.error('Google OAuth error:', err)
      setError('Ndodhi një problem gjatë hyrjes me Google. Ju lutem provoni me email.')
      setOauthLoading(null)
    }
  }

  return (
    <AuthShell
      headline="Mirë se u kthyet"
      subline="Gjej shtëpinë tënde të re ose menaxho pronat e tua me shpejtësi."
    >
      <AuthPanel
        title="Hyr në llogari"
        subtitle="Futu me llogarinë tënde personale"
        googleLabel="Vazhdo me Google"
        onGoogle={handleGoogleOAuth}
        oauthLoading={oauthLoading}
        isSubmitting={loading}
        error={error}
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5">
            <span>Nuk keni llogari ende?</span>
            <Link
              href="/register"
              className="font-bold text-[#00675B] hover:underline inline-flex items-center gap-0.5"
            >
              Regjistrohu falas →
            </Link>
          </div>
        }
      >
        <Suspense fallback={null}>
          <QueryNotices />
        </Suspense>

        <form onSubmit={handleLogin} noValidate className="space-y-2 sm:space-y-2.5">
          <AuthField
            id="email"
            label="Email"
            type="email"
            placeholder="emri@email.com"
            autoComplete="username"
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
                className="font-medium text-[11px] text-[#00675B] hover:underline"
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
            className="mt-0.5 w-full min-h-[38px] h-9.5 sm:h-10 bg-[#00675B] hover:bg-[#004D43] active:scale-[0.99] text-white text-xs sm:text-[13.5px] font-semibold rounded-xl transition-all shadow-xs hover:shadow-sm inline-flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading || !!oauthLoading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Duke hyrë...
              </span>
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
