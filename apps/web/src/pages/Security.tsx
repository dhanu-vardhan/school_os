import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  Download, KeyRound, Laptop, LogOut, ShieldCheck, ShieldEllipsis, Smartphone, UserRound,
} from 'lucide-react'
import {
  Badge, Banner, Button, Card, CardBody, CardHeader, FormField, Input, Modal, StatCard, cn, toast,
} from '@schoolos/ui'
import {
  beginMfaEnrolment, logoutAll, revokeAccountSession, stepUp, verifyMfaEnrolment,
  useAccountSecurity, useSecurityEvents, useSecurityOverview,
} from '@schoolos/api-client'
import { formatDate, formatTime } from '@schoolos/i18n'
import type {
  AccountSecurity, ActiveSession, MfaEnrolment, SecurityEvent, SecurityOverview,
} from '@schoolos/shared'
import { useSession } from '../app/session'
import { useCan } from '../app/permissions'
import { ForbiddenCard, MockNotice, OfflineNotice, PageHeader, QueryState } from '../components/Screen'

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

const severityTone: Record<SecurityEvent['severity'], Tone> = {
  info: 'info', warning: 'warning', critical: 'danger',
}

function when(value: string | undefined, t: (key: string) => string) {
  if (!value) return t('security.never')
  return `${formatDate(value)} ${formatTime(value)}`
}

function MfaEnrolmentDialog({ open, onOpenChange, onDone }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const [enrolment, setEnrolment] = useState<MfaEnrolment>()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function start() {
    setBusy(true); setError(undefined)
    try {
      const res = await beginMfaEnrolment()
      const data = res.data as MfaEnrolment & { redirect?: string }
      if (data.redirect) { window.location.assign(data.redirect); return }
      setEnrolment(data)
    } catch {
      setError(t('security.enrolFailed'))
    } finally { setBusy(false) }
  }

  async function confirm() {
    setBusy(true); setError(undefined)
    try {
      await verifyMfaEnrolment(code.trim())
      toast.success(t('security.enrolDone'))
      setCode('')
      setEnrolment(undefined)
      onDone()
      onOpenChange(false)
    } catch {
      setError(t('security.enrolFailed'))
    } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onOpenChange={next => {
      if (!next) { setEnrolment(undefined); setCode(''); setError(undefined) }
      onOpenChange(next)
    }} title={t('security.enrolTitle')} description={t('security.enrolBody')}
      footer={enrolment ? <>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
        <Button loading={busy} disabled={code.trim().length < 6} onClick={() => void confirm()}>{t('security.confirmEnrol')}</Button>
      </> : <>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
        <Button loading={busy} onClick={() => void start()}>{t('security.enableMfa')}</Button>
      </>}>
      <div className="space-y-4">
        {error && <Banner tone="danger" title={t('state.error')}>{error}</Banner>}
        {!enrolment ? (
          <div className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-4 text-sm text-content-muted">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
            <p>{t('auth.backupCodeHint')}</p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">{t('security.secret')}</p>
              <code className="mt-1 block select-all break-all rounded-lg border border-line bg-surface-2 p-3 font-mono text-sm text-content">{enrolment.secret}</code>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">{t('security.otpauth')}</p>
              <code className="mt-1 block break-all text-xs text-content-muted">{enrolment.otpauthUrl}</code>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">{t('security.backupCodes')}</p>
              <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {enrolment.backupCodes.map(item => <code key={item} className="rounded border border-line bg-surface-2 px-2 py-1 font-mono text-xs text-content">{item}</code>)}
              </div>
              <p className="mt-1 text-xs text-content-subtle">{t('security.backupCodesHint')}</p>
            </div>
            <FormField label={t('security.code')} required>
              {field => <Input {...field} value={code} onChange={event => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123 456" />}
            </FormField>
          </>
        )}
      </div>
    </Modal>
  )
}

export function StepUpDialog({ open, onOpenChange, onDone, reason }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: () => void
  reason?: string
}) {
  const { t } = useTranslation()
  const { refresh } = useSession()
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function confirm() {
    setBusy(true); setError(undefined)
    try {
      await stepUp(code.trim())
      await refresh()
      await qc.invalidateQueries()
      toast.success(t('security.stepUpDone'))
      setCode('')
      onOpenChange(false)
      onDone?.()
    } catch {
      setError(t('security.stepUpFailed'))
    } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onOpenChange={next => { if (!next) { setCode(''); setError(undefined) }; onOpenChange(next) }}
      title={t('security.stepUp')} description={reason ?? t('security.stepUpBody')}
      footer={<>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
        <Button loading={busy} disabled={code.trim().length < 6} onClick={() => void confirm()}>{t('security.stepUpAction')}</Button>
      </>}>
      <div className="space-y-4">
        {error && <Banner tone="danger" title={t('state.error')}>{error}</Banner>}
        <FormField label={t('auth.mfaCode')} hint={t('auth.mfaCodeHint')} required>
          {field => <Input {...field} value={code} onChange={event => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123 456" autoFocus />}
        </FormField>
      </div>
    </Modal>
  )
}

function SessionRow({ active, onRevoke }: { active: ActiveSession; onRevoke: (id: string) => Promise<void> }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const name = active.user?.name ?? '—'
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-content-muted">
        {active.fingerprint ? <Laptop className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-content">
          {name}
          {active.current && <Badge tone="success" className="ml-2">{t('security.current')}</Badge>}
        </p>
        <p className="text-xs text-content-subtle">
          {t('security.lastSeen')} · {when(active.lastSeen, t)}
        </p>
        {active.fingerprint && <p className="truncate font-mono text-[11px] text-content-subtle">{active.fingerprint}</p>}
      </div>
      {!active.current && (
        <Button size="sm" variant="outline" loading={busy} onClick={async () => {
          if (!window.confirm(t('security.revokeConfirm'))) return
          setBusy(true)
          try { await onRevoke(active.id); toast.success(t('common.save')) } catch { toast.error(t('state.error')) } finally { setBusy(false) }
        }}>{t('security.revoke')}</Button>
      )}
    </li>
  )
}

function EventList({ events }: { events: SecurityEvent[] }) {
  const { t } = useTranslation()
  if (events.length === 0) return <p className="py-6 text-sm text-content-muted">{t('security.noEvents')}</p>
  return (
    <ul className="divide-y divide-line">
      {events.map(event => (
        <li key={event.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
          <Badge tone={severityTone[event.severity]}>{t(`security.severity.${event.severity}`)}</Badge>
          <span className="font-mono text-xs text-content">{event.type}</span>
          <span className="ml-auto text-xs text-content-subtle">{when(event.at, t)}</span>
        </li>
      ))}
    </ul>
  )
}

function AccountOverview({ data }: { data: AccountSecurity }) {
  const { t } = useTranslation()
  const { session } = useSession()
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title={t('security.identity')} />
        <CardBody className="space-y-3 text-sm">
          <div className="flex justify-between gap-3 border-b border-line pb-2"><span className="text-content-subtle">{t('security.email')}</span><span className="truncate font-medium text-content">{session.user?.email ?? '—'}</span></div>
          <div className="flex justify-between gap-3 border-b border-line pb-2"><span className="text-content-subtle">{t('common.role')}</span><span className="font-medium text-content">{session.user?.roles?.[0] ? t(`role.${session.user.roles[0]}`) : '—'}</span></div>
          <div className="flex justify-between gap-3"><span className="text-content-subtle">{t('common.school')}</span><span className="font-medium text-content">{session.user?.schoolName ?? session.user?.schoolId ?? '—'}</span></div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t('security.mfa')} action={<Badge tone={data.mfa ? 'success' : 'warning'} dot>{data.mfa ? t('security.mfaOn') : t('security.mfaOff')}</Badge>} />
        <CardBody className="space-y-3 text-sm">
          <p className="text-content-muted">{data.mfaRequired ? t('security.mfaRequired') : t('security.mfaOptional')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={data.stepUpActive ? 'success' : 'neutral'}>{data.stepUpActive ? t('security.stepUpActive') : t('security.stepUp')}</Badge>
            {data.trustedUntil > 0 && <Badge tone="info">{`${t('security.lastSeen')} · ${when(new Date(data.trustedUntil).toISOString(), t)}`}</Badge>}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

export function AccountSecurityPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { session, stepUpActive, refresh, logout } = useSession()
  const security = useAccountSecurity()
  const [enrolOpen, setEnrolOpen] = useState(false)
  const [stepUpOpen, setStepUpOpen] = useState(false)
  const data = security.data?.data
  const privileged = !!data?.mfaRequired
  const elevated = stepUpActive || !!data?.stepUpActive

  async function refreshSecurity() {
    await qc.invalidateQueries()
    await refresh()
  }

  async function revoke(id: string) {
    await revokeAccountSession(id)
    await refreshSecurity()
  }

  async function signOutEverywhere() {
    try {
      await logoutAll()
      await qc.clear()
      navigate('/login', { replace: true })
    } catch {
      toast.error(t('state.error'))
    }
  }

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title={t('security.title')} subtitle={t('security.subtitle')}
        actions={<MockNotice mock={security.data?.mock} compact />}
        breadcrumbs={[{ label: t('nav.accountSecurity') }]} />
      <QueryState isLoading={security.isLoading} error={security.error} onRetry={() => void security.refetch()}>
        {() => data && (
          <>
            {privileged && !elevated && (
              <div className="mb-5">
                <Banner tone="warning" title={t('security.stepUp')} action={<Button size="sm" onClick={() => setStepUpOpen(true)}>{t('security.stepUpAction')}</Button>}>
                  {t('security.stepUpBody')}
                </Banner>
              </div>
            )}
            <AccountOverview data={data} />
            <Card className="mt-5">
              <CardHeader title={t('security.mfa')} action={<Button size="sm" variant="outline" onClick={() => setEnrolOpen(true)}><KeyRound className="h-4 w-4" />{data.mfa ? t('security.reconfigureMfa') : t('security.enableMfa')}</Button>} />
              <CardBody>
                <p className="text-sm text-content-muted">{t('auth.backupCodeHint')}</p>
              </CardBody>
            </Card>
            <Card className="mt-5">
              <CardHeader title={t('security.sessions')} description={t('security.lastSeen')} />
              <CardBody>
                {data.sessions.length === 0 ? <p className="text-sm text-content-muted">{t('security.noSessions')}</p> : (
                  <ul className="divide-y divide-line">
                    {data.sessions.map(active => <SessionRow key={active.id} active={active} onRevoke={revoke} />)}
                  </ul>
                )}
              </CardBody>
            </Card>
            <Card className="mt-5">
              <CardHeader title={t('security.events')} action={<Button size="sm" variant="outline" asChild>
                <a href="/account/security/export" download
                  onClick={event => { if (privileged && !elevated) { event.preventDefault(); setStepUpOpen(true) } }}>
                  <Download className="h-4 w-4" />{t('security.exportLog')}
                </a>
              </Button>} />
              <CardBody><EventList events={data.events} /></CardBody>
            </Card>
            <Card className="mt-5 border-danger-200 dark:border-danger-500/30">
              <CardHeader title={t('security.logoutAll')} description={t('security.logoutAllBody')} />
              <CardBody className="flex flex-wrap items-center gap-3">
                <Button variant="danger" onClick={() => void signOutEverywhere()}><LogOut className="h-4 w-4" />{t('security.logoutAll')}</Button>
                <Button variant="ghost" onClick={() => void logout().then(() => navigate('/login'))}>{t('common.logout')}</Button>
                <p className="text-xs text-content-subtle">{session.user?.email}</p>
              </CardBody>
            </Card>
          </>
        )}
      </QueryState>
      <MfaEnrolmentDialog open={enrolOpen} onOpenChange={setEnrolOpen} onDone={() => void refreshSecurity()} />
      <StepUpDialog open={stepUpOpen} onOpenChange={setStepUpOpen} onDone={() => void refreshSecurity()} />
    </div>
  )
}

function OverviewCards({ overview }: { overview: SecurityOverview }) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label={t('security.signInSuccess')} value={overview.loginSuccess} icon={<ShieldCheck className="h-4 w-4" />} tone="accent" />
      <StatCard label={t('security.signInFailure')} value={overview.loginFailure} icon={<ShieldEllipsis className="h-4 w-4" />} tone="warning" />
      <StatCard label={t('security.lockouts')} value={overview.lockouts} tone="danger" />
      <StatCard label={t('security.mfaEvents')} value={overview.mfaEvents} tone="brand" />
    </div>
  )
}

export function SecurityCentrePage() {
  const { t } = useTranslation()
  const canRead = useCan('security.read')
  const overview = useSecurityOverview(canRead)
  const events = useSecurityEvents(canRead)
  const { stepUpActive, refresh } = useSession()
  const qc = useQueryClient()
  const [stepUpOpen, setStepUpOpen] = useState(false)
  if (!canRead) return <ForbiddenCard />
  const data = overview.data?.data

  async function afterStepUp() {
    await refresh()
    await qc.invalidateQueries()
  }

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title={t('security.titleCentre')} subtitle={t('security.subtitleCentre')}
        actions={<MockNotice mock={overview.data?.mock} compact />}
        breadcrumbs={[{ label: t('nav.group.safety') }, { label: t('nav.securityCentre') }]} />
      <QueryState isLoading={overview.isLoading} error={overview.error} onRetry={() => void overview.refetch()}>
        {() => data && (
          <>
            <OverviewCards overview={data} />
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <Card>
                <CardHeader title={t('security.auditChain')} />
                <CardBody className="space-y-2 text-sm">
                  <Badge tone={data.auditChain.ok ? 'success' : 'danger'} dot>
                    {data.auditChain.ok ? t('security.auditChainOk', { length: data.auditChain.length }) : t('security.auditChainBroken')}
                  </Badge>
                  <p className="text-content-muted">{t('security.activeSessions')} · <span className="tnum font-semibold text-content">{data.activeSessions}</span></p>
                </CardBody>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader title={t('security.exportAudit')} description={stepUpActive ? t('security.stepUpActive') : t('security.exportRequiresStepUp')}
                  action={stepUpActive
                    ? <Button size="sm" variant="outline" asChild><a href="/security/audit/export" download><Download className="h-4 w-4" />{t('security.exportAudit')}</a></Button>
                    : <Button size="sm" onClick={() => setStepUpOpen(true)}>{t('security.stepUpAction')}</Button>} />
                <CardBody><p className="text-sm text-content-muted">{t('security.subtitleCentre')}</p></CardBody>
              </Card>
            </div>
            <Card className="mt-5">
              <CardHeader title={t('security.recentEvents')} />
              <CardBody><EventList events={data.lastEvents} /></CardBody>
            </Card>
            <Card className="mt-5">
              <CardHeader title={t('security.events')} />
              <CardBody>
                <QueryState isLoading={events.isLoading} error={events.error} onRetry={() => void events.refetch()}>
                  {() => <EventList events={events.data?.data?.events ?? []} />}
                </QueryState>
              </CardBody>
            </Card>
          </>
        )}
      </QueryState>
      <StepUpDialog open={stepUpOpen} onOpenChange={setStepUpOpen} onDone={() => void afterStepUp()} />
    </div>
  )
}
