'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Trash2, X, AlertTriangle, CheckCircle2, Loader2, ShieldAlert, Building2 } from 'lucide-react'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail?: string | null
  userName?: string | null
  isCompany?: boolean
  avatarUrl?: string | null
  onDeleteConfirmed: () => Promise<boolean | void>
}

type DeletePhase = 'confirm' | 'deleting' | 'done'

export default function DeleteAccountModal({
  isOpen,
  onClose,
  userEmail,
  userName,
  isCompany = false,
  avatarUrl,
  onDeleteConfirmed,
}: DeleteAccountModalProps) {
  const [phase, setPhase] = useState<DeletePhase>('confirm')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset phase when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setPhase('confirm')
      setProgress(0)
      setErrorMessage('')
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isOpen])

  // ESC key closes only during confirmation phase
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase === 'confirm') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, phase, onClose])

  const handleConfirm = useCallback(async () => {
    setErrorMessage('')
    setPhase('deleting')
    setProgress(15)

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearInterval(interval)
          return 85
        }
        return prev + Math.floor(Math.random() * 15 + 8)
      })
    }, 120)
    timerRef.current = interval

    try {
      const result = await onDeleteConfirmed()
      if (result === false) {
        if (timerRef.current) clearInterval(timerRef.current)
        setPhase('confirm')
        setErrorMessage('Ndodhi një gabim gjatë fshirjes së llogarisë. Ju lutem provoni përsëri.')
        return
      }
    } catch (err) {
      console.error('Delete account modal error:', err)
      if (timerRef.current) clearInterval(timerRef.current)
      setPhase('confirm')
      setErrorMessage('Ndodhi një gabim gjatë fshirjes së llogarisë.')
      return
    }

    if (timerRef.current) clearInterval(timerRef.current)
    setProgress(100)
    setPhase('done')

    // Smooth pause so the user sees the confirmation before clean redirect
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.replace('/')
      }
    }, 600)
  }, [onDeleteConfirmed])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#120303]/75 backdrop-blur-xl animate-fade-in transition-all duration-300"
    >
      {/* Backdrop click to cancel */}
      <div
        className="absolute inset-0"
        onClick={() => {
          if (phase === 'confirm') onClose()
        }}
      />

      {/* Center Modal Card */}
      <div className="relative w-full max-w-[400px] rounded-3xl bg-white/95 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_32px_80px_-16px_rgba(40,5,5,0.5)] border border-red-100/80 text-center flex flex-col items-center overflow-hidden transition-all duration-300">
        {/* Ambient top red glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-600/15 rounded-full blur-2xl pointer-events-none" />

        {/* Phase 1: Confirmation Dialog */}
        {phase === 'confirm' && (
          <>
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Mbyll dritaren"
              className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Trash icon badge with soft glow */}
            <div className="relative w-14 h-14 rounded-2xl bg-red-50 border border-red-200/80 flex items-center justify-center text-red-600 shadow-sm mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>

            <h3
              id="delete-account-title"
              className="text-xl font-bold text-[#101828] tracking-tight leading-snug"
            >
              Dëshironi të fshini llogarinë?
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1.5 max-w-[310px] leading-relaxed">
              Ky veprim është përfundimtar dhe nuk mund të kthehet më pas.
            </p>

            {errorMessage && (
              <div className="mt-3 w-full p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 text-center font-medium">
                {errorMessage}
              </div>
            )}

            {/* User Account Micro-Card */}
            {(userEmail || userName) && (
              <div className="mt-4 w-full flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100 text-left">
                <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-red-500/10 text-red-600 font-bold text-sm flex items-center justify-center border border-gray-200">
                  <Image src={avatarUrl || '/avatars/avatar-1.png'} alt="" fill sizes="40px" className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    {userName && (
                      <p className="text-sm font-semibold text-[#101828] truncate">{userName}</p>
                    )}
                    {isCompany && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-[#006459]/10 text-[#006459] rounded-full px-2 py-0.5 shrink-0">
                        <Building2 className="h-2.5 w-2.5" /> Kompani
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{userEmail}</p>
                </div>
              </div>
            )}

            {/* Warning Callout */}
            <div className="mt-4 w-full p-3.5 rounded-2xl bg-red-50/90 border border-red-200 text-left text-xs text-red-800 leading-relaxed flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>
                Të gjitha pronat tuaja të listuara, bisedat dhe të dhënat e profilit do të fshihen menjëherë nga platforma.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 w-full flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[46px] rounded-xl bg-gray-100 hover:bg-gray-200 text-[#101828] font-semibold text-sm transition-all duration-200 cursor-pointer active:scale-95"
              >
                Anulo
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 min-h-[46px] rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md shadow-red-600/25 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>Po, fshij</span>
              </button>
            </div>
          </>
        )}

        {/* Phase 2: Deleting Animation */}
        {phase === 'deleting' && (
          <div className="py-2 flex flex-col items-center">
            {/* Animated Emblem with Orbital Ring */}
            <div className="relative mb-5 flex items-center justify-center">
              <div className="absolute -inset-3 rounded-3xl border-2 border-dashed border-red-500/40 animate-[spin_8s_linear_infinite]" />
              <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-xl shadow-red-600/35 ring-8 ring-red-500/15">
                <Trash2 className="h-9 w-9 text-white animate-pulse" />
              </div>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-[#101828] tracking-tight">
              Duke fshirë llogarinë...
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-[290px] leading-relaxed">
              Të gjitha pronat, mesazhet dhe të dhënat po fshihen nga sistemi.
            </p>

            {/* Smooth Progress Bar */}
            <div className="w-52 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-6">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Security Pill */}
            <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-700 text-[11px] font-medium">
              <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
              <span>Fshirje e plotë dhe e sigurt e të dhënave</span>
            </div>
          </div>
        )}

        {/* Phase 3: Done Transition */}
        {phase === 'done' && (
          <div className="py-2 flex flex-col items-center animate-fade-in">
            <div className="w-18 h-18 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 mb-5 ring-8 ring-emerald-500/15 scale-100 transition-all duration-300">
              <CheckCircle2 className="h-9 w-9 text-white" />
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-[#101828] tracking-tight">
              Llogaria u fshi me sukses!
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Të gjitha të dhënat tuaja u pastruan. Po ju ridrejtojmë...
            </p>

            <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
              <span>Faleminderit që përdorët Bleje Pronën</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
