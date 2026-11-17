import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Printer } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button, Card, CardBody, CardHeader, DataTable, FormField, Input, Select } from '@schoolos/ui'
import { useReport } from '@schoolos/api-client'
import { ForbiddenCard, MockNotice, OfflineNotice, PageHeader, QueryState } from '../components/Screen'
import { useCan } from '../app/permissions'

interface ReportRow { label: string; value: number; secondary: number }

export function ReportsPage() {
  const { t } = useTranslation()
  const can = useCan('reports.read')
  const [metric, setMetric] = useState('enrolment')
  const [groupBy, setGroupBy] = useState('class')
  const [from, setFrom] = useState('2026-09-01')
  const [to, setTo] = useState('2026-12-31')
  const [submitted, setSubmitted] = useState(false)
  const report = useReport({ metric, groupBy, from, to }, submitted && can)
  if (!can) return <ForbiddenCard />

  const columns: ColumnDef<ReportRow>[] = [
    { accessorKey: 'label', header: t('school.title'), cell: ({ getValue }) => <span className="font-medium text-content">{getValue<string>()}</span> },
    { accessorKey: 'value', header: t('reports.metric'), cell: ({ getValue }) => <span className="tnum font-semibold text-content">{getValue<number>()}</span> },
    { accessorKey: 'secondary', header: t('dash.attendanceRate'), cell: ({ getValue }) => <span className="tnum text-content-muted">{getValue<number>()}</span> },
  ]

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title={t('reports.title')} subtitle={t('reports.builder')} actions={<MockNotice mock={report.data?.mock} compact />} breadcrumbs={[{ label: t('nav.group.insights') }, { label: t('nav.reports') }]} />
      <Card className="mb-5">
        <CardHeader title={t('reports.builder')} />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label={t('reports.metric')}>{() => <Select value={metric} onValueChange={setMetric} options={[{ value: 'enrolment', label: t('dash.enrolment') }, { value: 'attendance', label: t('dash.attendanceRate') }, { value: 'activity', label: t('dash.activityUptake') }]} />}</FormField>
            <FormField label={t('reports.groupBy')}>{() => <Select value={groupBy} onValueChange={setGroupBy} options={[{ value: 'class', label: 'Class' }, { value: 'level', label: 'Level' }, { value: 'month', label: 'Month' }]} />}</FormField>
            <FormField label={t('reports.period')}>{props => <Input {...props} type="date" value={from} onChange={e => setFrom(e.target.value)} />}</FormField>
            <FormField label={t('reports.period')}>{props => <Input {...props} type="date" value={to} onChange={e => setTo(e.target.value)} />}</FormField>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => setSubmitted(true)}>{t('common.submit')}</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />{t('reports.print')}</Button>
            <Button variant="outline" onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="CSV"]')?.click()}><Download className="h-4 w-4" />{t('reports.csv')}</Button>
          </div>
        </CardBody>
      </Card>
      {submitted ? (
        <QueryState isLoading={report.isLoading} error={report.error} onRetry={() => void report.refetch()}>{() => (<>
          <Card>
            <CardHeader title={t('reports.preview')} description={`${metric} · ${groupBy}`} />
            <CardBody><DataTable data={report.data?.data.rows ?? []} columns={columns} getRowId={r => r.label} searchPlaceholder={t('common.search')} emptyTitle={t('state.empty')} /></CardBody>
          </Card>
        </>)}</QueryState>
      ) : (
        <Card><CardBody><p className="py-12 text-center text-sm text-content-muted">{t('reports.preview')} — {t('state.emptyHint')}</p></CardBody></Card>
      )}
    </div>
  )
}
