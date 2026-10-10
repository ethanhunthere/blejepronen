'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { toast } from 'sonner'

interface ProfileShareButtonProps {
  displayName: string
  className?: string
}

export default function ProfileShareButton({ displayName, className = '' }: ProfileShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    let url = typeof window !== 'undefined' ? window.location.href : 'https://blejepronen.com'
    try {
      const parsed = new URL(url)
      parsed.searchParams.delete('ref')
      parsed.searchParams.delete('fbclid')
      url = parsed.toString()
    } catch {}

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Profili i ${displayName} | Bleje Pronën`,
          text: `Shiko profilin dhe pronat e ${displayName} në platformën Bleje Pronën:`,
          url,
        })
        return
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Linku i profilit u kopjua me sukses!')
      setTimeout(() => setCopied(false), 2200)
    } catch {
      toast.error('Nuk u arrit kopjimi i linkut.')
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-10 h-11 sm:h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-[#101828] text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer ${className}`}
      aria-label="Shpërndaj profilin"
      title="Shpërndaj profilin"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-600" />
          <span className="text-emerald-700 font-bold">U kopjua</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4 text-gray-500" />
          <span>Shpërndaj</span>
        </>
      )}
    </button>
  )
}
