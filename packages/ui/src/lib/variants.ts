import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-fast ease-out disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600',
        secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25',
        outline: 'border border-line-strong bg-surface text-content hover:bg-surface-2 hover:border-brand-300',
        ghost: 'text-content-muted hover:bg-surface-3 hover:text-content',
        danger: 'bg-danger-600 text-white shadow-sm hover:bg-danger-700',
        'danger-outline': 'border border-danger-300 text-danger-700 hover:bg-danger-50 dark:text-danger-300 dark:hover:bg-danger-500/10',
        success: 'bg-accent-600 text-white shadow-sm hover:bg-accent-700',
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
        brand: 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-200',
        success: 'border-accent-200 bg-accent-50 text-accent-700 dark:border-accent-500/30 dark:bg-accent-500/15 dark:text-accent-300',
        warning: 'border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-warning-300',
        danger: 'border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/15 dark:text-danger-300',
        info: 'border-info-200 bg-info-50 text-info-700 dark:border-info-500/30 dark:bg-info-500/15 dark:text-info-300',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)
