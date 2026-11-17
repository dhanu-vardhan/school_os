import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from '../lib/cn'

export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({ content, children, side = 'top' }: {
  content: React.ReactNode; children: React.ReactNode; side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <TooltipPrimitive.Root delayDuration={250}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content side={side} sideOffset={6}
          className="ui-scale-in z-50 max-w-xs rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900">
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

export function DropdownMenu({ trigger, items, align = 'end' }: {
  trigger: React.ReactNode
  items: { label: string; onSelect?: () => void; icon?: React.ReactNode; danger?: boolean; disabled?: boolean; separatorBefore?: boolean }[]
  align?: 'start' | 'center' | 'end'
}) {
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content align={align} sideOffset={6} className="ui-scale-in z-50 min-w-48 rounded-lg border border-line bg-surface p-1 shadow-lg">
          {items.map((item, i) => (
            <div key={`${item.label}-${i}`}>
              {item.separatorBefore && <DropdownPrimitive.Separator className="my-1 h-px bg-line" />}
              <DropdownPrimitive.Item disabled={item.disabled} onSelect={item.onSelect}
                className={cn('flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-surface-3 data-[disabled]:opacity-50',
                  item.danger ? 'text-danger-600 data-[highlighted]:bg-danger-50' : 'text-content')}>
                {item.icon}{item.label}
              </DropdownPrimitive.Item>
            </div>
          ))}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  )
}
