import { useTranslation } from 'react-i18next'
import { CalendarClock, CalendarX2 } from 'lucide-react'
import { bookAppointment, cancelAppointment, useFamilyAppointments, useFamilyMutation } from '@schoolos/api-client'
import { Badge, Button, Card, CardBody, CardHeader, toast } from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { childName, FamilyPage, formatDay } from '../components'
import { useFamily } from '../context'

/** G11 — appointment slots published by the school; booked slots disappear for every family. */
export function FamilyAppointmentsPage() {
  const { t } = useTranslation()
  const { children, overview, selected } = useFamily()
  const query = useFamilyAppointments(selected?.id)
  const book = useFamilyMutation(bookAppointment)
  const cancel = useFamilyMutation(cancelAppointment)
  const data = query.data?.data ?? []
  const mine = data.filter(slot => slot.bookedByName && slot.bookedByName === overview?.guardian.name)
  const available = data.filter(slot => !slot.bookedBy)

  const run = async (action: 'book' | 'cancel', id: string) => {
    try {
      await (action === 'book' ? book.mutateAsync(id) : cancel.mutateAsync(id))
      toast.success(action === 'book' ? t('family.appointments.booked') : t('family.appointments.cancelled'))
    } catch {
      toast.error(t('family.appointments.conflict'))
    }
  }

  return (
    <FamilyPage
      title={t('family.appointments.title')}
      subtitle={selected?.className}
      actions={<MockNotice mock={query.data?.mock} compact />}
    >
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()} loading={<ScreenLoading variant="list" />}>
        {() => (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title={t('family.appointments.mine')} />
              <CardBody className="p-0">
                {mine.length === 0
                  ? <p className="px-5 py-6 text-center text-sm text-content-muted">{t('family.appointments.empty')}</p>
                  : (
                    <ul className="divide-y divide-line/60">
                      {mine.map(slot => (
                        <li key={slot.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-content">{slot.teacherName} · {slot.topic}</p>
                            <p className="text-xs text-content-muted">
                              {formatDay(slot.date)} · {slot.start}–{slot.end} · {t(`family.appointments.mode.${slot.mode}`)}
                              {' · '}{childName(children.find(child => child.id === slot.childId))}
                            </p>
                            {slot.jointMeeting && <Badge tone="info" className="mt-1">{t('family.appointments.joint')}</Badge>}
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => void run('cancel', slot.id)} loading={cancel.isPending}>
                            <CalendarX2 className="h-4 w-4" />{t('family.appointments.cancel')}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t('family.appointments.available')} />
              <CardBody className="p-0">
                {available.length === 0
                  ? <p className="px-5 py-6 text-center text-sm text-content-muted">{t('family.appointments.empty')}</p>
                  : (
                    <ul className="divide-y divide-line/60">
                      {available.map(slot => (
                        <li key={slot.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-content">{slot.teacherName} · {slot.topic}</p>
                            <p className="text-xs text-content-muted">
                              {formatDay(slot.date)} · {slot.start}–{slot.end} · {t(`family.appointments.mode.${slot.mode}`)}
                              {slot.location ? ` · ${slot.location}` : ''}
                            </p>
                            <p className="text-xs text-content-subtle">{childName(children.find(child => child.id === slot.childId))} · {slot.teacherRole}</p>
                          </div>
                          <Button size="sm" onClick={() => void run('book', slot.id)} loading={book.isPending}>
                            <CalendarClock className="h-4 w-4" />{t('family.appointments.book')}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
              </CardBody>
            </Card>
          </div>
        )}
      </QueryState>
    </FamilyPage>
  )
}
