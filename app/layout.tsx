import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://blejebanesen.com'),
  title: {
    default: 'Bleje Banesën – Banesa në Kosovë',
    template: '%s | Bleje Banesën',
  },
  description:
    'Platforma kryesore shqipfolëse për blerje, shitje dhe qira banesash në Kosovë, Shqipëri dhe Maqedoni.',
  openGraph: {
    type: 'website',
    locale: 'sq_AL',
    url: 'https://blejebanesen.com',
    siteName: 'Bleje Banesën',
    title: 'Bleje Banesën – Banesa në Kosovë',
    description: 'Platforma kryesore shqipfolëse për blerje, shitje dhe qira banesash.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Bleje Banesën' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bleje Banesën',
    description: 'Platforma kryesore shqipfolëse e banesave.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sq"
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://tjpxxtkebindirhpthhg.supabase.co" />
        <link rel="dns-prefetch" href="https://tjpxxtkebindirhpthhg.supabase.co" />
      </head>
      <body className="min-h-full flex flex-col bg-[#F8F9FF]">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Toaster richColors position="top-center" />
        <Analytics />
        {/* Footer */}
        <footer className="border-t bg-white py-8 mt-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} Bleje Banesën. Të gjitha të drejtat e rezervuara.
              </p>
              <div className="flex gap-6 text-sm text-gray-500">
                <a href="#" className="hover:text-[#1B4FFF] transition-colors">
                  Kushtet e përdorimit
                </a>
                <a href="#" className="hover:text-[#1B4FFF] transition-colors">
                  Privatësia
                </a>
                <a href="#" className="hover:text-[#1B4FFF] transition-colors">
                  Kontakti
                </a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
