import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#006459",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Bleje Pronën - Prona në Kosovë",
  description:
    "Platforma kryesore shqipfolëse për blerje, shitje dhe qira pronash në Kosovë, Shqipëri dhe Maqedoni.",
  openGraph: {
    title: "Bleje Pronën - Prona në Kosovë",
    description:
      "Platforma kryesore shqipfolëse për blerje, shitje dhe qira pronash në Kosovë, Shqipëri dhe Maqedoni.",
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
    title: "Bleje Pronën - Prona në Kosovë",
    description:
      "Platforma kryesore shqipfolëse për blerje, shitje dhe qira pronash në Kosovë, Shqipëri dhe Maqedoni.",
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
  verification: {
    google: "fmg4szjqM2r1nQAdzx9jqzOl_ZNdpgh600vFpkIf9ag",
  },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Bleje Pronën",
    url: siteUrl,
    logo: `${siteUrl}/logo-white.png`,
    description: "Platforma kryesore shqipfolëse për blerje, shitje dhe qira pronash direkt nga pronarët.",
    areaServed: ["XK", "AL", "MK"],
    contactPoint: {
      "@type": "ContactPoint",
      email: "blejepronen@gmail.com",
      contactType: "customer support",
      availableLanguage: ["sq", "en"],
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Bleje Pronën",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/listings?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sq"
      suppressHydrationWarning
      className={`${albertSans.variable} h-full antialiased`}
      style={{ backgroundColor: "#006459" }}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.style.backgroundColor='#006459';document.body&&(document.body.style.backgroundColor='#006459');(function(){try{var p=window.location.pathname;if(p==='/login'||p==='/register'||p==='/forgot-password'){document.documentElement.setAttribute('data-auth','logged-out');return;}var isAuth=false;var u=localStorage.getItem('blejepronen_cached_user');if(u){isAuth=true;}else{var ck=document.cookie;if(ck.indexOf('sb-')!==-1&&ck.indexOf('-auth-token')!==-1){isAuth=true;}}if(isAuth){document.documentElement.setAttribute('data-auth','logged-in');var profRaw=localStorage.getItem('blejepronen_cached_navbar_profile');if(profRaw){var prof=JSON.parse(profRaw);if(prof.avatarUrl){document.documentElement.style.setProperty('--nav-avatar','url(\"'+prof.avatarUrl+'\")');}if(prof.firstName){document.documentElement.style.setProperty('--nav-initial','\"'+prof.firstName.charAt(0).toUpperCase()+'\"');}}else if(u){var userObj=JSON.parse(u);var meta=userObj.user_metadata;var ini=((meta&&(meta.first_name||meta.full_name))||userObj.email||'?').charAt(0).toUpperCase();if(ini&&ini!=='?'){document.documentElement.style.setProperty('--nav-initial','\"'+ini+'\"');}}}else{document.documentElement.setAttribute('data-auth','logged-out');}}catch(e){}})();`,
          }}
        />
        <meta name="theme-color" content="#006459" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="google-site-verification" content="fmg4szjqM2r1nQAdzx9jqzOl_ZNdpgh600vFpkIf9ag" />
        <link rel="help" type="text/plain" href="/llms.txt" title="LLM Context" />
        <link rel="preload" as="image" href="/hero-bg.jpg" fetchPriority="high" />
        {supabaseUrl && (
          <>
            <link rel="preconnect" href={supabaseUrl} />
            <link rel="dns-prefetch" href={supabaseUrl} />
          </>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[#006459] text-[#101828] overflow-x-hidden" style={{ backgroundColor: "#006459" }}>
        <header className="bg-[#006459]">
          <Navbar variant="static" />
        </header>
        <main className="flex-1 relative bg-[#F2F7F7]">{children}</main>
        <Toaster richColors position="top-center" />
        {/* Footer */}
        <footer className="relative overflow-hidden bg-[linear-gradient(160deg,#005048_0%,#003830_100%)] py-10">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(40%_60%_at_90%_0%,rgba(200,184,130,0.12),transparent_70%)]" />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-1 w-12 rounded-full bg-[#C8B882] mb-6 mx-auto sm:mx-0" />
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <p suppressHydrationWarning className="text-sm text-white/60 text-center sm:text-left">
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
