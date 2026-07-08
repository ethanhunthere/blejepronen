'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Lock, User, Phone, Globe } from 'lucide-react'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password.length < 6) {
      setError('Fjalëkalimi duhet të ketë të paktën 6 karaktere.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone
        }
      }
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
        redirectTo: `${window.location.origin}/auth/callback`,
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
      <div className="min-h-screen bg-[#0A0F2E] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Kontrollo email-in!</h2>
            <p className="text-gray-400">
              Dërguam një link konfirmimi te <strong>{formData.email}</strong>.
              Kliko linkun për të aktivizuar llogarinë tënde.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center justify-center rounded-xl border-2 border-white bg-transparent px-5 py-2 text-sm font-semibold text-white hover:bg-white hover:text-[#1B4FFF] transition-colors cursor-pointer"
              onClick={() => router.push('/login')}
            >
              Shko te hyrja
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F2E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Krijo llogari</CardTitle>
            <CardDescription className="text-center">
              30 ditë falas, pa kartë krediti
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <button
              type="button"
              className="w-full h-11 border-2 border-white bg-transparent text-white hover:bg-white hover:text-[#1B4FFF] rounded-xl font-semibold transition-colors inline-flex items-center justify-center cursor-pointer"
              onClick={handleGoogleLogin}
            >
              <Globe className="mr-2 h-4 w-4" />
              Regjistrohu me Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0A0F2E] px-2 text-gray-500">ose</span>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Emri</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="Arben"
                      className="pl-10 h-11 bg-white/10 text-white placeholder:text-white/40 border-white/10"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Mbiemri</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder="Krasniqi"
                    className="h-11 bg-white/10 text-white placeholder:text-white/40 border-white/10"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Numri i telefonit</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+383 44 123 456"
                    className="pl-10 h-11 bg-white/10 text-white placeholder:text-white/40 border-white/10"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="emri@email.com"
                    className="pl-10 h-11 bg-white/10 text-white placeholder:text-white/40 border-white/10"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Fjalëkalimi</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Minimum 6 karaktere"
                    className="pl-10 h-11 bg-white/10 text-white placeholder:text-white/40 border-white/10"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-[#1B4FFF] hover:bg-[#1640CC] text-white mt-2 rounded-xl font-semibold transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Duke u regjistruar...' : 'Krijo llogari falas'}
              </button>
            </form>
          </CardContent>

          <CardFooter>
            <p className="text-sm text-gray-400 text-center w-full">
              Ke llogari?{' '}
              <Link href="/login" className="text-[#1B4FFF] hover:underline font-medium">
                Hyr këtu
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
