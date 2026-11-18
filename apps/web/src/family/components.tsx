import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { Badge, Banner, Button, Card, EmptyState, Select } from '@schoolos/ui'
import { PageHeader, QueryState } from '../components/Screen'
import { useFamily } from './context'

export function formatMoney(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100)
}

export function formatDay(value?: string, withYear = false): string {
  if (!value) return '—'
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', ...(withYear ? { year: 'numeric' as const } : {}), timeZone: 'UTC',
  }).format(date)
}

export function formatDateTime(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function childName(child?: { firstName: string; lastName: string }): string {
  return child ? `${child.firstName} ${child.lastName}` : ''
}

/** Inline restriction banner; every restricted screen shows it before its data. */
export function RestrictionBanner() {
  const { t } = useTranslation()
  const { selected } = useFamily()
  if (!selected?.restrictions.length) return null
  return (
    <div className="mb-4">
      <Banner tone="warning" title={t('family.restrictedBannerTitle')}>
        <p>{t('family.restrictedBannerBody')}</p>
        <ul className="mt-2 list-disc space-y-0.5 pl-4">
          {selected.restrictions.map(restriction => (
            <li key={restriction.id}>{restriction.scope} · {restriction.courtDocumentRef}</li>
          ))}
        </ul>
      </Banner>
    </div>
  )
}

function ChildPicker() {
  const { t } = useTranslation()
  const { children, selected, setChildId } = useFamily()
  if (children.length < 2) return null
  return (
    <Select
      ariaLabel={t('family.childSwitcher')}
      value={selected?.id}
      onValueChange={value => setChildId(value)}
      options={children.map(child => ({ value: child.id, label: `${child.firstName} · ${child.className}` }))}
      className="w-52"
    />
  )
}

export function FamilyPage({ title, subtitle, actions, childScoped = true, breadcrumbs, children }: {
  title: string
  subtitle?: string
  actions?: ReactNode
  childScoped?: boolean
  breadcrumbs?: { label: string; to?: string }[]
  children: ReactNode
}) {
  return (
    <div className="ui-page">
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={<>{childScoped && <ChildPicker />}{actions}</>}
      />
      <RestrictionBanner />
      {children}
    </div>
  )
}

/** Pages that operate on one pupil need an explicit selection once there are siblings. */
export function ChildRequired() {
  const { t } = useTranslation()
  return (
    <Card>
      <EmptyState
        title={t('family.childSwitcher')}
        description={t('family.child.editHint')}
        action={<ChildPicker />}
      />
    </Card>
  )
}

export function RecordsRestricted() {
  const { t } = useTranslation()
  return (
    <Card>
      <EmptyState variant="search" title={t('family.restrictedBannerTitle')} description={t('family.restrictedBannerBody')} />
    </Card>
  )
}

export function LegalNote({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <p className="mt-3 text-xs text-content-subtle">
      {children ?? t('family.profile.privacyNoticeBody')}
    </p>
  )
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-content-subtle">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-content">{value}</dd>
    </div>
  )
}

/** Select with a visible label; `FormField` only supports native inputs. */
export function SelectField({ label, value, onValueChange, options, placeholder, required }: {
  label: string
  value?: string
  onValueChange: (value: string) => void
  options: { value: string; label: string; disabled?: boolean }[]
  placeholder?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-content">
        {label}{required && <span className="ml-0.5 text-danger-600" aria-hidden>*</span>}
      </span>
      <Select ariaLabel={label} value={value} onValueChange={onValueChange} options={options} placeholder={placeholder} />
    </div>
  )
}

export function CountBadge({ count, label }: { count: number; label: string }) {
  if (!count) return null
  return <Badge tone="warning">{count} {label}</Badge>
}

export function WarningIcon() {
  return <ShieldAlert className="h-4 w-4" aria-hidden />
}

export function FamilyQueryState({ isLoading, error, onRetry, isEmpty, empty, children, loading }: {
  isLoading: boolean
  error?: unknown
  onRetry?: () => void
  isEmpty?: boolean
  empty?: ReactNode
  children: ReactNode | (() => ReactNode)
  loading?: ReactNode
}) {
  return (
    <QueryState isLoading={isLoading} error={error} onRetry={onRetry} isEmpty={isEmpty} empty={empty} loading={loading}>
      {children}
    </QueryState>
  )
}

export function PrintButton({ label }: { label: string }) {
  return <Button variant="outline" onClick={() => window.print()}>{label}</Button>
}
