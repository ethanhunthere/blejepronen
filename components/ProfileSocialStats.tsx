'use client'

import { useState, useEffect } from 'react'
import FollowsModal from './FollowsModal'

interface ProfileSocialStatsProps {
  userId: string
  userName: string
  listingsCount: number
  initialFollowersCount?: number
  initialFollowingCount?: number
  className?: string
}

export default function ProfileSocialStats({
  userId,
  userName,
  listingsCount,
  initialFollowersCount = 0,
  initialFollowingCount = 0,
  className = '',
}: ProfileSocialStatsProps) {
  const [followersCount, setFollowersCount] = useState(initialFollowersCount)
  const [followingCount, setFollowingCount] = useState(initialFollowingCount)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers')

  useEffect(() => {
    let mounted = true
    const fetchCounts = async () => {
      try {
        const res = await fetch(`/api/follow?targetUserId=${encodeURIComponent(userId)}`)
        if (res.ok) {
          const data = await res.json()
          if (!mounted) return
          if (typeof data.followersCount === 'number') setFollowersCount(data.followersCount)
          if (typeof data.followingCount === 'number') setFollowingCount(data.followingCount)
        }
      } catch (e) {
        console.error('Failed to load profile social stats:', e)
      }
    }

    fetchCounts()

    const handleFollowChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ targetUserId: string; count?: number; isFollowing: boolean }>
      if (customEvent.detail && customEvent.detail.targetUserId === userId) {
        if (typeof customEvent.detail.count === 'number') {
          setFollowersCount(customEvent.detail.count)
        }
      }
    }

    window.addEventListener('bp-follow-changed', handleFollowChange)
    return () => {
      mounted = false
      window.removeEventListener('bp-follow-changed', handleFollowChange)
    }
  }, [userId])

  const openFollowers = () => {
    setActiveTab('followers')
    setModalOpen(true)
  }

  const openFollowing = () => {
    setActiveTab('following')
    setModalOpen(true)
  }

  return (
    <>
      <div className={`flex items-center gap-3 sm:gap-6 py-2.5 ${className}`}>
        {/* Listings count */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-700 font-medium">
          <span className="font-extrabold text-[#101828] text-sm sm:text-base">
            {listingsCount}
          </span>
          <span className="text-gray-500 text-xs sm:text-sm">
            {listingsCount === 1 ? 'pronë' : 'prona'}
          </span>
        </div>

        <span className="text-gray-200">|</span>

        {/* Followers button (Instagram-style) */}
        <button
          type="button"
          onClick={openFollowers}
          className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-700 hover:text-[#00675B] transition-colors group cursor-pointer"
          title="Shiko ndiqësit"
        >
          <span className="font-extrabold text-[#101828] group-hover:text-[#00675B] text-sm sm:text-base transition-colors">
            {followersCount}
          </span>
          <span className="text-gray-500 group-hover:text-[#00675B] text-xs sm:text-sm transition-colors underline-offset-4 group-hover:underline">
            {followersCount === 1 ? 'ndiqës' : 'ndiqës'}
          </span>
        </button>

        <span className="text-gray-200">|</span>

        {/* Following button (Instagram-style) */}
        <button
          type="button"
          onClick={openFollowing}
          className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-700 hover:text-[#00675B] transition-colors group cursor-pointer"
          title="Shiko llogaritë që ndjek"
        >
          <span className="font-extrabold text-[#101828] group-hover:text-[#00675B] text-sm sm:text-base transition-colors">
            {followingCount}
          </span>
          <span className="text-gray-500 group-hover:text-[#00675B] text-xs sm:text-sm transition-colors underline-offset-4 group-hover:underline">
            ndjek
          </span>
        </button>
      </div>

      <FollowsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={userId}
        userName={userName}
        initialTab={activeTab}
        initialFollowersCount={followersCount}
        initialFollowingCount={followingCount}
      />
    </>
  )
}
