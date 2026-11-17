import { Command } from 'cmdk'
import { Search } from 'lucide-react'

export interface CommandItem { id: string; label: string; group?: string; icon?: React.ReactNode; onSelect: () => void }

export function CommandPalette({ open, onOpenChange, items }: {
  open: boolean; onOpenChange: (v: boolean) => void; items: CommandItem[]
}) {
  const groups = Array.from(new Set(items.map(i => i.group ?? 'General')))
  return (
    <Command.Dialog open={open} onOpenChange={onOpenChange} label="Global command palette"
      className="fixed left-1/2 top-[15vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
      <div className="flex items-center gap-2 border-b border-line px-4">
        <Search className="h-4 w-4 text-content-subtle" />
        <Command.Input autoFocus placeholder="Search pages and actions…"
          className="h-12 w-full bg-transparent text-sm text-content outline-none placeholder:text-content-subtle" />
        <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] text-content-subtle">ESC</kbd>
      </div>
      <Command.List className="ui-scroll max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-content-muted">No matches found.</Command.Empty>
        {groups.map(group => (
          <Command.Group key={group} heading={group} className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-content-subtle">
            {items.filter(i => (i.group ?? 'General') === group).map(item => (
              <Command.Item key={item.id} value={item.label} onSelect={() => { item.onSelect(); onOpenChange(false) }}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-content data-[selected=true]:bg-brand-50 data-[selected=true]:text-brand-800 dark:data-[selected=true]:bg-brand-500/15 dark:data-[selected=true]:text-brand-100">
                {item.icon}<span>{item.label}</span>
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  )
}
