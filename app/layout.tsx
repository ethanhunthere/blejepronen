import type { Metadata } from "next";
import { Albert_Sans } from "next/font/google";
import Navbar from "@/components/Navbar";
import CookieBanner from "@/components/CookieBanner";
import AnalyticsWrapper from "@/components/AnalyticsWrapper";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const albertSans = Albert_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-albert-sans",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Bleje Banesën - Banesa në Kosovë",
  description:
    "Platforma kryesore shqipfolëse për blerje, shitje dhe qira banesash në Kosovë, Shqipëri dhe Maqedoni.",
  openGraph: {
    title: "Bleje Banesën - Banesa në Kosovë",
    description:
      "Platforma kryesore shqipfolëse për blerje, shitje dhe qira banesash në Kosovë, Shqipëri dhe Maqedoni.",
    url: siteUrl,
    siteName: "Bleje Banesën",
    images: [
      {
        url: "/og-image.png",
        width: 1548,
        height: 666,
        alt: "Bleje Banesën",
      },
    ],
    locale: "sq_AL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bleje Banesën - Banesa në Kosovë",
    description:
      "Platforma kryesore shqipfolëse për blerje, shitje dhe qira banesash në Kosovë, Shqipëri dhe Maqedoni.",
    images: ["/og-image.png"],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Bleje Banesën",
  url: siteUrl,
  description: "Platforma kryesore shqipfolëse për blerje, shitje dhe qira banesash.",
  areaServed: ["XK", "AL", "MK"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sq"
      className={`${albertSans.variable} h-full antialiased`}
      style={{ backgroundColor: "#F5F7FA" }}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.style.backgroundColor='#F5F7FA';document.body&&(document.body.style.backgroundColor='#F5F7FA')",
          }}
        />
        <meta name="theme-color" content="#F5F7FA" />
        {supabaseUrl && (
          <>
            <link rel="preconnect" href={supabaseUrl} />
            <link rel="dns-prefetch" href={supabaseUrl} />
          </>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[#F5F7FA] text-[#1A1A2E] overflow-x-hidden" style={{ backgroundColor: "#F5F7FA" }}>
        <header>
          <Navbar variant="static" />
        </header>
        <main className="flex-1 relative">{children}</main>
        <Toaster richColors position="top-center" />
        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-8 mt-16">
          <div className="mx-auto max-w-[1800px] 2xl:max-w-[2200px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <p className="text-sm text-gray-600 text-center sm:text-left">
                © {new Date().getFullYear()} Bleje Banesën. Të gjitha të drejtat e rezervuara.
              </p>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-gray-600">
                <a href="/kushtet" className="hover:text-[#111827] transition-colors">
                  Kushtet e përdorimit
                </a>
                <a href="/privatesia" className="hover:text-[#111827] transition-colors">
                  Privatësia
                </a>
                <a href="/kontakti" className="hover:text-[#111827] transition-colors">
                  Kontakti
                </a>
              </div>
            </div>
          </div>
        </footer>
        <CookieBanner />
        <AnalyticsWrapper />
      </body>
    </html>
  );
}
