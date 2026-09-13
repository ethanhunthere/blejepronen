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
  autoComplete,
  topRight,
  helperText,
}: AuthFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPasswordField = type === 'password'
  const effectiveType = isPasswordField ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label
          htmlFor={id}
          className={`text-xs sm:text-[13px] font-semibold transition-colors ${
            error ? 'text-red-600' : 'text-gray-700'
          }`}
        >
          {label}
        </Label>
        {topRight && <div className="text-xs">{topRight}</div>}
      </div>
      <div className="relative">
        <span
          className={`absolute left-3 top-2.5 sm:top-3 transition-colors [&>svg]:h-4 [&>svg]:w-4 ${
            error ? 'text-red-500' : 'text-gray-400'
          }`}
        >
          {icon}
        </span>
        <Input
          id={id}
          type={effectiveType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`pl-9 sm:pl-10 ${isPasswordField ? 'pr-10 sm:pr-11' : 'pr-3'} h-10 sm:h-11 rounded-xl border text-sm text-[#101828] placeholder:text-gray-400 transition-colors ${
            error
              ? 'border-red-300 bg-red-50/60 focus:bg-white focus:border-red-400'
              : 'border-gray-200 bg-gray-50 focus:bg-white focus:border-[#006459]/40'
          }`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 active:scale-95 transition-all cursor-pointer focus:outline-hidden"
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
