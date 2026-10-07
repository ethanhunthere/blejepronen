'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PageError({ error, reset }: PageErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] transition-colors">
      <div
        role="alert"
        aria-live="assertive"
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm sm:shadow-md p-6 sm:p-8 text-center transition-colors"
      >
        {/* Branded error icon */}
        <div className="mx-auto mb-5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
        </div>

        {/* Title and message */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
          Diçka shkoi keq
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
          Gabim gjatë ngarkimit të faqes. Provo të rifreskosh ose kthehu në ballinë nëse problemi vazhdon.
        </p>

        {/* Telemetry error digest (safe production display) */}
        {error.digest && (
          <div className="mb-6 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 px-3 py-2 text-left sm:text-center">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ID e incidentit
            </p>
            <code className="mt-0.5 block font-mono text-xs text-slate-700 dark:text-slate-300 select-all break-all">
              {error.digest}
            </code>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Button
            type="button"
            onClick={reset}
            className="w-full sm:w-auto h-11 min-h-[44px] px-5 rounded-xl bg-[#00675B] hover:bg-[#004D43] text-white dark:bg-[#00675B] dark:hover:bg-[#00574D] font-medium text-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Provo përsëri</span>
          </Button>

          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'default' }),
              'w-full sm:w-auto h-11 min-h-[44px] px-5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2'
            )}
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>Kthehu në Ballinë</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
