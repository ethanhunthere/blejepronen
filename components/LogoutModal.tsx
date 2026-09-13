'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { LogOut, X, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react'

interface LogoutModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail?: string | null
  userName?: string | null
  avatarUrl?: string | null
  onLogoutConfirmed: () => Promise<void> | void
}

type LogoutPhase = 'confirm' | 'logging_out' | 'done'

export default function LogoutModal({
  isOpen,
  onClose,
  userEmail,
  userName,
  avatarUrl,
  onLogoutConfirmed,
}: LogoutModalProps) {
  const [phase, setPhase] = useState<LogoutPhase>('confirm')
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset phase when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPhase('confirm')
      setProgress(0)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isOpen])

  // Handle ESC key to close only during confirmation phase
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
    setPhase('logging_out')
    setProgress(15)

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 85) {
          clearInterval(interval)
          return 85
        }
        return prev + Math.floor(Math.random() * 18 + 10)
      })
    }, 120)
    timerRef.current = interval

    try {
      await onLogoutConfirmed()
    } catch (err) {
      console.error('Logout error:', err)
    }

    if (timerRef.current) clearInterval(timerRef.current)
    setProgress(100)
    setPhase('done')

    // Smooth pause to let the user see the success state before redirect
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        if (window.location.pathname === '/') {
          window.location.reload()
        } else {
          window.location.replace('/')
        }
      }
    }, 450)
  }, [onLogoutConfirmed])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#001f1a]/70 backdrop-blur-xl animate-fade-in transition-all duration-300"
    >
      {/* Backdrop click to cancel */}
      <div
        className="absolute inset-0"
        onClick={() => {
          if (phase === 'confirm') onClose()
        }}
      />

      {/* Center Modal Card */}
      <div className="relative w-full max-w-[390px] rounded-3xl bg-white/95 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_32px_80px_-16px_rgba(0,35,30,0.45)] border border-stone-200/80 text-center flex flex-col items-center overflow-hidden transition-all duration-300">
        {/* Subtle decorative top ambient light */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#006459]/15 rounded-full blur-2xl pointer-events-none" />

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

            {/* Logout icon badge with soft glow */}
            <div className="relative w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shadow-sm mb-4">
              <LogOut className="h-6 w-6 text-red-500" />
            </div>

            <h3
              id="logout-dialog-title"
              className="text-xl font-bold text-[#101828] tracking-tight leading-snug"
            >
              Dëshironi të dilni nga llogaria?
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1.5 max-w-[290px] leading-relaxed">
              Mund të kyçeni përsëri në çdo moment me të dhënat tuaja.
            </p>

            {/* User Account Micro-Card */}
            {(userEmail || userName) && (
              <div className="mt-5 w-full flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100 text-left">
                <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[#006459]/10 text-[#006459] font-bold text-sm flex items-center justify-center border border-gray-200">
                  <Image src={avatarUrl || '/avatars/avatar-1.png'} alt="" fill sizes="40px" className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  {userName && (
                    <p className="text-sm font-semibold text-[#101828] truncate">{userName}</p>
                  )}
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Aktive" />
              </div>
            )}

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
                <LogOut className="h-4 w-4" />
                <span>Dil</span>
              </button>
            </div>
          </>
        )}

        {/* Phase 2: Logging Out Animation */}
        {phase === 'logging_out' && (
          <div className="py-2 flex flex-col items-center">
            {/* Animated Brand Emblem with Orbital Ring */}
            <div className="relative mb-5 flex items-center justify-center">
              <div className="absolute -inset-3 rounded-3xl border-2 border-dashed border-[#006459]/35 animate-[spin_10s_linear_infinite]" />
              <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-[#006459] to-[#00473f] flex items-center justify-center shadow-xl shadow-[#006459]/30 ring-8 ring-[#006459]/10">
                <Image
                  src="/logo-white.png"
                  alt="Bleje Pronën"
                  width={42}
                  height={42}
                  className="w-10 h-10 object-contain"
                />
              </div>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-[#101828] tracking-tight">
              Duke dalë nga llogaria...
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-[280px]">
              Sesioni juaj po mbyllet dhe të dhënat po ruhen me siguri.
            </p>

            {/* Smooth Progress Bar */}
            <div className="w-52 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-6">
              <div
                className="h-full bg-gradient-to-r from-[#006459] via-[#008272] to-[#C8B882] rounded-full transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Encrypted Session Notice */}
            <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Mbyllje e mbrojtur e sesionit</span>
            </div>
          </div>
        )}

        {/* Phase 3: Done / Success Transition */}
        {phase === 'done' && (
          <div className="py-2 flex flex-col items-center animate-fade-in">
            <div className="w-18 h-18 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 mb-5 ring-8 ring-emerald-500/15 scale-100 transition-all duration-300">
              <CheckCircle2 className="h-9 w-9 text-white" />
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-[#101828] tracking-tight">
              U çkyçët me sukses!
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Po ju ridrejtojmë te faqja kryesore...
            </p>

            <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#006459]" />
              <span>Faleminderit që përdorni Bleje Pronën</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
