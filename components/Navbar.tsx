'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Plus, User, LogOut, MessageCircle } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { Logo } from '@/components/Logo'

// Singleton Supabase client so we don't recreate it on every mount
const _supabaseClient = createClient()

interface NavbarProps {
  variant?: 'fixed' | 'absolute' | 'static'
  className?: string
}

export default function Navbar({ variant = 'fixed', className }: NavbarProps) {
  // undefined = still checking session, null = logged out, object = logged in
  const [user, setUser] = useState<SupabaseUser | null | undefined>(undefined)
  const [profile, setProfile] = useState({ incomplete: false, firstName: '', avatarUrl: '' })
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const realtimeChannelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)
  const userIdRef = useRef<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(_supabaseClient)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const unreadChannelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)

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

  useEffect(() => {
    const supabase = supabaseRef.current
    let currentUserId: string | null = null

    const loadProfile = async (userId: string) => {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('first_name, email_verified, avatar_url')
        .eq('id', userId)
        .single()

      if (profileErr) {
        console.error('Navbar profile fetch error:', JSON.stringify(profileErr))
      }

      setProfile({
        incomplete: !profile?.first_name || !profile?.email_verified,
        firstName: profile?.email_verified ? profile?.first_name || '' : '',
        avatarUrl: profile?.avatar_url || '',
      })
    }

    // ---- debouncedFetch: prevents rapid-fire DB queries from Realtime events ----
    const debouncedFetch = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => fetchUnreadCount(), 400)
    }

    // ---- Set up Realtime channel ONCE per user session ----
    const setupRealtimeChannel = (uid: string) => {
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
      currentUserId = user?.id ?? null
      userIdRef.current = user?.id ?? null
      if (user) {
        loadProfile(user.id)
        setupRealtimeChannel(user.id)
        fetchUnreadCount()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUserId) {
        loadProfile(currentUserId)
        fetchUnreadCount()
      }
    }

    // Set up the auth listener first. Supabase fires INITIAL_SESSION
    // immediately on subscription with the current session (or null),
    // giving us the correct initial state without a separate getUser()
    // network round-trip that causes the auth flash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          currentUserId = null
          userIdRef.current = null
          setProfile({ incomplete: false, firstName: '', avatarUrl: '' })
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
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) {
              localStorage.removeItem(key)
            }
          })
          router.refresh()
          return
        }

        if (
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          setCurrentUser(session?.user ?? null)
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
    }
  }, [router, fetchUnreadCount])

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

  const closeDropdown = useCallback(() => setDropdownOpen(false), [])

  const handleLogout = useCallback(async () => {
    // 1. Reset ALL UI state immediately so the navbar flips to Login/Register
    setDropdownOpen(false)
    setMenuOpen(false)
    setUser(null)
    setProfile({ incomplete: false, firstName: '', avatarUrl: '' })

    // 2. Sign out on the client (global scope clears both local and server session)
    try {
      await supabaseRef.current.auth.signOut({ scope: 'global' })
    } catch (err) {
      console.error('Client sign out exception:', err)
    }

    // 3. Manually clear ALL Supabase localStorage keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key)
      }
    })

    // 4. Call server-side logout to clear cookies with correct domain
    try {
      await fetch('/api/logout', { method: 'POST' })
    } catch (err) {
      console.error('Server logout API call failed:', err)
    }

    // 5. Hard redirect to home so middleware runs with fully cleared state
    window.location.replace('/')
  }, [])

  const positionClasses = {
    fixed: 'fixed top-0 left-0 right-0 z-50',
    absolute: 'absolute top-0 left-0 right-0 z-50',
    static: 'relative z-50',
  }[variant]

  return (
    <nav className={`${positionClasses} bg-white border-b border-[#F3F4F6] shadow-[0_1px_0_#E5E7EB] overflow-visible ${className || ''}`}>
      <div className="max-w-[1800px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0 [&_img]:brightness-0 transition-transform duration-200 hover:scale-105">
            <Logo variant="navbar" className="h-8" />
          </Link>

          {/* Right nav section */}
          <div className="flex items-center min-w-0">
            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center space-x-6">
              <Link
                href="/listings"
                className={`text-[14px] font-medium px-3.5 py-2 rounded-lg transition-all duration-200 ${
                  pathname === '/listings'
                    ? 'text-[#111827] bg-[#F3F4F6] font-semibold'
                    : 'text-[#374151] hover:text-[#111827] hover:bg-[#F3F4F6]'
                }`}
              >
                Shiko banesat
              </Link>
              {user === undefined ? (
                <div className="w-52 h-10" />
              ) : user === null ? (
                <div className="flex items-center gap-2">
                  <a
                    href="/login"
                    className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-[14px] font-semibold text-[#374151] hover:text-[#111827] hover:bg-[#F3F4F6] transition-all duration-200 cursor-pointer"
                  >
                    Hyr
                  </a>
                  <a
                    href="/register"
                    className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-[14px] font-semibold text-white bg-[#111827] hover:bg-[#374151] shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    Regjistrohu
                  </a>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => router.push('/posto-banese')}
                    className="inline-flex items-center justify-center rounded-xl px-4 py-2 gap-1.5 text-[14px] font-semibold whitespace-nowrap bg-[#111827] hover:bg-[#0A0A0A] shadow-sm transition-all duration-200 cursor-pointer text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Posto banesë
                  </button>

                  {/* Messages */}
                  <button
                    type="button"
                    onClick={() => router.push('/mesazhet')}
                    className="relative p-2 rounded-xl text-[#6B7280] hover:text-[#374151] hover:bg-[#F3F4F6] transition-all duration-200 cursor-pointer"
                    aria-label="Mesazhet"
                  >
                    <MessageCircle className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="badge-new absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Custom dropdown - no Base UI, no layout shifts */}
                  <div className="relative flex-shrink-0" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="inline-flex items-center justify-center relative overflow-hidden rounded-full w-9 h-9 bg-[#111827] text-white text-sm font-bold hover:bg-[#1F2937] transition-colors cursor-pointer flex-shrink-0 outline-none border border-gray-200"
                      aria-label="Menyja e përdoruesit"
                      aria-expanded={dropdownOpen}
                      aria-haspopup="true"
                    >
                      {profile.avatarUrl ? (
                        <Image src={profile.avatarUrl} alt="Foto profili" fill sizes="36px" className="object-cover rounded-full" />
                      ) : (
                        (profile.firstName || user?.email || '?')[0].toUpperCase()
                      )}
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 text-[#1A1A2E]">
                        {/* User info header */}
                        <div
                          className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors group"
                          onClick={() => { closeDropdown(); router.push('/profili') }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-[#1A1A2E] flex-shrink-0 overflow-hidden">
                              {profile.avatarUrl ? (
                                <Image src={profile.avatarUrl} alt="Foto profili" width={36} height={36} className="object-cover" />
                              ) : (
                                (profile.firstName || user?.email || '?')[0].toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-400 group-hover:text-gray-600 font-medium mb-1">Profili im →</p>
                              {!profile.incomplete && (
                                <p className="text-sm font-medium text-[#1A1A2E] truncate">
                                  {profile.firstName || user?.email?.split('@')[0] || 'Përdorues'}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                              {profile.incomplete && (
                                <span className="inline-flex items-center mt-1 text-xs text-orange-500">
                                  ⚠️ Verifiko profilin
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-100 my-1" />

                        <button
                          type="button"
                          onClick={() => { closeDropdown(); router.push('/mesazhet') }}
                          className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <MessageCircle className="h-4 w-4 mr-3 text-gray-400" />
                          Mesazhet
                          {unreadCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => { closeDropdown(); router.push('/posto-banese') }}
                          className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <Plus className="h-4 w-4 mr-3 text-gray-400" />
                          Posto banesë
                        </button>

                        <button
                          type="button"
                          onClick={() => { closeDropdown(); router.push('/postimet-e-mia') }}
                          className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <User className="h-4 w-4 mr-3 text-gray-400" />
                          Banesat e mia
                        </button>

                        <div className="border-t border-gray-100 my-1" />

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Dil
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden relative w-11 h-11 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer group"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Mbyll menunë' : 'Hap menunë'}
              aria-expanded={menuOpen}
            >
              <span className="sr-only">{menuOpen ? 'Mbyll menunë' : 'Hap menunë'}</span>
              <span className="relative w-5 h-[14px] flex flex-col justify-between">
                {/* Top bar */}
                <span
                  className={`block h-[2px] w-full rounded-full bg-[#374151] origin-center transition-all duration-300 ease-out ${
                    menuOpen ? 'translate-y-[6px] rotate-45' : ''
                  }`}
                />
                {/* Middle bar — fades out when open */}
                <span
                  className={`block h-[2px] rounded-full bg-[#374151] origin-center transition-all duration-200 ease-out ${
                    menuOpen ? 'w-0 opacity-0' : 'w-full opacity-100'
                  }`}
                />
                {/* Bottom bar */}
                <span
                  className={`block h-[2px] w-full rounded-full bg-[#374151] origin-center transition-all duration-300 ease-out ${
                    menuOpen ? '-translate-y-[6px] -rotate-45' : ''
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div id="mobile-menu" className="lg:hidden border-t border-gray-200 bg-white py-4 space-y-3">
            <Link href="/listings" className={`block px-4 py-3 rounded-lg text-[14px] font-medium transition-all duration-200 ${pathname === '/listings' ? 'text-[#111827] bg-[#F3F4F6] font-semibold' : 'text-[#374151] hover:text-[#111827] hover:bg-[#F3F4F6]'}`}>
              Shiko banesat
            </Link>
            {user === undefined ? null : user === null ? (
              <div className="space-y-2">
                <a href="/login" className="flex items-center justify-center w-full rounded-xl px-5 py-2.5 text-sm font-semibold text-[#374151] hover:text-[#111827] hover:bg-[#F3F4F6] transition-all duration-200 cursor-pointer">Hyr</a>
                <a href="/register" className="flex items-center justify-center w-full rounded-xl px-5 py-2.5 text-sm font-semibold text-white bg-[#111827] hover:bg-[#374151] transition-all duration-200 cursor-pointer shadow-sm">Regjistrohu</a>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-1 py-2">
                  {profile.avatarUrl ? (
                    <Image src={profile.avatarUrl} alt="Foto profili" width={36} height={36} className="rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-full w-9 h-9 bg-[#111827] text-white text-sm font-bold shrink-0">
                      {(profile.firstName || user?.email || '?')[0].toUpperCase()}
                    </span>
                  )}
                  <span className="text-sm font-medium text-[#1A1A2E] truncate">
                    {profile.firstName || user?.email?.split('@')[0] || 'Përdorues'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { router.push('/posto-banese'); setMenuOpen(false) }}
                  className="inline-flex items-center justify-center w-full rounded-lg bg-[#111827] hover:bg-[#1F2937] text-white px-5 py-2 text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Posto banesë
                </button>
                <button
                  onClick={() => { router.push('/mesazhet'); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full text-left text-gray-700 hover:text-[#111827] hover:bg-gray-50 rounded-lg px-4 py-2.5 font-medium cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  Mesazhet
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { router.push('/profili'); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full text-left text-gray-700 hover:text-[#111827] hover:bg-gray-50 rounded-lg px-4 py-2.5 font-medium cursor-pointer"
                >
                  <User className="h-4 w-4" />
                  Profili & Banesat e Mia
                </button>
                <div className="border-t border-gray-200 pt-2">
                  <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg px-4 py-2.5 font-semibold cursor-pointer">
                    <LogOut className="h-4 w-4" />
                    Dil
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
