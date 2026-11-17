import type {
  Activity, ActivityOffering, Announcement, AppConfig, AuditEvent, ConsentRecord,
  DataExportRequest, Guardian, Holiday, Invoice, Membership, Message, Notification,
  PublicSession, RetentionPolicy, SafeguardingConcern, School, Student, TimetableEvent,
  AiSuggestion, ClassGroup, AttendanceRecord, AttendanceStatus,
  AccountSecurity, ActiveSession, DemoAccountsResponse, MfaChallenge, MfaEnrolment,
  SecurityEvent, SecurityOverview, AnalyticsResponse, DataPoint, Paginated, TimePoint,
} from '@schoolos/shared'
import type {
  AnalyticsOverview, AnalyticsQuery, Freshness, Intervention, ScenarioInput, ScenarioResult,
  Target,
} from './mock/analytics'
import { jsonBody, request, type ApiResponse } from './http'
import { sessionStore } from './session-store'
import { USE_MOCK } from './env'

function useMockSession(session: PublicSession): PublicSession {
  if (USE_MOCK) sessionStore.set(session)
  return session
}

export async function getConfig(): Promise<ApiResponse<AppConfig>> {
  const res = await request<AppConfig>('/config')
  sessionStore.setConfig(res.data)
  return res
}

export async function getSession(): Promise<ApiResponse<PublicSession>> {
  // In mock mode the demo session lives in the in-memory store; the BFF's
  // /session endpoint always reports unauthenticated without a real cookie.
  if (USE_MOCK) return { data: sessionStore.get(), mock: true }
  const res = await request<PublicSession>('/session')
  sessionStore.set(res.data)
  return res
}

export async function demoUsers(): Promise<ApiResponse<{ role: string; name: string; schoolId: string; schoolName: string }[]>> {
  const res = await request<{ users: { role: string; name: string; schoolId: string; schoolName: string }[] }>('/demo/users')
  return { ...res, data: res.data.users }
}

/** Demo account picker. Passwords and TOTP secrets are revealed only in demo mode. */
export function demoAccounts() {
  return request<DemoAccountsResponse>('/demo/accounts')
}

export function currentDemoTotp(key: string) {
  return request<{ code: string }>(`/demo/totp?key=${encodeURIComponent(key)}`)
}

/** Legacy helper kept for mock mode and existing screens; real sign-in uses demoSignIn/authSignIn. */
export async function demoLogin(role: string, schoolId?: string): Promise<ApiResponse<PublicSession>> {
  const res = await request<PublicSession>('/demo/session', { method: 'POST', body: jsonBody({ role, schoolId }) })
  sessionStore.set(useMockSession(res.data))
  return res
}

export interface PasswordSignIn {
  identifier: string
  password: string
  remember?: boolean
  returnTo?: string
}

/** Production/local credential sign-in. In OIDC mode the BFF answers with an authorization URL. */
export async function authSignIn(input: PasswordSignIn) {
  const res = await request<PublicSession | MfaChallenge | { mode: 'oidc'; authorizationUrl: string }>('/auth/login', {
    method: 'POST', body: jsonBody(input),
  })
  if ('authenticated' in res.data && res.data.authenticated) sessionStore.set(res.data)
  return res
}

export async function demoSignIn(input: { key: string; password: string; schoolId?: string; remember?: boolean }) {
  const res = await request<PublicSession | MfaChallenge>('/demo/session', { method: 'POST', body: jsonBody(input) })
  if ('authenticated' in res.data && res.data.authenticated) sessionStore.set(res.data)
  return res
}

export async function verifyMfa(input: { challengeId: string; code: string; mode?: 'demo' | 'oidc' }) {
  const path = input.mode === 'oidc' ? '/auth/mfa/verify' : '/demo/session/verify'
  const res = await request<PublicSession>(path, {
    method: 'POST', body: jsonBody({ challengeId: input.challengeId, code: input.code }),
  })
  sessionStore.set(res.data)
  return res
}

export async function getCsrfToken() {
  const res = await request<{ csrfToken: string }>('/auth/csrf')
  const current = sessionStore.get()
  sessionStore.set({ ...current, csrfToken: res.data.csrfToken })
  return res
}

export async function switchSchool(schoolId: string) {
  const res = await request<PublicSession>('/auth/switch-school', { method: 'POST', body: jsonBody({ schoolId }) })
  sessionStore.set(res.data)
  return res
}

export async function logout(): Promise<ApiResponse<null>> {
  const res = await request<null>('/auth/logout', { method: 'POST' })
  sessionStore.set({ authenticated: false })
  return res
}

export async function logoutAll() {
  const res = await request<{ revoked: number }>('/auth/logout-all', { method: 'POST' })
  sessionStore.set({ authenticated: false })
  return res
}

export function getAccountSecurity() {
  return request<AccountSecurity>('/account/security')
}

export function listAccountSessions() {
  return request<{ sessions: ActiveSession[] }>('/account/security/sessions')
}

export function revokeAccountSession(sid: string) {
  return request<{ revoked: boolean }>(`/account/security/sessions/${encodeURIComponent(sid)}/revoke`, { method: 'POST' })
}

export function listAccountEvents(limit = 20) {
  return request<{ events: SecurityEvent[] }>(`/account/security/events?limit=${limit}`)
}

export function beginMfaEnrolment() {
  return request<MfaEnrolment>('/auth/mfa/enroll/start', { method: 'POST' })
}

export function verifyMfaEnrolment(code: string) {
  return request<{ enrolled: boolean; mfa: boolean }>('/auth/mfa/enroll/verify', { method: 'POST', body: jsonBody({ code }) })
}

export async function stepUp(code: string) {
  const res = await request<PublicSession>('/auth/mfa/step-up', { method: 'POST', body: jsonBody({ code }) })
  sessionStore.set(res.data)
  return res
}

export function getSecurityOverview() {
  return request<SecurityOverview>('/security/overview')
}

export function listSecurityEvents() {
  return request<{ events: SecurityEvent[] }>('/security/events')
}

export function forgotPassword(identifier: string) {
  return request<{ accepted: boolean; demoToken?: string }>('/auth/forgot-password', {
    method: 'POST', body: jsonBody({ identifier }),
  })
}

export function resetPassword(input: { token: string; password: string }) {
  return request<{ reset: boolean }>('/auth/reset-password', { method: 'POST', body: jsonBody(input) })
}

export function acceptInvitation(input: { token?: string; email: string; password: string; privileged?: boolean }) {
  return request<{ accepted: boolean; mfaEnrollmentRequired: boolean }>('/auth/invitations/accept', {
    method: 'POST', body: jsonBody(input),
  })
}

export const listStudents = () => request<Student[]>('/v1/students')
export const getStudent = (id: string) => request<Student>(`/v1/students/${id}`)
export const createStudent = (input: Partial<Student>) => request<Student>('/v1/students', { method: 'POST', body: jsonBody(input) })
export const updateStudent = (id: string, input: Partial<Student>) => request<Student>(`/v1/students/${id}`, { method: 'PATCH', body: jsonBody(input) })

export const listSchools = () => request<School[]>('/v1/schools')
export const getSchool = (id: string) => request<School>(`/v1/schools/${id}`)
export const updateSchool = (id: string, input: Partial<School>) => request<School>(`/v1/schools/${id}`, { method: 'PATCH', body: jsonBody(input) })

export const listClasses = () => request<ClassGroup[]>('/v1/classes')
export const listGuardians = () => request<Guardian[]>('/v1/guardians')
export const listStaff = () => request<{ sub: string; name: string; role: string; email: string }[]>('/v1/staff')
export const listMembers = () => request<Membership[]>('/v1/members')
export const inviteMember = (input: { email: string; role: string }) => request<Membership>('/v1/members', { method: 'POST', body: jsonBody(input) })

export const listActivities = () => request<Activity[]>('/v1/activities')
export const getActivity = (id: string) => request<{ activity: Activity; offering: ActivityOffering }>(`/v1/activities/${id}`)
export const listOfferings = () => request<ActivityOffering[]>('/v1/offerings')
export const enrolInActivity = (input: { offeringId: string; studentId: string }) =>
  request<{ id: string; status: 'confirmed' | 'waitlisted' }>('/v1/enrolments', { method: 'POST', body: jsonBody(input) })

export const listConcerns = () => request<SafeguardingConcern[]>('/v1/concerns')
export const getConcern = (id: string) => request<SafeguardingConcern>(`/v1/concerns/${id}`)
export const createConcern = (input: { category: string; reportedByRole: string }) =>
  request<{ id: string; reference: string }>('/v1/concerns', { method: 'POST', body: jsonBody(input) })
export const updateConcern = (id: string, input: { status: SafeguardingConcern['status'] }) =>
  request<SafeguardingConcern>(`/v1/concerns/${id}`, { method: 'PATCH', body: jsonBody(input) })

export const listSuggestions = () => request<AiSuggestion[]>('/v1/suggestions')
export const decideSuggestion = (id: string, status: AiSuggestion['status']) =>
  request<AiSuggestion>(`/v1/suggestions/${id}`, { method: 'PATCH', body: jsonBody({ status }) })

export const listNotifications = () => request<Notification[]>('/v1/notifications')
export const markNotificationRead = (id: string) => request<Notification>(`/v1/notifications/${id}`, { method: 'PATCH' })
export const markAllNotificationsRead = () => request<{ updated: boolean }>('/v1/notifications/read-all', { method: 'POST' })

export const listMessages = () => request<Message[]>('/v1/messages')
export const sendMessage = (input: { to: string; subject: string; body: string }) =>
  request<Message>('/v1/messages', { method: 'POST', body: jsonBody(input) })
export const listAnnouncements = () => request<Announcement[]>('/v1/announcements')
export const createAnnouncement = (input: { title: string; body: string; audience: string; author: string }) =>
  request<Announcement>('/v1/announcements', { method: 'POST', body: jsonBody(input) })

export const listInvoices = () => request<Invoice[]>('/v1/invoices')
export const payInvoice = (id: string) => request<Invoice>(`/v1/invoices/${id}/mark-paid`, { method: 'POST' })
export const listConsents = () => request<ConsentRecord[]>('/v1/consents')

export const listAudit = () => request<AuditEvent[]>('/v1/audit')
export const listRetention = () => request<RetentionPolicy[]>('/v1/retention')
export const listDataRequests = () => request<DataExportRequest[]>('/v1/data-requests')
export const createDataRequest = (input: { type: 'export' | 'erasure'; subject: string }) =>
  request<DataExportRequest>('/v1/data-requests', { method: 'POST', body: jsonBody(input) })

export const listHolidays = () => request<Holiday[]>('/v1/holidays')
export const listTimetable = () => request<TimetableEvent[]>('/v1/timetable')

export const listAttendance = () => request<AttendanceRecord[]>('/v1/attendance')
export const saveAttendance = (marks: Array<{ studentId: string; classId: string; date: string; status: AttendanceStatus }>) =>
  request<{ saved: number }>('/v1/attendance', { method: 'PUT', body: jsonBody({ marks }) })

export interface DashboardData {
  kpis: { enrolment: number; attendanceRate: number; openConcerns: number; activityUptake: number; aiPending: number; presentToday: number }
  attendanceTrend: { label: string; value: number }[]
  enrolmentByLevel: { label: string; value: number }[]
}
export const getDashboard = () => request<DashboardData>('/v1/dashboard')

export interface ReportResult {
  rows: { label: string; value: number; secondary: number }[]
  metric: string; groupBy: string
}
export const runReport = (input: { metric: string; groupBy: string; from: string; to: string }) =>
  request<ReportResult>('/v1/reports', { method: 'POST', body: jsonBody(input) })

export interface AnalyticsDictionary {
  version: string
  metricIds: string[]
  definitions: Record<string, import('@schoolos/shared').MetricDefinition>
  options: {
    years: string[]
    terms: string[]
    classes: Array<{ value: string; label: string }>
    levels: string[]
    subjects: string[]
  }
  freshness: Freshness
}

function analyticsUrl(path: string, params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return `/v1/analytics/${path}${query ? `?${query}` : ''}`
}

/** Governed analytics endpoints. Tenant scope is always derived by the BFF from the session. */
export const getAnalyticsDictionary = () => request<AnalyticsDictionary>(analyticsUrl('meta'))
export const getAnalyticsOverview = (params: AnalyticsQuery = {}) =>
  request<AnalyticsResponse<AnalyticsOverview>>(analyticsUrl('overview', params as Record<string, unknown>))
export const getAnalyticsSeries = (params: AnalyticsQuery) =>
  request<AnalyticsResponse<TimePoint[]>>(analyticsUrl('series', params as Record<string, unknown>))
export const getAnalyticsTable = (params: AnalyticsQuery) =>
  request<AnalyticsResponse<Paginated<DataPoint>>>(analyticsUrl('table', params as Record<string, unknown>))
export const getAnalyticsMatrix = (params: AnalyticsQuery) =>
  request<AnalyticsResponse<{ rows: (DataPoint | null)[][]; columns: string[] }>>(analyticsUrl('matrix', params as Record<string, unknown>))
export const getAnalyticsInsights = (params: AnalyticsQuery = {}) =>
  request<AnalyticsResponse<import('@schoolos/analytics-core').Insight[]>>(analyticsUrl('insights', params as Record<string, unknown>))
export const explainMetric = (metricId: string, params: AnalyticsQuery = {}) =>
  request<AnalyticsResponse<Record<string, unknown>>>(analyticsUrl(`explain/${encodeURIComponent(metricId)}`, params as Record<string, unknown>))
export const listTargets = () => request<AnalyticsResponse<Target[]>>(analyticsUrl('targets'))
export const saveTarget = (input: { metricId: string; value: number }) =>
  request<AnalyticsResponse<Target>>(analyticsUrl('targets'), { method: 'POST', body: jsonBody(input) })
export const listInterventions = () => request<AnalyticsResponse<Intervention[]>>(analyticsUrl('interventions'))
export const createIntervention = (input: { metricId: string; scope?: string; note?: string }) =>
  request<AnalyticsResponse<Intervention>>(analyticsUrl('interventions'), { method: 'POST', body: jsonBody(input) })
export const updateIntervention = (id: string, status: Intervention['status']) =>
  request<AnalyticsResponse<Intervention>>(analyticsUrl(`interventions/${encodeURIComponent(id)}`), { method: 'PATCH', body: jsonBody({ status }) })
export const dismissInsight = (dedupeKey: string) =>
  request<AnalyticsResponse<{ dismissed: boolean }>>(analyticsUrl('insights/dismiss'), { method: 'POST', body: jsonBody({ dedupeKey }) })
export const snoozeInsight = (dedupeKey: string, days = 7) =>
  request<AnalyticsResponse<{ snoozedUntil: string }>>(analyticsUrl('insights/snooze'), { method: 'POST', body: jsonBody({ dedupeKey, days }) })
export const runScenario = (input: ScenarioInput) =>
  request<AnalyticsResponse<ScenarioResult>>(analyticsUrl('scenario'), { method: 'POST', body: jsonBody(input) })
export const createAnalyticsExport = (input: { metricId: string; format?: 'csv' | 'print' }) =>
  request<AnalyticsResponse<{ id: string; status: string; format: string; rows: number; watermark: string; csv?: string }>>(analyticsUrl('export'), { method: 'POST', body: jsonBody(input) })
export const getAnalyticsExport = (id: string) =>
  request<AnalyticsResponse<{ id: string; status: string; format: string; rows: number; watermark: string; csv?: string }>>(analyticsUrl(`export/${encodeURIComponent(id)}`))
export type {
  AnalyticsOverview, AnalyticsQuery, Freshness, Intervention, ScenarioInput, ScenarioResult, Target,
}
export type { Insight } from '@schoolos/analytics-core'

export const getSystemStatus = () => request<{ name: string; status: string; latencyMs: number }[]>('/v1/platform/status')
export const getFeatureFlags = () => request<{ key: string; enabled: boolean; scope: string; rollout: number }[]>('/v1/platform/flags')
export const getIntegrations = () => request<{ name: string; category: string; status: string; note: string }[]>('/v1/platform/integrations')
export const getModels = () => request<{ id: string; task: string; tier: string; licence: string; languages: string[]; approved: boolean }[]>('/v1/platform/models')

export type { ApiResponse }
