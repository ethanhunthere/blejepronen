import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Bleje Banesën – Banesa në Kosovë",
  description:
    "Platforma kryesore shqipfolëse për blerje, shitje dhe qira banesash në Kosovë, Shqipëri dhe Maqedoni.",
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
      <body className="min-h-full flex flex-col bg-[#F8F9FF]">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Toaster richColors position="top-center" />
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
