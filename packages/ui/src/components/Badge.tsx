import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'
import { badgeVariants } from '../lib/variants'
import type { VariantProps } from 'class-variance-authority'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

const statusTones: Record<string, NonNullable<VariantProps<typeof badgeVariants>['tone']>> = {
  open: 'danger', under_review: 'warning', closed: 'success',
  proposed: 'brand', edited: 'info', approved: 'success', rejected: 'neutral',
  present: 'success', absent: 'danger', late: 'warning', pending: 'neutral',
  active: 'success', draft: 'neutral', published: 'success', waitlisted: 'warning',
  paid: 'success', due: 'warning', overdue: 'danger', failed: 'danger',
}

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return <Badge tone={statusTones[status] ?? 'neutral'} dot>{label ?? status.replaceAll('_', ' ')}</Badge>
}
