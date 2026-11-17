import { cn } from '../lib/cn'

export interface CalendarEvent {
  id: string
  day: number // 0 = Monday
  start: number // hours from midnight, may be fractional
  end: number
  title: string
  subtitle?: string
  tone?: 'brand' | 'accent' | 'warning' | 'danger' | 'info'
}

export function CalendarGrid({ days, startHour = 8, endHour = 18, events, onEventClick }: {
  days: { label: string; date?: string }[]
  startHour?: number; endHour?: number; events: CalendarEvent[]
  onEventClick?: (e: CalendarEvent) => void
}) {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const tones = {
    brand: 'border-l-brand-500 bg-brand-50 text-brand-900 dark:bg-brand-500/15 dark:text-brand-100',
    accent: 'border-l-accent-500 bg-accent-50 text-accent-900 dark:bg-accent-500/15 dark:text-accent-100',
    warning: 'border-l-warning-500 bg-warning-50 text-warning-900 dark:bg-warning-500/15 dark:text-warning-100',
    danger: 'border-l-danger-500 bg-danger-50 text-danger-900 dark:bg-danger-500/15 dark:text-danger-100',
    info: 'border-l-info-500 bg-info-50 text-info-900 dark:bg-info-500/15 dark:text-info-100',
  }
  return (
    <div className="ui-scroll overflow-x-auto rounded-lg border border-line bg-surface">
      <div className="min-w-[720px]">
        <div className="grid border-b border-line bg-surface-2" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="px-2 py-3 text-center text-xs text-content-subtle">UTC+1</div>
          {days.map(d => (
            <div key={d.label} className="border-l border-line px-2 py-3 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">{d.label}</p>
              {d.date && <p className="tnum mt-0.5 text-sm font-semibold text-content">{d.date}</p>}
            </div>
          ))}
        </div>
        <div className="relative">
          {hours.map(h => (
            <div key={h} className="grid border-b border-line/60 last:border-0" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))`, height: 64 }}>
              <div className="tnum px-2 pt-1 text-right text-[11px] text-content-subtle">{String(h).padStart(2, '0')}:00</div>
              {days.map(d => <div key={d.label} className="border-l border-line/60" />)}
            </div>
          ))}
          <div className="pointer-events-none absolute inset-0" style={{ left: 64, gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, display: 'grid' }}>
            {days.map((_, dayIndex) => (
              <div key={dayIndex} className="relative border-l border-transparent">
                {events.filter(e => e.day === dayIndex).map(e => {
                  const top = (e.start - startHour) * 64
                  const height = Math.max(28, (e.end - e.start) * 64 - 4)
                  return (
                    <button key={e.id} type="button" onClick={() => onEventClick?.(e)}
                      className={cn('pointer-events-auto absolute inset-x-1 overflow-hidden rounded border-l-[3px] px-2 py-1 text-left shadow-xs transition-shadow hover:shadow-md', tones[e.tone ?? 'brand'])}
                      style={{ top, height }}>
                      <p className="truncate text-xs font-semibold">{e.title}</p>
                      {height > 42 && e.subtitle && <p className="truncate text-[11px] opacity-80">{e.subtitle}</p>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
