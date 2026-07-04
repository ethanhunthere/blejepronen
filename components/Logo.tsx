import Image from 'next/image'

interface LogoProps {
  variant?: 'navbar' | 'auth'
  className?: string
}

export function Logo({ variant = 'navbar', className }: LogoProps) {
  return (
    <div className={`relative ${variant === 'navbar' ? 'h-8 w-44' : 'h-14 w-72'} ${className || ''}`}>
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
