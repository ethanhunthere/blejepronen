'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'

export default function AnalyticsWrapper() {
  const [allowed, setAllowed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('cookie-consent') === 'accepted'
  })

  useEffect(() => {
    const readConsent = () => localStorage.getItem('cookie-consent') === 'accepted'
    const handler = () => setAllowed(readConsent())
    window.addEventListener('cookie-consent-changed', handler)
    return () => window.removeEventListener('cookie-consent-changed', handler)
  }, [])

  if (!allowed) return null
  return <Analytics />
}
