'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, UserCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'

interface FollowButtonProps {
  targetUserId: string
  targetUserName?: string
  initialIsFollowing?: boolean
  initialFollowersCount?: number
  onCountChange?: (newCount: number, isFollowing: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function FollowButton({
  targetUserId,
  targetUserName = 'përdoruesin',
  initialIsFollowing = false,
  initialFollowersCount = 0,
  onCountChange,
  size = 'md',
  className = '',
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followersCount, setFollowersCount] = useState(initialFollowersCount)
  const [isHovered, setIsHovered] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setIsFollowing(initialIsFollowing)
  }, [initialIsFollowing])

  useEffect(() => {
    setFollowersCount(initialFollowersCount)
  }, [initialFollowersCount])

  // Check current user session and follow state
  useEffect(() => {
    let mounted = true

    const checkState = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!mounted) return
        setCurrentUserId(user?.id || null)

        if (user && targetUserId) {
          if (user.id === targetUserId) {
            return
          }
          // Fetch status from API
          const res = await fetch(`/api/follow?targetUserId=${encodeURIComponent(targetUserId)}`)
          if (res.ok) {
            const data = await res.json()
            if (!mounted) return
            setIsFollowing(Boolean(data.isFollowing))
            if (typeof data.followersCount === 'number') {
              setFollowersCount(data.followersCount)
              onCountChange?.(data.followersCount, Boolean(data.isFollowing))
            }
          }
        }
      } catch (err) {
        console.error('Check follow status error:', err)
      }
    }

    checkState()

    // Listen for follow updates across the application
    const handleFollowChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ targetUserId: string; isFollowing: boolean; count?: number }>
      if (customEvent.detail && customEvent.detail.targetUserId === targetUserId) {
        setIsFollowing(customEvent.detail.isFollowing)
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
  }, [targetUserId, supabase, onCountChange])

  // Don't show follow button for self
  if (currentUserId && currentUserId === targetUserId) {
    return null
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!currentUserId) {
      toast.info('Ju lutem kyçuni për të ndjekur këtë profil.', {
        action: {
          label: 'Kyçu',
          onClick: () => router.push('/login'),
        },
      })
      return
    }

    const nextState = !isFollowing
    const prevCount = followersCount
    const nextCount = nextState ? prevCount + 1 : Math.max(0, prevCount - 1)

    // Instant optimistic update
    setIsFollowing(nextState)
    setFollowersCount(nextCount)
    onCountChange?.(nextCount, nextState)

    // Dispatch global event for other components
    window.dispatchEvent(
      new CustomEvent('bp-follow-changed', {
        detail: { targetUserId, isFollowing: nextState, count: nextCount },
      })
    )

    startTransition(async () => {
      try {
        const method = nextState ? 'POST' : 'DELETE'
        const res = await fetch('/api/follow', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => null)
          throw new Error(errData?.message || 'Veprimi dështoi')
        }

        const data = await res.json()
        if (typeof data.followersCount === 'number') {
          setFollowersCount(data.followersCount)
          onCountChange?.(data.followersCount, nextState)
        }

        if (nextState) {
          toast.success(`Tani po ndiqni ${targetUserName}`)
        } else {
          toast.info(`Ndalët ndjekjen e ${targetUserName}`)
        }
      } catch (err: unknown) {
        // Rollback on error
        setIsFollowing(!nextState)
        setFollowersCount(prevCount)
        onCountChange?.(prevCount, !nextState)
        window.dispatchEvent(
          new CustomEvent('bp-follow-changed', {
            detail: { targetUserId, isFollowing: !nextState, count: prevCount },
          })
        )
        const message = err instanceof Error ? err.message : 'Ndodhi një gabim gjatë procesimit.'
        toast.error(message)
      }
    })
  }

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-xs sm:text-sm gap-2 rounded-xl',
    lg: 'h-11 px-5 text-sm gap-2.5 rounded-xl font-bold',
  }[size]

  return (
    <button
      type="button"
      onClick={handleToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isPending}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer shadow-xs active:scale-95 select-none ${sizeClasses} ${
        isFollowing
          ? isHovered
            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300'
            : 'bg-emerald-50 text-[#00675B] border border-emerald-200 hover:bg-emerald-100'
          : 'bg-[#00675B] text-white hover:bg-[#004D43] shadow-sm'
      } ${className}`}
      title={isFollowing ? 'Kliko për të ndaluar ndjekjen' : `Ndiq ${targetUserName}`}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isFollowing ? (
        isHovered ? (
          <>
            <span className="truncate">Ndalo ndjekjen</span>
          </>
        ) : (
          <>
            <UserCheck className="h-4 w-4 shrink-0" />
            <span className="truncate">Duke ndjekur</span>
          </>
        )
      ) : (
        <>
          <UserPlus className="h-4 w-4 shrink-0" />
          <span className="truncate">Ndiq</span>
        </>
      )}
    </button>
  )
}
