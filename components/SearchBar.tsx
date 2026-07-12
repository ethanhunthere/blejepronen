'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface SearchBarProps {
  className?: string
  placeholder?: string
  buttonText?: string
}

function SearchBar({
  className = '',
  placeholder = 'Kërko banesë, agjent, kompani, adresë...',
  buttonText = 'Kërko',
}: SearchBarProps) {
  const [value, setValue] = useState('')
  const router = useRouter()

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
      className={`bg-white rounded-full border border-[#E5E7EB] shadow-sm hover:shadow-md focus-within:shadow-[0_2px_16px_rgba(0,0,0,0.12)] focus-within:border-[#1B4FFF]/30 transition-all duration-200 px-4 py-2 flex items-center gap-3 max-w-2xl mx-auto ${className}`}
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
        className="flex-shrink-0 bg-[#1B4FFF] hover:bg-[#1440E8] text-white px-5 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 cursor-pointer"
      >
        {buttonText}
      </button>
    </div>
  )
}

export default React.memo(SearchBar)
