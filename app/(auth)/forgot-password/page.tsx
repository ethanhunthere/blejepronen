'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { CheckCircle2, ArrowLeft, Loader2, Mail } from 'lucide-react'
import AuthShell from '@/components/AuthShell'
import AuthField from '@/components/AuthField'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Ju lutem shkruani email-in tuaj.')
      return
    }
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback`,
    })

    if (resetError) {
      setError('Gabim gjatë dërgimit të linkut. Ju lutemi provoni përsëri.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <AuthShell
        headline="Rikthehu te llogaria jote"
        subline="Vendos fjalëkalimin e ri dhe vazhdo me pronat e tua."
      >
        <div className="w-full text-center">
          <div className="w-16 h-16 bg-[#006459]/10 border border-[#006459]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-[#006459]" />
          </div>
          <h1 className="text-2xl sm:text-[27px] font-black leading-tight tracking-tight text-[#101828]">
            Kontrollo email-in!
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
            Dërguam linkun e sigurt të rivendosjes te <strong className="text-[#101828]">{email}</strong>. Kliko linkun në email për të vendosur fjalëkalimin e ri.
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/login"
              className="w-full min-h-[44px] h-11 sm:h-12 bg-[#006459] hover:bg-[#005048] active:scale-[0.99] text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-[#006459]/20 inline-flex items-center justify-center cursor-pointer"
            >
              Shko te hyrja
            </Link>

            <button
              type="button"
              onClick={() => {
                setSuccess(false)
                setEmail('')
              }}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium cursor-pointer"
            >
              Dërgo në një email tjetër
            </button>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      headline="Rikthehu te llogaria jote"
      subline="Vendos fjalëkalimin e ri dhe vazhdo me pronat e tua."
    >
      <div className="w-full">
        <h1 className="text-2xl sm:text-[27px] font-black leading-tight tracking-tight text-[#101828]">
          Rivendos fjalëkalimin
        </h1>
        <p className="mt-1.5 text-xs sm:text-[13.5px] text-gray-500">
          Vendos email-in e llogarisë tënde dhe do të të dërgojmë linkun e rivendosjes.
        </p>

        <div className="mt-5">
          {error && (
            <Alert
              variant="destructive"
              className="mb-3.5 py-2.5 px-3.5 bg-red-50/90 border border-red-200 text-red-600 rounded-xl text-xs sm:text-[13px] leading-snug animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <AlertDescription className="text-xs sm:text-[13px] font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
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
                if (error) setError('')
              }}
            />

            <button
              type="submit"
              className="mt-2 w-full min-h-[44px] h-11 sm:h-12 bg-[#006459] hover:bg-[#005048] active:scale-[0.99] text-white text-sm sm:text-[15px] font-semibold rounded-xl transition-all shadow-md shadow-[#006459]/20 hover:shadow-lg hover:shadow-[#006459]/30 inline-flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Duke dërguar linkun...
                </span>
              ) : (
                'Dërgo linkun e rivendosjes'
              )}
            </button>
          </form>
        </div>

        <div className="mt-5 border-t border-gray-100 pt-3 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold text-gray-600 hover:text-[#006459] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kthehu te hyrja</span>
          </Link>
        </div>
      </div>
    </AuthShell>
  )
}
