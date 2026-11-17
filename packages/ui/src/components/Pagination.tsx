import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/cn'
import { useActionLabels } from './ActionLabels'
import { Button } from './Button'
import { IconButton } from './IconButton'

export function Pagination({ page, pageSize, total, onPageChange }: {
  page: number; pageSize: number; total: number; onPageChange: (page: number) => void
}) {
  const labels = useActionLabels()
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <nav aria-label={labels.actions} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-content-muted">
      <span className="tnum">{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <IconButton label={labels.previousPage} variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </IconButton>
        {Array.from({ length: Math.min(5, pages) }).map((_, i) => {
          const start = Math.max(1, Math.min(page - 2, pages - 4))
          const n = start + i
          if (n > pages) return null
          return (
            <Button key={n} variant={n === page ? 'secondary' : 'outline'} size="icon-sm"
              aria-current={n === page ? 'page' : undefined}
              aria-label={`${labels.actions} ${n}`}
              className={cn('min-w-8', n === page && 'border-action-ai-border')}
              onClick={() => onPageChange(n)}>
              {n}
            </Button>
          )
        })}
        <IconButton label={labels.nextPage} variant="outline" size="icon-sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </IconButton>
      </div>
    </nav>
  )
}
