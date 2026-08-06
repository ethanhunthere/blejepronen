import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Regjistrohu falas | Bleje Pronën',
  description: 'Krijo llogari falas në Bleje Pronën dhe fillo të postosh banesa për shitje ose qira.',
  robots: { index: false, follow: false },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
