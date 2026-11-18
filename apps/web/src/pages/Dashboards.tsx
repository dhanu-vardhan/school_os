import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

type TFunction = ReturnType<typeof useTranslation>['t']
import {
  Activity, ArrowRight, Banknote, BookOpen, Building2, CalendarClock, CalendarDays, CheckCircle2, ClipboardCheck,
  ClipboardList, CreditCard, DoorOpen, FileClock, FileText, HeartPulse, Inbox, Landmark, LibraryBig, LifeBuoy,
  Megaphone, ReceiptText, ScrollText, Settings2, ShieldAlert, ShieldCheck, Sparkles, UserCog, UsersRound, Wallet,
} from 'lucide-react'
import {
  Badge, Banner, Button, CalendarGrid, Card, CardBody, CardHeader, Progress, StatCard, StatusPill, Timeline,
} from '@schoolos/ui'
import {
  useAnnouncements, useClasses, useConcerns, useDashboard, useHolidays, useInvoices,
  useMessages, useNotifications, useStudents, useSuggestions, useTimetable,
} from '@schoolos/api-client'
import { formatDate, formatMoney } from '@schoolos/i18n'
import { can, displayToCanonical } from '@schoolos/shared'
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

function Frame({ title, subtitle, children, mock, tasks }: { title: string; subtitle?: string; children: ReactNode; mock?: boolean; tasks?: ReactNode }) {
  const { session } = useSession()
  const { t } = useTranslation()
  const today = new Intl.DateTimeFormat(session.user?.locale === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  return (
    <div className="ui-page" data-testid={`dashboard-${title}`}>
      <OfflineNotice />
      <PageHeader
        title={t('dash.greeting', { name: session.user?.name?.split(' ')[0] ?? '' })}
        subtitle={t('dash.subtitle', { date: today, year: '2026–2027' })}
        actions={<MockNotice mock={mock} />}
      />
      <div className="ui-sr-only">{t('dash.roleLanding', { role: t(`dash.${title}`) })}</div>
      {tasks ?? <TopTasks />}
      {children}
    </div>
  )
}

type NavLinkItem = { to: string; label: string; icon: ReactNode; description?: string }

function QuickLinks({ title, description, items }: { title: string; description?: string; items: NavLinkItem[] }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <CardBody className="grid gap-3 sm:grid-cols-2">
        {items.map(item => (
          <Link key={item.to + item.label} to={item.to} className="focus-ring flex items-start gap-3 rounded-lg border border-line p-3 transition-colors hover:bg-surface-2">
            <span className="mt-0.5 text-brand-600 dark:text-brand-300">{item.icon}</span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-content">{item.label}</span>
              {item.description && <span className="mt-0.5 block text-xs text-content-muted">{item.description}</span>}
            </span>
          </Link>
        ))}
      </CardBody>
    </Card>
  )
}

function ScopeNotice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-6">
      <Banner tone="info" title={title}>{body}</Banner>
    </div>
  )
}

function useLeadershipCommon() {
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

export function PrincipalDashboard() {
  const { t } = useTranslation()
  const { dashboard, concerns, suggestions, holidays, isLoading, error, mock } = useLeadershipCommon()
  const audit = useNotifications()

  return (
    <Frame title="principal" mock={mock}>
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
              <Timeline items={(audit.data?.data ?? []).slice(0, 4).map(n => ({ id: n.id, title: n.title, description: n.body, time: formatDate(n.at), tone: n.tone === 'danger' ? 'danger' as const : 'brand' as const }))} />
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

/** Backward-compatible alias used by any legacy import; leadership content stays scoped to leadership roles. */
export const AdminDashboard = PrincipalDashboard


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

function RoleTasks({ items }: { items: { to: string; label: string; icon: ReactNode; permission?: string }[] }) {
  const { t } = useTranslation()
  const { role } = useSession()
  const visible = items.filter(item => !item.permission || can(role, item.permission as any))
  return (
    <Card className="mb-6">
      <CardBody className="flex flex-wrap items-center gap-3">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-content-subtle">{t('dash.topTasks')}</span>
        {visible.map((item, idx) => (
          <Button key={item.to + item.label} asChild size={idx === 0 ? 'sm' : 'sm'} variant={idx === 0 ? 'primary' : 'outline'}>
            <Link to={item.to}>{item.icon}{item.label}</Link>
          </Button>
        ))}
      </CardBody>
    </Card>
  )
}

export function SchoolAdminDashboard() {
  const { t } = useTranslation()
  const { role } = useSession()
  const { dashboard, concerns, suggestions, holidays, isLoading, error, mock } = useLeadershipCommon()
  const quickItems = [
    { to: '/app/people/students/new', label: t('students.new'), icon: <UsersRound className="h-4 w-4" />, description: t('dash.schoolAdminActionStudents'), permission: 'students.write' as const },
    { to: '/app/school/settings', label: t('nav.schoolSettings'), icon: <Settings2 className="h-4 w-4" />, description: t('dash.schoolAdminActionSettings'), permission: 'school.settings' as const },
    { to: '/app/reports', label: t('nav.reports'), icon: <FileClock className="h-4 w-4" />, description: t('dash.schoolAdminActionReports'), permission: 'reports.read' as const },
    { to: '/app/communication/messages', label: t('nav.messages'), icon: <Megaphone className="h-4 w-4" />, description: t('dash.schoolAdminActionComms'), permission: 'messages.read' as const },
  ].filter(i => can(role, i.permission))

  return (
    <Frame title="schoolAdmin" mock={mock} tasks={<RoleTasks items={[
      { to: '/app/people/students', label: t('nav.students'), icon: <UsersRound className="h-4 w-4" />, permission: 'students.read' },
      { to: '/app/attendance', label: t('nav.attendance'), icon: <ClipboardCheck className="h-4 w-4" />, permission: 'students.read' },
      { to: '/app/communication/announcements', label: t('nav.announcements'), icon: <Megaphone className="h-4 w-4" />, permission: 'messages.read' },
      { to: '/app/reports', label: t('nav.reports'), icon: <ClipboardList className="h-4 w-4" />, permission: 'reports.read' },
    ]} />}>
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
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title={t('dash.upcoming')} />
            <CardBody>
              <Timeline items={holidays.data!.data.slice(0, 4).map(h => ({ id: h.name, title: h.name, time: `${formatDate(h.start)} → ${formatDate(h.end)}`, tone: 'brand' as const }))} />
            </CardBody>
          </Card>
          <QuickLinks title={t('dash.quickActions')} items={quickItems} />
        </div>
      </>)}</QueryState>
    </Frame>
  )
}

export function DeputyDashboard() {
  const { t } = useTranslation()
  const holidays = useHolidays()
  const announcements = useAnnouncements()
  return (
    <Frame title="deputy" mock={holidays.data?.mock || announcements.data?.mock} tasks={<RoleTasks items={[
      { to: '/app/attendance', label: t('nav.attendanceBoard'), icon: <ClipboardCheck className="h-4 w-4" />, permission: 'students.read' },
      { to: '/app/timetable', label: t('nav.timetable'), icon: <CalendarDays className="h-4 w-4" /> },
      { to: '/app/communication/announcements', label: t('nav.announcements'), icon: <Megaphone className="h-4 w-4" />, permission: 'messages.read' },
      { to: '/app/people/students', label: t('nav.students'), icon: <UsersRound className="h-4 w-4" />, permission: 'students.read' },
    ]} />}>
      <ScopeNotice title={t('dash.deputyScopeTitle')} body={t('dash.deputyScopeBody')} />
      <div className="grid gap-5 lg:grid-cols-2">
        <QuickLinks title={t('dash.deputyPriorities')} items={[
          { to: '/app/attendance', label: t('nav.attendanceBoard'), icon: <ClipboardCheck className="h-4 w-4" />, description: t('dash.deputyAttendanceHint') },
          { to: '/app/timetable', label: t('nav.timetable'), icon: <CalendarDays className="h-4 w-4" />, description: t('dash.deputyTimetableHint') },
          { to: '/app/people/students', label: t('nav.students'), icon: <UsersRound className="h-4 w-4" />, description: t('dash.deputyStudentsHint') },
          { to: '/app/communication/messages', label: t('nav.messages'), icon: <Inbox className="h-4 w-4" />, description: t('dash.deputyMessagesHint') },
        ]} />
        <Card>
          <CardHeader title={t('dash.upcoming')} />
          <CardBody>
            <QueryState isLoading={holidays.isLoading} error={holidays.error} onRetry={() => void holidays.refetch()}>{() => (
              <Timeline items={(holidays.data?.data ?? []).slice(0, 4).map(h => ({ id: h.name, title: h.name, time: `${formatDate(h.start)} → ${formatDate(h.end)}`, tone: 'brand' as const }))} />
            )}</QueryState>
          </CardBody>
        </Card>
      </div>
    </Frame>
  )
}

export function SafeguardingDashboard() {
  const { t } = useTranslation()
  const { role } = useSession()
  const concerns = useConcerns()
  return (
    <Frame title="safeguardingLead" mock={concerns.data?.mock} tasks={<RoleTasks items={[
      { to: '/app/safeguarding', label: t('nav.concerns'), icon: <ShieldAlert className="h-4 w-4" />, permission: 'safeguarding.read' },
      { to: '/app/compliance/audit', label: t('nav.auditLog'), icon: <ScrollText className="h-4 w-4" />, permission: 'security.audit.read' },
      { to: '/app/settings', label: t('nav.settings'), icon: <Settings2 className="h-4 w-4" /> },
    ]} />}>
      <ScopeNotice title={t('dash.safeguardingScopeTitle')} body={t('dash.safeguardingScopeBody')} />
      <QueryState isLoading={concerns.isLoading} error={concerns.error} onRetry={() => void concerns.refetch()}>{() => {
        const open = (concerns.data?.data ?? []).filter(c => c.status !== 'closed')
        return (<>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label={t('dash.openConcerns')} value={open.length} hint={t('dash.safeguardingCountHint')} icon={<ShieldAlert className="h-4 w-4" />} tone="danger" />
            <StatCard label={t('nav.compliance')} value={t('common.viewAll')} icon={<ScrollText className="h-4 w-4" />} tone="info" />
            <StatCard label={t('access.confidential')} value={t('common.yes')} icon={<ShieldCheck className="h-4 w-4" />} tone="brand" />
          </div>
          <Card className="mt-6">
            <CardHeader title={t('dash.safeguardingRecent')} action={can(role, 'safeguarding.read') ? <Button asChild variant="ghost" size="sm"><Link to="/app/safeguarding">{t('common.viewAll')}</Link></Button> : undefined} />
            <CardBody className="space-y-3">
              {open.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-content">{c.summary}</p>
                    <p className="text-xs text-content-subtle">{t('dash.safeguardingRestricted')}</p>
                  </div>
                  <StatusPill status={c.status} />
                </div>
              ))}
              {open.length === 0 && <p className="text-sm text-content-muted">{t('common.noData')}</p>}
            </CardBody>
          </Card>
        </>)
      }}</QueryState>
    </Frame>
  )
}

export function NurseDashboard() {
  const { t } = useTranslation()
  return (
    <Frame title="nurse" tasks={<RoleTasks items={[
      { to: '/app/health', label: t('nav.health'), icon: <HeartPulse className="h-4 w-4" /> },
      { to: '/app/people/students', label: t('nav.students'), icon: <UsersRound className="h-4 w-4" />, permission: 'students.read' },
      { to: '/app/reports', label: t('nav.reports'), icon: <FileClock className="h-4 w-4" />, permission: 'reports.read' },
    ]} />}>
      <ScopeNotice title={t('dash.nurseScopeTitle')} body={t('dash.nurseScopeBody')} />
      <QuickLinks title={t('dash.nurseWorkspace')} items={[
        { to: '/app/health', label: t('nav.health'), icon: <HeartPulse className="h-4 w-4" />, description: t('dash.nurseHealthHint') },
        { to: '/app/people/students', label: t('nav.students'), icon: <UsersRound className="h-4 w-4" />, description: t('dash.nurseStudentsHint') },
        { to: '/app/reports', label: t('nav.reports'), icon: <ClipboardList className="h-4 w-4" />, description: t('dash.nurseReportsHint') },
      ]} />
    </Frame>
  )
}

export function HrDashboard() {
  const { t } = useTranslation()
  return (
    <Frame title="hr" tasks={<RoleTasks items={[
      { to: '/app/people/staff', label: t('nav.staff'), icon: <UserCog className="h-4 w-4" />, permission: 'students.read' },
      { to: '/app/reports', label: t('nav.reports'), icon: <ClipboardList className="h-4 w-4" />, permission: 'reports.read' },
      { to: '/app/settings', label: t('nav.settings'), icon: <Settings2 className="h-4 w-4" /> },
    ]} />}>
      <ScopeNotice title={t('dash.hrScopeTitle')} body={t('dash.hrScopeBody')} />
      <QuickLinks title={t('dash.hrWorkspace')} items={[
        { to: '/app/people/staff', label: t('nav.staff'), icon: <UserCog className="h-4 w-4" />, description: t('dash.hrStaffHint') },
        { to: '/app/hr/contracts', label: t('nav.contracts'), icon: <FileText className="h-4 w-4" />, description: t('dash.hrContractsHint') },
        { to: '/app/reports', label: t('nav.reports'), icon: <ClipboardList className="h-4 w-4" />, description: t('dash.hrReportsHint') },
      ]} />
    </Frame>
  )
}

export function ItAdminDashboard() {
  const { t } = useTranslation()
  return (
    <Frame title="itAdmin" tasks={<RoleTasks items={[
      { to: '/app/people/members', label: t('nav.users'), icon: <UserCog className="h-4 w-4" />, permission: 'members.manage' },
      { to: '/app/security', label: t('nav.security'), icon: <ShieldCheck className="h-4 w-4" />, permission: 'security.read' },
      { to: '/app/account/security', label: t('nav.accountSecurity'), icon: <ShieldAlert className="h-4 w-4" /> },
    ]} />}>
      <ScopeNotice title={t('dash.itScopeTitle')} body={t('dash.itScopeBody')} />
      <QuickLinks title={t('dash.itWorkspace')} items={[
        { to: '/app/people/members', label: t('nav.users'), icon: <UserCog className="h-4 w-4" />, description: t('dash.itUsersHint') },
        { to: '/app/security', label: t('nav.security'), icon: <ShieldCheck className="h-4 w-4" />, description: t('dash.itSecurityHint') },
        { to: '/app/account/security', label: t('nav.accountSecurity'), icon: <Settings2 className="h-4 w-4" />, description: t('dash.itAccountHint') },
      ]} />
    </Frame>
  )
}

export function LibrarianDashboard() {
  const { t } = useTranslation()
  return (
    <Frame title="librarian" tasks={<RoleTasks items={[
      { to: '/app/library', label: t('nav.library'), icon: <LibraryBig className="h-4 w-4" /> },
      { to: '/app/people/students', label: t('nav.students'), icon: <UsersRound className="h-4 w-4" />, permission: 'students.read' },
      { to: '/app/reports', label: t('nav.reports'), icon: <ClipboardList className="h-4 w-4" />, permission: 'reports.read' },
    ]} />}>
      <ScopeNotice title={t('dash.librarianScopeTitle')} body={t('dash.librarianScopeBody')} />
      <QuickLinks title={t('dash.librarianWorkspace')} items={[
        { to: '/app/library', label: t('nav.library'), icon: <LibraryBig className="h-4 w-4" />, description: t('dash.librarianCatalogueHint') },
        { to: '/app/people/students', label: t('nav.students'), icon: <UsersRound className="h-4 w-4" />, description: t('dash.librarianMembersHint') },
        { to: '/app/reports', label: t('nav.reports'), icon: <ClipboardList className="h-4 w-4" />, description: t('dash.librarianReportsHint') },
      ]} />
    </Frame>
  )
}

export function ReceptionDashboard() {
  const { t } = useTranslation()
  return (
    <Frame title="receptionist" tasks={<RoleTasks items={[
      { to: '/app/front-office', label: t('nav.frontOffice'), icon: <DoorOpen className="h-4 w-4" /> },
      { to: '/app/attendance', label: t('nav.attendanceBoard'), icon: <ClipboardCheck className="h-4 w-4" />, permission: 'students.read' },
      { to: '/app/communication/announcements', label: t('nav.announcements'), icon: <Megaphone className="h-4 w-4" />, permission: 'messages.read' },
    ]} />}>
      <ScopeNotice title={t('dash.receptionScopeTitle')} body={t('dash.receptionScopeBody')} />
      <QuickLinks title={t('dash.receptionWorkspace')} items={[
        { to: '/app/front-office', label: t('nav.frontOffice'), icon: <DoorOpen className="h-4 w-4" />, description: t('dash.receptionVisitorsHint') },
        { to: '/app/attendance', label: t('nav.attendanceBoard'), icon: <ClipboardCheck className="h-4 w-4" />, description: t('dash.receptionAttendanceHint') },
        { to: '/app/people/staff', label: t('nav.staff'), icon: <UserCog className="h-4 w-4" />, description: t('dash.receptionDirectoryHint') },
      ]} />
    </Frame>
  )
}

export function AuditorDashboard() {
  const { t } = useTranslation()
  return (
    <Frame title="auditor" tasks={<RoleTasks items={[
      { to: '/app/compliance/audit', label: t('nav.auditLog'), icon: <ScrollText className="h-4 w-4" />, permission: 'security.audit.read' },
      { to: '/app/compliance/pack', label: t('nav.compliancePack'), icon: <FileText className="h-4 w-4" />, permission: 'compliance.read' },
      { to: '/app/reports', label: t('nav.reports'), icon: <ClipboardList className="h-4 w-4" />, permission: 'reports.read' },
    ]} />}>
      <ScopeNotice title={t('dash.auditorScopeTitle')} body={t('dash.auditorScopeBody')} />
      <QuickLinks title={t('dash.auditorWorkspace')} items={[
        { to: '/app/compliance/audit', label: t('nav.auditLog'), icon: <ScrollText className="h-4 w-4" />, description: t('dash.auditorAuditHint') },
        { to: '/app/compliance/pack', label: t('nav.compliancePack'), icon: <FileText className="h-4 w-4" />, description: t('dash.auditorPackHint') },
        { to: '/app/reports', label: t('nav.reports'), icon: <ClipboardList className="h-4 w-4" />, description: t('dash.auditorReportsHint') },
      ]} />
    </Frame>
  )
}

export function AnalystDashboard() {
  const { t } = useTranslation()
  return (
    <Frame title="analyst" tasks={<RoleTasks items={[
      { to: '/app/analytics', label: t('analytics.dashboard'), icon: <Activity className="h-4 w-4" />, permission: 'analytics.read' },
      { to: '/app/reports', label: t('nav.reports'), icon: <ClipboardList className="h-4 w-4" />, permission: 'reports.read' },
      { to: '/app/settings', label: t('nav.settings'), icon: <Settings2 className="h-4 w-4" /> },
    ]} />}>
      <ScopeNotice title={t('dash.analystScopeTitle')} body={t('dash.analystScopeBody')} />
      <QuickLinks title={t('dash.analystWorkspace')} items={[
        { to: '/app/analytics', label: t('analytics.dashboard'), icon: <Activity className="h-4 w-4" />, description: t('dash.analystAnalyticsHint') },
        { to: '/app/reports', label: t('nav.reports'), icon: <ClipboardList className="h-4 w-4" />, description: t('dash.analystReportsHint') },
        { to: '/app/people/students', label: t('nav.students'), icon: <UsersRound className="h-4 w-4" />, description: t('dash.analystStudentsHint') },
      ]} />
    </Frame>
  )
}

export function GroupAdminDashboard() {
  const { t } = useTranslation()
  return (
    <Frame title="groupAdmin" tasks={<RoleTasks items={[
      { to: '/group', label: t('nav.dashboard'), icon: <Building2 className="h-4 w-4" /> },
      { to: '/app/reports', label: t('nav.reports'), icon: <ClipboardList className="h-4 w-4" />, permission: 'reports.read' },
      { to: '/app/settings', label: t('nav.settings'), icon: <Settings2 className="h-4 w-4" /> },
    ]} />}>
      <ScopeNotice title={t('dash.groupAdminScopeTitle')} body={t('dash.groupAdminScopeBody')} />
      <QuickLinks title={t('dash.groupAdminWorkspace')} items={[
        { to: '/group', label: t('nav.dashboard'), icon: <Building2 className="h-4 w-4" />, description: t('dash.groupAdminGroupHint') },
        { to: '/app/reports', label: t('nav.reports'), icon: <ClipboardList className="h-4 w-4" />, description: t('dash.groupAdminReportsHint') },
        { to: '/app/analytics', label: t('analytics.dashboard'), icon: <Activity className="h-4 w-4" />, description: t('dash.groupAdminAnalyticsHint') },
      ]} />
    </Frame>
  )
}

export function PlatformDashboard() {
  const { t } = useTranslation()
  return (
    <Frame title="platformAdmin" tasks={<RoleTasks items={[
      { to: '/platform', label: t('nav.status'), icon: <Activity className="h-4 w-4" /> },
      { to: '/app/platform/flags', label: t('nav.featureFlags'), icon: <Settings2 className="h-4 w-4" />, permission: 'platform.admin' },
      { to: '/app/platform/support', label: t('nav.support'), icon: <LifeBuoy className="h-4 w-4" /> },
    ]} />}>
      <ScopeNotice title={t('dash.platformScopeTitle')} body={t('dash.platformScopeBody')} />
      <QuickLinks title={t('dash.platformWorkspace')} items={[
        { to: '/platform', label: t('nav.status'), icon: <Activity className="h-4 w-4" />, description: t('dash.platformStatusHint') },
        { to: '/app/platform/flags', label: t('nav.featureFlags'), icon: <Settings2 className="h-4 w-4" />, description: t('dash.platformFlagsHint') },
        { to: '/app/platform/support', label: t('nav.support'), icon: <LifeBuoy className="h-4 w-4" />, description: t('dash.platformSupportHint') },
      ]} />
    </Frame>
  )
}

function FinanceTasks() {
  const { t } = useTranslation()
  return (
    <Card className="mb-6">
      <CardBody className="flex flex-wrap items-center gap-3">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-content-subtle">{t('dash.topTasks')}</span>
        <Button asChild size="sm"><Link to="/app/reports"><FileText className="h-4 w-4" />{t('nav.reports')}</Link></Button>
        <Button asChild variant="outline" size="sm"><Link to="/app/people/guardians"><UsersRound className="h-4 w-4" />{t('nav.families')}</Link></Button>
        <Button asChild variant="outline" size="sm"><Link to="/app/settings"><ClipboardList className="h-4 w-4" />{t('nav.settings')}</Link></Button>
      </CardBody>
    </Card>
  )
}

export function FinanceDashboard() {
  const { t } = useTranslation()
  const invoices = useInvoices()
  const isLoading = invoices.isLoading
  const error = invoices.error
  const mock = invoices.data?.mock
  const list = invoices.data?.data ?? []
  const totalInvoiced = list.reduce((sum, i) => sum + i.amountCents, 0)
  const totalPaid = list.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amountCents, 0)
  const totalOutstanding = list.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.amountCents, 0)
  const overdueCount = list.filter(i => i.status === 'overdue' || i.status === 'failed').length
  const overdueAmount = list.filter(i => i.status === 'overdue' || i.status === 'failed').reduce((sum, i) => sum + i.amountCents, 0)
  const dueCount = list.filter(i => i.status === 'due').length
  const paidCount = list.filter(i => i.status === 'paid').length

  return (
    <Frame title="finance" mock={mock} tasks={<FinanceTasks />}>
      <QueryState isLoading={isLoading} error={error} onRetry={() => void invoices.refetch()} loading={<ScreenLoading variant="dashboard" />}>{() => (<>
        <div className="mb-6">
          <Banner tone="info" title={t('finance.dash.scopeTitle')}>
            {t('finance.dash.scopeBody')}
          </Banner>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t('finance.dash.invoiced')} value={formatMoney(totalInvoiced)} hint={t('finance.dash.demoPeriod')} icon={<ReceiptText className="h-4 w-4" />} tone="brand" />
          <StatCard label={t('finance.dash.collected')} value={formatMoney(totalPaid)} hint={t('finance.dash.paidCount', { count: paidCount })} icon={<Banknote className="h-4 w-4" />} tone="accent" />
          <StatCard label={t('finance.dash.outstanding')} value={formatMoney(totalOutstanding)} hint={t('finance.dash.dueCount', { count: dueCount + overdueCount })} icon={<Wallet className="h-4 w-4" />} tone="warning" />
          <StatCard label={t('finance.dash.overdue')} value={formatMoney(overdueAmount)} hint={t('finance.dash.overdueCount', { count: overdueCount })} icon={<CalendarClock className="h-4 w-4" />} tone="danger" />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title={t('finance.dash.priorities')} description={t('finance.dash.prioritiesHint')} />
            <CardBody>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-line bg-surface-2 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-content"><CreditCard className="h-4 w-4 text-warning-500" />{t('finance.dash.toCollect')}</span>
                    <Badge tone="warning">{dueCount + overdueCount}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-content-muted">{t('finance.dash.toCollectHint', { amount: formatMoney(totalOutstanding) })}</p>
                </div>
                <div className="rounded-lg border border-line bg-surface-2 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-content"><Landmark className="h-4 w-4 text-info-500" />{t('finance.dash.reconciliation')}</span>
                    <Badge tone="neutral">—</Badge>
                  </div>
                  <p className="mt-2 text-sm text-content-muted">{t('finance.dash.placeholderHint')}</p>
                </div>
                <div className="rounded-lg border border-line bg-surface-2 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-content"><ReceiptText className="h-4 w-4 text-brand-500" />{t('finance.dash.sepa')}</span>
                    <Badge tone="neutral">—</Badge>
                  </div>
                  <p className="mt-2 text-sm text-content-muted">{t('finance.dash.placeholderHint')}</p>
                </div>
                <div className="rounded-lg border border-line bg-surface-2 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-content"><FileText className="h-4 w-4 text-accent-500" />{t('finance.dash.approvals')}</span>
                    <Badge tone="neutral">—</Badge>
                  </div>
                  <p className="mt-2 text-sm text-content-muted">{t('finance.dash.placeholderHint')}</p>
                </div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('finance.dash.aging')} description={t('finance.dash.agingHint')} />
            <CardBody className="space-y-3">
              {[
                { label: t('finance.dash.bucketCurrent'), count: dueCount, tone: 'brand' as const },
                { label: t('finance.dash.bucketOverdue'), count: overdueCount, tone: 'danger' as const },
                { label: t('finance.dash.bucketPaid'), count: paidCount, tone: 'success' as const },
              ].map(bucket => (
                <div key={bucket.label} className="flex items-center justify-between rounded-lg border border-line p-3">
                  <span className="text-sm text-content">{bucket.label}</span>
                  <Badge tone={bucket.tone}>{bucket.count}</Badge>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader title={t('finance.dash.recentInvoices')} description={t('finance.dash.recentInvoicesHint')} />
          <CardBody className="space-y-3">
            {list.slice(0, 5).map(i => (
              <div key={i.id} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-content">{i.label}</p>
                  <p className="text-xs text-content-subtle">{t('finance.dash.dueDate', { date: formatDate(i.dueDate) })}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2"><StatusPill status={i.status} /><span className="tnum font-semibold text-content">{formatMoney(i.amountCents)}</span></div>
              </div>
            ))}
            {list.length === 0 && <p className="text-sm text-content-muted">{t('common.noData')}</p>}
          </CardBody>
        </Card>
      </>)}</QueryState>
    </Frame>
  )
}

export function DashboardSwitch() {
  const { role } = useSession()
  const canonical = displayToCanonical(role ?? '') ?? (role as string | undefined)

  switch (canonical) {
    case 'principal':
      return <PrincipalDashboard />
    case 'school-admin':
      return <SchoolAdminDashboard />
    case 'deputy':
      return <DeputyDashboard />
    case 'teacher':
      return <TeacherDashboard />
    case 'parent':
      return <ParentDashboard />
    case 'student':
      return <StudentDashboard />
    case 'safeguarding-lead':
      return <SafeguardingDashboard />
    case 'nurse':
      return <NurseDashboard />
    case 'finance':
      return <FinanceDashboard />
    case 'hr':
      return <HrDashboard />
    case 'it-admin':
      return <ItAdminDashboard />
    case 'librarian':
      return <LibrarianDashboard />
    case 'receptionist':
      return <ReceptionDashboard />
    case 'auditor':
      return <AuditorDashboard />
    case 'analyst':
      return <AnalystDashboard />
    case 'group-admin':
      return <GroupAdminDashboard />
    case 'super-admin':
      return <PlatformDashboard />
    default: {
      // Fallback by display role family for unknown/multi-role edge cases, but never leak director KPIs.
      if (role === 'finance' || role === 'accountant') return <FinanceDashboard />
      if (role === 'student') return <StudentDashboard />
      if (role === 'guardian' || role === 'guardian2' || role === 'parent') return <ParentDashboard />
      if (role === 'teacher' || role === 'assistant' || role === 'instructor' || role === 'provider') return <TeacherDashboard />
      if (role === 'operator') return <PlatformDashboard />
      if (role === 'analyst') return <AnalystDashboard />
      return <PrincipalDashboard />
    }
  }
}

export function DashboardErrorFallback({ retry }: { retry: () => void }) {
  const { t } = useTranslation()
  return <ScreenError error={new Error(t('state.error'))} onRetry={retry} />
}
