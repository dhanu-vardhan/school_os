import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, WifiOff, LockKeyhole, Construction } from 'lucide-react'
import { Badge, Banner, Breadcrumbs, Button, EmptyState, ErrorState, Skeleton, toast } from '@schoolos/ui'
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

export type SkeletonVariant = 'list' | 'table' | 'cards' | 'detail' | 'dashboard'

/** Shape-matched skeletons keep the page height stable while a query loads. */
export function ScreenLoading({ label, variant = 'list' }: { label?: string; variant?: SkeletonVariant }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4" aria-busy="true">
      {variant === 'dashboard' && <>
        <div className="flex items-center justify-between gap-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-9 w-32" /></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ui-card space-y-3 p-5"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-16" /><Skeleton className="h-3 w-28" /></div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map(i => (
            <div key={i} className="ui-card space-y-3 p-5"><Skeleton className="h-4 w-40" />{Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="h-9 w-full" />)}</div>
          ))}
        </div>
      </>}
      {variant === 'table' && <>
        <div className="flex items-center justify-between gap-4"><Skeleton className="h-9 w-48" /><Skeleton className="h-9 w-32" /></div>
        <div className="ui-card divide-y divide-line/60">
          <div className="flex gap-4 px-4 py-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-3 flex-1" />)}</div>
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={row} className="flex gap-4 px-4 py-4">{Array.from({ length: 5 }).map((_, cell) => <Skeleton key={cell} className="h-4 flex-1" />)}</div>
          ))}
        </div>
      </>}
      {variant === 'cards' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ui-card space-y-3 p-5"><Skeleton className="h-28 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></div>
          ))}
        </div>
      )}
      {variant === 'detail' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="ui-card space-y-4 p-5 lg:col-span-2"><Skeleton className="h-5 w-48" />{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          <div className="ui-card space-y-4 p-5"><Skeleton className="h-5 w-32" />{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        </div>
      )}
      {variant === 'list' && (
        <div className="ui-card space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      )}
      <span className="ui-sr-only" role="status">{label ?? t('state.loading')}</span>
    </div>
  )
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

export function QueryState({ isLoading, error, children, onRetry, empty, isEmpty, loading }: {
  isLoading: boolean
  error?: unknown
  /** Pass a function so data-dependent JSX is not evaluated while the query is still loading. */
  children: ReactNode | (() => ReactNode)
  onRetry?: () => void
  empty?: ReactNode
  isEmpty?: boolean
  /** Shape-matched loading UI; defaults to the generic list skeleton. */
  loading?: ReactNode
}) {
  if (isLoading) return <>{loading ?? <ScreenLoading />}</>
  if (error) return <ScreenError error={error} onRetry={onRetry} />
  if (isEmpty) return <>{empty ?? <ScreenEmpty />}</>
  return <>{typeof children === 'function' ? children() : children}</>
}

export function AlertIcon({ tone }: { tone?: string }) {
  return tone === 'danger' ? <AlertTriangle className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />
}
