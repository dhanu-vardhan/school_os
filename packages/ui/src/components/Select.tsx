import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../lib/cn'

export interface SelectOption { value: string; label: string; disabled?: boolean }

export function Select({ value, onValueChange, options, placeholder = 'Select…', className, disabled, ariaLabel }: {
  value?: string; onValueChange?: (v: string) => void; options: SelectOption[]
  placeholder?: string; className?: string; disabled?: boolean; ariaLabel?: string
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger aria-label={ariaLabel}
        className={cn('focus-ring flex h-10 w-full items-center justify-between gap-2 rounded-md border border-line-strong bg-surface px-3 text-sm text-content data-[placeholder]:text-content-subtle disabled:opacity-60', className)}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon><ChevronDown className="h-4 w-4 text-content-subtle" /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" sideOffset={4} className="ui-scale-in z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-line bg-surface shadow-lg">
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center"><ChevronUp className="h-4 w-4" /></SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1">
            {options.map(o => (
              <SelectPrimitive.Item key={o.value} value={o.value} disabled={o.disabled}
                className="relative flex cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-3 text-sm text-content outline-none data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-700 data-[disabled]:opacity-50 dark:data-[highlighted]:bg-brand-500/15">
                <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
                  <SelectPrimitive.ItemIndicator><Check className="h-3.5 w-3.5" /></SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center"><ChevronDown className="h-4 w-4" /></SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
