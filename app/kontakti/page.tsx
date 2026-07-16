import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, MessageCircle, MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Kontakti | Bleje Banesën',
  description: 'Na kontaktoni për çdo pyetje, sugjerim apo problem me platformën Bleje Banesën.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#F2F7F7] py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <h1 className="text-3xl font-bold text-[#1A1A2E] mb-4">Kontakti</h1>
          <p className="text-gray-500 mb-8">
            Kemi kënaqësinë t&apos;ju ndihmojmë. Na shkruani për çdo pyetje, sugjerim apo problem.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <Mail className="h-5 w-5 text-[#111827]" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <a href="mailto:blejepronen@gmail.com" className="text-[#111827] hover:underline font-medium">
                  blejepronen@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <MessageCircle className="h-5 w-5 text-[#111827]" />
              <div>
                <p className="text-sm text-gray-500">Koha e përgjigjes</p>
                <p className="text-[#1A1A2E] font-medium">Brenda 24 orëve gjatë ditëve të punës</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <MapPin className="h-5 w-5 text-[#111827]" />
              <div>
                <p className="text-sm text-gray-500">Zona e shërbimit</p>
                <p className="text-[#1A1A2E] font-medium">Kosovë, Shqipëri dhe Maqedoni e Veriut</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold text-[#1A1A2E] mb-3">Çfarë mund të raportoni?</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-1 mb-6">
              <li>Listime të dyshimta ose mashtruese</li>
              <li>Probleme teknike me platformën</li>
              <li>Kërkesa për fshirjen e të dhënave personale</li>
              <li>Sugjerime për përmirësimin e shërbimit</li>
            </ul>
            <div className="text-center">
              <Link href="/" className="text-[#111827] hover:underline">← Kthehu në faqen kryesore</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
