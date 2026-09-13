import { memo } from 'react'
import Image from 'next/image'
import Globe from '@/components/originkit/ui/globe-fast'

interface AuthShellProps {
  children: React.ReactNode
  headline?: string
  subline?: string
}

const AuthTealPanel = memo(function AuthTealPanel({
  headline,
  subline,
}: {
  headline: string
  subline: string
}) {
  return (
    <div className="relative hidden lg:flex lg:w-[45%] h-full flex-col overflow-hidden bg-[#006459]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(50%_40%_at_15%_0%,rgba(200,184,130,0.18),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_85%_100%,rgba(255,255,255,0.08),transparent_70%)]" />
        <Image
          src="/logo-white.png"
          alt=""
          width={512}
          height={512}
          className="absolute -right-24 -bottom-32 w-[420px] max-w-none opacity-[0.06] -rotate-6"
        />
      </div>

      {/* Decorative copy: part of the background, not interactive UI */}
      <div
        aria-hidden
        className="relative pointer-events-none select-none px-12 xl:px-14 pt-12 xl:pt-14 shrink-0"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Platforma #1 e Patundshmërive</span>
        </div>
        <h2 className="max-w-md text-3xl xl:text-[34px] font-extrabold leading-[1.15] tracking-tight text-white">
          {headline}
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70 font-normal">
          {subline}
        </p>
      </div>

      <div className="relative min-h-0 flex-1 -mt-2 overflow-hidden" id="auth-animation-container">
        <Globe scale={9} />
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

      {/* Left: white panel with the form (55% — optically reads ~60/40 because
          the white field carries less visual mass than the globe-filled teal) */}
      <div className="relative flex w-full lg:w-[55%] h-full flex-col items-center bg-white px-4 sm:px-8 lg:px-12 xl:px-16 overflow-y-auto overscroll-contain scrollbar-thin">
        <div className="w-full max-w-[410px] my-auto py-6 sm:py-10 flex flex-col justify-center shrink-0">
          {children}
        </div>
      </div>

      {/* Right 45%: teal panel — brand statement floating above the globe */}
      <AuthTealPanel headline={headline} subline={subline} />
    </div>
  )
}
