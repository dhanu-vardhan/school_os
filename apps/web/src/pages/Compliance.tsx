import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Archive, FileClock, FileDown, Scale, ShieldCheck, Trash2 } from 'lucide-react'
import {
  Badge, Banner, Button, Card, CardBody, CardHeader, DataTable, FormField, Input, Select, StatusPill, Switch, toast,
} from '@schoolos/ui'
import {
  useAudit, useConsents, useCreateDataRequest, useDataRequests, useRetention,
} from '@schoolos/api-client'
import { formatDate } from '@schoolos/i18n'
import type { AuditEvent, ConsentRecord, DataExportRequest, RetentionPolicy } from '@schoolos/shared'
import type { ColumnDef } from '@tanstack/react-table'
import { MockNotice, OfflineNotice, PageHeader, QueryState } from '../components/Screen'
import { ForbiddenCard } from '../components/Screen'
import { useCan } from '../app/permissions'

export function RetentionPage() {
  const { t } = useTranslation()
  const can = useCan('compliance.read')
  const retention = useRetention(can)
  if (!can) return <ForbiddenCard />
  const columns: ColumnDef<RetentionPolicy>[] = [
    { accessorKey: 'dataType', header: t('compliance.dataType'), cell: ({ getValue }) => <span className="font-medium text-content">{getValue<string>()}</span> },
    { accessorKey: 'retentionDays', header: t('compliance.days'), cell: ({ getValue }) => <span className="tnum">{getValue<number>()}</span> },
    { accessorKey: 'action', header: t('compliance.action'), cell: ({ getValue }) => <Badge tone="neutral">{getValue<string>()}</Badge> },
    { accessorKey: 'nextRun', header: t('compliance.nextRun'), cell: ({ getValue }) => formatDate(getValue<string>()) },
    { accessorKey: 'enabled', header: t('common.status'), cell: ({ getValue }) => <StatusPill status={getValue<boolean>() ? 'active' : 'draft'} /> },
  ]
  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title={t('compliance.retention')} actions={<MockNotice mock={retention.data?.mock} compact />} breadcrumbs={[{ label: t('nav.group.safety') }, { label: t('nav.retention') }]} />
      <QueryState isLoading={retention.isLoading} error={retention.error} onRetry={() => void retention.refetch()}>{() => (<>
        <DataTable data={retention.data?.data ?? []} columns={columns} getRowId={r => r.id} searchPlaceholder={t('common.search')} />
      </>)}</QueryState>
    </div>
  )
}

export function DataRequestsPage() {
  const { t } = useTranslation()
  const can = useCan('compliance.read')
  const requests = useDataRequests(can)
  const consents = useConsents()
  const create = useCreateDataRequest()
  const [type, setType] = useState<'export' | 'erasure'>('export')
  const [subject, setSubject] = useState('')
  if (!can) return <ForbiddenCard />

  const submit = async () => {
    try { await create.mutateAsync({ type, subject }); toast.success(t('common.save')); setSubject('') }
    catch { toast.error(t('state.error')) }
  }

  const columns: ColumnDef<DataExportRequest>[] = [
    { accessorKey: 'id', header: t('common.reference'), cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span> },
    { accessorKey: 'type', header: t('compliance.requests'), cell: ({ getValue }) => <Badge tone={getValue<string>() === 'erasure' ? 'danger' : 'brand'}>{getValue<string>()}</Badge> },
    { accessorKey: 'subject', header: t('students.title') },
    { accessorKey: 'status', header: t('common.status'), cell: ({ getValue }) => <StatusPill status={getValue<string>()} /> },
    { accessorKey: 'dueAt', header: t('compliance.nextRun'), cell: ({ getValue }) => formatDate(getValue<string>()) },
  ]

  return (
    <div className="ui-page">
      <PageHeader title={t('compliance.requests')} breadcrumbs={[{ label: t('nav.group.safety') }, { label: t('nav.compliance') }]} />
      <div className="mb-5"><Banner tone="warning" title={t('compliance.legal')} /></div>
      <Card className="mb-5">
        <CardHeader title={t('compliance.newRequest')} />
        <CardBody className="grid gap-4 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <FormField label={t('common.actions')}>{() => <Select value={type} onValueChange={v => setType(v as 'export' | 'erasure')} options={[{ value: 'export', label: t('compliance.requests') }, { value: 'erasure', label: 'Erasure' }]} />}</FormField>
          <FormField label={t('students.title')}>{props => <Input {...props} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Identifiant" />}</FormField>
          <Button loading={create.isPending} disabled={!subject} onClick={() => void submit()}>{t('common.create')}</Button>
        </CardBody>
      </Card>
      <QueryState isLoading={requests.isLoading} error={requests.error} onRetry={() => void requests.refetch()}>{() => (<>
        <DataTable data={requests.data?.data ?? []} columns={columns} getRowId={r => r.id} searchPlaceholder={t('common.search')} />
      </>)}</QueryState>
      <Card className="mt-5">
        <CardHeader title={t('dash.documents')} />
        <CardBody className="space-y-2">
          {consents.data?.data?.map((c: ConsentRecord) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3 text-sm">
              <span className="text-content">{c.studentId} · {c.consentType}</span>
              <Badge tone={c.granted ? 'success' : 'warning'}>{c.granted ? t('common.yes') : t('common.no')}</Badge>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}

export function CompliancePackPage() {
  const { t } = useTranslation()
  const links = [
    { label: 'Architecture', to: '/docs/ARCHITECTURE.md', icon: FileClock },
    { label: 'Sécurité', to: '/docs/SECURITY_REVIEW_CHECKLIST.md', icon: ShieldCheck },
    { label: 'Conformité', to: '/docs/COMPLIANCE.md', icon: Scale },
    { label: 'Gouvernance IA', to: '/docs/AI_GOVERNANCE.md', icon: FileDown },
  ]
  return (
    <div className="ui-page">
      <PageHeader title={t('compliance.pack')} breadcrumbs={[{ label: t('nav.group.safety') }, { label: t('compliance.pack') }]} />
      <div className="mb-5"><Banner tone="info" title={t('compliance.legal')} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map(l => (
          <Button key={l.label} asChild variant="bare" className="ui-card flex items-center gap-3 p-5 hover:border-brand-300">
            <a href={l.to}>
              <l.icon className="h-5 w-5 text-brand-500" />
              <span className="font-medium text-content">{l.label}</span>
              <Badge tone="neutral" className="ml-auto">TODO(legal-review)</Badge>
            </a>
          </Button>
        ))}
      </div>
    </div>
  )
}

export function AuditPage() {
  const { t } = useTranslation()
  const can = useCan('compliance.read')
  const audit = useAudit(can)
  if (!can) return <ForbiddenCard />
  const columns: ColumnDef<AuditEvent>[] = [
    { accessorKey: 'at', header: t('compliance.date'), cell: ({ getValue }) => formatDate(getValue<string>()) },
    { accessorKey: 'actor', header: t('compliance.actor'), cell: ({ getValue }) => <span className="font-medium text-content">{getValue<string>()}</span> },
    { accessorKey: 'action', header: t('compliance.actionCol'), cell: ({ getValue }) => <Badge tone="brand">{getValue<string>()}</Badge> },
    { accessorKey: 'target', header: t('common.details') },
    { accessorKey: 'ip', header: 'IP', cell: ({ getValue }) => <span className="text-content-subtle">{getValue<string>() ?? '—'}</span> },
  ]
  return (
    <div className="ui-page">
      <PageHeader title={t('nav.audit')} actions={<MockNotice mock={audit.data?.mock} compact />} breadcrumbs={[{ label: t('nav.group.safety') }, { label: t('nav.audit') }]} />
      <QueryState isLoading={audit.isLoading} error={audit.error} onRetry={() => void audit.refetch()}>{() => (<>
        <DataTable data={audit.data?.data ?? []} columns={columns} getRowId={r => r.id} searchPlaceholder={t('common.search')} />
      </>)}</QueryState>
    </div>
  )
}
