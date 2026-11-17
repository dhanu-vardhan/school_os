import { cva } from 'class-variance-authority'

/** Behaviour shared by every action, including bare/card-like actions. */
const interactive = 'focus-ring ui-state transition-all duration-fast ease-out disabled:pointer-events-none disabled:opacity-50'
/** Visual shape added by the standard (non-bare) variants. */
const shape = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--btn-radius)] font-medium active:scale-[0.98]'

export const buttonVariants = cva(interactive, {
  variants: {
    variant: {
      primary: `${shape} bg-action-primary text-action-primary-fg shadow-sm hover:bg-action-primary-hover`,
      secondary: `${shape} bg-action-secondary text-action-secondary-fg hover:bg-action-secondary-hover`,
      outline: `${shape} border border-line-control bg-surface text-content hover:bg-surface-2 hover:border-action-ai-border`,
      ghost: `${shape} text-content-muted hover:bg-surface-3 hover:text-content`,
      danger: `${shape} bg-action-danger text-action-danger-fg shadow-sm hover:bg-action-danger-hover`,
      'danger-outline': `${shape} border border-status-danger-border bg-surface/0 text-status-danger hover:bg-status-danger-bg`,
      success: `${shape} bg-action-success text-action-success-fg shadow-sm hover:bg-action-success-hover`,
      ai: `${shape} border border-action-ai-border bg-action-ai text-action-ai-fg hover:bg-action-secondary-hover`,
      /** No preset shape: layout comes entirely from className. Used for cards, rows and markers. */
      bare: '',
    },
    size: {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-5 text-base',
      icon: 'h-10 w-10',
      'icon-sm': 'h-8 w-8',
      bare: '',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
})

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
