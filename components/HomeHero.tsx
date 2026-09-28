'use client'

import Link from 'next/link'
import SearchBar from './SearchBar'
import { MAJOR_CITIES } from '@/lib/cities'

export default function HomeHero() {
  return (
    <section id="home-hero" className="relative isolate flex min-h-[calc(100dvh-57px)] items-center overflow-hidden bg-[#002D26]">
      {/* Cinematic architectural backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-cover bg-center brightness-[0.88]"
        style={{ backgroundImage: "url('/hero-bg.jpg')" }}
      />
      {/* Physically accurate light occlusion layer */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-[#002721]/80 via-[#002D26]/85 to-[#00201B]/95"
      />

      <div className="relative z-10 w-full max-w-[920px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[66px] font-extrabold tracking-tight text-white leading-[1.1] sm:leading-[1.08]">
          Prona jote e ardhshme është këtu
        </h1>

        <p className="mx-auto mt-4 sm:mt-5 max-w-xl text-[16px] sm:text-[18px] leading-relaxed text-slate-200/90 font-normal">
          Bli, shit ose merr me qira duke komunikuar direkt me pronarët
        </p>

        {/* Central Search Interaction */}
        <div className="mt-8 sm:mt-10">
          <SearchBar
            placeholder="Kërko sipas qytetit, lagjes ose fjalëve kyçe..."
            buttonText="Kërko"
            className="shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)]"
          />
        </div>

        {/* City Filter Hub */}
        <div className="mt-8 sm:mt-10">
          <p className="text-xs sm:text-sm font-medium tracking-wide text-slate-300/80 uppercase">
            Qytetet kryesore
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {MAJOR_CITIES.map((city) => (
              <Link
                key={city}
                href={`/listings?city=${encodeURIComponent(city)}`}
                className="rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white/95 transition-all duration-150 hover:bg-white/20 hover:border-white/35 active:scale-95"
              >
                {city}
              </Link>
            ))}
            <Link
              href="/listings"
              className="rounded-full border border-white/25 bg-white/15 backdrop-blur-md px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white transition-all duration-150 hover:bg-white/25 hover:border-white/40 active:scale-95"
            >
              Të gjitha (38) →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
