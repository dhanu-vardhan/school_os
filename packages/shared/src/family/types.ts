/**
 * Guardian / parent portal domain model (PROMPT 005).
 *
 * The portal is the product's main surface for families. Every entity here is scoped to
 * one school and to explicit `guardian_link` rows: there is no "infer the custodial parent"
 * rule anywhere in the code. Legal flags are set by the school from documents and are only
 * ever read here.
 */
import type { ID, ISODate, ISOTime, Invoice } from '../types'

/* ------------------------------------------------------------------ relationships */

export type GuardianRelationship = 'mother' | 'father' | 'legal_guardian' | 'step_parent' | 'other'
export type GuardianLinkStatus = 'active' | 'invited' | 'suspended' | 'revoked'

/**
 * Explicit relationship between one guardian identity and one pupil. `holdsParentalAuthority`
 * and `rightToInformation` are *school-declared* facts (from the family record / court order),
 * never derived from the other parent's flags.
 */
export interface GuardianLink {
  id: ID
  guardianSub: string
  guardianName: string
  guardianEmail?: string
  childId: ID
  relationship: GuardianRelationship
  holdsParentalAuthority: boolean
  rightToInformation: boolean
  isFinancialPayer: boolean
  isEmergencyContact: boolean
  emergencyPriority?: number
  mayCollectChild: boolean
  livesWithChild: boolean
  status: GuardianLinkStatus
  validFrom: ISODate
  validTo?: ISODate
  /** Set when the link is revoked; sessions are invalidated immediately. */
  revokedAt?: string
  revokedReason?: string
}

/** Typed court-order restriction. Created only by the direction, with a document reference. */
export type RestrictionType =
  | 'collect_child'
  | 'contact_with_child'
  | 'address_disclosure'
  | 'school_information'
  | 'media'
  | 'records'

export interface GuardianRestriction {
  id: ID
  childId: ID
  /** Subject of the restriction (the guardian who is restricted). */
  guardianSub: string
  type: RestrictionType
  scope: string
  courtDocumentRef: string
  courtDocumentName: string
  setBy: string
  effectiveFrom: ISODate
  effectiveTo?: ISODate
  /** Restrictions take effect immediately and are never scheduled in the UI. */
  active: boolean
  note?: string
}

export interface LinkedTeacher {
  name: string
  subject: string
  email?: string
  officeHours?: string
}

/** Non-sensitive child reference used by the family context switcher and pages. */
export interface FamilyChild {
  id: ID
  firstName: string
  lastName: string
  schoolId: ID
  className: string
  level: string
  birthDate?: ISODate
  teachers: LinkedTeacher[]
  schoolLifeContact: { name: string; role: string; email: string; phone?: string }
  /** Current guardian's own restrictions for this child (never another guardian's). */
  restrictions: GuardianRestriction[]
  mayCollectChild: boolean
  photoConsentGranted: boolean
  /** `true` once the pupil is 18 and the school policy allows continued guardian read. */
  accessNote?: string
}

export interface FamilyPolicy {
  /** What happens to guardian access when the pupil turns 18. Verify with legal counsel. */
  agePolicy: 'continue_read' | 'require_student_consent' | 'stop'
  canteenMode: 'school' | 'commune'
  gradeRankingEnabled: boolean
  bothGuardiansMeetingDefault: boolean
  officeHours: { start: ISOTime; end: ISOTime; timezone: string; autoReply: string }
  quietHours: { start: ISOTime; end: ISOTime; digestOnly: boolean }
  mandatoryNoticeChannels: Array<'in_app' | 'email' | 'push'>
  signatoryRules: Record<SignatoryRule['formType'], SignatoryRuleMode>
  absenceReasons: { code: string; label: string }[]
  /** Informational only: counters never trigger automatic sanctions in the portal. */
  absenceThresholds: { unjustified: number; late: number; label: string }
  /** Legal notice shown above signatures; always TODO(legal-review). */
  signatureNotice: string
}

/** Signatory rule — configurable per form type, verified with legal counsel. */
export type SignatoryRuleMode = 'one_guardian' | 'both_guardians' | 'legal_representative_only'

export interface SignatoryRule {
  formType: string
  mode: SignatoryRuleMode
  label: string
}

/* ------------------------------------------------------------------ invitations */

export type InvitationStatus = 'pending' | 'expired' | 'accepted' | 'revoked' | 'locked'

export interface GuardianInvitation {
  id: ID
  childId: ID
  childName: string
  invitedName: string
  invitedEmail: string
  relationship: GuardianRelationship
  /** Only a hash is ever stored; the UI shows the last 4 characters of the code. */
  codeHint: string
  status: InvitationStatus
  sentAt: string
  expiresAt: string
  acceptedAt?: string
  attempts: number
  maxAttempts: number
  /** Identity verification uses pupil data known to the school (birth date + INE). */
  verification: { requiresBirthDate: true; requiresIne: true }
}

/* ------------------------------------------------------------------ attendance */

export type AttendanceDayStatus = 'present' | 'absent' | 'late' | 'school_closed'
export type JustificationStatus = 'justified' | 'unjustified' | 'pending' | 'not_applicable'
export type AbsencePeriod = 'morning' | 'afternoon' | 'full_day'

export interface FamilyAttendanceDay {
  date: ISODate
  childId: ID
  status: AttendanceDayStatus
  justification: JustificationStatus
  reasonCode?: string
  reasonLabel?: string
  /** Half-day granularity follows the school policy; absent keys mean "whole day". */
  periods?: Partial<Record<'morning' | 'afternoon', AttendanceDayStatus>>
  changeNote?: string
}

export interface AbsenceDeclaration {
  id: ID
  childId: ID
  createdBySub: string
  createdByName: string
  fromDate: ISODate
  toDate: ISODate
  period: AbsencePeriod
  reasonCode: string
  reasonLabel: string
  reasonText?: string
  attachmentName?: string
  createdAt: string
  status: 'pending' | 'accepted' | 'rejected'
  schoolComment?: string
}

export interface AttendanceCounters {
  childId: ID
  justified: number
  unjustified: number
  late: number
  threshold: number
  thresholdLabel: string
  overThreshold: boolean
}

/* ------------------------------------------------------------------ timetable */

export type TimetableChangeKind = 'cancelled' | 'replacement' | 'room_change' | 'trip' | 'time_change'

export interface FamilyTimetableEntry {
  id: ID
  childId: ID
  day: number
  start: ISOTime
  end: ISOTime
  subject: string
  teacher: string
  room: string
  change?: { kind: TimetableChangeKind; note: string }
}

export interface IcsFeed {
  token: string
  childId?: ID
  url: string
  createdAt: string
  revokedAt?: string
  /** Sensitive events are exported with generic titles only. */
  genericTitles: true
}

/* ------------------------------------------------------------------ homework */

export interface HomeworkItem {
  id: ID
  childId: ID
  subject: string
  title: string
  description: string
  teacher: string
  assignedAt: ISODate
  dueAt: ISODate
  attachments: { id: string; name: string; kind: 'pdf' | 'image' | 'link'; sizeLabel?: string }[]
  /** Read marker is per guardian, so both parents can track their own reading. */
  readAt?: string
}

/* ------------------------------------------------------------------ grades */

export interface GradeEntry {
  id: ID
  childId: ID
  subject: string
  evaluation: string
  date: ISODate
  score: number
  outOf: number
  classAverage?: number
  coefficient: number
  publishedAt: string
  teacherComment?: string
}

export interface Bulletin {
  id: ID
  childId: ID
  period: string
  publishedAt: string
  fileName: string
  documentHash: string
  acknowledgedAt?: string
  acknowledgedBy?: string
  /** No peer ranking unless the school enables it. */
  rank?: number
  classSize?: number
}

export interface SubjectAverage {
  subject: string
  average: number
  classAverage?: number
  coefficient: number
}

/* ------------------------------------------------------------------ messaging */

export interface FamilyMessageAttachment {
  id: string
  name: string
  kind: 'pdf' | 'image' | 'scan'
  /** Attachments are scanned server-side before delivery. */
  scanStatus: 'clean' | 'pending' | 'blocked'
}

export interface FamilyMessage {
  id: ID
  threadId: ID
  fromName: string
  fromRole: 'guardian' | 'teacher' | 'school_life' | 'direction' | 'system'
  body: string
  at: string
  readAt?: string
  attachments: FamilyMessageAttachment[]
}

export interface FamilyThread {
  id: ID
  childId?: ID
  subject: string
  participants: { name: string; role: string }[]
  /** Template used for the first message (common reasons). */
  templateId?: string
  messages: FamilyMessage[]
  unread: number
  /** Auto-reply inserted when a guardian writes during quiet hours. */
  officeHoursAutoReply?: { body: string; nextOpen: string }
  abuseReportedAt?: string
  retentionNotice: string
}

/* ------------------------------------------------------------------ announcements */

export interface FamilyAnnouncement {
  id: ID
  title: string
  body: string
  author: string
  audience: string
  publishedAt: string
  /** Read receipt is per guardian, never shared between parents. */
  readAt?: string
  requiresReceipt: boolean
  childIds?: ID[]
  category: 'school' | 'class' | 'trip' | 'safety'
}

export interface SchoolCalendarEvent {
  id: ID
  title: string
  start: ISODate
  end: ISODate
  kind: 'holiday' | 'closure' | 'event' | 'meeting'
  zone?: 'A' | 'B' | 'C'
}

/* ------------------------------------------------------------------ forms & signatures */

export interface FormSignature {
  id: ID
  signerSub: string
  signerName: string
  signedAt: string
  documentHash: string
  /** Hashed IP/device only — never the raw address in the portal payload. */
  ipHash: string
  device: string
  method: 'password' | 'mfa'
  proofLabel: string
}

export interface FormAssignment {
  id: ID
  templateId: ID
  childId: ID
  title: string
  description: string
  formType: string
  signatoryRule: SignatoryRuleMode
  dueAt: ISODate
  issuedAt: string
  status: 'pending' | 'partially_signed' | 'signed' | 'declined' | 'withdrawn'
  signatures: FormSignature[]
  requiredSignerSubs: string[]
  /** Consent-like forms can be withdrawn; contracts cannot. */
  withdrawable: boolean
  attachmentName?: string
  /** Health-adjacent forms are documents routed to staff, never parsed into the portal. */
  routesTo?: string
  legalNotice: string
}

export interface ConsentProof {
  id: ID
  childId: ID
  purpose: string
  label: string
  legalBasis: 'consent' | 'contract' | 'public_task' | 'legal_obligation'
  granted: boolean
  version: string
  grantedAt?: string
  withdrawnAt?: string
  proofHash?: string
  /** Consent texts always carry the legal-review marker. */
  text: string
}

/* ------------------------------------------------------------------ collectors */

export interface AuthorizedPerson {
  id: ID
  childId: ID
  name: string
  relationship: string
  phone: string
  idCheckRequired: boolean
  validFrom: ISODate
  validTo?: ISODate
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  createdBySub: string
  createdByName: string
  createdAt: string
  approvedBy?: string
  approvedAt?: string
  note?: string
}

/* ------------------------------------------------------------------ appointments */

export interface AppointmentSlot {
  id: ID
  teacherName: string
  teacherRole: string
  childId: ID
  date: ISODate
  start: ISOTime
  end: ISOTime
  mode: 'in_person' | 'video' | 'phone'
  location?: string
  topic: string
  /** Booked slots are removed from the catalog for every family (no overbooking). */
  bookedBy?: string
  bookedByName?: string
  /** Both guardians attend by default; the school policy may allow separate meetings. */
  jointMeeting: boolean
}

/* ------------------------------------------------------------------ activities */

export type EnrolmentStatus = 'confirmed' | 'waitlisted' | 'cancelled'

export interface FamilyActivityEnrolment {
  id: ID
  childId: ID
  offeringId: ID
  activityName: string
  status: EnrolmentStatus
  waitlistPosition?: number
  enrolledAt: string
  feeCents: number
  currency: string
  consentRequired: boolean
  consentGranted: boolean
  scheduleConflict?: string
}

/* ------------------------------------------------------------------ canteen */

export interface CanteenMenuItem {
  day: ISODate
  starter: string
  main: string
  side: string
  dessert: string
  /** Allergens are published by the school; the portal never infers medical data. */
  allergens: string[]
  vegetarian?: boolean
}

export interface CanteenReservation {
  id: ID
  childId: ID
  date: ISODate
  status: 'reserved' | 'cancelled' | 'absent'
  cutoffAt: string
  billed: boolean
}

/* ------------------------------------------------------------------ billing */

export interface FamilyBillingSummary {
  balanceCents: number
  currency: string
  dueCount: number
  nextDueDate?: ISODate
  invoices: Invoice[]
  /** Split billing: a payer sees only the invoices where they are the payer. */
  payerVisibility: string
  mandate?: { id: string; ibanMasked: string; status: 'active' | 'pending' | 'revoked'; signedAt: string }
}

export interface FamilyInvoice extends Invoice {
  /** Split billing: only payers listed here see and can settle this invoice. */
  payerSubs: string[]
}

export interface PaymentReceipt {
  id: string
  invoiceId: string
  amountCents: number
  currency: string
  paidAt: string
  method: 'card' | 'sepa'
  pspReference: string
  receiptName: string
  stepUpUsed: boolean
}

/* ------------------------------------------------------------------ documents */

export type FamilyDocumentType =
  | 'certificat_scolarite'
  | 'attestation_scolarite'
  | 'reglement_interieur'
  | 'bulletin'
  | 'attestation_cantine'
  | 'custom'

export interface FamilyDocument {
  id: ID
  childId: ID
  type: FamilyDocumentType
  title: string
  status: 'available' | 'requested' | 'processing' | 'expired'
  requestedAt?: string
  availableAt?: string
  expiresAt?: string
  /** Download links are short-lived and watermarked. */
  downloadUrl?: string
  watermark?: string
  requiresApproval: boolean
}

export interface DocumentDownload {
  id: ID
  documentId: ID
  documentTitle: string
  childId: ID
  downloadedAt: string
  watermark: string
  ipHash: string
}

/* ------------------------------------------------------------------ preferences & devices */

export type NotificationCategory =
  | 'attendance' | 'grades' | 'messages' | 'announcements' | 'forms'
  | 'appointments' | 'activities' | 'billing' | 'documents' | 'safety'

export interface NotificationPreference {
  category: NotificationCategory
  label: string
  inApp: boolean
  email: boolean
  push: boolean
  /** Mandatory school notices ignore preferences; the flag is read-only in the UI. */
  mandatory: boolean
}

export interface NotificationPreferences {
  items: NotificationPreference[]
  digest: 'off' | 'daily' | 'weekly'
  quietHours: { start: ISOTime; end: ISOTime; enabled: boolean }
  language: 'fr' | 'en'
  accessibility: { textSize: 'normal' | 'large' | 'xlarge'; highContrast: boolean; reducedMotion: boolean }
  pushContentFree: true
}

export interface DeviceSession {
  id: ID
  label: string
  device: string
  lastSeen: string
  current: boolean
  location: string
  mfa: boolean
}

/* ------------------------------------------------------------------ data rights */

export interface FamilyDataRequest {
  id: ID
  type: 'access' | 'export' | 'rectification' | 'erasure'
  childId: ID
  subject: string
  requestedAt: string
  status: 'received' | 'in_progress' | 'completed' | 'refused'
  dueAt: string
  /** Legal-obligation exceptions explained before submission. */
  legalExceptions: string[]
  handler?: string
  note?: string
}

/* ------------------------------------------------------------------ concern reporting */

export interface ConcernSubmission {
  id: string
  reference: string
  submittedAt: string
  routedTo: string[]
  /** Write-only: the portal never returns the content or a case status. */
  message: string
}

/* ------------------------------------------------------------------ dashboard */

export interface FamilyDashboard {
  children: FamilyChild[]
  greetingName: string
  today: {
    childId: ID
    entries: FamilyTimetableEntry[]
    changes: FamilyTimetableEntry[]
  }[]
  homeworkDue: { childId: ID; item: HomeworkItem }[]
  newGrades: { childId: ID; grade: GradeEntry }[]
  unreadMessages: number
  pendingForms: { assignment: FormAssignment; childId: ID }[]
  balanceCents: number
  currency: string
  upcomingEvents: SchoolCalendarEvent[]
  pendingCollectors: number
  restrictions: GuardianRestriction[]
  requestCount: number
}

/* ------------------------------------------------------------------ aggregate */

export interface FamilyOverview {
  guardian: { sub: string; name: string; email?: string; secureMessagesOnly: boolean }
  children: FamilyChild[]
  links: GuardianLink[]
  policy: FamilyPolicy
  invitations: GuardianInvitation[]
  restrictedDataHidden: boolean
}
