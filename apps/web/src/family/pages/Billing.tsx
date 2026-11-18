import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CreditCard, Download, Euro, Landmark } from 'lucide-react'
import {
  payFamilyInvoice, requestSepaMandate, stepUp, useFamilyBillingQuery, useFamilyMutation,
} from '@schoolos/api-client'
import type { PaymentReceipt } from '@schoolos/shared'
import {
  Badge, Banner, Button, Card, CardBody, CardHeader, Modal, StatCard, toast,
} from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { FamilyPage, formatDay, formatMoney, SelectField } from '../components'
import { useFamily } from '../context'

/** G14 — invoices, step-up payment and receipts. Split billing is enforced by payer list. */
export function FamilyBillingPage() {
  const { t } = useTranslation()
  const { children } = useFamily()
  const query = useFamilyBillingQuery()
  const pay = useFamilyMutation(({ id, method }: { id: string; method: 'card' | 'sepa' }) => payFamilyInvoice(id, method))
  const mandate = useFamilyMutation(requestSepaMandate)
  const [invoiceId, setInvoiceId] = useState('')
  const [method, setMethod] = useState<'card' | 'sepa'>('card')
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([])

  const data = query.data?.data
  const invoice = data?.invoices.find(item => item.id === invoiceId)

  const submit = async () => {
    if (!invoice) return
    try {
      // Fresh MFA is required for payments; the demo step-up endpoint confirms the session.
      await stepUp('123456')
      const result = await pay.mutateAsync({ id: invoice.id, method })
      setReceipts(previous => [result.data, ...previous])
      toast.success(t('family.billing.paid'))
      setInvoiceId('')
    } catch {
      toast.error(t('family.billing.stepUp'))
    }
  }

  const requestMandate = async () => {
    try {
      await mandate.mutateAsync(undefined as never)
      toast.success(t('family.billing.requestMandate'))
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  return (
    <FamilyPage title={t('family.billing.title')} childScoped={false} actions={<MockNotice mock={query.data?.mock} compact />}>
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()} loading={<ScreenLoading variant="table" />}>
        {() => data && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard label={t('family.billing.balance')} value={formatMoney(data.balanceCents, data.currency)} tone={data.balanceCents ? 'danger' : 'accent'} icon={<Euro className="h-4 w-4" />} />
              <StatCard label={t('family.billing.invoices')} value={data.dueCount} hint={data.nextDueDate ? t('family.billing.due', { date: formatDay(data.nextDueDate) }) : undefined} />
              <StatCard label={t('family.billing.mandate')} value={data.mandate?.status ?? '—'} hint={data.mandate?.ibanMasked} icon={<Landmark className="h-4 w-4" />} />
            </div>

            <Banner tone="info" title={t('family.billing.payerVisibility')}>{data.payerVisibility}</Banner>

            <Card>
              <CardHeader title={t('family.billing.invoices')} />
              <CardBody className="p-0">
                {data.invoices.length === 0
                  ? <p className="px-5 py-6 text-center text-sm text-content-muted">{t('family.billing.empty')}</p>
                  : (
                    <ul className="divide-y divide-line/60">
                      {data.invoices.map(item => (
                        <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-content">{item.label}</p>
                            <p className="text-xs text-content-muted">
                              {formatMoney(item.amountCents, item.currency)} · {t('family.billing.due', { date: formatDay(item.dueDate) })}
                              {' · '}{children.find(child => child.id === item.studentId)?.firstName ?? ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone={item.status === 'paid' ? 'success' : item.status === 'overdue' ? 'danger' : 'warning'}>{item.status}</Badge>
                            {item.status !== 'paid' && (
                              <Button size="sm" onClick={() => { setInvoiceId(item.id); setMethod('card') }}>
                                <CreditCard className="h-4 w-4" />{t('family.billing.pay')}
                              </Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
              </CardBody>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader title={t('family.billing.mandate')} action={<Button size="sm" variant="outline" onClick={() => void requestMandate()} loading={mandate.isPending}>{t('family.billing.requestMandate')}</Button>} />
                <CardBody>
                  {data.mandate
                    ? <p className="text-sm text-content">{data.mandate.ibanMasked} · {data.mandate.status}</p>
                    : <p className="text-sm text-content-muted">{t('family.billing.empty')}</p>}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.billing.receipts')} />
                <CardBody className="p-0">
                  {receipts.length === 0
                    ? <p className="px-5 py-6 text-center text-sm text-content-muted">{t('state.empty')}</p>
                    : (
                      <ul className="divide-y divide-line/60">
                        {receipts.map(receipt => (
                          <li key={receipt.id} className="flex items-center justify-between gap-3 px-5 py-3">
                            <div>
                              <p className="text-sm text-content">{receipt.receiptName}</p>
                              <p className="text-xs text-content-muted">{formatMoney(receipt.amountCents, receipt.currency)} · {receipt.method} · {receipt.pspReference}</p>
                            </div>
                            <Download className="h-4 w-4 text-content-subtle" aria-hidden />
                          </li>
                        ))}
                      </ul>
                    )}
                </CardBody>
              </Card>
            </div>
            <p className="text-xs text-content-subtle">{t('family.billing.payerVisibility')}</p>
          </div>
        )}
      </QueryState>

      <Modal
        open={!!invoice}
        onOpenChange={value => { if (!value) setInvoiceId('') }}
        title={t('family.billing.pay')}
        description={invoice ? `${invoice.label} · ${formatMoney(invoice.amountCents, invoice.currency)}` : undefined}
        footer={<>
          <Button variant="ghost" onClick={() => setInvoiceId('')}>{t('common.cancel')}</Button>
          <Button onClick={() => void submit()} loading={pay.isPending}>{t('family.billing.pay')}</Button>
        </>}
      >
        <div className="space-y-4">
          <SelectField label={t('family.billing.pay')} value={method} onValueChange={value => setMethod(value as 'card' | 'sepa')}
            options={[{ value: 'card', label: 'Carte bancaire' }, { value: 'sepa', label: 'Prélèvement SEPA' }]} />
          <Banner tone="warning" title={t('family.billing.stepUp')}>{t('family.profile.mfaHint')}</Banner>
        </div>
      </Modal>
    </FamilyPage>
  )
}
