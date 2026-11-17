import { Toaster, toast } from 'sonner'
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, RotateCcw, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Button } from './Button'

export { toast }

export function ToastHost() {
  return <Toaster position="bottom-right" richColors closeButton theme="system" style={{ width: 'min(356px, calc(100vw - 2rem))' }} />
}

export function Banner({ tone = 'info', title, children, action, onDismiss }: {
  tone?: 'info' | 'warning' | 'danger' | 'success'; title?: string; children?: ReactNode
  action?: ReactNode; onDismiss?: () => void
}) {
  const styles = {
    info: 'border-info-200 bg-info-50 text-info-900 dark:border-info-500/30 dark:bg-info-500/10 dark:text-info-200',
    warning: 'border-warning-200 bg-warning-50 text-warning-900 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200',
    danger: 'border-danger-200 bg-danger-50 text-danger-900 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-200',
    success: 'border-accent-200 bg-accent-50 text-accent-900 dark:border-accent-500/30 dark:bg-accent-500/10 dark:text-accent-200',
  }[tone]
  const Icon = { info: Info, warning: AlertTriangle, danger: ShieldAlert, success: CheckCircle2 }[tone]
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', styles)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'text-[0.8125rem] opacity-90')}>{children}</div>}
      </div>
      {action}
      {onDismiss && <Button variant="ghost" size="icon-sm" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 opacity-70">×</Button>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('ui-skeleton', className)} aria-hidden />
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="ui-card flex items-center gap-4 p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/5" /><Skeleton className="h-3 w-1/4" /></div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  )
}

export function Progress({ value, max = 100, label, tone = 'brand' }: {
  value: number; max?: number; label?: string; tone?: 'brand' | 'accent' | 'warning' | 'danger'
}) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100))
  const colors = { brand: 'bg-brand-600', accent: 'bg-accent-600', warning: 'bg-warning-500', danger: 'bg-danger-600' }
  return (
    <div className="w-full">
      {label && <div className="mb-1 flex justify-between text-xs text-content-muted"><span>{label}</span><span className="tnum">{Math.round(pct)}%</span></div>}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className={cn('h-full rounded-full transition-all duration-slow ease-out', colors[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function EmptyState({ title, description, action, variant = 'inbox' }: {
  title: string; description?: string; action?: ReactNode; variant?: 'inbox' | 'search' | 'calendar'
}) {
  const drawings = {
    inbox: <><rect x="30" y="46" width="100" height="66" rx="10" /><path d="M30 62h30l10 12h20l10-12h30" /></>,
    search: <><circle cx="70" cy="62" r="28" /><path d="M90 84l24 24" /></>,
    calendar: <><rect x="32" y="42" width="96" height="74" rx="10" /><path d="M32 62h96M54 34v16M106 34v16" /></>,
  }
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <svg width="150" height="120" viewBox="0 0 160 130" fill="none" stroke="rgb(var(--brand-300))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="80" cy="65" r="54" fill="rgb(var(--brand-50))" stroke="none" />
        {drawings[variant]}
      </svg>
      <h3 className="mt-4 font-display text-lg font-semibold text-content">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-content-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message, correlationId, onRetry, retryLabel = 'Retry' }: {
  title?: string; message?: string; correlationId?: string; onRetry?: () => void; retryLabel?: string
}) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-50 text-danger-600 dark:bg-danger-500/15">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-content">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-content-muted">{message ?? 'We could not load this content. Please try again.'}</p>
      {correlationId && <p className="mt-2 font-mono text-xs text-content-subtle">Ref: {correlationId}</p>}
      {onRetry && <Button className="mt-5" variant="outline" onClick={onRetry}><RotateCcw className="h-4 w-4" />{retryLabel}</Button>}
    </div>
  )
}

export function InlineNote({ children }: { children: ReactNode }) {
  return <p className="flex items-center gap-1.5 text-xs text-content-subtle"><Inbox className="h-3.5 w-3.5" />{children}</p>
}
