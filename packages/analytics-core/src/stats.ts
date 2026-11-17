/**
 * Statistical utilities for SchoolOS analytics.
 *
 * Every function here is deterministic, dependency-free and covered by golden tests
 * with hand-computed expected values (apps/web/src/test/analytics-core.test.ts).
 * No statistic may be added to the product without a METRIC_DICTIONARY.md entry.
 */

import type { ConfidenceInterval } from '@schoolos/shared'

/** Guard: never silently compute on zero-length input. */
function requireValues(values: readonly number[]): void {
  if (!values.length) throw new RangeError('analytics-core: empty sample')
}

export function mean(values: readonly number[]): number {
  requireValues(values)
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function sampleVariance(values: readonly number[]): number {
  requireValues(values)
  if (values.length < 2) return 0
  const m = mean(values)
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1)
}

/** Sample standard deviation (n−1 denominator), matching marks.std_dev. */
export function stdDev(values: readonly number[]): number {
  return Math.sqrt(sampleVariance(values))
}

export function median(values: readonly number[]): number {
  return quantile(values, 0.5)
}

/**
 * Linear-interpolated quantile (the "type 7" definition used by R/Python default).
 * `p` is in [0, 1]. Matches marks.percentile_band / marks.median.
 */
export function quantile(values: readonly number[], p: number): number {
  requireValues(values)
  if (p < 0 || p > 1) throw new RangeError('analytics-core: p must be in [0,1]')
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 1) return sorted[0]
  const h = (sorted.length - 1) * p
  const lo = Math.floor(h)
  const hi = Math.ceil(h)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo])
}

export function percentileRank(values: readonly number[], value: number): number {
  requireValues(values)
  const below = values.reduce((count, v) => count + (v < value ? 1 : v === value ? 0.5 : 0), 0)
  return below / values.length
}

/** Standard normal quantile via Acklam's rational approximation (|error| < 1.15e-9). */
export function normalQuantile(p: number): number {
  if (p <= 0 || p >= 1) throw new RangeError('analytics-core: p must be in (0,1)')
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]
  const low = 0.02425
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p > 1 - low) return -normalQuantile(1 - p)
  const q = p - 0.5
  const r = q * q
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

/** Lanczos log-gamma, used by the incomplete beta for Student-t CDF. */
function logGamma(x: number): number {
  const g = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (x < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * x)) - logGamma(1 - x)
  const z = x - 1
  let a = 0.99999999999980993
  for (let i = 0; i < g.length; i++) a += g[i] / (z + i + 1)
  const t = z + g.length - 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a)
}

/** Regularised incomplete beta I_x(a,b) via Lentz continued fraction (Numerical Recipes). */
function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  )
  const betacf = (xx: number): number => {
    const qab = a + b
    const qap = a + 1
    const qam = a - 1
    let c = 1
    let d = 1 - (qab * xx) / qap
    if (Math.abs(d) < 1e-30) d = 1e-30
    d = 1 / d
    let h = d
    for (let m = 1; m <= 200; m++) {
      const m2 = 2 * m
      let aa = (m * (b - m) * xx) / ((qam + m2) * (a + m2))
      d = 1 + aa * d
      if (Math.abs(d) < 1e-30) d = 1e-30
      c = 1 + aa / c
      if (Math.abs(c) < 1e-30) c = 1e-30
      d = 1 / d
      h *= d * c
      aa = (-(a + m) * (qab + m) * xx) / ((a + m2) * (qap + m2))
      d = 1 + aa * d
      if (Math.abs(d) < 1e-30) d = 1e-30
      c = 1 + aa / c
      if (Math.abs(c) < 1e-30) c = 1e-30
      d = 1 / d
      const del = d * c
      h *= del
      if (Math.abs(del - 1) < 3e-12) break
    }
    return h
  }
  if (x < (a + 1) / (a + b + 2)) return (front * betacf(x)) / a
  return 1 - (front * betacf(1 - x)) / b
}

/** Two-sided Student-t CDF for degrees of freedom df. */
export function studentTCdf(t: number, df: number): number {
  if (df <= 0) throw new RangeError('analytics-core: df must be positive')
  const x = df / (df + t * t)
  const tail = 0.5 * regularizedIncompleteBeta(x, df / 2, 0.5)
  return t >= 0 ? 1 - tail : tail
}

/** Student-t critical value for a two-sided confidence level, by bisection. */
export function tCritical(df: number, confidence = 0.95): number {
  if (df <= 0) throw new RangeError('analytics-core: df must be positive')
  const target = 1 - (1 - confidence) / 2
  let lo = 0
  let hi = 100
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    if (studentTCdf(mid, df) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** Wilson score interval for a proportion — used by every rate metric. */
export function wilsonInterval(successes: number, trials: number, confidence = 0.95): ConfidenceInterval {
  if (trials <= 0) return { lower: 0, upper: 0, method: 'none', confidence }
  const z = normalQuantile(1 - (1 - confidence) / 2)
  const phat = successes / trials
  const z2 = z * z
  const denom = 1 + z2 / trials
  const centre = (phat + z2 / (2 * trials)) / denom
  const half = (z * Math.sqrt((phat * (1 - phat)) / trials + z2 / (4 * trials * trials))) / denom
  return {
    lower: clamp01(centre - half),
    upper: clamp01(centre + half),
    method: confidence === 0.95 ? 'wilson-95' : 'wilson-95',
    confidence,
  }
}

/** t-based confidence interval for a mean. */
export function tMeanInterval(values: readonly number[], confidence = 0.95): ConfidenceInterval {
  requireValues(values)
  if (values.length < 2) return { lower: values[0], upper: values[0], method: 'none', confidence }
  const m = mean(values)
  const se = stdDev(values) / Math.sqrt(values.length)
  const t = tCritical(values.length - 1, confidence)
  return {
    lower: m - t * se,
    upper: m + t * se,
    method: confidence === 0.95 ? 't-95' : 't-95',
    confidence,
  }
}

/** Deterministic PRNG (mulberry32) so bootstrap fixtures are reproducible. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Percentile bootstrap CI for a mean; deterministic when `seed` is supplied. */
export function bootstrapMeanInterval(
  values: readonly number[],
  confidence = 0.95,
  resamples = 2000,
  seed = 42,
): ConfidenceInterval {
  requireValues(values)
  if (values.length < 2) return { lower: values[0], upper: values[0], method: 'none', confidence }
  const rand = seededRandom(seed)
  const means = new Array<number>(resamples)
  for (let b = 0; b < resamples; b++) {
    let sum = 0
    for (let i = 0; i < values.length; i++) sum += values[Math.floor(rand() * values.length)]
    means[b] = sum / values.length
  }
  const alpha = (1 - confidence) / 2
  return {
    lower: quantile(means, alpha),
    upper: quantile(means, 1 - alpha),
    method: 'bootstrap-95',
    confidence,
  }
}

/** Choose a mean CI method: t for n≥30, bootstrap otherwise (simple, explainable). */
export function meanInterval(values: readonly number[], confidence = 0.95): ConfidenceInterval {
  return values.length >= 30
    ? tMeanInterval(values, confidence)
    : bootstrapMeanInterval(values, confidence)
}

export interface Regression {
  slope: number
  intercept: number
  r: number
  r2: number
  n: number
}

/** Ordinary least squares with effect size (Pearson r). Used by value-added and trendlines. */
export function linearRegression(xs: readonly number[], ys: readonly number[]): Regression {
  requireValues(xs)
  if (xs.length !== ys.length) throw new RangeError('analytics-core: xs/ys length mismatch')
  const n = xs.length
  if (n < 2) return { slope: 0, intercept: mean(ys), r: 0, r2: 0, n }
  const mx = mean(xs)
  const my = mean(ys)
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    const dy = ys[i] - my
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  }
  const slope = sxx === 0 ? 0 : sxy / sxx
  const r = sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy)
  return { slope, intercept: my - slope * mx, r, r2: r * r, n }
}

/** Point-biserial correlation (item discrimination), identical to Pearson with a 0/1 variable. */
export function pointBiserial(binary: readonly number[], continuous: readonly number[]): number {
  return linearRegression(binary, continuous).r
}

/** Cohen's d with pooled standard deviation (effect size for correlation views). */
export function cohensD(a: readonly number[], b: readonly number[]): number {
  if (a.length < 2 || b.length < 2) return 0
  const va = sampleVariance(a)
  const vb = sampleVariance(b)
  const pooled = Math.sqrt(((a.length - 1) * va + (b.length - 1) * vb) / (a.length + b.length - 2))
  return pooled === 0 ? 0 : (mean(a) - mean(b)) / pooled
}

/** Map a raw value into a 0–100 percentage for display, clamped. */
export function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return clamp01(numerator / denominator) * 100
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}
