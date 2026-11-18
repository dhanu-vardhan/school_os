import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { formatPercent } from '../domain/format'
import type { Tone } from '../domain/models'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`ds-card ${className}`.trim()}>{children}</section>
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="ds-page-head">
      <div>
        <div className="ds-eyebrow">{eyebrow}</div>
        <h1 className="ds-title">{title}</h1>
        <p className="ds-subtitle">{subtitle}</p>
      </div>
      {actions && <div className="ds-actions">{actions}</div>}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="ds-card-head">
      <div>
        <h2 className="ds-card-title">{title}</h2>
        {subtitle && <p className="ds-card-sub">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Badge({ tone = 'gray', children }: { tone?: 'gray' | 'indigo' | 'green' | 'amber' | 'red'; children: ReactNode }) {
  return <span className={`ds-badge ${tone}`}>{children}</span>
}

export function Delta({ value }: { value: number }) {
  const up = value >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return <span className={`ds-delta ${up ? 'up' : 'down'}`}><Icon size={12} aria-hidden="true" />{formatPercent(value)}</span>
}

const sparkColors: Record<Tone, string> = {
  indigo: '#4f46e5',
  emerald: '#059669',
  amber: '#d97706',
  sky: '#0284c7',
}

export function Sparkline({ values, tone }: { values: number[]; tone: Tone }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * 74
    const y = 28 - ((v - min) / span) * 25
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg className="ds-kpi-spark" viewBox="0 0 74 30" role="img" aria-label="Tendance sur 12 periodes">
      <polyline points={points} fill="none" stroke={sparkColors[tone]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
