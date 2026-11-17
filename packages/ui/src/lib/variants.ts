import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'focus-ring ui-state inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--btn-radius)] font-medium transition-all duration-fast ease-out disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-action-primary text-action-primary-fg shadow-sm hover:bg-action-primary-hover',
        secondary: 'bg-action-secondary text-action-secondary-fg hover:bg-action-secondary-hover',
        outline: 'border border-line-control bg-surface text-content hover:bg-surface-2 hover:border-action-ai-border',
        ghost: 'text-content-muted hover:bg-surface-3 hover:text-content',
        danger: 'bg-action-danger text-action-danger-fg shadow-sm hover:bg-action-danger-hover',
        'danger-outline': 'border border-status-danger-border bg-surface/0 text-status-danger hover:bg-status-danger-bg',
        success: 'bg-action-success text-action-success-fg shadow-sm hover:bg-action-success-hover',
        ai: 'border border-action-ai-border bg-action-ai text-action-ai-fg hover:bg-action-secondary-hover',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-5 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5',
  {
    variants: {
      tone: {
        neutral: 'border-line bg-surface-3 text-content-muted',
        brand: 'border-status-brand-border bg-status-brand-bg text-status-brand',
        success: 'border-status-success-border bg-status-success-bg text-status-success',
        warning: 'border-status-warning-border bg-status-warning-bg text-status-warning',
        danger: 'border-status-danger-border bg-status-danger-bg text-status-danger',
        info: 'border-status-info-border bg-status-info-bg text-status-info',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)
