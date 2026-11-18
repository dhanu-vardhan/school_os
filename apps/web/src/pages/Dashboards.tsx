import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

type TFunction = ReturnType<typeof useTranslation>['t']
import {
  ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, ClipboardList, FileText, HeartPulse,
  Inbox, Megaphone, ShieldCheck, Sparkles, UsersRound, Wallet,
} from 'lucide-react'
import {
  Badge, Button, CalendarGrid, Card, CardBody, CardHeader, Progress, StatCard, StatusPill, Timeline,
} from '@schoolos/ui'
import {
  useAnnouncements, useClasses, useConcerns, useDashboard, useHolidays, useInvoices,
  useMessages, useNotifications, useStudents, useSuggestions, useTimetable,
} from '@schoolos/api-client'
import { formatDate, formatMoney } from '@schoolos/i18n'
import { can, ROLE_FAMILY } from '@schoolos/shared'
import { useSession } from '../app/session'
import { BarChart, TrendChart } from '../components/Charts'
import { MockNotice, OfflineNotice, PageHeader, QueryState, ScreenError, ScreenLoading } from '../components/Screen'

/** Always-visible shortcuts for the most common role-appropriate tasks. */
function TopTasks() {
  const { t } = useTranslation()
  const { role } = useSession()
  return (
    <Card className="mb-6">
      <CardBody className="flex flex-wrap items-center gap-3">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-content-subtle">{t('dash.topTasks')}</span>
        <Button asChild size="sm"><Link to="/app/timetable"><CalendarDays className="h-4 w-4" />{t('nav.timetable')}</Link></Button>
        {can(role, 'students.read') && (
          <Button asChild variant="outline" size="sm"><Link to="/app/attendance"><ClipboardCheck className="h-4 w-4" />{t('nav.attendance')}</Link></Button>
        )}
        {can(role, 'messages.read') && (
          <Button asChild variant="outline" size="sm"><Link to="/app/communication/messages"><Megaphone className="h-4 w-4" />{t('nav.messages')}</Link></Button>
        )}
        {can(role, 'reports.read') && (
          <Button asChild variant="outline" size="sm"><Link to="/app/reports"><ClipboardList className="h-4 w-4" />{t('nav.reports')}</Link></Button>
        )}
        {can(role, 'students.write') && (
          <Button asChild variant="outline" size="sm"><Link to="/app/people/students"><UsersRound className="h-4 w-4" />{t('nav.students')}</Link></Button>
        )}
      </CardBody>
    </Card>
  )
}

function Frame({ title, subtitle, children, mock }: { title: string; subtitle?: string; children: ReactNode; mock?: boolean }) {
  const { session } = useSession()
  const { t } = useTranslation()
  const today = new Intl.DateTimeFormat(session.user?.locale === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader
        title={t('dash.greeting', { name: session.user?.name?.split(' ')[0] ?? '' })}
        subtitle={t('dash.subtitle', { date: today, year: '2026–2027' })}
        actions={<MockNotice mock={mock} />}
      />
      <div className="ui-sr-only">{t(`dash.${title}`)} {subtitle}</div>
      <TopTasks />
      {children}
    </div>
  )
}

function useCommon() {
  const dashboard = useDashboard()
  const students = useStudents()
  const concerns = useConcerns()
  const suggestions = useSuggestions()
  const holidays = useHolidays()
  const isLoading = dashboard.isLoading || students.isLoading || concerns.isLoading || suggestions.isLoading || holidays.isLoading
  const error = dashboard.error ?? students.error ?? concerns.error ?? suggestions.error ?? holidays.error
  const mock = dashboard.data?.mock || students.data?.mock || concerns.data?.mock || suggestions.data?.mock || holidays.data?.mock
  return { dashboard, students, concerns, suggestions, holidays, isLoading, error, mock }
}

function KpiRow({ kpis, t }: { kpis: { enrolment: number; attendanceRate: number; openConcerns: number; activityUptake: number; aiPending: number; presentToday: number }; t: TFunction }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label={t('dash.enrolment')} value={kpis.enrolment} hint={`${kpis.presentToday} ${t('dash.presentToday').toLowerCase()}`} icon={<UsersRound className="h-4 w-4" />} tone="brand" />
      <StatCard label={t('dash.attendanceRate')} value={`${kpis.attendanceRate}%`} trend={2} hint={t('common.week')} icon={<CheckCircle2 className="h-4 w-4" />} tone="accent" />
      <StatCard label={t('dash.openConcerns')} value={kpis.openConcerns} hint={t('dash.safeguardingCountHint')} icon={<ShieldCheck className="h-4 w-4" />} tone="danger" />
      <StatCard label={t('dash.aiPending')} value={kpis.aiPending} hint={t('ai.subtitle')} icon={<Sparkles className="h-4 w-4" />} tone="info" />
    </div>
  )
}

export function AdminDashboard() {
  const { t } = useTranslation()
  const { dashboard, concerns, suggestions, holidays, isLoading, error, mock } = useCommon()
  const audit = useNotifications()

  return (
    <Frame title="admin" mock={mock}>
      <QueryState isLoading={isLoading} error={error} onRetry={() => void dashboard.refetch()} loading={<ScreenLoading variant="dashboard" />}>{() => (<>
        <KpiRow kpis={dashboard.data!.data.kpis} t={t} />
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title={t('dash.attendanceTrend')} description={t('common.week')} />
            <CardBody><TrendChart data={dashboard.data!.data.attendanceTrend} /></CardBody>
          </Card>
          <Card>
            <CardHeader title={t('dash.enrolmentByLevel')} />
            <CardBody><BarChart data={dashboard.data!.data.enrolmentByLevel} height={180} /></CardBody>
          </Card>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader title={t('dash.upcoming')} action={<Button asChild variant="ghost" size="sm"><Link to="/app/activities">{t('common.viewAll')}</Link></Button>} />
            <CardBody>
              <Timeline items={holidays.data!.data.slice(0, 3).map(h => ({ id: h.name, title: h.name, time: `${formatDate(h.start)} → ${formatDate(h.end)}`, tone: 'brand' as const }))} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('dash.alerts')} description={t('dash.safeguardingCountHint')} />
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2 p-3">
                  <span className="flex items-center gap-2 text-sm text-content"><ShieldCheck className="h-4 w-4 text-danger-500" />{t('dash.openConcerns')}</span>
                  <span className="tnum text-lg font-bold text-content">{concerns.data!.data.filter(c => c.status !== 'closed').length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2 p-3">
                  <span className="flex items-center gap-2 text-sm text-content"><Sparkles className="h-4 w-4 text-info-500" />{t('dash.aiPending')}</span>
                  <span className="tnum text-lg font-bold text-content">{suggestions.data!.data.filter(s => s.status === 'proposed').length}</span>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full"><Link to="/app/ai/suggestions">{t('common.viewAll')}<ArrowRight className="h-4 w-4" /></Link></Button>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('dash.lastAudit')} />
            <CardBody>
              <Timeline items={audit.data!.data.slice(0, 4).map(n => ({ id: n.id, title: n.title, description: n.body, time: formatDate(n.at), tone: n.tone === 'danger' ? 'danger' as const : 'brand' as const }))} />
            </CardBody>
          </Card>
        </div>
        <Card className="mt-6">
          <CardHeader title={t('dash.quickActions')} />
          <CardBody className="flex flex-wrap gap-3">
            <Button asChild><Link to="/app/people/students/new"><UsersRound className="h-4 w-4" />{t('students.new')}</Link></Button>
            <Button asChild variant="outline"><Link to="/app/communication/announcements"><Megaphone className="h-4 w-4" />{t('dash.newAnnouncement')}</Link></Button>
            <Button asChild variant="outline"><Link to="/app/reports"><ClipboardList className="h-4 w-4" />{t('nav.reports')}</Link></Button>
          </CardBody>
        </Card>
      </>)}</QueryState>
    </Frame>
  )
}

export function TeacherDashboard() {
  const { t } = useTranslation()
  const { session } = useSession()
  const classes = useClasses()
  const timetable = useTimetable()
  const messages = useMessages()
  const students = useStudents()
  const isLoading = classes.isLoading || timetable.isLoading || messages.isLoading || students.isLoading
  const error = classes.error ?? timetable.error ?? messages.error ?? students.error
  const mock = classes.data?.mock || timetable.data?.mock || messages.data?.mock || students.data?.mock
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

  return (
    <Frame title="teacher" mock={mock}>
      <QueryState isLoading={isLoading} error={error} onRetry={() => void classes.refetch()}>{() => {
        const teacherName = session.user?.name?.trim()
        const myClasses = teacherName
          ? classes.data!.data.filter(c => c.teacher === teacherName)
          : []
        const scopedClasses = myClasses.length ? myClasses : classes.data!.data.slice(0, 1)
        const classNames = new Set(scopedClasses.map(c => c.name))
        const scopedTimetable = timetable.data!.data.filter(event => {
          const subtitle = event.subtitle ?? ''
          return [...classNames].some(name => subtitle.includes(name))
        })
        const visibleTimetable = scopedTimetable.length ? scopedTimetable : timetable.data!.data.filter(e => e.day === new Date().getDay() - 1)
        const todayIndex = (new Date().getDay() + 6) % 7
        const todayClasses = scopedTimetable.filter(e => e.day === todayIndex).length || scopedClasses.length
        const classIds = new Set(scopedClasses.map(c => c.id))
        const scopedStudents = students.data!.data.filter(s => s.classId && classIds.has(s.classId))
        const enrolment = scopedStudents.length || scopedClasses.reduce((sum, c) => sum + c.headcount, 0)

        return (<>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t('dash.todayClasses')} value={todayClasses} icon={<CalendarDays className="h-4 w-4" />} />
          <StatCard label={t('dash.attendanceToTake')} value={scopedClasses.length ? 1 : 0} tone="warning" icon={<CheckCircle2 className="h-4 w-4" />} />
          <StatCard label={t('dash.tasks')} value={Math.max(scopedClasses.length, 1)} tone="info" icon={<ClipboardList className="h-4 w-4" />} />
          <StatCard label={t('dash.enrolment')} value={enrolment} tone="accent" icon={<UsersRound className="h-4 w-4" />} />
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title={t('nav.dashboard')} description={t('dash.todayOverview')} />
            <CardBody><CalendarGrid days={days.map(d => ({ label: d }))} events={visibleTimetable} startHour={8} endHour={18} /></CardBody>
          </Card>
          <div className="space-y-5">
            <Card>
              <CardHeader title={t('dash.todayClasses')} />
              <CardBody className="space-y-3">
                {scopedClasses.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
                    <div className="min-w-0"><p className="truncate text-sm font-medium text-content">{c.name}</p><p className="text-xs text-content-subtle">{c.room} · {c.teacher}</p></div>
                    <Badge tone="neutral">{c.attendanceToday}/{c.headcount}</Badge>
                  </div>
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t('dash.recentNotes')} />
              <CardBody>
                <Timeline items={messages.data!.data.slice(0, 3).map(m => ({ id: m.id, title: m.subject, description: m.body, time: formatDate(m.at) }))} />
              </CardBody>
            </Card>
          </div>
        </div>
      </>)}}</QueryState>
    </Frame>
  )
}

export function ParentDashboard() {
  const { t } = useTranslation()
  const students = useStudents()
  const messages = useMessages()
  const invoices = useInvoices()
  const announcements = useAnnouncements()
  const isLoading = students.isLoading || messages.isLoading || invoices.isLoading || announcements.isLoading
  const error = students.error ?? messages.error ?? invoices.error ?? announcements.error
  const mock = students.data?.mock || messages.data?.mock || invoices.data?.mock || announcements.data?.mock

  return (
    <Frame title="parent" mock={mock}>
      <QueryState isLoading={isLoading} error={error} onRetry={() => void students.refetch()}>{() => (<>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t('dash.myChildren')} value={2} icon={<UsersRound className="h-4 w-4" />} />
          <StatCard label={t('comm.messages')} value={messages.data!.data.filter(m => !m.read).length} tone="info" icon={<Inbox className="h-4 w-4" />} />
          <StatCard label={t('dash.documents')} value={invoices.data!.data.filter(i => i.status !== 'paid').length} tone="warning" icon={<FileText className="h-4 w-4" />} />
          <StatCard label={t('activities.mine')} value={3} tone="accent" icon={<CalendarDays className="h-4 w-4" />} />
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title={t('dash.myChildren')} action={<Button asChild variant="ghost" size="sm"><Link to="/app/people/students">{t('common.viewAll')}</Link></Button>} />
            <CardBody className="grid gap-3 sm:grid-cols-2">
              {students.data!.data.slice(0, 2).map(s => (
                <div key={s.id} className="rounded-lg border border-line p-4">
                  <p className="font-semibold text-content">{s.firstName} {s.lastName}</p>
                  <p className="mt-1 text-xs text-content-muted">{s.classId} · {t('students.col.enrolment')} {formatDate(s.enrolmentDate ?? '')}</p>
                  <Button asChild variant="ghost" size="sm" className="mt-3 px-0"><Link to={`/app/people/students/${s.id}`}>{t('common.details')}</Link></Button>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('dash.documents')} />
            <CardBody className="space-y-3">
              {invoices.data!.data.slice(0, 4).map(i => (
                <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-content">{i.label}</span>
                  <div className="flex shrink-0 items-center gap-2"><StatusPill status={i.status} /><span className="tnum font-semibold text-content">{formatMoney(i.amountCents)}</span></div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title={t('comm.messages')} />
            <CardBody><Timeline items={messages.data!.data.slice(0, 3).map(m => ({ id: m.id, title: m.subject, description: m.body, time: formatDate(m.at) }))} /></CardBody>
          </Card>
          <Card>
            <CardHeader title={t('dash.announcements')} />
            <CardBody><Timeline items={announcements.data!.data.map(a => ({ id: a.id, title: a.title, description: a.body, time: formatDate(a.at), tone: 'accent' as const }))} /></CardBody>
          </Card>
        </div>
      </>)}</QueryState>
    </Frame>
  )
}

export function StudentDashboard() {
  const { t } = useTranslation()
  const timetable = useTimetable()
  const activities = useAnnouncements()
  const isLoading = timetable.isLoading || activities.isLoading
  const error = timetable.error ?? activities.error
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']

  return (
    <Frame title="student" mock={timetable.data?.mock || activities.data?.mock}>
      <QueryState isLoading={isLoading} error={error} onRetry={() => void timetable.refetch()}>{() => (<>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t('dash.todayClasses')} value={4} icon={<CalendarDays className="h-4 w-4" />} />
          <StatCard label={t('activities.mine')} value={2} tone="accent" icon={<HeartPulse className="h-4 w-4" />} />
          <StatCard label={t('dash.tasks')} value={3} tone="warning" icon={<ClipboardList className="h-4 w-4" />} />
        </div>
        <Card className="mt-6">
          <CardHeader title={t('dash.todayOverview')} />
          <CardBody><CalendarGrid days={days.map(d => ({ label: d }))} events={timetable.data!.data} startHour={8} endHour={18} /></CardBody>
        </Card>
        <Card className="mt-6">
          <CardHeader title={t('dash.announcements')} />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2">
              {activities.data!.data.map(a => (
                <div key={a.id} className="rounded-lg border border-line p-4">
                  <p className="font-semibold text-content">{a.title}</p>
                  <p className="mt-1 text-sm text-content-muted">{a.body}</p>
                  <p className="mt-2 text-xs text-content-subtle">{formatDate(a.at)}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </>)}</QueryState>
    </Frame>
  )
}

export function DashboardSwitch() {
  const { role } = useSession()
  const family = ROLE_FAMILY[role as keyof typeof ROLE_FAMILY]
  if (family === 'teaching') return <TeacherDashboard />
  if (family === 'family') return role === 'student' ? <StudentDashboard /> : <ParentDashboard />
  if (family === 'platform') return <AdminDashboard />
  return <AdminDashboard />
}

export function DashboardErrorFallback({ retry }: { retry: () => void }) {
  const { t } = useTranslation()
  return <ScreenError error={new Error(t('state.error'))} onRetry={retry} />
}
