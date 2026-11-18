import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Laptop, ShieldCheck, Smartphone } from 'lucide-react'
import {
  revokeFamilyDevice, saveFamilyPreferences, useFamilyConsents, useFamilyDevices, useFamilyMutation,
  useFamilyPreferences, withdrawFamilyConsent,
} from '@schoolos/api-client'
import type { NotificationPreferences } from '@schoolos/shared'
import { Badge, Button, Card, CardBody, CardHeader, Select, Switch, toast } from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { FamilyPage, formatDateTime, LegalNote, SelectField } from '../components'
import { useFamily } from '../context'

/** G16 — profile, notification preferences, devices and the consent ledger. */
export function FamilyProfilePage() {
  const { t } = useTranslation()
  const { overview } = useFamily()
  const query = useFamilyPreferences()
  const devices = useFamilyDevices()
  const consents = useFamilyConsents()
  const save = useFamilyMutation(saveFamilyPreferences)
  const revoke = useFamilyMutation(revokeFamilyDevice)
  const withdraw = useFamilyMutation(withdrawFamilyConsent)
  const [draft, setDraft] = useState<NotificationPreferences | null>(null)

  useEffect(() => {
    if (query.data?.data && !draft) setDraft(query.data.data)
  }, [query.data, draft])

  const persist = async () => {
    if (!draft) return
    try {
      await save.mutateAsync(draft)
      toast.success(t('family.profile.saved'))
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  const doWithdraw = async (id: string) => {
    try {
      await withdraw.mutateAsync(id)
      toast.success(t('family.profile.consentWithdrawn'))
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  return (
    <FamilyPage title={t('family.profile.title')} childScoped={false} actions={<MockNotice mock={query.data?.mock} compact />}>
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()} loading={<ScreenLoading variant="detail" />}>
        {() => draft && (
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <Card>
                <CardHeader title={t('family.profile.identity')} />
                <CardBody className="space-y-1 text-sm">
                  <p className="font-medium text-content">{overview?.guardian.name}</p>
                  <p className="text-content-muted">{overview?.guardian.email ?? '—'}</p>
                  {overview?.guardian.secureMessagesOnly && <Badge tone="info">{t('family.messages.noParentRelay')}</Badge>}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.notifications.title')} description={t('family.notifications.intro')}
                  action={<Button size="sm" onClick={() => void persist()} loading={save.isPending}>{t('family.notifications.save')}</Button>} />
                <CardBody className="space-y-3">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-xs font-medium uppercase tracking-wide text-content-subtle">
                    <span />
                    <span>{t('family.notifications.inApp')}</span>
                    <span>{t('family.notifications.email')}</span>
                    <span>{t('family.notifications.push')}</span>
                  </div>
                  {draft.items.map(item => (
                    <div key={item.category} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-t border-line/60 py-2">
                      <div className="min-w-0">
                        <p className="text-sm text-content">{item.label}</p>
                        {item.mandatory && <p className="text-[0.6875rem] text-content-subtle">{t('family.profile.mandatoryHint')}</p>}
                      </div>
                      <Switch checked={item.inApp} onCheckedChange={() => undefined} disabled ariaLabel={`${item.label} in-app`} />
                      <Switch checked={item.email} disabled={item.mandatory}
                        onCheckedChange={value => setDraft({ ...draft, items: draft.items.map(entry => entry.category === item.category ? { ...entry, email: value } : entry) })}
                        ariaLabel={`${item.label} email`} />
                      <Switch checked={item.push} disabled={item.mandatory}
                        onCheckedChange={value => setDraft({ ...draft, items: draft.items.map(entry => entry.category === item.category ? { ...entry, push: value } : entry) })}
                        ariaLabel={`${item.label} push`} />
                    </div>
                  ))}
                  <p className="text-xs text-content-subtle">{t('family.profile.pushContentFree')}</p>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.profile.quietHours')} />
                <CardBody className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Switch checked={draft.quietHours.enabled}
                      onCheckedChange={value => setDraft({ ...draft, quietHours: { ...draft.quietHours, enabled: value } })} />
                    <span className="text-sm text-content">{t('family.notifications.quiet')} {draft.quietHours.start} – {draft.quietHours.end}</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField label={t('family.profile.digest')} value={draft.digest}
                      onValueChange={value => setDraft({ ...draft, digest: value as NotificationPreferences['digest'] })}
                      options={[
                        { value: 'off', label: t('family.profile.digest.off') },
                        { value: 'daily', label: t('family.profile.digest.daily') },
                        { value: 'weekly', label: t('family.profile.digest.weekly') },
                      ]} />
                    <SelectField label={t('family.profile.language')} value={draft.language}
                      onValueChange={value => setDraft({ ...draft, language: value as 'fr' | 'en' })}
                      options={[{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }]} />
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.profile.accessibility')} />
                <CardBody className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Switch checked={draft.accessibility.highContrast}
                      onCheckedChange={value => setDraft({ ...draft, accessibility: { ...draft.accessibility, highContrast: value } })} />
                    <span className="text-sm text-content">{t('family.profile.contrast')}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Switch checked={draft.accessibility.reducedMotion}
                      onCheckedChange={value => setDraft({ ...draft, accessibility: { ...draft.accessibility, reducedMotion: value } })} />
                    <span className="text-sm text-content">{t('family.profile.reducedMotion')}</span>
                  </div>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-content">{t('family.profile.textSize')}</span>
                    <Select ariaLabel={t('family.profile.textSize')} value={draft.accessibility.textSize}
                      onValueChange={value => setDraft({ ...draft, accessibility: { ...draft.accessibility, textSize: value as 'normal' | 'large' | 'xlarge' } })}
                      options={[{ value: 'normal', label: 'Normal' }, { value: 'large', label: 'Grand' }, { value: 'xlarge', label: 'Très grand' }]} />
                  </label>
                  <Button size="sm" onClick={() => void persist()} loading={save.isPending}>{t('family.notifications.save')}</Button>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.profile.consentLedger')} />
                <CardBody className="p-0">
                  {(consents.data?.data ?? []).length === 0
                    ? <p className="px-5 py-6 text-center text-sm text-content-muted">{t('family.profile.noConsents')}</p>
                    : (
                      <ul className="divide-y divide-line/60">
                        {consents.data?.data.map(consent => (
                          <li key={consent.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-content">{consent.label}</p>
                              <p className="text-xs text-content-muted">{consent.text}</p>
                            </div>
                            {consent.legalBasis === 'consent' && consent.granted && !consent.withdrawnAt
                              ? <Button size="sm" variant="ghost" onClick={() => void doWithdraw(consent.id)} loading={withdraw.isPending}>{t('family.withdraw')}</Button>
                              : <Badge tone="neutral">{consent.legalBasis}</Badge>}
                          </li>
                        ))}
                      </ul>
                    )}
                </CardBody>
              </Card>
            </div>

            <div className="space-y-5">
              <Card>
                <CardHeader title={t('family.profile.devices')} />
                <CardBody className="p-0">
                  <ul className="divide-y divide-line/60">
                    {(devices.data?.data ?? []).map(device => (
                      <li key={device.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-sm font-medium text-content">
                              {device.device.includes('iPhone') ? <Smartphone className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
                              {device.label}
                            </p>
                            <p className="text-xs text-content-muted">{device.device} · {device.lastSeen ? formatDateTime(device.lastSeen) : '—'}</p>
                            <p className="text-[0.6875rem] text-content-subtle">{device.location} · MFA {device.mfa ? '✓' : '—'}</p>
                          </div>
                          {device.current
                            ? <Badge tone="success">{t('family.profile.current')}</Badge>
                            : <Button size="sm" variant="ghost" onClick={() => void revoke.mutateAsync(device.id)} loading={revoke.isPending}>{t('family.profile.revoke')}</Button>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.profile.privacyNotice')} />
                <CardBody>
                  <p className="flex items-start gap-2 text-sm text-content-muted">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                    {t('family.profile.privacyNoticeBody')}
                  </p>
                  <LegalNote>{t('family.help.legal')}</LegalNote>
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </QueryState>
    </FamilyPage>
  )
}
