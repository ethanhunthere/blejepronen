'use client'

import { MessageCircle } from 'lucide-react'

export default function MesazhetPage() {
  return (
    <div className="flex-1 flex items-center justify-center flex-col bg-[#0A0F2E]">
      <MessageCircle className="w-16 h-16 text-white/10" />
      <p className="text-white/30 font-medium mt-4">Zgjidhni një bisedë</p>
      <p className="text-white/20 text-sm mt-2">Klikoni një bisedë nga lista për të filluar</p>
    </div>
  )
}

