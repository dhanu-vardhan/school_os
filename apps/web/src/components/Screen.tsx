import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, WifiOff, LockKeyhole, Construction } from 'lucide-react'
import { Badge, Banner, Breadcrumbs, Button, EmptyState, ErrorState, SkeletonList, toast } from '@schoolos/ui'
import type { ApiError } from '@schoolos/api-client'
import { useOnline } from '../app/hooks'

export function PageHeader({ title, subtitle, actions, breadcrumbs }: {
  title: string
  subtitle?: string
  actions?: ReactNode
  breadcrumbs?: { label: string; to?: string }[]
}) {
  return (
    <div className="mb-6">
      {breadcrumbs && <div className="mb-3"><Breadcrumbs items={breadcrumbs} /></div>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-content sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-content-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function MockNotice({ mock, compact }: { mock?: boolean; compact?: boolean }) {
  const { t } = useTranslation()
  if (!mock) return null
  return (
    <Badge tone="warning" className="max-w-full shrink-0 whitespace-normal text-left" title={t('common.mockHint')}>
      {t('common.mock')}
      {!compact && <span className="hidden sm:inline"> · {t('common.mockHint')}</span>}
    </Badge>
  )
}

export function OfflineNotice() {
  const { t } = useTranslation()
  const online = useOnline()
  if (online) return null
  return <div className="mb-4"><Banner tone="warning" title={t('common.offline')}>{t('state.offline')}</Banner></div>
}

export function PartialNotice({ show = false }: { show?: boolean }) {
  const { t } = useTranslation()
  if (!show) return null
  return <div className="mb-4"><Banner tone="info" title={t('state.partial')} /></div>
}

export function ScreenLoading({ label }: { label?: string }) {
  const { t } = useTranslation()
  return <div className="space-y-4"><SkeletonList rows={5} /><span className="ui-sr-only" role="status">{label ?? t('state.loading')}</span></div>
}

export function ScreenError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation()
  const err = error as ApiError | undefined
  const notImplemented = err?.code === 'NOT_IMPLEMENTED'
  return (
    <div className="ui-card">
      <ErrorState
        title={notImplemented ? t('state.partial') : t('state.error')}
        message={notImplemented ? err?.message : (err?.message || t('state.errorHint'))}
        correlationId={err?.correlationId}
        onRetry={onRetry}
        retryLabel={t('common.retry')}
      />
    </div>
  )
}

export function ScreenEmpty({ title, description, action }: { title?: string; description?: string; action?: ReactNode }) {
  const { t } = useTranslation()
  return <div className="ui-card"><EmptyState title={title ?? t('state.empty')} description={description ?? t('state.emptyHint')} action={action} /></div>
}

export function ForbiddenCard() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-lg py-16">
      <div className="ui-card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-50 text-danger-600 dark:bg-danger-500/15"><LockKeyhole className="h-7 w-7" /></div>
        <h1 className="mt-4 font-display text-2xl font-bold text-content">{t('auth.forbidden')}</h1>
        <p className="mt-2 text-sm text-content-muted">{t('auth.forbiddenBody')}</p>
        <Button asChild className="mt-6"><Link to="/app/dashboard">{t('auth.goHome')}</Link></Button>
      </div>
    </div>
  )
}

export function NotImplementedCard({ feature }: { feature?: string }) {
  const { t } = useTranslation()
  return (
    <div className="ui-card p-8">
      <EmptyState
        variant="inbox"
        title={feature ?? t('state.partial')}
        description={t('state.errorHint')}
        action={<Button variant="outline" onClick={() => toast.info(t('common.mockHint'))}><Construction className="h-4 w-4" />{t('common.mock')}</Button>}
      />
    </div>
  )
}

export function QueryState({ isLoading, error, children, onRetry, empty, isEmpty }: {
  isLoading: boolean
  error?: unknown
  /** Pass a function so data-dependent JSX is not evaluated while the query is still loading. */
  children: ReactNode | (() => ReactNode)
  onRetry?: () => void
  empty?: ReactNode
  isEmpty?: boolean
}) {
  if (isLoading) return <ScreenLoading />
  if (error) return <ScreenError error={error} onRetry={onRetry} />
  if (isEmpty) return <>{empty ?? <ScreenEmpty />}</>
  return <>{typeof children === 'function' ? children() : children}</>
}

export function AlertIcon({ tone }: { tone?: string }) {
  return tone === 'danger' ? <AlertTriangle className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />
}
