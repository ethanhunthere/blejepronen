'use client'

import { useEffect, useState } from 'react'
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
import { Plus, User, LogOut, Menu, X } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { Logo } from '@/components/Logo'

export default function Navbar() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
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
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 hover:bg-gray-100 transition-colors cursor-pointer" aria-label="Menyja e përdoruesit">
                    <User className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem className="py-3">
                      <Link href="/profili">Profili im</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="py-3">
                      <Link href="/posto-banese">Posto banesë</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer py-3">
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
                <Link href="/posto-banese" className="block py-2">
                  <Button className="w-full min-h-11 bg-[#1B4FFF] hover:bg-[#1640CC] text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Posto banesë
                  </Button>
                </Link>
                <Link href="/profili" className="block text-gray-600 py-3">Profili im</Link>
                <button onClick={handleLogout} className="block text-red-600 py-3 font-medium">
                  Dil nga llogaria
                </button>
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
