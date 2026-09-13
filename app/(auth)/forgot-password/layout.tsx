import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rivendos fjalëkalimin | Bleje Pronën',
  description: 'Rivendos fjalëkalimin e llogarisë tënde në Bleje Pronën.',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span data-auth-page hidden />
      {children}
    </>
  )
}
