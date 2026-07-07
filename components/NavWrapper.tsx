'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function NavWrapper() {
  const pathname = usePathname()
  if (pathname === '/') return null
  return <Navbar variant="static" />
}
