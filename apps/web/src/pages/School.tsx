import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, MapPin } from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, FormField, Input, Tabs, toast } from '@schoolos/ui'
import { useHolidays, useSchool, useUpdateSchool } from '@schoolos/api-client'
import { formatDate } from '@schoolos/i18n'
import { useSession } from '../app/session'
import { MockNotice, OfflineNotice, PageHeader, QueryState } from '../components/Screen'

export function SchoolSettingsPage() {
  const { t } = useTranslation()
  const { schoolId } = useSession()
  const school = useSchool(schoolId ?? '', Boolean(schoolId))
  const update = useUpdateSchool()
  const [tab, setTab] = useState('identity')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')

  const data = school.data?.data
  if (data && name === '') { setName(data.name); setAddress(data.address ?? '') }

  const save = async () => {
    if (!schoolId) return
    try { await update.mutateAsync({ id: schoolId, input: { name, address } }); toast.success(t('common.save')) }
    catch { toast.error(t('state.error')) }
  }

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title={t('school.title')} actions={<MockNotice mock={school.data?.mock} compact />} breadcrumbs={[{ label: t('nav.group.school') }, { label: t('nav.schoolSettings') }]} />
      <QueryState isLoading={school.isLoading} error={school.error} onRetry={() => void school.refetch()}>{() => (<>
        <Card>
          <CardBody>
            <Tabs value={tab} onValueChange={setTab} items={[
              { value: 'identity', label: t('school.tab.identity'), content: (
                <div className="grid max-w-2xl gap-5">
                  <FormField label={t('common.school')} required>{props => <Input {...props} value={name} onChange={e => setName(e.target.value)} />}</FormField>
                  <FormField label="Address">{props => <Input {...props} value={address} onChange={e => setAddress(e.target.value)} />}</FormField>
                  <div className="grid gap-3 sm:grid-cols-3 text-sm">
                    <div className="rounded-lg border border-line p-3"><p className="text-xs text-content-subtle">Timezone</p><p className="font-medium text-content">{data?.timezone}</p></div>
                    <div className="rounded-lg border border-line p-3"><p className="text-xs text-content-subtle">{t('common.language')}</p><p className="font-medium text-content">{data?.locale?.toUpperCase()}</p></div>
                    <div className="rounded-lg border border-line p-3"><p className="text-xs text-content-subtle">Version</p><p className="font-medium text-content">v{data?.version ?? 1}</p></div>
                  </div>
                  <div><Button loading={update.isPending} onClick={() => void save()}>{t('common.save')}</Button></div>
                </div>
              ) },
              { value: 'calendar', label: t('school.tab.calendar'), content: (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-line p-4"><span className="flex items-center gap-2 text-sm text-content"><CalendarDays className="h-4 w-4 text-brand-500" />{data?.academicYear}</span><Badge tone="success">{t('common.yes')}</Badge></div>
                  {data?.terms?.map(term => (
                    <div key={term.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-4">
                      <p className="font-medium text-content">{term.name}</p>
                      <p className="text-sm text-content-muted">{formatDate(term.start)} → {formatDate(term.end)}</p>
                    </div>
                  )) ?? <p className="text-sm text-content-muted">—</p>}
                </div>
              ) },
              { value: 'holidays', label: t('school.tab.holidays'), content: <HolidayList /> },
            ]} />
          </CardBody>
        </Card>
      </>)}</QueryState>
    </div>
  )
}

function HolidayList() {
  const { t } = useTranslation()
  const holidays = useHolidays()
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-xs text-content-subtle"><MapPin className="h-3.5 w-3.5" />{t('dash.holidays')} · zone C</p>
      {holidays.data?.data?.map(h => (
        <div key={h.name} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-4">
          <p className="font-medium text-content">{h.name}</p>
          <p className="text-sm text-content-muted">{formatDate(h.start)} → {formatDate(h.end)}</p>
        </div>
      ))}
    </div>
  )
}
