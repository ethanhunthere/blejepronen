'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface SearchBarProps {
  className?: string
  placeholder?: string
  buttonText?: string
}

export default function SearchBar({
  className = '',
  placeholder = 'Kërko banesa...',
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
    <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-3 flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto border border-white/20 ${className}`}>
      <div className="flex-1 flex items-center px-3 gap-2">
        <Search className="h-5 w-5 text-white flex-shrink-0" />
        <input
          type="text"
          placeholder={placeholder}
          aria-label="Kërko banesa"
          className="w-full text-white placeholder:text-white/50 outline-none text-sm bg-transparent"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <button
        type="button"
        onClick={handleSearch}
        className="w-full sm:w-auto bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-8 h-11 rounded-xl font-medium border border-white/30 transition-colors"
      >
        {buttonText}
      </button>
    </div>
  )
}
