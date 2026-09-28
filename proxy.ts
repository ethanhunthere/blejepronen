import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getCookieDomain } from '@/lib/supabase'

interface HubIndex {
  cityTypes: string[]
  hoods: string[]
  cities: string[]
}

let hubIndexCache: { at: number; index: HubIndex } | null = null

async function getHubIndex(origin: string): Promise<HubIndex | null> {
  if (hubIndexCache && Date.now() - hubIndexCache.at < 60_000) return hubIndexCache.index
  try {
    const res = await fetch(`${origin}/api/hub-index`, { next: { revalidate: 60 } })
    if (!res.ok) return hubIndexCache?.index ?? null
    const index = (await res.json()) as HubIndex
    hubIndexCache = { at: Date.now(), index }
    return index
  } catch {
    return hubIndexCache?.index ?? null
  }
}

function hubGate(pathname: string, index: HubIndex): boolean {
  const seg = pathname.split('/').filter(Boolean)
  if (seg[0] === 'pronat' || (seg[0] === 'en' && seg[1] === 'property')) {
    const parts = seg[0] === 'en' ? seg.slice(2) : seg.slice(1)
    if (parts.length === 2) return index.cityTypes.includes(`${parts[0]}/${parts[1]}`)
    if (parts.length === 3) return index.hoods.includes(`${parts[0]}/${parts[1]}/${parts[2]}`)
    return true
  }
  if (seg[0] === 'tregu' || (seg[0] === 'en' && seg[1] === 'market')) {
    const parts = seg[0] === 'en' ? seg.slice(2) : seg.slice(1)
    if (parts.length === 1) return index.cities.includes(parts[0])
    return true
  }
  return true
}

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

  // Inventory gate: unstocked hub/market paths answer with a real 404 instead
  // of a 200 soft-404 body (page-level notFound() loses its status on demand).
  const pathname = request.nextUrl.pathname
  if (/^\/(pronat|tregu|en\/(property|market))\//.test(pathname)) {
    const index = await getHubIndex(request.nextUrl.origin)
    if (index && !hubGate(pathname, index)) {
      return NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 })
    }
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
