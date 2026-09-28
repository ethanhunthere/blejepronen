import {
  isValidElement,
  type ComponentType,
  type ElementType,
  type ReactNode,
  type SVGProps,
} from 'react'

import { cn } from '@/lib/utils'

/**
 * EmptyState — the "nothing here (yet)" placeholder.
 * Mirrors the mobile EmptyState API: icon / title / message / action.
 */

/**
 * Accepts either an icon *component* (e.g. `Search` from lucide-react, so the
 * primitive can size and colour it consistently) or an already-created element
 * (e.g. `<Search className="h-5 w-5" />`).
 */
export type StateIcon =
  | ReactNode
  | ComponentType<SVGProps<SVGSVGElement>>
  | ElementType

/**
 * Normalises a {@link StateIcon} into renderable output. Shared with ErrorState
 * so both primitives treat the `icon` prop identically.
 *
 * Component inputs are rendered with `aria-hidden` because the icon restates
 * the adjacent title; callers wanting a meaningful icon should pass an element
 * carrying its own accessible name.
 */
export function renderStateIcon(
  icon: StateIcon | undefined | null | false,
  className: string
): ReactNode {
  if (icon === null || icon === undefined || icon === false) return null
  // Already an element — render exactly what the caller built.
  if (isValidElement(icon)) return icon
  // Function component, host tag ('svg'), or forwardRef/memo object (lucide-react).
  if (typeof icon === 'string' || typeof icon === 'function') {
    const Icon = icon as ElementType
    return <Icon className={className} aria-hidden="true" />
  }
  if (typeof icon === 'object' && icon !== null && '$$typeof' in icon) {
    const Icon = icon as unknown as ElementType
    return <Icon className={className} aria-hidden="true" />
  }
  return icon as ReactNode
}

export interface EmptyStateProps {
  /** Icon component or element. Rendered inside a brand-tinted circle. */
  icon?: StateIcon
  title: ReactNode
  message?: ReactNode
  /** Call to action, e.g. a `<Link>` or `<button>`. */
  action?: ReactNode
  /** Tighter padding for inline use inside a card or sidebar. */
  compact?: boolean
  /** Draws a card border/surface so the state reads as its own panel. */
  bordered?: boolean
  /**
   * Element for the title. Defaults to `<p>` so the primitive does not inject
   * an unexpected level into the page heading outline — pass `'h2'`/`'h3'` when
   * the empty state really is a section heading.
   */
  titleAs?: ElementType
  /**
   * Announce the empty result through a polite live region. Turn this on when
   * the state appears in response to a user action (filtering, searching) so
   * the result is not silently swapped in.
   */
  announce?: boolean
  className?: string
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  compact = false,
  bordered = false,
  titleAs: TitleTag = 'p',
  announce = false,
  className,
}: EmptyStateProps) {
  const content = (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center text-center',
        compact ? 'gap-2 px-4 py-5' : 'gap-3 px-6 py-12',
        bordered &&
          'rounded-2xl border border-[color:var(--bp-color-border,#E4E7EC)] bg-[var(--bp-color-surface,#FFFFFF)]',
        className
      )}
    >
      {icon ? (
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-[var(--bp-color-primary-soft,#E8F1EF)] text-[var(--bp-color-primary,#00675B)]',
            compact
              ? 'h-9 w-9 [&>svg]:h-4 [&>svg]:w-4'
              : 'h-12 w-12 [&>svg]:h-5 [&>svg]:w-5'
          )}
        >
          {renderStateIcon(icon, compact ? 'h-4 w-4' : 'h-5 w-5')}
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

      {action ? <div className={compact ? 'pt-0.5' : 'pt-1.5'}>{action}</div> : null}
    </div>
  )

  if (!announce) return content

  return (
    <div role="status" aria-live="polite">
      {content}
    </div>
  )
}

export default EmptyState
