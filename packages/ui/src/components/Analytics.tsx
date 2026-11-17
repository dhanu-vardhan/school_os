/**
 * Governed analytics UI kit.
 *
 * Every chart here is question-led, exposes its sample size in tooltips and in a
 * table alternative, and never encodes meaning with colour alone. All colours come
 * from the chart tokens in styles.css, so light/dark and high-contrast themes work.
 */
import { useId, useState, type ReactNode } from 'react'
import {
  AlertTriangle, BookOpen, CheckCircle2, ChevronRight, Clock3, Info,
  RotateCcw, Save, ShieldCheck, SlidersHorizontal, TrendingDown, TrendingUp,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { Badge } from './Badge'
import { Button } from './Button'
import { Card, CardBody, CardHeader } from './Card'
import { FormField, Input, Textarea } from './Field'
import { Select, type SelectOption } from './Select'

export interface ChartPoint {
  label: string
  value: number
  n: number
  key?: string
  suppressed?: boolean
  ci?: { lower: number; upper: number; method: string }
}

export interface AnalyticsFilterValue {
  year?: string
  term?: string
  classId?: string
  level?: string
  subject?: string
  grain?: string
  from?: string
  to?: string
}

export interface AnalyticsFilterOptions {
  years?: SelectOption[]
  terms?: SelectOption[]
  classes?: SelectOption[]
  levels?: SelectOption[]
  subjects?: SelectOption[]
  grains?: SelectOption[]
}

export interface AnalyticsLabels {
  all: string
  year: string
  term: string
  class: string
  level: string
  subject: string
  grain: string
  from: string
  to: string
  saveView: string
  viewName: string
  savedViews: string
  reset: string
  apply: string
}

const SERIES_CLASSES = [
  'ui-chart-series-1', 'ui-chart-series-2', 'ui-chart-series-3',
  'ui-chart-series-4', 'ui-chart-series-5', 'ui-chart-series-6',
]

function CiNote({ ci, formatter }: { ci?: ChartPoint['ci']; formatter: (value: number) => string }) {
  if (!ci || ci.method === 'none') return null
  return <span className="text-[11px] text-content-subtle">IC {formatter(ci.lower)}–{formatter(ci.upper)}</span>
}

/* ------------------------------------------------------------------ MetricCard */

export function MetricCard({
  label, value, unit, n, ci, change, target, goodDirection = 'up',
  lowSample, suppressed, mock, dataAsOf, onOpen, openLabel, detail,
}: {
  label: string
  value: string
  unit?: string
  n?: number
  ci?: ChartPoint['ci']
  change?: number
  target?: number
  goodDirection?: 'up' | 'down' | 'neutral'
  lowSample?: boolean
  suppressed?: boolean
  mock?: boolean
  dataAsOf?: string
  onOpen?: () => void
  openLabel?: string
  detail?: ReactNode
}) {
  const positive = change !== undefined && (goodDirection === 'up' ? change >= 0 : change <= 0)
  const ChangeIcon = positive ? TrendingUp : TrendingDown
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-content-subtle">{label}</span>
        {mock && <Badge tone="info">Démo</Badge>}
      </div>
      <div className="tnum mt-2 font-display text-3xl font-bold tracking-tight text-content">
        {suppressed || lowSample ? '—' : value}
        {!suppressed && !lowSample && unit && <span className="ml-1 text-sm font-medium text-content-muted">{unit}</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-content-muted">
        {change !== undefined && !lowSample && !suppressed && (
          <span className={cn('inline-flex items-center gap-1 font-medium', positive ? 'text-accent-700 dark:text-accent-300' : 'text-danger-700 dark:text-danger-300')}>
            <ChangeIcon className="h-3.5 w-3.5" aria-hidden />
            {Math.abs(change).toFixed(1)} pt
          </span>
        )}
        {target !== undefined && <span className="text-content-subtle">Cible {target}</span>}
        {lowSample && <Badge tone="warning">Effectif faible</Badge>}
        {suppressed && <Badge tone="neutral">Données masquées</Badge>}
      </div>
      {detail && <div className="mt-2 text-xs text-content-muted">{detail}</div>}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-4 text-[11px] text-content-subtle">
        <div className="space-y-0.5">
          <div>n = {n ?? '—'}</div>
          <CiNote ci={ci} formatter={v => String(Math.round(v * 10) / 10)} />
        </div>
        {dataAsOf && <div className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" aria-hidden />{dataAsOf.slice(0, 10)}</div>}
      </div>
      {onOpen && <Button variant="ghost" size="sm" className="mt-2 self-start" onClick={onOpen}>{openLabel ?? 'Détails'}</Button>}
    </Card>
  )
}

/* ------------------------------------------------------------------ ChartCard */

export function ChartCard({
  question, subtitle, action, metaLine, children, className,
}: {
  question: string
  subtitle?: string
  action?: ReactNode
  metaLine?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader
        title={<span className="text-sm">{question}</span>}
        description={subtitle}
        action={action}
      />
      {metaLine && <div className="border-b border-line px-5 py-2 text-[11px] text-content-subtle">{metaLine}</div>}
      <CardBody>{children}</CardBody>
    </Card>
  )
}

/* --------------------------------------------------------------- AnalyticsChart */

/**
 * Accessible bar chart. The visual is a labelled list of proportional bars; the
 * `<details>` block is the equivalent data table required for screen readers and
 * for users who need exact values. Suppressed cells show a hatched band and no value.
 */
export function AnalyticsChart({
  points, ariaSummary, tableLabel, valueFormatter = v => String(Math.round(v * 10) / 10),
  series = 1, onSelect, selectedKey, emptyLabel, className,
}: {
  points: readonly ChartPoint[]
  /** One-sentence spoken summary answering the chart question. */
  ariaSummary: string
  tableLabel: string
  valueFormatter?: (value: number) => string
  series?: number
  onSelect?: (key: string) => void
  selectedKey?: string
  emptyLabel?: string
  className?: string
}) {
  const tableId = useId()
  const displayable = points.filter(p => !p.suppressed)
  const max = Math.max(1, ...displayable.map(p => Math.abs(p.value)))
  const seriesClass = SERIES_CLASSES[(series - 1) % SERIES_CLASSES.length]!

  if (!points.length) {
    return <p className="py-8 text-center text-sm text-content-muted" role="status">{emptyLabel ?? 'Aucune donnée affichable.'}</p>
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div role="img" aria-label={ariaSummary} className="space-y-2.5">
        {points.map((point) => {
          const width = point.suppressed ? 12 : Math.max(2, Math.round(Math.abs(point.value) / max * 100))
          const accessible = `${point.label} : ${point.suppressed ? 'données masquées' : valueFormatter(point.value)} ; n = ${point.n}${point.ci && point.ci.method !== 'none' ? ` ; intervalle de confiance ${valueFormatter(point.ci.lower)} à ${valueFormatter(point.ci.upper)}` : ''}`
          return (
            <div key={point.key ?? point.label} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,11rem)_1fr_auto]">
              <span className="truncate text-xs text-content" title={point.label}>{point.label}</span>
              <div className="ui-chart-tooltip relative h-3 rounded-full bg-surface-3" tabIndex={0} aria-label={accessible} title={accessible}>
                <div
                  className={cn('ui-chart-bar', point.suppressed ? 'ui-chart-suppressed' : seriesClass)}
                  style={{ width: `${width}%` }}
                />
              </div>
              <div className="flex w-24 items-center justify-end gap-2 text-right">
                <span className="tnum text-xs font-semibold text-content">{point.suppressed ? 'n<seuil' : valueFormatter(point.value)}</span>
                {onSelect && point.key && (
                  <Button
                    variant="ghost" size="icon-sm"
                    aria-label={`${point.label} — voir le détail`}
                    aria-pressed={selectedKey === point.key}
                    onClick={() => onSelect(point.key!)}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <details className="rounded-md border border-line bg-surface-2" aria-controls={tableId}>
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-content">{tableLabel}</summary>
        <div id={tableId} className="overflow-x-auto px-3 pb-3">
          <table className="w-full text-left text-xs">
            <caption className="ui-sr-only">{ariaSummary}</caption>
            <thead className="ui-sticky-head">
              <tr className="border-b border-line text-content-subtle">
                <th scope="col" className="py-2 pr-3 font-medium">Groupe</th>
                <th scope="col" className="py-2 pr-3 font-medium">Valeur</th>
                <th scope="col" className="py-2 pr-3 font-medium">n</th>
                <th scope="col" className="py-2 font-medium">Intervalle</th>
              </tr>
            </thead>
            <tbody>
              {points.map(p => (
                <tr key={p.key ?? p.label} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 pr-3 font-medium text-content">{p.label}</th>
                  <td className="tnum py-2 pr-3 text-content">{p.suppressed ? 'masqué' : valueFormatter(p.value)}</td>
                  <td className="tnum py-2 pr-3 text-content-muted">{p.n}</td>
                  <td className="tnum py-2 text-content-muted">{p.ci && p.ci.method !== 'none' ? `${valueFormatter(p.ci.lower)}–${valueFormatter(p.ci.upper)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

/* ------------------------------------------------------------------ DrillDown */

export function DrillDown({
  title, rows, onSelect, selectedKey, emptyLabel,
}: {
  title: string
  rows: readonly ChartPoint[]
  onSelect: (key: string) => void
  selectedKey?: string
  emptyLabel?: string
}) {
  return (
    <Card>
      <CardHeader title={<span className="text-sm">{title}</span>} />
      <CardBody className="p-2">
        {rows.length === 0
          ? <p className="p-4 text-sm text-content-muted">{emptyLabel ?? 'Aucun détail disponible à ce niveau.'}</p>
          : <ul className="divide-y divide-line">
            {rows.map(row => (
              <li key={row.key ?? row.label}>
                <Button
                  variant="bare" size="bare"
                  aria-pressed={selectedKey === row.key}
                  className={cn('flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left hover:bg-surface-2', selectedKey === row.key && 'bg-surface-3')}
                  onClick={() => row.key && onSelect(row.key)}
                  disabled={!row.key}
                >
                  <span className="text-sm text-content">{row.label}</span>
                  <span className="flex items-center gap-2 text-xs text-content-muted">
                    <span className="tnum">{row.suppressed ? 'masqué' : row.value}</span>
                    <span>n={row.n}</span>
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </span>
                </Button>
              </li>
            ))}
          </ul>}
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------- InsightCard */

export function InsightCard({
  severity, title, evidence, action, why, onViewEvidence, onDismiss, onSnooze,
  viewLabel = 'Voir les données', dismissLabel = 'Masquer', snoozeLabel = 'Reporter',
}: {
  severity: 'critical' | 'warning' | 'info' | 'opportunity'
  title: string
  evidence: string
  action: string
  why: string
  onViewEvidence?: () => void
  onDismiss?: () => void
  onSnooze?: () => void
  viewLabel?: string
  dismissLabel?: string
  snoozeLabel?: string
}) {
  const tone = severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : severity === 'opportunity' ? 'success' : 'info'
  const Icon = severity === 'critical' ? AlertTriangle : severity === 'warning' ? AlertTriangle : severity === 'opportunity' ? TrendingUp : Info
  return (
    <Card className="h-full">
      <CardBody className="space-y-3 p-4">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-content-muted" aria-hidden />
          <h3 className="text-sm font-semibold text-content">{title}</h3>
          <Badge tone={tone} className="ml-auto shrink-0">{severity}</Badge>
        </div>
        <p className="text-sm text-content-muted">{evidence}</p>
        <div className="rounded-md border border-status-info-border bg-status-info-bg p-3">
          <p className="flex items-start gap-2 text-xs text-content">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {action}
          </p>
        </div>
        <details className="text-xs text-content-subtle">
          <summary className="cursor-pointer">Pourquoi vois-je ceci ?</summary>
          <p className="pt-2">{why}</p>
        </details>
        <div className="flex flex-wrap gap-1.5">
          {onViewEvidence && <Button size="sm" variant="secondary" onClick={onViewEvidence}>{viewLabel}</Button>}
          {onSnooze && <Button size="sm" variant="ghost" onClick={onSnooze}>{snoozeLabel}</Button>}
          {onDismiss && <Button size="sm" variant="ghost" onClick={onDismiss}>{dismissLabel}</Button>}
        </div>
      </CardBody>
    </Card>
  )
}

/* -------------------------------------------------------------------- FilterBar */

/** Filter bar; URL synchronisation is performed by the page and passed through value/onChange. */
export function FilterBar({
  value, options, labels, onChange, onReset, onSave, savedViews = [], onLoadView,
}: {
  value: AnalyticsFilterValue
  options: AnalyticsFilterOptions
  labels: AnalyticsLabels
  onChange: (patch: Partial<AnalyticsFilterValue>) => void
  onReset?: () => void
  onSave?: (name: string) => void
  savedViews?: { id: string; name: string }[]
  onLoadView?: (id: string) => void
}) {
  const [viewName, setViewName] = useState('')
  const all: SelectOption = { value: '', label: labels.all }
  const fields: Array<{ key: keyof AnalyticsFilterValue; label: string; options: SelectOption[] }> = [
    { key: 'year', label: labels.year, options: options.years ?? [] },
    { key: 'term', label: labels.term, options: options.terms ?? [] },
    { key: 'classId', label: labels.class, options: options.classes ?? [] },
    { key: 'level', label: labels.level, options: options.levels ?? [] },
    { key: 'subject', label: labels.subject, options: options.subjects ?? [] },
    { key: 'grain', label: labels.grain, options: options.grains ?? [{ value: 'term', label: 'Trimestre' }, { value: 'month', label: 'Mois' }, { value: 'week', label: 'Semaine' }] },
  ]
  return (
    <Card className="mb-5">
      <CardBody className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {fields.map(field => (
            <FormField key={field.key} label={field.label}>
              {() => (
                <Select
                  ariaLabel={field.label}
                  value={value[field.key] ?? ''}
                  onValueChange={v => onChange({ [field.key]: v || undefined })}
                  options={[all, ...field.options]}
                />
              )}
            </FormField>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          {(['from', 'to'] as const).map(key => (
            <FormField key={key} label={key === 'from' ? labels.from : labels.to}>
              {props => <Input {...props} type="date" value={value[key] ?? ''} onChange={e => onChange({ [key]: e.target.value || undefined })} />}
            </FormField>
          ))}
          <div className="flex flex-wrap gap-2">
            {onSave && (
              <>
                <div className="w-40">
                  <FormField label={labels.viewName}>
                    {props => <Input {...props} value={viewName} onChange={e => setViewName(e.target.value)} />}
                  </FormField>
                </div>
                <Button variant="outline" className="h-10" disabled={!viewName.trim()} onClick={() => { onSave(viewName.trim()); setViewName('') }}>
                  <Save className="h-4 w-4" aria-hidden />{labels.saveView}
                </Button>
              </>
            )}
            {savedViews.length > 0 && (
              <FormField label={labels.savedViews}>
                {() => <Select ariaLabel={labels.savedViews} value="" onValueChange={id => id && onLoadView?.(id)} options={[all, ...savedViews.map(v => ({ value: v.id, label: v.name }))]} />}
              </FormField>
            )}
            {onReset && <Button variant="ghost" className="h-10" onClick={onReset}><RotateCcw className="h-4 w-4" aria-hidden />{labels.reset}</Button>}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------ ExplainPanel */

export function ExplainPanel({
  definition, meta, caveats, labels,
}: {
  definition?: { name?: string; definition?: string; formula?: string; grain?: string; unit?: string; nMin?: number }
  meta?: {
    n?: number
    denominator?: string
    ci?: ChartPoint['ci']
    suppressedCells?: boolean
    suppressionThreshold?: number
    lowSample?: boolean
    dataAsOf?: string
    mock?: boolean
    explain?: Record<string, string | number | boolean | null>
    associationNotCausation?: boolean
  }
  caveats: string[]
  labels: { title: string; formula: string; inputs: string; caveats: string; freshness: string; mock: string }
}) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="mb-1 flex items-center gap-2 font-semibold text-content"><BookOpen className="h-4 w-4" aria-hidden />{labels.title}</h3>
        {definition?.definition && <p className="text-content-muted">{definition.definition}</p>}
      </div>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-md bg-surface-2 p-3"><dt className="text-content-subtle">{labels.formula}</dt><dd className="tnum mt-1 text-content">{definition?.formula ?? meta?.explain?.formula ?? '—'}</dd></div>
        <div className="rounded-md bg-surface-2 p-3"><dt className="text-content-subtle">n / {labels.inputs}</dt><dd className="mt-1 text-content">n = {meta?.n ?? '—'} · {meta?.denominator ?? '—'}</dd></div>
        <div className="rounded-md bg-surface-2 p-3"><dt className="text-content-subtle">Grain / unité</dt><dd className="mt-1 text-content">{definition?.grain ?? '—'} · {definition?.unit ?? '—'}</dd></div>
        <div className="rounded-md bg-surface-2 p-3"><dt className="text-content-subtle">{labels.freshness}</dt><dd className="mt-1 text-content">{meta?.dataAsOf ?? '—'} · k = {meta?.suppressionThreshold ?? 5}</dd></div>
      </dl>
      {meta?.explain && (
        <div>
          <h4 className="mb-1 text-xs font-semibold text-content">{labels.inputs}</h4>
          <ul className="grid gap-1 text-xs text-content-muted sm:grid-cols-2">
            {Object.entries(meta.explain).map(([key, val]) => <li key={key} className="flex justify-between gap-2 rounded bg-surface-2 px-2 py-1"><span>{key}</span><span className="tnum">{String(val)}</span></li>)}
          </ul>
        </div>
      )}
      {meta?.associationNotCausation && <p className="rounded border border-status-warning-border bg-status-warning-bg p-2 text-xs text-status-warning">Association, pas de causalité.</p>}
      <div>
        <h4 className="mb-1 text-xs font-semibold text-content">{labels.caveats}</h4>
        <ul className="list-disc space-y-1 pl-5 text-xs text-content-muted">{caveats.map(c => <li key={c}>{c}</li>)}</ul>
      </div>
      {meta?.mock && <p className="flex items-center gap-2 text-xs text-status-info"><Info className="h-3.5 w-3.5" aria-hidden />{labels.mock}</p>}
    </div>
  )
}

/* ---------------------------------------------------------------- ScenarioPanel */

export interface ScenarioControls {
  attendanceDelta: number
  homeworkDelta: number
  markDelta: number
  horizon: number
}

export function ScenarioPanel({
  value, onChange, onRun, result, labels, busy,
}: {
  value: ScenarioControls
  onChange: (patch: Partial<ScenarioControls>) => void
  onRun: () => void
  result?: { points: Array<{ label: string; attendance: number; homework: number; mark: number; n: number }>; warning: string; assumptions: string[] }
  labels: { title: string; attendance: string; homework: string; mark: string; horizon: string; run: string; warning: string }
  busy?: boolean
}) {
  const sliders: Array<{ key: keyof ScenarioControls; label: string; min: number; max: number; step: number }> = [
    { key: 'attendanceDelta', label: labels.attendance, min: -10, max: 10, step: 0.5 },
    { key: 'homeworkDelta', label: labels.homework, min: -20, max: 20, step: 1 },
    { key: 'markDelta', label: labels.mark, min: -3, max: 3, step: 0.25 },
    { key: 'horizon', label: labels.horizon, min: 1, max: 6, step: 1 },
  ]
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2 text-sm"><SlidersHorizontal className="h-4 w-4" aria-hidden />{labels.title}</span>} />
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {sliders.map(s => (
            <FormField key={s.key} label={`${s.label} (${value[s.key]} pt)`}>
              {props => <Input {...props} type="range" min={s.min} max={s.max} step={s.step} value={value[s.key]} onChange={e => onChange({ [s.key]: Number(e.target.value) })} />}
            </FormField>
          ))}
        </div>
        <Button onClick={onRun} loading={busy}>{labels.run}</Button>
        {result && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <caption className="ui-sr-only">{labels.title}</caption>
                <thead><tr className="border-b border-line text-content-subtle"><th scope="col" className="py-2">Période</th><th scope="col">Présence</th><th scope="col">Devoirs</th><th scope="col">Moyenne</th><th scope="col">n</th></tr></thead>
                <tbody>
                  {result.points.map(p => <tr key={p.label} className="border-b border-line last:border-0"><th scope="row" className="py-2 font-medium">{p.label}</th><td className="tnum">{p.attendance.toFixed(1)}</td><td className="tnum">{p.homework.toFixed(1)}</td><td className="tnum">{p.mark.toFixed(2)}</td><td className="tnum">{p.n}</td></tr>)}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-status-warning">{result.warning}</p>
            <ul className="list-disc pl-5 text-xs text-content-muted">{result.assumptions.map(a => <li key={a}>{a}</li>)}</ul>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------ TargetAndIntervention */

export function TargetEditor({
  targets, onSave, labels,
}: {
  targets: Array<{ metricId: string; value: number }>
  onSave: (metricId: string, value: number) => void
  labels: { title: string; save: string }
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(targets.map(t => [t.metricId, String(t.value)])))
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4" aria-hidden />{labels.title}</span>} />
      <CardBody className="space-y-3">
        {targets.length === 0 && <p className="text-sm text-content-muted">Aucune cible définie.</p>}
        {targets.map(t => (
          <div key={t.metricId} className="flex flex-wrap items-end gap-2">
            <FormField label={t.metricId} className="min-w-52 flex-1">
              {props => <Input {...props} type="number" step="0.5" value={drafts[t.metricId] ?? ''} onChange={e => setDrafts(d => ({ ...d, [t.metricId]: e.target.value }))} />}
            </FormField>
            <Button variant="outline" className="h-10" onClick={() => onSave(t.metricId, Number(drafts[t.metricId]))}>{labels.save}</Button>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

export function InterventionTracker({
  items, onChangeStatus, onCreate, labels,
}: {
  items: Array<{ id: string; metricId: string; scope: string; note: string; status: string }>
  onChangeStatus: (id: string, status: string) => void
  onCreate: (note: string) => void
  labels: { title: string; add: string; note: string; review: string }
}) {
  const [note, setNote] = useState('')
  return (
    <Card>
      <CardHeader title={<span className="text-sm">{labels.title}</span>} />
      <CardBody className="space-y-3">
        <ul className="divide-y divide-line">
          {items.length === 0 && <li className="py-2 text-sm text-content-muted">Aucune action suivie.</li>}
          {items.map(item => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-content">{item.metricId}</p>
                <p className="truncate text-xs text-content-muted">{item.note || item.scope}</p>
              </div>
              <Badge tone={item.status === 'reviewed' ? 'success' : item.status === 'in_progress' ? 'info' : 'warning'}>{item.status}</Badge>
              <Button variant="ghost" size="sm" onClick={() => onChangeStatus(item.id, item.status === 'reviewed' ? 'planned' : 'reviewed')}>{labels.review}</Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-2">
          <FormField label={labels.note} className="min-w-52 flex-1">
            {props => <Textarea {...props} rows={2} value={note} onChange={e => setNote(e.target.value)} />}
          </FormField>
          <Button variant="outline" disabled={!note.trim()} onClick={() => { onCreate(note.trim()); setNote('') }}>{labels.add}</Button>
        </div>
      </CardBody>
    </Card>
  )
}
