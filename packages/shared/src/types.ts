export type ID = string
export type ISODate = string
export type ISOTime = string

export interface ApiResult<T> { data: T; mock?: boolean; correlationId?: string }

export interface AppConfig {
  appName: string
  version: string
  defaultLocale: string
  locales: string[]
  authMode: 'demo' | 'oidc'
  demoEnabled: boolean
  apiBasePath: string
  timezone: string
}

export interface SessionUser {
  sub: string
  name: string
  locale: string
  roles: string[]
  schoolId: ID
  demo: boolean
}

export interface PublicSession {
  authenticated: boolean
  user?: SessionUser
  csrfToken?: string
  expiresAt?: string
}

export interface School {
  id: ID
  name: string
  timezone: string
  locale: string
  academicYear?: string
  terms?: { id: string; name: string; start: ISODate; end: ISODate }[]
  address?: string
  logoText?: string
  version?: number
}

export type MembershipStatus = 'active' | 'invited' | 'inactive'
export interface Membership {
  id: ID
  schoolId: ID
  userSubject: string
  userEmail?: string
  name: string
  role: string
  status: MembershipStatus
  joinedAt?: ISODate
}

export interface Student {
  id: ID
  firstName: string
  lastName: string
  birthDate?: ISODate
  ineNumber?: string
  classId?: ID
  enrolmentDate?: ISODate
  languagesSpoken?: string
  version?: number
}

export interface Guardian {
  id: ID
  studentIds: ID[]
  name: string
  email?: string
  phone?: string
  relation: string
  pickupAuthorised: boolean
  custodyNotes?: string
}

export interface ClassGroup {
  id: ID
  name: string
  level: string
  teacher: string
  room: string
  headcount: number
  capacity: number
  attendanceToday: number
}

export interface Activity {
  id: ID
  name: string
  type: string
  description: string
  minAge: number
  maxAge: number
  category?: string
  day: string
  icon?: 'chess' | 'art' | 'sport' | 'music' | 'language'
  imageTone?: 'brand' | 'accent' | 'warning' | 'info'
}

export interface ActivityOffering {
  id: ID
  activityId: ID
  term: string
  capacity: number
  booked: number
  waitlist: number
  minEnrolment: number
  priceCents: number
  currency: string
  status: 'draft' | 'open' | 'full' | 'closed'
  location: string
  registrationCloseAt?: string
  sessions: { id: string; date: ISODate; start: ISOTime; end: ISOTime }[]
}

export interface SafeguardingConcern {
  id: ID
  reference: string
  category: string
  status: 'open' | 'under_review' | 'closed'
  createdAt: string
  updatedAt: string
  reportedByRole: string
  subjectInitials: string
  summary: string
  assignee?: string
  events: { id: string; at: string; actorRole: string; action: string }[]
}

export interface AiSuggestion {
  id: ID
  feature: string
  title: string
  body: string
  modelId: string
  status: 'proposed' | 'edited' | 'approved' | 'rejected'
  confidence: number
  redacted: boolean
  createdAt: string
}

export interface RetentionPolicy {
  id: ID
  dataType: string
  retentionDays: number
  action: 'archive' | 'delete' | 'anonymise'
  nextRun: ISODate
  enabled: boolean
}

export interface ConsentRecord {
  id: ID
  studentId: ID
  consentType: string
  granted: boolean
  grantedAt?: string
}

export interface Notification {
  id: ID
  title: string
  body: string
  at: string
  read: boolean
  tone: 'info' | 'success' | 'warning' | 'danger'
  category: 'attendance' | 'message' | 'activity' | 'billing' | 'system'
}

export interface Message {
  id: ID
  from: string
  to: string
  subject: string
  body: string
  at: string
  read: boolean
  replies: { id: string; from: string; body: string; at: string }[]
}

export interface Announcement {
  id: ID
  title: string
  body: string
  author: string
  at: string
  audience: string
}

export type InvoiceStatus = 'paid' | 'due' | 'overdue' | 'failed'
export interface Invoice {
  id: ID
  label: string
  studentId: ID
  amountCents: number
  currency: string
  dueDate: ISODate
  status: InvoiceStatus
}

export interface AuditEvent {
  id: string
  at: string
  actor: string
  action: string
  target: string
  ip?: string
}

export interface Holiday { name: string; start: ISODate; end: ISODate }

export interface TimetableEvent {
  id: string
  day: number
  start: number
  end: number
  title: string
  subtitle?: string
  tone?: 'brand' | 'accent' | 'warning' | 'danger' | 'info'
}

export interface DataExportRequest {
  id: string
  type: 'export' | 'erasure'
  subject: string
  requestedAt: string
  status: 'pending' | 'in_progress' | 'completed'
  dueAt: string
}
