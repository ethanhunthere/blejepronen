'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RouteErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function RouteError({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-gray-100 shadow-sm rounded-2xl p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#1A1A2E] mb-2">Diçka shkoi keq</h1>
        <p className="text-gray-400 mb-6">
          Gabim gjatë ngarkimit të faqes. Provo të rifreskosh ose kthehu më vonë.
        </p>
        <Button
          onClick={reset}
          className="bg-[#1B4FFF] hover:bg-[#1640CC] text-white cursor-pointer"
        >
          Provo përsëri
        </Button>
      </div>
    </div>
  )
}
