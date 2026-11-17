/**
 * Small-cell suppression and re-identification guards.
 *
 * Applied to the response *after* filtering, so a filtered view can never reveal a
 * group that the unfiltered view suppressed (differencing). Threshold defaults to 5
 * and is tenant-configurable by head/admin only (see METRIC_PARAMETERS).
 */

export interface SuppressibleCell {
  key: string
  label: string
  n: number
  /** Rate/mean value, if the cell carries one. */
  value?: number
  /** Numerator used to recompute a merged rate (e.g. present half-days). */
  numerator?: number
  suppressed?: boolean
}

export interface SuppressionResult<T extends SuppressibleCell> {
  /** Suppressed cells always carry the suppression flag, even when the input type omitted it. */
  cells: (T & SuppressibleCell)[]
  /** Groups hidden or merged into “other”. */
  suppressedCells: boolean
  /** Count of original groups that were below threshold. */
  hiddenGroups: number
}

/** A group is displayable only when it meets the configured floor. */
export function isDisplayable(n: number, threshold: number): boolean {
  return n >= threshold
}

/** Cheap boolean used by UI to render a low-sample badge rather than a confident number. */
export function isLowSample(n: number, metricMin: number): boolean {
  return n < metricMin
}

/**
 * Suppress small cells and merge them into a single “other” cell.
 * The merged cell recomputes its value from summed numerators when available,
 * otherwise as an n-weighted mean. If the merged group is still below threshold,
 * it is dropped entirely and flagged.
 */
export function suppressCells<T extends SuppressibleCell>(
  cells: readonly T[],
  threshold: number,
  otherLabel = 'Autres / Other',
): SuppressionResult<T> {
  const kept: (T & SuppressibleCell)[] = []
  const hidden: (T & SuppressibleCell)[] = []
  for (const cell of cells) {
    if (isDisplayable(cell.n, threshold)) kept.push({ ...cell })
    else hidden.push({ ...cell })
  }
  if (hidden.length === 0) return { cells: kept, suppressedCells: false, hiddenGroups: 0 }

  const mergedN = hidden.reduce((sum, c) => sum + c.n, 0)
  if (isDisplayable(mergedN, threshold)) {
    const allHaveNumerators = hidden.every((c) => typeof c.numerator === 'number')
    const numerator = allHaveNumerators
      ? hidden.reduce((sum, c) => sum + (c.numerator as number), 0)
      : undefined
    const value = numerator !== undefined
      ? numerator / mergedN
      : hidden.reduce((sum, c) => sum + (c.value ?? 0) * c.n, 0) / mergedN
    const other = {
      key: '__suppressed_other__',
      label: otherLabel,
      n: mergedN,
      value,
      numerator,
      suppressed: true,
    } as T
    kept.push(other)
  }
  return { cells: kept, suppressedCells: true, hiddenGroups: hidden.length }
}

/** Heatmap/table suppression: every leaf cell is checked before rendering. */
export function suppressMatrix<T extends SuppressibleCell>(
  rows: readonly (readonly T[])[],
  threshold: number,
): SuppressionResult<T> & { rows: (T | null)[][] } {
  let anySuppressed = false
  let hidden = 0
  const out = rows.map((row) => row.map((cell) => {
    if (isDisplayable(cell.n, threshold)) return { ...cell } as T | null
    anySuppressed = true
    hidden++
    return null // UI renders a hatch pattern + “n<seuil”, never a number
  }))
  return { rows: out, suppressedCells: anySuppressed, hiddenGroups: hidden, cells: out.flat().filter((c): c is T & SuppressibleCell => c !== null) }
}

/**
 * Differencing guard: when a filter targets a subgroup smaller than the threshold,
 * refuse to emit data. Call before serialising any filtered response.
 */
export function guardFilteredGroupSize(
  estimatedGroupSize: number,
  threshold: number,
): { allowed: boolean; suppressed: boolean; reason?: string } {
  if (estimatedGroupSize < threshold) {
    return {
      allowed: false,
      suppressed: true,
      reason: `Filtered group (n=${estimatedGroupSize}) is below the suppression threshold (${threshold}).`,
    }
  }
  return { allowed: true, suppressed: false }
}

/** Clamp a configured threshold to the supported 3–20 range (safe default 5). */
export function normalizeThreshold(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 5
  return Math.max(3, Math.min(20, Math.round(value)))
}
