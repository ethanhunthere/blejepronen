'use client'

import Link from 'next/link'
import { MessagesSquare, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react'

export default function MesazhetPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-[#F2F7F7] min-h-[500px]">
      <div className="max-w-md w-full text-center bg-white border border-gray-100/90 shadow-sm rounded-3xl p-8 sm:p-10">
        {/* Modern Illustration Badge */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#006459]/15 via-emerald-50 to-[#C8B882]/20 flex items-center justify-center border border-[#006459]/20 shadow-inner mb-6">
          <MessagesSquare className="w-10 h-10 text-[#006459]" />
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#006459] text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#C8B882]" />
          </span>
        </div>

        {/* Crisp High-Contrast Typography */}
        <h2 className="text-xl sm:text-2xl font-black text-[#101828] tracking-tight mb-2">
          Zgjidhni një bisedë
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          Zgjidhni një bisedë nga kolona majtas për të lexuar mesazhet dhe për të komunikuar drejtpërdrejt me pronarin ose blerësin.
        </p>

        {/* Security & Direct Contact Guarantee */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-800 mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Komunikim i sigurt & 0% provizion</span>
        </div>

        {/* Secondary Action */}
        <div className="pt-2 border-t border-gray-100">
          <Link
            href="/listings"
            className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-gray-50 hover:bg-gray-100 text-[#006459] text-xs sm:text-sm font-bold border border-gray-200 transition-colors"
          >
            <span>Eksploro pronat e reja</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
