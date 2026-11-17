/**
 * Explainable forecasting baselines for finance/attendance planning.
 *
 * No black boxes: seasonal naive and exponential smoothing only, always with a
 * backtest accuracy figure and prediction intervals. A forecast is an estimate,
 * never a fact and never an automated decision. Model id/version is supplied by
 * the caller for the model registry (docs/MODEL_REGISTRY.md).
 */

import { mean, normalQuantile, stdDev } from './stats'

export interface ForecastPoint {
  horizon: number
  point: number
  lower80: number
  upper80: number
  lower95: number
  upper95: number
}

export interface ForecastResult {
  modelId: string
  modelVersion: string
  method: 'seasonal-naive' | 'exponential-smoothing' | 'holt-linear'
  points: ForecastPoint[]
  backtest: { mape: number; mae: number; horizons: number }
  residualSd: number
  warning: string
}

const WARNING_FR = 'La prévision est une estimation, pas un fait.'
const WARNING_EN = 'Forecast is an estimate, not a fact.'

/** Seasonal naive: next value = value from the same position in the previous season. */
export function seasonalNaive(series: readonly number[], seasonLength: number, horizon: number): number[] {
  if (seasonLength < 1) throw new RangeError('analytics-core: seasonLength must be ≥ 1')
  if (!series.length) return new Array(horizon).fill(0)
  return Array.from({ length: horizon }, (_, i) => {
    const idx = series.length - seasonLength + (i % seasonLength)
    return series[idx >= 0 && idx < series.length ? idx : idx % series.length]
  })
}

/** Simple exponential smoothing (level only). */
export function exponentialSmoothing(series: readonly number[], alpha: number, horizon: number): number[] {
  if (!series.length) return new Array(horizon).fill(0)
  const a = Math.max(0, Math.min(1, alpha))
  let level = series[0]
  for (let i = 1; i < series.length; i++) level = a * series[i] + (1 - a) * level
  return new Array(horizon).fill(level)
}

/** Holt's linear method (level + trend), still explainable and damped. */
export function holtLinear(
  series: readonly number[],
  alpha: number,
  beta: number,
  horizon: number,
  phi = 0.9,
): number[] {
  if (!series.length) return new Array(horizon).fill(0)
  if (series.length === 1) return new Array(horizon).fill(series[0])
  let level = series[0]
  let trend = series[1] - series[0]
  for (let i = 1; i < series.length; i++) {
    const prevLevel = level
    level = alpha * series[i] + (1 - alpha) * (level + trend)
    trend = beta * (level - prevLevel) + (1 - beta) * trend
  }
  return Array.from({ length: horizon }, (_, i) => level + phi * (i + 1) * trend)
}

/** In-sample one-step residuals for a smoothing method, used to size intervals. */
function residuals(series: readonly number[], alpha: number): number[] {
  if (series.length < 2) return []
  let level = series[0]
  const out: number[] = []
  for (let i = 1; i < series.length; i++) {
    const prediction = level
    out.push(series[i] - prediction)
    level = alpha * series[i] + (1 - alpha) * level
  }
  return out
}

export interface BacktestResult {
  mape: number
  mae: number
  horizons: number
}

/** Hold out the last `horizon` points and score the method (MAPE + MAE). */
export function backtest(
  series: readonly number[],
  method: (train: readonly number[], horizon: number) => number[],
  horizon: number,
): BacktestResult {
  if (series.length <= horizon) return { mape: Number.NaN, mae: Number.NaN, horizons: 0 }
  const train = series.slice(0, -horizon)
  const actual = series.slice(-horizon)
  const predicted = method(train, horizon)
  const errors = actual.map((v, i) => v - predicted[i])
  const mae = mean(errors.map(Math.abs))
  const nonZero = actual.filter((v) => v !== 0).length
  const mape = nonZero
    ? mean(errors.map((e, i) => actual[i] === 0 ? 0 : Math.abs(e / actual[i]))) * 100
    : Number.NaN
  return { mape, mae, horizons: horizon }
}

/** Build prediction intervals from residual dispersion (normal approximation). */
export function predictionIntervals(
  points: readonly number[],
  residualSd: number,
): ForecastPoint[] {
  const z80 = normalQuantile(0.9)
  const z95 = normalQuantile(0.975)
  return points.map((point, i) => {
    const sd = residualSd * Math.sqrt(1 + i * 0.25)
    return {
      horizon: i + 1,
      point,
      lower80: point - z80 * sd,
      upper80: point + z80 * sd,
      lower95: point - z95 * sd,
      upper95: point + z95 * sd,
    }
  })
}

/** Convenience: full forecast envelope with model metadata for the registry. */
export function buildForecast(
  series: readonly number[],
  options: {
    horizon: number
    method?: 'seasonal-naive' | 'exponential-smoothing' | 'holt-linear'
    seasonLength?: number
    alpha?: number
    beta?: number
    modelId?: string
    modelVersion?: string
  },
): ForecastResult {
  const method = options.method ?? 'seasonal-naive'
  const alpha = options.alpha ?? 0.3
  const beta = options.beta ?? 0.1
  const seasonLength = options.seasonLength ?? 12
  const forecaster = (train: readonly number[], h: number): number[] => {
    if (method === 'seasonal-naive') return seasonalNaive(train, seasonLength, h)
    if (method === 'holt-linear') return holtLinear(train, alpha, beta, h)
    return exponentialSmoothing(train, alpha, h)
  }
  const points = forecaster(series, options.horizon)
  const res = residuals(series, alpha)
  const residualSd = res.length > 1 ? stdDev(res) : 0
  return {
    modelId: options.modelId ?? `analytics.forecast.${method}`,
    modelVersion: options.modelVersion ?? '1.0.0',
    method,
    points: predictionIntervals(points, residualSd),
    backtest: backtest(series, forecaster, Math.min(options.horizon, 4)),
    residualSd,
    warning: `${WARNING_FR} ${WARNING_EN}`,
  }
}
