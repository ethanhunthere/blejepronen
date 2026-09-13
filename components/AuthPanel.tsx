import { Globe } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AuthPanelProps {
  title: string
  subtitle: string
  googleLabel: string
  onGoogle: () => void
  error?: React.ReactNode
  children: React.ReactNode
  footer: React.ReactNode
}

export default function AuthPanel({
  title,
  subtitle,
  googleLabel,
  onGoogle,
  error,
  children,
  footer,
}: AuthPanelProps) {
  return (
    <div className="w-full">
      <h1 className="text-2xl sm:text-[26px] font-extrabold leading-tight tracking-tight text-[#101828]">
        {title}
      </h1>
      <p className="mt-1 text-xs sm:text-sm text-gray-500">{subtitle}</p>

      <div className="mt-4 sm:mt-5">
        {error && (
          <Alert
            variant="destructive"
            className="mb-3 py-2 px-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs sm:text-[13px] leading-snug"
          >
            <AlertDescription className="text-xs sm:text-[13px] font-medium">{error}</AlertDescription>
          </Alert>
        )}

        <button
          type="button"
          onClick={onGoogle}
          className="w-full h-10 sm:h-11 bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl inline-flex items-center justify-center transition-colors hover:bg-gray-50 hover:border-gray-300 cursor-pointer"
        >
          <Globe className="mr-2 h-4 w-4 text-gray-500" />
          {googleLabel}
        </button>

        <div className="relative my-2.5 sm:my-3">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2.5 text-[11px] sm:text-xs font-medium uppercase tracking-wider text-gray-400">
              ose
            </span>
          </div>
        </div>

        {children}
      </div>

      <div className="mt-3.5 sm:mt-4 border-t border-gray-100 pt-2.5 sm:pt-3 text-center text-xs sm:text-[13px] text-gray-500">
        {footer}
      </div>
    </div>
  )
}
