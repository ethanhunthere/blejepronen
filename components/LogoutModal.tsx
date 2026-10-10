'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { LogOut, X, Loader2 } from 'lucide-react'

interface LogoutModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail?: string | null
  userName?: string | null
  avatarUrl?: string | null
  onLogoutConfirmed: () => Promise<void> | void
  redirectTo?: string
}

export default function LogoutModal({
  isOpen,
  onClose,
  userEmail,
  userName,
  avatarUrl,
  onLogoutConfirmed,
  redirectTo,
}: LogoutModalProps) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, loading, onClose])

  const [failed, setFailed] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    setFailed(false)
    try {
      try {
        localStorage.removeItem('blejepronen_cached_user')
        localStorage.removeItem('blejepronen_cached_navbar_profile')
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('sb-')) localStorage.removeItem(key)
        })
        document.documentElement.setAttribute('data-auth', 'logged-out')
      } catch {}

      await onLogoutConfirmed()
    } catch (err) {
      console.error('Logout error:', err)
      // A failed logout must NOT navigate or claim success.
      setFailed(true)
      setLoading(false)
      return
    }
    if (typeof window !== 'undefined') {
      const dest = redirectTo || '/'
      if (window.location.pathname === dest) {
        window.location.reload()
      } else {
        window.location.replace(dest)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!loading) onClose()
        }}
      />

      <div
        className="relative w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 text-center flex flex-col items-center pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-7 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Mbyll dritaren"
          className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 mb-4">
          <LogOut className="h-5 w-5" />
        </div>

        <h3
          id="logout-dialog-title"
          className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
        >
          Dëshironi të dilni nga llogaria?
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-[280px]">
          Mund të kyçeni përsëri në çdo kohë me kredencialet tuaja.
        </p>

        {(userEmail || userName) && (
          <div className="mt-4 w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-left">
            <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 bg-[#00675B]/10 text-[#00675B] font-bold text-xs flex items-center justify-center border border-slate-200">
              <Image src={avatarUrl || '/avatars/avatar-1.png'} alt="" fill sizes="36px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              {userName && (
                <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{userName}</p>
              )}
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>
        )}

        <div className="mt-6 w-full flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
          >
            Anulo
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 min-h-[44px] rounded-xl bg-[#00675B] hover:bg-[#004D43] text-white font-semibold text-sm shadow-sm active:scale-95 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {failed && (
          <p className="text-xs font-semibold text-red-600 mb-2" role="alert">
            Dalja dështoi. Provoni përsëri.
          </p>
        )}
        {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                <span>Dil</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
