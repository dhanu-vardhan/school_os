import { useId } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '../lib/cn'
import { Input } from './Field'
import { Button } from './Button'

const iso = (d: Date) => d.toISOString().slice(0, 10)

export function DatePicker({ value, onChange, label, min, max, className, disabled }: {
  value?: string; onChange: (v: string) => void; label?: string; min?: string; max?: string
  className?: string; disabled?: boolean
}) {
  const id = useId()
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <label htmlFor={id} className="block text-xs font-medium text-content">{label}</label>}
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-subtle" />
        <Input id={id} type="date" value={value ?? ''} min={min} max={max} disabled={disabled}
          onChange={e => onChange(e.target.value)} className="pl-9 [color-scheme:light] dark:[color-scheme:dark]" />
      </div>
    </div>
  )
}

export function DateRange({ from, to, onChange, className }: {
  from: string; to: string; onChange: (from: string, to: string) => void; className?: string
}) {
  const presets = [
    { label: '7d', days: 7 },
    { label: '30d', days: 30 },
    { label: '90d', days: 90 },
  ]
  return (
    <div className={cn('flex flex-wrap items-end gap-2', className)}>
      <DatePicker label="From" value={from} onChange={v => onChange(v, to)} className="w-40" />
      <DatePicker label="To" value={to} onChange={v => onChange(from, v)} className="w-40" />
      <div className="flex gap-1 pb-0.5">
        {presets.map(p => (
          <Button key={p.label} variant="outline" size="sm" onClick={() => {
            const end = new Date()
            const start = new Date(end.getTime() - p.days * 86400000)
            onChange(iso(start), iso(end))
          }} className="px-2.5 text-content-muted hover:text-content">
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
