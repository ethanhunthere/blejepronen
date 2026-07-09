import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function getCookieDomain(): string | undefined {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) return undefined

  try {
    const hostname = new URL(siteUrl).hostname
    if (!hostname || hostname === 'localhost') return undefined
    return hostname.startsWith('www.') ? hostname.slice(3) : `.${hostname}`
  } catch {
    return undefined
  }
}

export async function POST() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  const cookieDomain = getCookieDomain()

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
            cookieStore.set(name, value, { ...options, domain: cookieDomain })
            response.cookies.set(name, value, { ...options, domain: cookieDomain })
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
