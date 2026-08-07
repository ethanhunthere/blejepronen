'use client'

import React, { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import SearchBar from './SearchBar'

export default function ScrollVideoHero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [progress, setProgress] = useState(0)
  const [videoReady, setVideoReady] = useState(false)

  useEffect(() => {
    let targetProgress = 0
    let currentProgress = 0
    let animationFrameId: number

    const handleScroll = () => {
      if (!containerRef.current) return
      
      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      
      const scrollableDistance = container.offsetHeight - window.innerHeight
      let newProgress = -rect.top / scrollableDistance
      // Clamp between 0 and 1
      targetProgress = Math.max(0, Math.min(1, newProgress))
    }

    let lastSetTime = -1

    const renderLoop = () => {
      // Instant update, no lerp delay
      currentProgress = targetProgress
      
      setProgress(currentProgress)

      const video = videoRef.current
      if (video && video.duration && !isNaN(video.duration)) {
        const safeDuration = video.duration - 0.05
        const targetTime = safeDuration * currentProgress
        
        // Update currentTime only if the time difference is significant (e.g. > 0.04s for ~25fps)
        // This prevents decoder locking/blocking from setting currentTime too frequently
        if (Math.abs(lastSetTime - targetTime) > 0.04) {
          video.currentTime = Math.max(0.001, targetTime)
          lastSetTime = targetTime
        }
      }
      
      animationFrameId = requestAnimationFrame(renderLoop)
    }

    // Attempt to load the metadata immediately to get the duration
    if (videoRef.current) {
        videoRef.current.load()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // initial call
    animationFrameId = requestAnimationFrame(renderLoop)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <section 
      ref={containerRef}
      className="relative w-full bg-white"
      style={{ height: '600vh' }}
    >
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden">
        <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 flex flex-col lg:flex-row items-center justify-between gap-12 max-w-[2000px] mx-auto">
          
          {/* Left Text */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center lg:text-left text-center mt-16 lg:mt-0">
            <h1 className="text-[42px] sm:text-[54px] md:text-[68px] font-extrabold tracking-tight text-[#1A1A2E] leading-[1.08] relative">
              Gjej banesën
              <br />
              <span className="relative inline-block pb-2 lg:pb-3">
                <span className="relative z-10">e duhur në Kosovë</span>
                <span 
                  className="absolute left-0 bottom-0 h-[6px] md:h-[8px] bg-[#C8B882] transition-all duration-75 ease-linear rounded-full z-10"
                  style={{ width: `${30 + progress * 55}%` }}
                />
              </span>
            </h1>

            <p className="text-[16px] text-gray-500 leading-relaxed mt-5 lg:mx-0 mx-auto max-w-lg">
              Bli, shit ose jep me qira banesën tënde duke folur direkt me pronarët, pa ndërmjetës.
            </p>

            {/* Search Bar */}
            <div className="relative z-10 mt-10 w-full max-w-2xl mx-auto lg:mx-0">
              <SearchBar
                placeholder="Kërko banesë, agjent, kompani, adresë..."
                buttonText="Kërko Banesë"
              />
            </div>

            {/* City strip */}
            <div className="relative z-10 mt-10 overflow-x-auto scrollbar-hide px-1 pt-2 pb-1 w-full max-w-2xl mx-auto lg:mx-0">
              <div className="flex items-center lg:justify-start justify-center gap-2 min-w-max">
              {['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Gjilan', 'Mitrovicë'].map((city) => (
                <Link
                  key={city}
                  href={`/listings?city=${encodeURIComponent(city)}`}
                  className="relative flex-shrink-0 text-[13px] font-medium text-gray-600 px-4 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-[#006459] hover:text-white hover:border-[#006459] hover:-translate-y-0.5 hover:z-30 transition-all duration-200"
                >
                  {city}
                </Link>
              ))}
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:justify-start justify-center">
              <Link
                href="/listings"
                className="inline-flex items-center justify-center min-h-[44px] bg-[#C8B882] text-[#1A1A2E] font-semibold px-8 py-3 rounded-full shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_10px_24px_-8px_rgba(200,184,130,0.55)] hover:bg-[#D6C494] hover:shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_16px_32px_-8px_rgba(200,184,130,0.6)] hover:-translate-y-[1px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-out cursor-pointer"
              >
                Shiko banesat
              </Link>
              <Link
                href="/posto-banese"
                className="inline-flex items-center justify-center min-h-[44px] bg-white border border-gray-200 text-[#1A1A2E] font-semibold px-8 py-3 rounded-full hover:bg-[#006459] hover:text-white hover:border-[#006459] hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 ease-out cursor-pointer"
              >
                Posto banesën tënde
              </Link>
            </div>
          </div>

          {/* Right Video / App Composition */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 mt-12 lg:mt-0 relative">
            
            {/* Minimalist, borderless video frame with deep elevation */}
            <div className="relative w-full max-w-2xl aspect-video rounded-[2rem] overflow-hidden bg-gray-50 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] ring-1 ring-gray-900/5 z-10">
              
              {/* Custom Poster Image */}
              <img 
                src="/hero-poster.jpg" 
                alt="Video thumbnail"
                className={`absolute inset-0 w-full h-full object-cover z-20 pointer-events-none ${videoReady ? 'hidden' : 'block'}`}
              />
              
              <video 
                ref={videoRef}
                src="/hero-video.mp4?v=3#t=0.001" 
                className="absolute inset-0 w-full h-full object-cover z-10"
                muted 
                playsInline
                preload="auto"
                onCanPlay={() => setVideoReady(true)}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0.001;
                  }
                }}
              />
            </div>


          </div>

        </div>
      </div>
    </section>
  )
}
