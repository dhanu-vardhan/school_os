import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, UserCheck } from 'lucide-react'
import { addAuthorizedPerson, removeAuthorizedPerson, useFamilyCollectors, useFamilyMutation } from '@schoolos/api-client'
import { restrictionBlocks } from '@schoolos/shared'
import {
  Badge, Button, Card, CardBody, CardHeader, EmptyState, FormField, Input, Modal, StatusPill, toast,
} from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { childName, FamilyPage, formatDay, SelectField } from '../components'
import { useFamily } from '../context'

/** G10 — authorised pick-up persons, created by a guardian and approved by the school. */
export function FamilyCollectorsPage() {
  const { t } = useTranslation()
  const { children, childId, selected, today } = useFamily()
  const query = useFamilyCollectors(childId)
  const add = useFamilyMutation(addAuthorizedPerson)
  const remove = useFamilyMutation(removeAuthorizedPerson)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ childId: childId ?? '', name: '', relationship: '', phone: '', idCheckRequired: true, validFrom: today, note: '' })

  const locked = selected ? restrictionBlocks(selected.restrictions, 'collection', today) : false
  const people = query.data?.data ?? []

  const openForm = () => {
    setForm({ childId: childId ?? children[0]?.id ?? '', name: '', relationship: '', phone: '', idCheckRequired: true, validFrom: today, note: '' })
    setOpen(true)
  }

  const submit = async () => {
    if (!form.childId || !form.name || !form.relationship || !form.phone) return
    try {
      await add.mutateAsync({ ...form, note: form.note || undefined })
      toast.success(t('family.collectors.added'))
      setOpen(false)
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  const doRemove = async (id: string) => {
    try {
      await remove.mutateAsync(id)
      toast.success(t('family.collectors.removed'))
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  return (
    <FamilyPage
      title={t('family.collectors.title')}
      subtitle={selected?.className}
      actions={<>
        <MockNotice mock={query.data?.mock} compact />
        <Button onClick={openForm} disabled={locked} disabledReason={locked ? t('family.restrictedBannerBody') : undefined}>
          <Plus className="h-4 w-4" />{t('family.collectors.add')}
        </Button>
      </>}
    >
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        isEmpty={people.length === 0}
        empty={<Card><EmptyState title={t('family.collectors.empty')} /><CardBody className="pt-0 text-center text-xs text-content-muted">{t('family.child.editHint')}</CardBody></Card>}
        loading={<ScreenLoading variant="list" />}
      >
        <Card>
          <CardHeader title={t('family.collectors.title')} description={t('family.collectors.added')} />
          <CardBody className="p-0">
            <ul className="divide-y divide-line/60">
              {people.map(person => (
                <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-content">
                      <UserCheck className="h-4 w-4 text-content-subtle" />{person.name}
                    </p>
                    <p className="text-xs text-content-muted">
                      {person.relationship} · {person.phone} · {formatDay(person.validFrom)}{person.validTo ? ` → ${formatDay(person.validTo)}` : ''}
                    </p>
                    <p className="text-xs text-content-subtle">
                      {childName(children.find(child => child.id === person.childId))}
                      {person.idCheckRequired ? ` · ${t('family.collectors.idCheck')}` : ''}
                      {person.note ? ` · ${person.note}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={person.status} label={t(`family.collectors.status.${person.status}`)} />
                    {person.status === 'approved'
                      ? <Badge tone="neutral">{t('family.collectors.approvedLocked')}</Badge>
                      : (
                        <Button size="sm" variant="ghost" onClick={() => void doRemove(person.id)} loading={remove.isPending}>
                          <Trash2 className="h-4 w-4" />{t('family.collectors.remove')}
                        </Button>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </QueryState>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={t('family.collectors.add')}
        description={t('family.collectors.added')}
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => void submit()} loading={add.isPending} disabled={!form.name || !form.relationship || !form.phone}>{t('common.save')}</Button>
        </>}
      >
        <div className="space-y-4">
          <SelectField label={t('family.childSwitcher')} value={form.childId}
            onValueChange={value => setForm({ ...form, childId: value })}
            options={children.map(child => ({ value: child.id, label: `${child.firstName} · ${child.className}` }))} />
          <FormField label={t('family.collectors.name')} required>{props => <Input {...props} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />}</FormField>
          <FormField label={t('family.collectors.relationship')} required>{props => <Input {...props} value={form.relationship} onChange={event => setForm({ ...form, relationship: event.target.value })} />}</FormField>
          <FormField label={t('family.collectors.phone')} required>{props => <Input {...props} type="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} />}</FormField>
          <FormField label={t('family.collectors.validity')}>{props => <Input {...props} type="date" value={form.validFrom} onChange={event => setForm({ ...form, validFrom: event.target.value })} />}</FormField>
          <label className="flex items-center gap-2 text-sm text-content">
            <input type="checkbox" checked={form.idCheckRequired} onChange={event => setForm({ ...form, idCheckRequired: event.target.checked })} />
            {t('family.collectors.idCheck')}
          </label>
          <p className="text-xs text-content-subtle">{t('family.child.editHint')}</p>
        </div>
      </Modal>
    </FamilyPage>
  )
}
