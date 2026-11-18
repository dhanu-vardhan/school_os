import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DatabaseBackup, Plus } from 'lucide-react'
import { createFamilyDataRequest, useFamilyDataRequests, useFamilyMutation } from '@schoolos/api-client'
import { Badge, Button, Card, CardBody, CardHeader, FormField, Input, Modal, toast } from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { childName, FamilyPage, formatDay, SelectField } from '../components'
import { useFamily } from '../context'

const TYPES = ['access', 'export', 'rectification', 'erasure'] as const

/** G17 — GDPR-style data rights: access, copy, rectification and erasure requests. */
export function FamilyDataRightsPage() {
  const { t } = useTranslation()
  const { children, childId } = useFamily()
  const query = useFamilyDataRequests()
  const create = useFamilyMutation(createFamilyDataRequest)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ childId: childId ?? children[0]?.id ?? '', type: 'access' as string, subject: '' })

  const requests = query.data?.data ?? []

  const submit = async () => {
    try {
      await create.mutateAsync({ childId: form.childId, type: form.type as typeof TYPES[number], subject: form.subject })
      toast.success(t('family.dataRights.submitted'))
      setOpen(false)
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  return (
    <FamilyPage
      title={t('family.dataRights.title')}
      subtitle={t('family.dataRights.intro')}
      childScoped={false}
      actions={<>
        <MockNotice mock={query.data?.mock} compact />
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{t('family.dataRights.new')}</Button>
      </>}
    >
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        isEmpty={requests.length === 0}
        empty={<Card><CardBody><p className="text-sm text-content-muted">{t('family.dataRights.empty')}</p></CardBody></Card>}
        loading={<ScreenLoading variant="list" />}
      >
        <div className="space-y-4">
          {requests.map(request => (
            <Card key={request.id}>
              <CardHeader
                title={`${t(`family.dataRights.type.${request.type}`)} · ${request.subject}`}
                description={`${childName(children.find(child => child.id === request.childId))} · ${t('family.dataRights.due', { date: formatDay(request.dueAt, true) })}`}
                action={<Badge tone={request.status === 'completed' ? 'success' : request.status === 'refused' ? 'danger' : 'warning'}>{t(`family.dataRights.status.${request.status}`)}</Badge>}
              />
              <CardBody className="space-y-2">
                <ul className="list-disc space-y-1 pl-4 text-xs text-content-muted">
                  {request.legalExceptions.map(exception => <li key={exception}>{exception}</li>)}
                </ul>
                {request.note && <p className="text-sm text-content">{request.note}</p>}
                {request.handler && <p className="text-xs text-content-subtle">{request.handler}</p>}
              </CardBody>
            </Card>
          ))}
          <p className="flex items-start gap-2 text-xs text-content-subtle"><DatabaseBackup className="mt-0.5 h-4 w-4" />{t('family.dataRights.intro')}</p>
        </div>
      </QueryState>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={t('family.dataRights.new')}
        description={t('family.dataRights.intro')}
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => void submit()} loading={create.isPending} disabled={!form.subject.trim() || !form.childId}>{t('family.dataRights.submit')}</Button>
        </>}
      >
        <div className="space-y-4">
          <SelectField label={t('family.childSwitcher')} value={form.childId}
            onValueChange={value => setForm({ ...form, childId: value })}
            options={children.map(child => ({ value: child.id, label: `${child.firstName} · ${child.className}` }))} />
          <SelectField label={t('family.dataRights.type')} value={form.type}
            onValueChange={value => setForm({ ...form, type: value })}
            options={TYPES.map(type => ({ value: type, label: t(`family.dataRights.type.${type}`) }))} />
          <FormField label={t('family.dataRights.subject')} required>{props => (
            <Input {...props} value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })} maxLength={160} />
          )}</FormField>
          <p className="text-xs text-content-muted">{t('family.dataRights.exceptions')} : {t('family.dataRights.intro')}</p>
        </div>
      </Modal>
    </FamilyPage>
  )
}
