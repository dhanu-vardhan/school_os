import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge, Button, Card, CardBody, CardHeader, ChartCard, AnalyticsChart, ExplainPanel,
  FilterBar, Modal, ScenarioPanel, Select, type ScenarioControls,
} from '@schoolos/ui'
import { formatMetricValue, pickLocalized } from '@schoolos/analytics-core'
import {
  useAnalyticsDictionary, useAnalyticsExport, useAnalyticsMatrix, useAnalyticsSeries,
  useAnalyticsTable, useMetricExplain, useScenario,
} from '@schoolos/api-client'
import { useAnalyticsFilters, toAnalyticsQuery } from '../app/analytics'
import { useCan } from '../app/permissions'
import { useSession } from '../app/session'
import { ForbiddenCard, MockNotice, OfflineNotice, PageHeader, QueryState } from '../components/Screen'

/** Data Analyst workspace: governed Explore + report builder, with no direct data access. */
export function AnalyticsExplorePage() {
  const { t, i18n } = useTranslation()
  const { stepUpActive } = useSession()
  const canRead = useCan('analytics.read')
  const canExport = useCan('analytics.export')
  const lang = i18n.resolvedLanguage ?? 'fr'
  const pick = (key: string) => t(key)
  const filters = useAnalyticsFilters('explore')
  const [metricId, setMetricId] = useState('attendance.rate')
  const [dimensionA, setDimensionA] = useState('class')
  const [dimensionB, setDimensionB] = useState('weekday')
  const [explainOpen, setExplainOpen] = useState(false)
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const [scenario, setScenario] = useState<ScenarioControls>({ attendanceDelta: 0.5, homeworkDelta: 2, markDelta: 0, horizon: 3 })

  const base = useMemo(() => ({ ...toAnalyticsQuery(filters.value), metric: metricId }), [filters.value, metricId])
  const series = useAnalyticsSeries(base, canRead)
  const table = useAnalyticsTable({ ...base, page: 1, pageSize: 20 }, canRead)
  const matrix = useAnalyticsMatrix({ ...base, dimensionA, dimensionB }, canRead)
  const dictionary = useAnalyticsDictionary(canRead)
  const explain = useMetricExplain(metricId, base, canRead && explainOpen)
  const scenarioRun = useScenario()
  const exportMutation = useAnalyticsExport()

  if (!canRead) return <ForbiddenCard />

  const defs = dictionary.data?.data.definitions ?? {}
  const def = defs[metricId]
  const options = dictionary.data?.data.options
  const localized = (value: { fr: string; en: string } | undefined, fallback = '') => value ? pickLocalized(value, lang) : fallback
  const unit = def?.unit ?? 'percent'

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader
        title={pick('analytics.explore')}
        subtitle={pick('analytics.reportBuilder')}
        actions={<div className="flex flex-wrap items-center gap-2">
          <MockNotice mock={series.data?.data.meta.mock} compact />
          <Button
            variant="outline"
            disabled={!canExport || !stepUpActive}
            disabledReason={pick('analytics.exportStepUp')}
            icon={<Badge tone="info">{pick('analytics.async')}</Badge>}
            onClick={() => {
              setExportMessage(pick('analytics.exportQueued'))
              exportMutation.mutate({ metricId, format: 'csv' }, {
                onSuccess: res => setExportMessage(`${pick('analytics.exportReady')} · ${res.data.data.rows} · ${res.data.data.watermark}`),
                onError: () => setExportMessage(pick('analytics.exportFailed')),
              })
            }}
          >{pick('common.export')}</Button>
        </div>}
        breadcrumbs={[{ label: pick('nav.group.insights') }, { label: pick('analytics.explore') }]}
      />
      {exportMessage && <div className="mb-4 rounded border border-status-info-border bg-status-info-bg p-3 text-xs" role="status">{exportMessage}</div>}

      <Card className="mb-5">
        <CardBody className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-content" htmlFor="explore-metric">{pick('analytics.metric')}</label>
            <Select
              value={metricId}
              onValueChange={setMetricId}
              ariaLabel={pick('analytics.metric')}
              options={(dictionary.data?.data.metricIds ?? []).map(id => ({ value: id, label: localized(defs[id]?.name, id) }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-content">{pick('analytics.dimensionA')}</label>
            <Select value={dimensionA} onValueChange={setDimensionA} ariaLabel={pick('analytics.dimensionA')}
              options={[{ value: 'class', label: pick('analytics.class') }, { value: 'level', label: pick('analytics.level') }]} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-content">{pick('analytics.dimensionB')}</label>
            <Select value={dimensionB} onValueChange={setDimensionB} ariaLabel={pick('analytics.dimensionB')}
              options={[{ value: 'weekday', label: pick('analytics.weekday') }, { value: 'subject', label: pick('analytics.subject') }]} />
          </div>
        </CardBody>
      </Card>

      <FilterBar
        value={filters.value}
        onChange={filters.update}
        onReset={filters.reset}
        onSave={filters.saveView}
        savedViews={filters.views}
        onLoadView={filters.loadView}
        labels={{
          all: pick('common.all'), year: pick('analytics.year'), term: pick('analytics.term'),
          class: pick('analytics.class'), level: pick('analytics.level'), subject: pick('analytics.subject'),
          grain: pick('analytics.grain'), from: pick('analytics.from'), to: pick('analytics.to'),
          saveView: pick('analytics.saveView'), viewName: pick('analytics.viewName'),
          savedViews: pick('analytics.savedViews'), reset: pick('analytics.reset'), apply: pick('common.filter'),
        }}
        options={{
          years: (options?.years ?? []).map(v => ({ value: v, label: v })),
          terms: (options?.terms ?? []).map(v => ({ value: v, label: v })),
          classes: (options?.classes ?? []).map(c => ({ value: c.value, label: c.label })),
          levels: (options?.levels ?? []).map(v => ({ value: v, label: v })),
          subjects: (options?.subjects ?? []).map(v => ({ value: v, label: v })),
          grains: [
            { value: 'term', label: pick('analytics.term') },
            { value: 'month', label: pick('analytics.month') },
            { value: 'week', label: pick('analytics.week') },
            { value: 'year', label: pick('analytics.year') },
          ],
        }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          question={localized(def?.name, metricId)}
          subtitle={localized(def?.definition)}
          metaLine={`n = ${series.data?.data.meta.n ?? 0} · ${pick('analytics.sourceNote')}`}
          action={<Button size="sm" variant="ghost" onClick={() => setExplainOpen(true)}>{pick('analytics.explain')}</Button>}
        >
          <QueryState isLoading={series.isLoading} error={series.error} onRetry={() => void series.refetch()}>
            {() => <AnalyticsChart
              points={series.data?.data.data ?? []}
              valueFormatter={v => formatMetricValue(v, unit, lang)}
              ariaSummary={`${localized(def?.name, metricId)}. ${(series.data?.data.data ?? []).map(p => `${p.label}: ${formatMetricValue(p.value, unit, lang)}, n=${p.n}`).join(' ; ')}`}
              tableLabel={pick('analytics.tableAlternative')}
              emptyLabel={pick('analytics.noData')}
            />}
          </QueryState>
        </ChartCard>

        <Card>
          <CardHeader title={<span className="text-sm">{pick('analytics.tableView')}</span>}
            description={`${table.data?.data.data.total ?? 0} ${pick('analytics.rows')}`} />
          <CardBody className="overflow-x-auto">
            <QueryState isLoading={table.isLoading} error={table.error} onRetry={() => void table.refetch()}>
              {() => (
                <table className="w-full text-left text-xs">
                  <caption className="ui-sr-only">{localized(def?.name, metricId)}</caption>
                  <thead><tr className="border-b border-line text-content-subtle"><th scope="col" className="py-2">#</th><th scope="col">Valeur</th><th scope="col">n</th><th scope="col">IC</th></tr></thead>
                  <tbody>
                    {(table.data?.data.data.rows ?? []).map((row, index) => (
                      <tr key={`${row.label}-${index}`} className="border-b border-line last:border-0">
                        <th scope="row" className="py-2 font-medium text-content">{row.label}</th>
                        <td className="tnum">{formatMetricValue(row.value, unit, lang)}</td>
                        <td className="tnum">{row.n}</td>
                        <td className="tnum">{row.ci ? `${formatMetricValue(row.ci.lower, unit, lang)}–${formatMetricValue(row.ci.upper, unit, lang)}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </QueryState>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title={<span className="text-sm">{pick('analytics.matrix')}</span>}
          description={`${localized(def?.name, metricId)} · ${dimensionA} × ${dimensionB}`} />
        <CardBody className="overflow-x-auto">
          <QueryState isLoading={matrix.isLoading} error={matrix.error} onRetry={() => void matrix.refetch()}>
            {() => (
              <table className="w-full text-left text-xs">
                <caption className="ui-sr-only">{pick('analytics.matrix')}</caption>
                <thead><tr className="border-b border-line text-content-subtle"><th scope="col" className="py-2">{dimensionA}</th>{(matrix.data?.data.data.columns ?? []).map(c => <th key={c} scope="col" className="py-2">{c}</th>)}</tr></thead>
                <tbody>
                  {(matrix.data?.data.data.rows ?? []).map((row, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <th scope="row" className="py-2 font-medium">{row[0]?.label ?? '—'}</th>
                      {row.slice(1).map((cell, j) => (
                        <td key={j} className={cell ? 'tnum py-2' : 'py-2'}>
                          {cell ? (cell.suppressed ? <span className="ui-chart-suppressed inline-block rounded px-2 py-0.5">n&lt;{matrix.data?.data.meta.suppressionThreshold ?? 5}</span> : formatMetricValue(cell.value, unit, lang)) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </QueryState>
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ScenarioPanel
          value={scenario}
          onChange={patch => setScenario(current => ({ ...current, ...patch }))}
          onRun={() => scenarioRun.mutate(scenario)}
          busy={scenarioRun.isPending}
          result={scenarioRun.data?.data.data ? {
            points: scenarioRun.data.data.data.points,
            warning: localized(scenarioRun.data.data.data.warning),
            assumptions: scenarioRun.data.data.data.assumptions.map(a => localized(a)),
          } : undefined}
          labels={{
            title: pick('analytics.scenario'), attendance: pick('dash.attendanceRate'),
            homework: pick('analytics.homework'), mark: pick('analytics.marks'), horizon: pick('analytics.horizon'),
            run: pick('analytics.simulate'), warning: pick('analytics.scenarioWarning'),
          }}
        />
        <Modal open={explainOpen} onOpenChange={setExplainOpen} title={localized(def?.name, metricId)}>
          <ExplainPanel
            definition={def ? {
              name: localized(def.name), definition: localized(def.definition), formula: def.formula,
              grain: def.grain, unit: def.unit, nMin: def.nMin,
            } : undefined}
            meta={explain.data?.data.meta as never}
            caveats={(def?.caveats ?? []).map(c => localized(c))}
            labels={{
              title: pick('analytics.explain'), formula: pick('analytics.formula'), inputs: pick('analytics.inputs'),
              caveats: pick('analytics.caveats'), freshness: pick('analytics.freshness'), mock: pick('analytics.mockNotice'),
            }}
          />
        </Modal>
      </div>
    </div>
  )
}
