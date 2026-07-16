import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

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
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getSession() instead of getUser() here. getSession() reads the
  // session cookie without making a network request, so it won't race with
  // the browser client's token refresh and accidentally invalidate the session.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const protectedRoutes = ['/posto-banese', '/completo-profilin', '/postimet-e-mia', '/mesazhet']

  // /profili is protected (edit own profile), but /profili/[id] must stay public
  const isProtected =
    pathname === '/profili' ||
    protectedRoutes.some(route => pathname.startsWith(route))

  if (!session?.user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
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
