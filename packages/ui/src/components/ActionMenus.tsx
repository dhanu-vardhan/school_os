import { ChevronDown, Download, Link2, MoreHorizontal, Plus, Share2 } from 'lucide-react'
import { useActionLabels } from './ActionLabels'
import { Button, type ButtonProps } from './Button'
import { IconButton } from './IconButton'
import { DropdownMenu, type DropdownMenuItem } from './Overlays'

export interface SplitButtonProps {
  label: string
  onClick: () => void
  items: DropdownMenuItem[]
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  disabled?: boolean
  disabledReason?: string
  loading?: boolean
}

/** One committed primary action plus a menu of related, lower-frequency actions. */
export function SplitButton({
  label, onClick, items, variant = 'primary', size = 'md', disabled, disabledReason, loading,
}: SplitButtonProps) {
  const labels = useActionLabels()
  const menuVariant: ButtonProps['variant'] = variant === 'danger' ? 'danger-outline' : variant === 'primary' ? 'outline' : variant
  return (
    <div role="group" aria-label={label} className="ui-split">
      <Button variant={variant} size={size} disabled={disabled} disabledReason={disabledReason} loading={loading} onClick={onClick}>
        {label}
      </Button>
      <DropdownMenu label={labels.more} align="end"
        trigger={
          <IconButton label={labels.more} variant={menuVariant} size={size === 'sm' ? 'icon-sm' : 'icon'}
            disabled={disabled || loading}>
            <ChevronDown className="h-4 w-4" aria-hidden />
          </IconButton>
        }
        items={items}
      />
    </div>
  )
}

/** Compact creation entry point; each item must carry a verb + object label. */
export function QuickAddMenu({ items, label }: { items: DropdownMenuItem[]; label?: string }) {
  const labels = useActionLabels()
  const text = label ?? labels.quickAdd
  return (
    <DropdownMenu label={text} align="start"
      trigger={<Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" aria-hidden />}>{text}</Button>}
      items={items}
    />
  )
}

/** Share/export actions in one grouped menu. Callers supply only safe, non-case URLs. */
export function ShareMenu({ onCopyLink, onExportCsv, extraItems = [], label }: {
  onCopyLink?: () => void
  onExportCsv?: () => void
  extraItems?: DropdownMenuItem[]
  label?: string
}) {
  const labels = useActionLabels()
  const text = label ?? labels.share
  const items: DropdownMenuItem[] = [
    { label: labels.copyLink, icon: <Link2 className="h-4 w-4" aria-hidden />, group: labels.share, disabled: !onCopyLink, onSelect: onCopyLink },
    { label: labels.exportCsv, icon: <Download className="h-4 w-4" aria-hidden />, group: labels.export, disabled: !onExportCsv, onSelect: onExportCsv },
    ...extraItems,
  ]
  return (
    <DropdownMenu label={text} items={items}
      trigger={<Button variant="outline" size="sm" icon={<Share2 className="h-4 w-4" aria-hidden />}>{text}</Button>}
    />
  )
}

/** Show the two most frequent non-destructive row actions inline; the rest live in a menu. */
export function RowActions({ items, maxVisible = 2, label }: {
  items: DropdownMenuItem[]
  maxVisible?: number
  label?: string
}) {
  const labels = useActionLabels()
  const safe = items.filter(item => !item.danger)
  const destructive = items.filter(item => item.danger)
  const visible = safe.slice(0, maxVisible)
  const overflow = [...safe.slice(maxVisible), ...destructive]

  return (
    <div role="group" aria-label={label ?? labels.actions} className="ui-row-actions">
      {visible.map(item => (
        <IconButton key={item.label} label={item.label} variant="ghost" size="icon-sm"
          disabled={item.disabled} onClick={item.onSelect}>
          {item.icon}
        </IconButton>
      ))}
      {overflow.length > 0 && (
        <DropdownMenu label={labels.more}
          trigger={<IconButton label={labels.more} variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" aria-hidden /></IconButton>}
          items={overflow}
        />
      )}
    </div>
  )
}
