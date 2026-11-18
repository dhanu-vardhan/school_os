import { useTranslation } from 'react-i18next'
import { CalendarDays, Check } from 'lucide-react'
import { markFamilyAnnouncementRead, useFamilyAnnouncements, useFamilyMutation, useSchoolCalendar } from '@schoolos/api-client'
import { Badge, Button, Card, CardBody, CardHeader, toast } from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { FamilyPage, formatDateTime, formatDay } from '../components'
import { useFamily } from '../context'

const CATEGORY_TONE = { school: 'info', class: 'neutral', trip: 'warning', safety: 'danger' } as const

/** G8 — announcements (per-guardian receipts) and the school calendar. */
export function FamilyAnnouncementsPage() {
  const { t } = useTranslation()
  const { selected } = useFamily()
  const announcements = useFamilyAnnouncements()
  const calendar = useSchoolCalendar()
  const markRead = useFamilyMutation(markFamilyAnnouncementRead)

  const read = async (id: string) => {
    try {
      await markRead.mutateAsync(id)
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  return (
    <FamilyPage
      title={t('family.announcements.title')}
      subtitle={selected?.className}
      actions={<MockNotice mock={announcements.data?.mock} compact />}
    >
      <QueryState
        isLoading={announcements.isLoading || calendar.isLoading}
        error={announcements.error ?? calendar.error}
        onRetry={() => { void announcements.refetch(); void calendar.refetch() }}
        loading={<ScreenLoading variant="list" />}
      >
        {() => (
          <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-4">
              {(announcements.data?.data ?? []).length === 0 && (
                <Card><CardBody><p className="text-sm text-content-muted">{t('family.announcements.empty')}</p></CardBody></Card>
              )}
              {(announcements.data?.data ?? []).map(announcement => (
                <Card key={announcement.id}>
                  <CardHeader
                    title={announcement.title}
                    description={`${announcement.author} · ${formatDateTime(announcement.publishedAt)}`}
                    action={<Badge tone={CATEGORY_TONE[announcement.category]}>{announcement.audience}</Badge>}
                  />
                  <CardBody className="space-y-3">
                    <p className="whitespace-pre-wrap text-sm text-content">{announcement.body}</p>
                    {announcement.requiresReceipt && (
                      announcement.readAt
                        ? <Badge tone="success"><Check className="mr-1 inline h-3 w-3" />{t('family.grades.acknowledged')}</Badge>
                        : <Button size="sm" variant="outline" onClick={() => void read(announcement.id)} loading={markRead.isPending}>{t('family.announcements.read')}</Button>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>

            <Card className="h-fit">
              <CardHeader title={t('family.announcements.calendar')} action={<CalendarDays className="h-4 w-4 text-content-subtle" />} />
              <CardBody className="p-0">
                <ul className="divide-y divide-line/60">
                  {(calendar.data?.data ?? []).map(event => (
                    <li key={event.id} className="px-4 py-3">
                      <p className="text-sm font-medium text-content">{event.title}</p>
                      <p className="text-xs text-content-muted">
                        {formatDay(event.start)}{event.end !== event.start ? ` → ${formatDay(event.end)}` : ''}
                        {event.zone ? ` · ${t('family.announcements.zone', { zone: event.zone })}` : ''}
                      </p>
                      <Badge tone={event.kind === 'closure' ? 'danger' : event.kind === 'holiday' ? 'info' : 'neutral'}>{event.kind}</Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        )}
      </QueryState>
    </FamilyPage>
  )
}
