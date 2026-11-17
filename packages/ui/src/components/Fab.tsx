import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button, type ButtonProps } from './Button'

export interface FabAction {
  id: string
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
}

/** Fixed primary action for touch layouts; `inline` is for documentation previews only. */
export function Fab({ label, icon = <Plus className="h-5 w-5" aria-hidden />, onClick, inline = false, variant = 'primary', buttonRef, className }: {
  label: string
  icon?: ReactNode
  onClick: () => void
  inline?: boolean
  variant?: ButtonProps['variant']
  buttonRef?: RefObject<HTMLButtonElement>
  className?: string
}) {
  return (
    <Button ref={buttonRef} variant={variant} size="icon" aria-label={label} title={label} onClick={onClick}
      className={cn('ui-fab', inline && 'ui-fab-inline', className)}>
      {icon}
    </Button>
  )
}

/** Expandable primary action with labelled secondary actions and focus return on Escape. */
export function SpeedDial({ label, actions, inline = false }: {
  label: string
  actions: FabAction[]
  inline?: boolean
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      trigger.current?.focus()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  return (
    <div ref={root} className={cn('ui-speed-dial', inline && 'ui-speed-dial-inline')}>
      {open && (
        <div role="menu" aria-label={label} className="ui-speed-items">
          {actions.map(action => (
            <Button key={action.id} role="menuitem" variant="secondary" size="sm" disabled={action.disabled}
              className="ui-speed-item" onClick={() => { action.onClick(); setOpen(false); trigger.current?.focus() }}>
              {action.icon}{action.label}
            </Button>
          ))}
        </div>
      )}
      <Fab label={label} buttonRef={trigger} inline={inline}
        icon={<Plus className={cn('h-5 w-5 transition-transform duration-fast', open && 'rotate-45')} aria-hidden />}
        onClick={() => setOpen(value => !value)} />
    </div>
  )
}
