'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface SearchBarProps {
  className?: string
  placeholder?: string
  buttonText?: string
}

const TRANSACTION_TABS = [
  { key: '', label: 'Të gjitha' },
  { key: 'shitje', label: 'Bli' },
  { key: 'qira', label: 'Qira' },
] as const

type TransactionType = (typeof TRANSACTION_TABS)[number]['key']

function SearchBar({
  className = '',
  placeholder = 'Kërko pronë, qytet, lagje ose agjenci...',
  buttonText = 'Kërko',
}: SearchBarProps) {
  const [value, setValue] = useState('')
  const [typeFilter, setTypeFilter] = useState<TransactionType>('')
  const router = useRouter()

  // URL payload consumed by /listings: search, type (shitje|qira)
  const buildListingsHref = () => {
    const trimmed = value.trim()
    const params: string[] = []
    if (trimmed) params.push(`search=${encodeURIComponent(trimmed)}`)
    if (typeFilter) params.push(`type=${encodeURIComponent(typeFilter)}`)
    return params.length > 0 ? `/listings?${params.join('&')}` : '/listings'
  }

  const runSearch = () => {
    router.push(buildListingsHref())
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    runSearch()
  }

  return (
    <form
      role="search"
      aria-label="Kërkim i pronave"
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        className={`relative bg-white rounded-full border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.09)] hover:border-slate-300 focus-within:shadow-[0_4px_20px_rgba(0,103,91,0.12)] focus-within:border-[#00675B]/40 transition-all duration-200 px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 ${className}`}
      >
        <Search className="h-4 w-4 text-[#00675B] flex-shrink-0 ml-1.5" />
        <input
          type="text"
          name="q"
          placeholder={placeholder}
          aria-label="Kërko prona, qytet, lagje ose agjenci"
          className="flex-1 min-w-0 text-[15px] sm:text-[16px] text-slate-900 placeholder:text-slate-400 outline-none border-none bg-transparent"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              runSearch()
            }
          }}
        />

        <button
          type="submit"
          className="flex-shrink-0 min-h-[42px] bg-[#00675B] text-white px-5 sm:px-6 py-2 rounded-full text-sm sm:text-[15px] font-medium tracking-tight hover:bg-[#004D43] transition-colors duration-150 cursor-pointer flex items-center justify-center shadow-sm"
        >
          {buttonText}
        </button>
      </div>

      {/* Transaction tabs (Bli / Qira) */}
      <div className="mt-2.5 flex items-center justify-center">
        <div
          role="group"
          aria-label="Lloji i transaksionit"
          className="flex items-center gap-1 rounded-full bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06)] p-1"
        >
          {TRANSACTION_TABS.map((tab) => (
            <button
              key={tab.key || 'all'}
              type="button"
              aria-pressed={typeFilter === tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`min-h-[44px] sm:min-h-0 px-4 sm:px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors duration-150 cursor-pointer ${
                typeFilter === tab.key
                  ? 'bg-[#00675B] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  )
}

export default React.memo(SearchBar)
