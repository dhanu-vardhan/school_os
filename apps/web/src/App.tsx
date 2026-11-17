import { Suspense, lazy, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { SHOW_UI_KIT } from '@schoolos/api-client'
import { useSession } from './app/session'
import { AppShell, ShellFallback } from './components/AppShell'
import { ForbiddenCard } from './components/Screen'

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

const AdminDashboard = lazy(() => import('./pages/Dashboards').then(m => ({ default: m.AdminDashboard })))
const TeacherDashboard = lazy(() => import('./pages/Dashboards').then(m => ({ default: m.TeacherDashboard })))
const ParentDashboard = lazy(() => import('./pages/Dashboards').then(m => ({ default: m.ParentDashboard })))
const StudentDashboard = lazy(() => import('./pages/Dashboards').then(m => ({ default: m.StudentDashboard })))
const DashboardSwitch = lazy(() => import('./pages/Dashboards').then(m => ({ default: m.DashboardSwitch })))

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
const NewConcernPage = lazy(() => import('./pages/Safeguarding').then(m => ({ default: m.NewConcernPage })))
const ConcernDetailPage = lazy(() => import('./pages/Safeguarding').then(m => ({ default: m.ConcernDetailPage })))
const AiSuggestionsPage = lazy(() => import('./pages/Ai').then(m => ({ default: m.AiSuggestionsPage })))
const AiToolsPage = lazy(() => import('./pages/Ai').then(m => ({ default: m.AiToolsPage })))

const RetentionPage = lazy(() => import('./pages/Compliance').then(m => ({ default: m.RetentionPage })))
const DataRequestsPage = lazy(() => import('./pages/Compliance').then(m => ({ default: m.DataRequestsPage })))
const CompliancePackPage = lazy(() => import('./pages/Compliance').then(m => ({ default: m.CompliancePackPage })))
const AuditPage = lazy(() => import('./pages/Compliance').then(m => ({ default: m.AuditPage })))
const ReportsPage = lazy(() => import('./pages/Reports').then(m => ({ default: m.ReportsPage })))

const SystemStatusPage = lazy(() => import('./pages/Platform').then(m => ({ default: m.SystemStatusPage })))
const FeatureFlagsPage = lazy(() => import('./pages/Platform').then(m => ({ default: m.FeatureFlagsPage })))
const IntegrationsPage = lazy(() => import('./pages/Platform').then(m => ({ default: m.IntegrationsPage })))
const ModelsPage = lazy(() => import('./pages/Platform').then(m => ({ default: m.ModelsPage })))
const SupportPage = lazy(() => import('./pages/Platform').then(m => ({ default: m.SupportPage })))

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

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()
  if (loading) return <FullPageLoader />
  if (!session.authenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()
  if (loading) return <FullPageLoader />
  if (session.authenticated) return <Navigate to="/app/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <DocumentTitle />
      <Routes>
        <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/session-expired" element={<SessionExpiredPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route path="/schools/select" element={<SchoolSelectPage />} />
          <Route path="/app/dashboard" element={<DashboardSwitch />} />
          <Route path="/app/dashboard/admin" element={<AdminDashboard />} />
          <Route path="/app/dashboard/teacher" element={<TeacherDashboard />} />
          <Route path="/app/dashboard/parent" element={<ParentDashboard />} />
          <Route path="/app/dashboard/student" element={<StudentDashboard />} />

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

          <Route path="/app/ai/suggestions" element={<AiSuggestionsPage />} />
          <Route path="/app/ai/tools" element={<AiToolsPage />} />

          <Route path="/app/compliance/retention" element={<RetentionPage />} />
          <Route path="/app/compliance/requests" element={<DataRequestsPage />} />
          <Route path="/app/compliance/pack" element={<CompliancePackPage />} />
          <Route path="/app/compliance/audit" element={<AuditPage />} />

          <Route path="/app/reports" element={<ReportsPage />} />
          <Route path="/app/platform/status" element={<SystemStatusPage />} />
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
        </Route>

        <Route path="/403" element={<ForbiddenCard />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
