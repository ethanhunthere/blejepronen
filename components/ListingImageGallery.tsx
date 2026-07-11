'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react'

interface ListingImageGalleryProps {
  images: string[]
  title: string
}

export default function ListingImageGallery({ images, title }: ListingImageGalleryProps) {
  const [currentImage, setCurrentImage] = useState(0)
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const hasImages = !!images && images.length > 0

  const goPrev = () =>
    setCurrentImage(prev => (prev === 0 ? images.length - 1 : prev - 1))

  const goNext = () =>
    setCurrentImage(prev => (prev === images.length - 1 ? 0 : prev + 1))

  // Keep the active thumbnail visible / centered when navigating with arrows.
  useEffect(() => {
    thumbRefs.current[currentImage]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [currentImage])

  // Keyboard navigation: ArrowLeft / ArrowRight cycle through images.
  useEffect(() => {
    if (!hasImages || images.length < 2) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentImage(prev => (prev === 0 ? images.length - 1 : prev - 1))
      } else if (e.key === 'ArrowRight') {
        setCurrentImage(prev => (prev === images.length - 1 ? 0 : prev + 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasImages, images.length])

  // Scroll so the gallery starts at the top of the viewport when the listing
  // detail page mounts (below the back-link area).
  useEffect(() => {
    if (typeof window !== 'undefined' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      window.scrollTo({ top: rect.top + window.scrollY, behavior: 'instant' })
    }
  }, [])

  if (!hasImages) {
    return (
      <div className="bg-white/5 flex flex-col items-center justify-center h-80 rounded-2xl border border-white/10 text-gray-500">
        <Building2 className="h-12 w-12 mb-3" />
        <p className="text-lg">Nuk ka foto</p>
      </div>
    )
  }

  const showArrows = images.length > 1
  const showDots = images.length > 1 && images.length <= 10
  const showThumbnails = images.length > 1

  return (
    <div ref={containerRef} className="space-y-4">
      <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-[#111936]">
        <Image
          src={images[currentImage]}
          alt={`${title} – foto ${currentImage + 1}`}
          fill
          priority={currentImage === 0}
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 66vw"
        />

        {/* Image counter */}
        <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/40 text-white text-xs font-medium backdrop-blur-sm">
          {currentImage + 1} / {images.length}
        </div>

        {/* Previous arrow */}
        {showArrows && (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all duration-200"
            aria-label="Fotoja e mëparshme"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Next arrow */}
        {showArrows && (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all duration-200"
            aria-label="Fotoja tjetër"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Dot indicators */}
        {showDots && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentImage(index)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  index === currentImage
                    ? 'bg-white w-4'
                    : 'bg-white/50 hover:bg-white/75 w-2'
                }`}
                aria-label={`Shiko foto ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {showThumbnails && (
        <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              ref={el => {
                thumbRefs.current[index] = el
              }}
              onClick={() => setCurrentImage(index)}
              className={`relative w-20 h-16 flex-shrink-0 overflow-hidden rounded-lg cursor-pointer transition-opacity ${
                index === currentImage
                  ? 'ring-2 ring-[#1B4FFF] ring-offset-2 ring-offset-black opacity-100'
                  : 'opacity-50 hover:opacity-80'
              }`}
              aria-label={`Shiko foto ${index + 1}`}
            >
              <Image
                src={image}
                alt={`${title} – foto ${index + 1}`}
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
