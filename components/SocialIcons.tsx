import React from 'react'
import { normalizeSocialUrl, formatSocialHandle, type SocialLinks } from '@/lib/socials'
import { ExternalLink } from 'lucide-react'

export function InstagramIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

export function FacebookIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export function WhatsAppIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.031 0C5.396 0 .02 5.374.02 12.008c0 2.115.553 4.18 1.603 5.998L.069 24l6.166-1.616a11.95 11.95 0 005.796 1.488h.005c6.634 0 12.01-5.374 12.01-12.008 0-3.208-1.25-6.223-3.518-8.494A11.93 11.93 0 0012.031 0zm-.005 21.87h-.004a9.92 9.92 0 01-5.06-1.388l-.363-.215-3.762.986 1.004-3.667-.236-.376a9.916 9.916 0 01-1.52-5.197c0-5.485 4.464-9.948 9.949-9.948 2.657 0 5.155 1.036 7.034 2.915a9.88 9.88 0 012.91 7.034c0 5.486-4.463 9.95-9.948 9.95zm5.45-7.447c-.298-.15-1.767-.872-2.04-.972-.274-.1-.473-.15-.672.15-.2.298-.77.972-.945 1.171-.174.2-.348.224-.646.074-.298-.15-1.26-.465-2.4-1.482-.888-.792-1.487-1.77-1.661-2.068-.174-.298-.019-.459.13-.608.134-.134.298-.348.448-.522.149-.174.2-.298.298-.497.1-.2.05-.373-.025-.522-.075-.15-.672-1.62-.92-2.217-.243-.58-.49-.502-.673-.511l-.572-.01c-.199 0-.522.075-.796.373s-1.044 1.02-1.044 2.487 1.069 2.885 1.218 3.084c.149.2 2.103 3.21 5.094 4.5 2.99 1.29 2.99.86 3.538.81.547-.05 1.766-.72 2.015-1.417.248-.696.248-1.293.174-1.417-.074-.124-.273-.199-.572-.348z" />
    </svg>
  )
}

export function TikTokIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  )
}

interface SocialLinksBarProps {
  socials?: SocialLinks | null
  variant?: 'pills' | 'icons' | 'large'
  className?: string
}

export default function SocialLinksBar({
  socials,
  variant = 'pills',
  className = '',
}: SocialLinksBarProps) {
  if (!socials) return null

  const items = [
    {
      platform: 'instagram' as const,
      value: socials.instagram,
      label: 'Instagram',
      icon: InstagramIcon,
      color: 'hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-500 hover:text-white hover:border-transparent text-pink-700 bg-pink-50/70 border-pink-200/80',
      iconColor: 'text-pink-600',
    },
    {
      platform: 'facebook' as const,
      value: socials.facebook,
      label: 'Facebook',
      icon: FacebookIcon,
      color: 'hover:bg-[#1877F2] hover:text-white hover:border-transparent text-[#1877F2] bg-blue-50/70 border-blue-200/80',
      iconColor: 'text-[#1877F2]',
    },
    {
      platform: 'whatsapp' as const,
      value: socials.whatsapp,
      label: 'WhatsApp',
      icon: WhatsAppIcon,
      color: 'hover:bg-[#25D366] hover:text-white hover:border-transparent text-emerald-700 bg-emerald-50/70 border-emerald-200/80',
      iconColor: 'text-[#25D366]',
    },
    {
      platform: 'tiktok' as const,
      value: socials.tiktok,
      label: 'TikTok',
      icon: TikTokIcon,
      color: 'hover:bg-black hover:text-white hover:border-transparent text-gray-900 bg-gray-100/70 border-gray-200',
      iconColor: 'text-gray-900',
    },
  ].filter(item => Boolean(item.value && item.value.trim()))

  if (items.length === 0) return null

  if (variant === 'icons') {
    return (
      <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
        {items.map(item => {
          const url = normalizeSocialUrl(item.platform, item.value)
          const Icon = item.icon
          return (
            <a
              key={item.platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-150 active:scale-95 ${item.color}`}
              title={`${item.label}: ${item.value}`}
              aria-label={item.label}
            >
              <Icon className="h-4 w-4" />
            </a>
          )
        })}
      </div>
    )
  }

  if (variant === 'large') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
        {items.map(item => {
          const url = normalizeSocialUrl(item.platform, item.value)
          const handle = formatSocialHandle(item.platform, item.value)
          const Icon = item.icon
          return (
            <a
              key={item.platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-200/80 bg-white hover:shadow-md hover:border-gray-300 transition-all duration-200 group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {item.label}
                  </p>
                  <p className="text-sm font-bold text-[#101828] truncate">
                    {handle || item.value}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#101828] transition-colors shrink-0 ml-2" />
            </a>
          )
        })}
      </div>
    )
  }

  // Default 'pills'
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {items.map(item => {
        const url = normalizeSocialUrl(item.platform, item.value)
        const handle = formatSocialHandle(item.platform, item.value)
        const Icon = item.icon
        return (
          <a
            key={item.platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-150 active:scale-95 group shadow-2xs ${item.color}`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-[130px]">{handle || item.label}</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
          </a>
        )
      })}
    </div>
  )
}
