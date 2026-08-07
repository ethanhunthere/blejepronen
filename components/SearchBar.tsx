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

const DEFAULT_HOVER_WORDS = ['Banesë', 'Agjent', 'Kompani', 'Adresë']

type TypePhase = 'typing' | 'pausing' | 'deleting'

function SearchBar({
  className = '',
  placeholder = 'Kërko banesë, agjent, kompani, adresë...',
  buttonText = 'Kërko Banesë',
  hoverWords = DEFAULT_HOVER_WORDS,
}: SearchBarProps) {
  const [value, setValue] = useState('')
  const [isHovered, setIsHovered] = useState(false)
  const [typedWord, setTypedWord] = useState('')
  const wordIndexRef = useRef(0)
  const charIndexRef = useRef(0)
  const phaseRef = useRef<TypePhase>('typing')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  const displayedButtonText = isHovered
    ? `Kërko ${typedWord}`
    : buttonText

  const runTypewriter = useCallback(() => {
    const word = hoverWords[wordIndexRef.current]
    const phase = phaseRef.current

    if (phase === 'typing') {
      if (charIndexRef.current < word.length) {
        charIndexRef.current++
        setTypedWord(word.slice(0, charIndexRef.current))
        timerRef.current = setTimeout(runTypewriter, 80)
      } else {
        // Finished typing, pause before deleting
        phaseRef.current = 'pausing'
        timerRef.current = setTimeout(runTypewriter, 1800)
      }
    } else if (phase === 'pausing') {
      phaseRef.current = 'deleting'
      timerRef.current = setTimeout(runTypewriter, 50)
    } else if (phase === 'deleting') {
      if (charIndexRef.current > 0) {
        charIndexRef.current--
        setTypedWord(word.slice(0, charIndexRef.current))
        timerRef.current = setTimeout(runTypewriter, 40)
      } else {
        // Move to next word
        wordIndexRef.current = (wordIndexRef.current + 1) % hoverWords.length
        phaseRef.current = 'typing'
        charIndexRef.current = 0
        timerRef.current = setTimeout(runTypewriter, 150)
      }
    }
  }, [hoverWords])

  useEffect(() => {
    if (isHovered) {
      wordIndexRef.current = 0
      charIndexRef.current = 0
      phaseRef.current = 'typing'
      setTypedWord('')
      timerRef.current = setTimeout(runTypewriter, 300)
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setTypedWord('')
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isHovered, runTypewriter])

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
      className={`bg-white rounded-full border border-[#E5E7EB] shadow-sm hover:shadow-md focus-within:shadow-[0_2px_16px_rgba(0,0,0,0.12)] focus-within:border-[#006459]/30 transition-all duration-200 px-4 py-2 flex items-center gap-3 max-w-2xl mx-auto ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Search className="h-4 w-4 text-[#9CA3AF] flex-shrink-0" />
      <input
        type="text"
        placeholder={placeholder}
        aria-label="Kërko banesa"
        className="flex-1 min-w-0 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none border-none bg-transparent"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        onClick={handleSearch}
        className="flex-shrink-0 min-h-[44px] bg-[#006459] text-white px-5 py-2 rounded-full text-[13px] font-semibold hover:bg-[#005048] hover:shadow-lg hover:shadow-[#006459]/25 hover:-translate-y-[1px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-out cursor-pointer whitespace-nowrap"
      >
        <span>{displayedButtonText}</span>
        {isHovered && (
          <span className="inline-block w-[1px] h-[14px] bg-white/60 ml-0.5 align-middle animate-pulse" />
        )}
      </button>
    </div>
  )
}

export default React.memo(SearchBar)
