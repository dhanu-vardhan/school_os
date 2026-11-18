import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { formatCompact, formatMoney } from '../domain/format'
import type { Segment, SeriesPoint } from '../domain/models'

const axisTick = { fontSize: 11, fill: '#98a2b3' }
const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e6e8ef',
  boxShadow: '0 8px 24px rgba(16,24,40,.10)',
  fontSize: 12,
}
const moneyFormatter = (value: unknown) => formatMoney(Number(value))

export function RevenueChart({ points, height = 252, format = 'money' }: { points: SeriesPoint[]; height?: number; format?: 'money' | 'percent' }) {
  const formatter = format === 'money'
    ? moneyFormatter
    : (value: unknown) => `${Number(value).toFixed(1).replace('.', ',')} %`
  return (
    <div className="ds-chart-wrap" role="img" aria-label={format === 'money' ? 'Graphique du revenu par periode par rapport a la periode precedente' : 'Graphique du taux de retention par periode'}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="dsRevenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eef0f6" vertical={false} />
          <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} tickFormatter={(v: number) => format === 'money' ? formatCompact(v) : `${v} %`} axisLine={false} tickLine={false} width={58} />
          <Tooltip contentStyle={tooltipStyle} formatter={formatter} />
          <Area type="monotone" dataKey="previous" name="Periode precedente" stroke="#cbd5e1" strokeDasharray="4 4" fill="none" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="current" name="Periode actuelle" stroke="#4f46e5" fill="url(#dsRevenueFill)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BarSeriesChart({ points, color = '#4f46e5', height = 220 }: { points: SeriesPoint[]; color?: string; height?: number }) {
  return (
    <div className="ds-chart-wrap" role="img" aria-label="Graphique en barres de la periode actuelle et precedente">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke="#eef0f6" vertical={false} />
          <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={42} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f5f6fa' }} />
          <Bar dataKey="previous" name="Precedent" fill="#e0e7ff" radius={[5, 5, 0, 0]} />
          <Bar dataKey="current" name="Actuel" fill={color} radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DonutChart({ segments, height = 190 }: { segments: Segment[]; height?: number }) {
  return (
    <div className="ds-chart-wrap" role="img" aria-label={`Repartition : ${segments.map((s) => `${s.name} ${s.value}`).join(', ')}`}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={segments} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={3} stroke="none">
            {segments.map((segment) => <Cell key={segment.name} fill={segment.color} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ChartLegend({ segments }: { segments: Segment[] }) {
  return (
    <div className="ds-legend">
      {segments.map((segment) => (
        <span key={segment.name}><i style={{ background: segment.color }} />{segment.name} · {segment.value}{segment.value < 100 ? ' %' : ''}</span>
      ))}
    </div>
  )
}
