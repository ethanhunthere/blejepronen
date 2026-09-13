import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getCookieDomain } from '@/lib/supabase'

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') || request.nextUrl.hostname
  // Canonical redirect www to apex domain
  if (host.startsWith('www.')) {
    const cleanHost = host.replace(/^www\./, '')
    const newUrl = new URL(request.url)
    newUrl.host = cleanHost
    newUrl.protocol = 'https:'
    return NextResponse.redirect(newUrl, { status: 301 })
  }

  const cookieDomain = getCookieDomain(host)

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = cookieDomain ? { ...options, domain: cookieDomain } : options
            supabaseResponse.cookies.set(name, value, opts)
          })
        },
      },
    }
  )

  // Validate and refresh expired session tokens in the background
  try {
    await supabase.auth.getUser()
  } catch {
    // silently continue
  }

  const isLoggingOut = request.cookies.get('blejepronen_logging_out')?.value === '1'
  if (isLoggingOut) {
    supabaseResponse.cookies.set('blejepronen_logging_out', '', { path: '/', maxAge: 0 })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all routes except API routes, Next.js internals, the OAuth
    // callback, favicon, and any static files (anything with a file extension).
    '/((?!api|_next/static|_next/image|auth/callback|favicon.ico|.*\\..*).*)',
  ],
}
