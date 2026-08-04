import Image from 'next/image'

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F2F7F7] grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="hidden lg:flex relative overflow-hidden flex-col items-center justify-center bg-[linear-gradient(160deg,#006459_0%,#00433C_60%,#003830_100%)]">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(50%_40%_at_20%_10%,rgba(200,184,130,0.16),transparent_70%)]" />
          <Image
            src="/logo-white.png"
            alt=""
            width={512}
            height={512}
            className="absolute -left-24 -bottom-32 w-[420px] max-w-none opacity-[0.06] rotate-6"
          />
        </div>
        <div className="relative flex flex-col items-center">
          <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 shadow-[0_24px_48px_-16px_rgba(0,40,35,0.6)] flex items-center justify-center">
            <Image src="/logo-white.png" alt="Bleje Banesën" width={64} height={64} className="w-16 h-16" />
          </div>
          <div className="h-1 w-12 rounded-full bg-[#C8B882] mt-8" />
        </div>
      </div>
      {/* Form side */}
      <div className="flex items-center justify-center p-4 py-12">
        {children}
      </div>
    </div>
  )
}
