/** Trend and comparison helpers. Simple, explainable, seasonality-aware. */

import { mean, stdDev } from './stats'

/** Trailing moving average; first (window−1) entries are undefined by design. */
export function movingAverage(values: readonly number[], window = 3): (number | undefined)[] {
  if (window < 1) throw new RangeError('analytics-core: window must be ≥ 1')
  return values.map((_, i) => {
    if (i < window - 1) return undefined
    let sum = 0
    for (let j = i - window + 1; j <= i; j++) sum += values[j]
    return sum / window
  })
}

export interface Comparison {
  current: number
  previous: number
  change: number
  changePercent: number
  /** Wording safe to show next to a delta, honouring statistical vs practical significance. */
  wording: 'increased' | 'decreased' | 'stable'
  detail: string
}

/**
 * Compare like with like. `ciHalfWidth` is the half-width of the CI of the difference;
 * when the interval crosses zero we say "within normal variation" rather than claiming a trend.
 */
export function seasonalityAwareComparison(
  current: number,
  previous: number,
  ciHalfWidth = 0,
  goodDirection: 'up' | 'down' | 'neutral' = 'up',
): Comparison {
  const change = current - previous
  const changePercent = previous === 0 ? 0 : (change / Math.abs(previous)) * 100
  const significant = Math.abs(change) > ciHalfWidth
  const wording = !significant ? 'stable' : change > 0 ? 'increased' : 'decreased'
  const direction = goodDirection === 'up'
    ? (change > 0 ? 'favourable' : 'unfavourable')
    : goodDirection === 'down'
      ? (change < 0 ? 'favourable' : 'unfavourable')
      : 'neutral'
  const detail = significant
    ? `Changed by ${Math.abs(change).toFixed(1)} pts (${direction}).`
    : `Changed by ${Math.abs(change).toFixed(1)} pts, within normal variation.`
  return { current, previous, change, changePercent, wording, detail }
}

/** Largest absolute step between consecutive smoothed values, with its index. */
export function changePoint(values: readonly number[], window = 3): { index: number; magnitude: number } | null {
  const smooth = movingAverage(values, window).filter((v): v is number => v !== undefined)
  if (smooth.length < 2) return null
  let best = { index: 0, magnitude: 0 }
  for (let i = 1; i < smooth.length; i++) {
    const magnitude = Math.abs(smooth[i] - smooth[i - 1])
    if (magnitude > best.magnitude) best = { index: i, magnitude }
  }
  return best
}

/** Plain-language practical-significance sentence with CI half-width. */
export function significanceSentence(change: number, ciHalfWidth: number, unit = 'pts'): string {
  if (Math.abs(change) <= ciHalfWidth) {
    return `Changed by ${Math.abs(change).toFixed(1)} ${unit}, within normal variation.`
  }
  return `Changed by ${Math.abs(change).toFixed(1)} ${unit}, beyond normal variation.`
}

/** Coefficient of variation, useful for labelling noisy small series. */
export function coefficientOfVariation(values: readonly number[]): number {
  if (!values.length) return 0
  const m = mean(values)
  return m === 0 ? 0 : stdDev(values) / Math.abs(m)
}
