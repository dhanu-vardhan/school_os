/**
 * Golden + property tests for packages/analytics-core.
 *
 * Expected values are hand-computed (or taken from standard statistical tables) and
 * intentionally independent of the implementation. Any formula change must update
 * METRIC_DICTIONARY.md and these fixtures together.
 */

import { describe, expect, it } from 'vitest'
import {
  attendanceAttainment,
  attendanceRate,
  averageMinutesLate,
  backtest,
  bootstrapMeanInterval,
  collectionRate,
  exponentialSmoothing,
  guardFilteredGroupSize,
  itemDifficulty,
  linearRegression,
  markDistribution,
  movingAverage,
  normalQuantile,
  overdueAgeing,
  passRate,
  pointBiserial,
  seasonalNaive,
  studentTCdf,
  suddenAttendanceDrop,
  suppressCells,
  tCritical,
  tMeanInterval,
  valueAdded,
  weekdayCluster,
  weightedAverage,
  wilsonInterval,
} from '@schoolos/analytics-core'

describe('stats — hand-computed golden fixtures', () => {
  it('Wilson 95% interval for 90/100 ≈ [0.8256, 0.9447]', () => {
    const ci = wilsonInterval(90, 100)
    expect(ci.method).toBe('wilson-95')
    expect(ci.lower).toBeCloseTo(0.8256, 3)
    expect(ci.upper).toBeCloseTo(0.9447, 3)
  })

  it('Wilson 95% interval for 50/100 is symmetric ≈ [0.4038, 0.5962]', () => {
    const ci = wilsonInterval(50, 100)
    expect(ci.lower).toBeCloseTo(0.4038, 3)
    expect(ci.upper).toBeCloseTo(0.5962, 3)
  })

  it('normal quantile at 0.975 ≈ 1.95996', () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.959964, 5)
  })

  it('Student-t critical value t(0.975, 9) ≈ 2.26216', () => {
    expect(tCritical(9)).toBeCloseTo(2.262157, 4)
  })

  it('Student-t CDF is symmetric and monotone', () => {
    expect(studentTCdf(0, 9)).toBeCloseTo(0.5, 6)
    expect(studentTCdf(2.262157, 9)).toBeCloseTo(0.975, 3)
    expect(studentTCdf(-2.262157, 9)).toBeCloseTo(0.025, 3)
  })

  it('t interval for [2,4,4,4,5,5,7,9] (mean 5, sd≈2.138) uses df=7', () => {
    const ci = tMeanInterval([2, 4, 4, 4, 5, 5, 7, 9])
    expect(ci.method).toBe('t-95')
    expect(ci.lower).toBeLessThan(5)
    expect(ci.upper).toBeGreaterThan(5)
    expect(ci.upper - ci.lower).toBeCloseTo(2 * 2.3646 * (2.13809 / Math.sqrt(8)), 2)
  })

  it('bootstrap CI is deterministic for the same seed', () => {
    const a = bootstrapMeanInterval([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95, 500, 7)
    const b = bootstrapMeanInterval([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95, 500, 7)
    expect(a).toEqual(b)
    expect(a.method).toBe('bootstrap-95')
  })

  it('OLS slope/intercept/r for xs=[1,2,3], ys=[2,4,6]', () => {
    const r = linearRegression([1, 2, 3], [2, 4, 6])
    expect(r.slope).toBeCloseTo(2, 10)
    expect(r.intercept).toBeCloseTo(0, 10)
    expect(r.r).toBeCloseTo(1, 10)
    expect(r.r2).toBeCloseTo(1, 10)
  })

  it('point-biserial correlation is positive for a helpful item', () => {
    const r = pointBiserial([1, 0, 1, 0, 1, 0], [10, 5, 8, 3, 9, 4])
    expect(r).toBeGreaterThan(0.8)
    expect(r).toBeLessThanOrEqual(1)
  })
})

describe('metrics — hand-computed golden fixtures', () => {
  it('attendance rate 1102/1180 = 93.39% with Wilson CI', () => {
    const r = attendanceRate(1102, 1180)
    expect(r.value).toBeCloseTo(93.3898, 3)
    expect(r.n).toBe(1180)
    expect(r.ci?.method).toBe('wilson-95')
    expect(r.explain.excusedCountedAsPresent).toBe(false)
  })

  it('weighted average with coefficients and scale normalisation = 15/20', () => {
    const r = weightedAverage([
      { value: 16, scaleMax: 20, coefficient: 1 },
      { value: 8, scaleMax: 10, coefficient: 2 },
      { value: 60, scaleMax: 100, coefficient: 1 },
      { value: 0, scaleMax: 20, coefficient: 1, absent: true },
      { value: 20, scaleMax: 20, coefficient: 1, dispensed: true },
    ])
    expect(r.value).toBeCloseTo(15, 10)
    expect(r.n).toBe(3)
    expect(r.explain.excludedAbsent).toBe(1)
    expect(r.explain.excludedDispensed).toBe(1)
    expect(r.explain.totalCoefficient).toBe(4)
  })

  it('pass rate at 10/20 = 75% for [9,10,14,20]', () => {
    const r = passRate([
      { value: 9, scaleMax: 20, coefficient: 1 },
      { value: 10, scaleMax: 20, coefficient: 1 },
      { value: 14, scaleMax: 20, coefficient: 1 },
      { value: 20, scaleMax: 20, coefficient: 1 },
    ], 10)
    expect(r.value).toBe(75)
    expect(r.n).toBe(4)
    expect(r.ci!.lower).toBeLessThan(75)
    expect(r.ci!.upper).toBeGreaterThan(75)
  })

  it('mark distribution median/P25/P75 on /20', () => {
    const d = markDistribution([2, 4, 6, 8, 10].map((v) => ({ value: v, scaleMax: 10, coefficient: 1 })))
    // normalised: 4,8,12,16,20
    expect(d.median).toBe(12)
    expect(d.p25).toBe(8)
    expect(d.p75).toBe(16)
    expect(d.n).toBe(5)
  })

  it('average minutes late uses n of late events only', () => {
    const r = averageMinutesLate([3, 5, 7, 9, 11])
    expect(r.value).toBe(7)
    expect(r.n).toBe(5)
    expect(r.ci?.method).toBe('bootstrap-95')
  })

  it('value-added residual for a group above the fitted line', () => {
    // prior [10,12,14], actual [11,14,14] → slope 0.75, intercept 4,
    // fitted [11.5, 13, 14.5], residuals [-0.5, +1, -0.5].
    const { results, alpha, beta, cohortN } = valueAdded([
      { key: '6eA', prior: 10, actual: 11 },
      { key: '6eB', prior: 12, actual: 14 },
      { key: '6eC', prior: 14, actual: 14 },
    ])
    expect(beta).toBeCloseTo(0.75, 10)
    expect(alpha).toBeCloseTo(4, 10)
    expect(results.find((r) => r.key === '6eB')?.residual).toBeCloseTo(1, 10)
    expect(results.find((r) => r.key === '6eA')?.residual).toBeCloseTo(-0.5, 10)
    expect(cohortN).toBe(3)
  })

  it('item difficulty p = correct / attempted', () => {
    const r = itemDifficulty(4, 10)
    expect(r.value).toBe(40)
    expect(r.n).toBe(10)
  })

  it('attendance–attainment bins and effect size', () => {
    const res = attendanceAttainment([
      { attendanceRate: 96, averageMark: 14 },
      { attendanceRate: 93, averageMark: 12 },
      { attendanceRate: 88, averageMark: 10 },
      { attendanceRate: 82, averageMark: 8 },
    ])
    expect(res.bands.find((b) => b.label === '95%+')?.averageMark).toBe(14)
    expect(res.bands.find((b) => b.label === '85–90%')?.averageMark).toBe(10)
    expect(res.effectSize).toBeGreaterThan(0.8) // strong positive association, NOT causation
    expect(res.n).toBe(4)
  })

  it('collection rate works in integer cents', () => {
    const r = collectionRate(8400, 10000)
    expect(r.value).toBe(84)
    expect(r.explain.collectedCents).toBe(8400)
  })

  it('overdue ageing buckets are fixed and disjoint', () => {
    const buckets = overdueAgeing([
      { daysPastDue: 12, outstandingCents: 100 },
      { daysPastDue: 45, outstandingCents: 200 },
      { daysPastDue: 75, outstandingCents: 300 },
      { daysPastDue: 120, outstandingCents: 400 },
    ])
    expect(buckets.map((b) => b.outstandingCents)).toEqual([100, 200, 300, 400])
    expect(buckets.reduce((s, b) => s + b.invoiceCount, 0)).toBe(4)
  })
})

describe('suppression — privacy fixtures', () => {
  it('hides groups below 5 and merges them into an “other” cell with the same n', () => {
    const result = suppressCells([
      { key: 'a', label: 'A', n: 3, value: 50, numerator: 1.5 },
      { key: 'b', label: 'B', n: 6, value: 80, numerator: 4.8 },
      { key: 'c', label: 'C', n: 2, value: 20, numerator: 0.4 },
      { key: 'd', label: 'D', n: 12, value: 90, numerator: 10.8 },
    ], 5)
    expect(result.hiddenGroups).toBe(2)
    expect(result.suppressedCells).toBe(true)
    expect(result.cells).toHaveLength(3)
    const other = result.cells.find((c) => c.suppressed)!
    expect(other.n).toBe(5)
    expect(other.value).toBeCloseTo((1.5 + 0.4) / 5, 10)
  })

  it('drops the merged cell entirely when the union is still below threshold', () => {
    const result = suppressCells([
      { key: 'a', label: 'A', n: 2, value: 10 },
      { key: 'b', label: 'B', n: 1, value: 20 },
    ], 5)
    expect(result.cells).toHaveLength(0)
    expect(result.hiddenGroups).toBe(2)
  })

  it('blocks a filtered query targeting a group below threshold (differencing guard)', () => {
    expect(guardFilteredGroupSize(3, 5).allowed).toBe(false)
    expect(guardFilteredGroupSize(5, 5).allowed).toBe(true)
  })
})

describe('trends and forecasts — golden fixtures', () => {
  it('trailing moving average window 3', () => {
    expect(movingAverage([1, 2, 3, 4, 5], 3)).toEqual([undefined, undefined, 2, 3, 4])
  })

  it('seasonal naive repeats the value from the previous season', () => {
    expect(seasonalNaive([10, 20, 30, 40, 50, 60], 3, 2)).toEqual([40, 50])
  })

  it('simple exponential smoothing with alpha 0.5 on [10,20] = 15', () => {
    expect(exponentialSmoothing([10, 20], 0.5, 3)).toEqual([15, 15, 15])
  })

  it('backtest of a perfect forecaster has zero error', () => {
    const bt = backtest([1, 2, 3, 4], (train) => [train[train.length - 1] + 1], 1)
    expect(bt.mae).toBeCloseTo(0, 10)
    expect(bt.mape).toBeCloseTo(0, 10)
  })
})

describe('insight engine — rule fixtures', () => {
  it('fires on a sudden attendance drop with adequate n', () => {
    const insight = suddenAttendanceDrop(88, 94, 1, 100, { classId: 'c-cp' })
    expect(insight).not.toBeNull()
    expect(insight!.severity).toBe('warning')
    expect(insight!.metricIds).toContain('attendance.rate')
  })

  it('does not fire with a small sample', () => {
    expect(suddenAttendanceDrop(80, 94, 1, 10)).toBeNull()
  })

  it('fires on a planted Monday cluster', () => {
    const insight = weekdayCluster(4.5, 'lundi', 8)
    expect(insight).not.toBeNull()
    expect(insight!.title.fr).toContain('lundi')
  })
})
