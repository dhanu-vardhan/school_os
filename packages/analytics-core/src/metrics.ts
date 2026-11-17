/**
 * Reference implementations of the core metrics defined in docs/METRIC_DICTIONARY.md.
 *
 * These functions are used by the flagged demo adapter and by golden/property tests.
 * The Java governed API must produce mathematically identical results (shared fixtures).
 */

import type { ConfidenceInterval } from '@schoolos/shared'
import {
  bootstrapMeanInterval,
  cohensD,
  linearRegression,
  mean,
  median,
  percentileRank,
  pointBiserial,
  quantile,
  stdDev,
  tMeanInterval,
  wilsonInterval,
} from './stats'

export interface MetricResult {
  value: number
  n: number
  ci?: ConfidenceInterval
  explain: Record<string, string | number | boolean | null>
}

const toPercent = (ci: ConfidenceInterval): ConfidenceInterval => ({
  ...ci,
  lower: ci.lower * 100,
  upper: ci.upper * 100,
})

// --------------------------------------------------------------------- attendance

/** attendance.rate — present / expected, Wilson CI. Excused absences are NOT present here. */
export function attendanceRate(present: number, expected: number): MetricResult {
  if (expected < 0 || present < 0) throw new RangeError('analytics-core: counts must be non-negative')
  const ci = expected > 0 ? toPercent(wilsonInterval(present, expected)) : undefined
  return {
    value: expected > 0 ? (present / expected) * 100 : 0,
    n: expected,
    ci,
    explain: { present, expected, excusedCountedAsPresent: false },
  }
}

/** attendance.unjustified_rate / justified_rate / lateness_rate — same Wilson machinery. */
export function rateMetric(successes: number, trials: number, label: string): MetricResult {
  const ci = trials > 0 ? toPercent(wilsonInterval(successes, trials)) : undefined
  return {
    value: trials > 0 ? (successes / trials) * 100 : 0,
    n: trials,
    ci,
    explain: { [label]: successes, expected: trials },
  }
}

/** attendance.avg_minutes_late — t CI for n≥30, bootstrap otherwise. */
export function averageMinutesLate(minutesLate: readonly number[]): MetricResult {
  if (!minutesLate.length) return { value: 0, n: 0, ci: undefined, explain: { lateEvents: 0 } }
  return {
    value: mean(minutesLate),
    n: minutesLate.length,
    ci: minutesLate.length >= 30 ? tMeanInterval(minutesLate) : bootstrapMeanInterval(minutesLate),
    explain: { lateEvents: minutesLate.length, justifiedLateExcluded: true },
  }
}

// -------------------------------------------------------------------------- marks

export interface NormalisedMark {
  /** Raw mark as recorded. */
  value: number
  /** Maximum of the assessment's scale (e.g. 20, 10, 100). */
  scaleMax: number
  /** Assessment coefficient/weight. */
  coefficient: number
  dispensed?: boolean
  absent?: boolean
}

/** Normalise a mark to /20 and drop dispensed/absent marks. */
export function normaliseMark(mark: NormalisedMark): number | null {
  if (mark.dispensed || mark.absent) return null
  if (mark.scaleMax <= 0) throw new RangeError('analytics-core: scaleMax must be positive')
  return (mark.value / mark.scaleMax) * 20
}

/** marks.weighted_average — coefficients, scale normalisation, exclusions. */
export function weightedAverage(marks: readonly NormalisedMark[]): MetricResult {
  let numerator = 0
  let denominator = 0
  let excludedDispensed = 0
  let excludedAbsent = 0
  const values: number[] = []
  for (const mark of marks) {
    if (mark.dispensed) { excludedDispensed++; continue }
    if (mark.absent) { excludedAbsent++; continue }
    const normalised = normaliseMark(mark)
    if (normalised === null) continue
    numerator += normalised * mark.coefficient
    denominator += mark.coefficient
    values.push(normalised)
  }
  const value = denominator > 0 ? numerator / denominator : 0
  return {
    value,
    n: values.length,
    ci: values.length >= 2 ? tMeanInterval(values) : undefined,
    explain: {
      assessments: marks.length,
      included: values.length,
      excludedDispensed,
      excludedAbsent,
      totalCoefficient: denominator,
      scale: '/20',
    },
  }
}

/** marks.median / std_dev / percentile band on normalised marks. */
export function markDistribution(marks: readonly NormalisedMark[]): {
  median: number
  stdDev: number
  p25: number
  p75: number
  n: number
} {
  const values = marks.map(normaliseMark).filter((v): v is number => v !== null)
  return {
    median: values.length ? median(values) : 0,
    stdDev: values.length > 1 ? stdDev(values) : 0,
    p25: values.length ? quantile(values, 0.25) : 0,
    p75: values.length ? quantile(values, 0.75) : 0,
    n: values.length,
  }
}

/** marks.pass_rate — Wilson CI, configurable threshold. */
export function passRate(marks: readonly NormalisedMark[], threshold = 10): MetricResult {
  const values = marks.map(normaliseMark).filter((v): v is number => v !== null)
  const passed = values.filter((v) => v >= threshold).length
  const ci = values.length ? toPercent(wilsonInterval(passed, values.length)) : undefined
  return {
    value: values.length ? (passed / values.length) * 100 : 0,
    n: values.length,
    ci,
    explain: { passed, assessed: values.length, threshold, dispensedExcluded: true },
  }
}

/** marks.distribution — fixed 2-point bins on /20; ceiling/floor flag at >30%. */
export function markHistogram(marks: readonly NormalisedMark[], binSize = 2): {
  bins: { label: string; count: number; from: number; to: number }[]
  ceilingEffect: boolean
  floorEffect: boolean
  n: number
} {
  const values = marks.map(normaliseMark).filter((v): v is number => v !== null)
  const binCount = Math.ceil(20 / binSize)
  const bins = Array.from({ length: binCount }, (_, i) => ({
    label: `${i * binSize}–${Math.min(20, (i + 1) * binSize)}`,
    count: 0,
    from: i * binSize,
    to: Math.min(20, (i + 1) * binSize),
  }))
  for (const v of values) {
    const idx = Math.min(binCount - 1, Math.max(0, Math.floor(v / binSize)))
    bins[idx].count++
  }
  return {
    bins,
    ceilingEffect: values.length > 0 && bins[binCount - 1].count / values.length > 0.3,
    floorEffect: values.length > 0 && bins[0].count / values.length > 0.3,
    n: values.length,
  }
}

// -------------------------------------------------------------------- value added

export interface PriorAttainmentGroup {
  key: string
  prior: number
  actual: number
}

export interface ValueAddedResult {
  key: string
  residual: number
  n: number
  ci: ConfidenceInterval
}

/**
 * marks.value_added — transparent OLS residual from prior attainment.
 * Slope bounded to [0, 1.2]; fitted on the whole cohort; aggregate only.
 */
export function valueAdded(groups: readonly PriorAttainmentGroup[]): {
  results: ValueAddedResult[]
  alpha: number
  beta: number
  cohortN: number
  effectSize: number
} {
  const fit = groups.length >= 2
    ? linearRegression(groups.map((g) => g.prior), groups.map((g) => g.actual))
    : { slope: 0, intercept: groups[0]?.actual ?? 0, r: 0, r2: 0, n: groups.length }
  const beta = Math.max(0, Math.min(1.2, fit.slope))
  const alpha = fit.intercept
  const residuals = groups.map((g) => g.actual - (alpha + beta * g.prior))
  const residSd = residuals.length > 1 ? stdDev(residuals) : 0
  const results = groups.map((g, i) => ({
    key: g.key,
    residual: residuals[i],
    n: 1,
    ci: residSd > 0
      ? { lower: residuals[i] - 1.96 * residSd, upper: residuals[i] + 1.96 * residSd, method: 't-95' as const, confidence: 0.95 }
      : { lower: residuals[i], upper: residuals[i], method: 'none' as const, confidence: 0.95 },
  }))
  return { results, alpha, beta, cohortN: groups.length, effectSize: fit.r }
}

// --------------------------------------------------------------------- assessment

/** assessment.difficulty — p-value with Wilson CI. */
export function itemDifficulty(correct: number, attempted: number): MetricResult {
  return rateMetric(correct, attempted, 'correct')
}

/** assessment.discrimination — point-biserial correlation with total excluding item. */
export function itemDiscrimination(binary: readonly number[], totalExcludingItem: readonly number[]): MetricResult {
  return {
    value: pointBiserial(binary, totalExcludingItem),
    n: binary.length,
    ci: undefined,
    explain: { method: 'point-biserial', n: binary.length },
  }
}

// ----------------------------------------------------------------------- combined

export interface AttainmentStudent {
  attendanceRate: number
  averageMark: number
}

export interface AttendanceBand {
  label: string
  min: number
  max: number
  n: number
  averageMark: number
  ci?: ConfidenceInterval
}

/** combined.attendance_attainment — binned association with effect size. */
export function attendanceAttainment(
  students: readonly AttainmentStudent[],
  bands: readonly { label: string; min: number; max: number }[] = [
    { label: '<85%', min: 0, max: 85 },
    { label: '85–90%', min: 85, max: 90 },
    { label: '90–95%', min: 90, max: 95 },
    { label: '95%+', min: 95, max: 101 },
  ],
): { bands: AttendanceBand[]; effectSize: number; n: number } {
  const out = bands.map((band) => {
    const marks = students
      .filter((s) => s.attendanceRate >= band.min && s.attendanceRate < band.max)
      .map((s) => s.averageMark)
    return {
      ...band,
      n: marks.length,
      averageMark: marks.length ? mean(marks) : 0,
      ci: marks.length >= 2 ? tMeanInterval(marks) : undefined,
    }
  })
  const xs = students.map((s) => s.attendanceRate)
  const ys = students.map((s) => s.averageMark)
  return { bands: out, effectSize: linearRegression(xs, ys).r, n: students.length }
}

export interface SupportFactor {
  key: string
  value: number
  weight: number
}

/** combined.risk_composite — transparent weighted index with visible reasons. */
export function supportComposite(factors: readonly SupportFactor[]): MetricResult {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0)
  const value = totalWeight > 0
    ? factors.reduce((sum, f) => sum + f.value * f.weight, 0) / totalWeight
    : 0
  const explain: Record<string, string | number | boolean | null> = { totalWeight }
  for (const f of factors) explain[`factor.${f.key}`] = `${f.weight} × ${f.value}`
  return { value, n: factors.length, explain }
}

// ------------------------------------------------------------------------- finance

/** finance.collection_rate — integer cents in, percent out. */
export function collectionRate(collectedCents: number, invoicedCents: number): MetricResult {
  const ci = invoicedCents > 0 ? toPercent(wilsonInterval(collectedCents, invoicedCents)) : undefined
  return {
    value: invoicedCents > 0 ? (collectedCents / invoicedCents) * 100 : 0,
    n: invoicedCents,
    ci,
    explain: { collectedCents, invoicedCents, writtenOffExcluded: true },
  }
}

export interface AgeingBucket {
  label: string
  minDays: number
  maxDays: number
  outstandingCents: number
  invoiceCount: number
}

/** finance.overdue_ageing — fixed buckets, no family identifiers. */
export function overdueAgeing(
  invoices: readonly { daysPastDue: number; outstandingCents: number }[],
): AgeingBucket[] {
  const defs = [
    { label: '0–30 j', minDays: 0, maxDays: 30 },
    { label: '31–60 j', minDays: 31, maxDays: 60 },
    { label: '61–90 j', minDays: 61, maxDays: 90 },
    { label: '90+ j', minDays: 91, maxDays: Number.MAX_SAFE_INTEGER },
  ]
  return defs.map((d) => {
    const matching = invoices.filter((i) => i.daysPastDue >= d.minDays && i.daysPastDue <= d.maxDays)
    return {
      ...d,
      outstandingCents: matching.reduce((sum, i) => sum + i.outstandingCents, 0),
      invoiceCount: matching.length,
    }
  })
}

/** Aggregation invariant helper used by property tests: class sums must equal school totals. */
export function sumCounts(rows: readonly { n: number }[]): number {
  return rows.reduce((sum, r) => sum + r.n, 0)
}

export { cohensD, mean, median, percentileRank, stdDev }
