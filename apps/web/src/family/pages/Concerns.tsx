import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { submitFamilyConcern, useFamilyMutation } from '@schoolos/api-client'
import { Banner, Button, Card, CardBody, CardHeader, FormField, Textarea, toast } from '@schoolos/ui'
import { FamilyPage, SelectField } from '../components'
import { useFamily } from '../context'

/** G18 — write-only concern intake routed to the direction and the safeguarding lead. */
export function FamilyConcernsPage() {
  const { t } = useTranslation()
  const { children, childId } = useFamily()
  const submit = useFamilyMutation(submitFamilyConcern)
  const [form, setForm] = useState({ childId: childId ?? children[0]?.id ?? '', message: '' })
  const [reference, setReference] = useState('')

  const send = async () => {
    if (!form.childId || form.message.trim().length < 10) return
    try {
      const result = await submit.mutateAsync(form)
      setReference(result.data.reference)
      setForm({ ...form, message: '' })
      toast.success(t('family.concerns.submitted', { reference: result.data.reference }))
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  return (
    <FamilyPage title={t('family.concerns.title')} subtitle={t('family.concerns.intro')} childScoped={false}>
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {reference && (
            <Banner tone="success" title={t('family.concerns.submitted', { reference })}>
              {t('family.concerns.writeOnly')}
            </Banner>
          )}
          <Card>
            <CardHeader title={t('family.concerns.title')} description={t('family.concerns.writeOnly')} />
            <CardBody className="space-y-4">
              <SelectField label={t('family.childSwitcher')} value={form.childId}
                onValueChange={value => setForm({ ...form, childId: value })}
                options={children.map(child => ({ value: child.id, label: `${child.firstName} · ${child.className}` }))} />
              <FormField label={t('family.concerns.message')} required hint={t('family.concerns.writeOnly')}>{props => (
                <Textarea {...props} rows={6} maxLength={2000} value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} />
              )}</FormField>
              <Button onClick={() => void send()} loading={submit.isPending} disabled={form.message.trim().length < 10}>
                <ShieldAlert className="h-4 w-4" />{t('family.concerns.submit')}
              </Button>
            </CardBody>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title={t('family.help.emergencyNumbers')} />
          <CardBody className="space-y-2 text-sm text-content">
            <p>{t('family.help.119')}</p>
            <p>{t('family.help.3020')}</p>
            <p>{t('family.help.3018')}</p>
            <p>{t('family.help.112')}</p>
            <p className="text-xs text-content-muted">{t('family.concerns.emergency')}</p>
          </CardBody>
        </Card>
      </div>
    </FamilyPage>
  )
}
