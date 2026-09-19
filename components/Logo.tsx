import Image from 'next/image'

interface LogoProps {
  variant?: 'navbar' | 'auth'
  className?: string
}

export function Logo({ variant = 'navbar', className }: LogoProps) {
  if (variant === 'navbar') {
    return (
      <div className={`${className || 'h-9 sm:h-10'}`}>
        <Image
          src="/logo-icon.png"
          alt="Bleje Pronën"
          width={493}
          height={493}
          className="h-full w-auto object-contain object-left"
          priority
        />
      </div>
    )
  }

  return (
    <div className={`relative h-14 max-w-[240px] w-full ${className || ''}`}>
      <Image
        src="/logo.png"
        alt="Bleje Pronën"
        fill
        className="object-contain object-left"
        priority
      />
    </div>
  )
}
