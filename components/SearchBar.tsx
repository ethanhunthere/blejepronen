'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface SearchBarProps {
  className?: string
  placeholder?: string
  buttonText?: string
  hoverPlaceholders?: string[]
}

const DEFAULT_HOVER_PLACEHOLDERS = [
  'Kërko banesë...',
  'Kërko agjent...',
  'Kërko kompani...',
  'Kërko adresë...',
]

function SearchBar({
  className = '',
  placeholder = 'Kërko banesë, agjent, kompani, adresë...',
  buttonText = 'Kërko',
  hoverPlaceholders = DEFAULT_HOVER_PLACEHOLDERS,
}: SearchBarProps) {
  const [value, setValue] = useState('')
  const [isHovered, setIsHovered] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [animating, setAnimating] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()

  const displayedPlaceholder = isHovered
    ? hoverPlaceholders[placeholderIndex]
    : placeholder

  const cyclePlaceholder = useCallback(() => {
    setAnimating(true)
    setTimeout(() => {
      setPlaceholderIndex(prev => (prev + 1) % hoverPlaceholders.length)
      setAnimating(false)
    }, 200)
  }, [hoverPlaceholders.length])

  useEffect(() => {
    if (isHovered && !value) {
      intervalRef.current = setInterval(cyclePlaceholder, 2500)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isHovered, value, cyclePlaceholder])

  // Reset index when hover stops
  useEffect(() => {
    if (!isHovered) {
      setPlaceholderIndex(0)
      setAnimating(false)
    }
  }, [isHovered])

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
      className={`bg-white rounded-full border border-[#E5E7EB] shadow-sm hover:shadow-md focus-within:shadow-[0_2px_16px_rgba(0,0,0,0.12)] focus-within:border-[#111827]/30 transition-all duration-200 px-4 py-2 flex items-center gap-3 max-w-2xl mx-auto ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Search className="h-4 w-4 text-[#9CA3AF] flex-shrink-0" />
      <input
        type="text"
        placeholder={displayedPlaceholder}
        aria-label="Kërko banesa"
        className={`flex-1 min-w-0 text-[14px] text-[#111827] outline-none border-none bg-transparent transition-all duration-200 ${
          animating
            ? 'placeholder:opacity-0 placeholder:translate-y-1'
            : 'placeholder:opacity-100 placeholder:translate-y-0'
        }`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        onClick={handleSearch}
        className="flex-shrink-0 bg-[#111827] hover:bg-[#0A0A0A] text-white px-5 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 cursor-pointer"
      >
        {buttonText}
      </button>
    </div>
  )
}

export default React.memo(SearchBar)
