import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Postimet e Mia | Bleje Banesën',
  robots: { index: false, follow: false },
}

export default function PostimetEMiaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
