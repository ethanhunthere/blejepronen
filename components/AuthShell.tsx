import Image from 'next/image'

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(160deg,#006459_0%,#00433C_60%,#003830_100%)]">
      {/* Ambient light + watermark */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(50%_40%_at_15%_0%,rgba(200,184,130,0.14),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_85%_100%,rgba(255,255,255,0.06),transparent_70%)]" />
        <Image
          src="/logo-white.png"
          alt=""
          width={512}
          height={512}
          className="absolute -right-24 -bottom-32 w-[420px] max-w-none opacity-[0.06] -rotate-6"
        />
      </div>
      {/* Brand mark + card, positioned high */}
      <div className="relative flex flex-col items-center px-4 pt-28 pb-16 lg:pt-32">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-[0_16px_32px_-12px_rgba(0,20,17,0.5)] flex items-center justify-center">
            <Image src="/logo-white.png" alt="Bleje Banesën" width={40} height={40} className="w-10 h-10" />
          </div>
          <div className="h-1 w-10 rounded-full bg-[#C8B882] mt-5" />
        </div>
        {children}
      </div>
    </div>
  )
}
