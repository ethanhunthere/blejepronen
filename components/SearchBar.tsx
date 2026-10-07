'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Command, MapPin, ChevronDown } from 'lucide-react'
import OmniSearchModal from './OmniSearchModal'
import { CITIES } from '@/lib/cities'

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

const QUERY_DEBOUNCE_MS = 300

function SearchBar({
  className = '',
  placeholder = 'Kërko pronë, qytet, lagje ose agjenci...',
  buttonText = 'Kërko',
}: SearchBarProps) {
  const [value, setValue] = useState('')
  // 300ms debounced copy of the query — keystroke bursts coalesce before the
  // value is handed to the OmniSearch console (its own fetch is debounced +
  // abortable), so rapid typing can never trigger rapid search requests.
  const [debouncedValue, setDebouncedValue] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<TransactionType>('')
  const [cityFilter, setCityFilter] = useState('')
  const [cityOpen, setCityOpen] = useState(false)
  const router = useRouter()
  const cityRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), QUERY_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [value])

  // Close the custom city selector on outside click or Escape
  useEffect(() => {
    if (!cityOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCityOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [cityOpen])

  const handleOpenSearch = useCallback(
    (initialVal?: string) => {
      const next = initialVal || value
      // Flush the debounce so the console always opens with the live query
      setValue(next)
      setDebouncedValue(next)
      setIsModalOpen(true)
    },
    [value]
  )

  // URL payload consumed by /listings: search, type (shitje|qira), city
  const buildListingsHref = () => {
    const trimmed = value.trim()
    const params: string[] = []
    if (trimmed) params.push(`search=${encodeURIComponent(trimmed)}`)
    if (typeFilter) params.push(`type=${encodeURIComponent(typeFilter)}`)
    if (cityFilter) params.push(`city=${encodeURIComponent(cityFilter)}`)
    return params.length > 0 ? `/listings?${params.join('&')}` : '/listings'
  }

  const runSearch = () => {
    if (!value.trim() && !typeFilter && !cityFilter) {
      handleOpenSearch(value)
      return
    }
    router.push(buildListingsHref())
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    runSearch()
  }

  return (
    <>
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
            type="button"
            onClick={() => handleOpenSearch(value)}
            aria-label="Hap dritaren e kërkimit"
            className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100/80 border border-slate-200/70 px-2 py-1 rounded-md hover:text-slate-600 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <Command className="h-3 w-3" />
            <span>K</span>
          </button>

          <button
            type="submit"
            className="flex-shrink-0 min-h-[42px] bg-[#00675B] text-white px-5 sm:px-6 py-2 rounded-full text-sm sm:text-[15px] font-medium tracking-tight hover:bg-[#004D43] transition-colors duration-150 cursor-pointer flex items-center justify-center shadow-sm"
          >
            {buttonText}
          </button>
        </div>

        {/* Transaction tabs (Bli / Qira) + Kosovo municipality selector */}
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
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

          <div ref={cityRef} className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={cityOpen}
              onClick={() => setCityOpen((open) => !open)}
              className="flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-4 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06)] text-[13px] font-semibold text-slate-700 hover:border-slate-300 transition-colors duration-150 cursor-pointer"
            >
              <MapPin className="h-3.5 w-3.5 text-[#00675B] flex-shrink-0" />
              <span className="max-w-[8.5rem] truncate">{cityFilter || 'Të gjitha qytetet'}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform ${cityOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {cityOpen && (
              <ul
                role="listbox"
                aria-label="Qytetet e Kosovës"
                className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 top-full mt-2 z-30 w-56 max-h-64 overflow-y-auto overscroll-contain rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5"
              >
                <li>
                  <button
                    type="button"
                    aria-pressed={cityFilter === ''}
                    onClick={() => {
                      setCityFilter('')
                      setCityOpen(false)
                    }}
                    className={`w-full text-left px-3 min-h-[40px] rounded-xl text-[13px] font-medium transition-colors cursor-pointer ${
                      cityFilter === ''
                        ? 'bg-[#00675B] text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Të gjitha qytetet
                  </button>
                </li>
                {CITIES.map((city) => (
                  <li key={city}>
                    <button
                      type="button"
                      aria-pressed={cityFilter === city}
                      onClick={() => {
                        setCityFilter(city)
                        setCityOpen(false)
                      }}
                      className={`w-full text-left px-3 min-h-[40px] rounded-xl text-[13px] font-medium transition-colors cursor-pointer ${
                        cityFilter === city
                          ? 'bg-[#00675B] text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {city}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </form>

      <OmniSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialQuery={debouncedValue}
      />
    </>
  )
}

export default React.memo(SearchBar)
