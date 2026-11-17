import { Search, X } from 'lucide-react'
import { Input } from './Field'
import { cn } from '../lib/cn'
import { useActionLabels } from './ActionLabels'
import { IconButton } from './IconButton'

export function SearchField({ value, onChange, placeholder, className, ariaLabel }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string; ariaLabel?: string
}) {
  const labels = useActionLabels()
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-subtle" aria-hidden />
      <Input aria-label={ariaLabel ?? placeholder ?? labels.search} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="pl-9 pr-9" />
      {value && (
        <IconButton label={labels.clearSearch} variant="ghost" size="icon-sm"
          className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-content-subtle"
          onClick={() => onChange('')}>
          <X className="h-3.5 w-3.5" />
        </IconButton>
      )}
    </div>
  )
}
