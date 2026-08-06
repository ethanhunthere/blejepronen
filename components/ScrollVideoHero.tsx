'use client'

import React, { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import SearchBar from './SearchBar'

export default function ScrollVideoHero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [progress, setProgress] = useState(0)

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
      // Lerp currentProgress towards targetProgress
      currentProgress += (targetProgress - currentProgress) * 0.1
      
      setProgress(currentProgress)

      const video = videoRef.current
      if (video && video.duration) {
        // Clamp the time slightly before the very end to prevent flickering
        const targetTime = video.duration * currentProgress
        video.currentTime = Math.min(targetTime, video.duration - 0.05)
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
      className="relative w-full h-[400vh] bg-white"
    >
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden">
        <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 flex flex-col lg:flex-row items-center justify-between gap-12 max-w-[2000px] mx-auto">
          
          {/* Left Text */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center lg:text-left text-center mt-16 lg:mt-0">
            <h1 className="text-[42px] sm:text-[54px] md:text-[68px] font-extrabold tracking-tight text-[#1A1A2E] leading-[1.08]">
              Gjej banesën
              <br />
              <span className="relative inline-block pb-2 lg:pb-3">
                <span className="relative z-10">e duhur në Kosovë</span>
                <span 
                  className="absolute left-0 bottom-0 h-[6px] md:h-[8px] bg-[#C8B882] transition-all duration-75 ease-linear rounded-full"
                  style={{ width: `${35 + progress * 65}%` }}
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
                  className="relative flex-shrink-0 text-[13px] font-medium text-gray-600 px-4 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-[#0D9488] hover:text-white hover:border-[#0D9488] hover:-translate-y-0.5 hover:z-30 transition-all duration-200"
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
                className="inline-flex items-center justify-center min-h-[44px] bg-white border border-gray-200 text-[#1A1A2E] font-semibold px-8 py-3 rounded-full hover:bg-[#0D9488] hover:text-white hover:border-[#0D9488] hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 ease-out cursor-pointer"
              >
                Posto banesën tënde
              </Link>
            </div>
          </div>

          {/* Right Video / App Composition */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 mt-12 lg:mt-0 relative">
            
            {/* Minimalist, borderless video frame with deep elevation */}
            <div className="relative w-full max-w-2xl aspect-video rounded-[2rem] overflow-hidden bg-gray-50 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] ring-1 ring-gray-900/5 z-10">
              <video 
                ref={videoRef}
                src="/hero-video.mp4#t=0.001" 
                className="absolute inset-0 w-full h-full object-cover"
                muted 
                playsInline
                preload="auto"
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0.001;
                  }
                }}
              />
            </div>

            {/* Floating Badge 1: Top Right */}
            <div className="absolute top-0 right-0 lg:-right-4 bg-white/95 backdrop-blur-xl px-5 py-3 rounded-full shadow-[0_20px_40px_-10px_rgba(0,0,0,0.12)] ring-1 ring-gray-900/5 flex items-center gap-3 z-20 transform -translate-y-1/2 hidden sm:flex">
              <div className="flex -space-x-2">
                <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="User"/>
                <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80" alt="User"/>
                <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="User"/>
              </div>
              <p className="text-xs font-bold text-gray-900 tracking-tight">10k+ Përdorues</p>
            </div>

            {/* Floating Badge 2: Bottom Left */}
            <div className="absolute bottom-4 -left-2 sm:-left-6 lg:-left-10 bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] ring-1 ring-gray-900/5 flex items-center gap-4 z-20">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0D9488]/10 text-[#0D9488]">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="pr-4">
                <p className="text-sm font-extrabold text-gray-900 tracking-tight">Prona të Verifikuara</p>
                <p className="text-xs font-medium text-gray-500">100% të Sigurta</p>
              </div>
            </div>
            
          </div>

        </div>
      </div>
    </section>
  )
}
