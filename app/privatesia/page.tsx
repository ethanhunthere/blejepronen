import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Politika e Privatësisë | Bleje Pronën',
  description: 'Politika e privatësisë dhe standardet e mbrojtjes së të dhënave personale në Bleje Pronën.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F2F7F7] py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-6 sm:p-10 lg:p-12 border border-gray-100 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.05)]">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs font-bold text-[#00675B] uppercase tracking-wider mb-2">
            <Lock className="w-4 h-4" />
            <span>Mbrojtja e të Dhënave & GDPR</span>
          </div>

          <PageHeader
            title="Politika e Privatësisë"
            subtitle="Përditësuar së fundmi: 2026. Transparenca dhe siguria e të dhënave tuaja personale janë prioriteti ynë kryesor."
          />

          <div className="space-y-8 divide-y divide-gray-100">
            {/* Section 1 */}
            <section className="pt-6 first:pt-0">
              <h2 className="text-base sm:text-lg font-bold text-[#101828] mb-2.5 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#00675B]/10 text-[#00675B] text-xs font-bold mr-2.5 shrink-0">
                  1
                </span>
                Të Dhënat që Mbledhim
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Gjatë krijimit të llogarisë suaj në Bleje Pronën, ne mbledhim informacionin bazë të identifikimit: emrin, mbiemrin, adresën e email-it dhe numrin e telefonit (nëse zgjidhni ta ndani për kontakt). Kur postoni një pronë, ruajmë detajet e listimit, qytetin, çmimin dhe fotografitë që vendosni të ngarkoni.
              </p>
            </section>

            {/* Section 2 */}
            <section className="pt-6">
              <h2 className="text-base sm:text-lg font-bold text-[#101828] mb-2.5 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#00675B]/10 text-[#00675B] text-xs font-bold mr-2.5 shrink-0">
                  2
                </span>
                Përdorimi i Informacionit
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Të dhënat tuaja përdoren ekskluzivisht për të mundësuar funksionimin e platformës: shfaqjen e listimeve, lehtësimin e komunikimit të drejtpërdrejtë ndërmjet blerësve dhe shitësve, mbrojtjen ndaj spam-it dhe dërgimin e njoftimeve përkatëse. <strong>Ne nuk i shesim dhe nuk ua transferojmë kurrë të dhënat tuaja palëve të treta për qëllime marketingu.</strong>
              </p>
            </section>

            {/* Section 3 */}
            <section className="pt-6">
              <h2 className="text-base sm:text-lg font-bold text-[#101828] mb-2.5 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#00675B]/10 text-[#00675B] text-xs font-bold mr-2.5 shrink-0">
                  3
                </span>
                Cookies dhe Teknologjitë e Ngjashme
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Përdorim cookies thelbësore për të mbajtur seancën tuaj të kyçur të sigurt dhe cookies analitike minimale për të kuptuar performancën teknike të faqes. Çdo përdorues ka kontroll të plotë mbi preferencat e cookies përmes shiritit tonë të njoftimit në fund të faqes.
              </p>
            </section>

            {/* Section 4 */}
            <section className="pt-6">
              <h2 className="text-base sm:text-lg font-bold text-[#101828] mb-2.5 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#00675B]/10 text-[#00675B] text-xs font-bold mr-2.5 shrink-0">
                  4
                </span>
                Siguria e Infrastrukturës & Enkriptimi
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                I gjithë komunikimi në Bleje Pronën është i enkriptuar me protokollin modern TLS/HTTPS. Baza e të dhënave menaxhohet me rregulla strikte të nivelit të lartë (Row Level Security - RLS), duke siguruar që mesazhet private dhe cilësimet e llogarisë të jenë të qasshme vetëm nga zotëruesi legjitim.
              </p>
            </section>

            {/* Section 5 */}
            <section className="pt-6">
              <h2 className="text-base sm:text-lg font-bold text-[#101828] mb-2.5 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#00675B]/10 text-[#00675B] text-xs font-bold mr-2.5 shrink-0">
                  5
                </span>
                Të Drejtat Tuaja & Fshirja e Llogarisë
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Ju gëzoni të drejtën e plotë për të shkarkuar të dhënat tuaja, për të modifikuar profilin në çdo çast përmes faqes së cilësimeve, apo për të kërkuar fshirjen e përhershme të llogarisë dhe të gjitha shpalljeve të lidhura me të.
              </p>
            </section>
          </div>

          {/* Privacy Officer Contact */}
          <div className="mt-10 p-5 rounded-2xl bg-[#00675B]/5 border border-[#00675B]/15 flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#00675B] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs sm:text-sm">
              <p className="font-bold text-[#101828]">Keni pyetje rreth privatësisë?</p>
              <p className="text-gray-600 mt-0.5">
                Kontaktoni drejtpërdrejt ekipin tonë të mbrojtjes së të dhënave në:{' '}
                <a href="mailto:blejepronen@gmail.com" className="text-[#00675B] font-bold underline">
                  blejepronen@gmail.com
                </a>
              </p>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="border-t border-gray-100 pt-6 mt-8 flex items-center justify-between flex-wrap gap-4 text-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-semibold text-gray-600 hover:text-[#00675B] transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Kthehu në ballinë</span>
            </Link>

            <div className="flex items-center gap-4 text-gray-500">
              <Link href="/kushtet" className="hover:text-[#00675B] transition-colors">
                Kushtet e Përdorimit
              </Link>
              <span>•</span>
              <Link href="/kontakti" className="hover:text-[#00675B] transition-colors">
                Kontakti
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
