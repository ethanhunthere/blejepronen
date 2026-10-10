export const metadata = {
  alternates: {
    languages: { sq: 'https://blejepronen.com', en: 'https://blejepronen.com/en' },
  },
}

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <div lang="en">{children}</div>
}
