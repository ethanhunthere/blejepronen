'use client'

import { useEffect, useState } from 'react'
import { Phone, MessageCircle, Lock } from 'lucide-react'

import { normalizePhoneNumber, formatPhoneDisplay } from '@/lib/phone'
import { createPublicSupabaseClient } from '@/lib/supabase'

interface ProfileContactButtonsProps {
  userId: string
  whatsappHandle?: string | null
  displayName: string
}

/**
 * Contact CTAs for public profile pages. Phone numbers are never
 * server-rendered: they resolve client-side via /api/contact after login.
 */
export default function ProfileContactButtons({
  userId,
  whatsappHandle,
  displayName,
}: ProfileContactButtonsProps) {
  const [state, setState] = useState<'loading' | 'anon' | 'ready'>('loading')
  const [phone, setPhone] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const supabase = createPublicSupabaseClient()
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
          if (mounted) setState('anon')
          return
        }
        const res = await fetch(`/api/contact?userId=${encodeURIComponent(userId)}`, {
          credentials: 'same-origin',
        })
        const json = res.ok ? ((await res.json()) as { phone?: string | null }) : null
        if (mounted) {
          setPhone(json?.phone ?? null)
          setState('ready')
        }
      } catch {
        if (mounted) setState('ready')
      }
    })()
    return () => {
      mounted = false
    }
  }, [userId])

  const cleanPhone = phone ? normalizePhoneNumber(phone).replace(/\D/g, '') : ''
  const waSource = cleanPhone || (whatsappHandle ? whatsappHandle.replace(/\D/g, '') : '')
  const waGreeting = encodeURIComponent(
    `Përshëndetje ${displayName}! Po ju kontaktoj nga Bleje Pronën.`
  )
  const whatsAppUrl = waSource ? `https://wa.me/${waSource}?text=${waGreeting}` : null

  if (state === 'anon') {
    return (
      <a
        href={`/login?next=/profili/${userId}`}
        className="h-10 px-4 rounded-xl bg-[#00675B] hover:bg-[#004D43] text-white font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all"
      >
        <Lock className="h-4 w-4" />
        <span>Kyçu për kontakt</span>
      </a>
    )
  }

  return (
    <>
      {whatsAppUrl && (
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="h-10 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all"
        >
          <MessageCircle className="h-4 w-4 fill-white" />
          <span>WhatsApp</span>
        </a>
      )}

      {cleanPhone && (
        <a
          href={`tel:${normalizePhoneNumber(cleanPhone)}`}
          className="h-10 px-4 rounded-xl bg-[#00675B] hover:bg-[#004D43] text-white font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all"
        >
          <Phone className="h-4 w-4" />
          <span>Telefono ({formatPhoneDisplay(cleanPhone)})</span>
        </a>
      )}
    </>
  )
}
