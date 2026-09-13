'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface SearchBarProps {
  className?: string
  placeholder?: string
  buttonText?: string
  hoverWords?: string[]
}

const DEFAULT_HOVER_WORDS = ['Pronë', 'Agjent', 'Kompani', 'Adresë']

type TypePhase = 'typing' | 'pausing' | 'deleting'

function SearchBar({
  className = '',
  placeholder = 'Kërko pronë, agjent, kompani, adresë...',
  hoverWords = DEFAULT_HOVER_WORDS,
}: SearchBarProps) {
  const [value, setValue] = useState('')
  const [typedWord, setTypedWord] = useState('Pronë')
  const wordIndexRef = useRef(0)
  const charIndexRef = useRef(hoverWords[0]?.length || 5)
  const phaseRef = useRef<TypePhase>('pausing')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runTypewriterRef = useRef<() => void>(() => {})
  const router = useRouter()

  const runTypewriter = useCallback(() => {
    const word = hoverWords[wordIndexRef.current] || 'Pronë'
    const phase = phaseRef.current

    if (phase === 'typing') {
      if (charIndexRef.current < word.length) {
        charIndexRef.current++
        setTypedWord(word.slice(0, charIndexRef.current))
        timerRef.current = setTimeout(() => runTypewriterRef.current(), 90)
      } else {
        phaseRef.current = 'pausing'
        timerRef.current = setTimeout(() => runTypewriterRef.current(), 1800)
      }
    } else if (phase === 'pausing') {
      phaseRef.current = 'deleting'
      timerRef.current = setTimeout(() => runTypewriterRef.current(), 50)
    } else if (phase === 'deleting') {
      if (charIndexRef.current > 0) {
        charIndexRef.current--
        setTypedWord(word.slice(0, charIndexRef.current))
        timerRef.current = setTimeout(() => runTypewriterRef.current(), 45)
      } else {
        wordIndexRef.current = (wordIndexRef.current + 1) % hoverWords.length
        phaseRef.current = 'typing'
        charIndexRef.current = 0
        timerRef.current = setTimeout(() => runTypewriterRef.current(), 200)
      }
    }
  }, [hoverWords])

  useEffect(() => {
    runTypewriterRef.current = runTypewriter
  }, [runTypewriter])

  useEffect(() => {
    // Start with the first word displayed, then begin lifecycle after brief initial pause
    timerRef.current = setTimeout(() => runTypewriterRef.current(), 1500)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const handleSearch = () => {
    const trimmed = value.trim()
    if (trimmed) {
      router.push(`/listings?search=${encodeURIComponent(trimmed)}`)
    } else {
      router.push('/listings')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div
      className={`bg-white rounded-full border border-[#E5E7EB] shadow-sm hover:shadow-md focus-within:shadow-[0_2px_16px_rgba(0,0,0,0.12)] focus-within:border-[#006459]/30 transition-all duration-200 px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 max-w-2xl mx-auto ${className}`}
    >
      <Search className="h-4 w-4 text-[#9CA3AF] flex-shrink-0 ml-1" />
      <input
        type="text"
        placeholder={placeholder}
        aria-label="Kërko prona"
        className="flex-1 min-w-0 text-[16px] text-[#101828] placeholder:text-[#6B7280] outline-none border-none bg-transparent"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          try { router.prefetch('/listings') } catch {}
        }}
      />
      <button
        type="button"
        onClick={handleSearch}
        onMouseEnter={() => {
          try { router.prefetch('/listings') } catch {}
        }}
        className="flex-shrink-0 min-h-[44px] min-w-[115px] sm:min-w-[145px] bg-[#006459] text-white px-3 sm:px-5 py-2 rounded-full text-xs sm:text-[15px] font-semibold hover:bg-[#005048] hover:shadow-lg hover:shadow-[#006459]/25 hover:-translate-y-[1px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-out cursor-pointer whitespace-nowrap flex items-center justify-center"
      >
        <span>Kërko {typedWord || '\u00A0'}</span>
        <span className="inline-block w-[1.5px] h-[13px] sm:h-[15px] bg-white/75 ml-1 align-middle animate-pulse" />
      </button>
    </div>
  )
}

export default React.memo(SearchBar)
