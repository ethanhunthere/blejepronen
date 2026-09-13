import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Posto pronën tënde | Bleje Pronën',
  description: 'Posto pronën tënde për shitje ose qira në Bleje Pronën. 30 ditë falas, pa nevojë për kartë krediti.',
  robots: { index: false, follow: false },
}

export default function PostoPronaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
