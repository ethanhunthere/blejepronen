import Image from 'next/image'

interface LogoProps {
  variant?: 'navbar' | 'auth'
  className?: string
}

export function Logo({ variant = 'navbar', className }: LogoProps) {
  return (
    <div className={`relative ${variant === 'navbar' ? 'h-10 w-52' : 'h-16 max-w-[280px] w-full'} ${className || ''}`}>
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
