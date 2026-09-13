'use client'

import { useState, useCallback, useRef } from 'react'
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
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const swipedRef = useRef(false)

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

  if (!hasImages) {
    return (
      <div
        id="listing-gallery"
        className="relative h-[280px] sm:h-[340px] rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 flex flex-col items-center justify-center text-gray-500 shadow-xs"
      >
        <Images className="h-10 w-10 mb-2.5 opacity-40" />
        <p className="text-sm font-medium">Nuk ka foto të disponueshme</p>
      </div>
    )
  }

  const typeLabel = type === 'shitje' ? 'Shitje' : 'Me qira'

  return (
    <>
      <div id="listing-gallery" className="relative">
        {/* Desktop grid */}
        <div className="hidden md:grid h-[340px] md:h-[390px] lg:h-[430px] grid-cols-[1.5fr_1fr] grid-rows-2 gap-2.5 rounded-3xl overflow-hidden bg-gray-100 shadow-xs">
          {/* Main left image */}
          <button
            type="button"
            onClick={() => openFullscreen(0)}
            className="relative row-span-2 group overflow-hidden focus:outline-none cursor-pointer"
            aria-label="Foto kryesore"
          >
            <Image
              src={normalized[0]}
              alt={`${title} - foto 1`}
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
                alt={`${title} - foto 2`}
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
                alt={`${title} - foto 3`}
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
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-[#006459] text-white shadow-lg">
              {typeLabel}
            </span>
          </div>
          {featured && (
            <div className="absolute top-4 right-4 z-10">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-[#C8B882] text-[#101828] shadow-lg">
                Featured
              </span>
            </div>
          )}

          {/* View all button */}
          <button
            type="button"
            onClick={() => openFullscreen(0)}
            className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 text-[#101828] border border-gray-200 text-sm font-semibold shadow-sm hover:bg-white hover:shadow-lg hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 ease-out cursor-pointer"
          >
            <Images className="h-4 w-4" />
            Shiko të gjitha {total} foto
          </button>
        </div>

        {/* Mobile single image */}
        <div
          className="md:hidden relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 touch-pan-y select-none cursor-pointer"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX
            touchStartY.current = e.touches[0].clientY
            swipedRef.current = false
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null || touchStartY.current === null) return
            const diffX = touchStartX.current - e.changedTouches[0].clientX
            const diffY = touchStartY.current - e.changedTouches[0].clientY

            // If horizontal gesture is dominant and longer than 35px, navigate
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
              swipedRef.current = true
              if (diffX > 0) goNext()
              else goPrev()
            }
            touchStartX.current = null
            touchStartY.current = null
          }}
          onClick={() => {
            if (!swipedRef.current) {
              openFullscreen(current)
            }
          }}
        >
          <Image
            src={normalized[current]}
            alt={`${title} - foto ${current + 1}`}
            fill
            priority
            className="object-cover pointer-events-none"
            sizes="100vw"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#006459] text-white shadow-sm">
              {typeLabel}
            </span>
          </div>
          {featured && (
            <div className="absolute top-3 right-16 z-10">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#C8B882] text-[#101828] shadow-sm">
                Featured
              </span>
            </div>
          )}

          {/* Counter badge */}
          <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-xs font-semibold">
            {current + 1} / {total}
          </div>

          {/* Pagination dots */}
          {total > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-xs">
              {normalized.slice(0, Math.min(total, 6)).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === current || (current >= 5 && idx === 5)
                      ? 'w-3.5 bg-white'
                      : 'w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Arrows */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  goPrev()
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 text-[#101828] shadow-md border border-gray-100 hover:bg-white active:scale-95 transition-all duration-200 cursor-pointer"
                aria-label="Fotoja e mëparshme"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  goNext()
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 text-[#101828] shadow-md border border-gray-100 hover:bg-white active:scale-95 transition-all duration-200 cursor-pointer"
                aria-label="Fotoja tjetër"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* View all */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openFullscreen(current)
            }}
            className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 text-[#101828] text-xs font-semibold shadow-sm border border-gray-200 hover:bg-white hover:shadow-md active:scale-95 transition-all duration-200 cursor-pointer"
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
