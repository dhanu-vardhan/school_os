import type { HTMLAttributes, ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ui-card', className)} {...props} />
}

export function CardHeader({ title, description, action, className }: {
  title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-line px-5 py-4', className)}>
      <div className="min-w-0">
        <h2 className="font-display text-base font-semibold text-content">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-content-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}

export function StatCard({ label, value, hint, trend, tone = 'brand', icon, onClick }: {
  label: string
  value: string | number
  hint?: string
  trend?: number
  tone?: 'brand' | 'accent' | 'warning' | 'danger' | 'info'
  icon?: ReactNode
  onClick?: () => void
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
    accent: 'bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-300',
    danger: 'bg-danger-50 text-danger-600 dark:bg-danger-500/15 dark:text-danger-300',
    info: 'bg-info-50 text-info-600 dark:bg-info-500/15 dark:text-info-300',
  }
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper onClick={onClick} className={cn('ui-card p-5 text-left', onClick && 'ui-card-hover w-full hover:border-brand-300')}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-content-subtle">{label}</span>
        {icon && <span className={cn('flex h-8 w-8 items-center justify-center rounded-md', tones[tone])}>{icon}</span>}
      </div>
      <div className="tnum mt-2 font-display text-3xl font-bold tracking-tight text-content">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-content-muted">
        {trend !== undefined && (
          <span className={cn('inline-flex items-center gap-0.5 font-medium', trend >= 0 ? 'text-accent-600' : 'text-danger-600')}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
        {hint}
      </div>
    </Wrapper>
  )
}
