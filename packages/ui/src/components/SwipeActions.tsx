import { useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from './Button'
import { IconButton } from './IconButton'
import { useActionLabels } from './ActionLabels'

export interface SwipeAction {
  label: string
  icon?: React.ReactNode
  onAction: () => void
  tone?: 'primary' | 'danger' | 'neutral'
}

const ACTION_WIDTH = 76

/**
 * Horizontal swipe actions for mobile rows/cards. Swiping left reveals the
 * action track; a visible "More actions" button gives keyboard and pointer
 * users the same actions without the gesture. No external gesture library.
 */
export function SwipeActions({ actions, children, label, className }: {
  actions: SwipeAction[]
  children: React.ReactNode
  label: string
  className?: string
}) {
  const labels = useActionLabels()
  const [revealed, setRevealed] = useState(false)
  const [drag, setDrag] = useState(0)
  const start = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  const width = actions.length * ACTION_WIDTH
  const base = revealed ? -width : 0
  const translate = Math.max(-width, Math.min(0, base + drag))

  const reset = () => {
    start.current = null
    setDrag(0)
    swiped.current = false
  }

  return (
    <div
      className={cn('relative touch-pan-y overflow-hidden rounded-lg', className)}
      onClickCapture={event => {
        if (swiped.current) {
          event.preventDefault()
          event.stopPropagation()
          reset()
        }
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && revealed) {
          event.stopPropagation()
          setRevealed(false)
        }
      }}
    >
      {/* Action track sits behind the content and slides into view. */}
      <div
        className="absolute inset-y-0 right-0 flex"
        style={{ width }}
        aria-hidden={!revealed}
      >
        {actions.map(action => (
          <Button
            key={action.label}
            variant="bare"
            tabIndex={revealed ? 0 : -1}
            onClick={event => {
              event.stopPropagation()
              setRevealed(false)
              action.onAction()
            }}
            aria-label={action.label}
            className={cn(
              'flex h-full w-[76px] flex-col items-center justify-center gap-1 rounded-none text-xs font-medium text-neutral-0',
              action.tone === 'danger' ? 'bg-action-danger' : action.tone === 'primary' ? 'bg-action-primary' : 'bg-action-secondary',
            )}
          >
            {action.icon}
            <span className="max-w-full truncate px-1">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Foreground content: draggable horizontally, otherwise behaves normally. */}
      <div
        className="relative z-10 bg-surface transition-transform duration-fast ease-out"
        style={{ transform: `translateX(${translate}px)`, transitionDuration: start.current ? '0ms' : undefined }}
        onPointerDown={event => {
          if (event.pointerType === 'mouse' && event.button !== 0) return
          start.current = { x: event.clientX, y: event.clientY }
          swiped.current = false
        }}
        onPointerMove={event => {
          if (!start.current) return
          const dx = event.clientX - start.current.x
          const dy = event.clientY - start.current.y
          if (Math.abs(dy) > Math.abs(dx)) return
          if (Math.abs(dx) > 6) swiped.current = true
          setDrag(dx)
        }}
        onPointerUp={event => {
          if (!start.current) return
          const dx = event.clientX - start.current.x
          setRevealed(revealed ? dx < ACTION_WIDTH / 2 : dx < -ACTION_WIDTH / 2)
          reset()
        }}
        onPointerCancel={reset}
      >
        {children}
        <IconButton
          label={`${labels.actions} — ${label}`}
          aria-expanded={revealed}
          variant="ghost"
          size="icon-sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 text-content-subtle"
          onClick={event => {
            event.stopPropagation()
            setRevealed(value => !value)
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  )
}
