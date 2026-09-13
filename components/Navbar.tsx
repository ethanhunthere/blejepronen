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
} from 'lucide-react'
import { CITIES } from '@/lib/cities'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import LogoutModal from './LogoutModal'
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
  const realtimeChannelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)
  const userIdRef = useRef<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(_supabaseClient)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const isAuthPage = pathname === '/register' || pathname === '/login' || pathname === '/forgot-password'
  const unreadChannelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)

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

  // Lock document and theme color to brand teal #006459 across all / pages and navigation
  useEffect(() => {
    document.documentElement.style.backgroundColor = '#006459'
    document.body.style.backgroundColor = '#006459'
    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) metaTheme.setAttribute('content', '#006459')
  }, [pathname])

  // Mobile menu: clean scroll lock without layout shifts & enforce #006459 theme color
  useEffect(() => {
    if (!menuOpen) return

    const prevOverflow = document.body.style.overflow
    const prevTouchAction = document.body.style.touchAction

    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    document.documentElement.style.backgroundColor = '#006459'
    document.body.style.backgroundColor = '#006459'

    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute('content', '#006459')
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.touchAction = prevTouchAction
      document.documentElement.style.backgroundColor = '#006459'
      document.body.style.backgroundColor = '#006459'
      if (metaTheme) {
        metaTheme.setAttribute('content', '#006459')
      }
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
    <nav className={`${positionClasses} bg-[#006459] pt-[env(safe-area-inset-top,0px)] ${menuOpen ? 'border-b border-white/10' : 'border-b border-[#005048] shadow-sm'} transition-colors duration-200 px-4 sm:px-8 lg:px-12 ${className || ''}`}>
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
              src="/logo-icon.png"
              alt="Bleje Pronën"
              width={32}
              height={32}
              priority
              className="h-8 w-8 rounded-lg object-contain block"
            />
          </Link>

          {/* Right nav section */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/listings"
                className={`relative inline-flex items-center h-10 text-[15px] px-3.5 rounded-lg transition-all duration-200 ${
                  pathname === '/listings'
                    ? 'text-white font-semibold after:absolute after:bottom-1 after:left-3.5 after:right-3.5 after:h-[2.5px] after:bg-[#C8B882] after:rounded-full'
                    : 'text-[#cceae8] font-medium hover:text-white hover:bg-[#005048]'
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
                      className="inline-flex items-center justify-center h-10 rounded-xl px-4 gap-1.5 text-[15px] font-semibold whitespace-nowrap bg-white hover:bg-[#C8B882] shadow-sm transition-all duration-200 cursor-pointer text-[#006459]"
                    >
                      <Plus className="h-4 w-4" />
                      Posto pronë
                    </Link>

                    {/* Messages */}
                    <Link
                      href="/mesazhet"
                      className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl text-[#b3d8d4] hover:text-white hover:bg-[#005048] transition-all duration-200 cursor-pointer"
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
                        className="inline-flex items-center justify-center relative overflow-hidden rounded-full w-10 h-10 bg-white text-[#006459] text-sm font-bold hover:bg-[#C8B882] transition-colors cursor-pointer flex-shrink-0 outline-none navbar-avatar-display"
                        aria-label="Menyja e përdoruesit"
                        aria-expanded={dropdownOpen}
                        aria-haspopup="true"
                      >
                        <Image
                          src={getAvatarUrl(profile.avatarUrl)}
                          alt="Foto profili"
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </button>

                      {dropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 text-[#101828]">
                          {/* User info header */}
                          <div
                            className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors group"
                            onClick={() => {
                              closeDropdown()
                              router.push('/profili')
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center text-sm font-semibold text-[#101828] navbar-avatar-display">
                                <Image
                                  src={getAvatarUrl(profile.avatarUrl)}
                                  alt="Foto profili"
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-gray-500 group-hover:text-gray-600 font-medium mb-1">
                                  {profile.incomplete ? (profile.isCompany ? 'Verifiko kompaninë →' : 'Verifiko profilin →') : 'Profili im →'}
                                </p>
                                {!profile.incomplete && (
                                  <p className="text-sm font-medium text-[#101828] truncate">
                                    {displayName}
                                  </p>
                                )}
                                <p className="text-xs text-gray-600 truncate">{activeUser?.email}</p>
                                {profile.incomplete && (
                                  <span className="inline-flex items-center mt-1 text-xs font-semibold text-amber-600">
                                    ⚠️ {profile.isCompany ? 'Verifiko kompaninë' : 'Verifiko profilin'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {profile.incomplete && (
                            <>
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  closeDropdown()
                                  router.push(profile.isCompany ? '/completo-profilin-company' : '/completo-profilin-fast')
                                }}
                                className="flex items-center w-full px-4 py-2.5 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer"
                              >
                                <AlertTriangle className="h-4 w-4 mr-3 text-amber-600" />
                                {profile.isCompany ? 'Verifiko kompaninë' : 'Verifiko profilin'}
                              </button>
                            </>
                          )}

                          <div className="border-t border-gray-100 my-1" />

                          <button
                            type="button"
                            onClick={() => { closeDropdown(); router.push('/mesazhet') }}
                            className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <MessageCircle className="h-4 w-4 mr-3 text-gray-500" />
                            Mesazhet
                            {unreadCount > 0 && (
                              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                                {unreadCount > 9 ? '9+' : unreadCount}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => { closeDropdown(); router.push('/postimet-e-mia') }}
                            className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <User className="h-4 w-4 mr-3 text-gray-500" />
                            Pronat e mia
                          </button>

                          <div className="border-t border-gray-100 my-1" />

                          <button
                            type="button"
                            onClick={openLogoutModal}
                            className="flex items-center w-full px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <LogOut className="h-4 w-4 mr-3 text-red-500" />
                            Dil
                          </button>
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
                      className="inline-flex items-center justify-center h-10 rounded-xl px-4 text-[15px] font-semibold text-[#cceae8] hover:text-white hover:bg-[#005048] transition-all duration-200 cursor-pointer"
                    >
                      Hyr
                    </Link>
                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center h-10 rounded-xl px-4 text-[15px] font-semibold text-[#006459] bg-white hover:bg-[#C8B882] shadow-sm transition-all duration-200 cursor-pointer"
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
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-[#006459]" />
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
        className={`lg:hidden fixed inset-0 z-40 w-full h-[100dvh] min-h-[100dvh] bg-[#006459] flex flex-col overflow-hidden pt-[calc(3.5rem+env(safe-area-inset-top,0px))] transition-opacity duration-200 ease-out ${
          menuOpen
            ? 'visible opacity-100 pointer-events-auto'
            : 'invisible opacity-0 pointer-events-none'
        }`}
      >
        {/* Full-screen content: Section 1, 2, 3 high up near each other; footer at bottom */}
        <div
          id="mobile-menu-scrollable"
          className="flex-1 flex flex-col justify-between overflow-y-auto overscroll-contain pt-3 sm:pt-4 pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.25rem))] px-4 sm:px-6"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between box-border">
            {/* Top Group: Section 1, Section 2, and Section 3 near each other with just a bit of space */}
            <div className="flex flex-col space-y-3.5 sm:space-y-4">
              {/* SECTION 1: High up right below top header */}
              <div id="section-1-account" suppressHydrationWarning>
                {/* 1. Mobile Logged-in Card (synchronously displayed if html[data-auth="logged-in"]) */}
                <div
                  className={`rounded-2xl bg-white/10 border border-white/20 p-3.5 sm:p-4 shadow-sm text-white ${
                    activeUser ? 'block' : activeUser === null ? 'hidden' : 'hidden mobile-auth-logged-in'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-11 w-11 shrink-0 rounded-2xl overflow-hidden bg-white/20 border border-white/25 flex items-center justify-center text-base font-bold text-white shadow-inner navbar-avatar-display">
                        <Image
                          src={getAvatarUrl(profile.avatarUrl)}
                          alt="Foto profili"
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm sm:text-base font-bold text-white leading-tight">
                          {displayName}
                        </p>
                        <p className="truncate text-xs text-white/70 mt-0.5">
                          {activeUser?.email || ''}
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/profili"
                      prefetch={true}
                      onClick={() => handleNavClick('/profili')}
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                    >
                      <span>Profili</span>
                      <ChevronRight className="h-3.5 w-3.5 text-white/70" />
                    </Link>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
                    <Link
                      href="/postimet-e-mia"
                      prefetch={true}
                      onClick={() => handleNavClick('/postimet-e-mia')}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Home className="h-4 w-4 text-white/80 shrink-0" />
                        <span className="truncate">Pronat e mia</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-white/40 shrink-0" />
                    </Link>
                    <Link
                      href="/mesazhet"
                      prefetch={true}
                      onClick={() => handleNavClick('/mesazhet')}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MessageCircle className="h-4 w-4 text-white/80 shrink-0" />
                        <span className="truncate">Mesazhet</span>
                      </div>
                      {unreadCount > 0 ? (
                        <span className="h-4 min-w-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-white/40 shrink-0" />
                      )}
                    </Link>
                  </div>

                  {profile.incomplete && (
                    <Link
                      href={profile.isCompany ? '/completo-profilin-company' : '/completo-profilin-fast'}
                      prefetch={true}
                      onClick={() => handleNavClick(profile.isCompany ? '/completo-profilin-company' : '/completo-profilin-fast')}
                      className="mt-2.5 flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-xs font-medium text-amber-200 hover:bg-amber-500/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                        <span>{profile.isCompany ? 'Verifiko kompaninë' : 'Plotëso profilin tënd'}</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-amber-400/60 shrink-0" />
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
                    <div className="w-9 h-9 rounded-xl bg-[#006459]/10 border border-[#006459]/15 flex items-center justify-center text-[#006459] shrink-0">
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
                      className="flex items-center justify-center h-10 sm:h-11 rounded-xl bg-[#006459] hover:bg-[#005048] active:bg-[#003d37] text-white text-sm font-bold shadow-md transition-colors cursor-pointer"
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
                  className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-[#005048] hover:bg-[#00453e] active:bg-[#003d37] border border-white/20 text-white shadow-md transition-colors cursor-pointer group"
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
    </nav>
  )
}
