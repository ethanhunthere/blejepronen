'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const CONSENT_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

const AUTH_ROUTES = ['/login', '/register', '/forgot-password']

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
  // Confirmation text for the polite live region below. Kept in state so the
  // announcement survives the banner unmounting.
  const [announcement, setAnnouncement] = useState('')
  const pathname = usePathname()
  const isAuth = AUTH_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  )

  // Reading localStorage here (instead of in the useState initializer) keeps
  // the server and client's first render identical, avoiding a hydration
  // mismatch - this component would otherwise render nothing on the server
  // but a full banner on the client's first pass.
  useEffect(() => {
    if (!window.localStorage.getItem('cookie-consent')) {
      setShow(true)
    }
  }, [])

  const accept = () => {
    try { localStorage.setItem('cookie-consent', 'accepted') } catch {}
    setConsentCookie('accepted')
    notifyConsentChanged()
    setShow(false)
    setAnnouncement('Pëlqimi u ruajt. I pranuat cookies.')
  }

  const reject = () => {
    try { localStorage.setItem('cookie-consent', 'rejected') } catch {}
    setConsentCookie('rejected')
    notifyConsentChanged()
    setShow(false)
    setAnnouncement('Pëlqimi u ruajt. I refuzuat cookies.')
  }

  return (
    <>
      {show && (
        /* A consent banner blocks nothing, so it is a labelled region rather
         * than a dialog: role="dialog" + aria-modal would claim the rest of the
         * page is inert when it is not. For the same reason there is no
         * Escape-to-dismiss — silently closing it would record no choice, so
         * consent has to come from an explicit button. */
        <div
          role="region"
          aria-labelledby="cookie-banner-heading"
          className={
            'fixed bottom-0 left-0 right-0 z-50 border-t shadow-lg p-4 ' +
            (isAuth
              ? // Continue the auth split-screen behind the consent bar so the
                // bottom band matches the page (white left / teal right).
                'border-transparent bg-white lg:bg-[linear-gradient(to_right,#ffffff_0%,#ffffff_55%,#00675B_55%,#00675B_100%)]'
              : 'bg-white border-gray-100')
          }
        >
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
            <p
              id="cookie-banner-heading"
              className="text-sm text-gray-600 text-center sm:text-left"
            >
              Ne përdorim cookies për të përmirësuar përvojën tuaj.{' '}
              <a
                href="/privatesia"
                className="text-[#101828] underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00675B]"
                aria-label="Mëso më shumë për cookies — politika e privatësisë"
              >
                Mëso më shumë
              </a>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={reject}
                className="w-full sm:w-auto h-11 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00675B]"
              >
                Refuzo
              </button>
              <button
                type="button"
                onClick={accept}
                className={
                  'w-full sm:w-auto h-11 inline-flex items-center justify-center rounded-md bg-[#00675B] px-4 text-sm font-medium text-white hover:bg-[#004D43] hover:shadow-lg hover:shadow-[#00675B]/25 hover:-translate-y-[1px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8B882] ' +
                  (isAuth ? ' lg:bg-white lg:text-[#00675B] lg:hover:bg-gray-50' : '')
                }
              >
                Prano
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Always mounted (even while the banner is open) so the container exists
          in the tree before its text changes — a live region inserted together
          with its own message is unreliable across screen readers. */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </>
  )
}

export default React.memo(CookieBanner)
