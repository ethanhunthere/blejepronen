'use client'

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Plus,
  User,
  LogOut,
  MessageCircle,
  Home,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Building2,
  Key,
  MapPin,
  X,
  Menu,
  Settings,
  ShieldCheck,
  Search,
} from 'lucide-react'
import { CITIES } from '@/lib/cities'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import LogoutModal from './LogoutModal'
import OmniSearchModal from './OmniSearchModal'
import { getAvatarUrl } from '@/lib/avatars'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Singleton Supabase client so we don't recreate it on every mount
const _supabaseClient = createClient()

const NAVBAR_USER_CACHE_KEY = 'blejepronen_cached_user'
const NAVBAR_PROFILE_CACHE_KEY = 'blejepronen_cached_navbar_profile'

interface CachedNavbarProfile {
  userId: string
  firstName: string
  avatarUrl: string
  isCompany: boolean
  incomplete: boolean
}

function getCookieUser(): SupabaseUser | null {
  if (typeof window === 'undefined') return null
  try {
    const cookies = document.cookie.split(';')
    const chunkMap: Record<string, string[]> = {}
    let singleToken: string | null = null

    for (let i = 0; i < cookies.length; i++) {
      const c = cookies[i].trim()
      const eqIdx = c.indexOf('=')
      if (eqIdx === -1) continue
      const key = c.substring(0, eqIdx).trim()
      const val = c.substring(eqIdx + 1).trim()

      if (key.startsWith('sb-') && key.includes('-auth-token')) {
        const chunkMatch = key.match(/-auth-token\.(\d+)$/)
        if (chunkMatch) {
          const baseName = key.replace(/\.\d+$/, '')
          if (!chunkMap[baseName]) chunkMap[baseName] = []
          chunkMap[baseName][parseInt(chunkMatch[1], 10)] = val
        } else {
          singleToken = val
        }
      }
    }

    let combined = singleToken
    if (!combined) {
      for (const baseName in chunkMap) {
        combined = chunkMap[baseName].join('')
        if (combined) break
      }
    }

    if (combined) {
      const decodedVal = decodeURIComponent(combined)
      let jsonStr = decodedVal
      if (decodedVal.startsWith('base64-')) {
        const str = decodedVal.substring(7)
        const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)
        jsonStr = atob(b64)
      }
      const parsed = JSON.parse(jsonStr)
      if (parsed?.user) {
        return parsed.user
      }
    }
  } catch {}
  return null
}

function getCachedUser(): SupabaseUser | null {
  if (typeof window === 'undefined') return null
  try {
    const direct = localStorage.getItem(NAVBAR_USER_CACHE_KEY)
    if (direct) return JSON.parse(direct)

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
        const raw = localStorage.getItem(k)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.user) {
            setCachedUser(parsed.user)
            return parsed.user
          }
        }
      }
    }

    const cookieUser = getCookieUser()
    if (cookieUser) {
      setCachedUser(cookieUser)
      return cookieUser
    }
  } catch {}
  return null
}

function setCachedUser(user: SupabaseUser | null) {
  if (typeof window === 'undefined') return
  try {
    if (user) {
      localStorage.setItem(NAVBAR_USER_CACHE_KEY, JSON.stringify(user))
      document.documentElement.setAttribute('data-auth', 'logged-in')
      const initial = (user.user_metadata?.first_name || user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()
      if (initial && initial !== '?') {
        document.documentElement.style.setProperty('--nav-initial', `"${initial}"`)
      }
    } else {
      localStorage.removeItem(NAVBAR_USER_CACHE_KEY)
    }
  } catch {}
}

function getCachedProfile(): CachedNavbarProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(NAVBAR_PROFILE_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function setCachedProfile(userId: string, data: Omit<CachedNavbarProfile, 'userId'>) {
  if (typeof window === 'undefined') return
  try {
    const avatarUrl = getAvatarUrl(data.avatarUrl)
    localStorage.setItem(
      NAVBAR_PROFILE_CACHE_KEY,
      JSON.stringify({ userId, ...data, avatarUrl, timestamp: Date.now() })
    )
    document.documentElement.style.setProperty('--nav-avatar', `url("${avatarUrl}")`)
    if (data.firstName) {
      document.documentElement.style.setProperty('--nav-initial', `"${data.firstName.charAt(0).toUpperCase()}"`)
    }
  } catch {}
}

function clearNavbarCache() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(NAVBAR_USER_CACHE_KEY)
    localStorage.removeItem(NAVBAR_PROFILE_CACHE_KEY)
    document.documentElement.setAttribute('data-auth', 'logged-out')
    document.documentElement.style.removeProperty('--nav-avatar')
    document.documentElement.style.removeProperty('--nav-initial')
  } catch {}
}

interface NavbarProps {
  variant?: 'fixed' | 'absolute' | 'static'
  className?: string
}


export default function Navbar({ variant = 'fixed', className }: NavbarProps) {
  // undefined = still checking session, null = logged out, object = logged in
  const [user, setUser] = useState<SupabaseUser | null | undefined>(undefined)
  const [profile, setProfile] = useState<{ incomplete: boolean; firstName: string; avatarUrl: string; isCompany?: boolean }>({
    incomplete: false,
    firstName: '',
    avatarUrl: '',
    isCompany: false,
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const [isOmniSearchOpen, setIsOmniSearchOpen] = useState(false)
  const realtimeChannelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)
  const userIdRef = useRef<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(_supabaseClient)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const isAuthPage = pathname === '/register' || pathname === '/login' || pathname === '/forgot-password'
  const unreadChannelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)

  // Global Command+K and '/' shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOmniSearchOpen((prev) => !prev)
      } else if (e.key === '/' && !isInput) {
        e.preventDefault()
        setIsOmniSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Instant synchronous cache restoration on mount (0ms latency on refresh)
  useIsomorphicLayoutEffect(() => {
    if (isAuthPage) return

    const cachedUser = getCachedUser()
    const cachedProf = getCachedProfile()

    if (cachedUser) {
      setUser(cachedUser)
      userIdRef.current = cachedUser.id
      document.documentElement.setAttribute('data-auth', 'logged-in')
      if (cachedProf && cachedProf.userId === cachedUser.id) {
        setProfile({
          firstName: cachedProf.firstName,
          avatarUrl: getAvatarUrl(cachedProf.avatarUrl),
          isCompany: cachedProf.isCompany,
          incomplete: cachedProf.incomplete,
        })
      } else {
        const meta = cachedUser.user_metadata
        const fn = meta?.first_name || meta?.full_name || ''
        const av = meta?.avatar_url || ''
        const isComp = meta?.account_type === 'company' || Boolean(meta?.company_name)
        setProfile({
          firstName: fn,
          avatarUrl: getAvatarUrl(av),
          isCompany: isComp,
          incomplete: false,
        })
      }
    } else {
      const hasCookie = typeof document !== 'undefined' && document.cookie.includes('-auth-token')
      if (!hasCookie) {
        setUser(null)
        document.documentElement.setAttribute('data-auth', 'logged-out')
      }
    }
  }, [isAuthPage])

  // ---- Single source of truth for unread count queries ----
  const fetchUnreadCount = useCallback(async () => {
    const uid = userIdRef.current
    if (!uid) return
    const { data: convs } = await supabaseRef.current
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
    if (!convs || convs.length === 0) {
      setUnreadCount(0)
      return
    }
    const convIds = convs.map(c => c.id)
    const { count } = await supabaseRef.current
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .eq('is_read', false)
      .neq('sender_id', uid)
    setUnreadCount(count || 0)
  }, [])

  const loadProfile = useCallback(async (userId: string, userMeta?: Record<string, unknown>) => {
    const supabase = supabaseRef.current
    const isCompany =
      userMeta?.account_type === 'company' ||
      Boolean(userMeta?.company_name)

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('first_name, email_verified, avatar_url')
      .eq('id', userId)
      .maybeSingle()

    if (profileErr) {
      console.error('Navbar profile fetch error:', JSON.stringify(profileErr))
    }

    const nextProfile = {
      incomplete: !profile?.first_name || !profile?.email_verified,
      firstName: profile?.first_name || '',
      avatarUrl: getAvatarUrl(profile?.avatar_url),
      isCompany,
    }

    setProfile(nextProfile)
    setCachedProfile(userId, nextProfile)
  }, [])

  useEffect(() => {
    const supabase = supabaseRef.current
    let currentUserId: string | null = null

    // ---- debouncedFetch: prevents rapid-fire DB queries from Realtime events ----
    const debouncedFetch = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => fetchUnreadCount(), 400)
    }

    // ---- Set up Realtime channel ONCE per user session ----
    const setupRealtimeChannel = () => {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe()
        realtimeChannelRef.current = null
      }
      const ch = supabase
        .channel('navbar-unread')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          () => {
            debouncedFetch()
          }
        )
        .subscribe()
      realtimeChannelRef.current = ch

      // Dedicated channel: fires immediately when any message is marked as read.
      // No debounce - the UPDATE has already committed, so fetchUnreadCount is safe.
      if (unreadChannelRef.current) {
        unreadChannelRef.current.unsubscribe()
        unreadChannelRef.current = null
      }
      const uch = supabase
        .channel('navbar-messages-watch')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: 'is_read=eq.true',
          },
          () => {
            fetchUnreadCount()
          }
        )
        .subscribe()
      unreadChannelRef.current = uch
    }

    const setCurrentUser = (user: SupabaseUser | null) => {
      setUser(user)
      setCachedUser(user)
      currentUserId = user?.id ?? null
      userIdRef.current = user?.id ?? null
      if (user) {
        loadProfile(user.id, user.user_metadata)
        setupRealtimeChannel()
        fetchUnreadCount()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUserId) {
        loadProfile(currentUserId)
        fetchUnreadCount()
      }
    }

    // Check current session immediately so there is no delay or mismatch
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user)
      } else if (!session?.user && userIdRef.current === null) {
        setUser(null)
        clearNavbarCache()
      }
    }).catch(() => {
      if (userIdRef.current === null) {
        setUser(null)
      }
    })

    const sessionFallbackTimer = setTimeout(() => {
      setUser(prev => (prev === undefined ? null : prev))
    }, 120)

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          clearNavbarCache()
          setUser(null)
          currentUserId = null
          userIdRef.current = null
          setProfile({ incomplete: false, firstName: '', avatarUrl: '', isCompany: false })
          setDropdownOpen(false)
          setMenuOpen(false)
          setUnreadCount(0)
          if (realtimeChannelRef.current) {
            realtimeChannelRef.current.unsubscribe()
            realtimeChannelRef.current = null
          }
          if (unreadChannelRef.current) {
            unreadChannelRef.current.unsubscribe()
            unreadChannelRef.current = null
          }
          return
        }

        if (
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          if (session?.user) {
            setCurrentUser(session.user)
          } else if (event === 'INITIAL_SESSION') {
            setUser(null)
          }
        }
      }
    )

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('messages-read', fetchUnreadCount)

    return () => {
      subscription.unsubscribe()
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe()
        realtimeChannelRef.current = null
      }
      if (unreadChannelRef.current) {
        unreadChannelRef.current.unsubscribe()
        unreadChannelRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('messages-read', fetchUnreadCount)
      clearTimeout(sessionFallbackTimer)
    }
  }, [router, fetchUnreadCount, loadProfile])

  // Re-fetch profile when pathname changes or when profile-updated event fires
  useEffect(() => {
    if (userIdRef.current) {
      loadProfile(userIdRef.current)
    }
  }, [pathname, loadProfile])

  useEffect(() => {
    const handleProfileUpdated = () => {
      if (userIdRef.current) {
        loadProfile(userIdRef.current)
      }
    }
    window.addEventListener('profile-updated', handleProfileUpdated)
    return () => window.removeEventListener('profile-updated', handleProfileUpdated)
  }, [loadProfile])

  // ---- Re-fetch unread count when navigating into a chat ----
  // Also poll every 10 seconds as a fallback for realtime misses
  useEffect(() => {
    if (pathname?.startsWith('/mesazhet/')) {
      fetchUnreadCount()
      const interval = setInterval(() => fetchUnreadCount(), 10000)
      return () => clearInterval(interval)
    }
  }, [pathname, fetchUnreadCount])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }

    // Use mousedown so we catch the click before it reaches other handlers
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // Prefetch primary navigation routes for instant transition
  useEffect(() => {
    try {
      router.prefetch('/login')
      router.prefetch('/register')
      router.prefetch('/listings')
      router.prefetch('/posto-prona')
      router.prefetch('/postimet-e-mia')
      router.prefetch('/mesazhet')
    } catch {}
  }, [router])

  // Lock document and theme color to brand teal #00675B across all / pages and navigation
  useEffect(() => {
    document.documentElement.style.backgroundColor = '#00675B'
    document.body.style.backgroundColor = '#00675B'
    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) metaTheme.setAttribute('content', '#00675B')
  }, [pathname])

  // Mobile menu: clean scroll lock without layout shifts & enforce #00675B theme color
  useEffect(() => {
    if (!menuOpen) return

    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverscroll = document.body.style.overscrollBehavior
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior
    const prevTouchAction = document.body.style.touchAction

    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.overscrollBehavior = 'none'
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.body.style.touchAction = 'none'
    document.documentElement.style.backgroundColor = '#00675B'
    document.body.style.backgroundColor = '#00675B'

    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute('content', '#00675B')
    }

    // Block any touchmove or wheel event that originates outside the scrollable menu container
    const preventOutsideScroll = (e: TouchEvent | WheelEvent) => {
      const scrollable = document.getElementById('mobile-menu-scrollable')
      if (!scrollable || !scrollable.contains(e.target as Node)) {
        if (e.cancelable) {
          e.preventDefault()
        }
      }
    }

    window.addEventListener('touchmove', preventOutsideScroll, { passive: false })
    window.addEventListener('wheel', preventOutsideScroll, { passive: false })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll
      document.body.style.overflow = prevBodyOverflow
      document.body.style.overscrollBehavior = prevBodyOverscroll
      document.body.style.touchAction = prevTouchAction
      document.documentElement.style.backgroundColor = '#00675B'
      document.body.style.backgroundColor = '#00675B'
      if (metaTheme) {
        metaTheme.setAttribute('content', '#00675B')
      }
      window.removeEventListener('touchmove', preventOutsideScroll)
      window.removeEventListener('wheel', preventOutsideScroll)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // Close mobile menu on desktop resize
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const handleNavClick = useCallback((href: string) => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    const currentBase = pathname.split('?')[0]
    const targetBase = href.split('?')[0]
    if (currentBase === targetBase) {
      setMenuOpen(false)
    } else {
      // Delay closing menu slightly so destination page renders underneath,
      // preventing any flash of the underlying home page
      setTimeout(() => {
        if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        setMenuOpen(false)
      }, 220)
    }
  }, [pathname])

  // Clear logout flag when arriving at home page
  useEffect(() => {
    if (pathname === '/') {
      try {
        sessionStorage.removeItem('blejepronen_logging_out')
        document.cookie = 'blejepronen_logging_out=; path=/; max-age=0'
      } catch {}
    }
  }, [pathname])

  const closeDropdown = useCallback(() => setDropdownOpen(false), [])

  const openLogoutModal = useCallback(() => {
    setDropdownOpen(false)
    setMenuOpen(false)
    setLogoutModalOpen(true)
  }, [])

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true)

    try {
      sessionStorage.setItem('blejepronen_logging_out', '1')
      document.cookie = 'blejepronen_logging_out=1; path=/; max-age=10; SameSite=Lax'
    } catch {}

    // 1. Synchronously clear ALL Supabase localStorage keys and navbar cache
    try {
      clearNavbarCache()
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key)
        }
      })
    } catch {}

    // 2. Call server-side logout to clear cookies with correct domain
    try {
      await Promise.race([
        fetch('/api/logout', { method: 'POST', keepalive: true }),
        new Promise(resolve => setTimeout(resolve, 800))
      ])
    } catch (err) {
      console.error('Server logout API call failed:', err)
    }

    // 3. Sign out locally in Supabase client
    try {
      await supabaseRef.current.auth.signOut({ scope: 'local' })
    } catch (err) {
      console.error('Client sign out exception:', err)
    }

    // 4. Reset user state
    setUser(null)
    setProfile({ incomplete: false, firstName: '', avatarUrl: '' })
  }, [])

  const positionClasses = {
    fixed: 'fixed top-0 left-0 z-50 w-full',
    absolute: 'absolute top-0 left-0 z-50 w-full',
    static: 'relative z-50 w-full',
  }[variant]

  // On auth entry pages (login, register, forgot-password), suppress showing the logged-in profile in the navbar.
  // This prevents premature profile flashing while the user is still filling or verifying the signup form.
  // The moment navigation to /completo-profilin-fast or / occurs, the profile appears synchronously with the new page.
  const activeUser = isAuthPage ? null : user

  const displayName = profile.firstName || activeUser?.email?.split('@')[0] || 'Përdorues'

  return (
    <nav className={`${positionClasses} bg-[#00675B] pt-[env(safe-area-inset-top,0px)] ${menuOpen ? 'border-b border-white/10' : 'border-b border-[#004D43] shadow-sm'} transition-colors duration-200 px-4 sm:px-8 lg:px-12 ${className || ''}`}>
      <div className="w-full relative z-50">
        {/* Fixed-height row: every child is vertically centered, so top and
            bottom padding are equal by construction at every breakpoint. */}
        <div className="flex items-center justify-between h-14 lg:h-16">
          {/* Permanent static logo: never moves, scales, or animates during menu open/close */}
          <Link
            href="/"
            onClick={() => {
              setMenuOpen(false)
              handleNavClick('/')
            }}
            className="flex items-center gap-2.5 flex-shrink-0"
            aria-label="Ballina"
          >
                        <Image
              src="/logo-white.png"
              alt="Bleje Pronën"
              width={48}
              height={48}
              priority
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-contain block"
            />
          </Link>

          {/* Right nav section */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOmniSearchOpen(true)}
                className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#cceae8] hover:text-white border border-white/15 transition-all cursor-pointer text-[13.5px] font-medium group"
                aria-label="Kërko në Bleje Pronën"
              >
                <Search className="h-4 w-4 text-[#C8B882] group-hover:scale-110 transition-transform" />
                <span>Kërko</span>
                <kbd className="hidden xl:inline-flex items-center gap-0.5 text-[10px] font-mono bg-white/15 px-1.5 py-0.5 rounded text-white/80">
                  ⌘K
                </kbd>
              </button>

              <Link
                href="/listings"
                className={`relative inline-flex items-center h-10 text-[15px] px-3.5 rounded-lg transition-all duration-200 ${
                  pathname === '/listings'
                    ? 'text-white font-semibold after:absolute after:bottom-1 after:left-3.5 after:right-3.5 after:h-[2.5px] after:bg-[#C8B882] after:rounded-full'
                    : 'text-[#cceae8] font-medium hover:text-white hover:bg-[#004D43]'
                }`}
              >
                Shiko pronat
              </Link>
              {isLoggingOut ? (
                <div className="flex items-center gap-2 h-10 px-4 text-[14px] font-medium text-white/80">
                  <Loader2 className="h-4 w-4 animate-spin text-[#C8B882]" />
                  <span>Duke dalë...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 h-10" suppressHydrationWarning>
                  {/* 1. Logged in view (synchronously displayed if html[data-auth="logged-in"]) */}
                  <div
                    className={`items-center gap-2 ${
                      activeUser ? 'flex' : activeUser === null ? 'hidden' : 'hidden navbar-auth-logged-in'
                    }`}
                  >
                    <Link
                      href="/posto-prona"
                      className="inline-flex items-center justify-center h-10 rounded-xl px-4 gap-1.5 text-[15px] font-semibold whitespace-nowrap bg-white hover:bg-[#C8B882] shadow-sm transition-all duration-200 cursor-pointer text-[#00675B]"
                    >
                      <Plus className="h-4 w-4" />
                      Posto pronë
                    </Link>

                    {/* Messages */}
                    <Link
                      href="/mesazhet"
                      className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl text-[#b3d8d4] hover:text-white hover:bg-[#004D43] transition-all duration-200 cursor-pointer"
                      aria-label="Mesazhet"
                    >
                      <MessageCircle className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="badge-new absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>

                    {/* Custom dropdown */}
                    <div className="relative flex-shrink-0" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !dropdownOpen
                          setDropdownOpen(next)
                          if (next && userIdRef.current) {
                            loadProfile(userIdRef.current)
                          }
                        }}
                        className={`inline-flex items-center justify-center relative rounded-full w-10 h-10 transition-all duration-200 cursor-pointer flex-shrink-0 outline-none navbar-avatar-display ${
                          dropdownOpen
                            ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-[#00675B] shadow-md scale-105'
                            : 'ring-2 ring-white/30 hover:ring-white/80 hover:scale-105'
                        }`}
                        aria-label="Menyja e përdoruesit"
                        aria-expanded={dropdownOpen}
                        aria-haspopup="true"
                      >
                        <div className="relative w-10 h-10 rounded-full overflow-hidden">
                          <Image
                            src={getAvatarUrl(profile.avatarUrl)}
                            alt="Foto profili"
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                        {unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-bold border-2 border-[#00675B] rounded-full flex items-center justify-center shadow-xs">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </button>

                      {dropdownOpen && (
                        <div className="absolute right-0 top-full mt-2.5 w-80 sm:w-84 bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,100,89,0.22),0_10px_25px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,100,89,0.08)] border border-gray-100/90 p-2.5 z-50 text-[#101828] animate-in fade-in-0 zoom-in-95 duration-150 ease-out origin-top-right">
                          {/* User info header card */}
                          <div
                            className="p-3.5 rounded-2xl bg-gradient-to-br from-[#00675B]/[0.06] via-[#F2F7F7] to-[#C8B882]/[0.10] border border-[#00675B]/10 cursor-pointer hover:border-[#00675B]/30 hover:shadow-xs transition-all group"
                            onClick={() => {
                              closeDropdown()
                              router.push('/profili')
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 bg-white shadow-sm ring-2 ring-[#00675B]/15 group-hover:ring-[#00675B]/40 transition-all navbar-avatar-display">
                                <Image
                                  src={getAvatarUrl(profile.avatarUrl)}
                                  alt="Foto profili"
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-extrabold text-[#101828] group-hover:text-[#00675B] transition-colors truncate">
                                    {displayName}
                                  </p>
                                  {profile.isCompany ? (
                                    <Building2 className="w-3.5 h-3.5 text-[#00675B] shrink-0" />
                                  ) : (
                                    <ShieldCheck className="w-3.5 h-3.5 text-[#00675B] shrink-0" />
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                  {activeUser?.email || ''}
                                </p>
                                <div className="flex items-center justify-between gap-1.5 mt-1.5">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    profile.isCompany
                                      ? 'bg-[#00675B]/10 text-[#00675B] border border-[#00675B]/20'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  }`}>
                                    {profile.isCompany ? <Building2 className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                                    {profile.isCompany ? 'Kompani' : 'Individual'}
                                  </span>
                                  <span className="text-[10px] text-[#00675B] font-bold group-hover:underline flex items-center gap-0.5">
                                    Profili <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Profile Incomplete Alert */}
                          {profile.incomplete && (
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  closeDropdown()
                                  router.push(profile.isCompany ? '/completo-profilin-company' : '/completo-profilin-fast')
                                }}
                                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-300/60 hover:bg-amber-500/15 transition-all text-left group cursor-pointer"
                              >
                                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-700">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-amber-900 leading-tight">
                                    {profile.isCompany ? 'Verifiko kompaninë' : 'Plotëso profilin'}
                                  </p>
                                  <p className="text-[10px] text-amber-700 truncate">
                                    Shto të dhënat e plota për besueshmëri
                                  </p>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                              </button>
                            </div>
                          )}

                          {/* Grouped Actions */}
                          <div className="py-1.5 space-y-0.5">
                            {/* Posto Pronë */}
                            <button
                              type="button"
                              onClick={() => { closeDropdown(); router.push('/posto-prona') }}
                              className="flex items-center gap-3 w-full p-2 rounded-2xl hover:bg-[#00675B]/5 transition-all text-left group cursor-pointer"
                            >
                              <div className="w-9 h-9 rounded-xl bg-[#00675B]/10 text-[#00675B] group-hover:bg-[#00675B] group-hover:text-white flex items-center justify-center transition-all shadow-xs shrink-0">
                                <Plus className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-gray-900 group-hover:text-[#00675B] transition-colors leading-tight">
                                  Posto Pronë të Re
                                </p>
                                <p className="text-[11px] text-gray-400 group-hover:text-gray-500 transition-colors">
                                  Publikoni shpallje me foto & video
                                </p>
                              </div>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#C8B882]/20 text-[#00675B] border border-[#C8B882]/40 shrink-0">
                                Falas
                              </span>
                            </button>

                            {/* Pronat e Mia */}
                            <button
                              type="button"
                              onClick={() => { closeDropdown(); router.push('/postimet-e-mia') }}
                              className="flex items-center gap-3 w-full p-2 rounded-2xl hover:bg-gray-50 transition-all text-left group cursor-pointer"
                            >
                              <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 group-hover:bg-[#00675B] group-hover:text-white flex items-center justify-center transition-all shadow-xs shrink-0">
                                <Home className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-gray-900 group-hover:text-[#00675B] transition-colors leading-tight">
                                  Pronat e Mia
                                </p>
                                <p className="text-[11px] text-gray-400 group-hover:text-gray-500 transition-colors">
                                  Menaxhoni dhe modifikoni shpalljet
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#00675B] group-hover:translate-x-0.5 transition-all shrink-0" />
                            </button>

                            {/* Mesazhet */}
                            <button
                              type="button"
                              onClick={() => { closeDropdown(); router.push('/mesazhet') }}
                              className="flex items-center gap-3 w-full p-2 rounded-2xl hover:bg-gray-50 transition-all text-left group cursor-pointer"
                            >
                              <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 group-hover:bg-[#00675B] group-hover:text-white flex items-center justify-center transition-all shadow-xs shrink-0 relative">
                                <MessageCircle className="w-4 h-4" />
                                {unreadCount > 0 && (
                                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-gray-900 group-hover:text-[#00675B] transition-colors leading-tight">
                                  Mesazhet
                                </p>
                                <p className="text-[11px] text-gray-400 group-hover:text-gray-500 transition-colors">
                                  Bisedat me blerësit & pyetjet
                                </p>
                              </div>
                              {unreadCount > 0 ? (
                                <span className="bg-red-500 text-white text-[10px] font-black min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 shadow-xs">
                                  {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#00675B] group-hover:translate-x-0.5 transition-all shrink-0" />
                              )}
                            </button>

                            {/* Cilësimet */}
                            <button
                              type="button"
                              onClick={() => { closeDropdown(); router.push('/settings') }}
                              className="flex items-center gap-3 w-full p-2 rounded-2xl hover:bg-gray-50 transition-all text-left group cursor-pointer"
                            >
                              <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 group-hover:bg-[#00675B] group-hover:text-white flex items-center justify-center transition-all shadow-xs shrink-0">
                                <Settings className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-gray-900 group-hover:text-[#00675B] transition-colors leading-tight">
                                  Cilësimet
                                </p>
                                <p className="text-[11px] text-gray-400 group-hover:text-gray-500 transition-colors">
                                  Preferencat, njoftimet & siguria
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#00675B] group-hover:translate-x-0.5 transition-all shrink-0" />
                            </button>
                          </div>

                          {/* Footer: Logout */}
                          <div className="border-t border-gray-100/90 pt-1.5 mt-1">
                            <button
                              type="button"
                              onClick={openLogoutModal}
                              className="flex items-center gap-3 w-full p-2 rounded-2xl text-xs font-bold text-red-600 hover:bg-red-50/80 transition-all text-left group cursor-pointer"
                            >
                              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white flex items-center justify-center transition-all shadow-xs shrink-0">
                                <LogOut className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold leading-tight">Dil nga llogaria</p>
                                <p className="text-[10px] text-red-400/80">Mbyll sesionin në mënyrë të sigurt</p>
                              </div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Logged out view (synchronously displayed if html[data-auth="logged-out"]) */}
                  <div
                    className={`items-center gap-2 ${
                      activeUser === null ? 'flex' : activeUser ? 'hidden' : 'hidden navbar-auth-logged-out'
                    }`}
                  >
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center h-10 rounded-xl px-4 text-[15px] font-semibold text-[#cceae8] hover:text-white hover:bg-[#004D43] transition-all duration-200 cursor-pointer"
                    >
                      Hyr
                    </Link>
                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center h-10 rounded-xl px-4 text-[15px] font-semibold text-[#00675B] bg-white hover:bg-[#C8B882] shadow-sm transition-all duration-200 cursor-pointer"
                    >
                      Regjistrohu
                    </Link>
                  </div>

                  {/* 3. Skeleton view (only displayed while auth status is completely undetermined) */}
                  <div
                    className={`items-center ${
                      activeUser === undefined ? 'flex navbar-auth-skeleton' : 'hidden'
                    }`}
                  >
                    <div className="w-52 h-10" />
                  </div>
                </div>
              )}
            </div>

            {/* Mobile search button */}
            <button
              type="button"
              onClick={() => setIsOmniSearchOpen(true)}
              className="lg:hidden relative inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 border border-white/20 text-white shadow-sm transition-all cursor-pointer"
              aria-label="Kërko prona (Cmd+K)"
            >
              <Search className="h-4 w-4 text-white" />
            </button>

            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden relative inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 border border-white/20 text-white shadow-sm transition-all cursor-pointer overflow-hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Mbyll menunë' : 'Hap menunë'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <span className="sr-only">{menuOpen ? 'Mbyll menunë' : 'Hap menunë'}</span>
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Menu
                  className={`h-5 w-5 text-white stroke-[2.2] absolute transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    menuOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
                  }`}
                />
                <X
                  className={`h-5 w-5 text-white stroke-[2.2] absolute transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    menuOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
                  }`}
                />
              </div>
              {unreadCount > 0 && !menuOpen && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-[#00675B]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------- *
       * Mobile menu — full-screen sheet positioned directly below the
       * permanent header bar (which holds the static logo and toggle).
       * -------------------------------------------------------------- */}
      <div
        id="mobile-menu"
        inert={!menuOpen ? true : undefined}
        className={`lg:hidden fixed inset-0 z-40 w-full h-[100dvh] min-h-[100dvh] bg-[#00675B] flex flex-col overflow-hidden overscroll-none touch-none pt-[calc(3.5rem+env(safe-area-inset-top,0px))] transition-opacity duration-200 ease-out ${
          menuOpen
            ? 'visible opacity-100 pointer-events-auto'
            : 'invisible opacity-0 pointer-events-none'
        }`}
      >
        {/* Full-screen content: Section 1, 2, 3 high up near each other; footer at bottom */}
        <div
          id="mobile-menu-scrollable"
          className="flex-1 flex flex-col justify-between overflow-y-auto overscroll-contain touch-pan-y pt-3 sm:pt-4 pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.25rem))] px-4 sm:px-6"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between box-border">
            {/* Top Group: Section 1, Section 2, and Section 3 near each other with just a bit of space */}
            <div className="flex flex-col space-y-3.5 sm:space-y-4">
              {/* SECTION 1: High up right below top header */}
              <div id="section-1-account" suppressHydrationWarning>
                {/* 1. Mobile Logged-in Card (synchronously displayed if html[data-auth="logged-in"]) */}
                <div
                  className={`rounded-3xl bg-gradient-to-br from-white/[0.18] via-white/[0.10] to-white/[0.05] backdrop-blur-2xl p-4 border border-white/25 shadow-2xl text-white ${
                    activeUser ? 'block' : activeUser === null ? 'hidden' : 'hidden mobile-auth-logged-in'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative h-12 w-12 shrink-0 rounded-2xl overflow-hidden bg-white/20 border-2 border-white/40 flex items-center justify-center text-base font-bold text-white shadow-inner navbar-avatar-display">
                        <Image
                          src={getAvatarUrl(profile.avatarUrl)}
                          alt="Foto profili"
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm sm:text-base font-extrabold text-white leading-tight">
                            {displayName}
                          </p>
                          {profile.isCompany && (
                            <span className="shrink-0 inline-flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[#C8B882] text-[#00675B]">
                              PRO
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-white/75 mt-0.5">
                          {activeUser?.email || ''}
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/profili"
                      prefetch={true}
                      onClick={() => handleNavClick('/profili')}
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95 shadow-xs border border-white/20 cursor-pointer"
                    >
                      <span>Profili</span>
                      <ChevronRight className="h-3.5 w-3.5 text-white/80" />
                    </Link>
                  </div>

                  {/* 4-Item Quick Action Grid */}
                  <div className="mt-3.5 pt-3.5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Link
                      href="/postimet-e-mia"
                      prefetch={true}
                      onClick={() => handleNavClick('/postimet-e-mia')}
                      className="flex items-center sm:flex-col justify-start sm:justify-center gap-2.5 sm:gap-1 py-2.5 px-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] active:scale-95 text-xs font-bold text-white transition-all cursor-pointer border border-white/10"
                    >
                      <Home className="h-4 w-4 text-white/90 shrink-0" />
                      <span className="truncate text-[11px] sm:text-center">Pronat e Mia</span>
                    </Link>

                    <Link
                      href="/mesazhet"
                      prefetch={true}
                      onClick={() => handleNavClick('/mesazhet')}
                      className="relative flex items-center sm:flex-col justify-start sm:justify-center gap-2.5 sm:gap-1 py-2.5 px-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] active:scale-95 text-xs font-bold text-white transition-all cursor-pointer border border-white/10"
                    >
                      <div className="relative">
                        <MessageCircle className="h-4 w-4 text-white/90 shrink-0" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[#00675B]">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="truncate text-[11px] sm:text-center">Mesazhet</span>
                    </Link>

                    <Link
                      href="/settings"
                      prefetch={true}
                      onClick={() => handleNavClick('/settings')}
                      className="flex items-center sm:flex-col justify-start sm:justify-center gap-2.5 sm:gap-1 py-2.5 px-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] active:scale-95 text-xs font-bold text-white transition-all cursor-pointer border border-white/10"
                    >
                      <Settings className="h-4 w-4 text-white/90 shrink-0" />
                      <span className="truncate text-[11px] sm:text-center">Cilësimet</span>
                    </Link>

                    <Link
                      href="/posto-prona"
                      prefetch={true}
                      onClick={() => handleNavClick('/posto-prona')}
                      className="flex items-center sm:flex-col justify-start sm:justify-center gap-2.5 sm:gap-1 py-2.5 px-3 rounded-2xl bg-[#C8B882]/30 hover:bg-[#C8B882]/40 active:scale-95 text-xs font-bold text-white transition-all cursor-pointer border border-[#C8B882]/40"
                    >
                      <Plus className="h-4 w-4 text-[#C8B882] shrink-0" />
                      <span className="truncate text-[11px] sm:text-center">Posto Pronë</span>
                    </Link>
                  </div>

                  {profile.incomplete && (
                    <Link
                      href={profile.isCompany ? '/completo-profilin-company' : '/completo-profilin-fast'}
                      prefetch={true}
                      onClick={() => handleNavClick(profile.isCompany ? '/completo-profilin-company' : '/completo-profilin-fast')}
                      className="mt-3 flex items-center justify-between p-2.5 rounded-2xl bg-amber-500/25 border border-amber-400/40 text-xs font-medium text-amber-100 hover:bg-amber-500/35 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0" />
                        <span className="truncate">{profile.isCompany ? 'Verifiko kompaninë zyrtarisht' : 'Plotëso të dhënat e profilit'}</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-amber-300/80 shrink-0" />
                    </Link>
                  )}
                </div>

                {/* 2. Mobile Logged-out Card (synchronously displayed if html[data-auth="logged-out"]) */}
                <div
                  className={`rounded-2xl bg-white p-3.5 sm:p-4 shadow-xl border border-white/90 text-[#101828] ${
                    activeUser === null ? 'block' : activeUser ? 'hidden' : 'hidden mobile-auth-logged-out'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2.5 sm:mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#00675B]/10 border border-[#00675B]/15 flex items-center justify-center text-[#00675B] shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-bold text-[#101828] leading-tight">
                        Llogaria në Bleje Pronën
                      </p>
                      <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                        Kyçu ose regjistrohu për të menaxhuar shpalljet dhe mesazhet
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href="/register"
                      prefetch={true}
                      onClick={() => handleNavClick('/register')}
                      className="flex items-center justify-center h-10 sm:h-11 rounded-xl bg-[#00675B] hover:bg-[#004D43] active:bg-[#003d37] text-white text-sm font-bold shadow-md transition-colors cursor-pointer"
                    >
                      Regjistrohu
                    </Link>
                    <Link
                      href="/login"
                      prefetch={true}
                      onClick={() => handleNavClick('/login')}
                      className="flex items-center justify-center h-10 sm:h-11 rounded-xl border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-[#101828] text-sm font-bold transition-colors cursor-pointer"
                    >
                      Hyr
                    </Link>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Positioned near Section 1 */}
              <div id="section-2-properties" className="space-y-2">
                {/* Post property action card */}
                <Link
                  href={activeUser ? '/posto-prona' : '/register'}
                  prefetch={true}
                  onClick={() => handleNavClick(activeUser ? '/posto-prona' : '/register')}
                  className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-[#004D43] hover:bg-[#00453e] active:bg-[#003d37] border border-white/20 text-white shadow-md transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">Posto pronë të re</p>
                      <p className="text-[11px] text-white/75 truncate mt-0.5">Shpall banesë, shtëpi ose truall</p>
                    </div>
                  </div>
                  <div className="h-7 w-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <ChevronRight className="h-4 w-4 text-white/80" />
                  </div>
                </Link>

                {/* Property Quick Tabs */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/60 px-1">
                    Pronat
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Link
                      href="/listings"
                      prefetch={true}
                      onClick={() => handleNavClick('/listings')}
                      className="flex flex-col items-center justify-center py-2 px-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] active:bg-white/[0.18] border border-white/15 text-white text-center transition-colors cursor-pointer group"
                    >
                      <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-white/85 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold truncate w-full">Të gjitha</span>
                    </Link>
                    <Link
                      href="/listings?type=shitje"
                      prefetch={true}
                      onClick={() => handleNavClick('/listings?type=shitje')}
                      className="flex flex-col items-center justify-center py-2 px-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] active:bg-white/[0.18] border border-white/15 text-white text-center transition-colors cursor-pointer group"
                    >
                      <Home className="h-4 w-4 sm:h-5 sm:w-5 text-white/85 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold truncate w-full">Në shitje</span>
                    </Link>
                    <Link
                      href="/listings?type=qira"
                      prefetch={true}
                      onClick={() => handleNavClick('/listings?type=qira')}
                      className="flex flex-col items-center justify-center py-2 px-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] active:bg-white/[0.18] border border-white/15 text-white text-center transition-colors cursor-pointer group"
                    >
                      <Key className="h-4 w-4 sm:h-5 sm:w-5 text-white/85 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold truncate w-full">Me qira</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Quick city navigation near Section 2 */}
              <div id="section-3-cities" className="space-y-1.5" style={{ contentVisibility: 'visible' }}>
                <div className="flex items-center justify-between px-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-white/70" />
                    Qytetet kryesore
                  </p>
                  <Link
                    href="/listings"
                    prefetch={true}
                    onClick={() => handleNavClick('/listings')}
                    className="text-[11px] font-semibold text-white/70 hover:text-white transition-colors"
                  >
                    Të gjitha →
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {CITIES.map((city) => (
                    <Link
                      key={city}
                      href={`/listings?city=${encodeURIComponent(city)}`}
                      prefetch={true}
                      onClick={() => handleNavClick(`/listings?city=${encodeURIComponent(city)}`)}
                      className="flex items-center justify-center h-8 sm:h-8.5 px-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] active:bg-white/[0.2] border border-white/15 text-xs font-semibold text-white transition-colors text-center truncate cursor-pointer"
                    >
                      {city}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* ONLY: "kushtet, kontakti, privatesia" stays at the bottom */}
            <div id="section-footer" className="mt-auto pt-3 pb-1 border-t border-white/15 space-y-2.5">
              {isLoggingOut ? (
                <div className="flex items-center justify-center gap-2 h-9 w-full rounded-xl bg-white/10 text-xs font-medium text-white/80">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Duke dalë...
                </div>
              ) : activeUser ? (
                <button
                  type="button"
                  onClick={openLogoutModal}
                  className="flex items-center justify-center gap-2 h-9 w-full rounded-xl border border-red-400/30 bg-red-500/15 hover:bg-red-500/25 text-xs font-bold text-red-200 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Dil nga llogaria
                </button>
              ) : null}

              <div className="flex items-center justify-center gap-5 sm:gap-6 text-xs text-white/65 font-medium">
                <Link
                  href="/kontakti"
                  prefetch={true}
                  onClick={() => handleNavClick('/kontakti')}
                  className="hover:text-white transition-colors"
                >
                  Kontakti
                </Link>
                <span className="text-white/30">·</span>
                <Link
                  href="/kushtet"
                  prefetch={true}
                  onClick={() => handleNavClick('/kushtet')}
                  className="hover:text-white transition-colors"
                >
                  Kushtet
                </Link>
                <span className="text-white/30">·</span>
                <Link
                  href="/privatesia"
                  prefetch={true}
                  onClick={() => handleNavClick('/privatesia')}
                  className="hover:text-white transition-colors"
                >
                  Privatësia
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LogoutModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        userEmail={activeUser?.email}
        userName={displayName}
        avatarUrl={profile.avatarUrl}
        onLogoutConfirmed={handleLogout}
      />

      <OmniSearchModal
        isOpen={isOmniSearchOpen}
        onClose={() => setIsOmniSearchOpen(false)}
      />
    </nav>
  )
}
