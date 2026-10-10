'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

interface AuthFieldProps {
  id: string
  label: string
  type: string
  placeholder: string
  icon: React.ReactNode
  value: string
  onChange: (value: string) => void
  error?: string
  /** Stable `name` for password managers / autofill; defaults to `id`. */
  name?: string
  autoComplete?: string
  topRight?: React.ReactNode
  helperText?: React.ReactNode
}

export default function AuthField({
  id,
  label,
  type,
  placeholder,
  icon,
  value,
  onChange,
  error,
  name,
  autoComplete,
  topRight,
  helperText,
}: AuthFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPasswordField = type === 'password'
  const effectiveType = isPasswordField ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="space-y-0.5 sm:space-y-1">
      <div className="flex items-center justify-between">
        <Label
          htmlFor={id}
          className={`text-xs font-semibold transition-colors ${
            error ? 'text-red-600' : 'text-gray-700'
          }`}
        >
          {label}
        </Label>
        {topRight && <div className="text-[11.5px]">{topRight}</div>}
      </div>
      <div className="relative">
        <span
          className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors [&>svg]:h-4 [&>svg]:w-4 ${
            error ? 'text-red-500' : 'text-gray-400'
          }`}
        >
          {icon}
        </span>
        <Input
          id={id}
          name={name ?? id}
          type={effectiveType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`pl-9 sm:pl-9.5 ${isPasswordField ? 'pr-11' : 'pr-3'} h-9 sm:h-9.5 rounded-xl border text-sm text-[#101828] placeholder:text-gray-400 transition-colors ${
            error
              ? 'border-red-300 bg-red-50/60 focus:bg-white focus:border-red-400'
              : 'border-gray-200 bg-gray-50 focus:bg-white focus:border-[#00675B]/40'
          }`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
            className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 active:scale-95 transition-all cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#00675B]"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          aria-live="polite"
          className="flex items-center gap-1 text-[12px] font-medium text-red-600 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      ) : helperText ? (
        <div className="text-[11px] text-gray-500">{helperText}</div>
      ) : null}
    </div>
  )
}
