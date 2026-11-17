import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock } from 'lucide-react'
import { Badge, CalendarGrid, Card, CardBody, CardHeader } from '@schoolos/ui'
import { useTimetable } from '@schoolos/api-client'
import { MockNotice, OfflineNotice, PageHeader, QueryState, ScreenEmpty, ScreenLoading } from '../components/Screen'

const formatHour = (value: number) => {
  const hours = Math.floor(value)
  const minutes = Math.round((value - hours) * 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** Reachable view of today's timetable for every role (director and parent included). */
export function TimetablePage() {
  const { t } = useTranslation()
  const timetable = useTimetable()
  const events = timetable.data?.data ?? []
  // JS getDay(): 0 = Sunday. Timetable day: 0 = Monday.
  const todayIndex = (new Date().getDay() + 6) % 7
  const todayEvents = events.filter(event => event.day === todayIndex)
    .sort((a, b) => a.start - b.start)
  const days = [0, 1, 2, 3, 4].map(day => ({ label: t(`timetable.day.${day}`) }))

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader
        title={t('timetable.title')}
        subtitle={t('timetable.subtitle')}
        actions={<MockNotice mock={timetable.data?.mock} compact />}
        breadcrumbs={[{ label: t('nav.group.overview') }, { label: t('nav.timetable') }]}
      />
      <QueryState isLoading={timetable.isLoading} error={timetable.error}
        onRetry={() => void timetable.refetch()} isEmpty={events.length === 0}
        loading={<ScreenLoading variant="list" />}
        empty={<ScreenEmpty title={t('timetable.empty')} />}>{() => (<>
        <Card>
          <CardHeader title={t('common.today')} action={<Badge tone="brand">{todayEvents.length}</Badge>} />
          <CardBody className="divide-y divide-line/70 p-0">
            {todayEvents.length === 0 ? (
              <p className="p-5 text-sm text-content-muted">{t('timetable.emptyToday')}</p>
            ) : todayEvents.map(event => (
              <div key={event.id} className="flex items-start gap-3 px-5 py-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-content">{event.title}</p>
                    <span className="tnum text-xs font-semibold text-content-muted">{formatHour(event.start)}–{formatHour(event.end)}</span>
                  </div>
                  {event.subtitle && <p className="mt-0.5 text-xs text-content-subtle">{event.subtitle}</p>}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card className="mt-6">
          <CardHeader title={t('common.week')} action={<CalendarDays className="h-4 w-4 text-content-subtle" aria-hidden />} />
          <CardBody>
            <CalendarGrid days={days} events={events} startHour={8} endHour={18} />
          </CardBody>
        </Card>
      </>)}</QueryState>
    </div>
  )
}
