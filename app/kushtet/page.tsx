import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Kushtet e përdorimit | Bleje Banesën',
  description: 'Kushtet dhe rregullat e përdorimit të platformës Bleje Banesën.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FF] py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-8 border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Kushtet e Përdorimit</h1>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Pranimi i Kushteve</h2>
            <p className="text-gray-600 leading-relaxed">
              Duke përdorur platformën Bleje Banesën, ju pranoni këto kushte përdorimi. Nëse nuk pajtoheni me to, ju lutemi mos e përdorni platformën.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Shërbimi</h2>
            <p className="text-gray-600 leading-relaxed">
              Bleje Banesën është një platformë për publikimin dhe shfletimin e listimeve të banesave. Ne nuk jemi agjenci imobiliare dhe nuk ndërmjetësojmë në transaksione. Të gjitha marrëveshjet bëhen direkt ndërmjet palëve.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Përgjegjësitë e Përdoruesit</h2>
            <p className="text-gray-600 leading-relaxed">
              Përdoruesit janë përgjegjës për saktësinë e informacionit të publikuar. Ndalohet publikimi i informacionit të rremë, mashtrues apo i paligjshëm. Bleje Banesën rezervon të drejtën të heqë çdo listim që shkel këto kushte.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Llogaria</h2>
            <p className="text-gray-600 leading-relaxed">
              Për të postuar një banesë, duhet të krijoni një llogari. Jeni përgjegjës për sigurinë e llogarisë tuaj dhe të gjitha aktivitetet që ndodhin në të.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Kufizimi i Përgjegjësisë</h2>
            <p className="text-gray-600 leading-relaxed">
              Bleje Banesën nuk mban përgjegjësi për dëmet që mund të vijnë nga përdorimi i platformës, përfshirë por pa u kufizuar në humbje financiare, dëmtime të të dhënave, apo probleme teknike.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Ndryshimet</h2>
            <p className="text-gray-600 leading-relaxed">
              Ne rezervojmë të drejtën të ndryshojmë këto kushte në çdo kohë. Ndryshimet hyjnë në fuqi menjëherë pas publikimit në këtë faqe.
            </p>
          </section>

          <div className="border-t border-gray-100 pt-6 text-center">
            <Link href="/" className="text-[#1B4FFF] hover:underline">← Kthehu në faqen kryesore</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
