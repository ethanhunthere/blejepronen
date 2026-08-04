'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, ArrowLeft } from 'lucide-react'
import AuthShell from '@/components/AuthShell'

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
      <AuthShell>
        <Card className="w-full max-w-md border border-gray-200/60 rounded-3xl shadow-[0_24px_64px_-24px_rgba(0,20,17,0.55)]">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#1A1A2E]">Kontrollo email-in!</h2>
            <p className="text-gray-500">
              Dërguam linkun e rivendosjes te <strong>{email}</strong>.
              Kliko linkun për të vendosur fjalëkalimin e ri.
            </p>
            <Link href="/login" className="mt-4 inline-flex items-center justify-center min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 ease-out cursor-pointer">
              Shko te hyrja
            </Link>
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
            <CardTitle className="text-2xl font-extrabold tracking-tight text-center text-[#1A1A2E]">Rivendos fjalëkalimin</CardTitle>
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

              <button
                type="submit"
                className="w-full h-12 bg-[#006459] text-white rounded-xl font-semibold hover:bg-[#005048] transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Duke dërguar...' : 'Dërgo linkun'}
              </button>
            </form>
          </CardContent>

          <CardFooter>
            <Link href="/login" className="w-full inline-flex items-center justify-center min-h-[44px] rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 ease-out cursor-pointer">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kthehu te hyrja
            </Link>
          </CardFooter>
        </Card>
      </div>
    </AuthShell>
  )
}
