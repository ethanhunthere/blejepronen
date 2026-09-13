'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  X,
  Search,
  Users,
  ShieldCheck,
  Building2,
  Loader2,
  UserX,
} from 'lucide-react'
import { getAvatarUrl } from '@/lib/avatars'
import FollowButton from './FollowButton'
import type { FollowUserItem } from '@/app/api/follow/route'

interface FollowsModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
  initialTab?: 'followers' | 'following'
  initialFollowersCount?: number
  initialFollowingCount?: number
}

export default function FollowsModal({
  isOpen,
  onClose,
  userId,
  userName,
  initialTab = 'followers',
  initialFollowersCount = 0,
  initialFollowingCount = 0,
}: FollowsModalProps) {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [followers, setFollowers] = useState<FollowUserItem[]>([])
  const [following, setFollowing] = useState<FollowUserItem[]>([])
  const [viewerFollowingIds, setViewerFollowingIds] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    if (!isOpen || !userId) return

    let cancelled = false
    setLoading(true)

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/follow?targetUserId=${encodeURIComponent(userId)}&includeLists=1`)
        if (!res.ok) throw new Error('Failed to load follow lists')
        const data = await res.json()
        if (cancelled) return

        setFollowers(data.followers || [])
        setFollowing(data.following || [])
        setViewerFollowingIds(data.viewerFollowingIds || [])
        setCurrentUserId(data.currentUserId || null)
      } catch (err) {
        console.error('Fetch follows list error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [isOpen, userId])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const currentList = activeTab === 'followers' ? followers : following

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList
    const q = searchQuery.toLowerCase().trim()
    return currentList.filter((item) => item.name.toLowerCase().includes(q))
  }, [currentList, searchQuery])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="min-w-0 pr-2">
            <h3 className="text-base sm:text-lg font-bold text-[#101828] truncate">
              {userName}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {activeTab === 'followers' ? 'Ndiqësit e profilit' : 'Llogaritë që ndjek'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Mbyll"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 p-1.5 mx-4 mt-3 bg-gray-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('followers')}
            className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'followers'
                ? 'bg-white text-[#006459] shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Ndiqësit ({loading ? initialFollowersCount : followers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('following')}
            className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'following'
                ? 'bg-white text-[#006459] shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Duke ndjekur ({loading ? initialFollowingCount : following.length})
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'followers' ? 'Kërko në ndiqës...' : 'Kërko llogari...'}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006459]/20 focus:border-[#006459] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-gray-50 min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#006459] mb-2" />
              <p className="text-xs">Duke ngarkuar...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mb-2.5">
                {searchQuery ? <UserX className="w-6 h-6" /> : <Users className="w-6 h-6" />}
              </div>
              <p className="text-sm font-bold text-gray-800">
                {searchQuery
                  ? 'Nuk u gjet asnjë rezultat'
                  : activeTab === 'followers'
                  ? 'Ende nuk ka ndiqës'
                  : 'Nuk po ndjek asnjë profil ende'}
              </p>
              <p className="text-xs text-gray-500 max-w-xs mt-1">
                {searchQuery
                  ? 'Provo të kërkosh me një emër tjetër.'
                  : activeTab === 'followers'
                  ? 'Kur dikush të ndjekë këtë profil, do të shfaqet këtu.'
                  : 'Profilet që ndiqen do të listohen këtu.'}
              </p>
            </div>
          ) : (
            filteredList.map((item) => {
              const isSelf = currentUserId === item.id
              const isViewerFollowing = viewerFollowingIds.includes(item.id)

              return (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50/70 px-2 rounded-2xl transition-colors"
                >
                  <Link
                    href={`/profili/${item.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200 group-hover:border-[#006459]/40 transition-colors">
                      <Image
                        src={getAvatarUrl(item.avatarUrl)}
                        alt={item.name}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs sm:text-sm font-bold text-[#101828] group-hover:text-[#006459] truncate transition-colors">
                          {item.name}
                        </p>
                        {item.isVerified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                        {item.isCompany && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-[#006459]/10 text-[#006459]">
                            <Building2 className="w-2.5 h-2.5" />
                            Kompani
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">
                        {item.isCompany ? 'Agjenci / Kompani' : 'Përdorues në Bleje Pronën'}
                      </p>
                    </div>
                  </Link>

                  {/* Follow / Unfollow button if not self */}
                  {!isSelf && (
                    <div className="shrink-0">
                      <FollowButton
                        targetUserId={item.id}
                        targetUserName={item.name}
                        initialIsFollowing={isViewerFollowing}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400">
            Bleje Pronën · Rrjeti imobiliar më i besuar
          </p>
        </div>
      </div>
    </div>
  )
}
