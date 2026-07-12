'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function ListingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Listings error:', error)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-3">Ndodhi një gabim</h1>
        <p className="text-gray-500 mb-8">
          Nuk mundëm të ngarkonim banesat. Ju lutemi provoni përsëri.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="bg-[#111827] hover:bg-[#1F2937] text-white">
            Provo përsëri
          </Button>
          <Link href="/">
            <Button variant="outline" className="bg-white border-gray-200 text-gray-600">
              Kthehu në ballinë
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
