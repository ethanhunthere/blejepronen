import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Politika e Privatësisë | Bleje Banesën',
  description: 'Politika e privatësisë dhe mbrojtja e të dhënave personale në platformën Bleje Banesën.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <h1 className="text-3xl font-bold text-[#1A1A2E] mb-8">Politika e Privatësisë</h1>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1A1A2E] mb-3">1. Të dhënat që mbledhim</h2>
            <p className="text-gray-600 leading-relaxed">
              Kur krijoni një llogari, mbledhim emrin, email-in dhe numrin e telefonit. Kur postoni një banesë, ruajmë informacionin e listimit dhe fotot e ngarkuara.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1A1A2E] mb-3">2. Si i përdorim të dhënat</h2>
            <p className="text-gray-600 leading-relaxed">
              Të dhënat përdoren vetëm për të ofruar shërbimin: shfaqjen e listimeve, kontaktimin e shitësve, dhe menaxhimin e llogarisë. Nuk i shesim të dhënat tuaja palëve të treta.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1A1A2E] mb-3">3. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              Përdorim cookies thelbësore për funksionimin e platformës (autentikim, preferenca) dhe cookies analitike për të përmirësuar shërbimin. Mund të refuzoni cookies jo-thelbësore në çdo kohë përmes banner-it të cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1A1A2E] mb-3">4. Ruajtja e të dhënave</h2>
            <p className="text-gray-600 leading-relaxed">
              Të dhënat ruhen për aq kohë sa llogaria juaj është aktive ose sa është e nevojshme për qëllime ligjore. Mund të kërkoni fshirjen e të dhënave tuaja në çdo kohë duke na kontaktuar.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1A1A2E] mb-3">5. Siguria</h2>
            <p className="text-gray-600 leading-relaxed">
              Përdorim masa sigurie të arsyeshme për të mbrojtur të dhënat tuaja, përfshirë enkriptimin e komunikimit me HTTPS, autentikimin e sigurt dhe kontrollin e aksesit në bazën e të dhënave.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1A1A2E] mb-3">6. Të drejtat tuaja</h2>
            <p className="text-gray-600 leading-relaxed">
              Keni të drejtë të aksesoni, korrigjoni ose fshini të dhënat tuaja personale. Për çdo kërkesë, na kontaktoni në email-in më poshtë.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1A1A2E] mb-3">7. Kontakti</h2>
            <p className="text-gray-600 leading-relaxed">
              Për pyetje rreth privatësisë, na kontaktoni në:{' '}
              <a href="mailto:blejebanesen@gmail.com" className="text-[#111827] hover:underline">blejebanesen@gmail.com</a>
            </p>
          </section>

          <div className="border-t border-gray-100 pt-6 text-center">
            <Link href="/" className="text-[#111827] hover:underline">← Kthehu në faqen kryesore</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
