import Image from 'next/image'

interface LogoProps {
  variant?: 'navbar' | 'auth'
  className?: string
}

export function Logo({ variant = 'navbar', className }: LogoProps) {
  if (variant === 'navbar') {
    return (
      <div className={`h-10 ${className || ''}`}>
        <Image
          src="/logo.png"
          alt="Bleje Banesën"
          width={253}
          height={251}
          className="h-10 w-auto object-contain object-left"
          priority
        />
      </div>
    )
  }

  return (
    <div className={`relative h-16 max-w-[280px] w-full ${className || ''}`}>
      <Image
        src="/logo.png"
        alt="Bleje Banesën"
        fill
        className="object-contain object-left"
        priority
      />
    </div>
  )
}
