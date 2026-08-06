import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profili im | Bleje Pronën',
  description: 'Menaxho profilin dhe listimet e tua në Bleje Pronën.',
  robots: { index: false, follow: false },
}

export default function ProfiliLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
