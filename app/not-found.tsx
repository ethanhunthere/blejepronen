import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 | Bleje Banesën',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
      <div className="text-center px-4">
        <div className="text-7xl mb-6">🏚️</div>
        <h1 className="text-4xl font-bold text-[#1A1A2E] mb-3">Faqja nuk u gjet</h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Na vjen keq, faqja që po kërkoni nuk ekziston ose është zhvendosur.
        </p>
        <Link href="/">
          <Button className="bg-[#1B4FFF] hover:bg-[#1640CC] text-white">
            Kthehu në ballinë
          </Button>
        </Link>
      </div>
    </div>
  )
}
