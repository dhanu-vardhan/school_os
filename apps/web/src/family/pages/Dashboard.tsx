import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight, BellRing, CalendarDays, ClipboardList, FileSignature, ReceiptText, UsersRound,
} from 'lucide-react'
import { useFamilyDashboard } from '@schoolos/api-client'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, StatCard } from '@schoolos/ui'
import { MockNotice, OfflineNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { childName, FamilyPage, formatDay, formatMoney } from '../components'
import { useFamily } from '../context'

function SectionEmpty({ children }: { children: string }) {
  return <p className="px-5 py-6 text-center text-sm text-content-muted">{children}</p>
}

/** G1 — family dashboard. Never calls the global student list: every row is guardian-scoped. */
export function FamilyDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { children, withChild, selected, setChildId, isLoading: contextLoading, error: contextError, refetch } = useFamily()
  const query = useFamilyDashboard()
  const dash = query.data?.data

  if (!contextLoading && !contextError && children.length === 0) {
    return (
      <FamilyPage title={t('family.title')} subtitle={t('family.subtitle')} childScoped={false}>
        <Card><EmptyState title={t('family.noChildren')} description={t('family.noChildrenHint')} /></Card>
      </FamilyPage>
    )
  }

  const byChild = (id: string) => children.find(child => child.id === id)

  return (
    <FamilyPage
      title={t('family.title')}
      subtitle={dash ? `${t('family.today')} · ${dash.greetingName}` : t('family.subtitle')}
      childScoped={false}
      actions={<MockNotice mock={query.data?.mock} compact />}
    >
      <OfflineNotice />
      <QueryState
        isLoading={contextLoading || query.isLoading}
        error={contextError ?? query.error}
        onRetry={refetch}
        loading={<ScreenLoading variant="dashboard" />}
      >
        {() => dash && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label={t('family.dashboard.messages')} value={dash.unreadMessages} icon={<BellRing className="h-4 w-4" />} tone="info"
                onClick={() => { navigate('/family/messages') }} />
              <StatCard label={t('family.dashboard.forms')} value={dash.pendingForms.length} icon={<FileSignature className="h-4 w-4" />} tone="warning"
                onClick={() => { navigate('/family/forms') }} />
              <StatCard label={t('family.dashboard.balance')} value={formatMoney(dash.balanceCents, dash.currency)} icon={<ReceiptText className="h-4 w-4" />} tone={dash.balanceCents ? 'danger' : 'accent'}
                onClick={() => { navigate('/family/billing') }} />
              <StatCard label={t('family.dashboard.requests')} value={dash.requestCount} icon={<ClipboardList className="h-4 w-4" />} tone="brand"
                onClick={() => { navigate('/family/data-rights') }} />
            </div>

            {dash.restrictions.length > 0 && (
              <Card>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-content">{t('family.restrictedBannerTitle')}</p>
                    <p className="text-xs text-content-muted">{t('family.restrictedData')}</p>
                  </div>
                  <Badge tone="warning">{dash.restrictions.length}</Badge>
                </CardBody>
              </Card>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader title={t('family.dashboard.timetable')} action={<CalendarDays className="h-4 w-4 text-content-subtle" />} />
                <CardBody className="space-y-4 p-0">
                  {dash.today.length === 0 && <SectionEmpty>{t('family.dashboard.emptyTimetable')}</SectionEmpty>}
                  {dash.today.map(day => {
                    const child = byChild(day.childId)
                    return (
                      <div key={day.childId} className="border-t border-line/60 px-5 py-3 first:border-t-0">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <button className="text-left text-sm font-semibold text-content hover:text-brand-700" onClick={() => setChildId(child?.id)}>
                            {childName(child)}
                          </button>
                          <Link to={withChild('/family/timetable')} className="text-xs text-brand-700 hover:underline">{t('family.details')}</Link>
                        </div>
                        {day.entries.length === 0 && <p className="text-xs text-content-muted">{t('family.dashboard.emptyTimetable')}</p>}
                        <ul className="space-y-1.5">
                          {day.entries.map(entry => (
                            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm">
                              <span className="min-w-0 truncate">{entry.start}–{entry.end} · {entry.subject}</span>
                              {entry.change
                                ? <Badge tone="warning">{t('family.timetable.change')} · {entry.change.kind}</Badge>
                                : <span className="text-xs text-content-subtle">{entry.room}</span>}
                            </li>
                          ))}
                        </ul>
                        {day.changes.length > 0 && (
                          <p className="mt-1 text-xs text-warning-700 dark:text-warning-300">{t('family.dashboard.changes')} : {day.changes.map(c => c.subject).join(', ')}</p>
                        )}
                      </div>
                    )
                  })}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.dashboard.homework')} action={<Link to="/family/homework" className="text-xs text-brand-700 hover:underline">{t('family.details')}</Link>} />
                <CardBody className="p-0">
                  {dash.homeworkDue.length === 0 && <SectionEmpty>{t('family.dashboard.emptyHomework')}</SectionEmpty>}
                  <ul className="divide-y divide-line/60">
                    {dash.homeworkDue.map(({ childId, item }) => (
                      <li key={item.id} className="flex items-start justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-content">{item.title}</p>
                          <p className="text-xs text-content-muted">{childName(byChild(childId))} · {item.subject}</p>
                        </div>
                        <span className="shrink-0 text-xs text-content-subtle">{formatDay(item.dueAt)}</span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.dashboard.grades')} action={<Link to="/family/grades" className="text-xs text-brand-700 hover:underline">{t('family.details')}</Link>} />
                <CardBody className="p-0">
                  {dash.newGrades.length === 0 && <SectionEmpty>{t('family.dashboard.emptyGrades')}</SectionEmpty>}
                  <ul className="divide-y divide-line/60">
                    {dash.newGrades.map(({ childId, grade }) => (
                      <li key={grade.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-content">{grade.subject} · {grade.evaluation}</p>
                          <p className="text-xs text-content-muted">{childName(byChild(childId))}</p>
                        </div>
                        <span className="tnum shrink-0 text-sm font-semibold text-content">{grade.score}/{grade.outOf}</span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.dashboard.forms')} action={<Link to="/family/forms" className="text-xs text-brand-700 hover:underline">{t('family.details')}</Link>} />
                <CardBody className="p-0">
                  {dash.pendingForms.length === 0 && <SectionEmpty>{t('family.dashboard.emptyForms')}</SectionEmpty>}
                  <ul className="divide-y divide-line/60">
                    {dash.pendingForms.map(({ assignment, childId }) => (
                      <li key={assignment.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-content">{assignment.title}</p>
                          <p className="text-xs text-content-muted">{childName(byChild(childId))} · {t('family.dueOn', { date: formatDay(assignment.dueAt) })}</p>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link to={withChild('/family/forms')}>{t('family.sign')}</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader title={t('family.dashboard.events')} />
                <CardBody className="p-0">
                  {dash.upcomingEvents.length === 0
                    ? <SectionEmpty>{t('family.announcements.empty')}</SectionEmpty>
                    : (
                      <ul className="divide-y divide-line/60">
                        {dash.upcomingEvents.map(event => (
                          <li key={event.id} className="flex items-center justify-between gap-3 px-5 py-3">
                            <span className="text-sm text-content">{event.title}</span>
                            <span className="shrink-0 text-xs text-content-subtle">{formatDay(event.start)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t('family.dashboard.collectors')} action={<UsersRound className="h-4 w-4 text-content-subtle" />} />
                <CardBody className="flex items-center justify-between gap-4">
                  <div>
                    <p className="tnum font-display text-2xl font-bold text-content">{dash.pendingCollectors}</p>
                    <p className="text-xs text-content-muted">{t('family.collectors.status.pending')}</p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/family/collectors">{t('family.details')}<ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                </CardBody>
              </Card>
            </div>

            {selected && (
              <p className="text-xs text-content-subtle">
                {t('family.childSwitcher')} : {childName(selected)} · {selected.className}
              </p>
            )}
          </div>
        )}
      </QueryState>
    </FamilyPage>
  )
}
