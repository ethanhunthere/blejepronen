'use client'

import { Phone } from 'lucide-react'

interface MobileContactBarProps {
  price: string
  pricePerSqm?: string | null
}

export default function MobileContactBar({ price, pricePerSqm }: MobileContactBarProps) {
  const scrollToContact = () => {
    if (typeof window === 'undefined') return
    const el = document.getElementById('contact-card')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#0A0F2E]/95 backdrop-blur-md border-t border-white/10 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xl font-black text-[#1B4FFF] truncate">{price}</p>
          {pricePerSqm && (
            <p className="text-xs text-white/50 truncate">{pricePerSqm}</p>
          )}
        </div>
        <button
          type="button"
          onClick={scrollToContact}
          className="shrink-0 inline-flex items-center gap-2 bg-[#1B4FFF] hover:bg-[#1640CC] text-white font-bold px-5 py-3 rounded-2xl text-sm transition-colors"
        >
          <Phone className="h-4 w-4" />
          Kontakto
        </button>
      </div>
    </div>
  )
}
