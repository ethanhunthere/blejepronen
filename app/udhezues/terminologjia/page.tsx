import type { Metadata } from 'next'
import Link from 'next/link'
import { generateHreflangAlternates, SITE_URL } from '@/lib/geo-seo'
import { BookOpen, ShieldCheck, FileCheck, CheckCircle2 } from 'lucide-react'

export const revalidate = 86400

const PAGE_PATH = '/udhezues/terminologjia'
const CANONICAL_URL = `${SITE_URL}${PAGE_PATH}`

export const metadata: Metadata = {
  title: 'Fjalori i Pasurive të Paluajtshme në Kosovë & Shqipëri | Bleje Pronën',
  description: 'Udhëzues i plotë dhe shpjegimi i termave ligjorë, kadastralë dhe teknikë: Termokos, Fletë Poseduese, Kontratë Noteriale, Suterren dhe Leje Ndërtimore.',
  alternates: generateHreflangAlternates(PAGE_PATH),
  openGraph: {
    title: 'Fjalori i Pasurive të Paluajtshme | Bleje Pronën',
    description: 'Kupto termat thelbësorë ligjorë dhe kadastralë para se të blesh apo marrësh me qira një banesë në Kosovë dhe Shqipëri.',
    url: CANONICAL_URL,
    siteName: 'Bleje Pronën',
    locale: 'sq_AL',
    alternateLocale: ['en_US'],
    type: 'article',
  },
}

interface TermItem {
  id: string
  name: string
  category: 'Kadastër & Ligj' | 'Teknikë & Ndërtim' | 'Financa & Taksë'
  shortDesc: string
  fullDesc: string
  advice: string
}

const TERMS: TermItem[] = [
  {
    id: 'flete-poseduese',
    name: 'Fletë Poseduese (Certifikata e Pronësisë)',
    category: 'Kadastër & Ligj',
    shortDesc: 'Dokumenti themelor ligjor që vërteton pronësinë juridike mbi patundshmërinë.',
    fullDesc: 'Lëshohet nga Agjencia Kadastrale e Kosovës (ose ASHK në Shqipëri). Përmban të dhënat mbi sipërfaqen e saktë, kufijtë e ngastrës apo njësisë banesore, pronarin legjitim dhe statusin juridik.',
    advice: 'Mos kryeni asnjë pagesë kapari pa e verifikuar fizikisht apo online fletën poseduese dhe pa u siguruar se nuk ekziston asnjë barrë hipotekare aktive.',
  },
  {
    id: 'kontrate-noteriale',
    name: 'Kontratë Noteriale',
    category: 'Kadastër & Ligj',
    shortDesc: 'Akt ligjor i vërtetuar nga noteri publik për kalimin e pronësisë.',
    fullDesc: 'Sipas ligjit në Kosovë dhe Shqipëri, çdo transaksion shitblerjeje të patundshmërive është i pavlefshëm nëse nuk përpilohet dhe vërtetohet para noterit publik. Noteri kontrollon aftësinë vepruese të palëve dhe pastërtinë ligjore të pronës.',
    advice: 'Nënshkrimi bëhet vetëm në prani të noterit, ndërsa pagesa bëhet përmes llogarisë bankare të referuar në vetë kontratën noteriale.',
  },
  {
    id: 'termokos',
    name: 'Termokos (Ngrohja Qendrore e Qytetit)',
    category: 'Teknikë & Ndërtim',
    shortDesc: 'Sistemi publik i kogjenerimit për ngrohjen e banesave në Prishtinë.',
    fullDesc: 'Furnizon lagjet kryesore të Prishtinës (Ulpianë, Dardani, Bregu i Diellit, Arbëri, Mati 1, etj.) me ujë të ngrohtë nga KEK gjatë sezonit të dimrit. Ofron efikasitet maksimal energjetik me kosto fikse të përballueshme mujore.',
    advice: 'Banesat me lidhje aktive në Termokos kursejnë deri në 60% të shpenzimeve të energjisë elektrike gjatë dimrit krahasuar me ngrohjen me rrymë individuale.',
  },
  {
    id: 'parakontrate',
    name: 'Parakontratë (Marrëveshja e Rezervimit)',
    category: 'Kadastër & Ligj',
    shortDesc: 'Marrëveshje paraprake ku palët marrin zotim për shitblerjen e ardhshme.',
    fullDesc: 'Përdoret zakonisht gjatë blerjes së banesave në ndërtim e sipër ose kur blerësi pret aprovimin e kredisë bankare. Përcakton qartë çmimin fiks për m², këstet e pagesës, afatin e përfundimit dhe penalitetet për vonesa.',
    advice: 'Kërkoni që parakontrata të vërtetohet te noteri për të garantuar që njësia nuk u rishitet palëve të treta gjatë procesit të ndërtimit.',
  },
  {
    id: 'leje-ndertimore-pranim-teknik',
    name: 'Pranim Teknik dhe Certifikatë Përdorimi',
    category: 'Teknikë & Ndërtim',
    shortDesc: 'Verifikimi komunal që ndërtesa përmbush të gjitha standardet e sigurisë.',
    fullDesc: 'Komisioni komunal inspekton objektin e përfunduar për të konfirmuar përputhshmërinë me lejen e ndërtimit, mbrojtjen nga zjarri dhe stabilitetin statik. Pranimi teknik është parakusht që ndërtesa të regjistrohet individualisht në kadastër.',
    advice: 'Pa pranim teknik dhe ndarje të njësive në fletë të veçanta poseduese, prona nuk mund të lihet peng (hipotekë) për marrje kredie nga blerësi i ardhshëm.',
  },
  {
    id: 'kati-perdhese-suterren',
    name: 'Kati Përdhesë dhe Suterren',
    category: 'Teknikë & Ndërtim',
    shortDesc: 'Nivelet e hyrjes dhe njësitë gjysmë-nëntokësore të ndërtesës.',
    fullDesc: 'Kati përdhesë (kati 0) është në nivel të tokës me qasje direkte në rrugë apo oborr, ideal për lokale afariste ose të moshuar. Suterreni është nivel i zhytur pjesërisht në tokë me dritare të ngritura, shpesh me çmim më të volitshëm për m².',
    advice: 'Për njësitë në suterren, kontrolloni me kujdes izolimin hidroizolues kundër lagështisë dhe ventilimin natyror para se të vendosni për blerje.',
  },
  {
    id: 'tatimi-ne-prone',
    name: 'Tatimi në Pronë',
    category: 'Financa & Taksë',
    shortDesc: 'Taksa vjetore e administruar nga komuna për pronësinë e patundshmërive.',
    fullDesc: 'Përcaktohet në bazë të vlerës së vlerësuar të tregut nga Drejtoria e Tatimit në Pronë. Shitësi është i detyruar me ligj të sigurojë vërtetimin që nuk ka obligime të papaguara tatimore para nënshkrimit të kontratës te noteri.',
    advice: 'Kërkoni gjithmonë Vërtetimin mbi shlyerjen e tatimit në pronë nga komuna përkatëse para finalizimit të transaksionit.',
  },
  {
    id: 'hipoteka-barret',
    name: 'Hipoteka dhe Barrët Pasurore',
    category: 'Financa & Taksë',
    shortDesc: 'Pengu ligjor i regjistruar në kadastër në favor të një banke apo kreditori.',
    fullDesc: 'Nëse shitësi ka marrë kredi duke lënë pronën si kolateral, prona është e ngarkuar me barrë. Prona mund të shitet vetëm me pëlqimin e bankës (me anë të letrës së fshirjes së hipotekës pas shlyerjes së kredisë me pagesën e blerësit).',
    advice: 'Në asnjë rast mos transferoni fonde te shitësi në mënyrë të pavarur nëse fleta poseduese tregon një hipotekë aktive pa marrëveshje trepalëshe me bankën.',
  },
]

export default function LexiconPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DefinedTermSet',
        '@id': `${CANONICAL_URL}#lexicon`,
        name: 'Fjalori i Pasurive të Paluajtshme në Kosovë dhe Shqipëri',
        description: 'Termat thelbësorë juridikë, kadastralë dhe teknikë për patundshmëritë.',
        hasDefinedTerm: TERMS.map((t) => ({
          '@type': 'DefinedTerm',
          '@id': `${CANONICAL_URL}#${t.id}`,
          name: t.name,
          termCode: t.id,
          description: `${t.shortDesc} ${t.fullDesc}`,
          inDefinedTermSet: `${CANONICAL_URL}#lexicon`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Ballina',
            item: SITE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Udhëzues',
            item: `${SITE_URL}/udhezues/terminologjia`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Terminologjia',
            item: CANONICAL_URL,
          },
        ],
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
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="text-xs text-gray-500 mb-6">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-[#00675B] hover:underline">
                Ballina
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-800 font-semibold">Fjalori i Patundshmërive</li>
          </ol>
        </nav>

        {/* Hero */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 shadow-xs">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 text-[#00675B] text-xs font-bold mb-4">
            <BookOpen className="w-4 h-4" />
            <span>Enciklopedia e Tregut të Pronave</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Fjalori Ligjor dhe Teknik i Pasurive të Paluajtshme
          </h1>
          <p className="mt-3 text-base text-slate-600 max-w-3xl leading-relaxed">
            Njohja e saktë e termave ligjorë dhe kadastralë ju mbron nga rreziqet gjatë blerjes, shitjes apo marrjes me qira të një prone në Kosovë dhe Shqipëri.
          </p>
        </div>

        {/* Terms Grid */}
        <div className="mt-12 space-y-6">
          {TERMS.map((term) => (
            <article
              key={term.id}
              id={term.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 hover:border-teal-300 transition-colors shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {term.category}
                </span>
                <span className="text-xs font-mono text-slate-400">#{term.id}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{term.name}</h2>
              <p className="mt-2 text-sm font-medium text-teal-800 bg-teal-50/70 p-3 rounded-xl border border-teal-100">
                {term.shortDesc}
              </p>
              <p className="mt-4 text-sm text-slate-600 leading-relaxed">{term.fullDesc}</p>

              <div className="mt-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200/70">
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                  Këshillë Praktike nga Ekspertët
                </div>
                <div className="text-xs text-amber-800 leading-relaxed">{term.advice}</div>
              </div>
            </article>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 bg-gradient-to-r from-[#004D40] to-[#00675B] rounded-3xl p-8 sm:p-10 text-white text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-8">
          <div>
            <h3 className="text-xl font-bold">Keni pyetje specifike për një dokument kadastral?</h3>
            <p className="text-xs text-emerald-100 mt-1 max-w-xl">
              Platforma Bleje Pronën lidh drejtpërdrejt blerësit me pronarë të verifikuar. Na kontaktoni për udhëzime para nënshkrimit të kontratës.
            </p>
          </div>
          <Link
            href="/kontakti"
            className="mt-6 sm:mt-0 shrink-0 inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white text-[#00675B] text-xs font-bold shadow-md hover:bg-emerald-50 transition-colors"
          >
            Kontakto Ekipin
          </Link>
        </div>
      </div>
    </div>
  )
}
