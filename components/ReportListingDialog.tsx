'use client'

/**
 * ReportListingDialog — "Raporto këtë shpallje" modal (audit §6, moderation).
 *
 * Web counterpart of `mobile/components/ReportListingSheet.tsx`. Both POST the
 * identical contract to `/api/reports`:
 *
 *   POST /api/reports  { listingId, reason, note? }
 *     reason ∈ spam | fraudulent | duplicate | offensive | other
 *     note   : REQUIRED for `other`, optional otherwise (max 1000 chars)
 *
 * The server (not this component) enforces auth, self-report rejection, the
 * hourly quota and the reason allowlist — this UI only collects input and
 * renders whatever `message` the route returns, so a 429/403/503 explanation
 * reaches the user verbatim.
 *
 * INTEGRATION (the listing detail page is owned by another workstream):
 *   import { ReportListingButton } from '@/components/ReportListingDialog'
 *   <ReportListingButton listingId={listing.id} listingTitle={listing.title} />
 * — or drive the dialog yourself with `open` / `onOpenChange` from any existing
 *   "more actions" menu. Reporting is for OTHERS' listings: do not render the
 *   trigger when `listing.user_id === currentUserId` (the route 403s anyway).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertOctagon,
  CheckCircle2,
  Copy,
  Flag,
  Loader2,
  MessageSquareWarning,
  ShieldAlert,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

export type ReportReason = 'spam' | 'fraudulent' | 'duplicate' | 'offensive' | 'other'

export interface ReportReasonOption {
  value: ReportReason
  label: string
  hint: string
  icon: typeof Flag
}

/** Single source for the reason list (mirrored in the mobile sheet). */
export const REPORT_REASONS: ReportReasonOption[] = [
  {
    value: 'spam',
    label: 'Spam',
    hint: 'Reklamë, përmbajtje e parëndësishme ose e përsëritur qëllimisht.',
    icon: AlertOctagon,
  },
  {
    value: 'fraudulent',
    label: 'Mashtrim / mashtrues',
    hint: 'Kërkon pagesa paraprake, çmim joreal, ose pronë që nuk ekziston.',
    icon: ShieldAlert,
  },
  {
    value: 'duplicate',
    label: 'Shpallje e dyfishtë',
    hint: 'E njëjta pronë është postuar më shumë se një herë.',
    icon: Copy,
  },
  {
    value: 'offensive',
    label: 'Përmbajtje ofenduese',
    hint: 'Gjuhë fyese, diskriminuese ose fotografi të papërshtatshme.',
    icon: MessageSquareWarning,
  },
  {
    value: 'other',
    label: 'Tjetër',
    hint: 'Diçka tjetër që shkel kushtet e përdorimit (kërkohet shënim).',
    icon: Flag,
  },
]

const MAX_NOTE_LENGTH = 1000
const MIN_OTHER_NOTE_LENGTH = 5

export interface ReportListingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  listingId: string
  listingTitle?: string | null
  listingCity?: string | null
  /** Called after the server accepted the report (including duplicates). */
  onReported?: (info: { listingId: string; reason: ReportReason; duplicate: boolean }) => void
  /** Called when the route answers 401 so the host page can send the user to /login. */
  onRequireAuth?: () => void
}

type Phase = 'form' | 'sending' | 'done'

export function ReportListingDialog({
  open,
  onOpenChange,
  listingId,
  listingTitle,
  listingCity,
  onReported,
  onRequireAuth,
}: ReportListingDialogProps) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [note, setNote] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  const [successMessage, setSuccessMessage] = useState('')
  const firstOptionRef = useRef<HTMLButtonElement | null>(null)

  const close = useCallback(() => {
    if (phase === 'sending') return
    onOpenChange(false)
  }, [onOpenChange, phase])

  // Reset every time the dialog is opened so a second report starts clean.
  useEffect(() => {
    if (open) {
      setReason(null)
      setNote('')
      setPhase('form')
      setSuccessMessage('')
      const t = setTimeout(() => firstOptionRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [open])

  // ESC to close + lock background scroll while open.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, close])

  // Auto-dismiss the success panel.
  useEffect(() => {
    if (phase !== 'done') return
    const t = setTimeout(() => onOpenChange(false), 2200)
    return () => clearTimeout(t)
  }, [phase, onOpenChange])

  if (!open) return null

  const selected = REPORT_REASONS.find((r) => r.value === reason) ?? null
  const noteRequired = reason === 'other'
  const canSubmit =
    phase === 'form' &&
    reason !== null &&
    (!noteRequired || note.trim().length >= MIN_OTHER_NOTE_LENGTH)

  const handleSubmit = async () => {
    if (!canSubmit || !reason) return
    setPhase('sending')

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          reason,
          note: note.trim() ? note.trim().slice(0, MAX_NOTE_LENGTH) : undefined,
        }),
      })

      const data = (await res.json().catch(() => null)) as {
        message?: string
        error?: string
        duplicate?: boolean
      } | null

      if (res.status === 401) {
        setPhase('form')
        toast.error(data?.message || 'Duhet të jeni i kyçur për të raportuar një shpallje.')
        onOpenChange(false)
        onRequireAuth?.()
        return
      }

      if (!res.ok) {
        setPhase('form')
        toast.error(data?.message || 'Raportimi dështoi. Provoni përsëri më vonë.')
        return
      }

      setSuccessMessage(
        data?.message || 'Faleminderit. Raportimi u dërgua te ekipi moderues.'
      )
      setPhase('done')
      onReported?.({ listingId, reason, duplicate: data?.duplicate === true })
    } catch {
      setPhase('form')
      toast.error('Lidhja me serverin dështoi. Kontrolloni internetin dhe provoni përsëri.')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-listing-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={close}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-gray-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === 'done' ? (
          <div className="p-8 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-[#101828]">Raportimi u dërgua</h3>
            <p className="text-sm text-gray-500 max-w-xs">{successMessage}</p>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-2 min-h-[42px] px-5 text-sm font-semibold text-[#00675B] bg-[#00675B]/10 hover:bg-[#00675B]/15 rounded-xl transition-colors cursor-pointer"
            >
              Mbyll
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-3 p-5 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                <Flag className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="report-listing-title" className="text-base font-bold text-[#101828]">
                  Raporto shpalljen
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {listingTitle ? listingTitle : 'Shpallja'}
                  {listingCity ? ` · ${listingCity}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Mbyll"
                disabled={phase === 'sending'}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-40"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Reasons */}
            <div className="p-5 space-y-2 max-h-[45vh] overflow-y-auto">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Arsya e raportimit
              </p>
              {REPORT_REASONS.map((option, index) => {
                const Icon = option.icon
                const active = reason === option.value
                return (
                  <button
                    key={option.value}
                    ref={index === 0 ? firstOptionRef : undefined}
                    type="button"
                    disabled={phase === 'sending'}
                    onClick={() => setReason(option.value)}
                    aria-pressed={active}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all duration-150 cursor-pointer disabled:opacity-50 ${
                      active
                        ? 'border-[#00675B] bg-[#00675B]/5 ring-1 ring-[#00675B]/25'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        active ? 'border-[#00675B]' : 'border-gray-300'
                      }`}
                    >
                      {active && <span className="w-2 h-2 rounded-full bg-[#00675B]" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-[#101828]">
                        <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#00675B]' : 'text-gray-400'}`} />
                        {option.label}
                      </span>
                      <span className="block text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {option.hint}
                      </span>
                    </span>
                  </button>
                )
              })}

              {/* Note */}
              <div className="pt-2">
                <label
                  htmlFor="report-note"
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  Shënim {noteRequired ? '(i detyrueshëm)' : '(opsional)'}
                </label>
                <textarea
                  id="report-note"
                  value={note}
                  maxLength={MAX_NOTE_LENGTH}
                  disabled={phase === 'sending'}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder={
                    noteRequired
                      ? 'Përshkruani shkurt çfarë nuk shkon me këtë shpallje…'
                      : 'Shtoni detaje që ndihmojnë moderimin (opsionale)…'
                  }
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#101828] placeholder:text-gray-400 focus:outline-none focus:border-[#00675B] focus:ring-2 focus:ring-[#00675B]/15 resize-none disabled:opacity-50"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-gray-400">
                    {selected ? selected.hint : 'Raportet shqyrtohen nga ekipi ynë brenda 24 orësh.'}
                  </span>
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {note.length}/{MAX_NOTE_LENGTH}
                  </span>
                </div>
                {noteRequired && note.trim().length > 0 && note.trim().length < MIN_OTHER_NOTE_LENGTH && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    Shënimi duhet të ketë të paktën {MIN_OTHER_NOTE_LENGTH} karaktere.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 pt-4 border-t border-gray-100 bg-gray-50/70">
              <button
                type="button"
                onClick={close}
                disabled={phase === 'sending'}
                className="min-h-[42px] px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Anulo
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="min-h-[42px] px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2 shadow-sm shadow-rose-600/20"
              >
                {phase === 'sending' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Po dërgohet…
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4" />
                    Dërgo raportin
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export interface ReportListingButtonProps {
  listingId: string
  listingTitle?: string | null
  listingCity?: string | null
  /** Hide the trigger entirely (e.g. when the viewer owns the listing). */
  hidden?: boolean
  variant?: 'ghost' | 'outline'
  label?: string
  className?: string
  onReported?: ReportListingDialogProps['onReported']
  onRequireAuth?: ReportListingDialogProps['onRequireAuth']
}

/**
 * Self-contained "Raporto" trigger + dialog. The cheapest integration point:
 * one component, no state wiring in the host page.
 */
export function ReportListingButton({
  listingId,
  listingTitle,
  listingCity,
  hidden = false,
  variant = 'ghost',
  label = 'Raporto',
  className = '',
  onReported,
  onRequireAuth,
}: ReportListingButtonProps) {
  const [open, setOpen] = useState(false)
  if (hidden) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={
          variant === 'outline'
            ? `inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/60 transition-all duration-150 cursor-pointer ${className}`
            : `inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors duration-150 cursor-pointer ${className}`
        }
      >
        <Flag className="w-3.5 h-3.5" />
        {label}
      </button>
      <ReportListingDialog
        open={open}
        onOpenChange={setOpen}
        listingId={listingId}
        listingTitle={listingTitle}
        listingCity={listingCity}
        onReported={onReported}
        onRequireAuth={onRequireAuth}
      />
    </>
  )
}

export default ReportListingDialog
