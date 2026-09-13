import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

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

interface AuthPanelProps {
  title: string
  subtitle: string
  googleLabel: string
  onGoogle: () => void
  error?: React.ReactNode
  badge?: React.ReactNode
  children: React.ReactNode
  footer: React.ReactNode
}

export default function AuthPanel({
  title,
  subtitle,
  googleLabel,
  onGoogle,
  error,
  badge,
  children,
  footer,
}: AuthPanelProps) {
  return (
    <div className="w-full">
      {badge && <div className="mb-3">{badge}</div>}
      <h1 className="text-2xl sm:text-[27px] font-black leading-tight tracking-tight text-[#101828]">
        {title}
      </h1>
      <p className="mt-1.5 text-xs sm:text-[13.5px] text-gray-500 leading-normal">{subtitle}</p>

      <div className="mt-4 sm:mt-5">
        {error && (
          <Alert
            variant="destructive"
            className="mb-3.5 py-2.5 px-3.5 bg-red-50/90 border border-red-200 text-red-600 rounded-xl text-xs sm:text-[13px] leading-snug animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <AlertDescription className="text-xs sm:text-[13px] font-medium flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </AlertDescription>
          </Alert>
        )}

        <button
          type="button"
          onClick={onGoogle}
          className="w-full min-h-[44px] h-11 bg-white border border-gray-200/90 text-gray-700 text-xs sm:text-[13.5px] font-semibold rounded-xl inline-flex items-center justify-center gap-2.5 transition-all duration-150 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 active:scale-[0.99] cursor-pointer shadow-2xs"
        >
          <GoogleIcon className="h-4 w-4" />
          <span>{googleLabel}</span>
        </button>

        <div className="relative my-3 sm:my-3.5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              ose
            </span>
          </div>
        </div>

        {children}
      </div>

      <div className="mt-4 sm:mt-5 border-t border-gray-100 pt-3 text-center text-xs sm:text-[13px] text-gray-500 leading-relaxed">
        {footer}
      </div>
    </div>
  )
}
