/** Property tests: aggregation invariants that must hold for any tenant data. */

import { describe, expect, it } from 'vitest'
import {
  attendanceRate,
  guardFilteredGroupSize,
  normalizeThreshold,
  passRate,
  seededRandom,
  sumCounts,
  suppressCells,
  wilsonInterval,
  type NormalisedMark,
  type SuppressibleCell,
} from '@schoolos/analytics-core'

describe('aggregation invariants', () => {
  it('sum of class counts equals the school total for many random partitions', () => {
    const rand = seededRandom(20261117)
    for (let trial = 0; trial < 50; trial++) {
      const classes = Array.from({ length: 3 + Math.floor(rand() * 8) }, () => ({
        n: 1 + Math.floor(rand() * 40),
      }))
      const schoolTotal = classes.reduce((s, c) => s + c.n, 0)
      expect(sumCounts(classes)).toBe(schoolTotal)
    }
  })

  it('Wilson CI always contains the point estimate and stays within [0,100] after scaling', () => {
    const rand = seededRandom(42)
    for (let trial = 0; trial < 100; trial++) {
      const trialsN = 1 + Math.floor(rand() * 500)
      const successes = Math.floor(rand() * (trialsN + 1))
      const ci = wilsonInterval(successes, trialsN)
      const point = successes / trialsN
      expect(ci.lower).toBeGreaterThanOrEqual(0)
      expect(ci.upper).toBeLessThanOrEqual(1)
      expect(ci.lower).toBeLessThanOrEqual(point + 1e-9)
      expect(ci.upper).toBeGreaterThanOrEqual(point - 1e-9)
    }
  })

  it('attendance and pass rates are bounded to 0–100 for arbitrary inputs', () => {
    const rand = seededRandom(7)
    for (let trial = 0; trial < 100; trial++) {
      const expected = 1 + Math.floor(rand() * 200)
      const present = Math.floor(rand() * (expected + 1))
      expect(attendanceRate(present, expected).value).toBeGreaterThanOrEqual(0)
      expect(attendanceRate(present, expected).value).toBeLessThanOrEqual(100)
      const marks: NormalisedMark[] = Array.from({ length: 1 + Math.floor(rand() * 20) }, () => ({
        value: rand() * 20, scaleMax: 20, coefficient: 1,
      }))
      expect(passRate(marks, 10).value).toBeGreaterThanOrEqual(0)
      expect(passRate(marks, 10).value).toBeLessThanOrEqual(100)
    }
  })

  it('suppression never emits an original group below the threshold', () => {
    const rand = seededRandom(99)
    const threshold = 5
    for (let trial = 0; trial < 50; trial++) {
      const cells: SuppressibleCell[] = Array.from({ length: 10 }, (_, i) => ({
        key: `group-${i}`,
        label: `Group ${i}`,
        n: 1 + Math.floor(rand() * 12),
        value: rand() * 100,
      }))
      const before = new Map(cells.map((c) => [c.key, c.n]))
      const result = suppressCells(cells, threshold)
      for (const cell of result.cells) {
        if (cell.key === '__suppressed_other__') continue
        expect(before.get(cell.key)).toBeGreaterThanOrEqual(threshold)
      }
      if (result.suppressedCells) {
        expect(cells.some((c) => c.n < threshold)).toBe(true)
      }
    }
  })

  it('a differencing attempt on any sub-threshold group is blocked', () => {
    const rand = seededRandom(123)
    const threshold = normalizeThreshold(undefined)
    for (let trial = 0; trial < 50; trial++) {
      const n = Math.floor(rand() * 10)
      const guard = guardFilteredGroupSize(n, threshold)
      expect(guard.allowed).toBe(n >= threshold)
    }
  })
})
