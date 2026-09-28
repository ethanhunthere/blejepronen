'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Command } from 'lucide-react'
import OmniSearchModal from './OmniSearchModal'

interface SearchBarProps {
  className?: string
  placeholder?: string
  buttonText?: string
}

function SearchBar({
  className = '',
  placeholder = 'Kërko pronë, qytet, lagje ose agjenci...',
  buttonText = 'Kërko',
}: SearchBarProps) {
  const [value, setValue] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()

  const handleOpenSearch = (initialVal?: string) => {
    setValue(initialVal || value)
    setIsModalOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = value.trim()
      if (trimmed) {
        router.push(`/listings?search=${encodeURIComponent(trimmed)}`)
      } else {
        setIsModalOpen(true)
      }
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="Hap kërkimin"
        className={`relative bg-white rounded-full border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.09)] hover:border-slate-300 focus-within:shadow-[0_4px_20px_rgba(0,103,91,0.12)] focus-within:border-[#00675B]/40 transition-all duration-200 px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 max-w-2xl mx-auto cursor-pointer select-none ${className}`}
        onClick={() => handleOpenSearch(value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleOpenSearch(value)
          }
        }}
      >
        <Search className="h-4 w-4 text-[#00675B] flex-shrink-0 ml-1.5" />
        <input
          type="text"
          placeholder={placeholder}
          aria-label="Kërko prona, qytet, lagje ose agjenci"
          className="flex-1 min-w-0 text-[15px] sm:text-[16px] text-slate-900 placeholder:text-slate-400 outline-none border-none bg-transparent cursor-pointer"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setIsModalOpen(true)
          }}
          onFocus={() => handleOpenSearch(value)}
          onKeyDown={handleKeyDown}
          readOnly
        />

        <div className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100/80 border border-slate-200/70 px-2 py-1 rounded-md">
          <Command className="h-3 w-3" />
          <span>K</span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleOpenSearch(value)
          }}
          className="flex-shrink-0 min-h-[42px] bg-[#00675B] text-white px-5 sm:px-6 py-2 rounded-full text-sm sm:text-[15px] font-medium tracking-tight hover:bg-[#004D43] transition-colors duration-150 cursor-pointer flex items-center justify-center shadow-sm"
        >
          {buttonText}
        </button>
      </div>

      <OmniSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialQuery={value}
      />
    </>
  )
}

export default React.memo(SearchBar)
