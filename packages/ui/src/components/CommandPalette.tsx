import { Command } from 'cmdk'
import { Search } from 'lucide-react'
import { useActionLabels } from './ActionLabels'

export interface CommandItem {
  id: string
  label: string
  group?: string
  icon?: React.ReactNode
  shortcut?: string
  onSelect: () => void
}

export function CommandPalette({ open, onOpenChange, items, label }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  items: CommandItem[]
  label?: string
}) {
  const labels = useActionLabels()
  const groups = Array.from(new Set(items.map(item => item.group ?? labels.general)))
  return (
    <Command.Dialog open={open} onOpenChange={onOpenChange} label={label ?? labels.commandPalette}
      className="fixed left-1/2 top-[15vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
      <div className="flex items-center gap-2 border-b border-line px-4">
        <Search className="h-4 w-4 text-content-subtle" aria-hidden />
        <Command.Input autoFocus placeholder={labels.searchPages} aria-label={labels.searchPages}
          className="h-12 w-full bg-surface/0 text-sm text-content outline-none placeholder:text-content-subtle" />
        <kbd className="ui-kbd" aria-hidden>ESC</kbd>
      </div>
      <Command.List className="ui-scroll max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-content-muted">{labels.noMatches}</Command.Empty>
        {groups.map(group => (
          <Command.Group key={group} heading={group} className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-content-subtle">
            {items.filter(item => (item.group ?? labels.general) === group).map(item => (
              <Command.Item key={item.id} value={item.label} onSelect={() => { item.onSelect(); onOpenChange(false) }}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-content data-[selected=true]:bg-brand-50 data-[selected=true]:text-brand-800 dark:data-[selected=true]:bg-brand-500/15 dark:data-[selected=true]:text-brand-100">
                {item.icon}
                <span className="min-w-0 flex-1">{item.label}</span>
                {item.shortcut && <kbd className="ui-kbd" aria-hidden>{item.shortcut}</kbd>}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  )
}
