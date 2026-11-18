import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarPlus } from 'lucide-react'
import { declareAbsence, useFamilyAttendance, useFamilyMutation } from '@schoolos/api-client'
import {
  Badge, Banner, Button, Card, CardBody, CardHeader, FormField, Input, Modal, StatCard, Textarea, toast,
} from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { childName, FamilyPage, formatDay, SelectField } from '../components'
import { useFamily } from '../context'

const STATUS_TONE = { present: 'success', absent: 'danger', late: 'warning', school_closed: 'neutral' } as const

/** G3 — attendance history, absence declarations and informative counters. */
export function FamilyAttendancePage() {
  const { t } = useTranslation()
  const { children, childId, overview, selected } = useFamily()
  const query = useFamilyAttendance(childId)
  const declare = useFamilyMutation(declareAbsence)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ childId: '', fromDate: '', toDate: '', period: 'full_day', reasonCode: '', reasonText: '', attachmentName: '' })

  const data = query.data?.data
  const insights = useMemo(() => {
    const days = [...(data?.days ?? [])].sort((a, b) => b.date.localeCompare(a.date))
    return { days: childId ? days : days.slice(0, 40), counters: data?.counters ?? [], declarations: data?.declarations ?? [] }
  }, [data, childId])

  const openForm = () => {
    const today = new Date().toISOString().slice(0, 10)
    setForm({ childId: childId ?? children[0]?.id ?? '', fromDate: today, toDate: today, period: 'full_day', reasonCode: '', reasonText: '', attachmentName: '' })
    setOpen(true)
  }

  const submit = async () => {
    if (!form.childId || !form.reasonCode || !form.fromDate) return
    try {
      await declare.mutateAsync({
        childId: form.childId,
        fromDate: form.fromDate,
        toDate: form.toDate || form.fromDate,
        period: form.period as 'morning' | 'afternoon' | 'full_day',
        reasonCode: form.reasonCode,
        reasonText: form.reasonText || undefined,
        attachmentName: form.attachmentName || undefined,
      })
      toast.success(t('family.attendance.submitted'))
      setOpen(false)
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  return (
    <FamilyPage
      title={t('family.attendance.title')}
      subtitle={selected?.className}
      actions={<>
        <MockNotice mock={query.data?.mock} compact />
        <Button onClick={openForm}><CalendarPlus className="h-4 w-4" />{t('family.attendance.declare')}</Button>
      </>}
    >
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()} loading={<ScreenLoading variant="table" />}>
        {() => data && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {insights.counters.map(counter => (
                <StatCard
                  key={counter.childId}
                  label={`${childName(children.find(child => child.id === counter.childId))} · ${t('family.attendance.unjustified')}`}
                  value={counter.unjustified}
                  hint={`${t('family.attendance.late')} ${counter.late} · ${t('family.attendance.justified')} ${counter.justified}`}
                  tone={counter.overThreshold ? 'danger' : 'brand'}
                />
              ))}
            </div>

            {insights.counters.some(counter => counter.overThreshold) && (
              <Banner tone="warning" title={t('family.attendance.threshold')}>{t('family.attendance.overThreshold')}</Banner>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader title={t('family.attendance.declarations')} />
                <CardBody className="p-0">
                  {insights.declarations.length === 0
                    ? <p className="px-5 py-6 text-center text-sm text-content-muted">{t('state.empty')}</p>
                    : (
                      <ul className="divide-y divide-line/60">
                        {insights.declarations.map(declaration => (
                          <li key={declaration.id} className="px-5 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-content">
                                {formatDay(declaration.fromDate)}{declaration.fromDate !== declaration.toDate ? ` → ${formatDay(declaration.toDate)}` : ''} · {declaration.reasonLabel}
                              </p>
                              <Badge tone={declaration.status === 'accepted' ? 'success' : declaration.status === 'rejected' ? 'danger' : 'warning'}>
                                {declaration.status === 'accepted' ? t('family.attendance.justified') : declaration.status === 'rejected' ? t('family.attendance.unjustified') : t('family.attendance.pending')}
                              </Badge>
                            </div>
                            <p className="text-xs text-content-muted">
                              {childName(children.find(child => child.id === declaration.childId))} · {declaration.createdByName}
                              {declaration.reasonText ? ` — ${declaration.reasonText}` : ''}
                            </p>
                            {declaration.schoolComment && <p className="mt-1 text-xs text-content-subtle">{declaration.schoolComment}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.attendance.title')} />
                <CardBody className="p-0">
                  <div className="ui-scroll max-h-[28rem] overflow-y-auto">
                    <ul className="divide-y divide-line/60">
                      {insights.days.map(day => (
                        <li key={`${day.childId}-${day.date}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm text-content">{formatDay(day.date, true)}</p>
                            <p className="text-xs text-content-muted">
                              {childName(children.find(child => child.id === day.childId))}
                              {day.reasonLabel ? ` · ${day.reasonLabel}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {day.justification !== 'not_applicable' && (
                              <Badge tone={day.justification === 'justified' ? 'success' : day.justification === 'unjustified' ? 'danger' : 'warning'}>
                                {t(`family.attendance.${day.justification === 'justified' ? 'justified' : day.justification === 'unjustified' ? 'unjustified' : 'pending'}`)}
                              </Badge>
                            )}
                            <Badge tone={STATUS_TONE[day.status]}>{t(`family.attendance.${day.status === 'school_closed' ? 'closed' : day.status}`)}</Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardBody>
              </Card>
            </div>
            <p className="text-xs text-content-subtle">{overview?.policy.absenceThresholds.label}</p>
          </div>
        )}
      </QueryState>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={t('family.attendance.declare')}
        description={t('family.attendance.reasonHint')}
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => void submit()} loading={declare.isPending} disabled={!form.childId || !form.reasonCode}>{t('common.save')}</Button>
        </>}
      >
        <div className="space-y-4">
          <SelectField label={t('family.childSwitcher')} required value={form.childId}
            onValueChange={(value: string) => setForm({ ...form, childId: value })}
            options={children.map(child => ({ value: child.id, label: `${child.firstName} · ${child.className}` }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('family.attendance.from')} required>{props => <Input {...props} type="date" value={form.fromDate} onChange={event => setForm({ ...form, fromDate: event.target.value, toDate: form.toDate || event.target.value })} />}</FormField>
            <FormField label={t('family.attendance.to')}>{props => <Input {...props} type="date" value={form.toDate} onChange={event => setForm({ ...form, toDate: event.target.value })} />}</FormField>
          </div>
          <SelectField label={t('family.attendance.period')} value={form.period}
            onValueChange={value => setForm({ ...form, period: value })}
            options={[
              { value: 'full_day', label: t('family.attendance.fullDay') },
              { value: 'morning', label: t('family.attendance.morning') },
              { value: 'afternoon', label: t('family.attendance.afternoon') },
            ]} />
          <SelectField label={t('family.attendance.reason')} required value={form.reasonCode}
            onValueChange={value => setForm({ ...form, reasonCode: value })}
            placeholder={t('family.attendance.reasonPlaceholder')}
            options={(overview?.policy.absenceReasons ?? []).map(reason => ({ value: reason.code, label: reason.label }))} />
          <FormField label={t('family.attendance.reasonText')} hint={t('family.attendance.reasonHint')}>{props => (
            <Textarea {...props} maxLength={500} value={form.reasonText} onChange={event => setForm({ ...form, reasonText: event.target.value })} />
          )}</FormField>
          <FormField label={t('family.attendance.attachment')}>{props => (
            <Input {...props} type="file" accept="application/pdf,image/*" onChange={event => setForm({ ...form, attachmentName: event.target.files?.[0]?.name ?? '' })} />
          )}</FormField>
        </div>
      </Modal>
    </FamilyPage>
  )
}
