'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, User, LogOut, Menu, X, AlertTriangle, Settings } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { Logo } from '@/components/Logo'

export default function Navbar() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profileIncomplete, setProfileIncomplete] = useState(false)
  const [profileFirstName, setProfileFirstName] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
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

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Logo variant="navbar" />
          </Link>

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
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex items-center justify-center rounded-full w-9 h-9 bg-[#1B4FFF] text-white text-sm font-bold hover:bg-[#1640CC] transition-colors cursor-pointer border-0"
                    aria-label="Menyja e përdoruesit"
                  >
                    {(profileFirstName || user?.email || '?')[0].toUpperCase()}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2 text-sm border-b border-gray-100 mb-1">
                      <p className="font-medium text-gray-900 truncate">
                        {profileFirstName || user?.email?.split('@')[0] || 'Përdorues'}
                      </p>
                      <p className="text-gray-500 text-xs truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuItem
                      onClick={() => router.push('/posto-banese')}
                      className="py-2.5 cursor-pointer"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Posto banesë
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push('/profili')}
                      className="py-2.5 cursor-pointer"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Banesat e mia
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push('/profili')}
                      className="py-2.5 cursor-pointer"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Cilësimet
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-600 cursor-pointer py-2.5 focus:bg-red-50 focus:text-red-700"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Dil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
