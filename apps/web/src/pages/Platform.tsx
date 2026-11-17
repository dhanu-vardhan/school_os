import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, Boxes, Flag, LifeBuoy, Plug, ShieldCheck } from 'lucide-react'
import { Badge, Banner, Card, CardBody, CardHeader, Progress, StatCard, Switch } from '@schoolos/ui'
import { useFeatureFlags, useIntegrations, useModels, useSystemStatus } from '@schoolos/api-client'
import { ForbiddenCard, MockNotice, OfflineNotice, PageHeader, QueryState } from '../components/Screen'
import { useCan } from '../app/permissions'

function Shell({ title, subtitle, children, mock, crumb }: { title: string; subtitle?: string; children: ReactNode; mock?: boolean; crumb: string }) {
  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title={title} subtitle={subtitle} actions={<MockNotice mock={mock} compact />} breadcrumbs={[{ label: 'Platform' }, { label: crumb }]} />
      {children}
    </div>
  )
}

export function SystemStatusPage() {
  const { t } = useTranslation()
  const can = useCan('platform.admin')
  const status = useSystemStatus(can)
  if (!can) return <ForbiddenCard />
  const operational = status.data?.data?.filter(s => s.status === 'operational').length ?? 0
  return (
    <Shell title={t('platform.status')} mock={status.data?.mock} crumb={t('nav.status')}>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('platform.operational')} value={operational} tone="accent" icon={<Activity className="h-4 w-4" />} />
        <StatCard label={t('platform.degraded')} value={status.data?.data?.filter(s => s.status === 'degraded').length ?? 0} tone="warning" />
        <StatCard label={t('platform.planned')} value={status.data?.data?.filter(s => s.status === 'planned').length ?? 0} tone="info" />
      </div>
      <QueryState isLoading={status.isLoading} error={status.error} onRetry={() => void status.refetch()}>{() => (<>
        <Card><CardBody className="space-y-3">
          {status.data!.data.map(s => (
            <div key={s.name} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4">
              <div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${s.status === 'operational' ? 'bg-accent-500' : s.status === 'degraded' ? 'bg-warning-500' : 'bg-content-subtle'}`} /><div><p className="font-medium text-content">{s.name}</p><p className="text-xs text-content-subtle">{s.latencyMs} ms</p></div></div>
              <Badge tone={s.status === 'operational' ? 'success' : s.status === 'degraded' ? 'warning' : 'neutral'}>{t(`platform.${s.status}`)}</Badge>
            </div>
          ))}
        </CardBody></Card>
      </>)}</QueryState>
    </Shell>
  )
}

export function FeatureFlagsPage() {
  const { t } = useTranslation()
  const can = useCan('platform.admin')
  const flags = useFeatureFlags(can)
  if (!can) return <ForbiddenCard />
  return (
    <Shell title={t('platform.flags')} mock={flags.data?.mock} crumb={t('nav.flags')}>
      <QueryState isLoading={flags.isLoading} error={flags.error} onRetry={() => void flags.refetch()}>{() => (<>
        <Card><CardBody className="space-y-4">
          {flags.data!.data.map(f => (
            <div key={f.key} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line p-4">
              <div><p className="font-mono text-sm font-medium text-content">{f.key}</p><p className="text-xs text-content-subtle">{f.scope} · {f.rollout}%</p></div>
              <div className="flex w-full max-w-52 items-center gap-3"><Progress value={f.rollout} /><Switch checked={f.enabled} /></div>
            </div>
          ))}
        </CardBody></Card>
      </>)}</QueryState>
    </Shell>
  )
}

export function IntegrationsPage() {
  const { t } = useTranslation()
  const can = useCan('platform.admin')
  const integrations = useIntegrations(can)
  if (!can) return <ForbiddenCard />
  return (
    <Shell title={t('platform.integrations')} mock={integrations.data?.mock} crumb={t('nav.integrations')}>
      <QueryState isLoading={integrations.isLoading} error={integrations.error} onRetry={() => void integrations.refetch()}>{() => (<>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {integrations.data!.data.map(i => (
            <Card key={i.name} className="p-5">
              <div className="flex items-center justify-between"><Plug className="h-5 w-5 text-brand-500" /><Badge tone={i.status === 'available' ? 'success' : 'neutral'}>{t(`platform.${i.status}`)}</Badge></div>
              <p className="mt-3 font-semibold text-content">{i.name}</p>
              <p className="text-xs text-content-subtle">{i.category}</p>
              <p className="mt-2 text-sm text-content-muted">{i.note}</p>
            </Card>
          ))}
        </div>
      </>)}</QueryState>
    </Shell>
  )
}

export function ModelsPage() {
  const { t } = useTranslation()
  const can = useCan('platform.admin')
  const models = useModels(can)
  if (!can) return <ForbiddenCard />
  return (
    <Shell title={t('platform.models')} mock={models.data?.mock} crumb={t('nav.models')}>
      <div className="mb-5"><Banner tone="warning" title={t('ai.forbidden')} /></div>
      <QueryState isLoading={models.isLoading} error={models.error} onRetry={() => void models.refetch()}>{() => (<>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {models.data!.data.map(m => (
            <Card key={m.id} className="p-5">
              <div className="flex items-center justify-between"><Boxes className="h-5 w-5 text-brand-500" /><Badge tone={m.approved ? 'success' : 'warning'}>{m.approved ? t('common.yes') : t('common.no')}</Badge></div>
              <p className="mt-3 font-semibold text-content">{m.task}</p>
              <p className="font-mono text-xs text-content-subtle">{m.id}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{m.languages.map(l => <Badge key={l} tone="neutral">{l.toUpperCase()}</Badge>)}<Badge tone="brand">{m.tier}</Badge></div>
            </Card>
          ))}
        </div>
      </>)}</QueryState>
    </Shell>
  )
}

export function SupportPage() {
  const { t } = useTranslation()
  return (
    <Shell title={t('platform.support')} crumb={t('nav.support')}>
      <Card><CardHeader title={t('common.help')} /><CardBody className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-line p-4"><LifeBuoy className="h-5 w-5 text-brand-500" /><span className="text-sm text-content">Guide de démarrage · Administration · Confidentialité</span></div>
        <div className="flex items-center gap-3 rounded-lg border border-line p-4"><ShieldCheck className="h-5 w-5 text-accent-600" /><span className="text-sm text-content">Signaler un problème de sécurité — équipe plateforme</span></div>
      </CardBody></Card>
    </Shell>
  )
}
