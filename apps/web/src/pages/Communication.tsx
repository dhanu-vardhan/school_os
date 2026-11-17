import { useCallback, useState } from 'react'
import { useShortcutAction } from '../app/shortcuts'
import { useTranslation } from 'react-i18next'
import { Bell, CheckCheck, Mail, Megaphone, Send } from 'lucide-react'
import {
  Badge, Banner, Button, Card, CardBody, CardHeader, FormField, Input, Modal, Select,
  Tabs, Textarea, Timeline, cn, toast,
} from '@schoolos/ui'
import {
  useAnnouncements, useCreateAnnouncement, useMarkAllNotificationsRead, useMarkNotificationRead,
  useMessages, useNotifications, useSendMessage,
} from '@schoolos/api-client'
import { formatDate } from '@schoolos/i18n'
import type { Message } from '@schoolos/shared'
import { MockNotice, OfflineNotice, PageHeader, QueryState, ScreenEmpty } from '../components/Screen'

export function NotificationsPage() {
  const { t } = useTranslation()
  const notifications = useNotifications()
  const markAll = useMarkAllNotificationsRead()
  const markOne = useMarkNotificationRead()
  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title={t('comm.notifications')} actions={<><MockNotice mock={notifications.data?.mock} compact /><Button variant="outline" loading={markAll.isPending} onClick={() => void markAll.mutateAsync()}><CheckCheck className="h-4 w-4" />{t('comm.markAllRead')}</Button></>} breadcrumbs={[{ label: t('nav.notifications') }]} />
      <div className="mb-4"><Banner tone="info" title={t('comm.noSafeguarding')} /></div>
      <QueryState isLoading={notifications.isLoading} error={notifications.error} onRetry={() => void notifications.refetch()} isEmpty={notifications.data?.data?.length === 0} empty={<ScreenEmpty title={t('comm.empty')} />}>{() => (<>
        <Card><CardBody className="space-y-2">
          {notifications.data!.data.map(n => (
            <Button key={n.id} variant="bare" onClick={() => void markOne.mutateAsync(n.id)}
              aria-label={`${n.title} — ${n.category}`}
              className={cn('flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                n.read ? 'border-line bg-surface' : 'border-brand-200 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/10')}>
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.tone === 'danger' ? 'bg-danger-100 text-danger-600' : n.tone === 'warning' ? 'bg-warning-100 text-warning-600' : 'bg-brand-100 text-brand-600'} dark:bg-surface-3`}><Bell className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1"><p className="font-medium text-content">{n.title}</p><p className="text-sm text-content-muted">{n.body}</p><p className="mt-1 text-xs text-content-subtle">{formatDate(n.at)} · {n.category}</p></div>
              {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="unread" />}
            </Button>
          ))}
        </CardBody></Card>
      </>)}</QueryState>
    </div>
  )
}

export function AnnouncementsPage() {
  const { t } = useTranslation()
  const announcements = useAnnouncements()
  const create = useCreateAnnouncement()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('all')

  const publish = async () => {
    try {
      await create.mutateAsync({ title, body, audience, author: 'Direction' })
      toast.success(t('common.save')); setOpen(false); setTitle(''); setBody('')
    } catch { toast.error(t('state.error')) }
  }

  // Cmd/Ctrl+Enter publishes only while the compose modal has valid content.
  const publishShortcut = useCallback(() => {
    if (open && title.trim() && body.trim() && !create.isPending) void publish()
    // publish is recreated each render; the guard above is what matters for shortcuts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title, body, create.isPending])
  useShortcutAction('primary', publishShortcut)

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title={t('comm.announcements')} actions={<><MockNotice mock={announcements.data?.mock} compact /><Button onClick={() => setOpen(true)}><Megaphone className="h-4 w-4" />{t('dash.newAnnouncement')}</Button></>} breadcrumbs={[{ label: t('nav.group.communication') }, { label: t('nav.announcements') }]} />
      <QueryState isLoading={announcements.isLoading} error={announcements.error} onRetry={() => void announcements.refetch()} isEmpty={announcements.data?.data?.length === 0}>{() => (<>
        <div className="grid gap-4 lg:grid-cols-2">
          {announcements.data!.data.map(a => (
            <Card key={a.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-display text-base font-semibold text-content">{a.title}</h3><Badge tone="brand">{a.audience}</Badge></div>
              <p className="mt-2 text-sm text-content-muted">{a.body}</p>
              <p className="mt-3 text-xs text-content-subtle">{a.author} · {formatDate(a.at)}</p>
            </Card>
          ))}
        </div>
      </>)}</QueryState>
      <Modal open={open} onOpenChange={setOpen} title={t('dash.sendAnnouncement')} footer={<><Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button loading={create.isPending} disabled={!title || !body} onClick={() => void publish()}>{t('common.submit')}</Button></>}>
        <div className="space-y-4">
          <FormField label={t('common.details')} required>{props => <Input {...props} value={title} onChange={e => setTitle(e.target.value)} />}</FormField>
          <FormField label={t('common.details')} required>{props => <Textarea {...props} value={body} onChange={e => setBody(e.target.value)} rows={5} />}</FormField>
          <FormField label={t('common.role')}>{() => <Select value={audience} onValueChange={setAudience} options={[{ value: 'all', label: t('common.all') }, { value: 'parents', label: t('nav.guardians') }, { value: 'staff', label: t('nav.staff') }]} />}</FormField>
        </div>
      </Modal>
    </div>
  )
}

export function MessagesPage() {
  const { t } = useTranslation()
  const messages = useMessages()
  const send = useSendMessage()
  const [tab, setTab] = useState('inbox')
  const [selected, setSelected] = useState<Message | null>(null)
  const [reply, setReply] = useState('')

  const sendReply = async () => {
    if (!selected) return
    try { await send.mutateAsync({ to: selected.from, subject: `Re: ${selected.subject}`, body: reply }); toast.success(t('common.submit')); setReply('') }
    catch { toast.error(t('state.error')) }
  }

  // Cmd/Ctrl+Enter sends the reply only when a message is selected and text exists.
  const replyShortcut = useCallback(() => {
    if (selected && reply.trim() && !send.isPending) void sendReply()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, reply, send.isPending])
  useShortcutAction('primary', replyShortcut)

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title={t('comm.messages')} actions={<MockNotice mock={messages.data?.mock} compact />} breadcrumbs={[{ label: t('nav.group.communication') }, { label: t('nav.messages') }]} />
      <QueryState isLoading={messages.isLoading} error={messages.error} onRetry={() => void messages.refetch()} isEmpty={messages.data?.data?.length === 0}>{() => (<>
        <div className="grid gap-5 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader title={t('comm.messages')} action={<Badge tone="neutral">{messages.data!.data.length}</Badge>} />
            <CardBody className="space-y-2 p-2">
              {messages.data!.data.map(m => (
                <Button key={m.id} variant="bare" onClick={() => setSelected(m)}
                  aria-label={`${m.subject} — ${m.from}`}
                  className={cn('block w-full rounded-lg border p-3 text-left transition-colors',
                    selected?.id === m.id ? 'border-brand-300 bg-brand-50 dark:bg-brand-500/10' : 'border-line/0 hover:bg-surface-2',
                    !m.read && 'font-medium')}>
                  <div className="flex items-center justify-between gap-2"><p className="truncate text-sm text-content">{m.subject}</p>{!m.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}</div>
                  <p className="truncate text-xs text-content-muted">{m.from}</p>
                  <p className="mt-1 text-[11px] text-content-subtle">{formatDate(m.at)}</p>
                </Button>
              ))}
            </CardBody>
          </Card>
          <Card className="lg:col-span-3">
            {selected ? (
              <>
                <CardHeader title={selected.subject} description={`${selected.from} → ${selected.to} · ${formatDate(selected.at)}`} />
                <CardBody className="space-y-4">
                  <p className="rounded-lg bg-surface-2 p-4 text-sm text-content-muted">{selected.body}</p>
                  {selected.replies.length > 0 && <Timeline items={selected.replies.map(r => ({ id: r.id, title: r.from, description: r.body, time: formatDate(r.at) }))} />}
                  <FormField label={t('comm.reply')}>{props => <Textarea {...props} value={reply} onChange={e => setReply(e.target.value)} rows={3} />}</FormField>
                  <Button loading={send.isPending} disabled={!reply} onClick={() => void sendReply()}><Send className="h-4 w-4" />{t('common.submit')}</Button>
                </CardBody>
              </>
            ) : <CardBody><div className="flex min-h-64 flex-col items-center justify-center text-center text-sm text-content-muted"><Mail className="mb-3 h-8 w-8 text-brand-400" />{t('comm.writeMessage')}</div></CardBody>}
          </Card>
        </div>
      </>)}</QueryState>
    </div>
  )
}
