'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface FullscreenGalleryProps {
  images: string[]
  title: string
  isOpen: boolean
  initialIndex: number
  onClose: () => void
}

export default function FullscreenGallery({
  images,
  title,
  isOpen,
  initialIndex,
  onClose,
}: FullscreenGalleryProps) {
  const [current, setCurrent] = useState(initialIndex)
  const [touchStart, setTouchStart] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      setCurrent(initialIndex)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, initialIndex])

  useEffect(() => {
    if (!isOpen) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') setCurrent(prev => (prev === 0 ? images.length - 1 : prev - 1))
      else if (e.key === 'ArrowRight') setCurrent(prev => (prev === images.length - 1 ? 0 : prev + 1))
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, images.length, onClose])

  const goPrev = useCallback(() => {
    setCurrent(prev => (prev === 0 ? images.length - 1 : prev - 1))
  }, [images.length])

  const goNext = useCallback(() => {
    setCurrent(prev => (prev === images.length - 1 ? 0 : prev + 1))
  }, [images.length])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext()
      else goPrev()
    }
    setTouchStart(null)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          aria-label="Mbyll"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-white text-sm font-medium">
          {current + 1} / {images.length}
        </span>
        <div className="w-10" />
      </div>

      {/* Main image */}
      <div className="relative flex-1 flex items-center justify-center">
        <Image
          src={images[current]}
          alt={`${title} - foto ${current + 1}`}
          fill
          className="object-contain"
          sizes="100vw"
          priority
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
              aria-label="Fotoja e mëparshme"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
              aria-label="Fotoja tjetër"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-4 bg-black/80 scrollbar-hide justify-center">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrent(idx)}
              className={`relative w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden transition-opacity ${
                idx === current ? 'ring-2 ring-white opacity-100' : 'opacity-50 hover:opacity-80'
              }`}
              aria-label={`Shiko foto ${idx + 1}`}
            >
              <Image
                src={img}
                alt={`${title} - foto ${idx + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
