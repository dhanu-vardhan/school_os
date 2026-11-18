import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FilePlus2 } from 'lucide-react'
import {
  downloadFamilyDocument, requestFamilyDocument, useFamilyDocuments, useFamilyDownloads, useFamilyMutation,
} from '@schoolos/api-client'
import { Badge, Button, Card, CardBody, CardHeader, Input, Modal, StatusPill, toast } from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { FamilyPage, formatDateTime, formatDay, SelectField } from '../components'
import { useFamily } from '../context'

const DOCUMENT_TYPES = ['certificat_scolarite', 'attestation_scolarite', 'reglement_interieur', 'bulletin', 'attestation_cantine', 'custom'] as const

/** G15 — documents, requests and a watermarked, audited download history. */
export function FamilyDocumentsPage() {
  const { t } = useTranslation()
  const { children, childId, selected } = useFamily()
  const query = useFamilyDocuments(childId)
  const downloads = useFamilyDownloads()
  const request = useFamilyMutation(requestFamilyDocument)
  const download = useFamilyMutation(downloadFamilyDocument)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ childId: childId ?? children[0]?.id ?? '', type: 'certificat_scolarite' as string, title: '' })

  const docs = query.data?.data ?? []

  const submit = async () => {
    try {
      await request.mutateAsync({ childId: form.childId, type: form.type, title: form.title || 'Certificat de scolarité' })
      toast.success(t('family.documents.requested'))
      setOpen(false)
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  const doDownload = async (id: string) => {
    try {
      const result = await download.mutateAsync(id)
      toast.success(`${t('family.documents.download')} · ${result.data.download.watermark}`)
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  return (
    <FamilyPage
      title={t('family.documents.title')}
      subtitle={selected?.className}
      actions={<>
        <MockNotice mock={query.data?.mock} compact />
        <Button onClick={() => setOpen(true)}><FilePlus2 className="h-4 w-4" />{t('family.documents.request')}</Button>
      </>}
    >
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()} loading={<ScreenLoading variant="table" />}>
        {() => (
          <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
            <Card>
              <CardHeader title={t('family.documents.title')} description={t('family.documents.watermark')} />
              <CardBody className="p-0">
                {docs.length === 0
                  ? <p className="px-5 py-6 text-center text-sm text-content-muted">{t('family.documents.empty')}</p>
                  : (
                    <ul className="divide-y divide-line/60">
                      {docs.map(document => (
                        <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-content">{document.title}</p>
                            <p className="text-xs text-content-muted">
                              {children.find(child => child.id === document.childId)?.firstName ?? ''} · {document.type}
                              {document.expiresAt ? ` · ${t('family.documents.expires', { date: formatDay(document.expiresAt) })}` : ''}
                            </p>
                            {document.watermark && <p className="text-[0.6875rem] text-content-subtle">{document.watermark}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusPill status={document.status} />
                            {document.status === 'available'
                              ? <Button size="sm" variant="outline" onClick={() => void doDownload(document.id)} loading={download.isPending}><Download className="h-4 w-4" />{t('family.documents.download')}</Button>
                              : <Badge tone="neutral">{t('family.documents.unavailable')}</Badge>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
              </CardBody>
            </Card>

            <Card className="h-fit">
              <CardHeader title={t('family.documents.history')} />
              <CardBody className="p-0">
                {(downloads.data?.data ?? []).length === 0
                  ? <p className="px-4 py-6 text-center text-sm text-content-muted">{t('state.empty')}</p>
                  : (
                    <ul className="divide-y divide-line/60">
                      {downloads.data?.data.map(item => (
                        <li key={item.id} className="px-4 py-3">
                          <p className="text-sm text-content">{item.documentTitle}</p>
                          <p className="text-xs text-content-muted">{formatDateTime(item.downloadedAt)}</p>
                          <p className="text-[0.6875rem] text-content-subtle">{item.watermark} · {item.ipHash}</p>
                        </li>
                      ))}
                    </ul>
                  )}
              </CardBody>
            </Card>
          </div>
        )}
      </QueryState>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={t('family.documents.request')}
        description={t('family.documents.watermark')}
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => void submit()} loading={request.isPending}>{t('family.documents.request')}</Button>
        </>}
      >
        <div className="space-y-4">
          <SelectField label={t('family.childSwitcher')} value={form.childId}
            onValueChange={value => setForm({ ...form, childId: value })}
            options={children.map(child => ({ value: child.id, label: `${child.firstName} · ${child.className}` }))} />
          <SelectField label={t('family.dataRights.type')} value={form.type}
            onValueChange={value => setForm({ ...form, type: value })}
            options={DOCUMENT_TYPES.map(type => ({ value: type, label: type.replaceAll('_', ' ') }))} />
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-content">{t('family.dataRights.subject')}</span>
            <Input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} />
          </label>
        </div>
      </Modal>
    </FamilyPage>
  )
}
