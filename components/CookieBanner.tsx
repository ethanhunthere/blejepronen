'use client'
import { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem('cookie-consent')
    if (!accepted) setShow(true)
  }, [])

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0F2E] border-t border-white/10 shadow-lg p-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-300 text-center sm:text-left">
          Ne përdorim cookies për të përmirësuar përvojën tuaj.{' '}
          <a href="/privatesia" className="text-[#4d7cff] underline">Mëso më shumë</a>
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShow(false)}
            className="inline-flex items-center justify-center rounded-md border border-white/20 bg-transparent px-3 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            Refuzo
          </button>
          <button
            type="button"
            onClick={accept}
            className="inline-flex items-center justify-center rounded-md bg-[#1B4FFF] px-3 py-2 text-sm font-medium text-white hover:bg-[#1640CC] transition-colors"
          >
            Prano
          </button>
        </div>
      </div>
    </div>
  )
}
