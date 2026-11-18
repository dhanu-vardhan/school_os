import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n, { initI18n } from '@schoolos/i18n'
import { CANONICAL_ROLES, landingRouteFor, routeAccess, findRoute, displayToCanonical } from '@schoolos/shared'
import { DashboardSwitch } from '../pages/Dashboards'

const mockSession: any = {
  session: { user: { name: 'Test User', locale: 'fr', roles: ['director'] } },
  role: 'director',
  roles: ['director'],
  schoolId: 'school-a',
  stepUpActive: false,
}

vi.mock('../app/session', () => ({
  useSession: () => mockSession,
}))

const okQuery = (data: any = []) => ({ data: { data, mock: false }, isLoading: false, error: null, refetch: vi.fn() })
const loadingFalse = okQuery

vi.mock('@schoolos/api-client', () => ({
  useDashboard: () => okQuery({ kpis: { enrolment: 120, attendanceRate: 96, openConcerns: 2, activityUptake: 60, aiPending: 1, presentToday: 115 }, attendanceTrend: [{ label: 'Lun', value: 95 }], enrolmentByLevel: [{ label: 'CP', value: 24 }] }),
  useStudents: () => okQuery([]),
  useConcerns: () => okQuery([{ id: 'c1', status: 'open', summary: 'x' }]),
  useSuggestions: () => okQuery([{ id: 's1', status: 'proposed' }]),
  useHolidays: () => okQuery([{ name: 'Vacances', start: '2026-12-20', end: '2027-01-03' }]),
  useNotifications: () => okQuery([{ id: 'n1', title: 't', body: 'b', at: '2026-11-01', tone: 'info' }]),
  useClasses: () => okQuery([{ id: 'cl1', name: 'CP A', teacher: 'Test User', room: '1', headcount: 20, attendanceToday: 19 }]),
  useTimetable: () => okQuery([{ id: 'tt1', day: 0, start: '08:00', end: '09:00', title: 'Maths', subtitle: 'CP A' }]),
  useMessages: () => okQuery([{ id: 'm1', subject: 's', body: 'b', at: '2026-11-01', read: false }]),
  useAnnouncements: () => okQuery([{ id: 'a1', title: 'a', body: 'b', at: '2026-11-01' }]),
  useInvoices: () => okQuery([{ id: 'i1', label: 'Facture', amountCents: 1000, status: 'paid', dueDate: '2026-11-01' }]),
}))

const ROLE_TO_DISPLAY: Record<string, string> = {
  'principal': 'director',
  'school-admin': 'admin',
  'deputy': 'deputy',
  'teacher': 'teacher',
  'parent': 'guardian',
  'student': 'student',
  'safeguarding-lead': 'safeguarding',
  'nurse': 'nurse',
  'finance': 'finance',
  'hr': 'hr',
  'it-admin': 'itadmin',
  'librarian': 'librarian',
  'receptionist': 'reception',
  'auditor': 'auditor',
  'analyst': 'analyst',
  'group-admin': 'group-admin',
  'super-admin': 'operator',
}

const EXPECTED_DASHBOARD_TESTID: Record<string, string> = {
  'principal': 'dashboard-principal',
  'school-admin': 'dashboard-schoolAdmin',
  'deputy': 'dashboard-deputy',
  'teacher': 'dashboard-teacher',
  'parent': 'dashboard-parent',
  'student': 'dashboard-student',
  'safeguarding-lead': 'dashboard-safeguardingLead',
  'nurse': 'dashboard-nurse',
  'finance': 'dashboard-finance',
  'hr': 'dashboard-hr',
  'it-admin': 'dashboard-itAdmin',
  'librarian': 'dashboard-librarian',
  'receptionist': 'dashboard-receptionist',
  'auditor': 'dashboard-auditor',
  'analyst': 'dashboard-analyst',
  'group-admin': 'dashboard-groupAdmin',
  'super-admin': 'dashboard-platformAdmin',
}

// Representative routes that must be forbidden for each canonical role (deny-by-default / cross-domain protection)
const FORBIDDEN_FOR_ROLE: Record<string, string[]> = {
  'principal': ['/app/platform/flags'],
  'school-admin': ['/app/platform/flags', '/group'],
  'deputy': ['/app/platform/flags', '/group'],
  'teacher': ['/app/platform/flags', '/app/finance/exports', '/group'],
  'parent': ['/app/people/students', '/app/safeguarding', '/app/platform/flags'],
  'student': ['/app/people/students', '/app/safeguarding', '/app/platform/flags'],
  'safeguarding-lead': ['/app/platform/flags', '/group'],
  'nurse': ['/app/safeguarding', '/app/platform/flags', '/group'],
  'finance': ['/app/safeguarding', '/app/platform/flags', '/group'],
  'hr': ['/app/safeguarding', '/app/platform/flags', '/group'],
  'it-admin': ['/app/safeguarding', '/group'],
  'librarian': ['/app/safeguarding', '/app/platform/flags', '/group'],
  'receptionist': ['/app/safeguarding', '/app/platform/flags', '/group'],
  'auditor': ['/app/platform/flags', '/group'],
  'analyst': ['/app/safeguarding', '/app/platform/flags', '/group'],
  'group-admin': ['/app/safeguarding', '/app/platform/flags'],
  'super-admin': ['/app/safeguarding'],
}

async function renderDashboardFor(role: string) {
  mockSession.role = ROLE_TO_DISPLAY[role] ?? role
  mockSession.roles = [mockSession.role]
  mockSession.session.user.roles = [mockSession.role]
  await initI18n()
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <DashboardSwitch />
      </MemoryRouter>
    </I18nextProvider>,
  )
}

describe('PROMPT 000 P0: role landings and dashboard isolation', () => {
  beforeEach(() => {
    mockSession.role = 'director'
    mockSession.roles = ['director']
  })

  it('each canonical role has a registered landing reachable by that role', () => {
    for (const role of CANONICAL_ROLES) {
      const landing = landingRouteFor(role)
      const entry = findRoute(landing)
      expect(entry, `${role} landing ${landing} must be registered`).toBeDefined()
      expect(routeAccess(entry, { role, schoolId: 'school-a' }), `${role} must reach ${landing}`).toBe('ok')
    }
  })

  it('each canonical role is denied representative forbidden routes', () => {
    for (const role of CANONICAL_ROLES) {
      const forbidden = FORBIDDEN_FOR_ROLE[role] ?? []
      expect(forbidden.length, `${role} must declare forbidden routes`).toBeGreaterThan(0)
      for (const path of forbidden) {
        const entry = findRoute(path)
        if (!entry) continue // route may not exist yet; access control still deny-by-default
        const access = routeAccess(entry, { role, schoolId: 'school-a' })
        expect(['role', 'permission', 'flag', 'tenant', 'stepup', 'impersonation']).toContain(access)
        expect(access, `${role} must not access ${path}`).not.toBe('ok')
      }
    }
  })

  it('renders a role-specific dashboard (no director clone) for every canonical role', async () => {
    for (const role of CANONICAL_ROLES) {
      const { unmount } = await renderDashboardFor(role)
      const expected = EXPECTED_DASHBOARD_TESTID[role]
      expect(expected, `missing expected testid mapping for ${role}`).toBeTruthy()
      expect(screen.getByTestId(expected), `${role} should render ${expected}`).toBeInTheDocument()
      // Non-principal roles must not render the principal/director dashboard container
      if (role !== 'principal') {
        expect(screen.queryByTestId('dashboard-principal'), `${role} must not render principal dashboard`).toBeNull()
      }
      unmount()
    }
  })
})
