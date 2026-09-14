import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'
import Link from 'next/link'
import {
  Mail,
  Clock,
  Globe2,
  ShieldAlert,
  Home,
  Building2,
  Lock,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Kontakti | Bleje Pronën',
  description:
    'Na kontaktoni për çdo pyetje, sugjerim, partneritet apo mbështetje me platformën Bleje Pronën. Përgjigje brenda 24 orëve.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#F2F7F7] py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Card Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 lg:p-12 border border-gray-100 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.05)]">
          {/* Header */}
          <PageHeader
            title="Na Kontaktoni"
            subtitle="Jemi këtu për t'ju ndihmuar në çdo hap — mbështetje e dedikuar, pa ndërmjetës dhe përgjigje brenda 24 orëve."
          />

          {/* Quick Contact Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {/* Email Box */}
            <div className="flex flex-col justify-between p-5 bg-[#006459]/5 border border-[#006459]/15 rounded-2xl group hover:border-[#006459]/30 transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#006459] text-white flex items-center justify-center mb-3.5 shadow-sm shadow-[#006459]/20">
                  <Mail className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Email Zyrtar
                </p>
                <a
                  href="mailto:blejepronen@gmail.com"
                  className="text-sm sm:text-base font-bold text-[#006459] hover:underline break-all"
                >
                  blejepronen@gmail.com
                </a>
              </div>
              <a
                href="mailto:blejepronen@gmail.com?subject=K%C3%ABrkes%C3%AB%20nga%20Bleje%20Pron%C3%ABn"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006459] mt-4 group-hover:translate-x-0.5 transition-transform"
              >
                <span>Dërgo email tani</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Response Time Box */}
            <div className="flex flex-col justify-between p-5 bg-gray-50/80 border border-gray-100 rounded-2xl">
              <div>
                <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center mb-3.5 shadow-sm">
                  <Clock className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Koha e Përgjigjes
                </p>
                <p className="text-sm sm:text-base font-bold text-[#101828]">
                  Brenda 24 orëve
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Ekipi ynë monitoron mesazhet 7 ditë të javës.
              </p>
            </div>

            {/* Service Coverage Box */}
            <div className="flex flex-col justify-between p-5 bg-[#C8B882]/10 border border-[#C8B882]/30 rounded-2xl">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#85733E] text-white flex items-center justify-center mb-3.5 shadow-sm">
                  <Globe2 className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-[#6D5D2E] uppercase tracking-wider mb-1">
                  Mbulimi Gjeografik
                </p>
                <p className="text-sm sm:text-base font-bold text-[#101828]">
                  Kosovë, Shqipëri & Diaspora
                </p>
              </div>
              <p className="text-xs text-gray-600 mt-4">
                Prishtinë, Tiranë, Shkup dhe komunitetet jashtë vendit.
              </p>
            </div>
          </div>

          {/* Department / Request Topics */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-4 h-4 text-[#006459]" />
              <h2 className="text-base sm:text-lg font-bold text-[#101828] tracking-tight">
                Për çfarë mund të na shkruani?
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-2xs transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#006459] flex items-center justify-center shrink-0 mt-0.5">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#101828] mb-0.5">
                      Listime & Postime Pronash
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Pyetje rreth publikimit të shpalljes, përditësimit të fotove, çmimit apo të dhënave teknike të pronës.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-2xs transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#101828] mb-0.5">
                      Raportim Shpalljesh të Dyshimta
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Njoftoni menjëherë për çdo çmim joreal, foto të dubluara apo persona që shkelin rregullat e komunitetit.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-2xs transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#101828] mb-0.5">
                      Kompani & Partneritete
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Për agjenci imobiliare, investitorë ndërtimi dhe arkitektë që kërkojnë profil të verifikuar të kompanisë.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-2xs transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#101828] mb-0.5">
                      Privatësia & Fshirja e të Dhënave
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Kërkesa për të drejtat GDPR, çregjistrimin e llogarisë apo heqjen e plotë të historikut personal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Callout */}
          <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-[#006459] to-[#004d44] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-[#006459]/15 mb-8">
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                Keni një pyetje specifike?
              </h3>
              <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-md">
                Klikoni butonin për të dërguar një mesazh të drejtpërdrejtë me klientin tuaj të preferuar të email-it.
              </p>
            </div>
            <a
              href="mailto:blejepronen@gmail.com?subject=Pyetje%20p%C3%ABr%20Bleje%20Pron%C3%ABn"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-[#006459] text-xs sm:text-sm font-bold shadow-sm hover:bg-emerald-50 active:scale-95 transition-all text-center whitespace-nowrap cursor-pointer"
            >
              Shkruaj Email
            </a>
          </div>

          {/* Footer Navigation */}
          <div className="border-t border-gray-100 pt-6 flex items-center justify-between flex-wrap gap-4 text-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-semibold text-gray-600 hover:text-[#006459] transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Kthehu në ballinë</span>
            </Link>

            <div className="flex items-center gap-4 text-gray-500">
              <Link href="/kushtet" className="hover:text-[#006459] transition-colors">
                Kushtet e Përdorimit
              </Link>
              <span>•</span>
              <Link href="/privatesia" className="hover:text-[#006459] transition-colors">
                Politika e Privatësisë
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
