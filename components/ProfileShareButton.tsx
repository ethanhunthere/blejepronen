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
    const url = typeof window !== 'undefined' ? window.location.href : 'https://blejepronen.com'
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Profili i ${displayName} | Bleje Pronën`,
          text: `Shiko profilin dhe pronat e ${displayName} në platformën Bleje Pronën:`,
          url,
        })
        return
      } catch {
        // user cancelled or share failed, fallback to copy
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
      className={`inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-[#101828] text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer ${className}`}
      aria-label="Ndaj profilin"
      title="Ndaj profilin"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-600" />
          <span className="text-emerald-700 font-bold">U kopjua</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4 text-gray-500" />
          <span>Ndaj profilin</span>
        </>
      )}
    </button>
  )
}
