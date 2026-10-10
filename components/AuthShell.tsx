import { memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShieldCheck, Building2, Users, CheckCircle2 } from 'lucide-react'

interface AuthShellProps {
  children: React.ReactNode
  headline?: string
  subline?: string
}

const TRUST_METRICS = [
  {
    icon: Building2,
    title: 'Mijëra prona aktive',
    desc: 'Banesa, shtëpi, troje dhe hapësira afariste në të gjithë Kosovën.',
  },
  {
    icon: ShieldCheck,
    title: 'Prona të verifikuara',
    desc: 'Shpallje me të dhëna të sakta, çmime reale dhe fotografi origjinale.',
  },
  {
    icon: Users,
    title: 'Pa komisione të fshehura',
    desc: 'Komunikim i drejtpërdrejtë me pronarët dhe agjencitë e autorizuara.',
  },
]

const AuthTealPanel = memo(function AuthTealPanel({
  headline,
  subline,
}: {
  headline: string
  subline: string
}) {
  return (
    <div className="relative hidden lg:flex lg:w-[45%] h-full flex-col justify-between overflow-hidden bg-[#00675B] p-12 xl:p-14 text-white">
      {/* Subtle Architectural Grid Pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-32 w-96 h-96 rounded-full bg-[#C8B882]/10 blur-3xl"
      />

      {/* Top Section: Brand Statement */}
      <div className="relative z-10 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-[#C8B882] text-xs font-semibold backdrop-blur-xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Platforma #1 e Pronave në Kosovë</span>
        </div>
        <h2 className="max-w-md text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight text-white">
          {headline}
        </h2>
        <p className="max-w-sm text-sm xl:text-base leading-relaxed text-white/80 font-normal">
          {subline}
        </p>
      </div>

      {/* Bottom Section: Real-Estate Trust Metrics */}
      <div className="relative z-10 space-y-5 pt-8 border-t border-white/15">
        {TRUST_METRICS.map((metric) => {
          const IconComp = metric.icon
          return (
            <div key={metric.title} className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-[#C8B882]">
                <IconComp className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white leading-snug">{metric.title}</h3>
                <p className="text-xs text-white/70 leading-relaxed">{metric.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default function AuthShell({
  children,
  headline = 'Rikthehu te llogaria jote',
  subline = 'Vendos fjalëkalimin e ri dhe vazhdo me pronat e tua.',
}: AuthShellProps) {
  return (
    <div className="relative flex flex-col lg:flex-row h-full w-full bg-white overflow-hidden">
      {/* Marker consumed by globals.css to hide the site footer on auth screens */}
      <span data-auth-page hidden />

      {/* Left: subtle soft background with the floating card */}
      <div className="relative flex w-full lg:w-[55%] h-full flex-col items-center bg-slate-50/60 px-4 sm:px-8 lg:px-12 xl:px-16 overflow-y-auto overscroll-contain scrollbar-thin">
        <div className="w-full max-w-[420px] my-auto py-5 sm:py-8 flex flex-col justify-center shrink-0">
          <Link
            href="/"
            className="mb-3.5 sm:mb-4 inline-flex items-center gap-2 transition-opacity hover:opacity-85 self-start"
          >
            <Image
              src="/logo-teal.png"
              alt="Bleje Pronën"
              width={36}
              height={36}
              priority
              className="h-8 w-8 sm:h-9 sm:w-9 object-contain"
            />
            <span className="text-2xl font-black tracking-tight text-[#00675B]">
              Bleje <span className="text-[#C8B882]">Pronën</span>
            </span>
          </Link>
          {children}
        </div>
      </div>

      {/* Right 45%: teal panel — brand statement with trust metrics */}
      <AuthTealPanel headline={headline} subline={subline} />
    </div>
  )
}
