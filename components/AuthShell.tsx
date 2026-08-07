import Image from 'next/image'
import AuthAnimation from './AuthAnimation'

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-[#006459] flex items-center">
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
      
      <div className="relative w-full max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center justify-between h-full w-full">
        {/* Left side: Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-start px-4 py-8 lg:px-12 2xl:px-24">
          {children}
        </div>
        
        {/* Right side: Animation placeholder */}
        <div className="hidden lg:flex w-full lg:w-1/2 items-center justify-center h-full min-h-[500px]" id="auth-animation-container">
          <AuthAnimation />
        </div>
      </div>
    </div>
  )
}
