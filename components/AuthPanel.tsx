import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, User, Building2, Loader2 } from 'lucide-react'

export function GoogleIcon({ className = 'h-4 w-4 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.28 14.27A7.18 7.18 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.96 11.96 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function AppleIcon({
  className = 'h-4 w-4 shrink-0',
}: {
  className?: string
  dark?: boolean
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

export function FacebookIcon({ className = 'h-4 w-4 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        fill="#1877F2"
      />
    </svg>
  )
}

interface AuthPanelProps {
  title: string
  subtitle: string
  googleLabel?: string
  onGoogle?: () => void
  onApple?: () => void
  onFacebook?: () => void
  oauthLoading?: string | null
  isSubmitting?: boolean
  error?: React.ReactNode
  badge?: React.ReactNode
  children: React.ReactNode
  footer: React.ReactNode
  accountType?: 'individual' | 'company'
  onAccountTypeChange?: (type: 'individual' | 'company') => void
  showAccountTypeSelector?: boolean
}

export default function AuthPanel({
  title,
  subtitle,
  googleLabel = 'Vazhdo me Google',
  onGoogle,
  onApple,
  onFacebook,
  oauthLoading = null,
  isSubmitting = false,
  error,
  badge,
  children,
  footer,
  accountType = 'individual',
  onAccountTypeChange,
  showAccountTypeSelector = false,
}: AuthPanelProps) {
  const activeProvidersCount = [onGoogle, onApple, onFacebook].filter(Boolean).length

  return (
    <div className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/[0.04] p-6 sm:p-8">
      {badge && <div className="mb-2">{badge}</div>}

      <div className="space-y-1.5 text-left">
        <h1 className="text-xl sm:text-[23px] font-black leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 leading-normal">{subtitle}</p>
      </div>

      {/* Dual-Track Persona Architecture Switcher */}
      {showAccountTypeSelector && onAccountTypeChange && (
        <div
          role="tablist"
          aria-label="Lloji i llogarisë"
          className="mt-3.5 p-1.5 rounded-xl bg-slate-100/90 border border-slate-200/80 grid grid-cols-2 gap-1.5"
        >
          <button
            type="button"
            role="tab"
            id="tab-individual"
            aria-selected={accountType === 'individual'}
            aria-controls="panel-individual"
            onClick={() => onAccountTypeChange('individual')}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') onAccountTypeChange('company')
            }}
            className={`flex items-center justify-center gap-2 min-h-[40px] py-2 px-3 rounded-lg transition-all duration-150 cursor-pointer ${
              accountType === 'individual'
                ? 'bg-white text-[#00675B] shadow-xs font-bold ring-1 ring-black/5'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <User className="h-4 w-4 shrink-0" />
            <span className="text-xs sm:text-[13px]">Individ</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-company"
            aria-selected={accountType === 'company'}
            aria-controls="panel-company"
            onClick={() => onAccountTypeChange('company')}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') onAccountTypeChange('individual')
            }}
            className={`flex items-center justify-center gap-2 min-h-[40px] py-2 px-3 rounded-lg transition-all duration-150 cursor-pointer ${
              accountType === 'company'
                ? 'bg-white text-[#00675B] shadow-xs font-bold ring-1 ring-black/5'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="text-xs sm:text-[13px]">Kompani / Biznes</span>
          </button>
        </div>
      )}

      <div className="mt-4 sm:mt-4.5">
        {error && (
          <Alert
            variant="destructive"
            className="mb-3.5 py-2.5 px-3.5 bg-red-50/90 border border-red-200 text-red-600 rounded-xl text-xs sm:text-[12.5px] leading-snug animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <AlertDescription className="text-xs sm:text-[12.5px] font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Social auth: full-width primary button when single provider, or even grid */}
        {activeProvidersCount > 0 && (
          <div
            className={
              activeProvidersCount === 1
                ? 'w-full'
                : `grid grid-cols-${activeProvidersCount} gap-2.5 sm:gap-3`
            }
          >
            {onApple && (
              <button
                type="button"
                onClick={onApple}
                disabled={Boolean(oauthLoading) || isSubmitting}
                className="w-full min-h-[44px] h-11 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 border border-slate-200/90 text-xs sm:text-[13px] font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                title="Vazhdo me Apple"
              >
                {oauthLoading === 'apple' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#00675B]" />
                ) : (
                  <>
                    <AppleIcon className="h-4 w-4 text-black" />
                    <span>Apple</span>
                  </>
                )}
              </button>
            )}

            {onGoogle && (
              <button
                type="button"
                onClick={onGoogle}
                disabled={Boolean(oauthLoading) || isSubmitting}
                className="w-full min-h-[44px] h-11 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 border border-slate-200/90 text-xs sm:text-[13px] font-semibold rounded-xl inline-flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                title="Vazhdo me Google"
              >
                {oauthLoading === 'google' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#00675B]" />
                ) : (
                  <>
                    <GoogleIcon className="h-4 w-4" />
                    <span>{googleLabel}</span>
                  </>
                )}
              </button>
            )}

            {onFacebook && (
              <button
                type="button"
                onClick={onFacebook}
                disabled={Boolean(oauthLoading) || isSubmitting}
                className="w-full min-h-[44px] h-11 bg-white hover:bg-blue-50/50 active:scale-[0.98] text-[#1877F2] border border-slate-200 hover:border-blue-200 text-xs sm:text-[13px] font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                title="Vazhdo me Facebook"
              >
                {oauthLoading === 'facebook' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#1877F2]" />
                ) : (
                  <>
                    <FacebookIcon className="h-4 w-4" />
                    <span>Facebook</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Clean "ose me email" / "or" divider */}
        <div className="relative my-4 sm:my-4.5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200/80" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              ose me email
            </span>
          </div>
        </div>

        {children}
      </div>

      <div className="mt-4 sm:mt-5 border-t border-slate-100 pt-3.5 text-center text-xs text-slate-500 leading-normal">
        {footer}
      </div>
    </div>
  )
}
