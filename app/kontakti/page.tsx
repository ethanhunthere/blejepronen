import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'
import Link from 'next/link'
import { Mail, MessageCircle, MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Kontakti | Bleje Pronën',
  description: 'Na kontaktoni për çdo pyetje, sugjerim apo problem me platformën Bleje Pronën.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#F2F7F7] py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <PageHeader title="Kontakti" />
          <p className="text-gray-600 mb-8">
            Kemi kënaqësinë t&apos;ju ndihmojmë. Na shkruani për çdo pyetje, sugjerim apo problem.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <Mail className="h-5 w-5 text-[#101828]" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <a href="mailto:blejepronen@gmail.com" className="text-[#101828] hover:underline font-medium">
                  blejepronen@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <MessageCircle className="h-5 w-5 text-[#101828]" />
              <div>
                <p className="text-sm text-gray-600">Koha e përgjigjes</p>
                <p className="text-[#101828] font-medium">Brenda 24 orëve gjatë ditëve të punës</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <MapPin className="h-5 w-5 text-[#101828]" />
              <div>
                <p className="text-sm text-gray-600">Zona e shërbimit</p>
                <p className="text-[#101828] font-medium">Kosovë, Shqipëri dhe Maqedoni e Veriut</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold text-[#101828] mb-3">Çfarë mund të raportoni?</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-1 mb-6">
              <li>Listime të dyshimta ose mashtruese</li>
              <li>Probleme teknike me platformën</li>
              <li>Kërkesa për fshirjen e të dhënave personale</li>
              <li>Sugjerime për përmirësimin e shërbimit</li>
            </ul>
            <div className="text-center">
              <Link href="/" className="text-[#101828] hover:underline">← Kthehu në faqen kryesore</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
