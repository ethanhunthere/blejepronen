'use client'

import React, { useEffect, useRef, useState } from 'react'

interface AnimateOnScrollProps {
  children: React.ReactNode
  className?: string
  threshold?: number
  rootMargin?: string
  once?: boolean
}

function AnimateOnScroll({
  children,
  className = '',
  threshold = 0.15,
  rootMargin = '0px 0px -60px 0px',
  once = true,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return

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

export default React.memo(AnimateOnScroll)
