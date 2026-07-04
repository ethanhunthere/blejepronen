import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hyr | Bleje Banesën',
  description: 'Hyr në llogarinë tënde në Bleje Banesën për të menaxhuar listimet dhe profilin.',
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
