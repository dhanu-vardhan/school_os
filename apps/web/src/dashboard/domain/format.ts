const eur = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** All monetary values are integer cents (AGENTS.md). */
export function formatMoney(cents: number): string {
  return eur.format(cents / 100)
}

export function formatCompact(cents: number): string {
  if (Math.abs(cents) >= 100_000_00) return `${(cents / 100_000_00).toFixed(1).replace('.', ',')} M€`
  if (Math.abs(cents) >= 100_00) return `${Math.round(cents / 100_00)} k€`
  return formatMoney(cents)
}

export function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1).replace('.', ',')} %`
}
