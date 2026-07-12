'use client'

import React, { useState, useEffect } from 'react'

const CONSENT_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

function setConsentCookie(value: string) {
  try {
    document.cookie = `cookie-consent=${value}; path=/; max-age=${CONSENT_MAX_AGE}; SameSite=Lax`
  } catch {
    // ignore environments without document
  }
}

function notifyConsentChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cookie-consent-changed'))
  }
}

function CookieBanner() {
  const [show, setShow] = useState(false)

  // Reading localStorage here (instead of in the useState initializer) keeps
  // the server and client's first render identical, avoiding a hydration
  // mismatch — this component would otherwise render nothing on the server
  // but a full banner on the client's first pass.
  useEffect(() => {
    if (!window.localStorage.getItem('cookie-consent')) {
      setShow(true)
    }
  }, [])

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setConsentCookie('accepted')
    notifyConsentChanged()
    setShow(false)
  }

  const reject = () => {
    localStorage.setItem('cookie-consent', 'rejected')
    setConsentCookie('rejected')
    notifyConsentChanged()
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg p-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-600 text-center sm:text-left">
          Ne përdorim cookies për të përmirësuar përvojën tuaj.{' '}
          <a href="/privatesia" className="text-[#1B4FFF] underline">Mëso më shumë</a>
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={reject}
            className="w-full sm:w-auto h-11 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Refuzo
          </button>
          <button
            type="button"
            onClick={accept}
            className="w-full sm:w-auto h-11 inline-flex items-center justify-center rounded-md bg-[#1B4FFF] px-4 text-sm font-medium text-white hover:bg-[#1640CC] transition-colors"
          >
            Prano
          </button>
        </div>
      </div>
    </div>
  )
}

export default React.memo(CookieBanner)
