import type { CSSProperties, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Loading placeholders. Mirrors the mobile Skeleton API (base box plus
 * card / row / avatar / text composites).
 *
 * Deliberately free of `backdrop-blur` — the fill is a solid brand-tinted
 * colour so a long feed of skeletons costs paint, not compositing.
 */

export type SkeletonVariant = 'text' | 'avatar' | 'row' | 'card'

const FILL = 'bg-[var(--bp-color-skeleton,#E7EDEB)]'

const VARIANT_CLASSES: Record<SkeletonVariant, string> = {
  text: 'h-3 w-full rounded-md',
  avatar: 'h-11 w-11 shrink-0 rounded-full',
  row: 'h-16 w-full rounded-xl',
  card: 'h-44 w-full rounded-2xl',
}

export interface SkeletonProps {
  /** Named shape. Omit to render a plain block and size it with `className`. */
  variant?: SkeletonVariant
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/** Base placeholder block. Decorative — always hidden from assistive technology. */
export function Skeleton({ variant, className, style, children }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn(
        'animate-pulse',
        FILL,
        variant ? VARIANT_CLASSES[variant] : 'rounded-md',
        className
      )}
    >
      {children}
    </div>
  )
}

interface AnnouncedProps {
  /**
   * Wrap the placeholder in a polite live region announcing
   * "Duke u ngarkuar…". Enable for content the user is waiting on; leave off
   * for decorative chrome so repeated announcements do not stack up.
   */
  announce?: boolean
  announceLabel?: string
  className?: string
}

function Announce({
  announce,
  announceLabel = 'Duke u ngarkuar…',
  children,
}: {
  announce?: boolean
  announceLabel?: string
  children: ReactNode
}) {
  if (!announce) return <>{children}</>
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{announceLabel}</span>
      {children}
    </div>
  )
}

export interface SkeletonTextProps extends AnnouncedProps {
  /** Number of lines to render. */
  lines?: number
  /** Applied to every line — use it to vary widths, e.g. `last:w-2/3`. */
  lineClassName?: string
}

export function SkeletonText({
  lines = 3,
  lineClassName,
  announce,
  announceLabel,
  className,
}: SkeletonTextProps) {
  return (
    <Announce announce={announce} announceLabel={announceLabel}>
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: Math.max(0, lines) }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            className={cn(i === lines - 1 && 'w-2/3', lineClassName)}
          />
        ))}
      </div>
    </Announce>
  )
}

export interface SkeletonAvatarProps extends AnnouncedProps {
  /** Box size in pixels. */
  size?: number
  rounded?: 'full' | 'xl'
}

export function SkeletonAvatar({
  size = 44,
  rounded = 'full',
  announce,
  announceLabel,
  className,
}: SkeletonAvatarProps) {
  return (
    <Announce announce={announce} announceLabel={announceLabel}>
      <Skeleton
        style={{ width: size, height: size }}
        className={cn(rounded === 'full' ? 'rounded-full' : 'rounded-xl', className)}
      />
    </Announce>
  )
}

export interface SkeletonRowProps extends AnnouncedProps {
  /** Show a leading avatar placeholder. */
  avatar?: boolean
  lines?: number
}

/** List-item placeholder: optional avatar + stacked lines. */
export function SkeletonRow({
  avatar = true,
  lines = 2,
  announce,
  announceLabel,
  className,
}: SkeletonRowProps) {
  return (
    <Announce announce={announce} announceLabel={announceLabel}>
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border border-[color:var(--bp-color-border,#E4E7EC)] bg-[var(--bp-color-surface,#FFFFFF)] p-3',
          className
        )}
      >
        {avatar ? <Skeleton variant="avatar" /> : null}
        <SkeletonText lines={lines} className="flex-1" />
      </div>
    </Announce>
  )
}

export interface SkeletonCardProps extends AnnouncedProps {
  /** Show a leading media placeholder. */
  image?: boolean
  lines?: number
}

/** Listing-card placeholder: media block + stacked lines. */
export function SkeletonCard({
  image = true,
  lines = 3,
  announce,
  announceLabel,
  className,
}: SkeletonCardProps) {
  return (
    <Announce announce={announce} announceLabel={announceLabel}>
      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-[color:var(--bp-color-border,#E4E7EC)] bg-[var(--bp-color-surface,#FFFFFF)]',
          className
        )}
      >
        {image ? <Skeleton className="h-44 w-full rounded-none" /> : null}
        <div className="space-y-3 p-4">
          <Skeleton variant="text" className="h-4 w-1/2" />
          <SkeletonText lines={lines} />
        </div>
      </div>
    </Announce>
  )
}

export default Skeleton
