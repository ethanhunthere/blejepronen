'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Lock, CheckCircle2, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import AuthShell from '@/components/AuthShell'
import AuthField from '@/components/AuthField'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [expiredLink, setExpiredLink] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function verifySession() {
      // Supabase rejects expired/invalid recovery links at the callback and
      // redirects here with ?error=... — a session never materialises, so
      // neither does the form.
      const hasErrorParam = (() => {
        try {
          const params = new URLSearchParams(window.location.search)
          return Boolean(params.get('error') || params.get('error_description'))
        } catch {
          return false
        }
      })()

      let hasSession = false
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        hasSession = Boolean(session)
      } catch {
        hasSession = false
      }

      if (!hasSession || hasErrorParam) {
        setExpiredLink(true)
      }
      setCheckingSession(false)
    }

    verifySession()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password) {
      setError('Ju lutem vendosni fjalëkalimin tuaj të ri.')
      return
    }

    if (password.length < 6) {
      setError('Fjalëkalimi duhet të ketë të paktën 6 karaktere.')
      return
    }

    if (password !== confirmPassword) {
      setError('Fjalëkalimet nuk përputhen. Ju lutemi kontrolloni përsëri.')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/login?reset=success')
      }, 2500)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ndodhi një gabim gjatë rivendosjes së fjalëkalimit.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <AuthShell
        headline="Rivendosja e fjalëkalimit"
        subline="Verifikimi i lidhjes së sigurt..."
      >
        <div className="w-full flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#00675B]" />
          <p className="mt-3 text-xs sm:text-sm text-gray-500 font-medium">Duke verifikuar autorizimin tuaj...</p>
        </div>
      </AuthShell>
    )
  }

  if (success) {
    return (
      <AuthShell
        headline="Fjalëkalimi u Ndryshua"
        subline="Llogaria juaj është përditësuar me sukses."
      >
        <div className="w-full text-center py-4">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl sm:text-[27px] font-black leading-tight tracking-tight text-[#101828]">
            Fjalëkalimi u ruajt me sukses!
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
            Mund të hyni menjëherë në llogarinë tuaj me fjalëkalimin e ri. Po ju ridrejtojmë...
          </p>

          <div className="mt-6">
            <Link
              href="/login"
              className="w-full min-h-[44px] h-11 sm:h-12 bg-[#00675B] hover:bg-[#004D43] active:scale-[0.99] text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-[#00675B]/20 inline-flex items-center justify-center cursor-pointer"
            >
              Vazhdo te Hyrja
            </Link>
          </div>
        </div>
      </AuthShell>
    )
  }

  if (expiredLink) {
    return (
      <AuthShell
        headline="Rivendosja e fjalëkalimit"
        subline="Linku i sigurt nuk është më i vlefshëm."
      >
        <div className="w-full text-center py-4">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-2xl sm:text-[27px] font-black leading-tight tracking-tight text-[#101828]">
            Linku ka skaduar
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
            Ky link rivendosje ka skaduar ose nuk është i vlefshëm. Kërko një link të ri dhe ndiq hapin e parë.
          </p>

          <div className="mt-6 space-y-2.5">
            <Link
              href="/forgot-password"
              className="w-full min-h-[44px] h-11 sm:h-12 bg-[#00675B] hover:bg-[#004D43] active:scale-[0.99] text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-[#00675B]/20 inline-flex items-center justify-center cursor-pointer"
            >
              Kërko link të ri
            </Link>
            <Link
              href="/login"
              className="w-full min-h-[44px] h-11 inline-flex items-center justify-center gap-1.5 text-xs sm:text-[13px] text-gray-500 hover:text-gray-900 transition-colors cursor-pointer font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kthehu te hyrja</span>
            </Link>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      headline="Fjalëkalimi i Ri"
      subline="Vendosni një fjalëkalim të ri dhe të sigurt për llogarinë tuaj."
    >
      <div className="w-full">
        <h1 className="text-2xl sm:text-[27px] font-black leading-tight tracking-tight text-[#101828]">
          Krijoni fjalëkalim të ri
        </h1>
        <p className="mt-1.5 text-xs sm:text-[13.5px] text-gray-500">
          Zgjidhni një fjalëkalim të fortë me të paktën 6 karaktere.
        </p>

        <div className="mt-5">
          {error && (
            <Alert
              variant="destructive"
              className="mb-4 py-2.5 px-3.5 bg-red-50/90 border border-red-200 text-red-600 rounded-xl text-xs sm:text-[13px] leading-snug animate-in fade-in slide-in-from-top-1 duration-200 flex items-start gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <AuthField
                id="new-password"
                type="password"
                label="Fjalëkalimi i ri"
                placeholder="Të paktën 6 karaktere"
                autoComplete="new-password"
                value={password}
                onChange={(val) => setPassword(val)}
                icon={<Lock className="h-4 w-4 text-gray-400" />}
              />
            </div>

            <div>
              <AuthField
                id="confirm-password"
                type="password"
                label="Konfirmo fjalëkalimin e ri"
                placeholder="Rishkruani fjalëkalimin"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(val) => setConfirmPassword(val)}
                icon={<Lock className="h-4 w-4 text-gray-400" />}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] h-11 sm:h-12 bg-[#00675B] hover:bg-[#004D43] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-[#00675B]/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Duke ruajtur...</span>
                </>
              ) : (
                <span>Ruaj fjalëkalimin e ri</span>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] text-gray-500 hover:text-gray-900 transition-colors cursor-pointer font-medium"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Kthehu te hyrja</span>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AuthShell>
  )
}
