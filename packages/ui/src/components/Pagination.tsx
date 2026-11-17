import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/cn'

export function Pagination({ page, pageSize, total, onPageChange }: {
  page: number; pageSize: number; total: number; onPageChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-content-muted">
      <span className="tnum">{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}
          className="focus-ring flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(5, pages) }).map((_, i) => {
          const start = Math.max(1, Math.min(page - 2, pages - 4))
          const n = start + i
          if (n > pages) return null
          return (
            <button key={n} type="button" onClick={() => onPageChange(n)} aria-current={n === page ? 'page' : undefined}
              className={cn('focus-ring h-8 min-w-8 rounded-md px-2 text-xs', n === page ? 'bg-brand-600 text-white' : 'border border-line bg-surface hover:bg-surface-2')}>
              {n}
            </button>
          )
        })}
        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onPageChange(page + 1)}
          className="focus-ring flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
