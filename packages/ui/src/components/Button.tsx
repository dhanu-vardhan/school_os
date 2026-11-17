import {
  forwardRef, useId,
  type MouseEvent, type MouseEventHandler, type PointerEvent, type PointerEventHandler, type ReactNode,
} from 'react'
import { Slot, Slottable } from '@radix-ui/react-slot'
import { Loader2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { buttonVariants } from '../lib/variants'
import type { VariantProps } from 'class-variance-authority'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Merge styling and behaviour into a single child (router Link or anchor). */
  asChild?: boolean
  /** Disables the action, sets aria-busy and shows a spinner. */
  loading?: boolean
  /** Why the action is unavailable; announced and shown in a native tooltip. */
  disabledReason?: string
  /** Display-only shortcut hint (e.g. "⌘K"), mirrored to aria-keyshortcuts. */
  shortcut?: string
  icon?: ReactNode
  iconPosition?: 'start' | 'end'
}

function motionIsReduced() {
  if (typeof window === 'undefined') return false
  if (document.documentElement.classList.contains('ui-reduce-motion')) return true
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Touch-only ripple; removed on animationend so no timers or DOM growth remain. */
function spawnRipple(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'touch' || motionIsReduced()) return
  const target = event.currentTarget
  const rect = target.getBoundingClientRect()
  const ripple = document.createElement('span')
  ripple.className = 'ui-ripple'
  ripple.setAttribute('aria-hidden', 'true')
  ripple.style.left = `${event.clientX - rect.left}px`
  ripple.style.top = `${event.clientY - rect.top}px`
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true })
  target.appendChild(ripple)
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className, variant, size, asChild, loading, disabled, disabledReason, shortcut,
    icon, iconPosition = 'start', children, onClick, onPointerDown, tabIndex,
    'aria-describedby': ariaDescribedBy, 'aria-keyshortcuts': ariaKeyShortcuts,
    ...props
  }, ref,
) {
  const descriptionId = useId()
  const unavailable = Boolean(disabled || loading)
  const Comp = asChild ? Slot : 'button'
  const describedBy = disabledReason ? `${ariaDescribedBy ?? ''} ${descriptionId}`.trim() : ariaDescribedBy

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (unavailable) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    onClick?.(event)
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!unavailable) spawnRipple(event)
    onPointerDown?.(event)
  }

  const button = (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size: variant === 'bare' ? 'bare' : size }), className)}
      disabled={asChild ? undefined : unavailable}
      aria-disabled={asChild && unavailable ? true : undefined}
      aria-busy={loading || undefined}
      aria-describedby={describedBy}
      aria-keyshortcuts={shortcut ?? ariaKeyShortcuts}
      data-loading={loading || undefined}
      tabIndex={asChild && unavailable ? -1 : tabIndex}
      onClick={handleClick as MouseEventHandler<HTMLElement>}
      onPointerDown={handlePointerDown as PointerEventHandler<HTMLElement>}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />}
      {icon && iconPosition === 'start' && <span className="shrink-0" aria-hidden>{icon}</span>}
      {asChild ? <Slottable>{children}</Slottable> : children}
      {icon && iconPosition === 'end' && <span className="shrink-0" aria-hidden>{icon}</span>}
      {shortcut && <kbd className="ui-kbd hidden shrink-0 sm:inline-flex" aria-hidden>{shortcut}</kbd>}
    </Comp>
  )

  if (!disabledReason) return button
  return (
    <span className="inline-flex max-w-full" title={disabledReason}>
      {button}
      <span id={descriptionId} className="ui-sr-only">{disabledReason}</span>
    </span>
  )
})
