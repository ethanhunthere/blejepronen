import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function getCookieDomain(hostname: string): string | undefined {
  if (!hostname || hostname === 'localhost') return undefined
  // Allow production domain and any configured public site hostname.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (siteUrl) {
    try {
      const configuredHostname = new URL(siteUrl).hostname
      if (configuredHostname && hostname.endsWith(configuredHostname)) {
        return configuredHostname.startsWith('www.')
          ? configuredHostname.slice(3)
          : `.${configuredHostname}`
      }
    } catch {
      // fall through
    }
  }
  return undefined
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'
  const origin = requestUrl.origin
  const hostname = requestUrl.hostname
  const cookieDomain = getCookieDomain(hostname)

  // Prepare the redirect response up front so we can attach cookies directly.
  const response = NextResponse.redirect(`${origin}${next}`)

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = { ...options, domain: cookieDomain }
            try {
              cookieStore.set(name, value, opts)
            } catch {
              // cookieStore.set can throw in some edge cases; the response
              // cookie below is the authoritative one for the browser.
            }
            response.cookies.set(name, value, opts)
          })
        },
      },
    }
  )

  // Google OAuth flow (code)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth callback exchangeCodeForSession failed:', {
        message: error.message,
        name: error.name,
        status: (error as { status?: number }).status,
        code: (error as { code?: string }).code,
        origin,
        hostname,
        cookieDomain,
      })
      return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`)
    }

    return response
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`)
}
