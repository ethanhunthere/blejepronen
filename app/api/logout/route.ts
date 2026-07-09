import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getCookieDomain } from '@/lib/supabase'

export async function POST() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  const siteHostname = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
    : ''
  const cookieDomain = getCookieDomain(siteHostname)

  const response = NextResponse.json({ success: true })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return allCookies
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Clear the domain-level cookie (covers www / root).
            const domainOpts = { ...options, domain: cookieDomain }
            cookieStore.set(name, value, domainOpts)
            response.cookies.set(name, value, domainOpts)

            // Also clear any host-only cookie that may exist from older sessions.
            if (cookieDomain) {
              const hostOnlyOpts = { ...options, domain: undefined }
              cookieStore.set(name, value, hostOnlyOpts)
              response.cookies.set(name, value, hostOnlyOpts)
            }
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Server-side logout error:', JSON.stringify(error))
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return response
}
