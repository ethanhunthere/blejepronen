import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prona në shitje dhe me qira | Bleje Pronën',
  description: 'Shfleto qindra prona në shitje dhe me qira në Prishtinë, Prizren, Pejë dhe gjithë Kosovën. Gjej shtëpinë tënde me Bleje Pronën.',
}

export default function ListingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
