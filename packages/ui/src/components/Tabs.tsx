import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../lib/cn'

export interface TabItem { value: string; label: string; icon?: React.ReactNode; content: React.ReactNode }

export function Tabs({ items, value, onValueChange, className }: {
  items: TabItem[]; value?: string; onValueChange?: (v: string) => void; className?: string
}) {
  return (
    <TabsPrimitive.Root value={value} defaultValue={value ?? items[0]?.value} onValueChange={onValueChange} className={cn('w-full', className)}>
      <TabsPrimitive.List className="ui-scroll flex gap-1 overflow-x-auto border-b border-line" aria-label="Sections">
        {items.map(t => (
          <TabsPrimitive.Trigger key={t.value} value={t.value}
            className="focus-ring relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium text-content-muted transition-colors hover:text-content data-[state=active]:text-brand-700 data-[state=active]:after:absolute data-[state=active]:after:inset-x-2 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:rounded-full data-[state=active]:after:bg-brand-600 dark:data-[state=active]:text-brand-300">
            {t.icon}{t.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map(t => (
        <TabsPrimitive.Content key={t.value} value={t.value} className="focus-ring pt-5 outline-none">
          {t.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}
