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

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ose fjalëkalimi është i gabuar.')
      setLoading(false)
      return
    }

    router.push('/')
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

  return (
    <AuthShell>
      <div className="w-full max-w-md">
        <Card className="border border-gray-200/60 rounded-3xl shadow-[0_16px_48px_-16px_rgba(0,40,35,0.12)]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-extrabold tracking-tight text-center text-[#1A1A2E]">Hyr në llogari</CardTitle>
            <CardDescription className="text-center text-gray-500">
              Futu me email ose Google
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border border-red-200 text-red-600">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <button
              type="button"
              className="w-full h-12 bg-white border border-gray-200/80 text-gray-700 font-semibold hover:bg-gray-50 transition-colors inline-flex items-center justify-center cursor-pointer rounded-xl"
              onClick={handleGoogleLogin}
            >
              <Globe className="mr-2 h-4 w-4" />
              Hyr me Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#F2F7F7] px-2 text-gray-400">ose</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px] text-gray-700 font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-4 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="emri@email.com"
                    className="pl-10 h-12 rounded-xl bg-gray-50 text-[#1A1A2E] placeholder:text-gray-400 border-gray-200/80 focus:bg-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px] text-gray-700 font-medium">Fjalëkalimi</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-4 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-12 rounded-xl bg-gray-50 text-[#1A1A2E] placeholder:text-gray-400 border-gray-200/80 focus:bg-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-[#006459] text-white rounded-xl font-semibold hover:bg-[#005048] transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Duke hyrë...' : 'Hyr'}
              </button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2">
            <p className="text-sm text-gray-400 text-center">
              <Link href="/forgot-password" className="text-[#111827] hover:underline font-medium">
                Keni harruar fjalëkalimin?
              </Link>
            </p>
            <p className="text-sm text-gray-400 text-center">
              Nuk ke llogari?{' '}
              <Link href="/register" className="text-[#111827] hover:underline font-medium">
                Regjistrohu falas
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </AuthShell>
  )
}
