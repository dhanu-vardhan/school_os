import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from '../lib/cn'
import { useActionLabels } from './ActionLabels'

export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({ content, children, side = 'top' }: {
  content: React.ReactNode; children: React.ReactNode; side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <TooltipPrimitive.Root delayDuration={250}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content side={side} sideOffset={6}
          className="ui-scale-in z-50 max-w-xs rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-0 shadow-lg dark:bg-neutral-100 dark:text-neutral-900">
          {content}
          <TooltipPrimitive.Arrow className="fill-neutral-900 dark:fill-neutral-100" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export function Popover({ trigger, children, align = 'start', className }: {
  trigger: React.ReactNode; children: React.ReactNode; align?: 'start' | 'center' | 'end'; className?: string
}) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content align={align} sideOffset={6}
          className={cn('ui-scale-in z-50 rounded-lg border border-line bg-surface p-3 shadow-lg', className)}>
          {children}
          <PopoverPrimitive.Arrow className="fill-surface" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export interface DropdownMenuItem {
  label: string
  onSelect?: () => void
  icon?: React.ReactNode
  danger?: boolean
  disabled?: boolean
  separatorBefore?: boolean
  /** Non-destructive groups render in declaration order; destructive items are always last. */
  group?: string
  shortcut?: string
}

/** Grouped action menu with shortcut hints and destructive actions pushed to the end. */
export function DropdownMenu({ trigger, items, align = 'end', label }: {
  trigger: React.ReactNode
  items: DropdownMenuItem[]
  align?: 'start' | 'center' | 'end'
  label?: string
}) {
  const labels = useActionLabels()
  const safe = items.filter(item => !item.danger)
  const destructive = items.filter(item => item.danger).map((item, index) => (
    index === 0
      ? { ...item, separatorBefore: true, group: item.group ?? labels.destructive }
      : item
  ))
  const ordered = [...safe, ...destructive]
  let lastGroup: string | undefined

  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content align={align} sideOffset={6} aria-label={label ?? labels.actions}
          className="ui-scale-in z-50 min-w-48 rounded-lg border border-line bg-surface p-1 shadow-lg">
          {ordered.map((item, index) => {
            const showGroup = Boolean(item.group && item.group !== lastGroup)
            if (item.group) lastGroup = item.group
            return (
              <div key={`${item.label}-${index}`}>
                {showGroup && <DropdownPrimitive.Label className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-content-subtle">{item.group}</DropdownPrimitive.Label>}
                {item.separatorBefore && <DropdownPrimitive.Separator className="my-1 h-px bg-line" />}
                <DropdownPrimitive.Item disabled={item.disabled} onSelect={item.onSelect}
                  className={cn(
                    'flex min-h-touch cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-surface-3 data-[disabled]:opacity-50',
                    item.danger ? 'text-status-danger data-[highlighted]:bg-status-danger-bg' : 'text-content',
                  )}>
                  {item.icon}
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {item.shortcut && <kbd className="ui-kbd" aria-hidden>{item.shortcut}</kbd>}
                </DropdownPrimitive.Item>
              </div>
            )
          })}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  )
}
