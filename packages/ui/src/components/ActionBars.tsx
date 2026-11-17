import { X } from 'lucide-react'
import { cn } from '../lib/cn'
import { useActionLabels } from './ActionLabels'
import { Button, type ButtonProps } from './Button'
import { IconButton } from './IconButton'

export interface BarAction {
  label: string
  onClick: () => void
  disabledReason?: string
  danger?: boolean
}

/** Appears only with a selection: one primary, secondary actions, destructive action last. */
export function BulkActionBar({ count, actions, onClear, className }: {
  count: number
  actions: BarAction[]
  onClear: () => void
  className?: string
}) {
  const labels = useActionLabels()
  if (count <= 0) return null
  const ordered = [...actions.filter(action => !action.danger), ...actions.filter(action => action.danger)]

  return (
    <div role="region" aria-label={labels.actions} className={cn('ui-bulk-bar', className)}>
      <span className="tnum shrink-0 text-sm font-semibold text-content">{labels.selected(count)}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {ordered.map((action, index) => (
          <Button key={action.label} size="sm"
            variant={action.danger ? 'danger-outline' : index === 0 ? 'primary' : 'outline'}
            disabledReason={action.disabledReason}
            onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
      </div>
      <IconButton label={labels.clearSelection} variant="ghost" size="icon-sm" onClick={onClear}>
        <X className="h-4 w-4" aria-hidden />
      </IconButton>
    </div>
  )
}

/** Bottom action area for long forms: one primary committed action, the rest secondary. */
export function StickyActionBar({ title, primary, secondary = [], children, className }: {
  title?: string
  primary: BarAction
  secondary?: BarAction[]
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('ui-sticky-bar', className)}>
      <div className="min-w-0 flex-1">
        {title && <p className="truncate text-sm font-semibold text-content">{title}</p>}
        {children}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {secondary.map(action => (
          <Button key={action.label} variant={action.danger ? 'danger-outline' : 'outline'} size="sm"
            disabledReason={action.disabledReason} onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
        <Button size="sm" variant="primary" disabledReason={primary.disabledReason} onClick={primary.onClick}>
          {primary.label}
        </Button>
      </div>
    </div>
  )
}
