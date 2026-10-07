'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

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
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(true)

  const viewerRef = useRef<HTMLDivElement>(null)
  const thumbnailContainerRef = useRef<HTMLDivElement>(null)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const lastTapRef = useRef<number>(0)

  // Gesture state tracked during active touches/clicks
  const gestureRef = useRef<{
    startX: number
    startY: number
    startOffsetX: number
    startOffsetY: number
    startScale: number
    initialDistance: number
    axis: 'none' | 'horizontal' | 'vertical' | 'pinch'
    hasMoved: boolean
  }>({
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    startScale: 1,
    initialDistance: 0,
    axis: 'none',
    hasMoved: false,
  })

  // Synchronize initialIndex and reset transformation states on open
  useEffect(() => {
    if (isOpen) {
      const validIndex = Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1))
      setCurrent(validIndex)
      setScale(1)
      setOffset({ x: 0, y: 0 })
      setIsImageLoading(true)
    }
  }, [isOpen, initialIndex, images.length])

  // Non-destructive scroll lock reserving scrollbar width to prevent layout shift
  useEffect(() => {
    if (!isOpen) return

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const body = document.body
    const originalOverflow = body.style.overflow
    const originalPaddingRight = body.style.paddingRight

    if (scrollbarWidth > 0) {
      const currentPadding = parseFloat(window.getComputedStyle(body).paddingRight) || 0
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`
    }
    body.style.overflow = 'hidden'

    return () => {
      body.style.overflow = originalOverflow
      body.style.paddingRight = originalPaddingRight
    }
  }, [isOpen])

  // Navigation handlers
  const goPrev = useCallback(() => {
    if (images.length <= 1) return
    setCurrent(prev => (prev === 0 ? images.length - 1 : prev - 1))
    setScale(1)
    setOffset({ x: 0, y: 0 })
    setIsImageLoading(true)
  }, [images.length])

  const goNext = useCallback(() => {
    if (images.length <= 1) return
    setCurrent(prev => (prev === images.length - 1 ? 0 : prev + 1))
    setScale(1)
    setOffset({ x: 0, y: 0 })
    setIsImageLoading(true)
  }, [images.length])

  // Keyboard navigation: Escape, ArrowLeft, ArrowRight
  useEffect(() => {
    if (!isOpen) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, goPrev, goNext, onClose])

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!thumbnailContainerRef.current) return
    const activeThumb = thumbnailContainerRef.current.children[current] as HTMLElement | undefined
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [current])

  // Calculate pan limits when zoomed in
  const getBounds = useCallback((currentScale: number) => {
    if (!viewerRef.current || currentScale <= 1) return { maxX: 0, maxY: 0 }
    const rect = viewerRef.current.getBoundingClientRect()
    const maxX = Math.max(0, ((currentScale - 1) * rect.width) / 2)
    const maxY = Math.max(0, ((currentScale - 1) * rect.height) / 2)
    return { maxX, maxY }
  }, [])

  // Non-passive wheel zoom (mouse wheel / trackpad pinch)
  useEffect(() => {
    const container = viewerRef.current
    if (!container || !isOpen) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85
      setScale(prev => {
        const next = Math.min(4, Math.max(1, Number((prev * zoomFactor).toFixed(2))))
        if (next === 1) {
          setOffset({ x: 0, y: 0 })
        }
        return next
      })
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [isOpen])

  // Pointer event gesture handling
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Ignore fallback if capture unsupported
    }

    const g = gestureRef.current
    if (pointersRef.current.size === 1) {
      g.startX = e.clientX
      g.startY = e.clientY
      g.startOffsetX = offset.x
      g.startOffsetY = offset.y
      g.startScale = scale
      g.axis = scale > 1 ? 'pinch' : 'none'
      g.hasMoved = false
      setIsDragging(true)
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values())
      g.initialDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      g.startScale = scale
      g.axis = 'pinch'
      setIsDragging(true)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    const g = gestureRef.current

    // Two pointers: pinch-to-zoom
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values())
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (g.initialDistance > 0) {
        const ratio = currentDist / g.initialDistance
        const nextScale = Math.min(4, Math.max(1, Number((g.startScale * ratio).toFixed(2))))
        setScale(nextScale)
        if (nextScale <= 1) {
          setOffset({ x: 0, y: 0 })
        }
      }
      return
    }

    // Single pointer
    if (pointersRef.current.size === 1) {
      const dx = e.clientX - g.startX
      const dy = e.clientY - g.startY

      // When zoomed in: pan the image
      if (scale > 1) {
        g.hasMoved = true
        const { maxX, maxY } = getBounds(scale)
        const nextX = Math.min(maxX, Math.max(-maxX, g.startOffsetX + dx))
        const nextY = Math.min(maxY, Math.max(-maxY, g.startOffsetY + dy))
        setOffset({ x: nextX, y: nextY })
        return
      }

      // Unzoomed: disambiguate vertical vs horizontal gesture
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)

      if (g.axis === 'none') {
        if (absX > 8 || absY > 8) {
          g.hasMoved = true
          // Strict direction locking prevents vertical scroll from triggering horizontal swipe
          if (absY >= absX) {
            g.axis = 'vertical' // Swipe to dismiss
          } else {
            g.axis = 'horizontal' // Horizontal slide navigation
          }
        }
      }

      if (g.axis === 'vertical') {
        // Vertical swipe (swipe-to-dismiss feedback)
        setOffset({ x: 0, y: dy })
      } else if (g.axis === 'horizontal') {
        // Horizontal swipe (slide change preview)
        setOffset({ x: dx, y: 0 })
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      // Ignore
    }

    pointersRef.current.delete(e.pointerId)
    const g = gestureRef.current

    // If one pointer remains after a 2-finger pinch, seamlessly hand off anchor
    if (pointersRef.current.size === 1) {
      const remaining = Array.from(pointersRef.current.values())[0]
      g.startX = remaining.x
      g.startY = remaining.y
      g.startOffsetX = offset.x
      g.startOffsetY = offset.y
      g.startScale = scale
      g.initialDistance = 0
      return
    }

    if (pointersRef.current.size === 0) {
      setIsDragging(false)

      const now = Date.now()
      // Detect double-tap to zoom toggle
      if (!g.hasMoved) {
        if (now - lastTapRef.current < 300) {
          if (scale > 1) {
            setScale(1)
            setOffset({ x: 0, y: 0 })
          } else {
            setScale(2.5)
          }
          lastTapRef.current = 0
          g.axis = 'none'
          return
        }
        lastTapRef.current = now
      }

      // Snap back if scale close to 1
      if (scale < 1.05) {
        setScale(1)
        setOffset({ x: 0, y: 0 })
      }

      // Handle gesture conclusions
      if (g.axis === 'vertical') {
        // Swipe to dismiss threshold
        if (Math.abs(offset.y) > 100) {
          onClose()
        } else {
          setOffset({ x: 0, y: 0 })
        }
      } else if (g.axis === 'horizontal') {
        // Horizontal swipe navigation threshold
        if (offset.x < -50) {
          goNext()
        } else if (offset.x > 50) {
          goPrev()
        }
        setOffset({ x: 0, y: 0 })
      }

      g.axis = 'none'
      g.hasMoved = false
      g.initialDistance = 0
    }
  }

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(4, Number((prev + 0.5).toFixed(1))))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(prev => {
      const next = Math.max(1, Number((prev - 0.5).toFixed(1)))
      if (next === 1) setOffset({ x: 0, y: 0 })
      return next
    })
  }, [])

  const resetZoom = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  if (!isOpen || !images || images.length === 0) return null

  // Compute dynamic backdrop opacity during vertical swipe-to-dismiss.
  // Driven purely by state (never by ref reads during render).
  const isDismissing = scale === 1 && offset.y !== 0
  const backdropOpacity = isDismissing
    ? Math.max(0.2, 1 - Math.abs(offset.y) / 400)
    : 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Galeria: ${title}` : 'Galeria e fotografive me madhësi të plotë'}
      className="fixed inset-0 z-50 flex flex-col select-none overflow-hidden"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})`,
        transition: isDragging ? 'none' : 'background-color 200ms ease-out',
      }}
    >
      {/* Header */}
      <div
        className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] bg-gradient-to-b from-black/80 via-black/40 to-transparent"
        style={{
          opacity: isDismissing ? Math.max(0, 1 - Math.abs(offset.y) / 200) : 1,
          transition: isDragging ? 'none' : 'opacity 200ms ease-out',
        }}
      >
        {/* Left: Close button */}
        <button
          type="button"
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all duration-150 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-white/50"
          aria-label="Mbyll galerinë"
          title="Mbyll (Esc)"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Center: Full-screen Counter & Title */}
        <div className="flex flex-col items-center justify-center max-w-[60%] text-center">
          <div
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs sm:text-sm font-medium tracking-wide tabular-nums select-none"
          >
            <span className="font-semibold">{current + 1}</span>
            <span className="text-white/50">/</span>
            <span className="text-white/80">{images.length}</span>
          </div>
          {title && (
            <p className="hidden sm:block text-xs text-white/70 truncate max-w-xs mt-1">
              {title}
            </p>
          )}
        </div>

        {/* Right: Zoom controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {scale > 1 && (
            <button
              type="button"
              onClick={resetZoom}
              className="min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-150 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-white/50"
              aria-label="Rivendos madhësinë origjinale"
              title="Rivendos zoom"
            >
              {Math.round(scale * 100)}%
            </button>
          )}
          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= 4}
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-white/50"
            aria-label="Zmadho foton"
            title="Zmadho"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= 1}
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-white/50"
            aria-label="Zvogëlo foton"
            title="Zvogëlo"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Image Viewer Area */}
      <div
        ref={viewerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative flex-1 flex items-center justify-center overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
      >
        {/* Loading Spinner */}
        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Transformed image layer */}
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 220ms cubic-bezier(0.2, 0, 0, 1)',
            willChange: 'transform',
          }}
        >
          <Image
            src={images[current]}
            alt={`${title} - foto ${current + 1}`}
            fill
            className="object-contain select-none pointer-events-none"
            sizes="100vw"
            priority
            draggable={false}
            onLoad={() => setIsImageLoading(false)}
          />
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goPrev()
              }}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 active:scale-95 transition-all duration-150 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-white/50"
              aria-label="Fotoja e mëparshme"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goNext()
              }}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 active:scale-95 transition-all duration-150 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-white/50"
              aria-label="Fotoja tjetër"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails strip */}
      {images.length > 1 && (
        <div
          ref={thumbnailContainerRef}
          role="tablist"
          aria-label="Fotografitë e galerisë"
          className="relative z-20 flex gap-2 overflow-x-auto px-4 py-3 bg-black/80 justify-start sm:justify-center touch-pan-x pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-white/10"
          style={{
            opacity: isDismissing ? Math.max(0, 1 - Math.abs(offset.y) / 200) : 1,
            transition: isDragging ? 'none' : 'opacity 200ms ease-out',
          }}
        >
          {images.map((img, idx) => {
            const isSelected = idx === current
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`Shiko foton ${idx + 1}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrent(idx)
                  setScale(1)
                  setOffset({ x: 0, y: 0 })
                  setIsImageLoading(true)
                }}
                className={`relative min-w-[56px] min-h-[44px] w-16 h-12 sm:w-20 sm:h-14 shrink-0 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 focus:outline-hidden focus:ring-2 focus:ring-white ${
                  isSelected
                    ? 'ring-2 ring-white opacity-100 scale-105'
                    : 'opacity-50 hover:opacity-85'
                }`}
              >
                <Image
                  src={img}
                  alt=""
                  fill
                  className="object-cover pointer-events-none"
                  sizes="80px"
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
