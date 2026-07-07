'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Plus, User, LogOut, Menu, X, AlertTriangle, Settings } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { Logo } from '@/components/Logo'

export default function Navbar() {
  // Tri-state: undefined = loading, null = logged out, object = logged in.
  // This avoids a separate authLoading boolean that can get out of sync.
  const [user, setUser] = useState<SupabaseUser | null | undefined>(undefined)
  const [profileIncomplete, setProfileIncomplete] = useState(false)
  const [profileFirstName, setProfileFirstName] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(createClient())
  const router = useRouter()

  useEffect(() => {
    const supabase = supabaseRef.current

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('first_name, phone_verified')
            .eq('id', currentUser.id)
            .single()

          if (profileErr) {
            console.error('Navbar profile fetch error:', JSON.stringify(profileErr))
          }

          setProfileIncomplete(!profile?.first_name)
          setProfileFirstName(profile?.first_name || '')
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
        setUser(currentUser)

        if (event === 'SIGNED_IN') {
          router.refresh()
        }

        if (currentUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, phone_verified')
            .eq('id', currentUser.id)
            .single()

          setProfileIncomplete(!profile?.first_name)
          setProfileFirstName(profile?.first_name || '')
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

  return (
    <nav className="sticky top-0 z-50 overflow-visible border-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0 [&_img]:brightness-0 [&_img]:invert">
            <Logo variant="navbar" />
          </Link>

          {/* Right nav section */}
          <div className="flex items-center flex-shrink-0 min-w-fit">
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/listings" className="font-medium text-white hover:text-white/80 transition-colors">
                Shiko banesat
              </Link>
              {user === undefined ? (
                /* Loading — session hasn't been checked yet */
                <div className="w-[152px] h-9" aria-hidden="true" />
              ) : user ? (
                <>
                  <Button
                    onClick={() => router.push('/posto-banese')}
                    className="bg-white text-[#1B4FFF] hover:bg-white/90 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Posto banesë
                  </Button>
                  {profileIncomplete && (
                    <Button
                      onClick={() => router.push('/completo-profilin')}
                      variant="outline"
                      className="animate-pulse border-orange-300 text-orange-300 hover:bg-orange-500/10 hover:text-orange-200"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Verifiko profilin
                    </Button>
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
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        {/* User info header */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {profileFirstName || user?.email?.split('@')[0] || 'Përdorues'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => { closeDropdown(); router.push('/posto-banese') }}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Plus className="h-4 w-4 mr-3 text-gray-400" />
                          Posto banesë
                        </button>

                        <button
                          type="button"
                          onClick={() => { closeDropdown(); router.push('/profili') }}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <User className="h-4 w-4 mr-3 text-gray-400" />
                          Banesat e mia
                        </button>

                        <button
                          type="button"
                          onClick={() => { closeDropdown(); router.push('/profili') }}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="h-4 w-4 mr-3 text-gray-400" />
                          Cilësimet
                        </button>

                        <div className="border-t border-gray-100 my-1" />

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Dil
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
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
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md min-h-11 min-w-11 flex items-center justify-center text-white transition-colors"
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
          <div id="mobile-menu" className="md:hidden border-t border-gray-100 py-4 space-y-3">
            <Link href="/listings" className="block text-gray-600 hover:text-[#1B4FFF] font-medium py-3">
              Shiko banesat
            </Link>
            {user === undefined ? (
              /* Loading — session hasn't been checked yet */
              <div className="h-11" aria-hidden="true" />
            ) : user ? (
              <>
                {profileIncomplete && (
                  <Button
                    onClick={() => { router.push('/completo-profilin'); setMenuOpen(false) }}
                    variant="outline"
                    className="w-full min-h-11 border-orange-400 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Verifiko profilin
                  </Button>
                )}
                <div className="flex items-center gap-3 px-1 py-2">
                  <span className="inline-flex items-center justify-center rounded-full w-9 h-9 bg-[#1B4FFF] text-white text-sm font-bold shrink-0">
                    {(profileFirstName || user?.email || '?')[0].toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {profileFirstName || user?.email?.split('@')[0] || 'Përdorues'}
                  </span>
                </div>
                <Button
                  onClick={() => { router.push('/posto-banese'); setMenuOpen(false) }}
                  className="w-full min-h-11 bg-[#1B4FFF] hover:bg-[#1640CC] text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Posto banesë
                </Button>
                <button
                  onClick={() => { router.push('/profili'); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full text-left text-gray-600 py-3"
                >
                  <User className="h-4 w-4" />
                  Banesat e mia
                </button>
                <button
                  onClick={() => { router.push('/profili'); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full text-left text-gray-600 py-3"
                >
                  <Settings className="h-4 w-4" />
                  Cilësimet
                </button>
                <div className="border-t border-gray-100 pt-2">
                  <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 py-3 font-medium">
                    <LogOut className="h-4 w-4" />
                    Dil
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <a href="/login" className="block w-full min-h-11 rounded-lg border border-gray-200 bg-white text-center leading-[2.75rem] text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Hyr</a>
                <a href="/register" className="block w-full min-h-11 rounded-lg bg-[#1B4FFF] hover:bg-[#1640CC] text-center leading-[2.75rem] text-sm font-medium text-white transition-colors">Regjistrohu</a>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
