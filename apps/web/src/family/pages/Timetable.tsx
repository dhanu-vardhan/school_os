import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarCheck, Copy, Link2Off, Printer } from 'lucide-react'
import {
  createIcsFeed, revokeIcsFeed, useFamilyIcsFeed, useFamilyMutation, useFamilyTimetable,
} from '@schoolos/api-client'
import { Badge, Button, Card, CardBody, CardHeader, toast } from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { childName, FamilyPage, PrintButton } from '../components'
import { useFamily } from '../context'

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']

/** G4 — weekly timetable with change markers and a revocable ICS subscription. */
export function FamilyTimetablePage() {
  const { t } = useTranslation()
  const { children, childId, selected } = useFamily()
  const query = useFamilyTimetable(childId)
  const feed = useFamilyIcsFeed(childId)
  const createFeed = useFamilyMutation(createIcsFeed)
  const revokeFeed = useFamilyMutation(revokeIcsFeed)
  const [createdUrl, setCreatedUrl] = useState('')

  const entries = query.data?.data ?? []
  const buckets = useMemo(() => {
    const map = new Map<string, typeof entries>()
    for (const child of selected ? [selected] : children) {
      map.set(child.id, entries.filter(entry => entry.childId === child.id))
    }
    return map
  }, [entries, selected, children])

  const subscribe = async () => {
    if (!selected) return
    try {
      const result = await createFeed.mutateAsync(selected.id)
      setCreatedUrl(result.data.url)
      toast.success(t('family.timetable.icsCreated'))
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  const revoke = async () => {
    const token = feed.data?.data.token
    if (!token) return
    try {
      await revokeFeed.mutateAsync(token)
      setCreatedUrl('')
      toast.success(t('family.timetable.icsRevoked'))
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  const feedUrl = createdUrl || feed.data?.data.url

  return (
    <FamilyPage
      title={t('family.timetable.week')}
      subtitle={selected?.className}
      actions={<>
        <MockNotice mock={query.data?.mock} compact />
        <PrintButton label={t('family.timetable.print')} />
        {selected && <Button variant="outline" onClick={() => void subscribe()} loading={createFeed.isPending}><CalendarCheck className="h-4 w-4" />{t('family.timetable.ics')}</Button>}
      </>}
    >
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()} loading={<ScreenLoading variant="detail" />}>
        {() => (
          <div className="space-y-5">
            {feedUrl && (
              <Card>
                <CardHeader title={t('family.timetable.ics')} description={t('family.timetable.icsHint')} action={
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={async () => {
                      try { await navigator.clipboard.writeText(feedUrl); toast.success(t('common.copy')) } catch { toast.error(t('family.action.failed')) }
                    }}><Copy className="h-4 w-4" />{t('common.copy')}</Button>
                    <Button size="sm" variant="ghost" onClick={() => void revoke()} loading={revokeFeed.isPending}><Link2Off className="h-4 w-4" />{t('family.timetable.revoke')}</Button>
                  </div>
                } />
                <CardBody>
                  <code className="block overflow-x-auto rounded-md bg-surface-2 px-3 py-2 text-xs text-content">{feedUrl}</code>
                </CardBody>
              </Card>
            )}

            {[...buckets.entries()].map(([id, list]) => {
              const child = children.find(item => item.id === id)
              return (
                <Card key={id}>
                  <CardHeader title={childName(child)} description={child?.className} />
                  <CardBody className="p-0">
                    <div className="ui-scroll overflow-x-auto">
                      <div className="grid min-w-[56rem] grid-cols-5 divide-x divide-line/60">
                        {DAYS.map((day, index) => (
                          <div key={day} className="p-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-subtle">{day}</p>
                            <div className="space-y-2">
                              {list.filter(entry => entry.day === index).sort((a, b) => a.start.localeCompare(b.start)).map(entry => (
                                <div key={entry.id} className="rounded-md border border-line bg-surface p-2.5">
                                  <p className="tnum text-[0.6875rem] text-content-subtle">{entry.start}–{entry.end}</p>
                                  <p className="text-sm font-medium text-content">{entry.subject}</p>
                                  <p className="text-xs text-content-muted">{entry.teacher} · {entry.room}</p>
                                  {entry.change && (
                                    <Badge tone="warning" className="mt-1.5">{t('family.timetable.change')} · {entry.change.kind}</Badge>
                                  )}
                                  {entry.change?.note && <p className="mt-1 text-[0.6875rem] text-content-muted">{entry.change.note}</p>}
                                </div>
                              ))}
                              {list.every(entry => entry.day !== index) && (
                                <p className="text-xs text-content-subtle">—</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
            <p className="flex items-center gap-1 text-xs text-content-subtle"><Printer className="h-3.5 w-3.5" />{t('family.timetable.icsHint')}</p>
          </div>
        )}
      </QueryState>
    </FamilyPage>
  )
}
