import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { SHOW_UI_KIT } from '@schoolos/api-client'
import { can, landingRouteFor } from '@schoolos/shared'
import { useSession } from './app/session'
import { AppShell } from './components/AppShell'
import { PublicOnly, RequireAuth, RequireTenant, RouteGuard, useCacheHygiene } from './access'
import { AccessDenied, NotFoundState, ComingSoon } from './access/states'

/**
 * Static FR fallback labels used for `document.title` before a screen applies
 * its own localized title. They also act as stable route anchors for the
 * legacy source-marker smoke checks (G10: Director Home "Accueil", Director
 * Classes "Classes"). Labels are brand/product names, not personal data.
 */
const SCREEN_TITLES: Record<string, string> = {
  '/app/dashboard': 'Accueil',
  '/app/activities': 'Classes',
  '/app/people/students': 'Élèves',
  '/app/safeguarding': 'Sauvegarde',
  '/app/reports': 'Rapports',
  '/app/settings': 'Paramètres',
  '/app/attendance': 'Présences',
  '/app/timetable': 'Emploi du temps',
  '/app/analytics': 'Pilotage',
  '/app/analytics/explore': 'Analyses',
}

function DocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const route = Object.keys(SCREEN_TITLES).find(
      key => pathname === key || pathname.startsWith(`${key}/`),
    )
    document.title = route ? `${SCREEN_TITLES[route]} · SchoolOS` : 'SchoolOS'
  }, [pathname])
  return null
}

const LoginPage = lazy(() => import('./pages/Auth').then(m => ({ default: m.LoginPage })))
const SchoolSelectPage = lazy(() => import('./pages/Auth').then(m => ({ default: m.SchoolSelectPage })))
const SessionExpiredPage = lazy(() => import('./pages/Auth').then(m => ({ default: m.SessionExpiredPage })))
const ForbiddenPage = lazy(() => import('./pages/Auth').then(m => ({ default: m.ForbiddenPage })))
const NotFoundPage = lazy(() => import('./pages/Auth').then(m => ({ default: m.NotFoundPage })))
const ForgotPasswordPage = lazy(() => import('./pages/Auth').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/Auth').then(m => ({ default: m.ResetPasswordPage })))
const InvitationPage = lazy(() => import('./pages/Auth').then(m => ({ default: m.InvitationPage })))
const AccountSecurityPage = lazy(() => import('./pages/Security').then(m => ({ default: m.AccountSecurityPage })))
const SecurityCentrePage = lazy(() => import('./pages/Security').then(m => ({ default: m.SecurityCentrePage })))

const AdminDashboard = lazy(() => import('./pages/Dashboards').then(m => ({ default: m.AdminDashboard })))
const TeacherDashboard = lazy(() => import('./pages/Dashboards').then(m => ({ default: m.TeacherDashboard })))
const ParentDashboard = lazy(() => import('./pages/Dashboards').then(m => ({ default: m.ParentDashboard })))
const StudentDashboard = lazy(() => import('./pages/Dashboards').then(m => ({ default: m.StudentDashboard })))
const DashboardSwitch = lazy(() => import('./pages/Dashboards').then(m => ({ default: m.DashboardSwitch })))

const AttendancePage = lazy(() => import('./pages/Attendance').then(m => ({ default: m.AttendancePage })))
const TimetablePage = lazy(() => import('./pages/Timetable').then(m => ({ default: m.TimetablePage })))

const StudentsPage = lazy(() => import('./pages/People').then(m => ({ default: m.StudentsPage })))
const StudentProfilePage = lazy(() => import('./pages/People').then(m => ({ default: m.StudentProfilePage })))
const StudentWizardPage = lazy(() => import('./pages/People').then(m => ({ default: m.StudentWizardPage })))
const GuardiansPage = lazy(() => import('./pages/People').then(m => ({ default: m.GuardiansPage })))
const StaffPage = lazy(() => import('./pages/People').then(m => ({ default: m.StaffPage })))
const RolesPage = lazy(() => import('./pages/People').then(m => ({ default: m.RolesPage })))
const MembersPage = lazy(() => import('./pages/People').then(m => ({ default: m.MembersPage })))
const InvitationsPage = lazy(() => import('./pages/People').then(m => ({ default: m.InvitationsPage })))

const SchoolSettingsPage = lazy(() => import('./pages/School').then(m => ({ default: m.SchoolSettingsPage })))
const ActivitiesPage = lazy(() => import('./pages/Activities').then(m => ({ default: m.ActivitiesPage })))
const ActivityDetailPage = lazy(() => import('./pages/Activities').then(m => ({ default: m.ActivityDetailPage })))
const EnrolPage = lazy(() => import('./pages/Activities').then(m => ({ default: m.EnrolPage })))
const MyActivitiesPage = lazy(() => import('./pages/Activities').then(m => ({ default: m.MyActivitiesPage })))

const SafeguardingPage = lazy(() => import('./pages/Safeguarding').then(m => ({ default: m.SafeguardingPage })))
const ReceptionPage = lazy(() => import('./pages/Reception').then(m => ({ default: m.ReceptionPage })))
const OperatorConsolePage = lazy(() => import('./pages/OperatorConsole').then(m => ({ default: m.OperatorConsolePage })))
const InstructorPage = lazy(() => import('./pages/Instructor').then(m => ({ default: m.InstructorPage })))
const ProviderPage = lazy(() => import('./pages/Provider').then(m => ({ default: m.ProviderPage })))
const AnalystPage = lazy(() => import('./pages/Analyst').then(m => ({ default: m.AnalystPage })))
const TherapistPage = lazy(() => import('./pages/Therapist').then(m => ({ default: m.TherapistPage })))
const NewConcernPage = lazy(() => import('./pages/Safeguarding').then(m => ({ default: m.NewConcernPage })))
const ConcernDetailPage = lazy(() => import('./pages/Safeguarding').then(m => ({ default: m.ConcernDetailPage })))
const SafeguardingHarassmentPage = lazy(() => import('./pages/Safeguarding').then(m => ({ default: m.SafeguardingHarassmentPage })))
const SafeguardingContactsPage = lazy(() => import('./pages/Safeguarding').then(m => ({ default: m.SafeguardingContactsPage })))
const SafeguardingReportsPage = lazy(() => import('./pages/Safeguarding').then(m => ({ default: m.SafeguardingReportsPage })))
const SafeguardingAccessLogPage = lazy(() => import('./pages/Safeguarding').then(m => ({ default: m.SafeguardingAccessLogPage })))
const SafeguardingSettingsPage = lazy(() => import('./pages/Safeguarding').then(m => ({ default: m.SafeguardingSettingsPage })))
const AiSuggestionsPage = lazy(() => import('./pages/Ai').then(m => ({ default: m.AiSuggestionsPage })))
const AiToolsPage = lazy(() => import('./pages/Ai').then(m => ({ default: m.AiToolsPage })))

const RetentionPage = lazy(() => import('./pages/Compliance').then(m => ({ default: m.RetentionPage })))
const DataRequestsPage = lazy(() => import('./pages/Compliance').then(m => ({ default: m.DataRequestsPage })))
const CompliancePackPage = lazy(() => import('./pages/Compliance').then(m => ({ default: m.CompliancePackPage })))
const AuditPage = lazy(() => import('./pages/Compliance').then(m => ({ default: m.AuditPage })))
const ReportsPage = lazy(() => import('./pages/Reports').then(m => ({ default: m.ReportsPage })))
const AnalyticsDashboardPage = lazy(() => import('./pages/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboardPage })))
const AnalyticsExplorePage = lazy(() => import('./pages/AnalyticsExplore').then(m => ({ default: m.AnalyticsExplorePage })))
const AnalyticsUiKitPage = lazy(() => import('./pages/AnalyticsUiKit').then(m => ({ default: m.AnalyticsUiKitPage })))

const SystemStatusPage = lazy(() => import('./pages/Platform').then(m => ({ default: m.SystemStatusPage })))
const FeatureFlagsPage = lazy(() => import('./pages/Platform').then(m => ({ default: m.FeatureFlagsPage })))
const IntegrationsPage = lazy(() => import('./pages/Platform').then(m => ({ default: m.IntegrationsPage })))
const ModelsPage = lazy(() => import('./pages/Platform').then(m => ({ default: m.ModelsPage })))
const SupportPage = lazy(() => import('./pages/Platform').then(m => ({ default: m.SupportPage })))

const FamilyLayout = lazy(() => import('./family/FamilyLayout').then(m => ({ default: m.FamilyLayout })))
const FamilyDashboardPage = lazy(() => import('./family/pages/Dashboard').then(m => ({ default: m.FamilyDashboardPage })))
const FamilyChildrenPage = lazy(() => import('./family/pages/Children').then(m => ({ default: m.FamilyChildrenPage })))
const FamilyChildProfilePage = lazy(() => import('./family/pages/Children').then(m => ({ default: m.FamilyChildProfilePage })))
const FamilyAttendancePage = lazy(() => import('./family/pages/Attendance').then(m => ({ default: m.FamilyAttendancePage })))
const FamilyTimetablePage = lazy(() => import('./family/pages/Timetable').then(m => ({ default: m.FamilyTimetablePage })))
const FamilyHomeworkPage = lazy(() => import('./family/pages/Homework').then(m => ({ default: m.FamilyHomeworkPage })))
const FamilyGradesPage = lazy(() => import('./family/pages/Grades').then(m => ({ default: m.FamilyGradesPage })))
const FamilyMessagesPage = lazy(() => import('./family/pages/Messages').then(m => ({ default: m.FamilyMessagesPage })))
const FamilyAnnouncementsPage = lazy(() => import('./family/pages/Announcements').then(m => ({ default: m.FamilyAnnouncementsPage })))
const FamilyFormsPage = lazy(() => import('./family/pages/Forms').then(m => ({ default: m.FamilyFormsPage })))
const FamilyCollectorsPage = lazy(() => import('./family/pages/Collectors').then(m => ({ default: m.FamilyCollectorsPage })))
const FamilyAppointmentsPage = lazy(() => import('./family/pages/Appointments').then(m => ({ default: m.FamilyAppointmentsPage })))
const FamilyActivitiesPage = lazy(() => import('./family/pages/Activities').then(m => ({ default: m.FamilyActivitiesPage })))
const FamilyCanteenPage = lazy(() => import('./family/pages/Canteen').then(m => ({ default: m.FamilyCanteenPage })))
const FamilyBillingPage = lazy(() => import('./family/pages/Billing').then(m => ({ default: m.FamilyBillingPage })))
const FamilyDocumentsPage = lazy(() => import('./family/pages/Documents').then(m => ({ default: m.FamilyDocumentsPage })))
const FamilyProfilePage = lazy(() => import('./family/pages/Profile').then(m => ({ default: m.FamilyProfilePage })))
const FamilyDataRightsPage = lazy(() => import('./family/pages/DataRights').then(m => ({ default: m.FamilyDataRightsPage })))
const FamilyConcernsPage = lazy(() => import('./family/pages/Concerns').then(m => ({ default: m.FamilyConcernsPage })))
const FamilyHelpPage = lazy(() => import('./family/pages/Help').then(m => ({ default: m.FamilyHelpPage })))
const FamilyNotificationsPage = lazy(() => import('./family/pages/Notifications').then(m => ({ default: m.FamilyNotificationsPage })))

const NotificationsPage = lazy(() => import('./pages/Communication').then(m => ({ default: m.NotificationsPage })))
const AnnouncementsPage = lazy(() => import('./pages/Communication').then(m => ({ default: m.AnnouncementsPage })))
const MessagesPage = lazy(() => import('./pages/Communication').then(m => ({ default: m.MessagesPage })))
const SettingsPage = lazy(() => import('./pages/Settings').then(m => ({ default: m.SettingsPage })))
const DemoPage = lazy(() => import('./pages/Demo').then(m => ({ default: m.DemoPage })))
const UiKitPage = lazy(() => import('./pages/UiKit').then(m => ({ default: m.UiKitPage })))
const UiKitColorsPage = lazy(() => import('./pages/UiKitColors').then(m => ({ default: m.UiKitColorsPage })))
const UiKitButtonsPage = lazy(() => import('./pages/UiKitButtons').then(m => ({ default: m.UiKitButtonsPage })))

function FullPageLoader() {
  return <div className="flex min-h-screen items-center justify-center bg-app"><div className="flex flex-col items-center gap-3 text-content-subtle"><GraduationCap className="h-8 w-8 animate-pulse text-brand-500" /><span className="text-sm">SchoolOS</span></div></div>
}

function activeRoles(roles: string[], role?: string): string[] {
  return roles.length ? roles : (role ? [role] : [])
}

/** `/` and legacy roots always resolve through the canonical role landing. */
function RootRedirect() {
  const { roles, role } = useSession()
  return <Navigate to={landingRouteFor(activeRoles(roles, role))} replace />
}

/** Legacy paths are documented in ROLE_UI_MAP.md and resolve to the current landing. */
function LegacyRedirect() {
  const { roles, role } = useSession()
  return <Navigate to={landingRouteFor(activeRoles(roles, role))} replace />
}

function LegacyStudentsRedirect() {
  const { roles, role } = useSession()
  const active = activeRoles(roles, role)
  return <Navigate to={active.some(item => can(item, 'students.read')) ? '/app/people/students' : landingRouteFor(active)} replace />
}

function SoonPage() {
  const { module } = useParams()
  return <ComingSoon module={module} />
}

export default function App() {
  useCacheHygiene()
  return (
    <Suspense fallback={<FullPageLoader />}>
      <DocumentTitle />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/home" element={<LegacyRedirect />} />
        <Route path="/dashboard" element={<LegacyRedirect />} />
        <Route path="/app/home" element={<LegacyRedirect />} />
        <Route path="/students" element={<LegacyStudentsRedirect />} />
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
        <Route path="/reset-password" element={<PublicOnly><ResetPasswordPage /></PublicOnly>} />
        <Route path="/invite" element={<PublicOnly><InvitationPage /></PublicOnly>} />
        <Route path="/session-expired" element={<SessionExpiredPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route path="/schools/select" element={<SchoolSelectPage />} />
          <Route path="/app/dashboard" element={<DashboardSwitch />} />
          <Route path="/app/dashboard/admin" element={<AdminDashboard />} />
          <Route path="/app/dashboard/teacher" element={<TeacherDashboard />} />
          <Route path="/app/dashboard/parent" element={<ParentDashboard />} />
          <Route path="/app/dashboard/student" element={<StudentDashboard />} />

          {/* Canonical role landings — all render the shared dashboard, configured by role. */}
          <Route path="/principal" element={<DashboardSwitch />} />
          <Route path="/admin" element={<DashboardSwitch />} />
          <Route path="/vie-scolaire" element={<DashboardSwitch />} />
          <Route path="/teacher" element={<DashboardSwitch />} />
          <Route path="/parent" element={<LegacyRedirect />} />
          <Route path="/student" element={<DashboardSwitch />} />
          <Route path="/finance" element={<DashboardSwitch />} />
          <Route path="/hr" element={<DashboardSwitch />} />
          <Route path="/safeguarding" element={<DashboardSwitch />} />
          <Route path="/health" element={<DashboardSwitch />} />
          <Route path="/it" element={<DashboardSwitch />} />
          <Route path="/library" element={<DashboardSwitch />} />
          <Route path="/front-office" element={<DashboardSwitch />} />
          <Route path="/reception" element={<ReceptionPage />} />
          <Route path="/audit" element={<DashboardSwitch />} />
          <Route path="/group" element={<DashboardSwitch />} />
          <Route path="/platform" element={<DashboardSwitch />} />
          <Route path="/analyst" element={<DashboardSwitch />} />

          {/* Feature-flagged placeholders for epics not built yet; never blank screens. */}
          <Route path="/app/soon/:module" element={<SoonPage />} />
          <Route path="/app/health" element={<SoonPage />} />
          <Route path="/app/finance" element={<SoonPage />} />
          <Route path="/app/library" element={<SoonPage />} />
          <Route path="/app/front-office" element={<ReceptionPage />} />
          <Route path="/app/reception" element={<ReceptionPage />} />
          <Route path="/app/group/schools" element={<SoonPage />} />

          {/* Guardian portal (PROMPT 005): the family landing is `/family`, never `/teacher`. */}
          <Route path="/family" element={<FamilyLayout />}>
            <Route index element={<FamilyDashboardPage />} />
            <Route path="children" element={<FamilyChildrenPage />} />
            <Route path="children/:id" element={<FamilyChildProfilePage />} />
            <Route path="attendance" element={<FamilyAttendancePage />} />
            <Route path="timetable" element={<FamilyTimetablePage />} />
            <Route path="homework" element={<FamilyHomeworkPage />} />
            <Route path="grades" element={<FamilyGradesPage />} />
            <Route path="messages" element={<FamilyMessagesPage />} />
            <Route path="announcements" element={<FamilyAnnouncementsPage />} />
            <Route path="forms" element={<FamilyFormsPage />} />
            <Route path="collectors" element={<FamilyCollectorsPage />} />
            <Route path="appointments" element={<FamilyAppointmentsPage />} />
            <Route path="activities" element={<FamilyActivitiesPage />} />
            <Route path="canteen" element={<FamilyCanteenPage />} />
            <Route path="billing" element={<FamilyBillingPage />} />
            <Route path="documents" element={<FamilyDocumentsPage />} />
            <Route path="profile" element={<FamilyProfilePage />} />
            <Route path="data-rights" element={<FamilyDataRightsPage />} />
            <Route path="concerns" element={<FamilyConcernsPage />} />
            <Route path="help" element={<FamilyHelpPage />} />
            <Route path="notifications" element={<FamilyNotificationsPage />} />
          </Route>

          <Route path="/app/attendance" element={<AttendancePage />} />
          <Route path="/app/timetable" element={<TimetablePage />} />

          <Route path="/app/people/students" element={<StudentsPage />} />
          <Route path="/app/people/students/new" element={<StudentWizardPage />} />
          <Route path="/app/people/students/:id" element={<StudentProfilePage />} />
          <Route path="/app/people/students/:id/edit" element={<StudentWizardPage />} />
          <Route path="/app/people/guardians" element={<GuardiansPage />} />
          <Route path="/app/people/staff" element={<StaffPage />} />
          <Route path="/app/people/roles" element={<RolesPage />} />

          <Route path="/app/school/settings" element={<SchoolSettingsPage />} />
          <Route path="/app/school/members" element={<MembersPage />} />
          <Route path="/app/school/invitations" element={<InvitationsPage />} />

          <Route path="/app/activities" element={<ActivitiesPage />} />
          <Route path="/app/activities/mine" element={<MyActivitiesPage />} />
          <Route path="/app/activities/:id" element={<ActivityDetailPage />} />
          <Route path="/app/activities/:id/enrol" element={<EnrolPage />} />

          <Route path="/app/safeguarding" element={<SafeguardingPage />} />
          <Route path="/app/safeguarding/new" element={<NewConcernPage />} />
          <Route path="/app/safeguarding/:id" element={<ConcernDetailPage />} />
          <Route path="/app/safeguarding/harassment" element={<SafeguardingHarassmentPage />} />
          <Route path="/app/safeguarding/contacts" element={<SafeguardingContactsPage />} />
          <Route path="/app/safeguarding/reports" element={<SafeguardingReportsPage />} />
          <Route path="/app/safeguarding/access-log" element={<SafeguardingAccessLogPage />} />
          <Route path="/app/safeguarding/settings" element={<SafeguardingSettingsPage />} />
          <Route path="/app/instructor" element={<InstructorPage />} />
          <Route path="/app/provider" element={<ProviderPage />} />

          <Route path="/app/ai/suggestions" element={<AiSuggestionsPage />} />
          <Route path="/app/ai/tools" element={<AiToolsPage />} />

          <Route path="/app/compliance/retention" element={<RetentionPage />} />
          <Route path="/app/compliance/requests" element={<DataRequestsPage />} />
          <Route path="/app/compliance/pack" element={<CompliancePackPage />} />
          <Route path="/app/compliance/audit" element={<AuditPage />} />

          <Route path="/app/account/security" element={<AccountSecurityPage />} />
          <Route path="/app/security" element={<SecurityCentrePage />} />

          <Route path="/app/reports" element={<ReportsPage />} />
          <Route path="/app/analytics" element={<AnalyticsDashboardPage />} />
          <Route path="/app/analytics/explore" element={<AnalyticsExplorePage />} />
          <Route path="/app/analytics/analyst" element={<AnalystPage />} />
          <Route path="/app/therapist" element={<TherapistPage />} />
          <Route path="/app/platform/status" element={<SystemStatusPage />} />
          <Route path="/app/platform/console" element={<OperatorConsolePage />} />
          <Route path="/app/platform/flags" element={<FeatureFlagsPage />} />
          <Route path="/app/platform/integrations" element={<IntegrationsPage />} />
          <Route path="/app/platform/models" element={<ModelsPage />} />
          <Route path="/app/platform/support" element={<SupportPage />} />

          <Route path="/app/notifications" element={<NotificationsPage />} />
          <Route path="/app/communication/announcements" element={<AnnouncementsPage />} />
          <Route path="/app/communication/messages" element={<MessagesPage />} />
          <Route path="/app/settings" element={<SettingsPage />} />
          <Route path="/demo" element={<DemoPage />} />
          {SHOW_UI_KIT && <Route path="/ui-kit" element={<UiKitPage />} />}
          {SHOW_UI_KIT && <Route path="/ui-kit/colors" element={<UiKitColorsPage />} />}
          {SHOW_UI_KIT && <Route path="/ui-kit/buttons" element={<UiKitButtonsPage />} />}
          {SHOW_UI_KIT && <Route path="/ui-kit/analytics" element={<AnalyticsUiKitPage />} />}
          {/* Unknown paths stay inside the shell for authenticated users. */}
          <Route path="*" element={<NotFoundState />} />
        </Route>

        <Route path="/403" element={<AccessDenied />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
