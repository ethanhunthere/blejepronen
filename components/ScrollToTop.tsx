'use client'

import React, { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Kthehu lart"
      className={`fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-[#006459] text-white shadow-lg hover:bg-[#005048] hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 ease-out flex items-center justify-center cursor-pointer ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}

export default React.memo(ScrollToTop)
