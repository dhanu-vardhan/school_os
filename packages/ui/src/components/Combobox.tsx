import { useState } from 'react'
import { Command } from 'cmdk'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '../lib/cn'
import type { SelectOption } from './Select'

export function Combobox({ value, onValueChange, options, placeholder = 'Search…', className, ariaLabel }: {
  value?: string; onValueChange: (v: string) => void; options: SelectOption[]
  placeholder?: string; className?: string; ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" aria-label={ariaLabel} className={cn('focus-ring flex h-10 w-full items-center justify-between gap-2 rounded-md border border-line-strong bg-surface px-3 text-sm text-content', className)}>
          <span className={cn(!selected && 'text-content-subtle')}>{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 text-content-subtle" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} className="z-50 w-[var(--radix-popover-trigger-width)] rounded-md border border-line bg-surface p-1 shadow-lg">
          <Command className="ui-scroll max-h-64 overflow-auto" loop>
            <Command.Input placeholder={placeholder} className="focus-ring mb-1 w-full border-b border-line bg-transparent px-2 py-2 text-sm outline-none" />
            <Command.List>
              <Command.Empty className="px-3 py-6 text-center text-sm text-content-muted">No results</Command.Empty>
              {options.map(o => (
                <Command.Item key={o.value} value={o.label} onSelect={() => { onValueChange(o.value); setOpen(false) }}
                  className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-2 text-sm text-content data-[selected=true]:bg-brand-50 dark:data-[selected=true]:bg-brand-500/15">
                  {o.label}
                  {o.value === value && <Check className="h-4 w-4 text-brand-600" />}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
