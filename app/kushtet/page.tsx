import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Scale } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Kushtet e Përdorimit | Bleje Pronën',
  description: 'Kushtet dhe rregullat ligjore të përdorimit të platformës imobiliare Bleje Pronën.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F2F7F7] py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-6 sm:p-10 lg:p-12 border border-gray-100 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.05)]">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs font-bold text-[#006459] uppercase tracking-wider mb-2">
            <Scale className="w-4 h-4" />
            <span>Dokument Zyrtar & Transparencë</span>
          </div>

          <PageHeader
            title="Kushtet e Përdorimit"
            subtitle="Përditësuar së fundmi: 2026. Ju lutemi lexoni me vëmendje rregullat dhe kushtet e përdorimit të platformës Bleje Pronën."
          />

          <div className="space-y-8 divide-y divide-gray-100">
            {/* Section 1 */}
            <section className="pt-6 first:pt-0">
              <h2 className="text-base sm:text-lg font-bold text-[#101828] mb-2.5 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#006459]/10 text-[#006459] text-xs font-bold mr-2.5 shrink-0">
                  1
                </span>
                Pranimi i Kushteve
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Duke hyrë, shfletuar ose përdorur shërbimet e platformës Bleje Pronën, ju konfirmoni se keni lexuar, kuptuar dhe pranoni të jeni të detyruar nga këto Kushte Përdorimi. Nëse nuk pajtoheni me ndonjë pjesë të këtyre rregullave, ju lutemi mos vazhdoni përdorimin e platformës.
              </p>
            </section>

            {/* Section 2 */}
            <section className="pt-6">
              <h2 className="text-base sm:text-lg font-bold text-[#101828] mb-2.5 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#006459]/10 text-[#006459] text-xs font-bold mr-2.5 shrink-0">
                  2
                </span>
                Natyra e Shërbimit
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Bleje Pronën funksionon si platformë teknologjike për publikimin, zbulimin dhe lidhjen e drejtpërdrejtë ndërmjet pronarëve, shitësve, qiradhënësve dhe blerësve apo qiramarrësve potencialë. Bleje Pronën nuk vepron si agjenci imobiliare me komision të fshehur dhe nuk merr pjesë aktive në negociatat financiare apo nënshkrimin e kontratave finale noteriale.
              </p>
            </section>

            {/* Section 3 */}
            <section className="pt-6">
              <h2 className="text-base sm:text-lg font-bold text-[#101828] mb-2.5 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#006459]/10 text-[#006459] text-xs font-bold mr-2.5 shrink-0">
                  3
                </span>
                Përgjegjësitë e Përdoruesit & Saktësia e Shpalljeve
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Çdo përdorues që publikon një pronë mban përgjegjësi të plotë ligjore për vërtetësinë e të dhënave, çmimit, koordinatave dhe fotove të ngarkuara. Është rreptësisht e ndaluar publikimi i pronave inekzistente, çmimeve mashtruese ose pronave për të cilat nuk posedoni autorizim të ligjshëm për shitje ose qiradhënie.
              </p>
            </section>

            {/* Section 4 */}
            <section className="pt-6">
              <h2 className="text-base sm:text-lg font-bold text-[#101828] mb-2.5 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#006459]/10 text-[#006459] text-xs font-bold mr-2.5 shrink-0">
                  4
                </span>
                Krijimi dhe Siguria e Llogarisë
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Për të publikuar prona dhe dërguar mesazhe të drejtpërdrejta në platformë, kërkohet regjistrimi me një adresë të saktë emaili dhe fjalëkalim të sigurt. Përdoruesi është përgjegjës për ruajtjen e konfidencialitetit të të dhënave të qasjes në llogari.
              </p>
            </section>

            {/* Section 5 */}
            <section className="pt-6">
              <h2 className="text-base sm:text-lg font-bold text-[#101828] mb-2.5 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#006459]/10 text-[#006459] text-xs font-bold mr-2.5 shrink-0">
                  5
                </span>
                Periudha Provë & Publikimi Falas
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Platforma ofron periudhë promovuese 30-ditore pa asnjë pagesë për çdo listim të ri. Ne nuk kërkojmë të dhëna të kartës së kreditit për publikimin fillestar. Çdo rinovim apo veçori promocionale e ardhshme menaxhohet me transparencë të plotë me ekipin tonë të mbështetjes.
              </p>
            </section>

            {/* Section 6 */}
            <section className="pt-6">
              <h2 className="text-base sm:text-lg font-bold text-[#101828] mb-2.5 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#006459]/10 text-[#006459] text-xs font-bold mr-2.5 shrink-0">
                  6
                </span>
                Përmbajtja e Ndaluar & Masat Disiplinore
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Ndalohet rreptësisht ngarkimi i fotove me watermark nga platforma konkurruese pa autorizim, përmbajtje fyese, spam, apo komunikim kërcënues përmes modulit të mesazheve. Bleje Pronën rezervon të drejtën të pezullojë ose fshijë menjëherë çdo njoftim ose llogari që shkel këto standarde.
              </p>
            </section>

            {/* Section 7 */}
            <section className="pt-6">
              <h2 className="text-base sm:text-lg font-bold text-[#101828] mb-2.5 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#006459]/10 text-[#006459] text-xs font-bold mr-2.5 shrink-0">
                  7
                </span>
                Kufizimi i Përgjegjësisë
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Bleje Pronën bën çdo përpjekje të arsyeshme për të verifikuar integritetin e përdoruesve, por nuk garanton gjendjen fizike të pronave, pastërtinë e dokumenteve hipotekore apo korrektësinë e pagesave ndërmjet palëve. Rekomandojmë gjithmonë kryerjen e kontrolleve juridike te noteri përpara çdo transaksioni.
              </p>
            </section>
          </div>

          {/* Guarantee Highlight */}
          <div className="mt-10 p-5 rounded-2xl bg-[#006459]/5 border border-[#006459]/15 flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#006459] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs sm:text-sm">
              <p className="font-bold text-[#101828]">Komunitet i Besuar dhe i Hapur</p>
              <p className="text-gray-600 mt-0.5">
                Për çdo raportim apo kërkesë sqarimi, na shkruani lirisht në{' '}
                <a href="mailto:blejepronen@gmail.com" className="text-[#006459] font-bold underline">
                  blejepronen@gmail.com
                </a>
              </p>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="border-t border-gray-100 pt-6 mt-8 flex items-center justify-between flex-wrap gap-4 text-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-semibold text-gray-600 hover:text-[#006459] transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Kthehu në ballinë</span>
            </Link>

            <div className="flex items-center gap-4 text-gray-500">
              <Link href="/privatesia" className="hover:text-[#006459] transition-colors">
                Politika e Privatësisë
              </Link>
              <span>•</span>
              <Link href="/kontakti" className="hover:text-[#006459] transition-colors">
                Kontakti
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
