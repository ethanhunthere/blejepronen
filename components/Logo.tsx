import Image from 'next/image'

interface LogoProps {
  variant?: 'navbar' | 'auth'
  className?: string
}

export function Logo({ variant = 'navbar', className }: LogoProps) {
  const containerClasses =
    variant === 'navbar'
      ? 'relative h-9 w-36'
      : 'relative h-16 w-64'

  return (
    <div className={`${containerClasses} ${className || ''}`}>
      <Image
        src="/logo.png"
        alt="Bleje Banesën"
        fill
        className="object-contain"
        priority
      />
    </div>
  )
}
