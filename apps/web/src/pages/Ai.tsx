import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bot, FileScan, Languages, Mic, ShieldCheck, Sparkles } from 'lucide-react'
import {
  AiLabel, AiSuggestionCard, Banner, Button, Card, CardBody, CardHeader, Modal, RedactionPreview, StatCard, Switch, Tabs, Textarea, toast,
} from '@schoolos/ui'
import { useDecideSuggestion, useModels, useSuggestions } from '@schoolos/api-client'
import type { AiSuggestion } from '@schoolos/shared'
import { ForbiddenCard, MockNotice, OfflineNotice, PageHeader, QueryState } from '../components/Screen'
import { useCan } from '../app/permissions'

export function AiSuggestionsPage() {
  const { t } = useTranslation()
  const canUse = useCan('ai.use')
  const suggestions = useSuggestions()
  const decide = useDecideSuggestion()
  const [editing, setEditing] = useState<AiSuggestion | null>(null)
  const [draft, setDraft] = useState('')
  const [filter, setFilter] = useState<'proposed' | 'all'>('proposed')
  if (!canUse) return <ForbiddenCard />

  const list = (suggestions.data?.data ?? []).filter(s => filter === 'all' || s.status === 'proposed')

  const decideItem = async (id: string, status: AiSuggestion['status']) => {
    try { await decide.mutateAsync({ id, status }); toast.success(t('common.save')) }
    catch { toast.error(t('state.error')) }
  }

  return (
    <div className="ui-page">
      <OfflineNotice />
      <div className="mb-5"><Banner tone="warning" title={t('ai.label')}>{t('ai.subtitle')} {t('ai.forbidden')}</Banner></div>
      <PageHeader title={t('ai.title')} subtitle={t('ai.subtitle')}
        actions={<><MockNotice mock={suggestions.data?.mock} compact /><AiLabel /></>}
        breadcrumbs={[{ label: t('nav.group.insights') }, { label: t('nav.ai') }]} />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('ai.inbox')} value={suggestions.data?.data?.filter(s => s.status === 'proposed').length ?? 0} icon={<Sparkles className="h-4 w-4" />} />
        <StatCard label={t('common.status')} value={suggestions.data?.data?.filter(s => s.status === 'approved').length ?? 0} tone="accent" />
        <StatCard label={t('ai.redaction')} value={suggestions.data?.data?.filter(s => s.redacted).length ?? 0} tone="info" />
      </div>
      <div className="mb-4 flex gap-2">
        <Button variant={filter === 'proposed' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('proposed')}>{t('ai.inbox')}</Button>
        <Button variant={filter === 'all' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('all')}>{t('common.all')}</Button>
      </div>
      <QueryState isLoading={suggestions.isLoading} error={suggestions.error} onRetry={() => void suggestions.refetch()} isEmpty={list.length === 0}>{() => (<>
        <div className="grid gap-4 xl:grid-cols-2">
          {list.map(s => (
            <AiSuggestionCard key={s.id} id={s.id} feature={s.feature} title={s.title} body={s.body} confidence={s.confidence} redacted={s.redacted}
              onAccept={id => void decideItem(id, 'approved')}
              onReject={id => void decideItem(id, 'rejected')}
              onEdit={id => { const item = list.find(x => x.id === id); if (item) { setEditing(item); setDraft(item.body) } }} />
          ))}
        </div>
      </>)}</QueryState>
      <Modal open={Boolean(editing)} onOpenChange={v => !v && setEditing(null)} title={t('ai.edit')} description={t('ai.label')}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>{t('common.cancel')}</Button><Button onClick={() => { if (editing) void decideItem(editing.id, 'edited'); setEditing(null) }}>{t('common.save')}</Button></>}>
        <div className="space-y-4">
          <RedactionPreview original={editing?.body ?? ''} redacted={draft} />
          <Textarea value={draft} onChange={e => setDraft(e.target.value)} rows={6} />
          <p className="text-xs text-content-subtle">{t('ai.redactionHint')}</p>
        </div>
      </Modal>
    </div>
  )
}

export function AiToolsPage() {
  const { t } = useTranslation()
  const canUse = useCan('ai.use')
  const models = useModels()
  const [killSwitch, setKillSwitch] = useState(false)
  const [input, setInput] = useState('Contactez Léa Martin au 06 12 34 56 78 au sujet de son dossier.')
  const redacted = input.replace(/\d[\d\s]{8,}/g, '[REDACTED]').replace(/Léa Martin/g, '[STUDENT]')
  if (!canUse) return <ForbiddenCard />

  return (
    <div className="ui-page">
      <PageHeader title={t('ai.tools')} subtitle={t('ai.subtitle')} actions={<AiLabel />} breadcrumbs={[{ label: t('nav.group.insights') }, { label: t('nav.aiTools') }]} />
      <div className="mb-5"><Banner tone="danger" title={t('ai.killSwitch')}>{t('ai.forbidden')}</Banner></div>
      <Card className="mb-5 p-5"><Switch checked={killSwitch} onCheckedChange={setKillSwitch} label={t('ai.killSwitch')} description={t('ai.subtitle')} /></Card>
      <Tabs items={[
        { value: 'translator', label: t('ai.translator'), icon: <Languages className="h-4 w-4" />, content: (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card><CardHeader title={t('ai.redactionPreview')} /><CardBody className="space-y-4">
              <Textarea value={input} onChange={e => setInput(e.target.value)} rows={4} />
              <RedactionPreview original={input} redacted={redacted} />
              <Button disabled={killSwitch} onClick={() => toast.info(t('ai.redactionHint'))}><Languages className="h-4 w-4" />{t('ai.translator')}</Button>
            </CardBody></Card>
            <Card><CardHeader title={t('platform.models')} /><CardBody className="space-y-2">
              {models.data?.data?.map(m => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3">
                  <span className="font-medium text-content">{m.task}</span>
                  <div className="flex items-center gap-2"><span className="text-xs text-content-subtle">{m.id}</span>{m.approved ? <ShieldCheck className="h-4 w-4 text-accent-600" /> : <Bot className="h-4 w-4 text-warning-500" />}</div>
                </div>
              ))}
            </CardBody></Card>
          </div>
        ) },
        { value: 'ocr', label: t('ai.ocr'), icon: <FileScan className="h-4 w-4" />, content: (
          <Card><CardHeader title={t('ai.ocr')} /><CardBody><div className="rounded-lg border border-dashed border-line p-10 text-center text-sm text-content-muted">PDF · JPG · PNG — {t('ai.redactionHint')}</div></CardBody></Card>
        ) },
        { value: 'stt', label: t('ai.stt'), icon: <Mic className="h-4 w-4" />, content: (
          <Card><CardHeader title={t('ai.stt')} /><CardBody><div className="rounded-lg border border-dashed border-line p-10 text-center text-sm text-content-muted">Microphone — {t('ai.redactionHint')}</div></CardBody></Card>
        ) },
      ]} />
    </div>
  )
}
