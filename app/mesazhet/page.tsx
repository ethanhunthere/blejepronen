import { MessageCircle } from 'lucide-react'

export default function MesazhetPage() {
  return (
    <div className="hidden lg:flex flex-1 items-center justify-center bg-[#0A0F2E]">
      <div className="text-center px-6">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="h-10 w-10 text-white/15" />
        </div>
        <h2 className="text-lg font-semibold text-white/60 mb-1">Zgjidhni një bisedë</h2>
        <p className="text-sm text-white/30 max-w-xs mx-auto">
          Zgjidhni një bisedë nga lista për të parë mesazhet
        </p>
      </div>
    </div>
  )
}
