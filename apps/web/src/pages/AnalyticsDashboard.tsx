import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Info } from 'lucide-react'
import {
  Badge, Button, Card, CardBody, CardHeader, ChartCard, AnalyticsChart, ExplainPanel,
  FilterBar, InsightCard, MetricCard, Modal, Select,
} from '@schoolos/ui'
import { formatMetricValue, pickLocalized } from '@schoolos/analytics-core'
import {
  useAnalyticsDictionary, useAnalyticsExport, useAnalyticsInsights, useAnalyticsOverview,
  useAnalyticsTargets, useCreateIntervention, useDismissInsight, useInterventions,
  useMetricExplain, useSaveTarget, useSnoozeInsight,
} from '@schoolos/api-client'
import { useAnalyticsFilters, toAnalyticsQuery } from '../app/analytics'
import { useSession } from '../app/session'
import { useCan } from '../app/permissions'
import { ForbiddenCard, MockNotice, OfflineNotice, PageHeader, QueryState } from '../components/Screen'

const dashboardForRole = (role?: string): string => {
  switch (role) {
    case 'admin': case 'school_admin': return 'admin'
    case 'operator': case 'group_admin': return 'group'
    case 'teacher': return 'teacher'
    case 'parent': return 'parent'
    case 'student': return 'student'
    case 'finance': return 'finance'
    case 'auditor': return 'audit'
    case 'analyst': case 'data_analyst': return 'analyst'
    default: return 'principal'
  }
}

/** Role-scoped governed dashboards. All numbers come from the analytics API contract. */
export function AnalyticsDashboardPage() {
  const { t, i18n } = useTranslation()
  const { role, stepUpActive } = useSession()
  const canRead = useCan('analytics.read')
  const canConfigure = useCan('analytics.configure')
  const canExport = useCan('analytics.export')
  const lang = i18n.resolvedLanguage ?? 'fr'
  const filters = useAnalyticsFilters(`dashboard:${role ?? 'anon'}`)
  const dashboard = dashboardForRole(role)
  const query = useMemo(() => ({ ...toAnalyticsQuery(filters.value), dashboard }), [filters.value, dashboard])

  const overview = useAnalyticsOverview(query, canRead)
  const dictionary = useAnalyticsDictionary(canRead)
  const insights = useAnalyticsInsights(query, canRead)
  const targets = useAnalyticsTargets(canRead)
  const interventions = useInterventions(canRead)
  const [explainId, setExplainId] = useState<string | null>(null)
  const explain = useMetricExplain(explainId ?? '', query, Boolean(explainId))
  const [exportState, setExportState] = useState<string | null>(null)

  const dismiss = useDismissInsight()
  const snooze = useSnoozeInsight()
  const saveTarget = useSaveTarget()
  const createIntervention = useCreateIntervention()
  const exportMutation = useAnalyticsExport()

  if (!canRead) return <ForbiddenCard />

  const data = overview.data?.data.data
  const defs = dictionary.data?.data.definitions ?? {}
  const filterOptions = dictionary.data?.data.options
  const pick = (key: string) => t(key)
  const localized = (value: { fr: string; en: string } | undefined, fallback: string) => value ? pickLocalized(value, lang) : fallback

  const filterBar = (
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
        years: (filterOptions?.years ?? []).map(y => ({ value: y, label: y })),
        terms: (filterOptions?.terms ?? []).map(v => ({ value: v, label: v })),
        classes: (filterOptions?.classes ?? []).map(c => ({ value: c.value, label: c.label })),
        levels: (filterOptions?.levels ?? []).map(v => ({ value: v, label: v })),
        subjects: (filterOptions?.subjects ?? []).map(v => ({ value: v, label: v })),
        grains: [
          { value: 'term', label: pick('analytics.term') },
          { value: 'month', label: pick('analytics.month') },
          { value: 'week', label: pick('analytics.week') },
          { value: 'year', label: pick('analytics.year') },
        ],
      }}
    />
  )

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader
        title={pick('analytics.dashboard')}
        subtitle={pick('analytics.dashboardSubtitle')}
        actions={<div className="flex flex-wrap items-center gap-2">
          <MockNotice mock={overview.data?.data.meta.mock} compact />
          <Button
            variant="outline"
            disabledReason={!stepUpActive || !canExport ? pick('analytics.exportStepUp') : undefined}
            disabled={!stepUpActive || !canExport}
            icon={<Download className="h-4 w-4" aria-hidden />}
            onClick={() => {
              const id = data?.cards[0]?.metricId
              if (!id) return
              setExportState(pick('analytics.exportQueued'))
              exportMutation.mutate({ metricId: id, format: 'csv' }, {
                onSuccess: res => setExportState(`${pick('analytics.exportReady')} · ${res.data.data.rows}`),
                onError: () => setExportState(pick('analytics.exportFailed')),
              })
            }}
          >{pick('common.export')}</Button>
        </div>}
        breadcrumbs={[{ label: pick('nav.group.insights') }, { label: pick('analytics.dashboard') }]}
      />
      {data?.freshness && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-content-subtle">
          <Badge tone="info" dot>{localized(data.freshness.notes, pick('analytics.freshnessUnavailable'))}</Badge>
          <span>{pick('analytics.dataAsOf')} : {data.freshness.dataAsOf}</span>
          {data.suppressedCells && <Badge tone="warning">{pick('analytics.suppressedNotice')}</Badge>}
        </div>
      )}
      {exportState && <div className="mb-4 rounded-md border border-status-info-border bg-status-info-bg p-3 text-xs" role="status">{exportState}</div>}
      {filterBar}
      <QueryState
        isLoading={overview.isLoading} error={overview.error} onRetry={() => void overview.refetch()}
        isEmpty={!data?.cards.length}
      >
        {() => (
          <>
            <section aria-label={pick('analytics.cards')} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data!.cards.map(card => {
                const def = defs[card.metricId]
                return (
                  <MetricCard
                    key={card.metricId}
                    label={localized(def?.name, card.label)}
                    value={formatMetricValue(card.value, card.unit as import('@schoolos/shared').MetricUnit, lang)}
                    unit=""
                    n={card.n}
                    ci={card.ci}
                    change={card.change}
                    target={card.target}
                    goodDirection={def?.good ?? 'up'}
                    lowSample={card.lowSample || (def ? card.n < def.nMin : false)}
                    suppressed={card.suppressed}
                    mock={overview.data?.data.meta.mock}
                    dataAsOf={overview.data?.data.meta.dataAsOf}
                    openLabel={pick('analytics.explain')}
                    onOpen={() => setExplainId(card.metricId)}
                  />
                )
              })}
            </section>

            <section aria-label={pick('analytics.charts')} className="mt-6 grid gap-4 lg:grid-cols-2">
              {data!.series.map(series => {
                const def = defs[series.metricId]
                return (
                  <ChartCard
                    key={series.metricId}
                    question={localized(series.question, series.metricId)}
                    subtitle={localized(def?.definition, '')}
                    metaLine={`n = ${series.points.reduce((s, p) => s + p.n, 0)} · ${pick('analytics.sourceNote')}`}
                    action={<Button size="sm" variant="ghost" onClick={() => setExplainId(series.metricId)}><Info className="h-4 w-4" aria-hidden />{pick('analytics.explain')}</Button>}
                  >
                    <AnalyticsChart
                      points={series.points}
                      valueFormatter={v => formatMetricValue(v, def?.unit ?? 'percent', lang)}
                      ariaSummary={`${localized(series.question, series.metricId)}. ${series.points.map(p => `${p.label}: ${formatMetricValue(p.value, def?.unit ?? 'percent', lang)}, n=${p.n}`).join(' ; ')}`}
                      tableLabel={pick('analytics.tableAlternative')}
                      emptyLabel={pick('analytics.noData')}
                    />
                  </ChartCard>
                )
              })}
            </section>
          </>
        )}
      </QueryState>

      <section className="mt-6" aria-label={pick('analytics.insights')}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-content">{pick('analytics.insights')}</h2>
          <Select
            ariaLabel={pick('analytics.dashboard')}
            value={dashboard}
            onValueChange={() => undefined}
            options={[{ value: dashboard, label: pick('analytics.roleDashboard') }]}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(insights.data?.data.data ?? []).map(insight => (
            <InsightCard
              key={insight.id}
              severity={insight.severity}
              title={localized(insight.title, insight.id)}
              evidence={localized(insight.evidence, '')}
              action={localized(insight.suggestedAction, '')}
              why={localized(insight.why, '')}
              viewLabel={pick('analytics.viewEvidence')}
              dismissLabel={pick('analytics.dismiss')}
              snoozeLabel={pick('analytics.snooze')}
              onViewEvidence={() => setExplainId(insight.metricIds[0] ?? null)}
              onDismiss={() => dismiss.mutate(insight.dedupeKey)}
              onSnooze={() => snooze.mutate({ dedupeKey: insight.dedupeKey, days: 7 })}
            />
          ))}
        </div>
        {insights.data?.data.data.length === 0 && <p className="rounded-md bg-surface-2 p-4 text-sm text-content-muted">{pick('analytics.noInsights')}</p>}
      </section>

      {canConfigure && (
        <section className="mt-6 grid min-w-0 gap-4 lg:grid-cols-2" aria-label={pick('analytics.governance')}>
          <Card className="min-w-0">
            <CardHeader title={<span className="text-sm">{pick('analytics.targets')}</span>} />
            <CardBody className="space-y-2">
              {(targets.data?.data.data ?? []).map(target => (
                <div key={target.metricId} className="flex items-center justify-between gap-2 border-b border-line py-2 last:border-0">
                  <span className="min-w-0 flex-1 truncate text-sm text-content" title={localized(defs[target.metricId]?.name, target.metricId)}>{localized(defs[target.metricId]?.name, target.metricId)}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tnum text-sm font-semibold text-content">{target.value}</span>
                    <Button size="sm" variant="ghost" onClick={() => saveTarget.mutate({ metricId: target.metricId, value: target.value + 1 })}>+1</Button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card className="min-w-0">
            <CardHeader title={<span className="text-sm">{pick('analytics.interventions')}</span>} />
            <CardBody className="space-y-2">
              {(interventions.data?.data.data ?? []).slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2 border-b border-line py-2 last:border-0">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm text-content" title={item.metricId}>{item.metricId}</p><p className="truncate text-xs text-content-muted" title={item.note}>{item.note}</p></div>
                  <Badge tone={item.status === 'reviewed' ? 'success' : 'info'}>{item.status}</Badge>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => {
                const id = data?.cards[0]?.metricId
                if (id) createIntervention.mutate({ metricId: id, note: pick('analytics.interventionNote') })
              }}>{pick('analytics.addIntervention')}</Button>
            </CardBody>
          </Card>
        </section>
      )}

      <Modal
        open={Boolean(explainId)}
        onOpenChange={open => { if (!open) setExplainId(null) }}
        title={explainId ? localized(defs[explainId]?.name, explainId) : ''}
      >
        <ExplainPanel
          definition={explainId && defs[explainId] ? {
            name: localized(defs[explainId]!.name, ''), definition: localized(defs[explainId]!.definition, ''),
            formula: defs[explainId]!.formula, grain: defs[explainId]!.grain,
            unit: defs[explainId]!.unit, nMin: defs[explainId]!.nMin,
          } : undefined}
          meta={explain.data?.data.meta as never}
          caveats={(explainId ? defs[explainId]?.caveats ?? [] : []).map(c => localized(c, c.en))}
          labels={{
            title: pick('analytics.explain'), formula: pick('analytics.formula'), inputs: pick('analytics.inputs'),
            caveats: pick('analytics.caveats'), freshness: pick('analytics.freshness'),
            mock: pick('analytics.mockNotice'),
          }}
        />
      </Modal>
    </div>
  )
}
