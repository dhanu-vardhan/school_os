/**
 * Presentation helpers shared by metric cards, chart tooltips and exports.
 * Formatting is deterministic and locale-aware; it never changes the underlying
 * aggregate value or the suppression decision.
 */
import type { MetricUnit } from '@schoolos/shared'

export function pickLocalized(value: { fr: string; en: string }, lang?: string): string {
  return lang?.toLowerCase().startsWith('fr') ? value.fr : value.en
}

/** Compact, honest formatting: suppressed/low-sample values never gain false precision. */
export function formatMetricValue(value: number, unit: MetricUnit = 'percent', lang = 'fr'): string {
  if (!Number.isFinite(value)) return '—'
  const locale = lang.toLowerCase().startsWith('fr') ? 'fr-FR' : 'en-GB'
  switch (unit) {
    case 'percent':
      return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value / 100)
    case 'ratio':
      return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value)
    case 'money':
      return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
    case 'minutes':
      return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} min`
    case 'hours':
      return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} h`
    case 'days':
      return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} j`
    case 'count':
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
    case 'correlation':
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(value)
    default:
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)
  }
}

/** Confidence interval wording for tooltips and the table alternative. */
export function formatInterval(lower: number, upper: number, unit: MetricUnit = 'percent', lang = 'fr'): string {
  return `${formatMetricValue(lower, unit, lang)} – ${formatMetricValue(upper, unit, lang)}`
}
