/**
 * Guardian / family portal API. Tenant and guardian subject are derived server-side from the
 * session; no function here accepts a school id or a guardian id from the caller.
 */
import type {
  AbsenceDeclaration, AbsencePeriod, AppointmentSlot, AuthorizedPerson, Bulletin,
  CanteenReservation, ConcernSubmission, ConsentProof, FamilyActivityEnrolment,
  FamilyAnnouncement, FamilyAttendanceDay, FamilyBillingSummary, FamilyChild,
  FamilyDashboard, FamilyDataRequest, FamilyDocument, FamilyInvoice, FamilyOverview,
  FamilyPolicy, FamilyThread, FormAssignment, HomeworkItem, NotificationPreferences,
  PaymentReceipt, SchoolCalendarEvent, DeviceSession, GuardianInvitation, IcsFeed,
  AttendanceCounters, GradeEntry, SubjectAverage, DocumentDownload,
} from '@schoolos/shared'
import { jsonBody, request, type ApiResponse } from './http'

export const getFamilyOverview = () => request<FamilyOverview>('/v1/family/overview')
export const getFamilyDashboard = () => request<FamilyDashboard>('/v1/family/dashboard')
export const listFamilyChildren = () => request<FamilyChild[]>('/v1/family/children')
export const getFamilyChild = (id: string) => request<FamilyChild>(`/v1/family/children/${id}`)
export const requestChildContactChange = (id: string, fields: Record<string, string>) =>
  request<{ submitted: boolean; requestId: string; approvalQueue: string; message: string }>(
    `/v1/family/children/${id}/contact-request`, { method: 'POST', body: jsonBody({ fields }) })

export interface FamilyAttendanceResponse {
  days: FamilyAttendanceDay[]
  declarations: AbsenceDeclaration[]
  counters: AttendanceCounters[]
}
export const listFamilyAttendance = (childId?: string) =>
  request<FamilyAttendanceResponse>(`/v1/family/attendance${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`)

export interface AbsenceInput {
  childId: string
  fromDate: string
  toDate: string
  period: AbsencePeriod
  reasonCode: string
  reasonText?: string
  attachmentName?: string
}
export const declareAbsence = (input: AbsenceInput) =>
  request<AbsenceDeclaration>('/v1/family/absences', { method: 'POST', body: jsonBody(input) })

export const listFamilyTimetable = (childId?: string) =>
  request<import('@schoolos/shared').FamilyTimetableEntry[]>(
    `/v1/family/timetable${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`)
export const createIcsFeed = (childId: string) =>
  request<IcsFeed>('/v1/family/calendar/ics', { method: 'POST', body: jsonBody({ childId }) })
export const getIcsFeed = (childId?: string) =>
  request<IcsFeed>(`/v1/family/calendar/ics${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`)
export const revokeIcsFeed = (token: string) =>
  request<{ revoked: boolean }>(`/v1/family/calendar/ics/${encodeURIComponent(token)}`, { method: 'DELETE' })

export const listFamilyHomework = (childId?: string) =>
  request<HomeworkItem[]>(`/v1/family/homework${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`)
export const markHomeworkRead = (id: string) =>
  request<HomeworkItem>(`/v1/family/homework/${encodeURIComponent(id)}/read`, { method: 'POST' })

export interface FamilyGradesResponse {
  grades: GradeEntry[]
  bulletins: Bulletin[]
  averages: SubjectAverage[]
  overall: number
  rankingEnabled: boolean
}
export const listFamilyGrades = (childId?: string) =>
  request<FamilyGradesResponse>(`/v1/family/grades${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`)
export const acknowledgeBulletin = (id: string) =>
  request<Bulletin>(`/v1/family/bulletins/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' })

export const listFamilyThreads = () => request<FamilyThread[]>('/v1/family/messages')
export interface SendFamilyMessageInput {
  childId?: string
  recipientRole: string
  subject: string
  body: string
  templateId?: string
  attachmentName?: string
}
export const sendFamilyMessage = (input: SendFamilyMessageInput) =>
  request<FamilyThread>('/v1/family/messages', { method: 'POST', body: jsonBody(input) })
export const replyFamilyThread = (id: string, body: string) =>
  request<FamilyThread>(`/v1/family/messages/${encodeURIComponent(id)}/reply`, { method: 'POST', body: jsonBody({ body }) })
export const markFamilyThreadRead = (id: string) =>
  request<{ read: boolean }>(`/v1/family/messages/${encodeURIComponent(id)}/read`, { method: 'POST' })
export const reportFamilyThread = (id: string) =>
  request<{ reported: boolean }>(`/v1/family/messages/${encodeURIComponent(id)}/abuse`, { method: 'POST' })

export const listFamilyAnnouncements = () => request<FamilyAnnouncement[]>('/v1/family/announcements')
export const markFamilyAnnouncementRead = (id: string) =>
  request<FamilyAnnouncement>(`/v1/family/announcements/${encodeURIComponent(id)}/read`, { method: 'POST' })
export const listSchoolCalendar = () => request<SchoolCalendarEvent[]>('/v1/family/calendar')

export const listFamilyForms = (childId?: string) =>
  request<FormAssignment[]>(`/v1/family/forms${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`)
export const signFamilyForm = (id: string, proof: { device?: string; method?: 'password' | 'mfa' }) =>
  request<{ assignment: FormAssignment; state: unknown }>(
    `/v1/family/forms/${encodeURIComponent(id)}/sign`, { method: 'POST', body: jsonBody(proof) })
export const withdrawFamilyForm = (id: string) =>
  request<FormAssignment>(`/v1/family/forms/${encodeURIComponent(id)}/withdraw`, { method: 'POST' })

export const listAuthorizedPersons = (childId?: string) =>
  request<AuthorizedPerson[]>(`/v1/family/collectors${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`)
export interface AuthorizedPersonInput {
  childId: string
  name: string
  relationship: string
  phone: string
  idCheckRequired: boolean
  validFrom: string
  validTo?: string
  note?: string
}
export const addAuthorizedPerson = (input: AuthorizedPersonInput) =>
  request<AuthorizedPerson>('/v1/family/collectors', { method: 'POST', body: jsonBody(input) })
export const updateAuthorizedPerson = (id: string, input: Partial<AuthorizedPersonInput>) =>
  request<AuthorizedPerson>(`/v1/family/collectors/${encodeURIComponent(id)}`, { method: 'PATCH', body: jsonBody(input) })
export const removeAuthorizedPerson = (id: string) =>
  request<{ deleted: boolean }>(`/v1/family/collectors/${encodeURIComponent(id)}`, { method: 'DELETE' })

export const listAppointments = (childId?: string) =>
  request<AppointmentSlot[]>(`/v1/family/appointments${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`)
export const bookAppointment = (id: string) =>
  request<AppointmentSlot>(`/v1/family/appointments/${encodeURIComponent(id)}/book`, { method: 'POST' })
export const cancelAppointment = (id: string) =>
  request<AppointmentSlot>(`/v1/family/appointments/${encodeURIComponent(id)}/cancel`, { method: 'POST' })

export interface FamilyActivitiesResponse {
  offerings: import('@schoolos/shared').ActivityOffering[]
  activities: import('@schoolos/shared').Activity[]
  enrolments: FamilyActivityEnrolment[]
}
export const listFamilyActivities = (childId?: string) =>
  request<FamilyActivitiesResponse>(`/v1/family/activities${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`)
export const enrolFamilyActivity = (input: { childId: string; offeringId: string; consent: boolean }) =>
  request<FamilyActivityEnrolment>('/v1/family/activities/enrol', { method: 'POST', body: jsonBody(input) })
export const cancelFamilyActivity = (id: string) =>
  request<FamilyActivityEnrolment>(`/v1/family/activities/enrolments/${encodeURIComponent(id)}/cancel`, { method: 'POST' })

export interface FamilyCanteenResponse {
  mode: 'school' | 'commune'
  menus: import('@schoolos/shared').CanteenMenuItem[]
  reservations: CanteenReservation[]
}
export const listFamilyCanteen = (childId?: string) =>
  request<FamilyCanteenResponse>(`/v1/family/canteen${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`)
export const reserveCanteen = (input: { childId: string; date: string }) =>
  request<CanteenReservation>('/v1/family/canteen/reserve', { method: 'POST', body: jsonBody(input) })
export const cancelCanteenReservation = (id: string) =>
  request<CanteenReservation>(`/v1/family/canteen/reservations/${encodeURIComponent(id)}`, { method: 'DELETE' })

export const getFamilyBilling = () => request<FamilyBillingSummary>('/v1/family/billing')
export const payFamilyInvoice = (id: string, method: 'card' | 'sepa' = 'card') =>
  request<PaymentReceipt>(`/v1/family/billing/invoices/${encodeURIComponent(id)}/pay`, { method: 'POST', body: jsonBody({ method }) })
export const requestSepaMandate = () =>
  request<{ id: string; ibanMasked: string; status: string; signedAt: string }>('/v1/family/billing/mandate', { method: 'POST' })

export const listFamilyDocuments = (childId?: string) =>
  request<FamilyDocument[]>(`/v1/family/documents${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`)
export const requestFamilyDocument = (input: { childId: string; type: string; title: string }) =>
  request<FamilyDocument>('/v1/family/documents/request', { method: 'POST', body: jsonBody(input) })
export const downloadFamilyDocument = (id: string) =>
  request<{ download: DocumentDownload; url: string }>(`/v1/family/documents/${encodeURIComponent(id)}/download`, { method: 'POST' })
export const listDocumentDownloads = () => request<DocumentDownload[]>('/v1/family/documents/downloads')

export const getFamilyPreferences = () => request<NotificationPreferences>('/v1/family/preferences')
export const saveFamilyPreferences = (input: NotificationPreferences) =>
  request<NotificationPreferences>('/v1/family/preferences', { method: 'PUT', body: jsonBody(input) })
export const listFamilyDevices = () => request<DeviceSession[]>('/v1/family/devices')
export const revokeFamilyDevice = (id: string) =>
  request<{ revoked: boolean }>(`/v1/family/devices/${encodeURIComponent(id)}/revoke`, { method: 'POST' })

export const listFamilyDataRequests = () => request<FamilyDataRequest[]>('/v1/family/data-requests')
export const createFamilyDataRequest = (input: { childId: string; type: FamilyDataRequest['type']; subject: string }) =>
  request<FamilyDataRequest>('/v1/family/data-requests', { method: 'POST', body: jsonBody(input) })

export const listFamilyConsents = () => request<ConsentProof[]>('/v1/family/consents')
export const withdrawFamilyConsent = (id: string) =>
  request<ConsentProof>(`/v1/family/consents/${encodeURIComponent(id)}/withdraw`, { method: 'POST' })

export const submitFamilyConcern = (input: { childId: string; message: string }) =>
  request<ConcernSubmission>('/v1/family/concerns', { method: 'POST', body: jsonBody(input) })

export const getFamilyPolicy = () => request<FamilyPolicy>('/v1/family/policy')
export const listFamilyInvitations = () =>
  request<Array<GuardianInvitation & { state: { usable: boolean; reason: string } }>>('/v1/family/invitations')

export const getOtherGuardianContact = (childId: string) =>
  request<{ name: string; email: string; phone: string; masked: boolean } | null>(
    `/v1/family/guardian-contact?childId=${encodeURIComponent(childId)}`)

export type { FamilyInvoice }
export type { ApiResponse }
