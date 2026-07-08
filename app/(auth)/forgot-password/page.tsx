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
      <div className="min-h-screen bg-[#0A0F2E] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Kontrollo email-in!</h2>
            <p className="text-gray-400">
              Dërguam linkun e rivendosjes te <strong>{email}</strong>.
              Kliko linkun për të vendosur fjalëkalimin e ri.
            </p>
            <Link href="/login" className="mt-4 inline-flex items-center justify-center rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors">
              Shko te hyrja
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F2E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Logo variant="auth" />
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Rivendos fjalëkalimin</CardTitle>
            <CardDescription className="text-center">
              Vendos email-in dhe do të të dërgojmë një link
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="emri@email.com"
                    className="pl-10 h-11 bg-white/10 text-white placeholder:text-white/40 border-white/10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-[#1B4FFF] hover:bg-[#1640CC] text-white rounded-xl font-semibold transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Duke dërguar...' : 'Dërgo linkun'}
              </button>
            </form>
          </CardContent>

          <CardFooter>
            <Link href="/login" className="w-full inline-flex items-center justify-center rounded-xl border-2 border-white px-5 py-2 text-sm font-semibold text-white hover:bg-white hover:text-[#1B4FFF] transition-colors cursor-pointer">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kthehu te hyrja
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
