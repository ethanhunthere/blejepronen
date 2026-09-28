'use client'

import { RotateCw, TriangleAlert } from 'lucide-react'
import type { ElementType, ReactNode } from 'react'

import { renderStateIcon, type StateIcon } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

/**
 * ErrorState — "this failed, here is the way out".
 * Mirrors the mobile ErrorState API: icon / title / message / retry.
 */

export interface ErrorStateProps {
  /** Defaults to a warning triangle in a danger-tinted circle. */
  icon?: StateIcon
  title?: ReactNode
  message?: ReactNode
  /** Retry handler. When omitted the retry button is not rendered. */
  onRetry?: () => void
  retryLabel?: string
  /** Show a spinner in the retry button and disable it. */
  retrying?: boolean
  /** Secondary action rendered next to retry, e.g. a "Report a problem" link. */
  action?: ReactNode
  compact?: boolean
  bordered?: boolean
  titleAs?: ElementType
  /**
   * Announce the failure through a live region. On by default: an error that
   * replaces content silently is invisible to screen-reader users. Uses
   * `role="status"` (polite) rather than `role="alert"` so it does not
   * interrupt whatever the user is currently hearing.
   */
  announce?: boolean
  className?: string
}

export function ErrorState({
  icon,
  title = 'Diçka shkoi keq',
  message = 'Ndodhi një gabim i papritur. Provo përsëri.',
  onRetry,
  retryLabel = 'Provo përsëri',
  retrying = false,
  action,
  compact = false,
  bordered = false,
  titleAs: TitleTag = 'p',
  announce = true,
  className,
}: ErrorStateProps) {
  const resolvedIcon = icon === undefined ? TriangleAlert : icon

  const content = (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center text-center',
        compact ? 'gap-2 px-4 py-5' : 'gap-3 px-6 py-12',
        bordered &&
          'rounded-2xl border border-[color:var(--bp-color-danger-border,#FECACA)] bg-[var(--bp-color-danger-bg,#FEF2F2)]',
        className
      )}
    >
      {resolvedIcon ? (
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-[var(--bp-color-danger-bg,#FEF2F2)] text-[var(--bp-color-danger-text,#B91C1C)]',
            compact
              ? 'h-9 w-9 [&>svg]:h-4 [&>svg]:w-4'
              : 'h-12 w-12 [&>svg]:h-5 [&>svg]:w-5'
          )}
        >
          {renderStateIcon(resolvedIcon, compact ? 'h-4 w-4' : 'h-5 w-5')}
        </div>
      ) : null}

      <div className={cn('min-w-0', compact ? 'space-y-0.5' : 'space-y-1.5')}>
        <TitleTag
          className={cn(
            'font-bold tracking-tight text-[var(--bp-color-text,#101828)]',
            compact ? 'text-sm' : 'text-base sm:text-lg'
          )}
        >
          {title}
        </TitleTag>
        {message ? (
          <p
            className={cn(
              'mx-auto max-w-sm text-[var(--bp-color-text-muted,#667085)]',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            {message}
          </p>
        ) : null}
      </div>

      {onRetry || action ? (
        <div
          className={cn(
            'flex flex-wrap items-center justify-center gap-2',
            compact ? 'pt-0.5' : 'pt-1.5'
          )}
        >
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--bp-color-primary,#00675B)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--bp-color-primary-dark,#00392F)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bp-color-primary,#00675B)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCw
                aria-hidden="true"
                className={cn('h-4 w-4', retrying && 'animate-spin')}
              />
              <span>{retryLabel}</span>
            </button>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  )

  if (!announce) return content

  return (
    <div role="status" aria-live="polite">
      {content}
    </div>
  )
}

export default ErrorState
