import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, CardBody, StatusPill } from '@schoolos/ui'
import { usePreferences } from '../app/preferences'
import { PageHeader } from '../components/Screen'

const PRIMITIVE_SCALES = ['brand', 'accent', 'warning', 'danger', 'info', 'neutral'] as const
const PRIMITIVE_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

const SEMANTIC_TOKENS = [
  '--app-bg', '--surface', '--surface-2', '--surface-3', '--border', '--border-strong',
  '--control-border', '--text', '--text-muted', '--text-subtle', '--sidebar', '--grid-line',
] as const

const COMPONENT_TOKENS = [
  '--action-primary-bg', '--action-primary-fg', '--action-secondary-bg', '--action-secondary-fg',
  '--action-danger-bg', '--action-danger-fg', '--action-success-bg', '--action-success-fg',
  '--action-ai-bg', '--action-ai-fg', '--status-brand-bg', '--status-success-bg',
  '--status-warning-bg', '--status-danger-bg', '--status-info-bg', '--chart-line',
  '--chart-grid', '--focus-color',
] as const

const PAIRS: { label: string; fg: string; bg: string; min: number }[] = [
  { label: 'Body text', fg: '--text', bg: '--app-bg', min: 4.5 },
  { label: 'Muted text', fg: '--text-muted', bg: '--surface', min: 4.5 },
  { label: 'Subtle text', fg: '--text-subtle', bg: '--surface', min: 4.5 },
  { label: 'Primary action', fg: '--action-primary-fg', bg: '--action-primary-bg', min: 4.5 },
  { label: 'Secondary action', fg: '--action-secondary-fg', bg: '--action-secondary-bg', min: 4.5 },
  { label: 'Danger action', fg: '--action-danger-fg', bg: '--action-danger-bg', min: 4.5 },
  { label: 'AI action', fg: '--action-ai-fg', bg: '--action-ai-bg', min: 4.5 },
  { label: 'Status: brand', fg: '--status-brand-fg', bg: '--surface', min: 4.5 },
  { label: 'Status: success', fg: '--status-success-fg', bg: '--surface', min: 4.5 },
  { label: 'Status: warning', fg: '--status-warning-fg', bg: '--surface', min: 4.5 },
  { label: 'Status: danger', fg: '--status-danger-fg', bg: '--surface', min: 4.5 },
  { label: 'Status: info', fg: '--status-info-fg', bg: '--surface', min: 4.5 },
  { label: 'Control boundary', fg: '--control-border', bg: '--surface', min: 3 },
]

function tokenValue(name: string, style: CSSStyleDeclaration, seen = new Set<string>()): string {
  if (seen.has(name)) return ''
  seen.add(name)
  const raw = style.getPropertyValue(name).trim()
  const alias = raw.match(/^var\((--[\w-]+)\)$/)
  return alias ? tokenValue(alias[1], style, seen) : raw
}

function channels(value: string): number[] | null {
  const match = value.match(/^(\d+)\s+(\d+)\s+(\d+)/)
  return match ? match.slice(1).map(Number) : null
}

function luminance(rgb: number[]): number {
  const [r, g, b] = rgb.map(value => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: number[], b: number[]): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

function swatch(token: string, label: string, style?: CSSProperties) {
  return (
    <div key={token} className="min-w-0">
      <div
        className="h-10 w-full rounded-md border border-line"
        style={{ backgroundColor: `rgb(var(${token}))`, ...style }}
        aria-hidden
      />
      <p className="mt-1 truncate font-mono text-[10px] text-content-subtle" title={token}>{label}</p>
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="font-display text-lg font-semibold text-content">{title}</h2>
      {description && <p className="mb-3 text-sm text-content-muted">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

export function UiKitColorsPage() {
  const { t } = useTranslation()
  const preferences = usePreferences()
  const [monochrome, setMonochrome] = useState(false)
  const [refresh, setRefresh] = useState(0)

  // The provider applies theme classes in an effect; recompute after that paint.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRefresh(value => value + 1))
    return () => cancelAnimationFrame(frame)
  }, [preferences.theme, preferences.highContrast])

  const ratios = useMemo(() => {
    const style = getComputedStyle(document.documentElement)
    void refresh
    return PAIRS.map(pair => {
      const foreground = channels(tokenValue(pair.fg, style))
      const background = channels(tokenValue(pair.bg, style))
      const value = foreground && background ? contrast(foreground, background) : 0
      return { ...pair, value, ok: value >= pair.min }
    })
  }, [refresh])

  const previewStyle = monochrome ? { filter: 'grayscale(1)' } : undefined

  return (
    <div className="ui-page">
      <PageHeader
        title={t('uikit.colors')}
        subtitle={t('uikit.colorsHint')}
        actions={
          <>
            <Button variant="outline" size="sm" aria-pressed={preferences.theme === 'dark'} onClick={() => preferences.setTheme(preferences.theme === 'dark' ? 'light' : 'dark')}>
              {t('uikit.toggleDark')}
            </Button>
            <Button variant="outline" size="sm" aria-pressed={preferences.highContrast} onClick={() => preferences.setHighContrast(!preferences.highContrast)}>
              {t('uikit.toggleContrast')}
            </Button>
            <Button variant="outline" size="sm" aria-pressed={monochrome} onClick={() => setMonochrome(!monochrome)}>
              {t('uikit.monochrome')}
            </Button>
          </>
        }
      />

      <Section title={t('uikit.primitives')}>
        <Card><CardBody className="space-y-4">
          {PRIMITIVE_SCALES.map(scale => (
            <div key={scale}>
              <p className="mb-1 font-mono text-xs text-content-muted">--{scale}-*</p>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
                {PRIMITIVE_STOPS.map(stop => swatch(`--${scale}-${stop}`, String(stop)))}
              </div>
            </div>
          ))}
          <div>
            <p className="mb-1 font-mono text-xs text-content-muted">--neutral-0</p>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">{swatch('--neutral-0', '0')}</div>
          </div>
        </CardBody></Card>
      </Section>

      <Section title={t('uikit.semantic')}>
        <Card><CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {SEMANTIC_TOKENS.map(token => swatch(token, token))}
        </CardBody></Card>
      </Section>

      <Section title={t('uikit.componentTokens')}>
        <Card><CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {COMPONENT_TOKENS.map(token => swatch(token, token))}
        </CardBody></Card>
      </Section>

      <Section title={t('uikit.contrast')}>
        <Card><CardBody className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="text-xs uppercase text-content-subtle"><tr><th className="py-2">Pair</th><th>Ratio</th><th>Target</th><th>Result</th></tr></thead>
            <tbody>
              {ratios.map(pair => (
                <tr key={pair.label} className="border-t border-line">
                  <td className="py-2 text-content">{pair.label}</td>
                  <td className="tnum text-content-muted">{pair.value.toFixed(2)}:1</td>
                  <td className="tnum text-content-muted">{pair.min}:1</td>
                  <td><Badge tone={pair.ok ? 'success' : 'danger'}>{pair.ok ? 'AA' : 'FAIL'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody></Card>
      </Section>

      <Section title={t('uikit.statusMatrix')}>
        <Card><CardBody className="flex flex-wrap items-center gap-3" style={previewStyle}>
          <StatusPill status="open" /><StatusPill status="under_review" /><StatusPill status="closed" />
          <StatusPill status="proposed" /><StatusPill status="approved" /><StatusPill status="rejected" />
          <StatusPill status="present" /><StatusPill status="absent" /><StatusPill status="late" />
          <StatusPill status="paid" /><StatusPill status="due" /><StatusPill status="overdue" />
        </CardBody></Card>
      </Section>
    </div>
  )
}
