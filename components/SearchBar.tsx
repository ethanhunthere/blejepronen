'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SearchBar() {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="bg-white rounded-2xl p-3 flex flex-col sm:flex-row gap-3 shadow-2xl max-w-2xl mx-auto">
      <div className="flex-1 flex items-center px-3 gap-2">
        <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Kërko banesa..."
          className="w-full text-gray-700 outline-none text-sm bg-transparent"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <Button
        onClick={handleSearch}
        className="w-full sm:w-auto bg-[#1B4FFF] hover:bg-[#1640CC] text-white px-8 h-11 rounded-xl"
      >
        Kërko
      </Button>
    </div>
  )
}
