import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  // Determine cookie domain for production
  // We infer it from existing cookies since we don't have the request URL in a POST
  const cookieDomain = allCookies.some(c => c.name.includes('tjpxxtkebindirhpthhg'))
    ? '.blejebanesen.com'
    : undefined

  // Build the response — cookies set via setAll during signOut
  // must be attached to the response object
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
          // signOut will call setAll with expired cookies.
          // Apply them to the response with the correct domain.
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
