/**
 * Shared metric contract types (analytics Phase 1).
 *
 * These types are the compile-time mirror of docs/METRIC_DICTIONARY.md. Every metric
 * rendered anywhere in the product must have a MetricDefinition here and an entry in
 * the dictionary. UI explain panels read straight from these objects so definitions
 * cannot drift between screens.
 */

export type MetricId = string

export type MetricDomain =
  | 'attendance'
  | 'marks'
  | 'assessment'
  | 'engagement'
  | 'combined'
  | 'finance'
  | 'ops'
  | 'dq'

export type MetricUnit =
  | 'ratio'
  | 'percent'
  | 'points'
  | 'minutes'
  | 'hours'
  | 'days'
  | 'count'
  | 'money'
  | 'boolean'
  | 'correlation'
  | 'index'

export type GoodDirection = 'up' | 'down' | 'neutral'

/** Role keys from packages/shared/src/access/roles.ts. */
export type MetricRole =
  | 'director'
  | 'school_admin'
  | 'group_admin'
  | 'deputy'
  | 'teacher'
  | 'parent'
  | 'student'
  | 'finance'
  | 'analyst'
  | 'auditor'
  | 'hr'
  | 'itadmin'
  | 'librarian'
  | 'reception'

export interface LocalizedText {
  fr: string
  en: string
}

export interface MetricDefinition {
  /** Stable id, e.g. `attendance.rate`. Never rename; create a v2 id instead. */
  id: MetricId
  version: string
  domain: MetricDomain
  name: LocalizedText
  /** Plain-language definition, reading level ≈ 12 years for parent/student copy. */
  definition: LocalizedText
  /** Testable formula in the notation of METRIC_DICTIONARY.md. */
  formula: string
  grain: string
  unit: MetricUnit
  good: GoodDirection
  /** Minimum sample for a stable point estimate; below this show lowSample badge. */
  nMin: number
  /** Roles allowed to see this metric. Deny by default. */
  roles: MetricRole[]
  /** Mandatory caveats attached to every rendered value. */
  caveats: LocalizedText[]
  /** Tenant-configurable parameter keys that affect this metric. */
  params?: string[]
  /** True when the metric is not available because upstream data is absent (e.g. ops.cost_per_student). */
  unavailableInDemo?: boolean
  /** True when a profiling-style DPO/legal review is required before real data. */
  requiresDpoReview?: boolean
}

export interface MetricParameterDefinition {
  key: string
  name: LocalizedText
  description: LocalizedText
  defaultValue: number | boolean
  min?: number
  max?: number
  step?: number
  /** Roles permitted to change the parameter (head/admin only for thresholds). */
  editableBy: MetricRole[]
}

/** Confidence interval attached to any aggregate response. */
export interface ConfidenceInterval {
  lower: number
  upper: number
  /** e.g. `wilson-95`, `t-95`, `bootstrap-95`, `none`. */
  method: 'wilson-95' | 't-95' | 'bootstrap-95' | 'none'
  confidence?: number
}

/** Every aggregate response carries this meta block. */
export interface AnalyticsMeta {
  metricIds: MetricId[]
  /** Sample size behind the value; always present. */
  n: number
  /** Denominator description for the explain panel. */
  denominator?: string
  ci?: ConfidenceInterval
  /** True when one or more groups were hidden because n < suppression threshold. */
  suppressedCells: boolean
  /** Threshold applied for this response. */
  suppressionThreshold: number
  /** Low-sample badge instead of a confident-looking number. */
  lowSample: boolean
  /** UTC ISO timestamp of the last aggregate refresh. */
  dataAsOf: string
  /** True when upstream data is absent and the response comes from the flagged demo adapter. */
  mock?: boolean
  /** Inputs behind the value, shown by “Explain this chart”. Never contains direct identifiers. */
  explain?: Record<string, string | number | boolean | null>
  /** Association metrics must carry this. */
  associationNotCausation?: boolean
}

export interface AnalyticsResponse<T> {
  data: T
  meta: AnalyticsMeta
}

export interface DataPoint {
  label: string
  value: number
  n: number
  ci?: ConfidenceInterval
  suppressed?: boolean
  /** Optional drill-down key (class id, subject code) — never a direct identifier in aggregate responses. */
  key?: string
}

export interface TimePoint extends DataPoint {
  date: string
}

export interface AnalyticsFilters {
  from?: string
  to?: string
  term?: string
  year?: string
  classId?: string
  level?: string
  subject?: string
  cohort?: string
  comparisonBasis?: 'previous_period' | 'previous_term' | 'previous_year' | 'benchmark'
  grain?: 'day' | 'week' | 'month' | 'term' | 'year'
  [key: string]: string | undefined
}

export interface Paginated<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}
