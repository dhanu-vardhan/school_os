import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarPlus, XCircle } from 'lucide-react'
import { cancelFamilyActivity, enrolFamilyActivity, useFamilyActivities, useFamilyMutation } from '@schoolos/api-client'
import { Badge, Button, Card, CardBody, CardHeader, toast } from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { childName, FamilyPage, formatMoney, SelectField } from '../components'
import { useFamily } from '../context'

/** G12 — extra-curricular activities: enrolment, waitlist and cancellation. */
export function FamilyActivitiesPage() {
  const { t } = useTranslation()
  const { children, childId, selected } = useFamily()
  const query = useFamilyActivities(childId)
  const enrol = useFamilyMutation(enrolFamilyActivity)
  const cancel = useFamilyMutation(cancelFamilyActivity)
  const [consent, setConsent] = useState<Record<string, boolean>>({})
  const [child, setChild] = useState(childId ?? children[0]?.id ?? '')

  const data = query.data?.data
  const activityFor = (activityId: string) => data?.activities.find(activity => activity.id === activityId)
  const enrolmentFor = (offeringId: string) => data?.enrolments.find(item => item.offeringId === offeringId && item.childId === (child || childId))

  const doEnrol = async (offeringId: string) => {
    const target = child || childId
    if (!target) return
    try {
      const result = await enrol.mutateAsync({ childId: target, offeringId, consent: !!consent[offeringId] })
      const enrolment = result.data
      toast.success(enrolment.status === 'waitlisted'
        ? t('family.activities.waitlisted', { position: enrolment.waitlistPosition ?? 1 })
        : t('family.activities.enrolled'))
    } catch {
      toast.error(t('family.activities.conflict'))
    }
  }

  const doCancel = async (id: string) => {
    try {
      await cancel.mutateAsync(id)
      toast.success(t('family.appointments.cancelled'))
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  return (
    <FamilyPage
      title={t('family.activities.title')}
      subtitle={selected?.className}
      actions={<MockNotice mock={query.data?.mock} compact />}
    >
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        isEmpty={(data?.offerings.length ?? 0) === 0}
        empty={<Card><CardBody><p className="text-sm text-content-muted">{t('family.activities.empty')}</p></CardBody></Card>}
        loading={<ScreenLoading variant="cards" />}
      >
        {() => data && (
          <div className="space-y-5">
            <Card>
              <CardHeader title={t('family.activities.empty')} />
              <CardBody>
                <SelectField label={t('family.childSwitcher')} value={child || childId}
                  onValueChange={setChild}
                  options={children.map(item => ({ value: item.id, label: `${item.firstName} · ${item.className}` }))} />
              </CardBody>
            </Card>

            {(data.enrolments ?? []).length > 0 && (
              <Card>
                <CardHeader title={t('family.activities.myEnrolments')} />
                <CardBody className="p-0">
                  <ul className="divide-y divide-line/60">
                    {data.enrolments.map(enrolment => (
                      <li key={enrolment.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-content">{enrolment.activityName}</p>
                          <p className="text-xs text-content-muted">
                            {childName(children.find(item => item.id === enrolment.childId))} · {formatMoney(enrolment.feeCents, enrolment.currency)}
                            {enrolment.waitlistPosition ? ` · ${t('family.activities.waitlist')} ${enrolment.waitlistPosition}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={enrolment.status === 'confirmed' ? 'success' : enrolment.status === 'waitlisted' ? 'warning' : 'neutral'}>
                            {enrolment.status === 'confirmed' ? t('family.activities.enrolled') : enrolment.status === 'waitlisted' ? t('family.activities.waitlist') : t('family.appointments.cancelled')}
                          </Badge>
                          {enrolment.status !== 'cancelled' && (
                            <Button size="sm" variant="ghost" onClick={() => void doCancel(enrolment.id)} loading={cancel.isPending}>
                              <XCircle className="h-4 w-4" />{t('family.activities.cancel')}
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.offerings.map(offering => {
                const activity = activityFor(offering.activityId)
                const existing = enrolmentFor(offering.id)
                const full = offering.status === 'full' || offering.booked >= offering.capacity
                return (
                  <Card key={offering.id}>
                    <CardHeader title={activity?.name ?? t('nav.activities')} description={activity?.day} action={
                      <Badge tone={offering.status === 'open' ? 'success' : offering.status === 'full' ? 'warning' : 'neutral'}>{offering.status}</Badge>
                    } />
                    <CardBody className="space-y-3">
                      <p className="text-sm text-content-muted">{activity?.description}</p>
                      <p className="text-xs text-content-muted">
                        {offering.location} · {offering.term} · {formatMoney(offering.priceCents, offering.currency)}
                      </p>
                      <p className="text-xs text-content-muted">
                        {offering.booked}/{offering.capacity} · {t('family.activities.waitlist')} {offering.waitlist}
                      </p>
                      {existing && existing.status !== 'cancelled'
                        ? <Badge tone={existing.status === 'confirmed' ? 'success' : 'warning'}>{existing.status === 'confirmed' ? t('family.activities.enrolled') : t('family.activities.waitlisted', { position: existing.waitlistPosition ?? 1 })}</Badge>
                        : (
                          <>
                            <label className="flex items-start gap-2 text-xs text-content-muted">
                              <input type="checkbox" className="mt-0.5" checked={!!consent[offering.id]} onChange={event => setConsent({ ...consent, [offering.id]: event.target.checked })} />
                              {t('family.activities.consent')}
                            </label>
                            <Button size="sm" onClick={() => void doEnrol(offering.id)} loading={enrol.isPending}
                              disabled={!child && !childId}>
                              <CalendarPlus className="h-4 w-4" />{full ? t('family.activities.waitlist') : t('family.activities.enrol')}
                            </Button>
                          </>
                        )}
                    </CardBody>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </QueryState>
    </FamilyPage>
  )
}
