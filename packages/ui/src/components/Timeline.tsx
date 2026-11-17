import { cn } from '../lib/cn'

export function Timeline({ items }: {
  items: { id: string; title: string; description?: string; time?: string; tone?: 'brand' | 'accent' | 'warning' | 'danger' }[]
}) {
  const tones = {
    brand: 'bg-brand-500', accent: 'bg-accent-500', warning: 'bg-warning-500', danger: 'bg-danger-500',
  }
  return (
    <ol className="relative space-y-5 border-l border-line pl-6">
      {items.map(item => (
        <li key={item.id} className="relative">
          <span className={cn('absolute -left-[1.9rem] top-1 h-3 w-3 rounded-full ring-4 ring-surface', tones[item.tone ?? 'brand'])} />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-content">{item.title}</p>
            {item.time && <time className="text-xs text-content-subtle">{item.time}</time>}
          </div>
          {item.description && <p className="mt-0.5 text-sm text-content-muted">{item.description}</p>}
        </li>
      ))}
    </ol>
  )
}
