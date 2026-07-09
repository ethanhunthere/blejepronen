'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'

export default function AnalyticsWrapper() {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const readConsent = () => localStorage.getItem('cookie-consent') === 'accepted'
    setAllowed(readConsent())

    const handler = () => setAllowed(readConsent())
    window.addEventListener('cookie-consent-changed', handler)
    return () => window.removeEventListener('cookie-consent-changed', handler)
  }, [])

  if (!allowed) return null
  return <Analytics />
}
