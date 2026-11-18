import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Flag, MailPlus, Send } from 'lucide-react'
import {
  markFamilyThreadRead, replyFamilyThread, reportFamilyThread, sendFamilyMessage,
  useFamilyMutation, useFamilyThreads,
} from '@schoolos/api-client'
import { MESSAGE_TEMPLATES, quietHoursState, type FamilyThread } from '@schoolos/shared'
import {
  Badge, Button, Card, CardBody, CardHeader, FormField, Input, Modal, Textarea, toast,
} from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { childName, FamilyPage, formatDateTime, SelectField } from '../components'
import { useFamily } from '../context'

const RECIPIENTS = ['teacher', 'school_life', 'direction'] as const

/** G7 — school messaging. Guardian↔guardian relay is refused server-side and in the UI. */
export function FamilyMessagesPage() {
  const { t } = useTranslation()
  const { children, overview, childId, selected } = useFamily()
  const query = useFamilyThreads()
  const reply = useFamilyMutation(({ id, body }: { id: string; body: string }) => replyFamilyThread(id, body))
  const markRead = useFamilyMutation(markFamilyThreadRead)
  const report = useFamilyMutation(reportFamilyThread)
  const send = useFamilyMutation(sendFamilyMessage)
  const [activeId, setActiveId] = useState('')
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ childId: '', recipientRole: 'teacher', templateId: '', subject: '', body: '', attachmentName: '' })

  const threads = query.data?.data ?? []
  const active: FamilyThread | undefined = threads.find(thread => thread.id === activeId) ?? threads[0]
  const quiet = useMemo(() => quietHoursState({ ...(overview?.policy.quietHours ?? { start: '18:00', end: '08:00' }), enabled: true }, new Date()), [overview])

  const openForm = () => {
    setForm({ childId: childId ?? children[0]?.id ?? '', recipientRole: 'teacher', templateId: '', subject: '', body: '', attachmentName: '' })
    setOpen(true)
  }

  const submit = async () => {
    if (!form.body.trim() || !form.subject.trim()) return
    try {
      await send.mutateAsync({
        childId: form.childId || undefined,
        recipientRole: form.recipientRole,
        subject: form.subject,
        body: form.body,
        templateId: form.templateId || undefined,
        attachmentName: form.attachmentName || undefined,
      })
      toast.success(t('family.messages.sent'))
      setOpen(false)
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  const sendReply = async () => {
    if (!active || !draft.trim()) return
    try {
      await reply.mutateAsync({ id: active.id, body: draft })
      setDraft('')
      toast.success(t('family.messages.sent'))
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  return (
    <FamilyPage
      title={t('family.messages.title')}
      subtitle={selected?.className}
      actions={<>
        <MockNotice mock={query.data?.mock} compact />
        <Button onClick={openForm}><MailPlus className="h-4 w-4" />{t('family.messages.new')}</Button>
      </>}
    >
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        isEmpty={threads.length === 0}
        empty={<Card><CardBody><p className="text-sm text-content-muted">{t('family.messages.empty')}</p></CardBody></Card>}
        loading={<ScreenLoading variant="list" />}
      >
        {() => (
          <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
            <Card className="h-fit">
              <CardHeader title={t('family.messages.title')} />
              <CardBody className="p-0">
                <ul className="divide-y divide-line/60">
                  {threads.map(thread => (
                    <li key={thread.id}>
                      <button
                        onClick={() => {
                          setActiveId(thread.id)
                          if (thread.unread) void markRead.mutateAsync(thread.id)
                        }}
                        className={`w-full px-4 py-3 text-left transition-colors hover:bg-surface-2 ${active?.id === thread.id ? 'bg-brand-50 dark:bg-brand-500/10' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-medium text-content">{thread.subject}</p>
                          {thread.unread > 0 && <Badge tone="warning">{thread.unread}</Badge>}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-content-muted">
                          {thread.childId ? childName(children.find(child => child.id === thread.childId)) : t('family.allChildren')}
                          {' · '}{formatDateTime(thread.messages.at(-1)?.at)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            {active && (
              <Card>
                <CardHeader
                  title={active.subject}
                  description={active.participants.map(participant => participant.name).join(' · ')}
                  action={(
                    <Button size="sm" variant="ghost" onClick={async () => {
                      try { await report.mutateAsync(active.id); toast.success(t('family.messages.reported')) } catch { toast.error(t('family.action.failed')) }
                    }}><Flag className="h-4 w-4" />{t('family.messages.report')}</Button>
                  )}
                />
                <CardBody className="space-y-4">
                  <ul className="space-y-3">
                    {active.messages.map(message => (
                      <li key={message.id} className={`rounded-lg border px-4 py-3 ${message.fromRole === 'guardian' ? 'border-brand-200 bg-brand-50/50 dark:border-brand-500/30 dark:bg-brand-500/10' : 'border-line bg-surface'}`}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-content">{message.fromName}</p>
                          <p className="text-xs text-content-subtle">{formatDateTime(message.at)}</p>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-content">{message.body}</p>
                        {message.attachments.map(attachment => (
                          <p key={attachment.id} className="mt-1 text-xs text-content-muted">
                            📎 {attachment.name} · {attachment.scanStatus === 'clean' ? t('family.child.granted') : t('family.attendance.pending')}
                          </p>
                        ))}
                      </li>
                    ))}
                  </ul>

                  {active.officeHoursAutoReply && quiet.quiet && (
                    <div className="rounded-md border border-info-200 bg-info-50 px-3 py-2 text-xs text-info-900 dark:border-info-500/30 dark:bg-info-500/10 dark:text-info-200">
                      <p className="font-semibold">{t('family.messages.quietAutoReply')}</p>
                      <p>{overview?.policy.officeHours.autoReply}</p>
                    </div>
                  )}

                  <FormField label={t('family.messages.body')}>{props => (
                    <Textarea {...props} value={draft} onChange={event => setDraft(event.target.value)} rows={3} maxLength={4000} />
                  )}</FormField>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-content-subtle">{active.retentionNotice}</p>
                    <Button onClick={() => void sendReply()} loading={reply.isPending} disabled={!draft.trim()}>
                      <Send className="h-4 w-4" />{t('family.messages.send')}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        )}
      </QueryState>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={t('family.messages.new')}
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => void submit()} loading={send.isPending} disabled={!form.body.trim() || !form.subject.trim()}>{t('family.messages.send')}</Button>
        </>}
      >
        <div className="space-y-4">
          <SelectField label={t('family.childSwitcher')} value={form.childId}
            onValueChange={value => setForm({ ...form, childId: value })}
            options={children.map(child => ({ value: child.id, label: `${child.firstName} · ${child.className}` }))} />
          <SelectField label={t('family.messages.recipient')} value={form.recipientRole}
            onValueChange={value => setForm({ ...form, recipientRole: value })}
            options={RECIPIENTS.map(role => ({ value: role, label: t(`family.messages.${role === 'school_life' ? 'schoolLife' : role}`) }))} />
          <SelectField label={t('family.messages.template')} value={form.templateId || 'none'}
            onValueChange={value => {
              const template = MESSAGE_TEMPLATES.find(item => item.id === value)
              setForm({ ...form, templateId: value === 'none' ? '' : value, subject: template?.subject ?? form.subject })
            }}
            options={[{ value: 'none', label: t('common.none', { defaultValue: '—' }) }, ...MESSAGE_TEMPLATES.map(template => ({ value: template.id, label: template.label }))]} />
          <FormField label={t('family.messages.subject')} required>{props => (
            <Input {...props} value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })} maxLength={120} />
          )}</FormField>
          <FormField label={t('family.messages.body')} required>{props => (
            <Textarea {...props} value={form.body} onChange={event => setForm({ ...form, body: event.target.value })} maxLength={4000} />
          )}</FormField>
          <FormField label={t('family.messages.attachment')}>{props => (
            <Input {...props} type="file" onChange={event => setForm({ ...form, attachmentName: event.target.files?.[0]?.name ?? '' })} />
          )}</FormField>
          <p className="text-xs text-content-subtle">{t('family.messages.noParentRelay')}</p>
          <p className="text-xs text-content-subtle">{t('family.messages.officeHours')}</p>
        </div>
      </Modal>
    </FamilyPage>
  )
}
