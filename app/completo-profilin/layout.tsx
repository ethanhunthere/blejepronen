import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kompleto Profilin | Bleje Banesën',
  robots: { index: false, follow: false },
}

export default function CompletoProfilinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
