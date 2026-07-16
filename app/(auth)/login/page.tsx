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
    <div className="min-h-screen bg-[#f4f9f8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border border-gray-100 rounded-3xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-[#1A1A2E]">Hyr në llogari</CardTitle>
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
              className="w-full h-11 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-semibold transition-colors inline-flex items-center justify-center cursor-pointer"
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
                <span className="bg-[#f4f9f8] px-2 text-gray-400">ose</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-600 font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="emri@email.com"
                    className="pl-10 h-11 bg-white text-[#1A1A2E] placeholder:text-gray-400 border-gray-200"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-600 font-medium">Fjalëkalimi</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-11 bg-white text-[#1A1A2E] placeholder:text-gray-400 border-gray-200"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-[#111827] hover:bg-[#1F2937] text-white rounded-xl font-semibold transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
    </div>
  )
}
