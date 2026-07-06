'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimateOnScrollProps {
  children: React.ReactNode
  className?: string
  threshold?: number
  rootMargin?: string
  once?: boolean
}

export default function AnimateOnScroll({
  children,
  className = '',
  threshold = 0.15,
  rootMargin = '0px 0px -60px 0px',
  once = true,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Respect reduced motion by showing immediately
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return (
    <div ref={ref} className={`${className} ${visible ? 'aos-visible' : ''}`}>
      {children}
    </div>
  )
}
