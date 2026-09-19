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

export function AppleIcon({ className = 'h-4 w-4 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 170 170" fill="currentColor">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.85-12-14.44-6.3-9.67-11.29-20.91-14.96-33.72-3.67-12.81-5.51-24.89-5.51-36.24 0-14.54 3.7-26.68 11.09-36.42 7.39-9.74 16.64-14.77 27.75-15.08 4.79 0 10.15 1.25 16.08 3.75 5.93 2.5 9.77 3.75 11.52 3.75 1.52 0 5.46-1.31 11.83-3.92 6.37-2.61 11.75-3.77 16.14-3.48 12.19.65 22.09 5.37 29.7 14.16-10.67 6.53-15.89 15.46-15.66 26.8.23 8.71 3.59 16.11 10.08 22.21 6.5 6.09 14.16 9.69 22.99 10.78-2.61 7.84-5.87 15.74-9.77 23.71zM119.22 31.84c0-7.18 2.54-13.93 7.63-20.24 5.09-6.32 11.45-10.23 19.09-11.74.22 1.09.33 2.07.33 2.94 0 7.07-2.69 13.9-8.06 20.49-5.38 6.59-11.74 10.37-19.09 11.34-.22-.98-.33-1.89-.33-2.79z" />
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
  googleLabel = 'Google',
  onGoogle,
  onApple,
  onFacebook,
  oauthLoading = null,
  error,
  badge,
  children,
  footer,
  accountType = 'individual',
  onAccountTypeChange,
  showAccountTypeSelector = false,
}: AuthPanelProps) {
  return (
    <div className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/85 shadow-xl shadow-slate-900/[0.04] p-5 sm:p-7 backdrop-blur-sm">
      {badge && <div className="mb-2">{badge}</div>}

      <div className="space-y-1 text-left">
        <h1 className="text-xl sm:text-[23px] font-black leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 leading-normal">{subtitle}</p>
      </div>

      {/* Dual-Track Persona Architecture Switcher */}
      {showAccountTypeSelector && onAccountTypeChange && (
        <div className="mt-3 p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => onAccountTypeChange('individual')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg transition-all duration-150 cursor-pointer ${
              accountType === 'individual'
                ? 'bg-white text-[#006459] shadow-xs font-bold ring-1 ring-black/5'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs sm:text-[12.5px]">Individ</span>
          </button>

          <button
            type="button"
            onClick={() => onAccountTypeChange('company')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg transition-all duration-150 cursor-pointer ${
              accountType === 'company'
                ? 'bg-white text-[#006459] shadow-xs font-bold ring-1 ring-black/5'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs sm:text-[12.5px]">Kompani / Biznes</span>
          </button>
        </div>
      )}

      <div className="mt-3 sm:mt-3.5">
        {error && (
          <Alert
            variant="destructive"
            className="mb-3 py-2 px-3 bg-red-50/90 border border-red-200 text-red-600 rounded-xl text-xs sm:text-[12.5px] leading-snug animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <AlertDescription className="text-xs sm:text-[12.5px] font-medium flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
              <span>{error}</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Branded, evenly spaced 3-button social auth row: Apple, Google, Facebook */}
        {(onApple || onGoogle || onFacebook) && (
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {onApple && (
              <button
                type="button"
                onClick={onApple}
                disabled={!!oauthLoading}
                className="min-h-[38px] h-9.5 bg-black hover:bg-neutral-800 active:scale-[0.98] text-white border border-black text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                title="Vazhdo me Apple"
              >
                {oauthLoading === 'apple' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                ) : (
                  <>
                    <AppleIcon className="h-3.5 w-3.5 text-white" />
                    <span>Apple</span>
                  </>
                )}
              </button>
            )}

            {onGoogle && (
              <button
                type="button"
                onClick={onGoogle}
                disabled={!!oauthLoading}
                className="min-h-[38px] h-9.5 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 border border-slate-200/90 text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                title="Vazhdo me Google"
              >
                {oauthLoading === 'google' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#006459]" />
                ) : (
                  <>
                    <GoogleIcon className="h-3.5 w-3.5" />
                    <span>Google</span>
                  </>
                )}
              </button>
            )}

            {onFacebook && (
              <button
                type="button"
                onClick={onFacebook}
                disabled={!!oauthLoading}
                className="min-h-[38px] h-9.5 bg-white hover:bg-blue-50/50 active:scale-[0.98] text-[#1877F2] border border-slate-200 hover:border-blue-200 text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                title="Vazhdo me Facebook"
              >
                {oauthLoading === 'facebook' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1877F2]" />
                ) : (
                  <>
                    <FacebookIcon className="h-3.5 w-3.5" />
                    <span>Facebook</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Clean "ose me email" / "or" divider */}
        <div className="relative my-3 sm:my-3.5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200/80" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
              ose me email
            </span>
          </div>
        </div>

        {children}
      </div>

      <div className="mt-3.5 sm:mt-4 border-t border-slate-100 pt-3 text-center text-xs text-slate-500 leading-normal">
        {footer}
      </div>
    </div>
  )
}
