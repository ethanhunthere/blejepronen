import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rivendos fjalëkalimin | Bleje Banesën',
  description: 'Rivendos fjalëkalimin e llogarisë tënde në Bleje Banesën.',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
