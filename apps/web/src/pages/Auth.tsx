import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight, Building2, CheckCircle2, GraduationCap, KeyRound, LockKeyhole, Mail,
  ShieldCheck, Sparkles, Smartphone,
} from 'lucide-react'
import {
  Avatar, Badge, Banner, Button, BrandMark, Card, CardBody, Checkbox, FormField, Input, Skeleton, cn, toast,
} from '@schoolos/ui'
import {
  acceptInvitation, authSignIn, currentDemoTotp, demoSignIn, forgotPassword, resetPassword,
  sessionStore, useDemoAccounts, verifyMfa,
} from '@schoolos/api-client'
import { ROLE_ACCENT, ROLE_FAMILY, toDisplayRole } from '@schoolos/shared'
import type { DemoAccount, MfaChallenge } from '@schoolos/shared'
import { useSession } from '../app/session'
import { PageHeader } from '../components/Screen'

const familyTone: Record<string, 'brand' | 'success' | 'info' | 'danger' | 'warning'> = {
  school: 'brand', teaching: 'info', family: 'success', restricted: 'danger', platform: 'warning',
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className={cn('flex items-center gap-3', compact ? '' : 'mb-2')}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-0/10 text-neutral-0 shadow-md ring-1 ring-neutral-0/20">
        <BrandMark size={26} className="text-neutral-0" />
      </span>
      <div>
        <h1 className={cn('font-display font-bold text-neutral-0', compact ? 'text-lg' : 'text-4xl')}>{t('app.name')}</h1>
        {!compact && <p className="text-sm text-brand-100">{t('app.tagline')}</p>}
      </div>
    </div>
  )
}

type Challenge = MfaChallenge & { accountKey?: string }

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { config, refresh } = useSession()
  const [schoolId, setSchoolId] = useState<string | undefined>()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()
  const [challenge, setChallenge] = useState<Challenge>()
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const accountsQuery = useDemoAccounts(config.demoEnabled)

  const schools = useMemo(() => {
    const map = new Map<string, string>()
    accountsQuery.data?.data?.schools?.forEach(s => map.set(s.id, s.name))
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [accountsQuery.data])

  async function afterAuth() {
    await qc.invalidateQueries({ queryKey: ['session'] })
    await qc.invalidateQueries()
    await refresh()
    const stored = sessionStore.get()
    const target = (stored.user?.memberships?.length ?? 0) > 1 && !schoolId ? '/schools/select' : '/app/dashboard'
    navigate(target, { replace: true })
  }

  async function handleResult(result: Awaited<ReturnType<typeof authSignIn>>['data'] | Awaited<ReturnType<typeof demoSignIn>>['data']) {
    if (!result) return
    if ('mode' in result && result.mode === 'oidc') {
      window.location.assign(result.authorizationUrl)
      return
    }
    if ('mfaRequired' in result && result.mfaRequired) {
      setChallenge(result)
      setCode('')
      return
    }
    if ('authenticated' in result && result.authenticated) await afterAuth()
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault()
    setBusy('password')
    setError(undefined)
    try {
      const res = await authSignIn({ identifier, password, remember, returnTo: '/app/dashboard' })
      await handleResult(res.data)
    } catch (err) {
      setError(errorMessage(err, t('auth.invalidCredentials')))
    } finally { setBusy(undefined) }
  }

  async function pickDemo(account: DemoAccount) {
    if (!account.demoPassword) {
      setIdentifier(account.email)
      setError(t('auth.demoPasswordMissing'))
      return
    }
    setBusy(account.key)
    setError(undefined)
    try {
      const res = await demoSignIn({ key: account.key, password: account.demoPassword, schoolId: schoolId ?? account.schoolId, remember })
      await handleResult({ ...res.data, ...(('mfaRequired' in res.data) ? { accountKey: account.key } : {}) } as any)
    } catch (err) {
      setError(errorMessage(err, t('auth.invalidCredentials')))
    } finally { setBusy(undefined) }
  }

  async function fillDemoCode() {
    if (!challenge?.accountKey) return
    try {
      const res = await currentDemoTotp(challenge.accountKey)
      setCode(res.data.code)
    } catch { toast.error(t('state.error')) }
  }

  async function submitMfa(event: React.FormEvent) {
    event.preventDefault()
    if (!challenge) return
    setBusy('mfa')
    setError(undefined)
    try {
      await verifyMfa({ challengeId: challenge.challengeId, code, mode: challenge.account ? 'demo' : 'oidc' })
      await afterAuth()
    } catch (err) {
      setError(errorMessage(err, t('auth.invalidCode')))
    } finally { setBusy(undefined) }
  }

  if (challenge) {
    return (
      <div className="min-h-screen bg-app px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-lg">
          <BrandLockup compact />
          <Card>
            <CardBody className="p-6 sm:p-8">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15"><Smartphone className="h-5 w-5" /></span>
                <div>
                  <h2 className="font-display text-xl font-bold text-content">{t('auth.mfaTitle')}</h2>
                  <p className="text-sm text-content-muted">{t('auth.mfaBody')}</p>
                </div>
              </div>
              {error && <Banner tone="danger" title={t('state.error')}>{error}</Banner>}
              <form onSubmit={submitMfa} className="mt-4 space-y-4">
                <FormField label={t('auth.mfaCode')} hint={t('auth.mfaCodeHint')} required>
                  {field => (
                    <Input {...field} value={code} onChange={e => setCode(e.target.value)} inputMode="numeric"
                      autoComplete="one-time-code" autoFocus placeholder="123 456" />
                  )}
                </FormField>
                {challenge.demo?.totpSecret && (
                  <Button type="button" variant="outline" size="sm" onClick={() => void fillDemoCode()} disabled={busy === 'mfa'}>
                    {t('auth.useDemoCode')}
                  </Button>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={busy === 'mfa' || code.trim().length < 6}>
                    {busy === 'mfa' ? t('common.loading') : t('auth.verify')}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => { setChallenge(undefined); setCode(''); setError(undefined) }}>
                    {t('auth.useAnotherAccount')}
                  </Button>
                </div>
              </form>
              <p className="mt-4 text-xs text-content-subtle">{t('auth.backupCodeHint')}</p>
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  const benefits = [
    { icon: Sparkles, label: 'Smarter School Management' },
    { icon: Mail, label: 'Real-Time Communication' },
    { icon: GraduationCap, label: 'Academic Performance Tracking' },
    { icon: Building2, label: 'Connected School Community' },
  ]

  return (
    <div className="min-h-screen bg-app lg:grid lg:grid-cols-[55%_45%]">
      {/* Brand panel */}
      <section className="relative flex min-h-[34vh] flex-col justify-center overflow-hidden bg-gradient-to-br from-brand-950 to-brand-600 px-6 py-10 text-neutral-0 lg:min-h-screen lg:px-[12%] lg:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
          <svg className="h-full w-full" viewBox="0 0 800 800" preserveAspectRatio="none" aria-hidden>
            <g stroke="currentColor" strokeWidth="1" fill="none">
              {Array.from({ length: 18 }).map((_, i) => (
                <line key={i} x1={i * 48} y1="0" x2={i * 48 + 200} y2="800" />
              ))}
              {Array.from({ length: 12 }).map((_, i) => (
                <circle key={i} cx={60 + i * 62} cy={80 + (i % 5) * 140} r="2.5" fill="currentColor" />
              ))}
            </g>
          </svg>
        </div>
        <div className="pointer-events-none absolute right-6 top-6 opacity-[0.12] lg:right-10 lg:top-10">
          <svg width="260" height="260" viewBox="0 0 260 260" aria-hidden>
            <g fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="10" y="10" width="44" height="44" rx="8" />
              <circle cx="200" cy="40" r="18" />
              <path d="M120 200 l30 -40 l30 40 z" />
              <path d="M80 120 q40 -30 80 0 t80 0" />
            </g>
          </svg>
        </div>
        <div className="relative z-10 space-y-8">
          <BrandLockup />
          <h1 className="max-w-[22rem] text-balance text-4xl font-bold leading-tight lg:text-[56px]">
            One Platform. Every School Connection.
          </h1>
          <p className="max-w-[34rem] text-lg text-brand-100 lg:text-xl">
            Bringing parents, teachers, students and school administrators together through one intelligent platform.
          </p>
          <ul className="space-y-3">
            {benefits.map(b => (
              <li key={b.label} className="flex items-center gap-3 text-base text-brand-50 lg:text-lg">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-0/10">
                  <b.icon className="h-5 w-5" />
                </span>
                {b.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center bg-app px-4 py-8 lg:px-6 lg:py-10">
        <div className="-mt-10 w-full max-w-[540px] rounded-[24px] bg-surface p-8 shadow-xl ring-1 ring-line lg:mt-0 lg:p-12">
          <div className="mb-6 text-center">
            <h2 className="font-display text-[32px] font-bold tracking-tight text-content">{t('auth.welcome')}</h2>
            <p className="mt-1 text-sm text-content-muted">{t('auth.subtitle')}</p>
          </div>
          {error && <Banner tone="danger" title={t('state.error')}>{error}</Banner>}
          {config.demoEnabled && <Banner tone="info" title={t('auth.demoOnly')} />}
          <form onSubmit={submitPassword} className="mt-4 space-y-4">
            <FormField label="School ID / School Code" required>
              {field => (
                <Input {...field} value={schoolId ?? ''} onChange={e => setSchoolId(e.target.value || undefined)}
                  placeholder="Ask your school for your code" autoComplete="organization" />
              )}
            </FormField>
            <FormField label={t('auth.email')} required>
              {field => (
                <Input {...field} type="email" autoComplete="username" value={identifier}
                  onChange={e => setIdentifier(e.target.value)} placeholder="prenom.nom@ecole.fr" />
              )}
            </FormField>
            <FormField label={t('auth.password')} required>
              {field => (
                <div className="relative">
                  <Input {...field} type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password}
                    onChange={e => setPassword(e.target.value)} className="pr-20" />
                  <Button type="button" variant="bare" size="sm" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-brand-700 hover:underline dark:text-brand-300">
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                </div>
              )}
            </FormField>
            <div className="flex items-center justify-between gap-3">
              <Checkbox checked={remember} onCheckedChange={value => setRemember(value === true)} label={t('auth.remember')} />
              <Link to="/forgot-password" className="focus-ring text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
                {t('auth.forgot')}
              </Link>
            </div>
            <Button type="submit" className="h-14 w-full rounded-full" disabled={busy === 'password' || !identifier || !password}>
              {busy === 'password' ? t('common.loading') : t('auth.signIn')}
            </Button>
            {config.passkeyEnabled && (
              <Button type="button" variant="outline" className="h-12 w-full rounded-full">
                Sign in with a passkey
              </Button>
            )}
            <div className="text-center">
              <Link to="/support" className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
                Help &amp; Support
              </Link>
            </div>
            {config.demoEnabled && (
              <div className="space-y-2 border-t border-line pt-4">
                <Button type="button" variant="outline" className="w-full" onClick={() => { /* demo picker below */ }}>
                  Try the demo
                </Button>
                <div className="grid max-h-[40vh] gap-2 overflow-y-auto">
                  {accountsQuery.data?.data?.accounts?.filter(a => !a.legacy && (!schoolId || a.schools.some(s => s.id === schoolId))).map(account => {
                    const role = toDisplayRole(account.role) ?? account.role.toLowerCase()
                    return (
                      <Button key={account.key} variant="bare" onClick={() => void pickDemo(account)}
                        disabled={busy !== undefined}
                        className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left transition-all hover:border-brand-300 hover:shadow-md disabled:opacity-60">
                        <Avatar name={account.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-content">{account.name}</p>
                          <p className="truncate text-xs text-content-muted">{account.title}</p>
                        </div>
                        {busy === account.key ? <CheckCircle2 className="h-4 w-4 animate-pulse text-brand-500" /> : <ArrowRight className="h-4 w-4 text-content-subtle transition-transform group-hover:translate-x-1" />}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}
          </form>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-content-subtle">
            <ShieldCheck className="h-3.5 w-3.5" /> Protected sign-in
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-content-subtle">
            <span>FR / EN</span>
            <span>·</span>
            <span>Terms</span>
            <span>·</span>
            <span>Privacy Policy</span>
            <span>·</span>
            <span>v0.0.1</span>
          </div>
        </div>
      </section>
    </div>
  )
}

function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { message?: string })?.message
  return message && message.length < 180 ? message : fallback
}

export function SchoolSelectPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { memberships, schoolId, switchSchool } = useSession()
  const [busy, setBusy] = useState(false)

  const choose = async (id: string) => {
    setBusy(true)
    try {
      await switchSchool(id)
      toast.success(t('common.school'))
      navigate('/app/dashboard', { replace: true })
    } catch {
      toast.error(t('state.error'))
    } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-3xl py-10">
      <PageHeader title={t('auth.schoolSelect')} subtitle={t('auth.schoolSelectBody')} />
      <div className="space-y-3">
        {memberships.length === 0 && <Banner tone="info" title={t('auth.noMemberships')} />}
        {memberships.map(membership => (
          <Button key={membership.schoolId} variant="bare" disabled={busy} onClick={() => void choose(membership.schoolId)}
            aria-label={membership.schoolName}
            className={cn('ui-card flex w-full items-center gap-4 p-5 text-left transition-all hover:border-brand-300 hover:shadow-md disabled:opacity-60',
              membership.schoolId === schoolId && 'border-brand-400 bg-brand-50/40 dark:bg-brand-500/10')}>
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">{membership.schoolName.slice(0, 2)}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-content">{membership.schoolName}</p>
              <p className="text-xs text-content-muted">{t(`role.${toDisplayRole(membership.role) ?? 'teacher'}`)}</p>
            </div>
            {membership.schoolId === schoolId && <Badge tone="success" dot>{t('common.yes')}</Badge>}
          </Button>
        ))}
      </div>
    </div>
  )
}

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [identifier, setIdentifier] = useState('')
  const [sent, setSent] = useState(false)
  const [demoToken, setDemoToken] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      const res = await forgotPassword(identifier)
      setSent(true)
      setDemoToken(res.data.demoToken)
    } catch { toast.error(t('state.error')) } finally { setBusy(false) }
  }

  return (
    <AuthShell title={t('auth.forgot')} subtitle={t('auth.forgotBody')}>
      {sent ? (
        <div className="space-y-4">
          <Banner tone="success" title={t('auth.resetSent')}>{t('auth.resetSentBody')}</Banner>
          {demoToken && (
            <Button asChild className="w-full"><Link to={`/reset-password?token=${encodeURIComponent(demoToken)}`}>{t('auth.continueDemoReset')}</Link></Button>
          )}
          <Button asChild variant="ghost" className="w-full"><Link to="/login">{t('auth.backToSignIn')}</Link></Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <FormField label={t('auth.email')} required>
            {field => <Input {...field} type="email" value={identifier} onChange={e => setIdentifier(e.target.value)} autoComplete="username" />}
          </FormField>
          <Button type="submit" className="w-full" disabled={busy || !identifier}>{busy ? t('common.loading') : t('auth.sendResetLink')}</Button>
          <Button asChild variant="ghost" className="w-full"><Link to="/login">{t('auth.backToSignIn')}</Link></Button>
        </form>
      )}
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const token = params.get('token') ?? ''

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (password !== confirm) { setError(t('auth.passwordMismatch')); return }
    setBusy(true); setError(undefined)
    try {
      await resetPassword({ token, password })
      toast.success(t('auth.passwordReset'))
      navigate('/login', { replace: true })
    } catch (err) { setError(errorMessage(err, t('auth.resetFailed'))) } finally { setBusy(false) }
  }

  return (
    <AuthShell title={t('auth.choosePassword')} subtitle={t('auth.passwordPolicy')}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Banner tone="danger" title={t('state.error')}>{error}</Banner>}
        <FormField label={t('auth.newPassword')} required>
          {field => <Input {...field} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />}
        </FormField>
        <FormField label={t('auth.confirmPassword')} required>
          {field => <Input {...field} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />}
        </FormField>
        <Button type="submit" className="w-full" disabled={busy || !password || !token}>{busy ? t('common.loading') : t('auth.resetPassword')}</Button>
        {!token && <Banner tone="warning" title={t('auth.missingToken')} />}
      </form>
    </AuthShell>
  )
}

export function InvitationPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true); setError(undefined)
    try {
      await acceptInvitation({ token: params.get('token') ?? undefined, email, password, privileged: params.get('privileged') === 'true' })
      toast.success(t('auth.invitationAccepted'))
      navigate('/login', { replace: true })
    } catch (err) { setError(errorMessage(err, t('auth.inviteFailed'))) } finally { setBusy(false) }
  }

  return (
    <AuthShell title={t('auth.acceptInvitation')} subtitle={t('auth.acceptInvitationBody')}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Banner tone="danger" title={t('state.error')}>{error}</Banner>}
        <FormField label={t('auth.email')} required>
          {field => <Input {...field} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" />}
        </FormField>
        <FormField label={t('auth.newPassword')} hint={t('auth.passwordPolicy')} required>
          {field => <Input {...field} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />}
        </FormField>
        <Button type="submit" className="w-full" disabled={busy || !email || !password}>{busy ? t('common.loading') : t('auth.acceptInvitation')}</Button>
        <p className="flex items-center gap-2 text-xs text-content-subtle"><Mail className="h-3.5 w-3.5" />{t('auth.inviteMfaNote')}</p>
      </form>
    </AuthShell>
  )
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-app px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-md">
        <BrandLockup compact />
        <Card>
          <CardBody className="p-6 sm:p-8">
            <div className="mb-5">
              <h2 className="font-display text-2xl font-bold text-content">{title}</h2>
              <p className="mt-1 text-sm text-content-muted">{subtitle}</p>
            </div>
            {children}
          </CardBody>
        </Card>
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
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild><Link to="/app/dashboard">Go to my dashboard</Link></Button>
          <Button asChild variant="outline"><Link to="/app/platform/support">Request access</Link></Button>
        </div>
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
