import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileSignature, ShieldCheck, Undo2 } from 'lucide-react'
import { signFamilyForm, useFamilyForms, useFamilyMutation, withdrawFamilyForm } from '@schoolos/api-client'
import { signState, type FormAssignment } from '@schoolos/shared'
import {
  Badge, Banner, Button, Card, CardBody, CardHeader, EmptyState, Modal, toast,
} from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { childName, FamilyPage, formatDay, SelectField } from '../components'
import { useFamily } from '../context'

const RULE_KEY = {
  both_guardians: 'family.bothGuardians',
  one_guardian: 'family.oneGuardian',
  legal_representative_only: 'family.legalRepOnly',
} as const

/** G9 — authorisations and signatures, including the withdrawal of consent-based forms. */
export function FamilyFormsPage() {
  const { t } = useTranslation()
  const { children, overview, selected, today } = useFamily()
  const query = useFamilyForms(selected?.id)
  const sign = useFamilyMutation(({ id, method }: { id: string; method: 'password' | 'mfa' }) => signFamilyForm(id, { device: 'Navigateur web', method }))
  const withdraw = useFamilyMutation(withdrawFamilyForm)
  const [target, setTarget] = useState<FormAssignment | null>(null)
  const [method, setMethod] = useState<'password' | 'mfa'>('password')

  const links = overview?.links ?? []
  const guardianSub = overview?.guardian.sub ?? ''
  const forms = useMemo(
    () => (query.data?.data ?? []).filter(form => !selected || form.childId === selected.id),
    [query.data, selected],
  )

  const stateFor = (form: FormAssignment) => {
    const child = children.find(item => item.id === form.childId)
    return signState(form, guardianSub, links, child?.restrictions ?? [], today)
  }

  const doSign = async () => {
    if (!target) return
    try {
      await sign.mutateAsync({ id: target.id, method })
      toast.success(t('family.signed'))
      setTarget(null)
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  const doWithdraw = async (id: string) => {
    try {
      await withdraw.mutateAsync(id)
      toast.success(t('family.forms.consentWithdraw'))
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  return (
    <FamilyPage
      title={t('family.forms.title')}
      subtitle={selected?.className}
      actions={<MockNotice mock={query.data?.mock} compact />}
    >
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        isEmpty={forms.length === 0}
        empty={<Card><EmptyState title={t('family.forms.empty')} /></Card>}
        loading={<ScreenLoading variant="list" />}
      >
        <div className="space-y-4">
          <Banner tone="info" title={t('family.forms.title')}>{overview?.policy.signatureNotice}</Banner>
          {forms.map(form => {
            const state = stateFor(form)
            const child = children.find(item => item.id === form.childId)
            return (
              <Card key={form.id}>
                <CardHeader
                  title={<span className="flex flex-wrap items-center gap-2">{form.title}<Badge tone={form.status === 'signed' ? 'success' : form.status === 'withdrawn' ? 'neutral' : 'warning'}>{form.status}</Badge></span>}
                  description={`${childName(child)} · ${t('family.dueOn', { date: formatDay(form.dueAt) })}`}
                  action={<Badge tone="info">{t(RULE_KEY[form.signatoryRule])}</Badge>}
                />
                <CardBody className="space-y-3">
                  <p className="text-sm text-content">{form.description}</p>
                  {form.routesTo && <p className="text-xs text-content-muted">{t('family.forms.routesTo', { service: form.routesTo })}</p>}
                  {form.formType === 'health_document' && <p className="text-xs text-content-muted">{t('family.forms.healthNotice')}</p>}

                  <div className="space-y-2">
                    {form.signatures.map(signature => (
                      <div key={signature.id} className="rounded-md border border-line bg-surface-2 px-3 py-2 text-xs text-content-muted">
                        <p className="font-medium text-content">{t('family.signedBy', { name: signature.signerName, date: formatDay(signature.signedAt) })}</p>
                        <p>{t('family.proof')} : {signature.proofLabel}</p>
                        <p>{t('family.device')} : {signature.device} · {t('family.ip')} : {signature.ipHash}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {state.label === 'awaiting_you' && state.allowed && (
                      <Button size="sm" onClick={() => setTarget(form)}><FileSignature className="h-4 w-4" />{t('family.sign')}</Button>
                    )}
                    {state.reason === 'already_signed' && <Badge tone="success">{t('family.awaitingOther')}</Badge>}
                    {state.reason === 'complete' && <Badge tone="success">{t('family.signed')}</Badge>}
                    {state.label === 'not_eligible' && <Badge tone="neutral">{t('family.notEligible')}</Badge>}
                    {state.reason === 'restricted' && <Badge tone="warning">{t('family.restrictedBannerTitle')}</Badge>}
                    {form.withdrawable && form.status !== 'withdrawn' && form.signatures.some(sig => sig.signerSub === guardianSub) && (
                      <Button size="sm" variant="ghost" onClick={() => void doWithdraw(form.id)} loading={withdraw.isPending}>
                        <Undo2 className="h-4 w-4" />{t('family.withdraw')}
                      </Button>
                    )}
                  </div>

                  {form.withdrawable && <p className="text-xs text-content-subtle">{t('family.forms.consentWithdraw')}</p>}
                  <p className="flex items-start gap-1 text-xs text-content-subtle"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />{form.legalNotice}</p>
                  {form.attachmentName && (
                    <p className="text-xs text-content-muted">{t('family.attachment')} : {form.attachmentName}</p>
                  )}
                  <Link to={`/family/children/${form.childId}`} className="text-xs text-brand-700 hover:underline">{t('family.child.collectors')}</Link>
                </CardBody>
              </Card>
            )
          })}
        </div>
      </QueryState>

      <Modal
        open={!!target}
        onOpenChange={value => { if (!value) setTarget(null) }}
        title={target?.title ?? t('family.sign')}
        description={overview?.policy.signatureNotice}
        footer={<>
          <Button variant="ghost" onClick={() => setTarget(null)}>{t('common.cancel')}</Button>
          <Button onClick={() => void doSign()} loading={sign.isPending}>{t('family.sign')}</Button>
        </>}
      >
        <div className="space-y-4">
          <p className="text-sm text-content">{target?.description}</p>
          <SelectField label={t('family.proof')} value={method} onValueChange={value => setMethod(value as 'password' | 'mfa')}
            options={[
              { value: 'password', label: 'Signature simple — mot de passe' },
              { value: 'mfa', label: 'Signature avancée — MFA' },
            ]} />
          <p className="text-xs text-content-subtle">{t('family.proof')} : {t('family.hash')} {target?.templateId}</p>
        </div>
      </Modal>
    </FamilyPage>
  )
}
