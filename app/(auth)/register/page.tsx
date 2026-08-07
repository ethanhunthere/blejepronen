'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Lock, Globe } from 'lucide-react'
import AuthShell from '@/components/AuthShell'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('Fjalëkalimi duhet të ketë të paktën 6 karaktere.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError('Gabim gjatë regjistrimit. Provo përsëri.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
        skipBrowserRedirect: false,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    })
  }

  if (success) {
    return (
      <AuthShell>
        <Card className="w-full max-w-md border border-gray-200/60 rounded-3xl shadow-[0_24px_64px_-24px_rgba(0,20,17,0.55)]">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#1A1A2E]">Kontrollo email-in!</h2>
            <p className="text-gray-500">
              Dërguam një link konfirmimi te <strong>{email}</strong>.
              Kliko linkun për të aktivizuar llogarinë tënde.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center justify-center min-h-[44px] rounded-xl bg-[#006459] text-white px-5 py-2 text-sm font-semibold hover:bg-[#005048] hover:shadow-lg hover:shadow-[#006459]/25 hover:-translate-y-[1px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-out cursor-pointer"
              onClick={() => router.push('/login')}
            >
              Shko te hyrja
            </button>
          </CardContent>
        </Card>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="w-full max-w-md">
        <Card className="border border-gray-200/60 rounded-3xl shadow-[0_24px_64px_-24px_rgba(0,20,17,0.55)]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-extrabold tracking-tight text-center text-[#1A1A2E]">Krijo llogari</CardTitle>
            <CardDescription className="text-center text-gray-500">
              30 ditë falas, pa kartë krediti
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border border-red-200 text-red-600">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <button
              type="button"
              className="w-full h-11 bg-white border border-gray-200/80 text-gray-700 font-semibold hover:bg-gray-50 transition-colors inline-flex items-center justify-center cursor-pointer rounded-xl"
              onClick={handleGoogleLogin}
            >
              <Globe className="mr-2 h-4 w-4" />
              Regjistrohu me Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">ose</span>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px] text-gray-700 font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="emri@email.com"
                    className="pl-10 h-11 rounded-xl bg-gray-50 text-[#1A1A2E] placeholder:text-gray-400 border-gray-200/80 focus:bg-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px] text-gray-700 font-medium">Fjalëkalimi</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 karaktere"
                    className="pl-10 h-11 rounded-xl bg-gray-50 text-[#1A1A2E] placeholder:text-gray-400 border-gray-200/80 focus:bg-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-[#006459] text-white rounded-xl font-semibold hover:bg-[#005048] transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Duke u regjistruar...' : 'Regjistrohu'}
              </button>
            </form>
          </CardContent>

          <CardFooter>
            <p className="text-sm text-gray-400 text-center w-full">
              Ke llogari?{' '}
              <Link href="/login" className="text-[#111827] hover:underline font-medium">
                Hyr këtu
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </AuthShell>
  )
}
