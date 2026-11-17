import { cn } from '../lib/cn'
import { Button } from './Button'

export interface KanbanCard { id: string; title: string; subtitle?: string; badge?: string }
export interface KanbanColumn { id: string; title: string; tone?: 'brand' | 'accent' | 'warning' | 'danger'; cards: KanbanCard[] }

export function Kanban({ columns, onCardClick }: {
  columns: KanbanColumn[]; onCardClick?: (columnId: string, cardId: string) => void
}) {
  const dots = { brand: 'bg-brand-500', accent: 'bg-accent-500', warning: 'bg-warning-500', danger: 'bg-danger-500' }
  return (
    <div className="ui-scroll flex gap-4 overflow-x-auto pb-2">
      {columns.map(col => (
        <section key={col.id} className="w-72 shrink-0 rounded-lg border border-line bg-surface-2 p-3">
          <header className="mb-3 flex items-center justify-between px-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-content">
              <span className={cn('h-2 w-2 rounded-full', dots[col.tone ?? 'brand'])} />{col.title}
            </h3>
            <span className="tnum rounded-full bg-surface px-2 text-xs text-content-muted">{col.cards.length}</span>
          </header>
          <div className="space-y-2">
            {col.cards.map(card => (
              <Button key={card.id} variant="bare" onClick={() => onCardClick?.(col.id, card.id)}
                aria-label={card.title}
                className="block w-full rounded-md border border-line bg-surface p-3 text-left shadow-xs transition-shadow hover:shadow-md">
                <p className="text-sm font-medium text-content">{card.title}</p>
                {card.subtitle && <p className="mt-1 text-xs text-content-muted">{card.subtitle}</p>}
                {card.badge && <span className="mt-2 inline-block rounded bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">{card.badge}</span>}
              </Button>
            ))}
            {col.cards.length === 0 && <p className="rounded-md border border-dashed border-line px-3 py-6 text-center text-xs text-content-subtle">Empty</p>}
          </div>
        </section>
      ))}
    </div>
  )
}
