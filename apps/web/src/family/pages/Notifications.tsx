import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BellRing, ShieldCheck } from 'lucide-react'
import { saveFamilyPreferences, useFamilyMutation, useFamilyPreferences } from '@schoolos/api-client'
import { safeNotificationText, type NotificationPreferences } from '@schoolos/shared'
import { Badge, Button, Card, CardBody, CardHeader, Switch, toast } from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { FamilyPage, SelectField } from '../components'

/** G20 — notification centre: channels, digest, quiet hours and content-free previews. */
export function FamilyNotificationsPage() {
  const { t } = useTranslation()
  const query = useFamilyPreferences()
  const save = useFamilyMutation(saveFamilyPreferences)
  const [draft, setDraft] = useState<NotificationPreferences | null>(null)

  useEffect(() => {
    if (query.data?.data && !draft) setDraft(query.data.data)
  }, [query.data, draft])

  const persist = async () => {
    if (!draft) return
    try {
      await save.mutateAsync(draft)
      toast.success(t('family.notifications.saved'))
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  return (
    <FamilyPage title={t('family.notifications.title')} subtitle={t('family.notifications.intro')} childScoped={false} actions={<MockNotice mock={query.data?.mock} compact />}>
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()} loading={<ScreenLoading variant="list" />}>
        {() => draft && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title={t('family.profile.notifications')} action={<Button size="sm" onClick={() => void persist()} loading={save.isPending}>{t('family.notifications.save')}</Button>} />
              <CardBody className="space-y-3">
                {draft.items.map(item => (
                  <div key={item.category} className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-content">{item.label}</p>
                      <p className="text-xs text-content-muted">{safeNotificationText(item.category).body}</p>
                      {item.mandatory && <Badge tone="info">{t('family.profile.mandatory')}</Badge>}
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch checked={item.inApp} disabled ariaLabel={`${item.label} ${t('family.notifications.inApp')}`} />
                      <Switch checked={item.email} disabled={item.mandatory}
                        onCheckedChange={value => setDraft({ ...draft, items: draft.items.map(entry => entry.category === item.category ? { ...entry, email: value } : entry) })}
                        ariaLabel={`${item.label} ${t('family.notifications.email')}`} />
                      <Switch checked={item.push} disabled={item.mandatory}
                        onCheckedChange={value => setDraft({ ...draft, items: draft.items.map(entry => entry.category === item.category ? { ...entry, push: value } : entry) })}
                        ariaLabel={`${item.label} ${t('family.notifications.push')}`} />
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader title={t('family.notifications.digest')} />
                <CardBody className="space-y-4">
                  <SelectField label={t('family.profile.digest')} value={draft.digest}
                    onValueChange={value => setDraft({ ...draft, digest: value as NotificationPreferences['digest'] })}
                    options={[
                      { value: 'off', label: t('family.profile.digest.off') },
                      { value: 'daily', label: t('family.profile.digest.daily') },
                      { value: 'weekly', label: t('family.profile.digest.weekly') },
                    ]} />
                  <div className="flex items-center gap-3">
                    <Switch checked={draft.quietHours.enabled} ariaLabel={t('family.notifications.quiet')}
                      onCheckedChange={value => setDraft({ ...draft, quietHours: { ...draft.quietHours, enabled: value } })} />
                    <span className="text-sm text-content">{t('family.notifications.quiet')} {draft.quietHours.start} – {draft.quietHours.end}</span>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.profile.pushContentFree')} action={<ShieldCheck className="h-4 w-4 text-accent-600" />} />
                <CardBody className="space-y-3">
                  <div className="rounded-lg border border-line bg-surface-2 px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-content"><BellRing className="h-4 w-4" />{safeNotificationText('attendance').title}</p>
                    <p className="mt-1 text-xs text-content-muted">{safeNotificationText('attendance').body}</p>
                  </div>
                  <div className="rounded-lg border border-line bg-surface-2 px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-content"><BellRing className="h-4 w-4" />{safeNotificationText('billing').title}</p>
                    <p className="mt-1 text-xs text-content-muted">{safeNotificationText('billing').body}</p>
                  </div>
                  <p className="text-xs text-content-subtle">{t('family.notifications.intro')}</p>
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </QueryState>
    </FamilyPage>
  )
}
