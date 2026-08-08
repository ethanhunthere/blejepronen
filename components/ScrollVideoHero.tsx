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

    const renderLoop = () => {
      currentProgress = targetProgress
      
      setProgress(currentProgress)

      const video = videoRef.current
      if (video && video.duration && !isNaN(video.duration)) {
        // Cut 1 second off the end of the video as requested
        const safeDuration = video.duration - 1.0
        const targetTime = safeDuration * currentProgress
        video.currentTime = Math.max(0.001, targetTime)
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
      <div className="sticky top-0 h-[100dvh] w-full flex items-center overflow-hidden pt-[72px] lg:pt-0">
        <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-4 lg:gap-12 max-w-[2000px] mx-auto h-full lg:h-auto overflow-hidden lg:overflow-visible pb-2 sm:pb-6 lg:pb-0">
          
          {/* Left Text */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center lg:text-center text-center mt-2 sm:mt-4 lg:-mt-16 shrink-0">
            <h1 className="text-[28px] sm:text-[36px] md:text-[54px] lg:text-[68px] font-extrabold tracking-tight text-[#1A1A2E] leading-[1.08] relative">
              Gjej banesën
              <br />
              <span className="relative inline-block pb-1 lg:pb-3">
                <span className="relative z-10">e duhur në Kosovë</span>
                <span 
                  className="absolute left-0 bottom-0 h-[4px] md:h-[8px] bg-[#C8B882] transition-all duration-75 ease-linear rounded-full z-10"
                  style={{ width: `${20 + progress * 80}%` }}
                />
              </span>
            </h1>

            <p className="text-[14px] sm:text-[16px] text-gray-500 leading-relaxed mt-3 sm:mt-5 lg:mx-0 mx-auto max-w-lg">
              Bli, shit ose jep me qira banesën tënde duke folur direkt me pronarët, pa ndërmjetës.
            </p>

            {/* Search Bar */}
            <div className="relative z-10 mt-5 sm:mt-10 w-full max-w-2xl mx-auto">
              <SearchBar
                placeholder="Kërko banesë, agjent, kompani, adresë..."
                buttonText="Kërko Banesë"
              />
            </div>

            {/* City strip */}
            <div className="relative z-10 mt-4 sm:mt-10 overflow-x-auto scrollbar-hide px-1 pt-1 sm:pt-2 pb-1 w-full max-w-2xl mx-auto">
              <div className="flex items-center justify-start sm:justify-center gap-2 min-w-max">
              {['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Gjilan', 'Mitrovicë'].map((city) => (
                <Link
                  key={city}
                  href={`/listings?city=${encodeURIComponent(city)}`}
                  className="relative flex-shrink-0 text-[12px] sm:text-[13px] font-medium text-gray-600 px-3 sm:px-4 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-[#006459] hover:text-white hover:border-[#006459] hover:-translate-y-0.5 hover:z-30 transition-all duration-200"
                >
                  {city}
                </Link>
              ))}
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-row sm:flex-row flex-wrap gap-2 sm:gap-3 lg:gap-8 mt-5 sm:mt-6 justify-center">
              <Link
                href="/listings"
                className="inline-flex items-center justify-center min-h-[40px] sm:min-h-[44px] bg-[#C8B882] text-[#1A1A2E] text-[13px] sm:text-[15px] font-semibold px-5 sm:px-8 py-2 sm:py-3 rounded-full shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_10px_24px_-8px_rgba(200,184,130,0.55)] hover:bg-[#D6C494] hover:shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_16px_32px_-8px_rgba(200,184,130,0.6)] hover:-translate-y-[1px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-out cursor-pointer flex-1 sm:flex-none"
              >
                Shiko banesat
              </Link>
              <Link
                href="/posto-banese"
                className="inline-flex items-center justify-center min-h-[40px] sm:min-h-[44px] bg-white border border-gray-200 text-[#1A1A2E] text-[13px] sm:text-[15px] font-semibold px-5 sm:px-8 py-2 sm:py-3 rounded-full hover:bg-[#006459] hover:text-white hover:border-[#006459] hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 ease-out cursor-pointer flex-1 sm:flex-none"
              >
                Posto banesën tënde
              </Link>
            </div>
          </div>

          {/* Right Video / App Composition */}
          <div 
            className="w-full lg:w-1/2 flex items-center justify-center p-0 sm:p-4 lg:p-8 mt-4 lg:-mt-24 relative shrink-0"
            style={{ transform: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `translateY(${progress * 80}px)` : 'none' }}
          >
            
            {/* Minimalist, borderless video frame with deep elevation */}
            <div className="relative w-full max-w-lg lg:max-w-2xl aspect-video rounded-[1.5rem] lg:rounded-[2rem] overflow-hidden bg-gray-50 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] lg:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] ring-1 ring-gray-900/5 z-10">
              
              {/* Custom Poster Image */}
              <img 
                src="/hero-poster.jpg" 
                alt="Video thumbnail"
                className={`absolute inset-0 w-full h-full object-cover z-20 pointer-events-none ${videoReady ? 'hidden' : 'block'}`}
              />
              
              <video 
                ref={videoRef}
                src="/hero-video.mp4?v=6#t=0.001" 
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
