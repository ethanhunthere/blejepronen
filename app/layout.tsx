import type { Metadata } from "next";
import { Albert_Sans } from "next/font/google";
import Navbar from "@/components/Navbar";
import CookieBanner from "@/components/CookieBanner";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const albertSans = Albert_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-albert-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bleje Banesën – Banesa në Kosovë",
  description:
    "Platforma kryesore shqipfolëse për blerje, shitje dhe qira banesash në Kosovë, Shqipëri dhe Maqedoni.",
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Bleje Banesën',
  url: 'https://blejebanesen.com',
  description: 'Platforma kryesore shqipfolëse për blerje, shitje dhe qira banesash.',
  areaServed: ['XK', 'AL', 'MK'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sq"
      className={`${albertSans.variable} h-full antialiased`}
      style={{ backgroundColor: '#0A0F2E' }}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.style.backgroundColor='#0A0F2E';document.body&&(document.body.style.backgroundColor='#0A0F2E')",
          }}
        />
        <meta name="theme-color" content="#0A0F2E" />
        <link rel="preconnect" href="https://tjpxxtkebindirhpthhg.supabase.co" />
        <link rel="dns-prefetch" href="https://tjpxxtkebindirhpthhg.supabase.co" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      </head>
      <body className="min-h-full flex flex-col bg-[#0A0F2E] text-foreground overflow-x-hidden" style={{ backgroundColor: '#0A0F2E' }}>
        <Navbar variant="static" />
        <div className="relative">
          <main className="flex-1">{children}</main>
        </div>
        <Toaster richColors position="top-center" />
        {/* Footer */}
        <footer className="border-t border-white/10 bg-[#060B1E] py-8 mt-16">
          <div className="mx-auto max-w-[1800px] 2xl:max-w-[2200px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <p className="text-sm text-slate-400 text-center sm:text-left">
                © {new Date().getFullYear()} Bleje Banesën. Të gjitha të drejtat e rezervuara.
              </p>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-slate-400">
                <a href="/kushtet" className="hover:text-[#1B4FFF] transition-colors">
                  Kushtet e përdorimit
                </a>
                <a href="/privatesia" className="hover:text-[#1B4FFF] transition-colors">
                  Privatësia
                </a>
                <a href="/kontakti" className="hover:text-[#1B4FFF] transition-colors">
                  Kontakti
                </a>
              </div>
            </div>
          </div>
        </footer>
        <CookieBanner />
      </body>
    </html>
  );
}
