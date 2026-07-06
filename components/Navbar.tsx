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
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profileIncomplete, setProfileIncomplete] = useState(false)
  const [profileFirstName, setProfileFirstName] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, phone_verified')
          .eq('id', currentUser.id)
          .single()

        setProfileIncomplete(!profile?.first_name)
        setProfileFirstName(profile?.first_name || '')
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
    const supabase = createClient()
    await supabase.auth.signOut()
    setDropdownOpen(false)
    router.push('/')
    router.refresh()
  }, [router])

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 overflow-visible">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Logo variant="navbar" />
          </Link>

          {/* Right nav section */}
          <div className="flex items-center flex-shrink-0 min-w-fit">
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/listings" className="text-gray-600 hover:text-[#1B4FFF] font-medium transition-colors">
                Shiko banesat
              </Link>
              {user ? (
                <>
                  <Link href="/posto-banese">
                    <Button className="bg-[#1B4FFF] hover:bg-[#1640CC] text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Posto banesë
                    </Button>
                  </Link>
                  {profileIncomplete && (
                    <Link href="/completo-profilin">
                      <Button
                        variant="outline"
                        className="border-orange-400 text-orange-600 hover:bg-orange-50 hover:text-orange-700 animate-pulse"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Verifiko profilin
                      </Button>
                    </Link>
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
                  <Link href="/login">
                    <Button variant="ghost" className="text-gray-700">Hyr</Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-[#1B4FFF] hover:bg-[#1640CC] text-white">Regjistrohu</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md text-gray-600 min-h-11 min-w-11 flex items-center justify-center"
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
            {user ? (
              <>
                {profileIncomplete && (
                  <Link href="/completo-profilin" className="block">
                    <Button
                      variant="outline"
                      className="w-full min-h-11 border-orange-400 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Verifiko profilin
                    </Button>
                  </Link>
                )}
                <div className="flex items-center gap-3 px-1 py-2">
                  <span className="inline-flex items-center justify-center rounded-full w-9 h-9 bg-[#1B4FFF] text-white text-sm font-bold shrink-0">
                    {(profileFirstName || user?.email || '?')[0].toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {profileFirstName || user?.email?.split('@')[0] || 'Përdorues'}
                  </span>
                </div>
                <Link href="/posto-banese" className="block py-2">
                  <Button className="w-full min-h-11 bg-[#1B4FFF] hover:bg-[#1640CC] text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Posto banesë
                  </Button>
                </Link>
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
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full min-h-11">Hyr</Button>
                </Link>
                <Link href="/register" className="block">
                  <Button className="w-full min-h-11 bg-[#1B4FFF] hover:bg-[#1640CC] text-white">Regjistrohu</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
