import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCookieDomain } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'
  const origin = requestUrl.origin.replace('www.', '')
  const hostname = requestUrl.hostname
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || hostname
  const cookieDomain = getCookieDomain(host)
  const oauthError = requestUrl.searchParams.get('error')
  const oauthErrorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth provider errors (e.g. user denied consent) before anything else.
  if (oauthError) {
    console.error('OAuth provider returned an error:', {
      error: oauthError,
      description: oauthErrorDescription,
      origin,
      hostname,
      cookieDomain,
    })
    return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`)
  }

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
            const opts = cookieDomain ? { ...options, domain: cookieDomain } : options
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

    // Check if user has completed profile and verified email
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, email_verified')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile?.first_name || !profile?.email_verified) {
        const isComp = user.user_metadata?.account_type === 'company' || Boolean(user.user_metadata?.company_name)
        const targetRoute = isComp ? '/completo-profilin-company' : '/completo-profilin-fast'
        const redirectRes = NextResponse.redirect(`${origin}${targetRoute}`)
        response.cookies.getAll().forEach(cookie => {
          redirectRes.cookies.set(cookie)
        })
        return redirectRes
      }
    }

    return response
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`)
}
