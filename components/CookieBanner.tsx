'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg p-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-600 text-center sm:text-left">
          Ne përdorim cookies për të përmirësuar përvojën tuaj.{' '}
          <a href="/privatesia" className="text-[#1B4FFF] underline">Mëso më shumë</a>
        </p>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => setShow(false)}>
            Refuzo
          </Button>
          <Button size="sm" className="bg-[#1B4FFF] hover:bg-[#1640CC] text-white" onClick={accept}>
            Prano
          </Button>
        </div>
      </div>
    </div>
  )
}
