import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Posto banesën tënde | Bleje Banesën',
  description: 'Posto banesën tënde për shitje ose qira në Bleje Banesën. 30 ditë falas, pa nevojë për kartë krediti.',
  robots: { index: false, follow: false },
}

export default function PostoBaneseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
