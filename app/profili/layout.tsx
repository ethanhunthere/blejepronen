import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profili im | Bleje Banesën',
  description: 'Menaxho profilin dhe listimet e tua në Bleje Banesën.',
  robots: { index: false, follow: false },
}

export default function ProfiliLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
