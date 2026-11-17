import { useId } from 'react'

export interface Point { label: string; value: number; secondary?: number }

export function TrendChart({ data, height = 180 }: { data: Point[]; height?: number }) {
  const gradientId = useId().replace(/:/g, '')
  const width = 640
  const pad = 24
  const max = Math.max(...data.map(d => d.value), 1)
  const min = Math.min(...data.map(d => d.value), 0)
  const span = Math.max(1, max - min)
  const x = (i: number) => pad + (i * (width - pad * 2)) / Math.max(1, data.length - 1)
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2)
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.value)}`).join(' ')
  const area = `${line} L${x(data.length - 1)},${height - pad} L${x(0)},${height - pad} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Trend chart" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--brand-500))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(var(--brand-500))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map(t => <line key={t} x1={pad} x2={width - pad} y1={pad + t * (height - pad * 2)} y2={pad + t * (height - pad * 2)} stroke="rgb(var(--border))" strokeDasharray="4 4" />)}
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="rgb(var(--brand-600))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.label}>
          <circle cx={x(i)} cy={y(d.value)} r="4" fill="rgb(var(--surface))" stroke="rgb(var(--brand-600))" strokeWidth="2" />
          <text x={x(i)} y={height - 6} textAnchor="middle" className="fill-[rgb(var(--text-subtle))] text-[10px]">{d.label}</text>
        </g>
      ))}
    </svg>
  )
}

export function BarChart({ data, height = 180 }: { data: Point[]; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-3" style={{ height }} role="img" aria-label="Bar chart">
      {data.map(d => (
        <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="tnum text-[11px] font-semibold text-content-muted">{d.value}</span>
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t-md bg-gradient-to-t from-brand-500 to-accent-400 transition-all duration-slow" style={{ height: `${(d.value / max) * 100}%` }} title={`${d.label}: ${d.value}`} />
          </div>
          <span className="w-full truncate text-center text-[10px] text-content-subtle">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
