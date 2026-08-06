import Image from 'next/image'

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-[#006459]">
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
      <div className="relative flex flex-col items-center px-4 pt-8 pb-8 lg:pt-12">
        {children}
      </div>
    </div>
  )
}
