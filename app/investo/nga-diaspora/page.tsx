import type { Metadata } from 'next'
import Link from 'next/link'
import { generateHreflangAlternates, SITE_URL } from '@/lib/geo-seo'
import { CheckCircle2, ShieldCheck, FileText, Building2, TrendingUp, HelpCircle, ArrowRight } from 'lucide-react'

export const revalidate = 86400

const PAGE_PATH = '/investo/nga-diaspora'
const CANONICAL_URL = `${SITE_URL}${PAGE_PATH}`

export const metadata: Metadata = {
  title: 'Investimi në Patundshmëri nga Diaspora | Udhëzuesi Ligjor & ROI | Bleje Pronën',
  description: 'Udhëzues i plotë për mërgatën në Zvicër, Gjermani, Austri dhe SHBA. Procedurat noteriale, pagesat bankare, prokurat dhe kthimi nga investimi në Kosovë e Shqipëri.',
  alternates: generateHreflangAlternates(PAGE_PATH),
  openGraph: {
    title: 'Investimi në Patundshmëri nga Diaspora | Bleje Pronën',
    description: 'Bli banesë apo truall në atdhe pa rreziqe. Verifikimi kadastral, transferet bankare dhe menaxhimi i qirasë me 0% komision.',
    url: CANONICAL_URL,
    siteName: 'Bleje Pronën',
    locale: 'sq_AL',
    alternateLocale: ['de_CH', 'de_DE', 'en_US'],
    type: 'article',
  },
}

const FAQS = [
  {
    q: 'A mund të blej pronë në Kosovë pa udhëtuar personalisht?',
    a: 'Po. Blerja mund të realizohet tërësisht përmes Prokurës së Posaçme Noteriale (Vollmacht), të lëshuar pranë Ambasadës ose Konsullatës së Kosovës në shtetin ku jetoni, ose te një noter lokal me vulë apostile.',
  },
  {
    q: 'Si bëhet pagesa e sigurt nga një bankë në Zvicër apo Gjermani?',
    a: 'Pagesa kryhet me transfer të rregullt ndërkombëtar bankar (IBAN/SWIFT) direkt në llogarinë bankare të shitësit apo zhvilluesit të projektit, duke specifikuar numrin e kontratës noteriale në arsyen e pagesës.',
  },
  {
    q: 'Cili është kthimi mesatar vjetor nga investimi (ROI) në Prishtinë dhe Tiranë?',
    a: 'Kthimi mesatar vjetor nga qiradhënia e banesave në zonat me kërkesë të lartë (Qendër, Arbëri, Mati 1 në Prishtinë, ose Don Bosko, Blloku në Tiranë) sillet midis 6% dhe 8.5% në vit.',
  },
  {
    q: 'A ka komisione të fshehura apo taksa shtesë për blerësit nga diaspora?',
    a: 'Në platformën Bleje Pronën blini me 0% provizion për ndërmjetësim. Shpenzimet e vetme ligjore janë tarifa noteriale e rregulluar me ligj dhe taksa komunale për regjistrim në kadastër.',
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Përzgjedhja e pronës dhe verifikimi paraprak',
    desc: 'Eksploroni katalogun tonë me pronarë të drejtpërdrejtë dhe ndërtues të licencuar. Kërkoni fletën poseduese dhe kontrolloni mungesën e barrëve hipotekare në regjistrin kadastral.',
  },
  {
    num: '02',
    title: 'Përpilimi i prokurës ose rezervimi i terminit',
    desc: 'Nëse nuk jeni fizikisht në atdhe, autorizoni një familjar ose përfaqësues ligjor përmes prokurës në Konsullatë. Nëse vizitoni atdheun gjatë pushimeve, caktoni paraprakisht vizitën te noteri.',
  },
  {
    num: '03',
    title: 'Hartimi dhe nënshkrimi i kontratës noteriale',
    desc: 'Noteri publik verifikon identitetin, pronësinë e padiskutueshme dhe përpilon kontratën e shitblerjes në përputhje me dispozitat e ligjit për pronësinë.',
  },
  {
    num: '04',
    title: 'Pagesa bankare dhe regjistrimi në kadastër',
    desc: 'Transferi i plotë monetar realizohet përmes sistemit bankar. Pas konfirmimit të pagesës, noteri dërgon kërkesën për bartje pronësie në Drejtorinë Kadastrale.',
  },
]

const BENCHMARKS = [
  { city: 'Prishtinë', price: '1,100 - 1,650 €/m²', yield: '6.5% - 8.2%', rent: '350 - 650 €/muaj' },
  { city: 'Fushë Kosovë', price: '750 - 950 €/m²', yield: '7.0% - 9.0%', rent: '250 - 380 €/muaj' },
  { city: 'Prizren', price: '950 - 1,350 €/m²', yield: '5.5% - 7.0%', rent: '280 - 450 €/muaj' },
  { city: 'Tiranë', price: '1,300 - 2,400 €/m²', yield: '6.0% - 7.8%', rent: '400 - 850 €/muaj' },
  { city: 'Durrës', price: '900 - 1,500 €/m²', yield: '6.8% - 8.5%', rent: '300 - 600 €/muaj' },
]

export default function DiasporaInvestmentPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${CANONICAL_URL}#article`,
        headline: 'Udhëzuesi i Investimit në Patundshmëri për Diasporën Shqiptare',
        description: 'Procedurat ligjore, pagesat bankare, prokurat dhe analiza e tregut për blerjen e banesave dhe trojeve në Kosovë e Shqipëri.',
        author: {
          '@type': 'Organization',
          name: 'Bleje Pronën',
          url: SITE_URL,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Bleje Pronën',
          logo: `${SITE_URL}/logo-white.png`,
        },
        mainEntityOfPage: CANONICAL_URL,
        inLanguage: 'sq',
      },
      {
        '@type': 'HowTo',
        '@id': `${CANONICAL_URL}#howto`,
        name: 'Si të blini patundshmëri në Kosovë dhe Shqipëri nga diaspora',
        step: STEPS.map((s, idx) => ({
          '@type': 'HowToStep',
          position: idx + 1,
          name: s.title,
          text: s.desc,
        })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${CANONICAL_URL}#faq`,
        mainEntity: FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.a,
          },
        })),
      },
    ],
  }

  return (
    <div className="bg-[#F7FAF9] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
        {/* Header Breadcrumbs */}
        <nav aria-label="breadcrumb" className="text-xs text-gray-500 mb-6">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-[#00675B] hover:underline">
                Ballina
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/listings" className="hover:text-[#00675B] hover:underline">
                Pronat
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-800 font-semibold">Investo nga Diaspora</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-[#004D40] via-[#00675B] to-[#00796B] rounded-3xl p-8 sm:p-12 text-white shadow-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-xs mb-4">
            <ShieldCheck className="w-4 h-4" />
            <span>Mbrojtje Ligjore dhe 0% Komision për Mërgatën</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Investo në Patundshmëri në Atdhe me Siguri të Plotë
          </h1>
          <p className="mt-4 text-base sm:text-lg text-emerald-100 max-w-2xl leading-relaxed">
            Pavarësisht nëse jetoni në Zvicër, Gjermani, Austri, Britani apo SHBA, Bleje Pronën ju mundëson blerje transparente direkt nga pronari ose ndërtuesi, pa ndërmjetës të dyshimtë.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/listings?type=shitje"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-[#00675B] font-bold text-sm shadow-md hover:bg-emerald-50 transition-colors"
            >
              Shiko Pronat në Shitje
            </Link>
            <Link
              href="/kontakti?tema=diaspora"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white/15 text-white font-semibold text-sm border border-white/20 hover:bg-white/25 transition-colors"
            >
              Këshillim Falas për Diasporën
            </Link>
          </div>
        </div>

        {/* 4 Steps to Purchase */}
        <section className="mt-16">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Si të Blini Pronë nga Jashtë: 4 Hapat Ligjorë
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Procesi është i standardizuar dhe i mbrojtur me ligjet e noterisë së Republikës së Kosovës dhe Republikës së Shqipërisë.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 hover:shadow-md transition-shadow relative"
              >
                <div className="text-2xl font-black text-[#00675B] mb-3">{step.num}</div>
                <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Market Benchmark Table */}
        <section className="mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Treguesit e Çmimeve dhe Kthimit nga Investimi (ROI)
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Të dhëna krahasuese të tregut për llogaritjen e kthimit nga qiraja vjetore.
              </p>
            </div>
            <Link
              href="/tregu"
              className="text-xs font-bold text-[#00675B] hover:underline inline-flex items-center gap-1"
            >
              Eksploro të gjitha statistikat <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 font-bold">Qyteti</th>
                  <th className="px-6 py-3.5 font-bold">Çmimi Mesatar për m²</th>
                  <th className="px-6 py-3.5 font-bold">Kthimi Vjetor (ROI)</th>
                  <th className="px-6 py-3.5 font-bold">Qiraja Mesatare (2+1)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {BENCHMARKS.map((b) => (
                  <tr key={b.city} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{b.city}</td>
                    <td className="px-6 py-4 font-mono font-medium">{b.price}</td>
                    <td className="px-6 py-4 text-emerald-700 font-bold">{b.yield}</td>
                    <td className="px-6 py-4">{b.rent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-16">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
            Pyetje të Shpeshta nga Bashkatdhetarët
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="text-base font-bold text-slate-900 flex items-start gap-2.5">
                  <HelpCircle className="w-5 h-5 text-[#00675B] shrink-0 mt-0.5" />
                  <span>{faq.q}</span>
                </h3>
                <p className="mt-2 text-sm text-slate-600 pl-7 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Lead Capture CTA Card */}
        <section className="mt-16 bg-[#F0FDF4] border border-emerald-200 rounded-3xl p-8 sm:p-10 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-8">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Kërkoni një pronë të caktuar me buxhetin tuaj?
            </h3>
            <p className="text-sm text-slate-600 mt-1 max-w-xl">
              Regjistroni preferencat tuaja falas dhe ekipi ynë do t&apos;ju lidhë drejtpërdrejt me pronarët e verifikuar që ofrojnë pronë me fletë të pastër poseduese.
            </p>
          </div>
          <Link
            href="/kontakti?tema=diaspora-kerkese"
            className="mt-6 sm:mt-0 shrink-0 inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-[#00675B] hover:bg-[#005249] text-white text-sm font-bold shadow-md transition-colors"
          >
            Kërko me Porosi
          </Link>
        </section>
      </div>
    </div>
  )
}
