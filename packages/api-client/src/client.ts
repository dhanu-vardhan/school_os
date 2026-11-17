import type {
  Activity, ActivityOffering, Announcement, AppConfig, AuditEvent, ConsentRecord,
  DataExportRequest, Guardian, Holiday, Invoice, Membership, Message, Notification,
  PublicSession, RetentionPolicy, SafeguardingConcern, School, Student, TimetableEvent,
  AiSuggestion, ClassGroup,
} from '@schoolos/shared'
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

export async function demoLogin(role: string, schoolId?: string): Promise<ApiResponse<PublicSession>> {
  const res = await request<PublicSession>('/demo/session', { method: 'POST', body: jsonBody({ role, schoolId }) })
  sessionStore.set(useMockSession(res.data))
  return res
}

export async function logout(): Promise<ApiResponse<null>> {
  const res = await request<null>('/auth/logout', { method: 'POST' })
  sessionStore.set({ authenticated: false })
  return res
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

export const getSystemStatus = () => request<{ name: string; status: string; latencyMs: number }[]>('/v1/platform/status')
export const getFeatureFlags = () => request<{ key: string; enabled: boolean; scope: string; rollout: number }[]>('/v1/platform/flags')
export const getIntegrations = () => request<{ name: string; category: string; status: string; note: string }[]>('/v1/platform/integrations')
export const getModels = () => request<{ id: string; task: string; tier: string; licence: string; languages: string[]; approved: boolean }[]>('/v1/platform/models')

export type { ApiResponse }
