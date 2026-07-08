import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, MessageCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Kontakti | Bleje Banesën',
  description: 'Na kontaktoni për çdo pyetje, sugjerim apo problem me platformën Bleje Banesën.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-8 border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Kontakti</h1>
          <p className="text-gray-500 mb-8">
            Kemi kënaqësinë t&apos;ju ndihmojmë. Na shkruani për çdo pyetje, sugjerim apo problem.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <Mail className="h-5 w-5 text-[#1B4FFF]" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <a href="mailto:blejebanesen@gmail.com" className="text-[#1B4FFF] hover:underline font-medium">
                  blejebanesen@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <MessageCircle className="h-5 w-5 text-[#1B4FFF]" />
              <div>
                <p className="text-sm text-gray-500">Koha e përgjigjes</p>
                <p className="text-gray-900 font-medium">Brenda 24 orëve gjatë ditëve të punës</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 text-center">
            <Link href="/" className="text-[#1B4FFF] hover:underline">← Kthehu në faqen kryesore</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
