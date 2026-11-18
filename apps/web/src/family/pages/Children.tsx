import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import {
  requestChildContactChange, useFamilyChild, useFamilyCollectors, useFamilyConsents,
  useFamilyInvitations, useFamilyMutation, useOtherGuardianContact,
} from '@schoolos/api-client'
import {
  Avatar, Badge, Button, Card, CardBody, CardHeader, EmptyState, FormField, Input, Modal, StatusPill, toast,
} from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { ChildRequired, childName, FamilyPage, formatDay, KeyValue, LegalNote } from '../components'
import { useFamily } from '../context'

/** G2 — children list. */
export function FamilyChildrenPage() {
  const { t } = useTranslation()
  const { children, setChildId, isLoading, error, refetch } = useFamily()

  return (
    <FamilyPage title={t('nav.children')} subtitle={t('family.subtitle')} childScoped={false}>
      <QueryState isLoading={isLoading} error={error} onRetry={refetch} isEmpty={children.length === 0}
        empty={<Card><EmptyState title={t('family.noChildren')} description={t('family.noChildrenHint')} /></Card>}>
        <div className="grid gap-4 md:grid-cols-2">
          {children.map(child => (
            <Card key={child.id}>
              <CardBody className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar name={childName(child)} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold text-content">{childName(child)}</p>
                    <p className="text-sm text-content-muted">{child.className}</p>
                  </div>
                  {child.restrictions.length > 0 && <Badge tone="warning" className="ml-auto">{t('family.restrictedBannerTitle')}</Badge>}
                </div>
                <dl className="divide-y divide-line/60">
                  <KeyValue label={t('family.child.class')} value={child.className} />
                  <KeyValue label={t('family.child.level')} value={child.level} />
                  <KeyValue label={t('family.child.teachers')} value={child.teachers[0]?.name ?? '—'} />
                  <KeyValue label={t('family.child.photoConsent')} value={
                    <Badge tone={child.photoConsentGranted ? 'success' : 'neutral'}>
                      {child.photoConsentGranted ? t('family.child.granted') : t('family.child.notGranted')}
                    </Badge>
                  } />
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm"><Link to={`/family/children/${child.id}`} onClick={() => setChildId(child.id)}>{t('family.open')}</Link></Button>
                  <Button asChild size="sm" variant="outline"><Link to={`/family/attendance?child=${child.id}`}>{t('nav.attendance')}</Link></Button>
                  <Button asChild size="sm" variant="outline"><Link to={`/family/grades?child=${child.id}`}>{t('nav.grades')}</Link></Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </QueryState>
    </FamilyPage>
  )
}

/** G2 — one child's identity, team, collectors, restrictions, consents and invitations. */
export function FamilyChildProfilePage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const childQuery = useFamilyChild(id)
  const collectors = useFamilyCollectors(id)
  const consents = useFamilyConsents()
  const invitations = useFamilyInvitations()
  const contact = useOtherGuardianContact(id)
  const change = useFamilyMutation((fields: Record<string, string>) => requestChildContactChange(id, fields))
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const { overview } = useFamily()

  const child = childQuery.data?.data
  const link = overview?.links.find(item => item.childId === id)
  const childConsents = (consents.data?.data ?? []).filter(consent => consent.childId === id)
  const childInvitations = (invitations.data?.data ?? []).filter(invitation => invitation.childId === id)

  if (!id) return <ChildRequired />

  const submit = async () => {
    try {
      await change.mutateAsync({ email, phone })
      toast.success(t('family.child.changeSubmitted'))
      setOpen(false)
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  return (
    <FamilyPage
      title={child ? childName(child) : t('family.child.identity')}
      subtitle={child?.className}
      breadcrumbs={[{ label: t('nav.children'), to: '/family/children' }, { label: child ? childName(child) : t('family.child.identity') }]}
      actions={<MockNotice mock={childQuery.data?.mock} compact />}
    >
      <QueryState isLoading={childQuery.isLoading} error={childQuery.error} onRetry={() => void childQuery.refetch()} loading={<ScreenLoading variant="detail" />}>
        {() => child && (
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <Card>
                <CardHeader title={t('family.child.identity')} action={
                  <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{t('family.child.editContact')}</Button>
                } />
                <CardBody>
                  <dl className="divide-y divide-line/60">
                    <KeyValue label={t('family.child.class')} value={child.className} />
                    <KeyValue label={t('family.child.level')} value={child.level} />
                    <KeyValue label={t('family.child.emergency')} value={link?.isEmergencyContact ? `${link.guardianName} · ${t('family.child.granted')}` : '—'} />
                    <KeyValue label={t('family.child.photoConsent')} value={
                      <Badge tone={child.photoConsentGranted ? 'success' : 'neutral'}>
                        {child.photoConsentGranted ? t('family.child.granted') : t('family.child.notGranted')}
                      </Badge>
                    } />
                  </dl>
                  <p className="mt-3 text-xs text-content-muted">{t('family.child.editHint')}</p>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.child.teachers')} />
                <CardBody className="p-0">
                  <ul className="divide-y divide-line/60">
                    {child.teachers.map(teacher => (
                      <li key={`${teacher.name}-${teacher.subject}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-content">{teacher.name}</p>
                          <p className="text-xs text-content-muted">{teacher.subject}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-content-muted">
                          {teacher.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{teacher.email}</span>}
                          {teacher.officeHours && <span>{teacher.officeHours}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.child.collectors')} action={<Link to={`/family/collectors?child=${id}`} className="text-xs text-brand-700 hover:underline">{t('family.details')}</Link>} />
                <CardBody className="p-0">
                  {(collectors.data?.data ?? []).length === 0
                    ? <p className="px-5 py-6 text-center text-sm text-content-muted">{t('family.collectors.empty')}</p>
                    : (
                      <ul className="divide-y divide-line/60">
                        {collectors.data?.data.map(person => (
                          <li key={person.id} className="flex items-center justify-between gap-3 px-5 py-3">
                            <div>
                              <p className="text-sm font-medium text-content">{person.name}</p>
                              <p className="text-xs text-content-muted">{person.relationship} · {person.phone}</p>
                            </div>
                            <StatusPill status={person.status} label={t(`family.collectors.status.${person.status}`)} />
                          </li>
                        ))}
                      </ul>
                    )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.profile.consentLedger')} />
                <CardBody className="p-0">
                  {childConsents.length === 0
                    ? <p className="px-5 py-6 text-center text-sm text-content-muted">{t('family.profile.noConsents')}</p>
                    : (
                      <ul className="divide-y divide-line/60">
                        {childConsents.map(consent => (
                          <li key={consent.id} className="px-5 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-content">{consent.label}</p>
                              <Badge tone={consent.withdrawnAt ? 'neutral' : consent.granted ? 'success' : 'warning'}>
                                {consent.withdrawnAt ? t('family.withdraw') : consent.granted ? t('family.child.granted') : t('family.child.notGranted')}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-content-muted">{consent.text}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                </CardBody>
              </Card>
            </div>

            <div className="space-y-5">
              <Card>
                <CardHeader title={t('family.child.schoolLife')} />
                <CardBody>
                  <p className="text-sm font-medium text-content">{child.schoolLifeContact.name}</p>
                  <p className="text-xs text-content-muted">{child.schoolLifeContact.role}</p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-content-muted"><Mail className="h-3.5 w-3.5" />{child.schoolLifeContact.email}</p>
                  {child.schoolLifeContact.phone && <p className="flex items-center gap-1 text-xs text-content-muted"><Phone className="h-3.5 w-3.5" />{child.schoolLifeContact.phone}</p>}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.child.restrictions')} />
                <CardBody>
                  {child.restrictions.length === 0
                    ? <p className="text-sm text-content-muted">{t('family.child.notGranted')}</p>
                    : (
                      <ul className="space-y-3">
                        {child.restrictions.map(restriction => (
                          <li key={restriction.id} className="rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-900 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200">
                            <p className="font-semibold">{restriction.scope}</p>
                            <p>{restriction.courtDocumentRef} · {formatDay(restriction.effectiveFrom, true)}</p>
                            {restriction.note && <p className="mt-1">{restriction.note}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.child.emergency')} />
                <CardBody>
                  {contact.data?.data
                    ? (
                      <div className="space-y-1 text-sm">
                        <p className="flex items-center gap-2 font-medium text-content"><UserRound className="h-4 w-4" />{contact.data.data.name}</p>
                        <p className="text-xs text-content-muted">{contact.data.data.email}</p>
                        <p className="text-xs text-content-muted">{contact.data.data.phone}</p>
                        {contact.data.data.masked && <p className="text-xs text-warning-700 dark:text-warning-300">{t('family.restrictedData')}</p>}
                      </div>
                    )
                    : <p className="text-sm text-content-muted">—</p>}
                </CardBody>
              </Card>

              {childInvitations.length > 0 && (
                <Card>
                  <CardHeader title={t('family.invitation.title')} />
                  <CardBody className="space-y-3">
                    {childInvitations.map(invitation => (
                      <div key={invitation.id} className="text-sm">
                        <p className="font-medium text-content">{invitation.invitedName}</p>
                        <p className="text-xs text-content-muted">{t('family.invitation.sentTo', { email: invitation.invitedEmail })}</p>
                        <p className="text-xs text-content-muted">
                          {invitation.state.usable
                            ? t('family.invitation.expires', { date: formatDay(invitation.expiresAt, true) })
                            : invitation.state.reason === 'expired' ? t('family.invitation.expired') : t('family.notEligible')}
                        </p>
                      </div>
                    ))}
                    <p className="text-xs text-content-subtle">{t('family.invitation.verification')}</p>
                  </CardBody>
                </Card>
              )}

              <Card>
                <CardBody>
                  <p className="flex items-start gap-2 text-xs text-content-muted">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                    {t('family.child.editHint')}
                  </p>
                </CardBody>
              </Card>
              <LegalNote />
            </div>
          </div>
        )}
      </QueryState>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={t('family.child.editContact')}
        description={t('family.child.editHint')}
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => void submit()} loading={change.isPending} disabled={!email && !phone}>{t('common.save')}</Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label={t('auth.email')}>{props => <Input {...props} type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" />}</FormField>
          <FormField label={t('family.collectors.phone')}>{props => <Input {...props} type="tel" value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" />}</FormField>
        </div>
      </Modal>
    </FamilyPage>
  )
}
