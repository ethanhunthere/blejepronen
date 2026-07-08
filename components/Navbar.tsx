'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Plus, User, LogOut, Menu, X } from 'lucide-react'
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
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(_supabaseClient)
  const router = useRouter()

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

    const checkSession = async () => {
      try {
        // getUser() always validates the token with the server and never
        // returns a cached/stale session, preventing post-logout flashes.
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()
        if (error) {
          console.error('Navbar getUser error:', error.message)
        }

        const user = currentUser ?? null
        setUser(user)
        currentUserId = user?.id ?? null

        if (user) {
          loadProfile(user.id)
        }
      } catch (err) {
        console.error('Navbar session check failed:', err instanceof Error ? err.message : err)
        setUser(null)
        currentUserId = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUserId) {
        loadProfile(currentUserId)
      }
    }

    let subscription: { unsubscribe: () => void } | null = null

    // 1. First validate the session server-side, then set up the listener.
    // This prevents onAuthStateChange from firing with stale cached data
    // before getUser() has had a chance to correct the initial state.
    checkSession().then(() => {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_OUT') {
            setUser(null)
            currentUserId = null
            setProfile({ incomplete: false, firstName: '', avatarUrl: '' })
            setDropdownOpen(false)
            setMenuOpen(false)
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-')) {
                localStorage.removeItem(key)
              }
            })
            router.refresh()
            return
          }

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            const currentUser = session?.user ?? null
            setUser(currentUser)
            currentUserId = currentUser?.id ?? null
            if (currentUser) {
              loadProfile(currentUser.id)
            }
            return
          }

          const currentUser = session?.user ?? null
          setUser(currentUser)
          currentUserId = currentUser?.id ?? null

          if (currentUser) {
            loadProfile(currentUser.id)
          } else {
            setProfile({ incomplete: false, firstName: '', avatarUrl: '' })
          }
        }
      )

      subscription = sub

      document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    return () => {
      subscription?.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [router])

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
    <nav className={`${positionClasses} bg-transparent overflow-visible border-none ${className || ''}`}>
      <div className="max-w-[1800px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20 2xl:h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0 [&_img]:brightness-0 [&_img]:invert">
            <Logo variant="navbar" className="h-8 2xl:h-10 2xl:w-56" />
          </Link>

          {/* Right nav section */}
          <div className="flex items-center min-w-0">
            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center space-x-6">
              <Link href="/listings" className="font-medium text-white hover:text-white/80 transition-colors 2xl:text-base">
                Shiko banesat
              </Link>
              {user === undefined ? (
                <div className="w-52 h-10" />
              ) : user === null ? (
                <div className="flex items-center gap-2">
                  <a
                    href="/login"
                    className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer backdrop-blur-sm"
                  >
                    Hyr
                  </a>
                  <a
                    href="/register"
                    className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white bg-[#1B4FFF] hover:bg-[#1640CC] transition-colors cursor-pointer shadow-lg shadow-[#1B4FFF]/25"
                  >
                    Regjistrohu
                  </a>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => router.push('/posto-banese')}
                    className="inline-flex items-center justify-center rounded-lg px-5 py-2 2xl:px-7 2xl:py-3 gap-1.5 text-sm font-semibold whitespace-nowrap bg-white text-[#1B4FFF] hover:bg-white/90 transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Posto banesë
                  </button>
                  {/* Custom dropdown — no Base UI, no layout shifts */}
                  <div className="relative flex-shrink-0" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="inline-flex items-center justify-center rounded-full w-10 h-10 bg-[#1B4FFF] text-white text-sm font-bold hover:bg-[#1640CC] transition-colors cursor-pointer flex-shrink-0 outline-none"
                      aria-label="Menyja e përdoruesit"
                      aria-expanded={dropdownOpen}
                      aria-haspopup="true"
                    >
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        (profile.firstName || user?.email || '?')[0].toUpperCase()
                      )}
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-[#0A0F2E] rounded-lg shadow-lg border border-white/10 py-1 z-50">
                        {/* User info header */}
                        <div
                          className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors group"
                          onClick={() => { closeDropdown(); router.push('/profili') }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 overflow-hidden">
                              {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                (profile.firstName || user?.email || '?')[0].toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-white/40 group-hover:text-white/60 font-medium mb-1">Profili im →</p>
                              {!profile.incomplete && (
                                <p className="text-sm font-medium text-white truncate">
                                  {profile.firstName || user?.email?.split('@')[0] || 'Përdorues'}
                                </p>
                              )}
                              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                              {profile.incomplete && (
                                <span className="inline-flex items-center mt-1 text-xs text-orange-400">
                                  ⚠️ Verifiko profilin
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-white/10 my-1" />

                        <button
                          type="button"
                          onClick={() => { closeDropdown(); router.push('/posto-banese') }}
                          className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <Plus className="h-4 w-4 mr-3 text-slate-400" />
                          Posto banesë
                        </button>

                        <button
                          type="button"
                          onClick={() => { closeDropdown(); router.push('/postimet-e-mia') }}
                          className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <User className="h-4 w-4 mr-3 text-slate-400" />
                          Banesat e mia
                        </button>

                        <div className="border-t border-white/10 my-1" />

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2.5 text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
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
              className="lg:hidden p-2 rounded-lg min-h-11 min-w-11 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Mbyll menunë' : 'Hap menunë'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div id="mobile-menu" className="lg:hidden border-t border-white/10 bg-[#0A0F2E]/95 backdrop-blur-md py-4 space-y-3">
            <Link href="/listings" className="block text-white/90 hover:text-white font-medium py-3">
              Shiko banesat
            </Link>
            {user === undefined ? null : user === null ? (
              <div className="space-y-2">
                <a href="/login" className="flex items-center justify-center w-full rounded-full px-5 py-2.5 text-sm font-semibold text-white border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer backdrop-blur-sm">Hyr</a>
                <a href="/register" className="flex items-center justify-center w-full rounded-full px-5 py-2.5 text-sm font-semibold text-white bg-[#1B4FFF] hover:bg-[#1640CC] transition-colors cursor-pointer shadow-lg shadow-[#1B4FFF]/25">Regjistrohu</a>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-1 py-2">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="rounded-full w-9 h-9 object-cover shrink-0" />
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-full w-9 h-9 bg-[#1B4FFF] text-white text-sm font-bold shrink-0">
                      {(profile.firstName || user?.email || '?')[0].toUpperCase()}
                    </span>
                  )}
                  <span className="text-sm font-medium text-white truncate">
                    {profile.firstName || user?.email?.split('@')[0] || 'Përdorues'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { router.push('/posto-banese'); setMenuOpen(false) }}
                  className="inline-flex items-center justify-center w-full rounded-lg bg-[#1B4FFF] hover:bg-[#1640CC] text-white px-5 py-2 text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Posto banesë
                </button>
                <button
                  onClick={() => { router.push('/profili'); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full text-left text-white/80 hover:text-white hover:bg-white/5 rounded-lg px-4 py-2.5 font-medium cursor-pointer"
                >
                  <User className="h-4 w-4" />
                  Profili & Banesat e Mia
                </button>
                <div className="border-t border-white/10 pt-2">
                  <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg px-4 py-2.5 font-semibold cursor-pointer">
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
