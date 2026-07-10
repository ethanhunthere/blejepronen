'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ListingImageGalleryProps {
  images: string[]
  title: string
}

export default function ListingImageGallery({ images, title }: ListingImageGalleryProps) {
  const [currentImage, setCurrentImage] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[16/10] rounded-2xl bg-[#111936] flex items-center justify-center text-gray-500">
        Pa foto
      </div>
    )
  }

  const showArrows = images.length > 1
  const showDots = images.length > 1 && images.length <= 10

  const goPrev = () =>
    setCurrentImage(prev => (prev === 0 ? images.length - 1 : prev - 1))

  const goNext = () =>
    setCurrentImage(prev => (prev === images.length - 1 ? 0 : prev + 1))

  return (
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
  )
}
