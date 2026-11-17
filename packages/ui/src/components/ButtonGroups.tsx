import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button, type ButtonProps } from './Button'

export interface GroupItem {
  id: string
  label: ReactNode
  ariaLabel?: string
  icon?: ReactNode
  disabled?: boolean
  shortcut?: string
  onSelect: () => void
}

/** Roving tabindex: exactly one control is in the tab order; arrows/Home/End move focus. */
function useRovingFocus(enabled: boolean[], onMove?: (index: number) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const key = enabled.map(Number).join(',')
  const [active, setActive] = useState(() => Math.max(0, enabled.indexOf(true)))

  useEffect(() => {
    if (!enabled[active] && key) setActive(Number(key.split(',')[0]))
  }, [active, key])

  const move = (index: number) => {
    setActive(index)
    onMove?.(index)
    refs.current[index]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const indexes = enabled.map((value, index) => value ? index : -1).filter(index => index >= 0)
    if (!indexes.length) return
    const current = Math.max(0, indexes.indexOf(active))
    const next = {
      ArrowRight: indexes[(current + 1) % indexes.length],
      ArrowDown: indexes[(current + 1) % indexes.length],
      ArrowLeft: indexes[(current - 1 + indexes.length) % indexes.length],
      ArrowUp: indexes[(current - 1 + indexes.length) % indexes.length],
      Home: indexes[0],
      End: indexes[indexes.length - 1],
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    move(next)
  }

  return { refs, active, setActive, onKeyDown }
}

/** Adjacent actions share one tab stop; use for committed actions, not navigation. */
export function ButtonGroup({ items, label, variant = 'outline', size = 'sm', className }: {
  items: GroupItem[]
  label: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
}) {
  const roving = useRovingFocus(items.map(item => !item.disabled))
  return (
    <div role="toolbar" aria-label={label} onKeyDown={roving.onKeyDown}
      className={cn('ui-action-group', className)}>
      {items.map((item, index) => (
        <Button
          key={item.id}
          ref={node => { roving.refs.current[index] = node }}
          variant={variant}
          size={size}
          disabled={item.disabled}
          aria-label={item.ariaLabel}
          shortcut={item.shortcut}
          tabIndex={index === roving.active ? 0 : -1}
          onFocus={() => roving.setActive(index)}
          onClick={item.onSelect}
        >
          {item.icon}{item.label}
        </Button>
      ))}
    </div>
  )
}

export interface Segment { value: string; label: ReactNode; icon?: ReactNode; disabled?: boolean }

/** Single-choice control with roving tabindex and arrow-key selection. */
export function SegmentedControl({ value, onValueChange, options, label, size = 'sm' }: {
  value: string
  onValueChange: (value: string) => void
  options: Segment[]
  label: string
  size?: ButtonProps['size']
}) {
  const enabled = options.map(option => !option.disabled)
  const roving = useRovingFocus(enabled, index => {
    const option = options[index]
    if (option && !option.disabled) onValueChange(option.value)
  })

  useEffect(() => {
    const index = options.findIndex(option => option.value === value)
    if (index >= 0) roving.setActive(index)
    // Path change is the only trigger: value is the controlled source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={roving.onKeyDown} className="ui-action-group">
      {options.map((option, index) => (
        <Button
          key={option.value}
          ref={node => { roving.refs.current[index] = node }}
          role="radio"
          aria-checked={option.value === value}
          variant={option.value === value ? 'secondary' : 'outline'}
          size={size}
          disabled={option.disabled}
          tabIndex={index === roving.active ? 0 : -1}
          onFocus={() => roving.setActive(index)}
          onClick={() => onValueChange(option.value)}
        >
          {option.icon}{option.label}
        </Button>
      ))}
    </div>
  )
}

export function ToggleButton({ pressed, onPressedChange, children, label, icon, size = 'sm' }: {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  children?: ReactNode
  label: string
  icon?: ReactNode
  size?: ButtonProps['size']
}) {
  return (
    <Button variant={pressed ? 'secondary' : 'outline'} size={size} aria-label={label} aria-pressed={pressed}
      className="ui-toggle" onClick={() => onPressedChange(!pressed)}>
      {icon}{children ?? label}
    </Button>
  )
}

/** Filter chip: a toggle button with a pill shape and a selected check mark. */
export function ChipFilter({ label, selected, onToggle }: {
  label: string
  selected: boolean
  onToggle: (selected: boolean) => void
}) {
  return (
    <Button className="ui-chip" size="sm" variant={selected ? 'secondary' : 'outline'}
      aria-pressed={selected} onClick={() => onToggle(!selected)}>
      {selected && <Check className="h-3.5 w-3.5" aria-hidden />}{label}
    </Button>
  )
}
