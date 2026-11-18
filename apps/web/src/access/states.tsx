import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Construction, GraduationCap, LockKeyhole, Mail, SearchX, ShieldCheck } from 'lucide-react'
import { Banner, Button, EmptyState, FormField, Input, Modal } from '@schoolos/ui'
import { stepUp } from '@schoolos/api-client'
import { useSession } from '../app/session'

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app">
      <div className="flex flex-col items-center gap-3 text-content-subtle">
        <GraduationCap className="h-8 w-8 animate-pulse text-brand-500" />
        <span className="text-sm">SchoolOS</span>
      </div>
    </div>
  )
}

function StateCard({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <div className="mx-auto max-w-xl py-12"><div className="ui-card p-8 text-center">{icon}{children}</div></div>
}

/** Branded in-shell 403. Never flashes protected content; always offers a way forward. */
export function AccessDenied({ reasonKey = 'access.deniedReason' }: { reasonKey?: string }) {
  const { t } = useTranslation()
  const mailto = `mailto:admin@school.local?subject=${encodeURIComponent(t('access.request'))}&body=${encodeURIComponent(t('access.requestBody'))}`
  return (
    <StateCard icon={<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-50 text-danger-600 dark:bg-danger-500/15"><LockKeyhole className="h-7 w-7" /></div>}>
      <h1 className="mt-4 font-display text-2xl font-bold text-content">{t('access.deniedTitle')}</h1>
      <p className="mt-2 text-sm text-content-muted">{t(reasonKey)}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button asChild><Link to="/">{t('auth.goHome')}</Link></Button>
        <Button asChild variant="outline"><a href={mailto}><Mail className="h-4 w-4" />{t('access.request')}</a></Button>
      </div>
    </StateCard>
  )
}

export function NotFoundState() {
  const { t } = useTranslation()
  return (
    <StateCard icon={<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-content-muted"><SearchX className="h-7 w-7" /></div>}>
      <h1 className="mt-4 font-display text-2xl font-bold text-content">{t('access.notFoundTitle')}</h1>
      <p className="mt-2 text-sm text-content-muted">{t('access.notFoundBody')}</p>
      <Button asChild className="mt-6"><Link to="/">{t('auth.goHome')}</Link></Button>
    </StateCard>
  )
}

export function TenantRequired() {
  const { t } = useTranslation()
  return (
    <StateCard icon={<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-content-muted"><ShieldCheck className="h-7 w-7" /></div>}>
      <h1 className="mt-4 font-display text-2xl font-bold text-content">{t('access.tenantTitle')}</h1>
      <p className="mt-2 text-sm text-content-muted">{t('access.tenantBody')}</p>
      <Button asChild className="mt-6"><Link to="/schools/select">{t('auth.schoolSelect')}</Link></Button>
    </StateCard>
  )
}

export function ComingSoon({ module }: { module?: string }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-2xl py-10">
      <EmptyState
        variant="inbox"
        title={t('soon.title')}
        description={`${module ?? ''} ${t('soon.body')}`.trim()}
        action={<Button asChild><Link to="/">{t('soon.back')}</Link></Button>}
      />
    </div>
  )
}

/** Step-up gate: validity is read from the session response only, never computed client-side. */
export function StepUpGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { refresh, stepUpActive } = useSession()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  if (stepUpActive) return <>{children}</>

  async function confirm() {
    setBusy(true)
    setError(undefined)
    try {
      await stepUp(code.trim())
      await refresh()
      setCode('')
    } catch {
      setError(t('security.stepUpFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <StateCard icon={<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15"><LockKeyhole className="h-7 w-7" /></div>}>
        <h1 className="mt-4 font-display text-2xl font-bold text-content">{t('access.stepUpTitle')}</h1>
        <p className="mt-2 text-sm text-content-muted">{t('access.stepUpBody')}</p>
        <div className="mt-6"><Button onClick={() => setCode('000000')}>{t('access.stepUpConfirm')}</Button></div>
      </StateCard>
      <Modal open={code.length > 0} onOpenChange={open => { if (!open) setCode('') }}
        title={t('access.stepUpTitle')} description={t('access.stepUpBody')}
        footer={<>
          <Button variant="ghost" onClick={() => setCode('')}>{t('common.cancel')}</Button>
          <Button loading={busy} disabled={code.trim().length < 6} onClick={() => void confirm()}>{t('access.stepUpConfirm')}</Button>
        </>}>
        {error && <Banner tone="danger" title={t('state.error')}>{error}</Banner>}
        <FormField label={t('auth.mfaCode')} hint={t('auth.mfaCodeHint')} required>
          {field => <Input {...field} value={code} onChange={event => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" autoFocus />}
        </FormField>
      </Modal>
    </>
  )
}

export function FlagDisabled() {
  const { t } = useTranslation()
  return (
    <StateCard icon={<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-content-muted"><Construction className="h-7 w-7" /></div>}>
      <h1 className="mt-4 font-display text-2xl font-bold text-content">{t('access.notFoundTitle')}</h1>
      <p className="mt-2 text-sm text-content-muted">{t('access.deniedFlag')}</p>
    </StateCard>
  )
}
