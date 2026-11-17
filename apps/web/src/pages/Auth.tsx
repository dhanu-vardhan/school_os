import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Building2, CheckCircle2, GraduationCap, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import { Avatar, Badge, Banner, Button, Card, CardBody, Skeleton, cn, toast } from '@schoolos/ui'
import { demoUsers, useApiQuery, useSchools } from '@schoolos/api-client'
import { ROLE_ACCENT, ROLE_FAMILY } from '@schoolos/shared'
import { useSession } from '../app/session'
import { PageHeader } from '../components/Screen'

const familyTone: Record<string, 'brand' | 'success' | 'info' | 'danger' | 'warning'> = {
  school: 'brand', teaching: 'info', family: 'success', restricted: 'danger', platform: 'warning',
}

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, config } = useSession()
  const [schoolId, setSchoolId] = useState<string | undefined>()
  const [busyRole, setBusyRole] = useState<string>()
  const usersQuery = useApiQuery(['demo-users'], demoUsers)

  const schools = useMemo(() => {
    const map = new Map<string, string>()
    usersQuery.data?.data?.forEach(u => map.set(u.schoolId, u.schoolName))
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [usersQuery.data])

  const pick = async (role: string) => {
    setBusyRole(role)
    try {
      await login(role, schoolId)
      toast.success(`${t('auth.signIn')} · ${t(`role.${role}`)}`)
      navigate('/app/dashboard', { replace: true })
    } catch {
      toast.error(t('state.error'))
    } finally { setBusyRole(undefined) }
  }

  return (
    <div className="min-h-screen bg-app px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-neutral-0 shadow-md"><GraduationCap className="h-6 w-6" /></span>
          <div>
            <h1 className="font-display text-xl font-bold text-content">SchoolOS</h1>
            <p className="text-xs text-content-muted">{t('app.tagline')}</p>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-line bg-gradient-to-br from-brand-50 to-accent-50 px-6 py-8 dark:from-brand-500/10 dark:to-accent-500/10 sm:px-10">
            <h2 className="font-display text-3xl font-bold tracking-tight text-content">{t('auth.welcome')}</h2>
            <p className="mt-2 max-w-2xl text-sm text-content-muted">{t('auth.subtitle')}</p>
            <div className="mt-4"><Banner tone="info" title={t('auth.demoOnly')} /></div>
          </div>
          <CardBody className="p-6 sm:p-10">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <label htmlFor="login-school" className="flex items-center gap-2 text-sm font-medium text-content"><Building2 className="h-4 w-4 text-content-subtle" />{t('auth.schoolSelect')}</label>
              <select id="login-school" value={schoolId ?? ''} onChange={e => setSchoolId(e.target.value || undefined)}
                className="focus-ring h-10 min-w-64 rounded-md border border-line-strong bg-surface px-3 text-sm text-content">
                <option value="">{t('common.all')}</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {usersQuery.isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
            ) : usersQuery.isError ? (
              <Banner tone="danger" title={t('state.error')}>{t('state.errorHint')}</Banner>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {usersQuery.data?.data?.map(user => (
                  <Button key={`${user.role}-${user.schoolId}`} variant="bare" onClick={() => void pick(user.role)}
                    disabled={busyRole !== undefined}
                    className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md disabled:opacity-60">
                    <Avatar name={user.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-content">{user.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge tone={familyTone[ROLE_FAMILY[user.role as keyof typeof ROLE_FAMILY] ?? 'school']}>{t(`role.${user.role}`)}</Badge>
                        {ROLE_ACCENT[user.role as keyof typeof ROLE_ACCENT] === 'safeguarding' && <ShieldCheck className="h-3.5 w-3.5 text-danger-500" />}
                      </div>
                    </div>
                    {busyRole === user.role ? <CheckCircle2 className="h-4 w-4 animate-pulse text-brand-500" /> : <ArrowRight className="h-4 w-4 text-content-subtle transition-transform group-hover:translate-x-1" />}
                  </Button>
                ))}
              </div>
            )}
            {config.authMode === 'oidc' && <p className="mt-6 text-xs text-content-subtle">OIDC · {config.apiBasePath}</p>}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export function SchoolSelectPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { role, schoolId, login } = useSession()
  const schoolsQuery = useSchools()
  const [busy, setBusy] = useState(false)

  const choose = async (id: string) => {
    if (!role) return
    setBusy(true)
    try { await login(role, id); navigate('/app/dashboard', { replace: true }) }
    finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-3xl py-10">
      <PageHeader title={t('auth.schoolSelect')} subtitle={t('auth.schoolSelectBody')} />
      <div className="space-y-3">
        {schoolsQuery.isLoading && <Skeleton className="h-24 rounded-lg" />}
        {schoolsQuery.data?.data?.map(school => (
          <Button key={school.id} variant="bare" disabled={busy} onClick={() => void choose(school.id)}
            aria-label={school.name}
            className={cn('ui-card flex w-full items-center gap-4 p-5 text-left transition-all hover:border-brand-300 hover:shadow-md disabled:opacity-60',
              school.id === schoolId && 'border-brand-400 bg-brand-50/40 dark:bg-brand-500/10')}>
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">{school.logoText ?? school.name.slice(0, 2)}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-content">{school.name}</p>
              <p className="text-xs text-content-muted">{school.address} · {school.academicYear}</p>
            </div>
            {school.id === schoolId && <Badge tone="success" dot>{t('common.yes')}</Badge>}
          </Button>
        ))}
      </div>
    </div>
  )
}

export function SessionExpiredPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-md py-20">
      <Card className="p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-50 text-warning-600 dark:bg-warning-500/15"><LockKeyhole className="h-7 w-7" /></div>
        <h1 className="mt-4 font-display text-2xl font-bold text-content">{t('auth.sessionExpired')}</h1>
        <p className="mt-2 text-sm text-content-muted">{t('auth.sessionExpiredBody')}</p>
        <Button asChild className="mt-6"><Link to="/login">{t('auth.signIn')}</Link></Button>
      </Card>
    </div>
  )
}

export function ForbiddenPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-md py-20">
      <Card className="p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-50 text-danger-600 dark:bg-danger-500/15"><LockKeyhole className="h-7 w-7" /></div>
        <h1 className="mt-4 font-display text-2xl font-bold text-content">{t('auth.forbidden')}</h1>
        <p className="mt-2 text-sm text-content-muted">{t('auth.forbiddenBody')}</p>
        <Button asChild className="mt-6"><Link to="/app/dashboard">{t('auth.goHome')}</Link></Button>
      </Card>
    </div>
  )
}

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <Sparkles className="mx-auto h-10 w-10 text-brand-400" />
      <p className="mt-4 font-display text-6xl font-bold text-brand-500">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-content">{t('auth.notFound')}</h1>
      <p className="mt-2 text-sm text-content-muted">{t('auth.notFoundBody')}</p>
      <Button asChild className="mt-6"><Link to="/app/dashboard">{t('auth.goHome')}</Link></Button>
    </div>
  )
}
