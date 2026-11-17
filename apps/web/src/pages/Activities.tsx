import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock, Grid2x2, List, MapPin,
  Music, Palette, Trophy, Languages, Sparkles as SparklesIcon, UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Badge, Button, Card, CardBody, CardHeader, EmptyState, Progress, Select, Stepper, Tabs, cn, toast,
} from '@schoolos/ui'
import { useActivity, useActivities, useEnrolInActivity, useOfferings, useStudents } from '@schoolos/api-client'
import { formatDate, formatMoney } from '@schoolos/i18n'
import type { Activity } from '@schoolos/shared'
import { MockNotice, OfflineNotice, PageHeader, QueryState, ScreenError, ScreenLoading } from '../components/Screen'
import { useShortcutAction } from '../app/shortcuts'

const iconMap: Record<string, LucideIcon> = { chess: SparklesIcon, art: Palette, sport: Trophy, music: Music, language: Languages }
const toneMap = { brand: 'from-brand-500 to-brand-700', accent: 'from-accent-500 to-accent-700', warning: 'from-warning-500 to-warning-700', info: 'from-info-500 to-info-700' }

function ActivityCard({ activity, offeringId, onOpen }: { activity: Activity; offeringId?: string; onOpen: () => void }) {
  const { t } = useTranslation()
  const Icon = iconMap[activity.icon ?? 'art'] ?? Palette
  return (
    <Button variant="bare" onClick={onOpen} aria-label={activity.name}
      className="ui-card ui-card-hover block w-full overflow-hidden text-left">
      <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${toneMap[activity.imageTone ?? 'brand']}`}>
        <Icon className="h-10 w-10 text-neutral-0/90" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2"><h3 className="font-display text-base font-semibold text-content">{activity.name}</h3><Badge tone="neutral">{activity.category}</Badge></div>
        <p className="mt-1 line-clamp-2 text-sm text-content-muted">{activity.description}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-content-subtle"><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{activity.day}</span><span className="flex items-center gap-1"><UsersRound className="h-3.5 w-3.5" />{activity.minAge}–{activity.maxAge} {t('common.yes').toLowerCase()}</span></div>
        {offeringId && <span className="mt-3 inline-flex text-xs font-medium text-brand-600 dark:text-brand-300">{t('common.details')} →</span>}
      </div>
    </Button>
  )
}

export function ActivitiesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const activities = useActivities()
  const offerings = useOfferings()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const offeringByActivity = new Map(offerings.data?.data?.map(o => [o.activityId, o]) ?? [])

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader
        title={t('activities.title')}
        subtitle={t('activities.subtitle')}
        actions={<><MockNotice mock={activities.data?.mock} compact />
          <div className="flex rounded-md border border-line p-0.5">
            <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('grid')} aria-pressed={view === 'grid'}><Grid2x2 className="h-4 w-4" />{t('activities.grid')}</Button>
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('list')} aria-pressed={view === 'list'}><List className="h-4 w-4" />{t('activities.list')}</Button>
          </div>
        </>}
        breadcrumbs={[{ label: t('nav.group.activities') }, { label: t('nav.activities') }]}
      />
      <QueryState isLoading={activities.isLoading} error={activities.error} onRetry={() => void activities.refetch()} isEmpty={activities.data?.data?.length === 0} loading={<ScreenLoading variant="cards" />}>{() => (<>
        {view === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activities.data!.data.map(a => <ActivityCard key={a.id} activity={a} offeringId={offeringByActivity.get(a.id)?.id} onOpen={() => navigate(`/app/activities/${a.id}`)} />)}
          </div>
        ) : (
          <div className="space-y-2">
            {activities.data!.data.map(a => {
              const o = offeringByActivity.get(a.id)
              return (
                <Button key={a.id} variant="bare" onClick={() => navigate(`/app/activities/${a.id}`)}
                  aria-label={a.name}
                  className="ui-card flex w-full flex-wrap items-center gap-4 p-4 text-left hover:border-brand-300">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${toneMap[a.imageTone ?? 'brand']}`}>{(() => { const Icon = iconMap[a.icon ?? 'art'] ?? Palette; return <Icon className="h-5 w-5 text-neutral-0" /> })()}</div>
                  <div className="min-w-0 flex-1"><p className="font-medium text-content">{a.name}</p><p className="truncate text-xs text-content-subtle">{a.description}</p></div>
                  <span className="text-xs text-content-muted">{a.day}</span>
                  {o && <Badge tone={o.booked >= o.capacity ? 'warning' : 'success'}>{o.booked}/{o.capacity}</Badge>}
                </Button>
              )
            })}
          </div>
        )}
      </>)}</QueryState>
    </div>
  )
}

export function ActivityDetailPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const detail = useActivity(id)
  if (detail.isLoading) return <div className="ui-card p-6"><div className="ui-skeleton h-64 rounded-lg" /></div>
  if (detail.isError || !detail.data) return <ScreenError error={detail.error} onRetry={() => void detail.refetch()} />
  const { activity, offering } = detail.data.data
  if (!activity) return <ScreenError error={new Error('NOT_FOUND')} />

  return (
    <div className="ui-page">
      <PageHeader title={activity.name} subtitle={activity.description} breadcrumbs={[{ label: t('nav.activities'), to: '/app/activities' }, { label: activity.name }]}
        actions={<><MockNotice mock={detail.data.mock} compact />{offering && <Button asChild><Link to={`/app/activities/${id}/enrol`}>{offering.booked >= offering.capacity ? t('activities.joinWaitlist') : t('activities.enrol')}</Link></Button>}</>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title={t('activities.sessions')} />
            <CardBody className="space-y-3">
              {offering?.sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
                  <span className="flex items-center gap-2 text-sm text-content"><CalendarDays className="h-4 w-4 text-brand-500" />{formatDate(s.date)}</span>
                  <span className="flex items-center gap-1 text-xs text-content-muted"><Clock className="h-3.5 w-3.5" />{s.start}–{s.end}</span>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('activities.detail')} />
            <CardBody className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="flex items-center gap-2 text-content-muted"><MapPin className="h-4 w-4" />{offering?.location}</div>
              <div className="flex items-center gap-2 text-content-muted"><UsersRound className="h-4 w-4" />{activity.minAge}–{activity.maxAge}</div>
              <div className="flex items-center gap-2 text-content-muted"><Clock className="h-4 w-4" />{activity.day}</div>
              <div className="flex items-center gap-2 text-content-muted"><Badge tone="neutral">{activity.category}</Badge></div>
            </CardBody>
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader title={t('activities.capacity')} />
            <CardBody className="space-y-4">
              {offering && <>
                <div><div className="mb-1 flex justify-between text-sm"><span className="text-content-muted">{t('activities.capacity')}</span><span className="tnum font-semibold">{offering.booked}/{offering.capacity}</span></div><Progress value={offering.booked} max={offering.capacity} tone={offering.booked >= offering.capacity ? 'warning' : 'accent'} /></div>
                <div className="flex justify-between text-sm"><span className="text-content-muted">{t('activities.waitlist')}</span><span className="tnum font-semibold text-content">{offering.waitlist}</span></div>
                <div className="flex justify-between text-sm"><span className="text-content-muted">{t('activities.price')}</span><span className="tnum font-semibold text-content">{offering.priceCents === 0 ? 'Gratuit' : formatMoney(offering.priceCents)}</span></div>
                {offering.registrationCloseAt && <p className="text-xs text-content-subtle">{t('common.createdAt')} {formatDate(offering.registrationCloseAt)}</p>}
              </>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('activities.enrolTitle')} />
            <CardBody><p className="text-sm text-content-muted">{t('activities.conflict')}</p><Button asChild className="mt-4 w-full"><Link to={`/app/activities/${id}/enrol`}><ArrowRight className="h-4 w-4" />{t('common.continue')}</Link></Button></CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function EnrolPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const detail = useActivity(id)
  const students = useStudents()
  const enrol = useEnrolInActivity()
  const [step, setStep] = useState(0)
  const [studentId, setStudentId] = useState('')
  const offering = detail.data?.data.offering

  const confirm = async () => {
    if (!offering) return
    try {
      const res = await enrol.mutateAsync({ offeringId: offering.id, studentId })
      toast.success(res.data.status === 'waitlisted' ? t('activities.waitlisted') : t('activities.confirmed'))
      navigate(`/app/activities/${id}`)
    } catch { toast.error(t('state.error')) }
  }

  // Cmd/Ctrl+Enter confirms enrolment only on the final review step.
  const confirmShortcut = useCallback(() => {
    if (step === 2 && studentId && offering && !enrol.isPending) void confirm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, studentId, offering, enrol.isPending])
  useShortcutAction('primary', confirmShortcut)

  return (
    <div className="ui-page">
      <PageHeader title={t('activities.enrolTitle')} breadcrumbs={[{ label: t('nav.activities'), to: '/app/activities' }, { label: t('activities.enrol') }]} />
      <Card className="mb-6 p-5"><Stepper steps={[{ title: t('activities.enrolStep1') }, { title: t('activities.enrolStep2') }, { title: t('activities.enrolStep3') }]} current={step} onStepClick={setStep} /></Card>
      <Card>
        <CardBody className="min-h-48 space-y-4">
          {step === 0 && <>
            <p className="text-sm font-medium text-content">{t('activities.enrolStep1')}</p>
            <Select value={studentId} onValueChange={setStudentId} placeholder={t('students.title')} options={(students.data?.data ?? []).map(s => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }))} ariaLabel={t('students.title')} />
          </>}
          {step === 1 && <div className="rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm text-warning-900 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200"><CheckCircle2 className="mb-1 h-4 w-4" />{t('activities.conflict')}</div>}
          {step === 2 && <div className="space-y-2 text-sm"><p><span className="text-content-subtle">{t('activities.detail')} : </span><span className="font-medium text-content">{detail.data?.data.activity?.name}</span></p><p><span className="text-content-subtle">{t('students.title')} : </span><span className="font-medium text-content">{students.data?.data?.find(s => s.id === studentId)?.firstName ?? '—'}</span></p><p><span className="text-content-subtle">{t('activities.price')} : </span><span className="font-medium text-content">{offering ? (offering.priceCents === 0 ? 'Gratuit' : formatMoney(offering.priceCents)) : '—'}</span></p></div>}
        </CardBody>
        <div className="flex justify-between border-t border-line px-5 py-4">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}><ArrowLeft className="h-4 w-4" />{t('common.previous')}</Button>
          {step < 2 ? <Button disabled={step === 0 && !studentId} onClick={() => setStep(s => s + 1)}>{t('common.next')}</Button> : <Button loading={enrol.isPending} onClick={() => void confirm()}>{t('common.confirm')}</Button>}
        </div>
      </Card>
    </div>
  )
}

export function MyActivitiesPage() {
  const { t } = useTranslation()
  const offerings = useOfferings()
  const activities = useActivities()
  const byId = new Map(activities.data?.data?.map(a => [a.id, a]) ?? [])
  const enrolled = offerings.data?.data?.slice(0, 3) ?? []
  return (
    <div className="ui-page">
      <PageHeader title={t('activities.mine')} actions={<MockNotice mock={offerings.data?.mock} compact />} breadcrumbs={[{ label: t('nav.group.activities') }, { label: t('nav.myActivities') }]} />
      <QueryState isLoading={offerings.isLoading || activities.isLoading} error={offerings.error ?? activities.error} onRetry={() => void offerings.refetch()} isEmpty={enrolled.length === 0}>{() => (<>
        <div className="space-y-3">
          {enrolled.map(o => {
            const a = byId.get(o.activityId)
            return (
              <div key={o.id} className="ui-card flex flex-wrap items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15"><CalendarDays className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1"><p className="font-medium text-content">{a?.name}</p><p className="text-xs text-content-subtle">{o.term} · {o.location}</p></div>
                <Badge tone="success">{t('activities.confirmed')}</Badge>
              </div>
            )
          })}
        </div>
      </>)}</QueryState>
    </div>
  )
}
