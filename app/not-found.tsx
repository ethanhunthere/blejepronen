import Link from 'next/link'
import type { Metadata } from 'next'
import { Compass, Home, Search } from 'lucide-react'

export const metadata: Metadata = {
  title: '404 — Faqja nuk u gjet | Bleje Pronën',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F2F7F7] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-lg mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-[0_12px_40px_-15px_rgba(0,0,0,0.06)]">
        {/* Luxury Badge */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#006459]/15 via-emerald-50 to-[#C8B882]/20 flex items-center justify-center border border-[#006459]/20 shadow-inner mb-6">
          <Compass className="w-10 h-10 text-[#006459] animate-spin" style={{ animationDuration: '24s' }} />
          <span className="absolute -top-1 -right-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-[#006459] text-white shadow-sm">
            404
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-[#101828] tracking-tight mb-2.5">
          Faqja nuk u gjet
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mb-8 leading-relaxed max-w-md mx-auto">
          Adresa e kërkuar mund të jetë zhvendosur, fshirë, ose nuk ekziston më në platformë.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-[#006459] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#006459]/20 hover:bg-[#005048] active:scale-95 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Kthehu në ballinë</span>
          </Link>

          <Link
            href="/listings"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-gray-50 hover:bg-gray-100 text-[#101828] text-xs sm:text-sm font-bold border border-gray-200 active:scale-95 transition-all cursor-pointer"
          >
            <Search className="w-4 h-4 text-[#006459]" />
            <span>Eksploro pronat</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
