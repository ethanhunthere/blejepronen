'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Trash2, X, AlertTriangle, Loader2, Building2 } from 'lucide-react'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail?: string | null
  userName?: string | null
  isCompany?: boolean
  avatarUrl?: string | null
  onDeleteConfirmed: () => Promise<boolean | void>
}

const CONFIRM_KEYWORD = 'FSHIJ'

export default function DeleteAccountModal({
  isOpen,
  onClose,
  userEmail,
  userName,
  isCompany = false,
  avatarUrl,
  onDeleteConfirmed,
}: DeleteAccountModalProps) {
  const [confirmInput, setConfirmInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('')
      setErrorMessage('')
      setIsDeleting(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDeleting, onClose])

  const isConfirmed = confirmInput.trim().toUpperCase() === CONFIRM_KEYWORD

  const handleConfirm = async () => {
    if (!isConfirmed || isDeleting) return
    setErrorMessage('')
    setIsDeleting(true)

    try {
      const result = await onDeleteConfirmed()
      if (result === false) {
        setErrorMessage('Ndodhi një gabim gjatë fshirjes së llogarisë. Ju lutem provoni përsëri.')
        setIsDeleting(false)
        return
      }

      // Cleanup client storage and cookies
      try {
        localStorage.removeItem('blejepronen_cached_user')
        localStorage.removeItem('blejepronen_cached_navbar_profile')
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('sb-')) localStorage.removeItem(key)
        })
        document.documentElement.setAttribute('data-auth', 'logged-out')
      } catch {}

      if (typeof window !== 'undefined') {
        window.location.replace('/')
      }
    } catch (err) {
      console.error('Delete account modal error:', err)
      setErrorMessage('Ndodhi një gabim gjatë fshirjes së llogarisë.')
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!isDeleting) onClose()
        }}
      />

      <div
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 text-center flex flex-col items-center pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-7 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          aria-label="Mbyll dritaren"
          className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-4">
          <Trash2 className="h-5 w-5" />
        </div>

        <h3
          id="delete-account-title"
          className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
        >
          Dëshironi të fshini llogarinë?
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-[320px]">
          Ky veprim është përfundimtar. Të gjitha pronat tuaja, bisedat dhe të dhënat e profilit do të fshihen.
        </p>

        {errorMessage && (
          <div className="mt-3 w-full p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 text-center font-medium">
            {errorMessage}
          </div>
        )}

        {(userEmail || userName) && (
          <div className="mt-4 w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-left">
            <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 bg-red-50 text-red-600 font-bold text-xs flex items-center justify-center border border-red-200">
              <Image src={avatarUrl || '/avatars/avatar-1.png'} alt="" fill sizes="36px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                {userName && (
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{userName}</p>
                )}
                {isCompany && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-[#00675B]/10 text-[#00675B] rounded-full px-2 py-0.5 shrink-0">
                    <Building2 className="h-2.5 w-2.5" /> Kompani
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>
        )}

        <div className="mt-4 w-full p-3 rounded-xl bg-red-50/70 border border-red-200 text-left text-xs text-red-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <span>
            Për të konfirmuar, shkruani <strong>{CONFIRM_KEYWORD}</strong> më poshtë:
          </span>
        </div>

        <div className="mt-3 w-full">
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            disabled={isDeleting}
            placeholder={`Shkruani ${CONFIRM_KEYWORD}`}
            className="w-full h-11 px-3 text-center tracking-widest font-bold uppercase rounded-xl border border-slate-300 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 text-base sm:text-sm transition-all disabled:opacity-50"
          />
        </div>

        <div className="mt-5 w-full flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
          >
            Anulo
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isConfirmed || isDeleting}
            className="flex-1 min-h-[44px] rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-sm active:scale-95 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Fshij Llogarinë</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
