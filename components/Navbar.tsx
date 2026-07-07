'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Plus, User, LogOut, Menu, X, AlertTriangle, Settings } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { Logo } from '@/components/Logo'

// Singleton Supabase client so we don't recreate it on every mount
const _supabaseClient = createClient()

interface NavbarProps {
  variant?: 'fixed' | 'absolute' | 'static'
  className?: string
}

// Synchronously read the Supabase auth token from localStorage so the navbar
// can render the right-side buttons immediately on hydration.
function getStoredUser(): SupabaseUser | null {
  if (typeof window === 'undefined') return null
  try {
    const key = Object.keys(localStorage).find(k => /^sb-.+-auth-token$/.test(k))
    if (!key) return null
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.user ?? null
  } catch {
    return null
  }
}

export default function Navbar({ variant = 'fixed', className }: NavbarProps) {
  // null = logged out, object = logged in. Initial value is read synchronously
  // from localStorage so the buttons never wait for getSession().
  const [user, setUser] = useState<SupabaseUser | null>(() => getStoredUser())
  const [profileIncomplete, setProfileIncomplete] = useState(false)
  const [profileFirstName, setProfileFirstName] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(_supabaseClient)
  const router = useRouter()

  useEffect(() => {
    const supabase = supabaseRef.current

    const loadProfile = async (userId: string) => {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('first_name, phone_verified')
        .eq('id', userId)
        .single()

      if (profileErr) {
        console.error('Navbar profile fetch error:', JSON.stringify(profileErr))
      }

      setProfileIncomplete(!profile?.first_name)
      setProfileFirstName(profile?.first_name || '')
    }

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const currentUser = session?.user ?? null
        // Show navbar buttons immediately; don't wait for profile
        setUser(currentUser)

        if (currentUser) {
          loadProfile(currentUser.id)
        }
      } catch (err) {
        console.error('Navbar session check failed:', err instanceof Error ? err.message : err)
        // getSession threw — treat as logged out
        setUser(null)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfileIncomplete(false)
          setProfileFirstName('')
          setDropdownOpen(false)
          setMenuOpen(false)
          router.refresh()
          return
        }

        const currentUser = session?.user ?? null
        // Update UI immediately; profile loads in the background
        setUser(currentUser)

        if (event === 'SIGNED_IN') {
          router.refresh()
        }

        if (currentUser) {
          loadProfile(currentUser.id)
        } else {
          setProfileIncomplete(false)
          setProfileFirstName('')
        }
      }
    )

    return () => subscription.unsubscribe()
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
    setProfileIncomplete(false)
    setProfileFirstName('')

    // 2. Also sign out on the client side to clear in-memory auth state
    try {
      await supabaseRef.current.auth.signOut()
    } catch (err) {
      console.error('Client sign out exception:', err)
    }

    // 3. Call server-side logout to clear cookies with correct domain
    try {
      await fetch('/api/logout', { method: 'POST' })
    } catch (err) {
      console.error('Server logout API call failed:', err)
    }

    // 4. Navigate to home and refresh to clear middleware cache
    router.push('/')
    setTimeout(() => router.refresh(), 100)
  }, [router])

  const positionClasses = {
    fixed: 'fixed top-0 left-0 right-0 z-50',
    absolute: 'absolute top-0 left-0 right-0 z-50',
    static: 'relative z-50',
  }[variant]

  return (
    <nav className={`${positionClasses} bg-transparent overflow-visible border-none ${className || ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0 [&_img]:brightness-0 [&_img]:invert">
            <Logo variant="navbar" />
          </Link>

          {/* Right nav section */}
          <div className="flex items-center min-w-0">
            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center space-x-6">
              <Link href="/listings" className="font-medium text-white hover:text-white/80 transition-colors">
                Shiko banesat
              </Link>
              {!user ? (
                <div className="flex items-center space-x-3">
                  <a
                    href="/login"
                    className="inline-flex items-center justify-center rounded-lg h-8 px-2.5 text-sm font-medium text-white border border-white/50 hover:bg-white/10 transition-colors"
                  >
                    Hyr
                  </a>
                  <a
                    href="/register"
                    className="inline-flex items-center justify-center rounded-lg h-8 px-2.5 text-sm font-medium bg-white text-[#1B4FFF] hover:bg-white/90 transition-colors"
                  >
                    Regjistrohu
                  </a>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => router.push('/posto-banese')}
                    className="inline-flex items-center justify-center rounded-lg h-8 gap-1.5 px-2.5 text-sm font-medium whitespace-nowrap bg-white text-[#1B4FFF] hover:bg-white/90 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Posto banesë
                  </button>
                  {profileIncomplete && (
                    <button
                      type="button"
                      onClick={() => router.push('/completo-profilin')}
                      className="inline-flex items-center justify-center rounded-lg h-8 gap-1.5 px-2.5 text-sm font-medium whitespace-nowrap border border-orange-300 text-orange-300 hover:bg-orange-500/10 hover:text-orange-200 animate-pulse"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Verifiko profilin
                    </button>
                  )}
                  {/* Custom dropdown — no Base UI, no layout shifts */}
                  <div className="relative flex-shrink-0" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="inline-flex items-center justify-center rounded-full w-9 h-9 bg-[#1B4FFF] text-white text-sm font-bold hover:bg-[#1640CC] transition-colors cursor-pointer flex-shrink-0 outline-none"
                      aria-label="Menyja e përdoruesit"
                      aria-expanded={dropdownOpen}
                      aria-haspopup="true"
                    >
                      {(profileFirstName || user?.email || '?')[0].toUpperCase()}
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-[#0A0F2E] rounded-lg shadow-lg border border-white/10 py-1 z-50">
                        {/* User info header */}
                        <div className="px-4 py-3 border-b border-white/10">
                          <p className="text-sm font-medium text-white truncate">
                            {profileFirstName || user?.email?.split('@')[0] || 'Përdorues'}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => { closeDropdown(); router.push('/posto-banese') }}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 transition-colors"
                        >
                          <Plus className="h-4 w-4 mr-3 text-slate-400" />
                          Posto banesë
                        </button>

                        <button
                          type="button"
                          onClick={() => { closeDropdown(); router.push('/profili') }}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 transition-colors"
                        >
                          <User className="h-4 w-4 mr-3 text-slate-400" />
                          Banesat e mia
                        </button>

                        <button
                          type="button"
                          onClick={() => { closeDropdown(); router.push('/profili') }}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 transition-colors"
                        >
                          <Settings className="h-4 w-4 mr-3 text-slate-400" />
                          Cilësimet
                        </button>

                        <div className="border-t border-white/10 my-1" />

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
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
              className="lg:hidden p-2 rounded-md min-h-11 min-w-11 flex items-center justify-center text-white transition-colors"
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
            {!user ? (
              <div className="space-y-2">
                <a href="/login" className="block w-full min-h-11 rounded-lg border border-white/20 bg-transparent text-center leading-[2.75rem] text-sm font-medium text-white hover:bg-white/10 transition-colors">Hyr</a>
                <a href="/register" className="block w-full min-h-11 rounded-lg bg-[#1B4FFF] hover:bg-[#1640CC] text-center leading-[2.75rem] text-sm font-medium text-white transition-colors">Regjistrohu</a>
              </div>
            ) : (
              <>
                {profileIncomplete && (
                  <button
                    type="button"
                    onClick={() => { router.push('/completo-profilin'); setMenuOpen(false) }}
                    className="inline-flex items-center justify-center w-full min-h-11 rounded-lg border border-orange-400 text-orange-600 hover:bg-orange-50 hover:text-orange-700 text-sm font-medium"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Verifiko profilin
                  </button>
                )}
                <div className="flex items-center gap-3 px-1 py-2">
                  <span className="inline-flex items-center justify-center rounded-full w-9 h-9 bg-[#1B4FFF] text-white text-sm font-bold shrink-0">
                    {(profileFirstName || user?.email || '?')[0].toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-white truncate">
                    {profileFirstName || user?.email?.split('@')[0] || 'Përdorues'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { router.push('/posto-banese'); setMenuOpen(false) }}
                  className="inline-flex items-center justify-center w-full min-h-11 rounded-lg bg-[#1B4FFF] hover:bg-[#1640CC] text-white text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Posto banesë
                </button>
                <button
                  onClick={() => { router.push('/profili'); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full text-left text-white/80 hover:text-white py-3"
                >
                  <User className="h-4 w-4" />
                  Banesat e mia
                </button>
                <button
                  onClick={() => { router.push('/profili'); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full text-left text-white/80 hover:text-white py-3"
                >
                  <Settings className="h-4 w-4" />
                  Cilësimet
                </button>
                <div className="border-t border-white/10 pt-2">
                  <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 py-3 font-medium">
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
