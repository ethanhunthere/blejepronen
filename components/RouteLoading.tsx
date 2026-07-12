import { Loader2 } from 'lucide-react'

export default function RouteLoading() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-[#1B4FFF]" />
    </div>
  )
}
