'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, RotateCcw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Unhandled error:', error)
    }
  }, [error])

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F2F7F7] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-lg mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-[0_12px_40px_-15px_rgba(0,0,0,0.06)]">
        {/* Luxury Error Badge */}
        <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-6 shadow-2xs">
          <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-rose-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-[#101828] tracking-tight mb-2.5">
          Ndodhi një gabim i papritur
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mb-8 leading-relaxed max-w-md mx-auto">
          Sistemi hasi në një problem të përkohshëm gjatë procesimit të kërkesës. Ju lutemi provoni sërish ose kthehuni në ballinë.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-[#00675B] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#00675B]/20 hover:bg-[#004D43] active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Provo përsëri</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-gray-50 hover:bg-gray-100 text-[#101828] text-xs sm:text-sm font-bold border border-gray-200 active:scale-95 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4 text-gray-500" />
            <span>Kthehu në ballinë</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
