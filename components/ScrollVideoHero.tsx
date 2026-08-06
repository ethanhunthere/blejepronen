'use client'

import React, { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import SearchBar from './SearchBar'

export default function ScrollVideoHero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || !videoRef.current) return
      
      const container = containerRef.current
      const video = videoRef.current
      
      const rect = container.getBoundingClientRect()
      
      // Calculate scroll progress (0 to 1) based on container's position
      // Top of page
      const scrollStart = 0 
      const scrollableDistance = container.offsetHeight - window.innerHeight
      
      let newProgress = -rect.top / scrollableDistance
      
      // Clamp between 0 and 1
      newProgress = Math.max(0, Math.min(1, newProgress))
      setProgress(newProgress)

      if (video.duration) {
        // Use requestAnimationFrame for smoother playback scrubbing
        requestAnimationFrame(() => {
          video.currentTime = video.duration * newProgress
        })
      }
    }

    // Attempt to load the metadata immediately to get the duration
    if (videoRef.current) {
        videoRef.current.load();
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // initial call
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section 
      ref={containerRef}
      className="relative w-full h-[250vh] bg-white"
    >
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden">
        <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 flex flex-col lg:flex-row items-center justify-between gap-12 max-w-[2000px] mx-auto">
          
          {/* Left Text */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center lg:text-left text-center mt-16 lg:mt-0">
            <h1 className="text-[42px] sm:text-[54px] md:text-[68px] font-extrabold tracking-tight text-[#1A1A2E] leading-[1.08]">
              Gjej banesën
              <br />
              <span className="underline decoration-[#C8B882] decoration-4 underline-offset-[12px]">e duhur</span> në Kosovë
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

          {/* Right Video */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-2 lg:p-4 mt-8 lg:mt-0">
            <div className="relative w-full max-w-3xl aspect-video rounded-3xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] bg-black ring-1 ring-gray-900/5">
              <video 
                ref={videoRef}
                src="/hero-video.mp4" 
                className="absolute inset-0 w-full h-full object-cover"
                muted 
                playsInline
                preload="auto"
              />
              {/* Progress bar to show the scroll effect */}
              <div className="absolute bottom-4 left-4 right-4 h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-md z-10">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-75 ease-linear"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
