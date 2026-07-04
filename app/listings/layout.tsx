import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Banesa në shitje dhe me qira | Bleje Banesën',
  description: 'Shfleto qindra banesa në shitje dhe me qira në Prishtinë, Prizren, Pejë dhe gjithë Kosovën. Gjej shtëpinë tënde me Bleje Banesën.',
}

export default function ListingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
