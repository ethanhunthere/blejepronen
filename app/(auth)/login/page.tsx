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

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState<React.ReactNode>('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    router.prefetch('/')
    router.prefetch('/completo-profilin-fast')
    router.prefetch('/completo-profilin-company')
    router.prefetch('/postimet-e-mia')
  }, [router])

  const validate = () => {
    const next: { email?: string; password?: string } = {}
    if (!email.trim()) next.email = 'Email-i është i detyrueshëm.'
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Shkruaj një email të vlefshëm.'
    if (!password) next.password = 'Fjalëkalimi është i detyrueshëm.'
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

        router.replace('/')
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
      headline="Mirë se erdhe prapë"
      subline="Gjej shtëpinë tënde të re ose posto pronën tënde brenda pak minutave."
    >
      <AuthPanel
        title="Hyr në llogari"
        subtitle="Futu me email ose Google"
        googleLabel="Hyr me Google"
        onGoogle={handleGoogleLogin}
        error={error}
        footer={
          <>
            <Link
              href="/forgot-password"
              className="font-medium text-[#006459] hover:underline"
            >
              Keni harruar fjalëkalimin?
            </Link>
            <span className="mx-2 text-gray-300">·</span>
            <span>
              Nuk ke llogari?{' '}
              <Link
                href="/register"
                className="font-medium text-[#006459] hover:underline"
              >
                Regjistrohu falas
              </Link>
            </span>
          </>
        }
      >
        <Suspense fallback={null}>
          <VerifiedMessage />
        </Suspense>

        <form onSubmit={handleLogin} noValidate className="space-y-2.5 sm:space-y-3">
          <AuthField
            id="email"
            label="Email"
            type="email"
            placeholder="emri@email.com"
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
            className="mt-1 w-full h-10 sm:h-11 bg-[#006459] text-white text-sm font-semibold rounded-xl hover:bg-[#005048] transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Duke hyrë...
              </span>
            ) : (
              'Hyr'
            )}
          </button>
        </form>
      </AuthPanel>
    </AuthShell>
  )
}

export default function LoginPage() {
  return <LoginForm />
}
