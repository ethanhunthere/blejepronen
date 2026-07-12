'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Images } from 'lucide-react'
import FullscreenGallery from './FullscreenGallery'

interface ListingImageGalleryProps {
  images: string[]
  title: string
  type?: 'shitje' | 'qira'
  featured?: boolean
}

export default function ListingImageGallery({
  images,
  title,
  type = 'shitje',
  featured = false,
}: ListingImageGalleryProps) {
  const [current, setCurrent] = useState(0)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  const normalized = images.filter(Boolean)
  const hasImages = normalized.length > 0
  const total = normalized.length

  const goPrev = useCallback(() => {
    setCurrent(prev => (prev === 0 ? total - 1 : prev - 1))
  }, [total])

  const goNext = useCallback(() => {
    setCurrent(prev => (prev === total - 1 ? 0 : prev + 1))
  }, [total])

  const openFullscreen = useCallback((index: number) => {
    setCurrent(index)
    setFullscreenOpen(true)
  }, [])

  // Scroll to the gallery top when the listing detail page mounts.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const el = document.getElementById('listing-gallery')
    if (el) {
      const rect = el.getBoundingClientRect()
      window.scrollTo({ top: rect.top + window.scrollY, behavior: 'instant' })
    }
  }, [])

  if (!hasImages) {
    return (
      <div
        id="listing-gallery"
        className="relative h-[50vh] md:h-[60vh] rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex flex-col items-center justify-center text-gray-400"
      >
        <Images className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-lg">Nuk ka foto</p>
      </div>
    )
  }

  const typeLabel = type === 'shitje' ? 'Shitje' : 'Me qira'

  return (
    <>
      <div id="listing-gallery" className="relative">
        {/* Desktop grid */}
        <div className="hidden md:grid h-[60vh] lg:h-[70vh] grid-cols-[1.5fr_1fr] grid-rows-2 gap-2 rounded-3xl overflow-hidden bg-gray-100">
          {/* Main left image */}
          <button
            type="button"
            onClick={() => openFullscreen(0)}
            className="relative row-span-2 group overflow-hidden focus:outline-none cursor-pointer"
            aria-label="Foto kryesore"
          >
            <Image
              src={normalized[0]}
              alt={`${title} – foto 1`}
              fill
              priority
              className="object-cover transition-all duration-500 group-hover:brightness-95"
              sizes="(max-width: 1024px) 60vw, 55vw"
            />
          </button>

          {/* Right top */}
          {normalized[1] && (
            <button
              type="button"
              onClick={() => openFullscreen(1)}
              className={`relative group overflow-hidden focus:outline-none cursor-pointer ${
                !normalized[2] ? 'row-span-2' : ''
              }`}
              aria-label="Foto 2"
            >
              <Image
                src={normalized[1]}
                alt={`${title} – foto 2`}
                fill
                className="object-cover transition-all duration-300 group-hover:brightness-90"
                sizes="(max-width: 1024px) 40vw, 35vw"
              />
            </button>
          )}

          {/* Right bottom */}
          {normalized[2] && (
            <button
              type="button"
              onClick={() => openFullscreen(2)}
              className="relative group overflow-hidden focus:outline-none cursor-pointer"
              aria-label="Foto 3"
            >
              <Image
                src={normalized[2]}
                alt={`${title} – foto 3`}
                fill
                className="object-cover transition-all duration-300 group-hover:brightness-90"
                sizes="(max-width: 1024px) 40vw, 35vw"
              />
              {total > 3 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">+{total - 3} foto</span>
                </div>
              )}
            </button>
          )}

          {/* Badges */}
          <div className="absolute top-4 left-4 z-10">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-[#1B4FFF] text-white shadow-lg">
              {typeLabel}
            </span>
          </div>
          {featured && (
            <div className="absolute top-4 right-4 z-10">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-amber-500 text-white shadow-lg">
                Featured
              </span>
            </div>
          )}

          {/* View all button */}
          <button
            type="button"
            onClick={() => openFullscreen(0)}
            className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 hover:bg-white text-[#1A1A2E] border border-gray-200 text-sm font-semibold transition-all duration-200 shadow-sm"
          >
            <Images className="h-4 w-4" />
            Shiko të gjitha {total} foto
          </button>
        </div>

        {/* Mobile single image */}
        <div className="md:hidden relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100">
          <Image
            src={normalized[current]}
            alt={`${title} – foto ${current + 1}`}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#1B4FFF] text-white">
              {typeLabel}
            </span>
          </div>
          {featured && (
            <div className="absolute top-3 right-12 z-10">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">
                Featured
              </span>
            </div>
          )}

          {/* Counter */}
          <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-medium">
            {current + 1} / {total}
          </div>

          {/* Arrows */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-[#1A1A2E] shadow-md border border-gray-100"
                aria-label="Fotoja e mëparshme"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-[#1A1A2E] shadow-md border border-gray-100"
                aria-label="Fotoja tjetër"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* View all */}
          <button
            type="button"
            onClick={() => openFullscreen(current)}
            className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-[#1A1A2E] text-xs font-medium shadow-sm border border-gray-200"
          >
            <Images className="h-3.5 w-3.5" />
            {total} foto
          </button>
        </div>
      </div>

      <FullscreenGallery
        images={normalized}
        title={title}
        isOpen={fullscreenOpen}
        initialIndex={current}
        onClose={() => setFullscreenOpen(false)}
      />
    </>
  )
}
