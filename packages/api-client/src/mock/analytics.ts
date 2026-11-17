/**
 * FLAGGED MOCK ANALYTICS ADAPTER.
 *
 * This is the only code path allowed to synthesise analytics figures, and it is selected
 * only by `VITE_USE_MOCK`. It mirrors the governed `/api/analytics/**` contracts so the UI,
 * hooks and tests exercise the same shapes that the Java API will return once upstream
 * attendance/mark/finance facts exist. Every response carries `meta.mock = true`.
 */

import {
  ANALYTICS_DEMO_HOLIDAYS, getAnalyticsDemoData, METRIC_DEFINITIONS, toDisplayRole,
  type AnalyticsMeta, type AnalyticsResponse, type ConfidenceInterval, type DataPoint,
  type MetricId, type MetricRole, type Paginated, type TimePoint,
} from '@schoolos/shared'
import {
  assessmentDifficulty, attendanceAttainment, attendanceRate, averageMinutesLate,
  buildForecast, classBelowCohort, collectionRate, collectInsights, collectionRisk,
  dataQualityGap, distributionSkew, guardFilteredGroupSize, homeworkDecline,
  itemDifficulty, markHistogram, markDistribution, movingAverage, normalizeThreshold,
  overdueAgeing, passRate, rateMetric, risingLateness, seasonalityAwareComparison,
  suddenAttendanceDrop, suppressCells, supportComposite, valueAdded, weekdayCluster,
  weightedAverage,
  type Insight,
} from '@schoolos/analytics-core'
import { sessionStore } from '../session-store'
import type { Method } from '../http'

export interface AnalyticsQuery {
  metric?: string
  dashboard?: string
  from?: string
  to?: string
  year?: string
  term?: string
  classId?: string
  level?: string
  subject?: string
  cohort?: string
  grain?: 'day' | 'week' | 'month' | 'term' | 'year'
  comparisonBasis?: string
  page?: number
  pageSize?: number
  sort?: string
  dimensionA?: string
  dimensionB?: string
  horizon?: number
}

export interface OverviewCard {
  metricId: string
  label: string
  value: number
  unit: string
  n: number
  ci?: ConfidenceInterval
  change?: number
  wording?: string
  lowSample: boolean
  suppressed: boolean
  target?: number
}

export interface OverviewSeries {
  metricId: string
  question: { fr: string; en: string }
  points: TimePoint[]
}

export interface Target {
  metricId: string
  value: number
  updatedAt: string
  updatedBy: string
}

export interface Intervention {
  id: string
  metricId: string
  scope: string
  note: string
  status: 'planned' | 'in_progress' | 'reviewed'
  createdAt: string
}

export interface ScenarioInput {
  attendanceDelta?: number
  homeworkDelta?: number
  markDelta?: number
  horizon?: number
}

export interface ScenarioResult {
  horizon: number
  points: { label: string; attendance: number; homework: number; mark: number; n: number }[]
  assumptions: { fr: string; en: string }[]
  warning: { fr: string; en: string }
}

export interface Freshness {
  dataAsOf: string
  generatedAt: string
  sourceAvailable: boolean
  mock: true
  refreshState: 'demo' | 'no-upstream-source'
  notes: { fr: string; en: string }
}

export interface AnalyticsOverview {
  dashboard: string
  role: MetricRole
  cards: OverviewCard[]
  series: OverviewSeries[]
  insights: Insight[]
  targets: Target[]
  freshness: Freshness
  suppressedCells: boolean
}

const ALL_CLASSES = getAnalyticsDemoData().classDims.map(c => c.classKey)
const TEACHER_CLASSES = ['c-6e', 'c-cm2']
const FAMILY_CLASSES = ['c-cp']

const defaults: Record<string, Target> = {
  'attendance.rate': { metricId: 'attendance.rate', value: 94, updatedAt: '2026-11-17T08:15:00Z', updatedBy: 'system-default' },
  'marks.weighted_average': { metricId: 'marks.weighted_average', value: 12, updatedAt: '2026-11-17T08:15:00Z', updatedBy: 'system-default' },
  'engagement.homework_completion_rate': { metricId: 'engagement.homework_completion_rate', value: 88, updatedAt: '2026-11-17T08:15:00Z', updatedBy: 'system-default' },
  'finance.collection_rate': { metricId: 'finance.collection_rate', value: 92, updatedAt: '2026-11-17T08:15:00Z', updatedBy: 'system-default' },
  'dq.register_timeliness': { metricId: 'dq.register_timeliness', value: 95, updatedAt: '2026-11-17T08:15:00Z', updatedBy: 'system-default' },
}

const targets = new Map<string, Target>(Object.entries(defaults))
const interventions: Intervention[] = []
const dismissed = new Set<string>()
const snoozed = new Map<string, string>()
const exports = new Map<string, { id: string; status: 'queued' | 'ready'; format: string; rows: number; watermark: string }>()

function fail(status: number, code: string, message: string): never {
  throw Object.assign(new Error(message), { status, code })
}

function currentRole(): MetricRole {
  const raw = sessionStore.user?.roles?.[0] ?? ''
  const display = toDisplayRole(raw)
  if (display === 'admin') return 'school_admin'
  if (display === 'operator') return 'group_admin'
  const allowed: MetricRole[] = ['director', 'school_admin', 'group_admin', 'deputy', 'teacher', 'parent', 'student', 'finance', 'analyst', 'auditor', 'hr', 'itadmin', 'librarian', 'reception']
  return (display && allowed.includes(display as MetricRole) ? display : 'director') as MetricRole
}

function actor(): string {
  return sessionStore.user?.name ?? sessionStore.user?.sub ?? 'mock-user'
}

function parseQuery(path: string): AnalyticsQuery {
  const url = new URL(path, 'http://mock.local')
  const q = (key: string) => url.searchParams.get(key) ?? undefined
  const num = (key: string) => {
    const value = q(key)
    return value === undefined ? undefined : Number(value)
  }
  const grain = q('grain')
  return {
    metric: q('metric'), dashboard: q('dashboard') ?? 'principal',
    from: q('from'), to: q('to'), year: q('year'), term: q('term'),
    classId: q('classId') ?? q('class'), level: q('level'), subject: q('subject'),
    cohort: q('cohort'), comparisonBasis: q('comparison'),
    grain: grain === 'day' || grain === 'week' || grain === 'month' || grain === 'term' || grain === 'year' ? grain : 'term',
    page: num('page'), pageSize: num('pageSize'), sort: q('sort'),
    dimensionA: q('dimensionA'), dimensionB: q('dimensionB'), horizon: num('horizon'),
  }
}

function requireMetric(id: string | undefined): MetricId {
  if (!id || !METRIC_DEFINITIONS[id]) fail(404, 'METRIC_NOT_FOUND', `Unknown metric: ${id ?? '(missing)'}`)
  const role = currentRole()
  if (!METRIC_DEFINITIONS[id]!.roles.includes(role)) fail(403, 'FORBIDDEN', `Role ${role} cannot view ${id}`)
  return id
}

function allowedClasses(role: MetricRole): string[] {
  if (role === 'teacher') return TEACHER_CLASSES
  if (role === 'parent' || role === 'student') return FAMILY_CLASSES
  return ALL_CLASSES
}

function scopedQuery(q: AnalyticsQuery, role: MetricRole): AnalyticsQuery {
  const allowed = allowedClasses(role)
  const requested = q.classId ?? (role === 'teacher' ? TEACHER_CLASSES[0] : role === 'parent' || role === 'student' ? FAMILY_CLASSES[0] : undefined)
  if (requested && !allowed.includes(requested)) fail(403, 'FORBIDDEN', 'Requested class is outside the caller scope')
  return { ...q, classId: requested }
}

function classLevel(classKey: string): string {
  return getAnalyticsDemoData().classDims.find(c => c.classKey === classKey)?.level ?? ''
}

function matchesAttendance(q: AnalyticsQuery, row: { date: string; classKey: string; year: string; term: string }): boolean {
  if (q.year && row.year !== q.year) return false
  if (q.term && row.term !== q.term) return false
  if (q.classId && row.classKey !== q.classId) return false
  if (q.level && classLevel(row.classKey) !== q.level) return false
  if (q.from && row.date < q.from) return false
  if (q.to && row.date > q.to) return false
  return true
}

function filteredAttendance(q: AnalyticsQuery) {
  return getAnalyticsDemoData().attendanceDaily.filter(row => matchesAttendance(q, row))
}

function filteredAssessments(q: AnalyticsQuery) {
  return getAnalyticsDemoData().assessments.filter(a => {
    if (q.year && a.year !== q.year) return false
    if (q.term && a.term !== q.term) return false
    if (q.classId && a.classKey !== q.classId) return false
    if (q.level && classLevel(a.classKey) !== q.level) return false
    if (q.subject && a.subject !== q.subject) return false
    return true
  })
}

function filteredStudentTerms(q: AnalyticsQuery) {
  return getAnalyticsDemoData().studentTerms.filter(s => {
    if (q.year && s.year !== q.year) return false
    if (q.term && s.term !== q.term) return false
    if (q.classId && s.classKey !== q.classId) return false
    if (q.level && classLevel(s.classKey) !== q.level) return false
    if (q.cohort && s.cohort !== q.cohort) return false
    return true
  })
}

function filteredFinance(q: AnalyticsQuery) {
  return getAnalyticsDemoData().finance.filter(f => {
    if (q.year && f.year !== q.year) return false
    if (q.from && f.period < q.from.slice(0, 7)) return false
    if (q.to && f.period > q.to.slice(0, 7)) return false
    return true
  })
}

function bucket(row: { date?: string; period?: string | number; term?: string | number; year?: string | number }, grain: AnalyticsQuery['grain']): string {
  const period = row.period === undefined ? undefined : String(row.period)
  if (grain === 'day') return row.date ?? period ?? ''
  if (grain === 'month') return (row.date ?? period ?? '').slice(0, 7)
  if (grain === 'term') return `${row.year ?? ''}-${row.term ?? ''}`.trim()
  if (grain === 'year') return row.year === undefined ? '' : String(row.year)
  if (grain === 'week' && row.date) {
    const d = new Date(`${row.date}T00:00:00Z`)
    const day = (d.getUTCDay() + 6) % 7
    d.setUTCDate(d.getUTCDate() - day + 3)
    const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
    const week = 1 + Math.round((d.getTime() - first.getTime()) / 604800000)
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
  }
  return row.date ?? period ?? ''
}

function combineIntervals(intervals: ConfidenceInterval[]): ConfidenceInterval | undefined {
  const usable = intervals.filter(i => i.method !== 'none' && Number.isFinite(i.lower) && Number.isFinite(i.upper))
  if (!usable.length) return undefined
  const lower = usable.reduce((sum, i) => sum + i.lower, 0) / usable.length
  const upper = usable.reduce((sum, i) => sum + i.upper, 0) / usable.length
  return { lower, upper, method: usable[0]!.method, confidence: usable[0]!.confidence ?? 0.95 }
}

function attendanceSeries(q: AnalyticsQuery, kind: 'present' | 'unjustified' | 'justified' | 'late' | 'lateMinutes'): { points: TimePoint[]; n: number; ci?: ConfidenceInterval; explain: Record<string, string | number | boolean | null> } {
  const rows = filteredAttendance(q)
  const groups = new Map<string, typeof rows>()
  for (const row of rows) {
    const key = bucket(row, q.grain ?? 'term')
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  const threshold = normalizeThreshold(undefined)
  let aggregatePresent = 0
  let aggregateExpected = 0
  const cells = [...groups.entries()].map(([key, group]) => {
    const expected = group.reduce((s, r) => s + r.expected, 0)
    const numerator = kind === 'present'
      ? group.reduce((s, r) => s + r.present, 0)
      : kind === 'unjustified'
        ? group.reduce((s, r) => s + r.unjustified, 0)
        : kind === 'justified'
          ? group.reduce((s, r) => s + r.justified, 0)
          : kind === 'late'
            ? group.reduce((s, r) => s + r.late, 0)
            : group.reduce((s, r) => s + r.minutesLateSum, 0)
    aggregatePresent += numerator
    aggregateExpected += expected
    const result = kind === 'lateMinutes'
      ? averageMinutesLate(group.map(r => r.lateEvents ? r.minutesLateSum / r.lateEvents : 0))
      : rateMetric(numerator, expected, kind)
    return { key, label: key, date: key, n: expected, numerator, value: result.value, ci: result.ci, suppressed: expected < threshold }
  })
  const suppression = suppressCells(cells, threshold)
  const points: TimePoint[] = suppression.cells.map(c => ({
    label: c.label, date: c.date ?? c.key, value: c.value ?? 0, n: c.n,
    ci: (c as TimePoint).ci, suppressed: c.suppressed, key: c.key,
  }))
  const aggregate = kind === 'lateMinutes'
    ? averageMinutesLate(rows.filter(r => r.lateEvents).map(r => r.minutesLateSum / r.lateEvents))
    : rateMetric(aggregatePresent, aggregateExpected, kind)
  return {
    points,
    n: aggregateExpected,
    ci: aggregate.ci ?? combineIntervals(points.map(p => p.ci).filter((c): c is ConfidenceInterval => Boolean(c))),
    explain: {
      ...aggregate.explain,
      grouping: q.grain ?? 'term',
      openSchoolDaysOnly: true,
      suppressedCells: suppression.suppressedCells,
    },
  }
}

function markSeries(q: AnalyticsQuery, kind: 'average' | 'pass' | 'distribution' | 'valueAdded' | 'benchmark'): { points: TimePoint[]; n: number; ci?: ConfidenceInterval; explain: Record<string, string | number | boolean | null> } {
  const assessments = filteredAssessments(q)
  const threshold = normalizeThreshold(undefined)
  const groups = new Map<string, typeof assessments>()
  for (const a of assessments) {
    const key = q.grain === 'year' ? a.year : `${a.year}-${a.term}`
    groups.set(key, [...(groups.get(key) ?? []), a])
  }
  const allMarks = assessments.flatMap(a => a.marks.map(m => ({ ...m, scaleMax: m.scaleMax })))
  const aggregate = kind === 'pass'
    ? passRate(allMarks, 10)
    : kind === 'average'
      ? weightedAverage(allMarks)
      : markDistribution(allMarks)
  const cells = [...groups.entries()].map(([key, group]) => {
    const marks = group.flatMap(a => a.marks)
    const result = kind === 'pass' ? passRate(marks, 10) : weightedAverage(marks)
    return {
      key, label: key, date: key, n: result.n, value: result.value,
      ci: result.ci, numerator: kind === 'pass' ? Math.round(result.value * result.n / 100) : undefined,
      suppressed: result.n < threshold,
    }
  })
  const suppression = suppressCells(cells, threshold)
  const points: TimePoint[] = suppression.cells.map(c => ({
    label: c.label, date: c.date ?? c.key, value: c.value ?? 0, n: c.n,
    ci: (c as TimePoint).ci, suppressed: c.suppressed, key: c.key,
  }))
  return {
    points,
    n: aggregate.n,
    ci: 'ci' in aggregate ? aggregate.ci : undefined,
    explain: {
      ...('explain' in aggregate ? aggregate.explain : {}),
      scale: '/20',
      includedAssessments: assessments.length,
      suppressedCells: suppression.suppressedCells,
    },
  }
}

function homeworkSeries(q: AnalyticsQuery): { points: TimePoint[]; n: number; ci?: ConfidenceInterval; explain: Record<string, string | number | boolean | null> } {
  const data = getAnalyticsDemoData().homework.filter(h => {
    if (q.year && !h.period.startsWith(q.year)) return false
    if (q.term && !h.period.endsWith(q.term)) return false
    if (q.classId && h.classKey !== q.classId) return false
    if (q.level && classLevel(h.classKey) !== q.level) return false
    return true
  })
  const groups = new Map<string, typeof data>()
  for (const h of data) {
    const key = q.grain === 'year' ? h.period.slice(0, 4) : h.period
    groups.set(key, [...(groups.get(key) ?? []), h])
  }
  const threshold = normalizeThreshold(undefined)
  let assigned = 0
  let submitted = 0
  const cells = [...groups.entries()].map(([key, group]) => {
    const a = group.reduce((s, h) => s + h.assigned, 0)
    const s = group.reduce((sum, h) => sum + h.submitted, 0)
    assigned += a
    submitted += s
    const result = rateMetric(s, a, 'submitted')
    return { key, label: key, date: key, n: a, numerator: s, value: result.value, ci: result.ci, suppressed: a < threshold }
  })
  const suppression = suppressCells(cells, threshold)
  const aggregate = rateMetric(submitted, assigned, 'submitted')
  return {
    points: suppression.cells.map(c => ({
      label: c.label, date: c.date ?? c.key, value: c.value ?? 0, n: c.n,
      ci: (c as TimePoint).ci, suppressed: c.suppressed, key: c.key,
    })),
    n: assigned,
    ci: aggregate.ci,
    explain: { ...aggregate.explain, exemptionsExcluded: true, suppressedCells: suppression.suppressedCells },
  }
}

function financeSeries(q: AnalyticsQuery, kind: 'collection' | 'forecast' | 'ageing'): { points: TimePoint[]; n: number; ci?: ConfidenceInterval; explain: Record<string, string | number | boolean | null> } {
  const rows = filteredFinance(q)
  const threshold = normalizeThreshold(undefined)
  const aggregate = collectionRate(
    rows.reduce((s, f) => s + f.collectedCents, 0),
    rows.reduce((s, f) => s + f.invoicedCents, 0),
  )
  if (kind === 'forecast') {
    const series = rows.map(f => f.collectedCents / 100)
    const forecast = buildForecast(series, { horizon: q.horizon ?? 3, method: 'seasonal-naive', seasonLength: 4, modelId: 'analytics.forecast.seasonal-naive', modelVersion: '1.0.0' })
    return {
      points: forecast.points.map(p => ({
        label: `H${p.horizon}`, date: `H${p.horizon}`, value: p.point, n: Math.max(1, Math.round(aggregate.n / 100)),
        ci: { lower: p.lower95, upper: p.upper95, method: 'none', confidence: 0.95 }, key: `H${p.horizon}`,
      })),
      n: Math.max(1, Math.round(aggregate.n / 100)),
      ci: { lower: forecast.points[0]?.lower95 ?? 0, upper: forecast.points[0]?.upper95 ?? 0, method: 'none', confidence: 0.95 },
      explain: {
        modelId: forecast.modelId, modelVersion: forecast.modelVersion, method: forecast.method,
        backtestMape: forecast.backtest.mape, estimateNotFact: true,
        warning: 'Forecast is an estimate, not a fact. / La prévision est une estimation, pas un fait.',
      },
    }
  }
  if (kind === 'ageing') {
    const buckets = new Map<string, { outstanding: number; count: number }>()
    for (const f of rows) for (const b of f.ageingBuckets) {
      const entry = buckets.get(b.label) ?? { outstanding: 0, count: 0 }
      entry.outstanding += b.outstandingCents
      entry.count += b.invoiceCount
      buckets.set(b.label, entry)
    }
    const cells = [...buckets.entries()].map(([label, b]) => ({
      key: label, label, date: label, n: b.count, value: b.outstanding / 100, suppressed: b.count < threshold,
    }))
    const suppression = suppressCells(cells, threshold)
    return {
      points: suppression.cells.map(c => ({ label: c.label, date: c.key ?? c.label, value: c.value ?? 0, n: c.n, suppressed: c.suppressed, key: c.key })),
      n: [...buckets.values()].reduce((s, b) => s + b.count, 0),
      explain: { ...aggregate.explain, bucket: 'days past due', writtenOffExcluded: true },
    }
  }
  const cells = rows.map(f => {
    const result = collectionRate(f.collectedCents, f.invoicedCents)
    return { key: f.period, label: f.period, date: f.period, n: f.invoiceCount, numerator: f.collectedCents, value: result.value, ci: result.ci, suppressed: f.invoiceCount < threshold }
  })
  const suppression = suppressCells(cells, threshold)
  return {
    points: suppression.cells.map(c => ({
      label: c.label, date: c.date ?? c.key ?? c.label, value: c.value ?? 0, n: c.n,
      ci: (c as TimePoint).ci, suppressed: c.suppressed, key: c.key,
    })),
    n: rows.reduce((s, f) => s + f.invoiceCount, 0),
    ci: aggregate.ci,
    explain: { ...aggregate.explain, currency: 'EUR', amountsAreIntegerCents: true },
  }
}

function qualitySeries(q: AnalyticsQuery, kind: 'registers' | 'marks' | 'anomalies' | 'guardians'): { points: TimePoint[]; n: number; ci?: ConfidenceInterval; explain: Record<string, string | number | boolean | null> } {
  const threshold = normalizeThreshold(undefined)
  if (kind === 'registers') {
    const rows = filteredAttendance(q)
    const result = rateMetric(rows.reduce((s, r) => s + r.registersOnTime, 0), rows.reduce((s, r) => s + r.registersTaken, 0), 'onTime')
    const perClass = new Map<string, typeof rows>()
    for (const row of rows) perClass.set(row.classKey, [...(perClass.get(row.classKey) ?? []), row])
    const cells = [...perClass.entries()].map(([key, group]) => {
      const c = rateMetric(group.reduce((s, r) => s + r.registersOnTime, 0), group.reduce((s, r) => s + r.registersTaken, 0), 'onTime')
      return { key, label: classLevel(key) || key, date: key, n: c.n, numerator: Math.round(c.value * c.n / 100), value: c.value, ci: c.ci, suppressed: c.n < threshold }
    })
    const suppression = suppressCells(cells, threshold)
    return {
      points: suppression.cells.map(c => ({ label: c.label, date: c.date ?? c.key ?? c.label, value: c.value ?? 0, n: c.n, ci: (c as TimePoint).ci, suppressed: c.suppressed, key: c.key })),
      n: result.n, ci: result.ci,
      explain: { ...result.explain, processSignalNotPerformance: true, suppressedCells: suppression.suppressedCells },
    }
  }
  if (kind === 'marks') {
    const rows = filteredAssessments(q)
    let expected = 0
    let entered = 0
    for (const a of rows) {
      expected += a.marks.length
      entered += a.marks.filter(m => !m.dispensed && !m.absent).length
    }
    const result = rateMetric(entered, expected, 'entered')
    return {
      points: [{ label: 'Période', date: q.term ?? 'all', value: result.value, n: result.n, ci: result.ci }],
      n: result.n, ci: result.ci, explain: result.explain,
    }
  }
  if (kind === 'guardians') {
    const students = new Set(filteredStudentTerms({ ...q, term: undefined }).map(s => s.studentKey)).size
    const missing = getAnalyticsDemoData().dataQuality.find(d => d.rule === 'missing_guardian')?.count ?? 0
    const result = rateMetric(students - missing, students, 'covered')
    return { points: [{ label: 'Établissement', date: 'all', value: result.value, n: result.n, ci: result.ci }], n: result.n, ci: result.ci, explain: result.explain }
  }
  const rows = getAnalyticsDemoData().dataQuality.map(d => ({ key: d.rule, label: d.rule, date: d.rule, n: Math.max(1, d.count), value: d.count }))
  return { points: rows, n: rows.reduce((s, r) => s + r.n, 0), explain: { countsOnly: true, drilldownRequiresStudentRead: true } }
}

function combinedSeries(q: AnalyticsQuery, kind: 'association' | 'composite' | 'retention'): { points: TimePoint[]; n: number; ci?: ConfidenceInterval; explain: Record<string, string | number | boolean | null> } {
  const students = filteredStudentTerms(q)
  if (kind === 'association') {
    const result = attendanceAttainment(students)
    const threshold = normalizeThreshold(undefined)
    const cells = result.bands.map(b => ({ key: b.label, label: b.label, date: b.label, n: b.n, value: b.averageMark, ci: b.ci, suppressed: b.n < threshold }))
    const suppression = suppressCells(cells, threshold)
    return {
      points: suppression.cells.map(c => ({ label: c.label, date: c.key ?? c.label, value: c.value ?? 0, n: c.n, ci: (c as TimePoint).ci, suppressed: c.suppressed, key: c.key })),
      n: result.n,
      explain: { associationNotCausation: true, effectSizeR: result.effectSize, bands: result.bands.map(b => `${b.label}: n=${b.n}`).join(', ') },
    }
  }
  if (kind === 'composite') {
    const attendance = filteredAttendance(q)
    const marks = filteredAssessments(q).flatMap(a => a.marks)
    const homework = homeworkSeries(q)
    const attendanceValue = attendanceRate(attendance.reduce((s, r) => s + r.present, 0), attendance.reduce((s, r) => s + r.expected, 0)).value / 100
    const markValue = weightedAverage(marks).value / 20
    const homeworkValue = homework.points.length ? homework.points.reduce((s, p) => s + p.value, 0) / homework.points.length / 100 : 0
    const unjustified = rateMetric(attendance.reduce((s, r) => s + r.unjustified, 0), attendance.reduce((s, r) => s + r.expected, 0), 'unjustified').value / 100
    const result = supportComposite([
      { key: 'attendance', value: attendanceValue, weight: 0.4 },
      { key: 'marks', value: markValue, weight: 0.25 },
      { key: 'homework', value: homeworkValue, weight: 0.2 },
      { key: 'unjustified', value: 1 - unjustified, weight: 0.15 },
    ])
    return {
      points: [{ label: 'Indice de soutien', date: q.term ?? 'all', value: result.value * 100, n: students.length || 1 }],
      n: students.length || 1,
      explain: { ...result.explain, weightsVisible: true, dpoReviewRequired: true, noAutomatedDecision: true },
    }
  }
  const cohorts = new Map<string, number>()
  for (const s of students) if (s.term === 'T1') cohorts.set(s.cohort, (cohorts.get(s.cohort) ?? 0) + 1)
  const points = [...cohorts.entries()].map(([label, n]) => ({ label, date: label, value: n ? 100 : 0, n }))
  return { points, n: points.reduce((s, p) => s + p.n, 0), explain: { cohort: 'entry year', enrolledAtYearT: true } }
}

function unavailableSeries(reason: string): { points: TimePoint[]; n: number; explain: Record<string, string | number | boolean | null> } {
  return { points: [], n: 0, explain: { sourceUnavailable: true, reason } }
}

interface ComputedMetric {
  points: TimePoint[]
  n: number
  ci?: ConfidenceInterval
  explain: Record<string, string | number | boolean | null>
  denominator?: string
  associationNotCausation?: boolean
}

function computeMetric(id: MetricId, q: AnalyticsQuery): ComputedMetric {
  switch (id) {
    case 'attendance.rate': return { ...attendanceSeries(q, 'present'), denominator: 'expected half-days, open school days only' }
    case 'attendance.unjustified_rate': return { ...attendanceSeries(q, 'unjustified'), denominator: 'expected half-days' }
    case 'attendance.justified_rate': return { ...attendanceSeries(q, 'justified'), denominator: 'expected half-days' }
    case 'attendance.lateness_rate': return { ...attendanceSeries(q, 'late'), denominator: 'expected sessions' }
    case 'attendance.avg_minutes_late': return { ...attendanceSeries(q, 'lateMinutes'), denominator: 'late arrivals only' }
    case 'attendance.weekday_period_distribution': return { ...attendanceSeries({ ...q, grain: 'week' }, 'unjustified'), denominator: 'expected half-days by week' }
    case 'attendance.monday_friday_effect': {
      const rows = filteredAttendance(q)
      const monFri = rows.filter(r => r.weekday === 0 || r.weekday === 4)
      const other = rows.filter(r => r.weekday > 0 && r.weekday < 4)
      const a = attendanceRate(monFri.reduce((s, r) => s + r.present, 0), monFri.reduce((s, r) => s + r.expected, 0))
      const b = attendanceRate(other.reduce((s, r) => s + r.present, 0), other.reduce((s, r) => s + r.expected, 0))
      const halfWidth = Math.max(a.ci ? (a.ci.upper - a.ci.lower) / 2 : 0, b.ci ? (b.ci.upper - b.ci.lower) / 2 : 0)
      const cmp = seasonalityAwareComparison(a.value, b.value, halfWidth, 'up')
      return {
        points: [{ label: 'Mon/Fri − Tue–Thu', date: 'comparison', value: cmp.change, n: a.n + b.n, ci: a.ci }],
        n: a.n + b.n, ci: a.ci,
        explain: { ...a.explain, comparison: cmp.detail, associationNotCausation: true },
        associationNotCausation: true,
      }
    }
    case 'attendance.post_holiday_dip': {
      const rows = filteredAttendance(q)
      const after = rows.filter(r => ANALYTICS_DEMO_HOLIDAYS.some(h => {
        const days = (new Date(r.date).getTime() - new Date(h).getTime()) / 86400000
        return days >= 0 && days <= 3
      }))
      const before = rows.filter(r => !after.some(a => a.date === r.date && a.classKey === r.classKey))
      const a = attendanceRate(after.reduce((s, r) => s + r.present, 0), after.reduce((s, r) => s + r.expected, 0))
      const b = attendanceRate(before.reduce((s, r) => s + r.present, 0), before.reduce((s, r) => s + r.expected, 0))
      return {
        points: [{ label: 'Retour après vacances', date: 'post-holiday', value: a.value - b.value, n: a.n, ci: a.ci }],
        n: a.n, ci: a.ci, explain: { ...a.explain, zone: 'C', pairedByTerm: true },
      }
    }
    case 'attendance.chronic_flag': {
      const rows = filteredStudentTerms(q)
      const flagged = rows.filter(s => s.chronicFlag).length
      return { ...rateMetric(flagged, rows.length, 'flagged'), denominator: 'student-term snapshots', points: [{ label: 'Besoin de soutien', date: q.term ?? 'all', value: flagged / Math.max(1, rows.length) * 100, n: rows.length }] }
    }
    case 'attendance.streak':
      return { ...unavailableSeries('streak needs event-level absence history'), denominator: 'consecutive open school days' }
    case 'attendance.justification_lag':
      return { ...unavailableSeries('justification timestamps are not in the demo facts'), denominator: 'accepted justifications' }
    case 'marks.weighted_average': return { ...markSeries(q, 'average'), denominator: 'sum of coefficients, dispensed/absent excluded' }
    case 'marks.median':
    case 'marks.std_dev': {
      const distribution = markDistribution(filteredAssessments(q).flatMap(a => a.marks))
      const value = id === 'marks.median' ? distribution.median : distribution.stdDev
      return { points: [{ label: q.term ?? 'all', date: q.term ?? 'all', value, n: distribution.n }], n: distribution.n, explain: { p25: distribution.p25, p75: distribution.p75, scale: '/20' } }
    }
    case 'marks.percentile_band': {
      const distribution = markDistribution(filteredAssessments(q).flatMap(a => a.marks))
      return {
        points: [{ label: 'P25', date: 'P25', value: distribution.p25, n: distribution.n }, { label: 'P50', date: 'P50', value: distribution.median, n: distribution.n }, { label: 'P75', date: 'P75', value: distribution.p75, n: distribution.n }],
        n: distribution.n, explain: { scale: '/20', cohortRelative: true },
      }
    }
    case 'marks.pass_rate': return { ...markSeries(q, 'pass'), denominator: 'assessed marks, threshold 10/20' }
    case 'marks.distribution': {
      const result = markHistogram(filteredAssessments(q).flatMap(a => a.marks))
      return {
        points: result.bins.map(b => ({ label: b.label, date: b.label, value: b.count, n: result.n, key: b.label })),
        n: result.n, explain: { binSize: 2, ceilingEffect: result.ceilingEffect, floorEffect: result.floorEffect },
      }
    }
    case 'marks.progression': {
      const series = markSeries(q, 'average').points
      const values = series.map(p => p.value)
      const smoothed = movingAverage(values, 2)
      const change = smoothed.length > 1 ? (smoothed.at(-1) ?? 0) - (smoothed.at(-2) ?? 0) : 0
      return { points: [{ label: 'Progression', date: 'trend', value: change, n: series.reduce((s, p) => s + p.n, 0) }], n: series.reduce((s, p) => s + p.n, 0), explain: { method: 'paired where possible, 2-period moving average' } }
    }
    case 'marks.value_added': {
      const groups = new Map<string, { key: string; prior: number; actual: number; n: number }>()
      for (const s of filteredStudentTerms(q)) {
        if (s.priorAverageMark === null) continue
        const entry = groups.get(s.classKey) ?? { key: s.classKey, prior: 0, actual: 0, n: 0 }
        entry.prior += s.priorAverageMark
        entry.actual += s.averageMark
        entry.n++
        groups.set(s.classKey, entry)
      }
      const cohort = [...groups.values()].filter(g => g.n >= normalizeThreshold(undefined)).map(g => ({ key: g.key, prior: g.prior / g.n, actual: g.actual / g.n }))
      const result = valueAdded(cohort)
      return {
        points: result.results.map(r => ({ label: classLevel(r.key) || r.key, date: r.key, value: r.residual, n: cohort.find(c => c.key === r.key)?.prior ? r.n : 0, ci: r.ci, key: r.key })),
        n: result.cohortN,
        ci: result.results[0]?.ci,
        explain: { alpha: result.alpha, beta: result.beta, effectSizeR: result.effectSize, intakeContext: true, notTeacherEvaluation: true },
      }
    }
    case 'marks.benchmark_comparison': {
      const byClass = new Map<string, { sum: number; weight: number; n: number }>()
      for (const a of filteredAssessments(q)) for (const m of a.marks) {
        if (m.dispensed || m.absent) continue
        const entry = byClass.get(a.classKey) ?? { sum: 0, weight: 0, n: 0 }
        entry.sum += (m.value / m.scaleMax) * 20 * m.coefficient
        entry.weight += m.coefficient
        entry.n++
        byClass.set(a.classKey, entry)
      }
      const values = [...byClass.entries()].map(([key, e]) => ({ key, value: e.sum / e.weight, n: e.n }))
      const benchmark = values.reduce((s, v) => s + v.value, 0) / Math.max(1, values.length)
      return {
        points: values.map(v => ({ label: classLevel(v.key) || v.key, date: v.key, value: v.value - benchmark, n: v.n, key: v.key })),
        n: values.reduce((s, v) => s + v.n, 0), explain: { benchmark, noStaffRanking: true },
      }
    }
    case 'marks.grade_inflation': {
      const series = markSeries({ ...q, grain: 'year' }, 'average')
      const values = series.points.map(p => p.value)
      const change = values.length > 1 ? (values.at(-1) ?? 0) - (values[0] ?? 0) : 0
      return { ...series, points: [{ label: 'Évolution annuelle', date: 'year', value: change, n: series.n }], explain: { ...series.explain, commonAssessmentMixRequired: true } }
    }
    case 'assessment.difficulty': {
      const stats = getAnalyticsDemoData().itemStats.filter(i => {
        const assessment = getAnalyticsDemoData().assessments.find(a => a.assessmentKey === i.assessmentKey)
        return assessment && (!q.classId || assessment.classKey === q.classId) && (!q.subject || assessment.subject === q.subject) && (!q.year || assessment.year === q.year) && (!q.term || assessment.term === q.term)
      })
      const attempts = stats.reduce((s, i) => s + i.attempted, 0)
      const correct = stats.reduce((s, i) => s + i.correct, 0)
      const result = itemDifficulty(correct, attempts)
      return { points: [{ label: 'Q3 — fractions', date: q.term ?? 'all', value: result.value, n: result.n, ci: result.ci }], n: result.n, ci: result.ci, explain: result.explain }
    }
    case 'assessment.discrimination':
      return { ...unavailableSeries('binary item responses are not stored in the demo item facts'), denominator: 'attempted items' }
    case 'engagement.homework_completion_rate': return { ...homeworkSeries(q), denominator: 'assigned homework, exemptions excluded' }
    case 'engagement.on_time_submission_rate': {
      const rows = getAnalyticsDemoData().homework.filter(h => !q.classId || h.classKey === q.classId)
      const submitted = rows.reduce((s, h) => s + h.submitted, 0)
      const onTime = rows.reduce((s, h) => s + h.onTime, 0)
      return { ...rateMetric(onTime, submitted, 'onTime'), points: [{ label: 'Rendus à l’heure', date: q.term ?? 'all', value: onTime / Math.max(1, submitted) * 100, n: submitted }] }
    }
    case 'engagement.message_response_time':
    case 'engagement.portal_activity':
      return { ...unavailableSeries('message/portal facts are not available in this demo'), denominator: 'aggregate threads / guardians' }
    case 'combined.attendance_attainment': return { ...combinedSeries(q, 'association'), associationNotCausation: true }
    case 'combined.risk_composite': return { ...combinedSeries(q, 'composite'), denominator: 'visible weighted factors' }
    case 'combined.cohort_retention': return { ...combinedSeries(q, 'retention'), denominator: 'cohort at entry' }
    case 'combined.subject_pass_matrix': return { ...markSeries(q, 'pass'), denominator: 'assessed marks by class × subject' }
    case 'finance.collection_rate': return { ...financeSeries(q, 'collection'), denominator: 'amount invoiced in period (integer cents)' }
    case 'finance.overdue_ageing': return { ...financeSeries(q, 'ageing'), denominator: 'outstanding invoices by days past due' }
    case 'finance.collection_forecast': return { ...financeSeries(q, 'forecast'), denominator: 'monthly collection history' }
    case 'ops.cost_per_student': return { ...unavailableSeries('operating cost facts do not exist yet'), denominator: 'enrolled students' }
    case 'dq.register_timeliness': return { ...qualitySeries(q, 'registers'), denominator: 'expected registers' }
    case 'dq.mark_entry_completeness': return { ...qualitySeries(q, 'marks'), denominator: 'expected marks, dispensations excluded' }
    case 'dq.anomaly_count': return { ...qualitySeries(q, 'anomalies'), denominator: 'rules evaluated' }
    case 'dq.guardian_coverage': return { ...qualitySeries(q, 'guardians'), denominator: 'enrolled students' }
    default: return { ...unavailableSeries('metric has no demo adapter'), denominator: undefined }
  }
}

function envelope(id: MetricId, computed: ComputedMetric, q: AnalyticsQuery): AnalyticsResponse<TimePoint[]> {
  const definition = METRIC_DEFINITIONS[id]!
  const threshold = normalizeThreshold(undefined)
  const guard = guardFilteredGroupSize(computed.n, threshold)
  const points = guard.allowed ? computed.points : []
  const meta: AnalyticsMeta = {
    metricIds: [id],
    n: computed.n,
    denominator: computed.denominator,
    ci: computed.ci,
    suppressedCells: computed.explain.suppressedCells === true || !guard.allowed || computed.points.some(p => p.suppressed),
    suppressionThreshold: threshold,
    lowSample: computed.n < definition.nMin,
    dataAsOf: getAnalyticsDemoData().dataAsOf,
    mock: true,
    explain: {
      ...computed.explain,
      formula: definition.formula,
      ...Object.fromEntries(
        Object.entries(q)
          .filter(([k, v]) => !k.startsWith('from') && !k.startsWith('to') && v !== undefined)
          .map(([k, v]) => [`filter.${k}`, v as string | number | boolean | null]),
      ),
    },
    associationNotCausation: computed.associationNotCausation ?? (definition.roles.length > 0 && definition.caveats.some(c => c.en.includes('Association'))),
  }
  return { data: points, meta }
}

function tableEnvelope(id: MetricId, q: AnalyticsQuery): AnalyticsResponse<Paginated<DataPoint>> {
  const series = envelope(id, computeMetric(id, q), q)
  const page = Math.max(1, q.page ?? 1)
  const pageSize = Math.max(5, Math.min(100, q.pageSize ?? 20))
  let rows = series.data.map(p => ({ ...p }))
  if (q.sort === 'value-desc') rows.sort((a, b) => b.value - a.value)
  if (q.sort === 'value-asc') rows.sort((a, b) => a.value - b.value)
  const total = rows.length
  rows = rows.slice((page - 1) * pageSize, page * pageSize)
  return { data: { rows, total, page, pageSize }, meta: series.meta }
}

function matrixEnvelope(id: MetricId, q: AnalyticsQuery): AnalyticsResponse<{ rows: (DataPoint | null)[][]; columns: string[] }> {
  const role = currentRole()
  const scoped = scopedQuery(q, role)
  const dimensionA = q.dimensionA ?? 'class'
  const dimensionB = q.dimensionB ?? (id === 'attendance.rate' ? 'weekday' : 'subject')
  const threshold = normalizeThreshold(undefined)
  const data = getAnalyticsDemoData()
  const aKeys = dimensionA === 'level' ? [...new Set(data.classDims.map(c => c.level))] : data.classDims.map(c => c.classKey)
  const bKeys = dimensionB === 'weekday' ? ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'] : id === 'attendance.rate' ? ['Matin', 'Après-midi'] : [...new Set(data.assessments.map(a => a.subject))]
  const rows = aKeys.map((aKey) => bKeys.map((bKey) => {
    let present = 0
    let expected = 0
    if (id === 'attendance.rate') {
      for (const r of filteredAttendance(scoped)) {
        const aMatch = dimensionA === 'level' ? classLevel(r.classKey) === aKey : r.classKey === aKey
        const bMatch = dimensionB === 'weekday' ? (bKey === 'Lun' ? r.weekday === 0 : bKey === 'Mar' ? r.weekday === 1 : bKey === 'Mer' ? r.weekday === 2 : bKey === 'Jeu' ? r.weekday === 3 : r.weekday === 4) : (bKey === 'Matin' ? r.period === 0 : r.period === 1)
        if (aMatch && bMatch) { present += r.present; expected += r.expected }
      }
    } else {
      for (const assessment of filteredAssessments(scoped)) {
        const aMatch = dimensionA === 'level' ? classLevel(assessment.classKey) === aKey : assessment.classKey === aKey
        if (!aMatch || assessment.subject !== bKey) continue
        for (const m of assessment.marks) if (!m.dispensed && !m.absent) { expected++; if ((m.value / m.scaleMax) * 20 >= 10) present++ }
      }
    }
    const cell: DataPoint = { label: `${aKey} × ${bKey}`, value: expected ? (present / expected) * 100 : 0, n: expected, key: `${aKey}:${bKey}` }
    return expected >= threshold ? cell : null
  }))
  const flat = rows.flat().filter((c): c is DataPoint => c !== null)
  return {
    data: { rows, columns: bKeys },
    meta: {
      metricIds: [id], n: flat.reduce((s, c) => s + c.n, 0),
      suppressedCells: rows.flat().some(c => c === null), suppressionThreshold: threshold,
      lowSample: false, dataAsOf: data.dataAsOf, mock: true,
      explain: { dimensionA, dimensionB, rule: 'cells below threshold are rendered as n<seuil, never a number' },
    },
  }
}

function buildInsights(q: AnalyticsQuery, role: MetricRole, cards: OverviewCard[]): Insight[] {
  const scoped = scopedQuery(q, role)
  const candidates: (Insight | null)[] = []
  const attendance = attendanceSeries(scoped, 'present')
  const values = attendance.points.map(p => p.value)
  const halfWidth = (attendance.ci ? (attendance.ci.upper - attendance.ci.lower) / 2 : 0) / Math.max(1, Math.sqrt(values.length))
  const current = values.at(-1) ?? 0
  const previous = values.at(-2) ?? current
  candidates.push(suddenAttendanceDrop(current, previous, halfWidth, attendance.n, { classId: scoped.classId, term: scoped.term }))
  const monFri = attendanceSeries({ ...scoped, grain: 'week' }, 'unjustified').points
  const effect = monFri.length ? monFri.reduce((s, p) => s + p.value, 0) / monFri.length : 0
  candidates.push(weekdayCluster(effect, 'lundi', monFri.length, { classId: scoped.classId }))

  const late = attendanceSeries(scoped, 'late')
  const lateValues = late.points.map(p => p.value)
  candidates.push(risingLateness(lateValues.at(-1) ?? 0, lateValues.at(-2) ?? 0, late.n, { classId: scoped.classId, period: scoped.term }))

  const marks = markSeries(scoped, 'average')
  const schoolMean = marks.points.reduce((s, p) => s + p.value * p.n, 0) / Math.max(1, marks.n)
  for (const point of marks.points) candidates.push(classBelowCohort(point.value, schoolMean, point.n, { classId: point.key, term: scoped.term }))

  const histogram = markHistogram(filteredAssessments(scoped).flatMap(a => a.marks))
  candidates.push(distributionSkew(histogram.ceilingEffect, histogram.floorEffect, Math.max(histogram.bins.at(-1)?.count ?? 0, histogram.bins[0]?.count ?? 0) / Math.max(1, histogram.n), histogram.n, { subject: scoped.subject }))

  const item = computeMetric('assessment.difficulty', scoped)
  const pValue = (item.points[0]?.value ?? 1) / 100
  if (item.n >= 10) candidates.push(assessmentDifficulty(pValue, 'Q3 — fractions', item.n, { subject: scoped.subject }))

  const homework = homeworkSeries(scoped)
  const hwValues = homework.points.map(p => p.value)
  candidates.push(homeworkDecline(hwValues.at(-1) ?? 0, hwValues.at(-2) ?? 0, homework.n, { classId: scoped.classId }))

  const registers = qualitySeries(scoped, 'registers')
  candidates.push(dataQualityGap(registers.points[0]?.value ?? 100, 90, { classId: scoped.classId }))

  const finance = financeSeries(scoped, 'collection')
  if (cards.some(c => c.metricId === 'finance.collection_rate')) {
    candidates.push(collectionRisk(finance.points.at(-1)?.value ?? 100, getAnalyticsDemoData().finance.reduce((s, f) => s + f.overdueCents, 0), finance.n, { period: scoped.term }))
  }
  return collectInsights(candidates).filter(i => !dismissed.has(i.dedupeKey) && (!snoozed.has(i.dedupeKey) || new Date(snoozed.get(i.dedupeKey)!).getTime() <= Date.now()))
}

const DASHBOARD_CARDS: Record<string, string[]> = {
  principal: ['attendance.rate', 'marks.weighted_average', 'engagement.homework_completion_rate', 'finance.collection_rate', 'dq.register_timeliness', 'combined.attendance_attainment'],
  admin: ['dq.register_timeliness', 'dq.mark_entry_completeness', 'dq.guardian_coverage', 'attendance.rate', 'engagement.homework_completion_rate'],
  'vie-scolaire': ['attendance.rate', 'attendance.lateness_rate', 'attendance.unjustified_rate', 'attendance.monday_friday_effect', 'attendance.post_holiday_dip'],
  teacher: ['attendance.rate', 'marks.weighted_average', 'marks.pass_rate', 'engagement.homework_completion_rate', 'assessment.difficulty'],
  parent: ['attendance.rate', 'marks.weighted_average', 'engagement.homework_completion_rate'],
  student: ['attendance.rate', 'marks.weighted_average', 'engagement.homework_completion_rate'],
  finance: ['finance.collection_rate', 'finance.overdue_ageing', 'finance.collection_forecast'],
  group: ['attendance.rate', 'marks.grade_inflation', 'combined.cohort_retention'],
  audit: ['dq.register_timeliness', 'dq.mark_entry_completeness', 'dq.anomaly_count'],
  light: ['attendance.rate', 'engagement.homework_completion_rate'],
  analyst: ['attendance.rate', 'marks.weighted_average', 'marks.pass_rate', 'marks.value_added', 'engagement.homework_completion_rate', 'combined.attendance_attainment'],
}

function overview(q: AnalyticsQuery): AnalyticsResponse<AnalyticsOverview> {
  const role = currentRole()
  const scoped = scopedQuery(q, role)
  let dashboard = scoped.dashboard ?? 'principal'
  if (role === 'teacher') dashboard = 'teacher'
  if (role === 'parent' || role === 'student') dashboard = role
  if (role === 'finance') dashboard = 'finance'
  if (role === 'auditor') dashboard = 'audit'
  if (role === 'analyst') dashboard = 'analyst'
  const requested = DASHBOARD_CARDS[dashboard] ?? DASHBOARD_CARDS.principal!
  const ids = requested.filter(id => METRIC_DEFINITIONS[id]?.roles.includes(role))
  const cards: OverviewCard[] = ids.map(id => {
    const definition = METRIC_DEFINITIONS[id]!
    const computed = computeMetric(id as MetricId, scoped)
    const values = computed.points.map(p => p.value)
    const current = values.at(-1) ?? computed.points[0]?.value ?? 0
    const previous = values.at(-2) ?? current
    const comparison = seasonalityAwareComparison(current, previous, computed.ci ? (computed.ci.upper - computed.ci.lower) / 2 : 0, definition.good === 'down' ? 'down' : 'up')
    return {
      metricId: id,
      label: definition.name.en,
      value: current,
      unit: definition.unit,
      n: computed.n,
      ci: computed.ci,
      change: current - previous,
      wording: comparison.detail,
      lowSample: computed.n < definition.nMin,
      suppressed: computed.explain.suppressedCells === true || computed.points.some(p => p.suppressed),
      target: targets.get(id)?.value,
    }
  })
  const seriesIds = ids.slice(0, 3)
  const series: OverviewSeries[] = seriesIds.map(id => ({
    metricId: id,
    question: METRIC_DEFINITIONS[id]!.name,
    points: envelope(id as MetricId, computeMetric(id as MetricId, scoped), scoped).data,
  }))
  const freshness: Freshness = {
    dataAsOf: getAnalyticsDemoData().dataAsOf,
    generatedAt: getAnalyticsDemoData().generatedAt,
    sourceAvailable: false,
    mock: true,
    refreshState: 'demo',
    notes: {
      fr: 'Données de démonstration synthétiques. Aucune décision automatique.',
      en: 'Synthetic demonstration data. No automated decisions.',
    },
  }
  return {
    data: {
      dashboard, role, cards, series,
      insights: buildInsights(scoped, role, cards),
      targets: [...targets.values()],
      freshness,
      suppressedCells: cards.some(c => c.suppressed) || series.some(s => s.points.some(p => p.suppressed)),
    },
    meta: {
      metricIds: ids,
      n: cards.reduce((s, c) => s + c.n, 0),
      suppressedCells: cards.some(c => c.suppressed),
      suppressionThreshold: normalizeThreshold(undefined),
      lowSample: cards.some(c => c.lowSample),
      dataAsOf: freshness.dataAsOf,
      mock: true,
      explain: { dashboard, role, scopeFilter: scoped.classId ?? 'school', sourceAvailable: false },
    },
  }
}

function scenario(input: ScenarioInput & Record<string, unknown>): AnalyticsResponse<ScenarioResult> {
  const attendanceDelta = Number(input.attendanceDelta ?? 0)
  const homeworkDelta = Number(input.homeworkDelta ?? 0)
  const markDelta = Number(input.markDelta ?? 0)
  const horizon = Math.max(1, Math.min(12, Number(input.horizon ?? 3)))
  const base = computeMetric('attendance.rate', { grain: 'month' })
  const latest = base.points.at(-1)?.value ?? 94
  const points = Array.from({ length: horizon }, (_, i) => ({
    label: `M+${i + 1}`,
    attendance: Math.max(0, Math.min(100, latest + attendanceDelta * (i + 1))),
    homework: Math.max(0, Math.min(100, 86 + homeworkDelta * (i + 1))),
    mark: Math.max(0, Math.min(20, 11.5 + markDelta * (i + 1))),
    n: base.n,
  }))
  return {
    data: {
      horizon, points,
      assumptions: [
        { fr: 'Effet linéaire supposé, sans causalité démontrée.', en: 'Linear effect assumed; causation is not demonstrated.' },
        { fr: 'Aucune action n’est déclenchée automatiquement.', en: 'No action is triggered automatically.' },
      ],
      warning: { fr: 'Scénario hypothétique, pas une prévision validée.', en: 'Hypothetical scenario, not a validated forecast.' },
    },
    meta: {
      metricIds: ['attendance.rate', 'engagement.homework_completion_rate', 'marks.weighted_average'],
      n: base.n, suppressionThreshold: normalizeThreshold(undefined), suppressedCells: false,
      lowSample: false, dataAsOf: getAnalyticsDemoData().dataAsOf, mock: true,
      explain: { attendanceDelta, homeworkDelta, markDelta, horizon },
    },
  }
}

function csv(rows: TimePoint[], metricId: string): string {
  const header = 'label,date,value,n,ci_lower,ci_upper,suppressed'
  const body = rows.map(p => [p.label, p.date, p.value.toFixed(2), p.n, p.ci?.lower ?? '', p.ci?.upper ?? '', p.suppressed ? 'true' : 'false'].map(v => `"${String(v).replaceAll('"', '""')}"`).join(','))
  return `Confidential; metric=${metricId}; generated=${getAnalyticsDemoData().dataAsOf}; actor=${actor()}\n${header}\n${body.join('\n')}\n`
}

export function analyticsRequest(path: string, method: Method, body: any): unknown | null {
  const role = currentRole()
  const url = new URL(path, 'http://mock.local')
  const q = parseQuery(path)

  if (url.pathname === '/v1/analytics/meta' && method === 'GET') {
    const ids = Object.keys(METRIC_DEFINITIONS).filter(id => METRIC_DEFINITIONS[id]!.roles.includes(role))
    return {
      data: {
        version: '1.0.0',
        metricIds: ids,
        definitions: Object.fromEntries(ids.map(id => [id, METRIC_DEFINITIONS[id]])),
        options: {
          years: [...new Set(getAnalyticsDemoData().studentTerms.map(s => s.year))].sort(),
          terms: [...new Set(getAnalyticsDemoData().studentTerms.map(s => s.term))].sort(),
          classes: getAnalyticsDemoData().classDims.map(c => ({ value: c.classKey, label: c.classKey })),
          levels: [...new Set(getAnalyticsDemoData().classDims.map(c => c.level))].sort(),
          subjects: [...new Set(getAnalyticsDemoData().assessments.map(a => a.subject))].sort(),
        },
        freshness: {
          dataAsOf: getAnalyticsDemoData().dataAsOf, generatedAt: getAnalyticsDemoData().generatedAt,
          sourceAvailable: false, mock: true, refreshState: 'demo',
          notes: { fr: 'Données synthétiques de démonstration.', en: 'Synthetic demonstration data.' },
        } satisfies Freshness,
      },
      meta: { metricIds: ids, n: 0, suppressedCells: false, suppressionThreshold: normalizeThreshold(undefined), lowSample: false, dataAsOf: getAnalyticsDemoData().dataAsOf, mock: true },
    }
  }
  if (url.pathname === '/v1/analytics/overview' && method === 'GET') return overview(q)
  if (url.pathname === '/v1/analytics/series' && method === 'GET') {
    const id = requireMetric(q.metric)
    return envelope(id, computeMetric(id, scopedQuery(q, role)), scopedQuery(q, role))
  }
  if (url.pathname === '/v1/analytics/table' && method === 'GET') {
    const id = requireMetric(q.metric)
    return tableEnvelope(id, scopedQuery(q, role))
  }
  if (url.pathname === '/v1/analytics/matrix' && method === 'GET') {
    const id = requireMetric(q.metric)
    return matrixEnvelope(id, scopedQuery(q, role))
  }
  if (url.pathname === '/v1/analytics/insights' && method === 'GET') {
    const scoped = scopedQuery(q, role)
    const cards = overview({ ...scoped, dashboard: scoped.dashboard ?? 'principal' }).data.cards
    return {
      data: buildInsights(scoped, role, cards),
      meta: { metricIds: [], n: 0, suppressedCells: false, suppressionThreshold: normalizeThreshold(undefined), lowSample: false, dataAsOf: getAnalyticsDemoData().dataAsOf, mock: true, explain: { ruleBased: true, dismissSnoozePerUser: true } },
    }
  }
  const explainMatch = url.pathname.match(/^\/v1\/analytics\/explain\/([^/]+)$/)
  if (explainMatch && method === 'GET') {
    const id = requireMetric(decodeURIComponent(explainMatch[1]!))
    const scoped = scopedQuery(q, role)
    const computed = computeMetric(id, scoped)
    const definition = METRIC_DEFINITIONS[id]!
    return {
      data: {
        id, version: definition.version, definition: definition.definition, formula: definition.formula,
        caveats: definition.caveats, grain: definition.grain, unit: definition.unit,
        nMin: definition.nMin, explain: computed.explain, denominator: computed.denominator,
      },
      meta: envelope(id, computed, scoped).meta,
    }
  }
  if (url.pathname === '/v1/analytics/targets' && method === 'GET') {
    return { data: [...targets.values()], meta: { metricIds: [...targets.keys()], n: targets.size, suppressedCells: false, suppressionThreshold: normalizeThreshold(undefined), lowSample: false, dataAsOf: getAnalyticsDemoData().dataAsOf, mock: true } }
  }
  if (url.pathname === '/v1/analytics/targets' && method === 'POST') {
    if (!['director', 'school_admin', 'deputy'].includes(role)) fail(403, 'FORBIDDEN', 'Only head/admin may configure targets')
    const id = requireMetric(String(body?.metricId ?? ''))
    const value = Number(body?.value)
    if (!Number.isFinite(value)) fail(400, 'INVALID_INPUT', 'Target value must be a number')
    const target: Target = { metricId: id, value, updatedAt: new Date().toISOString(), updatedBy: actor() }
    targets.set(id, target)
    return { data: target, meta: { metricIds: [id], n: 1, suppressedCells: false, suppressionThreshold: normalizeThreshold(undefined), lowSample: false, dataAsOf: getAnalyticsDemoData().dataAsOf, mock: true } }
  }
  if (url.pathname === '/v1/analytics/interventions' && method === 'GET') {
    return { data: [...interventions], meta: { metricIds: [...new Set(interventions.map(i => i.metricId))], n: interventions.length, suppressedCells: false, suppressionThreshold: normalizeThreshold(undefined), lowSample: false, dataAsOf: getAnalyticsDemoData().dataAsOf, mock: true } }
  }
  if (url.pathname === '/v1/analytics/interventions' && method === 'POST') {
    if (!['director', 'school_admin', 'deputy', 'teacher', 'analyst'].includes(role)) fail(403, 'FORBIDDEN', 'Role cannot record interventions')
    const metricId = requireMetric(String(body?.metricId ?? ''))
    const intervention: Intervention = {
      id: `iv-${interventions.length + 1}`,
      metricId,
      scope: String(body?.scope ?? 'school'),
      note: String(body?.note ?? '').slice(0, 500),
      status: 'planned',
      createdAt: new Date().toISOString(),
    }
    interventions.unshift(intervention)
    return { data: intervention, meta: { metricIds: [metricId], n: 1, suppressedCells: false, suppressionThreshold: normalizeThreshold(undefined), lowSample: false, dataAsOf: getAnalyticsDemoData().dataAsOf, mock: true } }
  }
  const interventionMatch = url.pathname.match(/^\/v1\/analytics\/interventions\/([^/]+)$/)
  if (interventionMatch && method === 'PATCH') {
    const item = interventions.find(i => i.id === interventionMatch[1])
    if (!item) fail(404, 'NOT_FOUND', 'Intervention not found')
    item.status = ['planned', 'in_progress', 'reviewed'].includes(String(body?.status)) ? body.status : item.status
    return { data: item, meta: { metricIds: [item.metricId], n: 1, suppressedCells: false, suppressionThreshold: normalizeThreshold(undefined), lowSample: false, dataAsOf: getAnalyticsDemoData().dataAsOf, mock: true } }
  }
  if (url.pathname === '/v1/analytics/insights/dismiss' && method === 'POST') {
    dismissed.add(String(body?.dedupeKey ?? ''))
    return { data: { dismissed: true }, meta: { metricIds: [], n: 0, suppressedCells: false, suppressionThreshold: normalizeThreshold(undefined), lowSample: false, dataAsOf: getAnalyticsDemoData().dataAsOf, mock: true } }
  }
  if (url.pathname === '/v1/analytics/insights/snooze' && method === 'POST') {
    const until = new Date(Date.now() + Math.max(1, Number(body?.days ?? 7)) * 86400000).toISOString()
    snoozed.set(String(body?.dedupeKey ?? ''), until)
    return { data: { snoozedUntil: until }, meta: { metricIds: [], n: 0, suppressedCells: false, suppressionThreshold: normalizeThreshold(undefined), lowSample: false, dataAsOf: getAnalyticsDemoData().dataAsOf, mock: true } }
  }
  if (url.pathname === '/v1/analytics/scenario' && method === 'POST') return scenario(body ?? {})
  if (url.pathname === '/v1/analytics/export' && method === 'POST') {
    if (!(sessionStore.user?.stepUpUntil && sessionStore.user.stepUpUntil > Date.now())) fail(403, 'STEP_UP_REQUIRED', 'Fresh MFA required for export')
    const metricId = requireMetric(String(body?.metricId ?? 'attendance.rate'))
    const format = ['csv', 'print'].includes(String(body?.format)) ? String(body.format) : 'csv'
    const rows = envelope(metricId, computeMetric(metricId, scopedQuery(q, role)), scopedQuery(q, role)).data
    const id = `exp-${exports.size + 1}`
    const job = { id, status: 'ready' as const, format, rows: rows.length, watermark: `Confidential · generated by ${actor()} · ${new Date().toISOString()}`, csv: format === 'csv' ? csv(rows, metricId) : '' }
    exports.set(id, job)
    return { data: job, meta: { metricIds: [metricId], n: rows.length, suppressedCells: rows.some(r => r.suppressed), suppressionThreshold: normalizeThreshold(undefined), lowSample: false, dataAsOf: getAnalyticsDemoData().dataAsOf, mock: true, explain: { async: true, stepUpVerified: true } } }
  }
  const exportMatch = url.pathname.match(/^\/v1\/analytics\/export\/([^/]+)$/)
  if (exportMatch && method === 'GET') {
    const job = exports.get(exportMatch[1]!)
    if (!job) fail(404, 'NOT_FOUND', 'Export job not found')
    return { data: job, meta: { metricIds: [], n: job.rows, suppressedCells: false, suppressionThreshold: normalizeThreshold(undefined), lowSample: false, dataAsOf: getAnalyticsDemoData().dataAsOf, mock: true } }
  }
  return null
}

/** Test-only reset for per-user UX state and generated exports. */
export function resetAnalyticsMockState(): void {
  targets.clear()
  for (const [key, value] of Object.entries(defaults)) targets.set(key, value)
  interventions.length = 0
  dismissed.clear()
  snoozed.clear()
  exports.clear()
}
