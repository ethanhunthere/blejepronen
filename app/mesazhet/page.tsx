'use client'

import { MessageCircle } from 'lucide-react'

export default function MesazhetPage() {
  return (
    <div className="flex-1 flex items-center justify-center flex-col bg-[#F2F7F7]">
      <MessageCircle className="w-16 h-16 text-gray-200" />
      <p className="text-gray-300 font-medium mt-4">Zgjidhni një bisedë</p>
      <p className="text-gray-200 text-sm mt-2">Klikoni një bisedë nga lista për të filluar</p>
    </div>
  )
}

