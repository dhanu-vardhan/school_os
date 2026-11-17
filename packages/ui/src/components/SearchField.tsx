import { Search, X } from 'lucide-react'
import { Input } from './Field'
import { cn } from '../lib/cn'

export function SearchField({ value, onChange, placeholder, className, ariaLabel }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string; ariaLabel?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-subtle" aria-hidden />
      <Input aria-label={ariaLabel ?? placeholder ?? 'Search'} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="pl-9 pr-9" />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange('')}
          className="focus-ring absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-content-subtle hover:bg-surface-3">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
