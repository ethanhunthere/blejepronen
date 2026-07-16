'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/Logo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })

    if (error) {
      setError('Gabim gjatë dërgimit të linkut. Provo përsëri.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F2F7F7] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border border-gray-100 rounded-3xl">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#1A1A2E]">Kontrollo email-in!</h2>
            <p className="text-gray-500">
              Dërguam linkun e rivendosjes te <strong>{email}</strong>.
              Kliko linkun për të vendosur fjalëkalimin e ri.
            </p>
            <Link href="/login" className="mt-4 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Shko te hyrja
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F7F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Logo variant="auth" />
        </div>

        <Card className="shadow-xl border border-gray-100 rounded-3xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-[#1A1A2E]">Rivendos fjalëkalimin</CardTitle>
            <CardDescription className="text-center text-gray-500">
              Vendos email-in dhe do të të dërgojmë një link
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border border-red-200 text-red-600">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <button
                type="submit"
                className="w-full h-11 bg-[#006459] hover:bg-[#005048] text-white rounded-xl font-semibold transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Duke dërguar...' : 'Dërgo linkun'}
              </button>
            </form>
          </CardContent>

          <CardFooter>
            <Link href="/login" className="w-full inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kthehu te hyrja
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
