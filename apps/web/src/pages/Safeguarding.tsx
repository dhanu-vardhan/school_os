import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import {
  Banner, Badge, Button, Card, CardBody, CardHeader, FormField, RadioGroup, Select, StatusPill, Stepper, Textarea, Timeline, toast,
} from '@schoolos/ui'
import { useConcern, useConcerns, useCreateConcern, useUpdateConcern } from '@schoolos/api-client'
import { formatDate } from '@schoolos/i18n'
import type { SafeguardingConcern } from '@schoolos/shared'
import { ForbiddenCard, MockNotice, OfflineNotice, PageHeader, QueryState, ScreenError, ScreenLoading } from '../components/Screen'
import { useCan } from '../app/permissions'

function ConfidentialBanner() {
  const { t } = useTranslation()
  return <div className="mb-5"><Banner tone="danger" title={t('safeguarding.banner')}>{t('safeguarding.subtitle')}</Banner></div>
}

export function SafeguardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const canRead = useCan('safeguarding.read')
  const concerns = useConcerns(canRead)
  if (!canRead) return <ForbiddenCard />

  return (
    <div className="ui-page">
      <OfflineNotice />
      <ConfidentialBanner />
      <PageHeader title={t('safeguarding.title')} subtitle={t('safeguarding.noLeak')}
        actions={<><MockNotice mock={concerns.data?.mock} compact /><Button asChild><Link to="/app/safeguarding/new">{t('safeguarding.new')}</Link></Button></>}
        breadcrumbs={[{ label: t('nav.group.safety') }, { label: t('nav.safeguarding') }]} />
      <QueryState isLoading={concerns.isLoading} error={concerns.error} onRetry={() => void concerns.refetch()} isEmpty={concerns.data?.data?.length === 0} loading={<ScreenLoading variant="table" />}>{() => (<>
        <div className="ui-card overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase text-content-subtle"><tr><th className="p-3">{t('safeguarding.reference')}</th><th className="p-3">{t('safeguarding.category')}</th><th className="p-3">{t('safeguarding.status')}</th><th className="p-3">{t('common.updatedAt')}</th><th className="p-3" /></tr></thead>
            <tbody>
              {concerns.data!.data.map(c => (
                <tr key={c.id} tabIndex={0} aria-label={`${t('safeguarding.reference')} ${c.reference}`}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate(`/app/safeguarding/${c.id}`)
                    }
                  }}
                  className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-brand-50/50 focus-visible:bg-brand-50 dark:hover:bg-brand-500/5 dark:focus-visible:bg-brand-500/10"
                  onClick={() => navigate(`/app/safeguarding/${c.id}`)}>
                  <td className="p-3 font-mono text-xs text-content">{c.reference}</td>
                  <td className="p-3 text-content-muted">{c.category}</td>
                  <td className="p-3"><StatusPill status={c.status} /></td>
                  <td className="p-3 text-xs text-content-subtle">{formatDate(c.updatedAt)}</td>
                  <td className="p-3 text-right"><Badge tone="neutral"><EyeOff className="mr-1 h-3 w-3" />{t('common.restricted')}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}</QueryState>
    </div>
  )
}

export function NewConcernPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const create = useCreateConcern()
  const [step, setStep] = useState(0)
  const [category, setCategory] = useState('wellbeing')
  const [reportedByRole, setReportedByRole] = useState('safeguarding')
  const [context, setContext] = useState('')

  const submit = async () => {
    try {
      const res = await create.mutateAsync({ category, reportedByRole })
      toast.success(`${t('safeguarding.reference')} ${res.data.reference}`)
      navigate('/app/safeguarding')
    } catch { toast.error(t('state.error')) }
  }

  return (
    <div className="ui-page">
      <PageHeader title={t('safeguarding.new')} breadcrumbs={[{ label: t('nav.safeguarding'), to: '/app/safeguarding' }, { label: t('common.new') }]} />
      <ConfidentialBanner />
      <Card className="mb-6 p-5"><Stepper steps={[{ title: t('safeguarding.wizard1') }, { title: t('safeguarding.wizard2') }, { title: t('safeguarding.wizard3') }]} current={step} onStepClick={setStep} /></Card>
      <Card>
        <CardBody className="min-h-56 space-y-4">
          {step === 0 && <>
            <FormField label={t('safeguarding.category')} required>{() => <Select value={category} onValueChange={setCategory} options={[
              { value: 'wellbeing', label: 'Wellbeing' }, { value: 'attendance', label: 'Attendance' }, { value: 'safety', label: 'Safety' },
            ]} />}</FormField>
            <FormField label={t('common.role')}>{() => <Select value={reportedByRole} onValueChange={setReportedByRole} options={[
              { value: 'safeguarding', label: t('role.safeguarding') }, { value: 'teacher', label: t('role.teacher') }, { value: 'reception', label: t('role.reception') },
            ]} />}</FormField>
          </>}
          {step === 1 && <>
            <p className="text-sm text-content-muted">{t('safeguarding.noLeak')}</p>
            <FormField label={t('safeguarding.summary')} hint={t('common.confidential')}>{props => <Textarea {...props} value={context} onChange={e => setContext(e.target.value)} rows={5} />}</FormField>
            <p className="text-xs text-warning-700 dark:text-warning-300">TODO(legal-review) · {t('safeguarding.legal')}</p>
          </>}
          {step === 2 && <div className="space-y-2 text-sm"><p><span className="text-content-subtle">{t('safeguarding.category')} : </span><span className="font-medium text-content">{category}</span></p><p className="text-content-subtle">{t('safeguarding.noLeak')}</p></div>}
        </CardBody>
        <div className="flex justify-between border-t border-line px-5 py-4">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}><ArrowLeft className="h-4 w-4" />{t('common.previous')}</Button>
          {step < 2 ? <Button onClick={() => setStep(s => s + 1)}>{t('common.next')}</Button> : <Button loading={create.isPending} onClick={() => void submit()}><LockKeyhole className="h-4 w-4" />{t('common.submit')}</Button>}
        </div>
      </Card>
    </div>
  )
}

export function ConcernDetailPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const canRead = useCan('safeguarding.read')
  const canWrite = useCan('safeguarding.write')
  const concern = useConcern(id, canRead)
  const update = useUpdateConcern()
  if (!canRead) return <ForbiddenCard />
  if (concern.isLoading) return <div className="ui-card p-6"><div className="ui-skeleton h-64 rounded-lg" /></div>
  if (concern.isError || !concern.data) return <ScreenError error={concern.error} onRetry={() => void concern.refetch()} />
  const c = concern.data.data as SafeguardingConcern

  const setStatus = async (status: SafeguardingConcern['status']) => {
    try { await update.mutateAsync({ id, status }); toast.success(t('common.save')) }
    catch { toast.error(t('state.error')) }
  }

  return (
    <div className="ui-page">
      <PageHeader title={c.reference} subtitle={`${t('safeguarding.category')}: ${c.category} · ${t('common.createdAt')} ${formatDate(c.createdAt)}`}
        actions={<><MockNotice mock={concern.data.mock} compact /><StatusPill status={c.status} /></>}
        breadcrumbs={[{ label: t('nav.safeguarding'), to: '/app/safeguarding' }, { label: c.reference }]} />
      <ConfidentialBanner />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t('safeguarding.summary')} action={<Badge tone="danger"><EyeOff className="mr-1 h-3 w-3" />{t('common.restricted')}</Badge>} />
          <CardBody>
            <div className="rounded-lg border border-danger-200 bg-danger-50/60 p-4 text-sm text-danger-900 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-200">
              <ShieldCheck className="mb-2 h-5 w-5" />
              <p>{t('safeguarding.noLeak')}</p>
              <p className="mt-2 text-xs opacity-80">TODO(legal-review) · {t('safeguarding.legal')}</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-lg border border-line p-3"><p className="text-xs text-content-subtle">{t('common.reference')}</p><p className="font-mono text-content">{c.reference}</p></div>
              <div className="rounded-lg border border-line p-3"><p className="text-xs text-content-subtle">{t('common.role')}</p><p className="text-content">{t(`role.${c.reportedByRole}`)}</p></div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t('safeguarding.workflow')} />
          <CardBody className="space-y-3">
            <RadioGroup value={c.status} onValueChange={v => void setStatus(v as SafeguardingConcern['status'])} options={[
              { value: 'open', label: t('common.status'), description: 'open' },
              { value: 'under_review', label: t('safeguarding.workflow'), description: 'under review' },
              { value: 'closed', label: t('common.yes'), description: 'closed' },
            ]} />
            {!canWrite && <p className="text-xs text-content-subtle">{t('auth.forbiddenBody')}</p>}
          </CardBody>
        </Card>
      </div>
      <Card className="mt-5">
        <CardHeader title={t('safeguarding.auditTrail')} />
        <CardBody>
          <Timeline items={c.events.map(e => ({ id: e.id, title: e.action, description: t(`role.${e.actorRole}`), time: formatDate(e.at) }))} />
        </CardBody>
      </Card>
    </div>
  )
}
