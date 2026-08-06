import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hyr | Bleje Pronën',
  description: 'Hyr në llogarinë tënde në Bleje Pronën për të menaxhuar listimet dhe profilin.',
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
