import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/'
  const origin = requestUrl.origin

  // Set cookie domain to .blejebanesen.com in production so cookies work
  // across both www.blejebanesen.com and blejebanesen.com.
  // On localhost, omit domain so cookies bind to localhost:3000.
  const hostname = requestUrl.hostname
  const cookieDomain = hostname.includes('blejebanesen.com') ? '.blejebanesen.com' : undefined

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
            cookieStore.set(name, value, { ...options, domain: cookieDomain })
          })
        },
      },
    }
  )

  // Magic link flow (token_hash + type=email or type=magiclink)
  if (tokenHash && (type === 'email' || type === 'magiclink')) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'email',
    })

    if (error) {
      console.error('Magic link verifyOtp failed:', {
        message: error.message,
        name: error.name,
        status: (error as { status?: number }).status,
        origin,
        hostname,
      })
      return NextResponse.redirect(`${origin}/login?error=magic_link_failed`)
    }

    // Mark profile as verified
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ phone_verified: true })
        .eq('id', user.id)

      if (updateError) {
        console.error('Profile verify update after magic link:', updateError)
      }
    }

    return NextResponse.redirect(`${origin}/`)
  }

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

    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`)
}
