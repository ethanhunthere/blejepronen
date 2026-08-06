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
  title: "Bleje Pronën - Banesa në Kosovë",
  description:
    "Platforma kryesore shqipfolëse për blerje, shitje dhe qira banesash në Kosovë, Shqipëri dhe Maqedoni.",
  openGraph: {
    title: "Bleje Pronën - Banesa në Kosovë",
    description:
      "Platforma kryesore shqipfolëse për blerje, shitje dhe qira banesash në Kosovë, Shqipëri dhe Maqedoni.",
    url: siteUrl,
    siteName: "Bleje Pronën",
    images: [
      {
        url: "/og-image.png",
        width: 1548,
        height: 666,
        alt: "Bleje Pronën",
      },
    ],
    locale: "sq_AL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bleje Pronën - Banesa në Kosovë",
    description:
      "Platforma kryesore shqipfolëse për blerje, shitje dhe qira banesash në Kosovë, Shqipëri dhe Maqedoni.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
      { url: "/favicon-167.png", sizes: "167x167" },
      { url: "/favicon-152.png", sizes: "152x152" },
    ],
    shortcut: "/favicon.ico",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Bleje Pronën",
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
      style={{ backgroundColor: "#F2F7F7" }}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.style.backgroundColor='#F2F7F7';document.body&&(document.body.style.backgroundColor='#F2F7F7')",
          }}
        />
        <meta name="theme-color" content="#F2F7F7" />
        {supabaseUrl && (
          <>
            <link rel="preconnect" href={supabaseUrl} />
            <link rel="dns-prefetch" href={supabaseUrl} />
          </>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[#F2F7F7] text-[#1A1A2E] overflow-x-hidden" style={{ backgroundColor: "#F2F7F7" }}>
        <header>
          <Navbar variant="static" />
        </header>
        <main className="flex-1 relative">{children}</main>
        <Toaster richColors position="top-center" />
        {/* Footer */}
        <footer className="relative overflow-hidden bg-[linear-gradient(160deg,#005048_0%,#003830_100%)] py-10 mt-16">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(40%_60%_at_90%_0%,rgba(200,184,130,0.12),transparent_70%)]" />
          </div>
          <div className="relative w-full px-4 sm:px-6 lg:px-8">
            <div className="h-1 w-12 rounded-full bg-[#C8B882] mb-6 mx-auto sm:mx-0" />
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <p className="text-sm text-white/60 text-center sm:text-left">
                © {new Date().getFullYear()} Bleje Pronën. Të gjitha të drejtat e rezervuara.
              </p>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-white/60">
                <a href="/kushtet" className="hover:text-[#C8B882] transition-colors">
                  Kushtet e përdorimit
                </a>
                <a href="/privatesia" className="hover:text-[#C8B882] transition-colors">
                  Privatësia
                </a>
                <a href="/kontakti" className="hover:text-[#C8B882] transition-colors">
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
