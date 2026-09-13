'use client'

import Link from 'next/link'
import SearchBar from './SearchBar'
import { ChevronDown } from 'lucide-react'
import { CITIES } from '@/lib/cities'

export default function HomeHero() {
  return (
    <section className="relative isolate flex min-h-[calc(100dvh-57px)] items-center overflow-hidden bg-[#003830]">
      {/* Cinematic backdrop: bright, warm interior under a teal veil —
          lightweight progressive JPEG with a slow drift, no video. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 scale-105 bg-cover bg-center animate-[kenburns_28s_ease-in-out_infinite_alternate]"
        style={{ backgroundImage: "url('/hero-bg.jpg')" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,56,48,0.86)_0%,rgba(0,74,66,0.78)_45%,rgba(0,43,38,0.94)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(75%_60%_at_50%_45%,transparent_0%,rgba(0,43,38,0.55)_100%)]"
      />

      <div className="relative z-10 w-full max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[68px] font-extrabold tracking-tight text-white leading-[1.08] sm:leading-[1.06]">
          <span className="relative mt-1 block">
            <span className="relative inline-block">
              Prona jote e ardhshme është këtu
              <span
                aria-hidden
                                className="absolute left-1/2 -translate-x-1/2 -bottom-2.5 h-[3px] w-[70%] rounded-full bg-[#C8B882]/90"
              />
            </span>
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-[16px] sm:text-[18px] leading-relaxed text-white/85">
          Bli, shit ose jep me qira duke folur direkt me pronarët
        </p>

        <div className="mt-8 sm:mt-10">
          <SearchBar
            placeholder="Kërko qytet, adresë ose fjalë kyçe..."
            buttonText="Kërko"
            className="shadow-[0_24px_64px_-24px_rgba(0,0,0,0.6)]"
          />
        </div>

        <div className="mt-4">
          <Link
            href="/listings"
            className="inline-flex items-center justify-center h-12 w-full sm:w-auto rounded-2xl bg-[#C8B882] px-8 text-[16px] font-semibold text-[#101828] shadow-lg shadow-black/25 transition-colors hover:bg-[#D6C494] cursor-pointer"
          >
            Shiko të gjitha pronat
          </Link>
        </div>

        {/* The markets we serve */}
        <div className="mt-7">
          <p className="text-[15px] font-medium text-white/75">Kërko sipas qytetit:</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {CITIES.map((city) => (
              <Link
                key={city}
                href={`/listings?city=${encodeURIComponent(city)}`}
                className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[15px] font-medium text-white/90 transition-colors hover:border-white hover:bg-white hover:text-[#006459]"
              >
                {city}
              </Link>
            ))}
          </div>
        </div>

        <a
          href="#pronat"
          aria-label="Shko te pronat"
          className="absolute left-1/2 -translate-x-1/2 bottom-5 text-white/60 transition-colors hover:text-white"
        >
          <ChevronDown className="h-6 w-6 animate-bounce" />
        </a>
      </div>
    </section>
  )
}
