'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function CompletoProfilinPage() {
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      let activeUser = null

      try {
        const { data } = await supabase.auth.getUser()
        activeUser = data?.user || null
      } catch {}

      if (!activeUser) {
        try {
          const { data: sessData } = await supabase.auth.getSession()
          activeUser = sessData?.session?.user || null
        } catch {}
      }

      if (!activeUser) {
        // Quick retry in case tokens are synchronizing
        await new Promise((r) => setTimeout(r, 350))
        try {
          const { data } = await supabase.auth.getUser()
          activeUser = data?.user || null
        } catch {}
      }

      if (!activeUser) {
        router.replace('/login')
        return
      }

      const meta = activeUser.user_metadata || {}
      const isComp = meta.account_type === 'company' || Boolean(meta.company_name)

      if (isComp) {
        router.replace('/completo-profilin-company')
      } else {
        router.replace('/completo-profilin-fast')
      }
    }

    init().catch(() => {
      router.replace('/login')
    })
  }, [router])

  return (
    <div className="min-h-screen bg-[#F2F7F7] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#006459]" />
        <p className="text-sm font-semibold text-gray-600">Po hapim konfigurimin e profilit tuaj...</p>
      </div>
    </div>
  )
}
